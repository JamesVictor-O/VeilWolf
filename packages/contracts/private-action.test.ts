import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { describe, expect, it } from "vitest";
import {
  ActionPhase,
  Contract,
  ledger,
  type Ledger,
} from "./managed/private-action/contract/index.js";

interface PlayerWitness {
  playerSecret: Uint8Array;
  rosterNonce: Uint8Array;
}

interface NightActionWitness extends PlayerWitness {
  role: bigint;
  target: Uint8Array;
  nonce: Uint8Array;
}

type CircuitName =
  | "joinPrivateRoster"
  | "startNight"
  | "submitPrivateNightAction"
  | "closeNight";

const coinPublicKey = { bytes: new Uint8Array(32).fill(9) };

function bytes(value: number): Uint8Array {
  return new Uint8Array(32).fill(value);
}

function player(value: number): PlayerWitness {
  return { playerSecret: bytes(value), rosterNonce: bytes(value + 32) };
}

function actionFor(member: PlayerWitness): NightActionWitness {
  return { ...member, role: 1n, target: bytes(240), nonce: bytes(241) };
}

async function setup() {
  let currentPlayer = player(1);
  let currentAction = actionFor(currentPlayer);
  const contract = new Contract<Record<string, never>>({
    privatePlayer(context) {
      return [context.privateState, currentPlayer];
    },
    privateNightAction(context) {
      return [context.privateState, currentAction];
    },
    rosterPath(context, commitment) {
      const path =
        context.ledger.rosterCommitments.findPathForLeaf(commitment) ??
        context.ledger.rosterCommitments.pathForLeaf(0n, commitment);
      return [context.privateState, path];
    },
  });
  const initial = await contract.initialState(
    createConstructorContext({}, coinPublicKey),
    bytes(250),
  );
  const contractAddress = sampleContractAddress();
  let currentState = initial.currentContractState;

  const execute = async (circuit: CircuitName) => {
    const context = createCircuitContext(
      circuit,
      contractAddress,
      coinPublicKey,
      currentState,
      {},
    );
    const result = await contract.circuits[circuit](context);
    currentState = result.context.callContext.currentQueryContext.state;
    return ledger(currentState);
  };

  const setPlayer = (next: PlayerWitness) => {
    currentPlayer = next;
  };

  return {
    execute,
    readLedger: (): Ledger => ledger(currentState),
    setPlayer,
    setAction: (next: NightActionWitness) => {
      currentAction = next;
    },
    fillRoster: async () => {
      const members: PlayerWitness[] = [];
      for (let index = 1; index <= 9; index += 1) {
        const member = player(index);
        members.push(member);
        setPlayer(member);
        await execute("joinPrivateRoster");
      }
      return members;
    },
  };
}

describe("private roster Compact circuit", () => {
  it("adds a hidden per-match commitment instead of a wallet identity", async () => {
    const spike = await setup();
    spike.setPlayer(player(1));
    const state = await spike.execute("joinPrivateRoster");

    expect(state.phase).toBe(ActionPhase.Lobby);
    expect(state.rosterSize).toBe(1n);
    expect(state.rosterCommitments.firstFree()).toBe(1n);
    expect(state.rosterJoinNullifiers.size()).toBe(1n);
    expect(state).not.toHaveProperty("playerSecret");
    expect(state).not.toHaveProperty("rosterNonce");
    expect(state).not.toHaveProperty("walletAddress");
  });

  it("rejects the same per-match secret even when it uses a fresh nonce", async () => {
    const spike = await setup();
    spike.setPlayer(player(1));
    await spike.execute("joinPrivateRoster");
    spike.setPlayer({ playerSecret: bytes(1), rosterNonce: bytes(99) });

    await expect(spike.execute("joinPrivateRoster")).rejects.toThrow(
      "player already joined",
    );
    expect(spike.readLedger().rosterSize).toBe(1n);
  });

  it("freezes only a complete nine-player roster", async () => {
    const spike = await setup();
    await expect(spike.execute("startNight")).rejects.toThrow(
      "nine players are required",
    );
    await spike.fillRoster();
    const state = await spike.execute("startNight");
    expect(state.phase).toBe(ActionPhase.Night);

    spike.setPlayer(player(10));
    await expect(spike.execute("joinPrivateRoster")).rejects.toThrow(
      "roster is frozen",
    );
  });

  it("rejects a tenth private seat", async () => {
    const spike = await setup();
    await spike.fillRoster();
    spike.setPlayer(player(10));
    await expect(spike.execute("joinPrivateRoster")).rejects.toThrow(
      "roster is full",
    );
  });

  it.each([
    ["an empty player secret", { playerSecret: bytes(0), rosterNonce: bytes(1) }, "player secret cannot be empty"],
    ["an empty roster nonce", { playerSecret: bytes(1), rosterNonce: bytes(0) }, "roster nonce cannot be empty"],
  ])("rejects %s", async (_case, member, message) => {
    const spike = await setup();
    spike.setPlayer(member);
    await expect(spike.execute("joinPrivateRoster")).rejects.toThrow(message);
  });
});

describe("member-authorized private night-action circuit", () => {
  it("accepts a private action backed by a roster membership proof", async () => {
    const spike = await setup();
    const members = await spike.fillRoster();
    await spike.execute("startNight");
    spike.setAction(actionFor(members[0]!));
    const state = await spike.execute("submitPrivateNightAction");

    expect(state.acceptedActionCount).toBe(1n);
    expect(state.actionNullifiers.size()).toBe(1n);
    expect(state.actionCommitments.firstFree()).toBe(1n);
    expect(state).not.toHaveProperty("target");
    expect(state).not.toHaveProperty("role");
  });

  it("rejects a secret that is not in the frozen roster", async () => {
    const spike = await setup();
    await spike.fillRoster();
    await spike.execute("startNight");
    spike.setAction(actionFor(player(20)));

    await expect(spike.execute("submitPrivateNightAction")).rejects.toThrow(
      "not a roster member",
    );
  });

  it("rejects a second action from the same member in the same round", async () => {
    const spike = await setup();
    const members = await spike.fillRoster();
    await spike.execute("startNight");
    spike.setAction(actionFor(members[0]!));
    await spike.execute("submitPrivateNightAction");
    spike.setAction({ ...actionFor(members[0]!), target: bytes(5), nonce: bytes(6) });

    await expect(spike.execute("submitPrivateNightAction")).rejects.toThrow(
      "already acted this turn",
    );
    expect(spike.readLedger().acceptedActionCount).toBe(1n);
  });

  it.each([
    ["a villager role", 0n, bytes(2), "role cannot act at night"],
    ["an empty target", 1n, bytes(0), "target cannot be empty"],
  ])("rejects %s", async (_case, role, target, message) => {
    const spike = await setup();
    const members = await spike.fillRoster();
    await spike.execute("startNight");
    spike.setAction({ ...actionFor(members[0]!), role, target });
    await expect(spike.execute("submitPrivateNightAction")).rejects.toThrow(message);
  });

  it("rejects actions after night is closed", async () => {
    const spike = await setup();
    const members = await spike.fillRoster();
    await spike.execute("startNight");
    spike.setAction(actionFor(members[0]!));
    const closed = await spike.execute("closeNight");
    expect(closed.phase).toBe(ActionPhase.Closed);
    await expect(spike.execute("submitPrivateNightAction")).rejects.toThrow(
      "night actions are closed",
    );
  });
});

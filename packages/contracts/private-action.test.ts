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

interface NightActionWitness {
  role: bigint;
  target: Uint8Array;
  nonce: Uint8Array;
  playerSecret: Uint8Array;
}

const coinPublicKey = { bytes: new Uint8Array(32).fill(9) };

function bytes(value: number): Uint8Array {
  return new Uint8Array(32).fill(value);
}

async function setup(initialAction: NightActionWitness) {
  let action = initialAction;
  const contract = new Contract<Record<string, never>>({
    privateNightAction(context) {
      return [context.privateState, action];
    },
  });
  const initial = await contract.initialState(
    createConstructorContext({}, coinPublicKey),
    bytes(1),
  );
  const contractAddress = sampleContractAddress();

  const execute = async (circuit: "submitPrivateNightAction" | "closeNight") => {
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

  let currentState = initial.currentContractState;
  return {
    execute,
    readLedger: (): Ledger => ledger(currentState),
    setAction: (next: NightActionWitness) => {
      action = next;
    },
  };
}

const validAction = (): NightActionWitness => ({
  role: 1n,
  target: bytes(2),
  nonce: bytes(3),
  playerSecret: bytes(4),
});

describe("private night-action Compact circuit", () => {
  it("commits a valid private action without exposing its target in ledger state", async () => {
    const spike = await setup(validAction());
    const state = await spike.execute("submitPrivateNightAction");

    expect(state.phase).toBe(ActionPhase.Night);
    expect(state.acceptedActionCount).toBe(1n);
    expect(state.actionNullifiers.size()).toBe(1n);
    expect(state.actionCommitments.firstFree()).toBe(1n);
    expect(state).not.toHaveProperty("target");
    expect(state).not.toHaveProperty("role");
  });

  it("rejects a second action from the same secret in the same round", async () => {
    const spike = await setup(validAction());
    await spike.execute("submitPrivateNightAction");
    spike.setAction({ ...validAction(), target: bytes(5), nonce: bytes(6) });

    await expect(spike.execute("submitPrivateNightAction")).rejects.toThrow(
      "already acted this turn",
    );
    expect(spike.readLedger().acceptedActionCount).toBe(1n);
  });

  it.each([
    ["a villager role", { ...validAction(), role: 0n }, "role cannot act at night"],
    ["an empty target", { ...validAction(), target: bytes(0) }, "target cannot be empty"],
  ])("rejects %s", async (_case, action, message) => {
    const spike = await setup(action);
    await expect(spike.execute("submitPrivateNightAction")).rejects.toThrow(message);
  });

  it("rejects actions after night is closed", async () => {
    const spike = await setup(validAction());
    const closed = await spike.execute("closeNight");
    expect(closed.phase).toBe(ActionPhase.Closed);
    await expect(spike.execute("submitPrivateNightAction")).rejects.toThrow(
      "night actions are closed",
    );
  });
});

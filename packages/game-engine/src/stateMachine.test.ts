import { describe, expect, it } from "vitest";
import {
  advanceToDay,
  advanceToVote,
  checkVictory,
  createGame,
  joinGame,
  resolveDawn,
  revealVotes,
  startGame,
  submitNightAction,
  submitVote,
} from "./stateMachine";
import { MIN_PLAYERS, type NightAction, type Role } from "./types";

function seedGame() {
  let state = createGame({ gameId: "TEST1", host: "p0", hostNickname: "Host" });
  for (let i = 1; i < MIN_PLAYERS; i++) {
    state = joinGame(state, { address: `p${i}`, nickname: `Player ${i}` });
  }
  return state;
}

describe("stateMachine", () => {
  it("assigns exactly 2 werewolves, 1 doctor, 1 seer, 5 villagers on start", () => {
    const state = seedGame();
    const { gameState, roleAssignments } = startGame(state, { actor: "p0" });
    expect(gameState.phase).toBe("NIGHT");

    const counts: Record<Role, number> = {
      WEREWOLF: 0,
      VILLAGER: 0,
      DOCTOR: 0,
      SEER: 0,
    };
    for (const role of Object.values(roleAssignments)) counts[role]++;
    expect(counts).toEqual({ WEREWOLF: 2, VILLAGER: 5, DOCTOR: 1, SEER: 1 });
  });

  it("plays a full night -> dawn -> day -> vote -> night loop to a villager win", () => {
    let state = seedGame();
    const started = startGame(state, { actor: "p0" });
    state = started.gameState;
    const roles = started.roleAssignments;

    const werewolves = Object.entries(roles)
      .filter(([, r]) => r === "WEREWOLF")
      .map(([a]) => a);
    const villagerTarget = Object.entries(roles).find(
      ([a, r]) => r !== "WEREWOLF" && a !== werewolves[0],
    )![0];

    let pendingActions: NightAction[] = [];
    for (const wolf of werewolves) {
      const result = submitNightAction(state, pendingActions, {
        actor: wolf,
        role: "WEREWOLF",
        target: villagerTarget,
      }, roles);
      state = result.gameState;
      pendingActions = result.pendingActions;
    }

    for (const [actor, role] of Object.entries(roles)) {
      if (role !== "DOCTOR" && role !== "SEER") continue;
      const supportTarget =
        role === "DOCTOR"
          ? state.players.find(
              (player) => player.address !== villagerTarget && player.isAlive,
            )!.address
          : villagerTarget;
      const result = submitNightAction(
        state,
        pendingActions,
        { actor, role, target: supportTarget },
        roles,
      );
      state = result.gameState;
      pendingActions = result.pendingActions;
    }

    const dawn = resolveDawn(state, pendingActions, roles);
    state = dawn.gameState;
    expect(dawn.nightDeaths).toEqual([villagerTarget]);
    expect(state.phase).toBe("DAWN");

    state = advanceToDay(state);
    expect(state.phase).toBe("DAY");

    state = advanceToVote(state);
    expect(state.phase).toBe("VOTE");

    // Every alive player votes out a werewolf.
    const wolfToEliminate = werewolves[0]!;
    let pendingVotes: Record<string, string> = {};
    for (const player of state.players.filter((p) => p.isAlive)) {
      const result = submitVote(state, pendingVotes, player.address, wolfToEliminate);
      state = result.gameState;
      pendingVotes = result.pendingVotes;
    }

    const revealed = revealVotes(
      state,
      pendingVotes,
      { nightDeaths: dawn.nightDeaths, nightSaves: dawn.nightSaves },
      roles,
    );
    state = revealed.gameState;
    expect(revealed.eliminated).toBe(wolfToEliminate);

    // One werewolf left vs 6 alive others -> game continues.
    expect(state.winner).toBeNull();
    expect(state.phase).toBe("NIGHT");
    expect(state.turnNumber).toBe(2);
    expect(
      state.players
        .filter((player) => roles[player.address] === "VILLAGER" && player.isAlive)
        .every((player) => player.hasActedThisNight),
    ).toBe(true);
  });

  it("rejects role spoofing and werewolf friendly fire", () => {
    const started = startGame(seedGame(), { actor: "p0" });
    const wolf = Object.keys(started.roleAssignments).find(
      (address) => started.roleAssignments[address] === "WEREWOLF",
    )!;
    const otherWolf = Object.keys(started.roleAssignments).find(
      (address) =>
        address !== wolf && started.roleAssignments[address] === "WEREWOLF",
    )!;
    const villager = Object.keys(started.roleAssignments).find(
      (address) => started.roleAssignments[address] === "VILLAGER",
    )!;

    expect(() =>
      submitNightAction(
        started.gameState,
        [],
        { actor: villager, role: "SEER", target: wolf },
        started.roleAssignments,
      ),
    ).toThrow("assigned role");

    expect(() =>
      submitNightAction(
        started.gameState,
        [],
        { actor: wolf, role: "WEREWOLF", target: otherWolf },
        started.roleAssignments,
      ),
    ).toThrow("another werewolf");
  });

  it("produces no kill when werewolf choices are tied", () => {
    const started = startGame(seedGame(), { actor: "p0" });
    let state = started.gameState;
    const roles = started.roleAssignments;
    const wolves = Object.keys(roles).filter((address) => roles[address] === "WEREWOLF");
    const targets = Object.keys(roles).filter((address) => roles[address] !== "WEREWOLF");
    let pending: NightAction[] = [];

    for (const [index, wolf] of wolves.entries()) {
      const result = submitNightAction(
        state,
        pending,
        { actor: wolf!, role: "WEREWOLF", target: targets[index]! },
        roles,
      );
      state = result.gameState;
      pending = result.pendingActions;
    }
    for (const [actor, role] of Object.entries(roles)) {
      if (role !== "DOCTOR" && role !== "SEER") continue;
      const result = submitNightAction(
        state,
        pending,
        { actor, role, target: targets[2]! },
        roles,
      );
      state = result.gameState;
      pending = result.pendingActions;
    }

    expect(resolveDawn(state, pending, roles).nightDeaths).toEqual([]);
  });

  it("requires every living special role to act before dawn", () => {
    const started = startGame(seedGame(), { actor: "p0" });
    expect(() => resolveDawn(started.gameState, [], started.roleAssignments)).toThrow(
      "All eligible night actions",
    );
  });

  it("declares WEREWOLVES victory once wolves >= remaining villagers", () => {
    let state = seedGame();
    const started = startGame(state, { actor: "p0" });
    state = started.gameState;
    const roles = started.roleAssignments;
    const nonWolves = state.players
      .map((p) => p.address)
      .filter((a) => roles[a] !== "WEREWOLF");

    // Kill off non-wolves one at a time via checkVictory directly to avoid
    // re-running the whole night/day loop 5 times in this test. With 2
    // werewolves alive, the werewolves win as soon as aliveOthers drops to
    // 2 (2 wolves >= 2 others) — i.e. after killing the 5th of 7 non-wolves.
    let players = state.players;
    for (let i = 0; i < 4; i++) {
      players = players.map((p) =>
        p.address === nonWolves[i] ? { ...p, isAlive: false } : p,
      );
      const winner = checkVictory({ ...state, players }, roles);
      expect(winner).toBeNull();
    }
    players = players.map((p) =>
      p.address === nonWolves[4] ? { ...p, isAlive: false } : p,
    );
    const winner = checkVictory({ ...state, players }, roles);
    expect(winner).toBe("WEREWOLVES");
  });
});

/**
 * mockChainClient — the ONE file that gets replaced when the real Midnight
 * Compact TS SDK client is wired in.
 *
 * Every method here is async and returns plain data, exactly the shape a
 * real chain client would: submit a transaction, await inclusion, read back
 * updated public/private state. Nothing in apps/web or packages/ui should
 * ever import stateMachine.ts directly — always go through this interface
 * (`ChainClient`) so that dropping in a real client later is a matter of
 * implementing the same interface against `@midnight-ntwrk/compact-...`
 * calls instead of local reducers.
 *
 * Mock-only simplifications (all called out again in the root README):
 *  - "Transactions" are synchronous local reducer calls wrapped in
 *    `Promise.resolve` / a tiny artificial delay, instead of real proof
 *    generation + submission + block inclusion.
 *  - Persistence is `localStorage` (browser) so two tabs on the same
 *    machine can play as two players; a real deployment persists public
 *    state on the Midnight ledger and private state in each player's own
 *    wallet/local store.
 *  - Because there's no real ZK circuit yet, this mock server is trusted
 *    with role assignments and other "private" data. A real Compact
 *    contract would never let the server see a player's role in the
 *    clear — that's the gap Week-1 spike work closes.
 */

import {
  createEmptyPrivateState,
  MIN_PLAYERS,
  type Address,
  type DayLogEntry,
  type GameState,
  type NightAction,
  type PrivateState,
  type Role,
} from "./types";
import {
  advanceToDay as sm_advanceToDay,
  advanceToVote as sm_advanceToVote,
  createGame as sm_createGame,
  joinGame as sm_joinGame,
  postDayMessage as sm_postDayMessage,
  resolveDawn as sm_resolveDawn,
  revealVotes as sm_revealVotes,
  startGame as sm_startGame,
  submitNightAction as sm_submitNightAction,
  submitVote as sm_submitVote,
} from "./stateMachine";
import type { SimulationClient } from "./chainClient";

// ---------------------------------------------------------------------------
// Storage abstraction — localStorage in the browser, in-memory for Node/tests
// ---------------------------------------------------------------------------

interface Store {
  get(key: string): string | null;
  set(key: string, value: string): void;
  onExternalChange(key: string, cb: () => void): () => void;
}

function createMemoryStore(): Store {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    onExternalChange: () => () => {},
  };
}

function createLocalStorageStore(): Store {
  return {
    get: (key) => window.localStorage.getItem(key),
    set: (key, value) => window.localStorage.setItem(key, value),
    onExternalChange: (key, cb) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

const store: Store =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? createLocalStorageStore()
    : createMemoryStore();

// ---------------------------------------------------------------------------
// Per-game record persisted behind the storage abstraction
// ---------------------------------------------------------------------------

interface NightResult {
  turnNumber: number;
  nightDeaths: Address[];
  nightSaves: Address[];
}

interface GameRecord {
  gameState: GameState;
  roleAssignments: Record<Address, Role>;
  pendingNightActions: NightAction[];
  pendingVotes: Record<Address, Address>;
  privateStates: Record<Address, PrivateState>;
  lastNightResult: NightResult | null;
}

function gameKey(gameId: string): string {
  return `veilwolf:game:${gameId}`;
}

function readRecord(gameId: string): GameRecord | null {
  const raw = store.get(gameKey(gameId));
  if (!raw) return null;
  return JSON.parse(raw) as GameRecord;
}

function writeRecord(gameId: string, record: GameRecord): void {
  store.set(gameKey(gameId), JSON.stringify(record));
}

function requireRecord(gameId: string): GameRecord {
  const record = readRecord(gameId);
  if (!record) throw new Error(`Game ${gameId} not found`);
  return record;
}

// Simulates network + proof-generation latency so loading states in the UI
// have something real to render against. Tune to zero for tests.
const MOCK_LATENCY_MS = 250;
const SIMULATED_PLAYER_NAMES = [
  "Agnes",
  "Bram",
  "Celia",
  "Dorian",
  "Elara",
  "Felix",
  "Greta",
  "Hollis",
] as const;

function isSimulatedPlayer(address: Address): boolean {
  return address.startsWith("simulated:");
}

function runSimulatedNightActions(record: GameRecord): GameRecord {
  let next = record;
  const actors = next.gameState.players.filter(
    (player) =>
      player.isAlive &&
      isSimulatedPlayer(player.address) &&
      !player.hasActedThisNight &&
      next.roleAssignments[player.address] !== "VILLAGER",
  );

  for (const actor of actors) {
    const role = next.roleAssignments[actor.address];
    const privateState = next.privateStates[actor.address];
    if (!role || !privateState) continue;

    const alive = next.gameState.players.filter((player) => player.isAlive);
    let eligible = alive.filter((player) => player.address !== actor.address);
    if (role === "WEREWOLF") {
      eligible = eligible.filter(
        (player) => next.roleAssignments[player.address] !== "WEREWOLF",
      );
    }
    if (role === "DOCTOR" && next.gameState.turnNumber > 1) {
      const previousTarget = [...privateState.nightActionsHistory]
        .reverse()
        .find((action) => action.actor === actor.address)?.target;
      eligible = eligible.filter((player) => player.address !== previousTarget);
    }

    const target =
      eligible.find((player) => isSimulatedPlayer(player.address)) ?? eligible[0];
    if (!target) continue;

    const action: NightAction = { actor: actor.address, role, target: target.address };
    const result = sm_submitNightAction(
      next.gameState,
      next.pendingNightActions,
      action,
      next.roleAssignments,
      privateState.nightActionsHistory,
    );
    next = {
      ...next,
      gameState: result.gameState,
      pendingNightActions: result.pendingActions,
      privateStates: {
        ...next.privateStates,
        [actor.address]: {
          ...privateState,
          nightActionsHistory: [...privateState.nightActionsHistory, action],
        },
      },
    };
  }

  return next;
}

function runSimulatedVotes(record: GameRecord): GameRecord {
  let next = record;
  const simulatedTarget = next.gameState.players.find(
    (player) => player.isAlive && isSimulatedPlayer(player.address),
  );
  if (!simulatedTarget) return next;

  for (const voter of next.gameState.players.filter(
    (player) =>
      player.isAlive &&
      isSimulatedPlayer(player.address) &&
      !player.hasVotedThisRound,
  )) {
    const fallback = next.gameState.players.find(
      (player) => player.isAlive && player.address !== voter.address,
    );
    const target =
      simulatedTarget.address === voter.address ? fallback : simulatedTarget;
    if (!target) continue;
    const result = sm_submitVote(
      next.gameState,
      next.pendingVotes,
      voter.address,
      target.address,
    );
    next = {
      ...next,
      gameState: result.gameState,
      pendingVotes: result.pendingVotes,
    };
  }

  return next;
}
async function delay(ms = MOCK_LATENCY_MS): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function generateGameId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let id = "";
  for (let i = 0; i < 5; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

export function generateAddress(): Address {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `addr-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// ChainClient interface — this is the seam. Match this shape with the real
// Midnight SDK client when it's ready.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export const mockChainClient: SimulationClient = {
  async fillWithSimulatedPlayers({ gameId, actor }) {
    await delay();
    let record = requireRecord(gameId);
    if (record.gameState.phase !== "SETUP") {
      throw new Error("Simulated players can only join before the game starts");
    }
    if (record.gameState.host !== actor) {
      throw new Error("Only the host can add simulated players");
    }

    let index = 0;
    while (record.gameState.players.length < MIN_PLAYERS) {
      const nickname = SIMULATED_PLAYER_NAMES[index] ?? `Guest ${index + 1}`;
      const address = `simulated:${gameId}:${index + 1}`;
      const gameState = sm_joinGame(record.gameState, { address, nickname });
      record = {
        ...record,
        gameState,
        privateStates: {
          ...record.privateStates,
          [address]: createEmptyPrivateState(gameId, address),
        },
      };
      index += 1;
    }
    writeRecord(gameId, record);
    return { gameState: record.gameState };
  },

  async createGame({ host, hostNickname }) {
    await delay();
    const gameId = generateGameId();
    const gameState = sm_createGame({ gameId, host, hostNickname });
    const privateState = createEmptyPrivateState(gameId, host);
    writeRecord(gameId, {
      gameState,
      roleAssignments: {},
      pendingNightActions: [],
      pendingVotes: {},
      privateStates: { [host]: privateState },
      lastNightResult: null,
    });
    return { gameState, privateState };
  },

  async joinGame({ gameId, address, nickname }) {
    await delay();
    const record = requireRecord(gameId);
    const gameState = sm_joinGame(record.gameState, { address, nickname });
    const privateState = createEmptyPrivateState(gameId, address);
    writeRecord(gameId, {
      ...record,
      gameState,
      privateStates: { ...record.privateStates, [address]: privateState },
    });
    return { gameState, privateState };
  },

  async startGame({ gameId, actor }) {
    await delay();
    const record = requireRecord(gameId);
    const { gameState, roleAssignments } = sm_startGame(record.gameState, {
      actor,
    });
    const privateStates: Record<Address, PrivateState> = {};
    for (const [address, ps] of Object.entries(record.privateStates)) {
      privateStates[address] = { ...ps, role: roleAssignments[address] ?? null };
    }
    const nextRecord = runSimulatedNightActions({
      ...record,
      gameState,
      roleAssignments,
      pendingNightActions: [],
      privateStates,
    });
    writeRecord(gameId, nextRecord);
    return { gameState: nextRecord.gameState };
  },

  async submitNightAction({ gameId, actor, target }) {
    await delay();
    const record = requireRecord(gameId);
    const privateState = record.privateStates[actor];
    if (!privateState?.role) {
      throw new Error(`No role assigned to ${actor} yet`);
    }
    const action: NightAction = { actor, role: privateState.role, target };
    const { gameState, pendingActions } = sm_submitNightAction(
      record.gameState,
      record.pendingNightActions,
      action,
      record.roleAssignments,
      privateState.nightActionsHistory,
    );
    const nextPrivateState: PrivateState = {
      ...privateState,
      nightActionsHistory: [...privateState.nightActionsHistory, action],
    };
    writeRecord(gameId, {
      ...record,
      gameState,
      pendingNightActions: pendingActions,
      privateStates: { ...record.privateStates, [actor]: nextPrivateState },
    });
    return { gameState, privateState: nextPrivateState };
  },

  async resolveDawn({ gameId }) {
    await delay();
    const record = requireRecord(gameId);
    const { gameState, nightDeaths, nightSaves, seerResults } = sm_resolveDawn(
      record.gameState,
      record.pendingNightActions,
      record.roleAssignments,
    );

    const privateStates = { ...record.privateStates };
    for (const result of seerResults) {
      const ps = privateStates[result.seer];
      if (!ps) continue;
      privateStates[result.seer] = {
        ...ps,
        investigationResults: {
          ...ps.investigationResults,
          [record.gameState.turnNumber]: {
            target: result.target,
            isWerewolf: result.isWerewolf,
          },
        },
      };
    }

    writeRecord(gameId, {
      ...record,
      gameState,
      pendingNightActions: [],
      privateStates,
      lastNightResult: {
        turnNumber: record.gameState.turnNumber,
        nightDeaths,
        nightSaves,
      },
    });
    return { gameState };
  },

  async advanceToDay({ gameId }) {
    await delay();
    const record = requireRecord(gameId);
    const gameState = sm_advanceToDay(record.gameState);
    writeRecord(gameId, { ...record, gameState });
    return { gameState };
  },

  async postDayMessage({ gameId, author, message, type }) {
    await delay(60);
    const record = requireRecord(gameId);
    const gameState = sm_postDayMessage(record.gameState, {
      author,
      message,
      type,
    });
    writeRecord(gameId, { ...record, gameState });
    return { gameState };
  },

  async advanceToVote({ gameId }) {
    await delay();
    const record = requireRecord(gameId);
    const gameState = sm_advanceToVote(record.gameState);
    const nextRecord = runSimulatedVotes({
      ...record,
      gameState,
      pendingVotes: {},
    });
    writeRecord(gameId, nextRecord);
    return { gameState: nextRecord.gameState };
  },

  async submitVote({ gameId, voter, target }) {
    await delay();
    const record = requireRecord(gameId);
    const { gameState, pendingVotes } = sm_submitVote(
      record.gameState,
      record.pendingVotes,
      voter,
      target,
    );
    writeRecord(gameId, { ...record, gameState, pendingVotes });
    return { gameState };
  },

  async revealVotes({ gameId }) {
    await delay();
    const record = requireRecord(gameId);
    const roundContext = {
      nightDeaths: record.lastNightResult?.nightDeaths ?? [],
      nightSaves: record.lastNightResult?.nightSaves ?? [],
    };
    const { gameState } = sm_revealVotes(
      record.gameState,
      record.pendingVotes,
      roundContext,
      record.roleAssignments,
    );
    let nextRecord: GameRecord = {
      ...record,
      gameState,
      pendingVotes: {},
      lastNightResult: null,
    };
    if (gameState.phase === "NIGHT") {
      nextRecord = runSimulatedNightActions(nextRecord);
    }
    writeRecord(gameId, nextRecord);
    return { gameState: nextRecord.gameState };
  },

  async getGameState(gameId) {
    return readRecord(gameId)?.gameState ?? null;
  },

  async getPrivateState(gameId, address) {
    return readRecord(gameId)?.privateStates[address] ?? null;
  },

  async getRevealedRole(gameId, address) {
    const record = requireRecord(gameId);
    const player = record.gameState.players.find((p) => p.address === address);
    if (!player || player.isAlive) return null;
    return record.roleAssignments[address] ?? null;
  },

  async getFinalReveal(gameId) {
    const record = requireRecord(gameId);
    if (record.gameState.phase !== "ENDED") return null;
    return record.roleAssignments;
  },

  async allEligibleActed(gameId) {
    const record = requireRecord(gameId);
    return record.gameState.players
      .filter((p) => p.isAlive)
      .every((p) => p.hasActedThisNight);
  },

  async allEligibleVoted(gameId) {
    const record = requireRecord(gameId);
    return record.gameState.players
      .filter((p) => p.isAlive)
      .every((p) => p.hasVotedThisRound);
  },

  subscribe(gameId, listener) {
    let cancelled = false;
    const poll = () => {
      if (cancelled) return;
      const state = readRecord(gameId)?.gameState;
      if (state) listener(state);
    };
    const unsubscribeExternal = store.onExternalChange(gameKey(gameId), poll);
    // Same-tab callers already get fresh state back from each method call;
    // polling covers the case where a real chain client would push updates
    // asynchronously (new blocks) rather than only on our own writes.
    const interval = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribeExternal();
    };
  },
};

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

export interface ChainClient {
  createGame(params: {
    host: Address;
    hostNickname: string;
  }): Promise<{ gameState: GameState; privateState: PrivateState }>;

  joinGame(params: {
    gameId: string;
    address: Address;
    nickname: string;
  }): Promise<{ gameState: GameState; privateState: PrivateState }>;

  startGame(params: {
    gameId: string;
    actor: Address;
  }): Promise<{ gameState: GameState }>;

  submitNightAction(params: {
    gameId: string;
    actor: Address;
    target: Address;
  }): Promise<{ gameState: GameState; privateState: PrivateState }>;

  resolveDawn(params: { gameId: string }): Promise<{ gameState: GameState }>;

  advanceToDay(params: { gameId: string }): Promise<{ gameState: GameState }>;

  postDayMessage(params: {
    gameId: string;
    author: Address;
    message: string;
    type?: DayLogEntry["type"];
  }): Promise<{ gameState: GameState }>;

  advanceToVote(params: { gameId: string }): Promise<{ gameState: GameState }>;

  submitVote(params: {
    gameId: string;
    voter: Address;
    target: Address;
  }): Promise<{ gameState: GameState }>;

  revealVotes(params: { gameId: string }): Promise<{ gameState: GameState }>;

  getGameState(gameId: string): Promise<GameState | null>;

  getPrivateState(
    gameId: string,
    address: Address,
  ): Promise<PrivateState | null>;

  /**
   * Selective disclosure: a player's role is only revealed once they are
   * eliminated (isAlive === false). Mirrors the kind of one-off reveal
   * circuit a real Compact contract could expose without disclosing the
   * full role assignment.
   */
  getRevealedRole(gameId: string, address: Address): Promise<Role | null>;

  /** Full role assignment, only once the game has ended. */
  getFinalReveal(gameId: string): Promise<Record<Address, Role> | null>;

  /** True once every alive player eligible to act this night has acted. */
  allEligibleActed(gameId: string): Promise<boolean>;

  /** True once every alive player has voted this round. */
  allEligibleVoted(gameId: string): Promise<boolean>;

  /**
   * Subscribe to changes in this game's public state, including ones made
   * from another browser tab (via the localStorage `storage` event). Mirrors
   * the subscription model a real chain client would offer over ledger
   * state updates.
   */
  subscribe(gameId: string, listener: (state: GameState) => void): () => void;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export const mockChainClient: ChainClient = {
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
    writeRecord(gameId, {
      ...record,
      gameState,
      roleAssignments,
      pendingNightActions: [],
      privateStates,
    });
    return { gameState };
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
    writeRecord(gameId, { ...record, gameState, pendingVotes: {} });
    return { gameState };
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
    writeRecord(gameId, {
      ...record,
      gameState,
      pendingVotes: {},
      lastNightResult: null,
    });
    return { gameState };
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

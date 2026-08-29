/**
 * Pure game logic for VeilWolf. No I/O, no randomness beyond an injectable
 * `rng`/`now`/`id` so tests stay deterministic. Every function takes a
 * `GameState` (and sometimes other plain data) and returns a new
 * `GameState` — nothing here talks to a network or a chain.
 *
 * `mockChainClient.ts` wraps these functions behind an async interface.
 * Later, a real Midnight chain client will expose the *same* async
 * interface but call into a deployed Compact contract instead — this file
 * is what that contract's logic needs to reproduce.
 */

import {
  MIN_PLAYERS,
  ROLE_COMPOSITION,
  type Address,
  type DayLogEntry,
  type GamePhase,
  type GameState,
  type NightAction,
  type Player,
  type Role,
  type RoundSummary,
  type Winner,
} from "./types";

export class GameEngineError extends Error {}

interface Rng {
  (): number;
}

const defaultRng: Rng = Math.random;

function shuffle<T>(items: T[], rng: Rng = defaultRng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new GameEngineError(message);
}

function findPlayer(state: GameState, address: Address): Player {
  const player = state.players.find((p) => p.address === address);
  assert(player, `Player ${address} is not in game ${state.gameId}`);
  return player;
}

function withUpdatedPlayer(
  state: GameState,
  address: Address,
  patch: Partial<Player>,
): Player[] {
  return state.players.map((p) =>
    p.address === address ? { ...p, ...patch } : p,
  );
}

function touch(state: GameState, now: number): Pick<GameState, "updatedAt"> {
  return { updatedAt: now };
}

// ---------------------------------------------------------------------------
// createGame / joinGame / startGame
// ---------------------------------------------------------------------------

export interface CreateGameParams {
  gameId: string;
  host: Address;
  hostNickname: string;
  now?: number;
}

export function createGame(params: CreateGameParams): GameState {
  const now = params.now ?? Date.now();
  const host: Player = {
    address: params.host,
    nickname: params.hostNickname,
    isAlive: true,
    hasActedThisNight: false,
    hasVotedThisRound: false,
  };
  return {
    gameId: params.gameId,
    host: params.host,
    phase: "SETUP",
    turnNumber: 0,
    players: [host],
    aliveCount: 1,
    winner: null,
    lastEliminated: null,
    dayLog: [],
    roundHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface JoinGameParams {
  address: Address;
  nickname: string;
  now?: number;
}

export function joinGame(state: GameState, params: JoinGameParams): GameState {
  assert(state.phase === "SETUP", "Cannot join a game that has already started");
  assert(
    !state.players.some((p) => p.address === params.address),
    "Player has already joined this game",
  );
  assert(
    state.players.length < MIN_PLAYERS,
    `Game is full (${MIN_PLAYERS} players)`,
  );
  const now = params.now ?? Date.now();
  const player: Player = {
    address: params.address,
    nickname: params.nickname,
    isAlive: true,
    hasActedThisNight: false,
    hasVotedThisRound: false,
  };
  const players = [...state.players, player];
  return {
    ...state,
    players,
    aliveCount: players.length,
    ...touch(state, now),
  };
}

export interface StartGameParams {
  actor: Address;
  rng?: Rng;
  now?: number;
}

export interface StartGameResult {
  gameState: GameState;
  /** Role assignment for this turn — the caller distributes each entry into
   * the relevant player's PrivateState. Never stored in GameState. */
  roleAssignments: Record<Address, Role>;
}

export function startGame(
  state: GameState,
  params: StartGameParams,
): StartGameResult {
  assert(state.phase === "SETUP", "Game has already started");
  assert(state.host === params.actor, "Only the host can start the game");
  assert(
    state.players.length === MIN_PLAYERS,
    `Need exactly ${MIN_PLAYERS} players to start (have ${state.players.length})`,
  );

  const roles: Role[] = Object.entries(ROLE_COMPOSITION).flatMap(
    ([role, count]) => Array<Role>(count).fill(role as Role),
  );
  const shuffledRoles = shuffle(roles, params.rng);
  const roleAssignments: Record<Address, Role> = {};
  state.players.forEach((player, i) => {
    roleAssignments[player.address] = shuffledRoles[i] as Role;
  });

  const now = params.now ?? Date.now();
  const players = state.players.map((p) => ({
    ...p,
    // Villagers have no night action, so they start the night already
    // "acted" — the waiting-room UI only blocks on werewolves/doctor/seer.
    hasActedThisNight: roleAssignments[p.address] === "VILLAGER",
    hasVotedThisRound: false,
  }));

  const gameState: GameState = {
    ...state,
    phase: "NIGHT",
    turnNumber: 1,
    players,
    dayLog: [
      ...state.dayLog,
      systemLog(state, 1, "Night falls on the village.", now),
    ],
    ...touch(state, now),
  };

  return { gameState, roleAssignments };
}

// ---------------------------------------------------------------------------
// Night phase
// ---------------------------------------------------------------------------

export function submitNightAction(
  state: GameState,
  pendingActions: NightAction[],
  action: NightAction,
): { gameState: GameState; pendingActions: NightAction[] } {
  assert(state.phase === "NIGHT", "Not currently night");
  const actor = findPlayer(state, action.actor);
  assert(actor.isAlive, "Dead players cannot act");
  assert(action.role !== "VILLAGER", "Villagers have no night action");
  assert(
    !actor.hasActedThisNight,
    "Player has already submitted a night action this turn",
  );
  const target = findPlayer(state, action.target);
  assert(target.isAlive, "Cannot target a dead player");

  const players = withUpdatedPlayer(state, action.actor, {
    hasActedThisNight: true,
  });
  const gameState: GameState = { ...state, players };
  const nextPending = [...pendingActions, action];
  return { gameState, pendingActions: nextPending };
}

export interface ResolveDawnResult {
  gameState: GameState;
  nightDeaths: Address[];
  nightSaves: Address[];
  /** Not persisted to public state — caller routes each entry to that
   * seer's own PrivateState.investigationResults. */
  seerResults: Array<{ seer: Address; target: Address; isWerewolf: boolean }>;
}

export function resolveDawn(
  state: GameState,
  pendingActions: NightAction[],
  roleAssignments: Record<Address, Role>,
  now = Date.now(),
): ResolveDawnResult {
  assert(state.phase === "NIGHT", "Not currently night");

  const werewolfActions = pendingActions.filter((a) => a.role === "WEREWOLF");
  const doctorAction = pendingActions.find((a) => a.role === "DOCTOR");
  const seerActions = pendingActions.filter((a) => a.role === "SEER");

  const killTarget = pickMajorityTarget(werewolfActions);
  const healTarget = doctorAction?.target ?? null;

  const nightDeaths: Address[] = [];
  const nightSaves: Address[] = [];
  if (killTarget) {
    if (killTarget === healTarget) {
      nightSaves.push(killTarget);
    } else {
      nightDeaths.push(killTarget);
    }
  }

  const seerResults = seerActions.map((a) => ({
    seer: a.actor,
    target: a.target,
    isWerewolf: roleAssignments[a.target] === "WEREWOLF",
  }));

  let players = state.players.map((p) => ({
    ...p,
    isAlive: nightDeaths.includes(p.address) ? false : p.isAlive,
    hasActedThisNight: false,
  }));

  const aliveCount = players.filter((p) => p.isAlive).length;
  const deathLogs = nightDeaths.map((address) =>
    systemLog(
      state,
      state.turnNumber,
      `${nicknameOf(players, address)} was found dead this morning.`,
      now,
    ),
  );
  const peaceLog =
    nightDeaths.length === 0
      ? [
          systemLog(
            state,
            state.turnNumber,
            "Everyone survived the night.",
            now,
          ),
        ]
      : [];

  const winner = checkVictory({ ...state, players, aliveCount }, roleAssignments);

  const gameState: GameState = {
    ...state,
    phase: winner ? "ENDED" : "DAWN",
    players,
    aliveCount,
    winner,
    dayLog: [...state.dayLog, ...deathLogs, ...peaceLog],
    ...touch(state, now),
  };

  return { gameState, nightDeaths, nightSaves, seerResults };
}

function pickMajorityTarget(actions: NightAction[]): Address | null {
  if (actions.length === 0) return null;
  const counts = new Map<Address, number>();
  for (const a of actions) {
    counts.set(a.target, (counts.get(a.target) ?? 0) + 1);
  }
  let best: Address | null = null;
  let bestCount = -1;
  for (const a of actions) {
    const c = counts.get(a.target) ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = a.target;
    }
  }
  return best;
}

export function advanceToDay(state: GameState, now = Date.now()): GameState {
  assert(state.phase === "DAWN", "Not currently dawn");
  return {
    ...state,
    phase: "DAY",
    ...touch(state, now),
  };
}

// ---------------------------------------------------------------------------
// Day phase
// ---------------------------------------------------------------------------

export function postDayMessage(
  state: GameState,
  params: {
    author: Address;
    message: string;
    type?: DayLogEntry["type"];
    now?: number;
    id?: string;
  },
): GameState {
  assert(state.phase === "DAY", "Not currently day");
  const author = findPlayer(state, params.author);
  assert(author.isAlive, "Dead players cannot speak");
  const now = params.now ?? Date.now();
  const entry: DayLogEntry = {
    id: params.id ?? `${state.gameId}-log-${state.dayLog.length}`,
    turnNumber: state.turnNumber,
    author: params.author,
    authorNickname: author.nickname,
    message: params.message,
    type: params.type ?? "chat",
    timestamp: now,
  };
  return {
    ...state,
    dayLog: [...state.dayLog, entry],
    ...touch(state, now),
  };
}

export function advanceToVote(state: GameState, now = Date.now()): GameState {
  assert(state.phase === "DAY", "Not currently day");
  const players = state.players.map((p) => ({
    ...p,
    hasVotedThisRound: false,
  }));
  return {
    ...state,
    phase: "VOTE",
    players,
    ...touch(state, now),
  };
}

// ---------------------------------------------------------------------------
// Vote phase
// ---------------------------------------------------------------------------

export function submitVote(
  state: GameState,
  pendingVotes: Record<Address, Address>,
  voter: Address,
  target: Address,
): { gameState: GameState; pendingVotes: Record<Address, Address> } {
  assert(state.phase === "VOTE", "Not currently voting");
  const voterPlayer = findPlayer(state, voter);
  assert(voterPlayer.isAlive, "Dead players cannot vote");
  assert(!voterPlayer.hasVotedThisRound, "Player has already voted");
  const targetPlayer = findPlayer(state, target);
  assert(targetPlayer.isAlive, "Cannot vote for a dead player");

  const players = withUpdatedPlayer(state, voter, { hasVotedThisRound: true });
  const gameState: GameState = { ...state, players };
  const nextPendingVotes = { ...pendingVotes, [voter]: target };
  return { gameState, pendingVotes: nextPendingVotes };
}

export interface RevealVotesResult {
  gameState: GameState;
  eliminated: Address | null;
}

export function revealVotes(
  state: GameState,
  pendingVotes: Record<Address, Address>,
  roundContext: { nightDeaths: Address[]; nightSaves: Address[] },
  roleAssignments: Record<Address, Role>,
  now = Date.now(),
): RevealVotesResult {
  assert(state.phase === "VOTE", "Not currently voting");

  const tally = new Map<Address, number>();
  for (const target of Object.values(pendingVotes)) {
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  let eliminated: Address | null = null;
  let topCount = 0;
  let tied = false;
  for (const [address, count] of tally) {
    if (count > topCount) {
      topCount = count;
      eliminated = address;
      tied = false;
    } else if (count === topCount) {
      tied = true;
    }
  }
  if (tied) eliminated = null; // a tie results in no elimination

  let players = state.players.map((p) => ({
    ...p,
    isAlive: p.address === eliminated ? false : p.isAlive,
  }));
  const aliveCount = players.filter((p) => p.isAlive).length;

  const voteLog = eliminated
    ? [
        systemLog(
          state,
          state.turnNumber,
          `${nicknameOf(players, eliminated)} was voted out by the village.`,
          now,
        ),
      ]
    : [
        systemLog(
          state,
          state.turnNumber,
          "The vote was tied — no one is eliminated.",
          now,
        ),
      ];

  const roundHistory: RoundSummary[] = [
    ...state.roundHistory,
    {
      turnNumber: state.turnNumber,
      nightDeaths: roundContext.nightDeaths,
      nightSaves: roundContext.nightSaves,
      eliminatedByVote: eliminated,
      votes: pendingVotes,
    },
  ];

  const winner = checkVictory({ ...state, players, aliveCount }, roleAssignments);

  const gameState: GameState = {
    ...state,
    phase: winner ? "ENDED" : "NIGHT",
    turnNumber: winner ? state.turnNumber : state.turnNumber + 1,
    players: winner
      ? players
      : players.map((p) => ({
          ...p,
          hasActedThisNight: false,
          hasVotedThisRound: false,
        })),
    aliveCount,
    winner,
    lastEliminated: eliminated,
    dayLog: [...state.dayLog, ...voteLog],
    roundHistory,
    ...touch(state, now),
  };

  return { gameState, eliminated };
}

// ---------------------------------------------------------------------------
// Victory condition
// ---------------------------------------------------------------------------

/**
 * Roles are never stored on public GameState (mirrors how a real Compact
 * contract would need a ZK-verified tally rather than reading roles off
 * public ledger state), so victory can only be checked with the role map
 * supplied explicitly by the caller.
 */
export function checkVictory(
  state: GameState,
  roleAssignments: Record<Address, Role>,
): Winner {
  const alivePlayers = state.players.filter((p) => p.isAlive);
  const aliveWerewolves = alivePlayers.filter(
    (p) => roleAssignments[p.address] === "WEREWOLF",
  ).length;
  const aliveOthers = alivePlayers.length - aliveWerewolves;

  if (aliveWerewolves === 0) return "VILLAGERS";
  if (aliveWerewolves >= aliveOthers) return "WEREWOLVES";
  return null;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function nicknameOf(players: Player[], address: Address): string {
  return players.find((p) => p.address === address)?.nickname ?? address;
}

function systemLog(
  state: GameState,
  turnNumber: number,
  message: string,
  now: number,
): DayLogEntry {
  return {
    id: `${state.gameId}-log-${state.dayLog.length}-${now}`,
    turnNumber,
    author: "system",
    authorNickname: "System",
    message,
    type: "system",
    timestamp: now,
  };
}

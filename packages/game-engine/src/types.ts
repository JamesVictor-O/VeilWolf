/**
 * Core types for VeilWolf.
 *
 * `GameState` mirrors the shape we expect to eventually live as PUBLIC state
 * on the Midnight ledger (a Compact contract's public state). `PrivateState`
 * mirrors what will eventually come from Midnight's client-local private
 * state / witnesses instead of a plain local object. Keeping these two
 * shapes cleanly separated now is what makes the later swap to the real
 * Compact SDK a matter of re-implementing mockChainClient.ts, not rewriting
 * the UI.
 */

export type GamePhase =
  | "SETUP"
  | "NIGHT"
  | "DAWN"
  | "DAY"
  | "VOTE"
  | "ENDED";

export type Role = "WEREWOLF" | "VILLAGER" | "DOCTOR" | "SEER";

/** 9-player MVP composition. */
export const ROLE_COMPOSITION: Record<Role, number> = {
  WEREWOLF: 2,
  VILLAGER: 5,
  DOCTOR: 1,
  SEER: 1,
};

export const MIN_PLAYERS = Object.values(ROLE_COMPOSITION).reduce(
  (a, b) => a + b,
  0,
);

export type Winner = "WEREWOLVES" | "VILLAGERS" | null;

/** An address is a mocked stand-in for a Midnight wallet/public key. */
export type Address = string;

export interface Player {
  address: Address;
  nickname: string;
  isAlive: boolean;
  hasActedThisNight: boolean;
  hasVotedThisRound: boolean;
}

/**
 * Public game state. This is what every client can see, and what would
 * eventually be readable straight off the Compact contract's public ledger
 * state. It must never contain role assignments or vote targets in the
 * clear (those live in NightAction / PrivateState, mirroring how the real
 * contract would keep them behind commitments and ZK proofs).
 */
export interface GameState {
  gameId: string;
  host: Address;
  phase: GamePhase;
  turnNumber: number;
  players: Player[];
  aliveCount: number;
  winner: Winner;
  /** Set once VOTE phase reveals a nomination's outcome for the round. */
  lastEliminated: Address | null;
  /** Chat / event log shown on the DAY screen. Public by nature. */
  dayLog: DayLogEntry[];
  /** Full history of resolved rounds, used to drive the /replay screen. */
  roundHistory: RoundSummary[];
  createdAt: number;
  updatedAt: number;
}

export interface DayLogEntry {
  id: string;
  turnNumber: number;
  author: Address;
  authorNickname: string;
  message: string;
  type: "chat" | "nominate" | "second" | "system";
  timestamp: number;
}

export interface RoundSummary {
  turnNumber: number;
  nightDeaths: Address[];
  nightSaves: Address[];
  eliminatedByVote: Address | null;
  votes: Record<Address, Address>; // voter -> target
}

/** A single player's night action submission for the current turn. */
export interface NightAction {
  actor: Address;
  role: Role;
  /** WEREWOLF: kill target. DOCTOR: heal target. SEER: investigate target. */
  target: Address;
}

/**
 * Client-local private state for a single player. In the real integration
 * this is what Midnight's private local state / witness data provides
 * instead — it never touches the public ledger in the clear.
 */
export interface PrivateState {
  gameId: string;
  address: Address;
  role: Role | null;
  /** Mocked stand-in for the ZK proof key that would attest role membership. */
  roleProofKey: string | null;
  nightActionsHistory: NightAction[];
  /** SEER-only: results of past investigations, keyed by turnNumber. */
  investigationResults: Record<number, { target: Address; isWerewolf: boolean }>;
}

export function createEmptyPrivateState(
  gameId: string,
  address: Address,
): PrivateState {
  return {
    gameId,
    address,
    role: null,
    roleProofKey: null,
    nightActionsHistory: [],
    investigationResults: {},
  };
}

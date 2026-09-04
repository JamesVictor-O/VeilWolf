import type {
  Address,
  DayLogEntry,
  GameState,
  PrivateState,
  Role,
} from "./types";

export type TransactionStage =
  | "idle"
  | "preparing"
  | "proving"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";

export interface TransactionProgress {
  stage: TransactionStage;
  message: string;
  txId?: string;
  blockHeight?: number;
}
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
  getPrivateState(gameId: string, address: Address): Promise<PrivateState | null>;
  getRevealedRole(gameId: string, address: Address): Promise<Role | null>;
  getFinalReveal(gameId: string): Promise<Record<Address, Role> | null>;
  allEligibleActed(gameId: string): Promise<boolean>;
  allEligibleVoted(gameId: string): Promise<boolean>;
  subscribe(gameId: string, listener: (state: GameState) => void): () => void;
}

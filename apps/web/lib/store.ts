"use client";

/**
 * Zustand store for VeilWolf's client-side game state.
 *
 * Every action here calls `mockChainClient` — never `stateMachine.ts`
 * directly. When the real Midnight SDK client is ready, only the import at
 * the top of this file changes; every action signature below already
 * matches ChainClient's async interface.
 */

import { create } from "zustand";
import {
  type Address,
  type DayLogEntry,
  type GameState,
  type PrivateState,
} from "@veilwolf/game-engine";
import { chainClient } from "@/lib/chainClient";

interface GameStore {
  address: Address | null;
  nickname: string | null;
  gameState: GameState | null;
  privateState: PrivateState | null;
  loading: boolean;
  error: string | null;

  setIdentity: (address: Address, nickname: string) => void;
  clearError: () => void;

  loadGame: (gameId: string) => Promise<void>;
  subscribeToGame: (gameId: string) => () => void;

  createGame: () => Promise<string>;
  joinGame: (gameId: string) => Promise<void>;
  startGame: () => Promise<void>;
  submitNightAction: (target: Address) => Promise<void>;
  resolveDawn: () => Promise<void>;
  advanceToDay: () => Promise<void>;
  postDayMessage: (
    message: string,
    type?: DayLogEntry["type"],
  ) => Promise<void>;
  advanceToVote: () => Promise<void>;
  submitVote: (target: Address) => Promise<void>;
  revealVotes: () => Promise<void>;
}

async function run<T>(
  set: (partial: Partial<GameStore>) => void,
  fn: () => Promise<T>,
): Promise<T> {
  set({ loading: true, error: null });
  try {
    const result = await fn();
    set({ loading: false });
    return result;
  } catch (err) {
    set({ loading: false, error: (err as Error).message });
    throw err;
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  address: null,
  nickname: null,
  gameState: null,
  privateState: null,
  loading: false,
  error: null,

  setIdentity: (address, nickname) => set({ address, nickname }),
  clearError: () => set({ error: null }),

  loadGame: async (gameId) => {
    const [gameState, privateState] = await Promise.all([
      chainClient.getGameState(gameId),
      get().address
        ? chainClient.getPrivateState(gameId, get().address!)
        : Promise.resolve(null),
    ]);
    set({ gameState, privateState });
  },

  subscribeToGame: (gameId) => {
    return chainClient.subscribe(gameId, (gameState) => {
      set({ gameState });
      const address = get().address;
      if (address) {
        chainClient
          .getPrivateState(gameId, address)
          .then((privateState) => set({ privateState }));
      }
    });
  },

  createGame: () =>
    run(set, async () => {
      const { address, nickname } = get();
      if (!address || !nickname) throw new Error("Set your nickname first");
      const { gameState, privateState } = await chainClient.createGame({
        host: address,
        hostNickname: nickname,
      });
      set({ gameState, privateState });
      return gameState.gameId;
    }),

  joinGame: (gameId) =>
    run(set, async () => {
      const { address, nickname } = get();
      if (!address || !nickname) throw new Error("Set your nickname first");
      const { gameState, privateState } = await chainClient.joinGame({
        gameId,
        address,
        nickname,
      });
      set({ gameState, privateState });
    }),

  startGame: () =>
    run(set, async () => {
      const { address, gameState } = get();
      if (!address || !gameState) return;
      const { gameState: next } = await chainClient.startGame({
        gameId: gameState.gameId,
        actor: address,
      });
      set({ gameState: next });
      const privateState = await chainClient.getPrivateState(
        next.gameId,
        address,
      );
      set({ privateState });
    }),

  submitNightAction: (target) =>
    run(set, async () => {
      const { address, gameState } = get();
      if (!address || !gameState) return;
      const { gameState: next, privateState } =
        await chainClient.submitNightAction({
          gameId: gameState.gameId,
          actor: address,
          target,
        });
      set({ gameState: next, privateState });
    }),

  resolveDawn: () =>
    run(set, async () => {
      const { gameState } = get();
      if (!gameState) return;
      const { gameState: next } = await chainClient.resolveDawn({
        gameId: gameState.gameId,
      });
      set({ gameState: next });
    }),

  advanceToDay: () =>
    run(set, async () => {
      const { gameState } = get();
      if (!gameState) return;
      const { gameState: next } = await chainClient.advanceToDay({
        gameId: gameState.gameId,
      });
      set({ gameState: next });
    }),

  postDayMessage: (message, type) =>
    run(set, async () => {
      const { address, gameState } = get();
      if (!address || !gameState) return;
      const { gameState: next } = await chainClient.postDayMessage({
        gameId: gameState.gameId,
        author: address,
        message,
        type,
      });
      set({ gameState: next });
    }),

  advanceToVote: () =>
    run(set, async () => {
      const { gameState } = get();
      if (!gameState) return;
      const { gameState: next } = await chainClient.advanceToVote({
        gameId: gameState.gameId,
      });
      set({ gameState: next });
    }),

  submitVote: (target) =>
    run(set, async () => {
      const { address, gameState } = get();
      if (!address || !gameState) return;
      const { gameState: next } = await chainClient.submitVote({
        gameId: gameState.gameId,
        voter: address,
        target,
      });
      set({ gameState: next });
    }),

  revealVotes: () =>
    run(set, async () => {
      const { gameState } = get();
      if (!gameState) return;
      const { gameState: next } = await chainClient.revealVotes({
        gameId: gameState.gameId,
      });
      set({ gameState: next });
    }),
}));

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrCreateAddress, getStoredNickname } from "./identity";
import { useGameStore } from "./store";

/**
 * Hydrates identity + this game's state from mockChainClient and keeps it
 * live via subscribe(). Every /game/[gameId]/* and /lobby/[gameId] page
 * should call this once. Redirects to onboarding if no nickname is set yet
 * (e.g. a direct link opened in a fresh tab).
 */
export function useGameSync(gameId: string) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const setIdentity = useGameStore((s) => s.setIdentity);
  const loadGame = useGameStore((s) => s.loadGame);
  const subscribeToGame = useGameStore((s) => s.subscribeToGame);

  useEffect(() => {
    const nickname = getStoredNickname();
    if (!nickname) {
      router.replace("/onboarding/nickname");
      return;
    }
    const address = getOrCreateAddress();
    setIdentity(address, nickname);

    let unsubscribe: (() => void) | undefined;
    loadGame(gameId)
      .then(() => setReady(true))
      .catch(() => setReady(true));
    unsubscribe = subscribeToGame(gameId);

    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const gameState = useGameStore((s) => s.gameState);
  const privateState = useGameStore((s) => s.privateState);
  const address = useGameStore((s) => s.address);
  const error = useGameStore((s) => s.error);

  return { ready, gameState, privateState, address, error };
}

"use client";

import { MIN_PLAYERS } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useGameSync } from "@/lib/useGameSync";
import { useGameStore } from "@/lib/store";

export default function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, address, error } = useGameSync(gameId);
  const startGame = useGameStore((s) => s.startGame);
  const loading = useGameStore((s) => s.loading);
  const navigated = useRef(false);

  useEffect(() => {
    if (gameState && gameState.phase !== "SETUP" && !navigated.current) {
      navigated.current = true;
      router.replace(`/game/${gameId}/role-reveal`);
    }
  }, [gameState, gameId, router]);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        {error ? `Couldn't find that game (${error})` : "Loading lobby…"}
      </div>
    );
  }

  const isHost = gameState.host === address;
  const canStart = isHost && gameState.players.length === MIN_PLAYERS;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Game code</p>
        <p className="font-mono text-4xl font-black tracking-[0.3em] text-violet-300">
          {gameState.gameId}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Share this code — open a second tab and join to test with two players.
        </p>
      </div>

      <div className="grid flex-1 grid-cols-3 place-items-center gap-4 content-start">
        {gameState.players.map((p) => (
          <PlayerAvatar
            key={p.address}
            address={p.address}
            nickname={p.nickname}
            isHost={p.address === gameState.host}
            ready
          />
        ))}
        {Array.from({ length: MIN_PLAYERS - gameState.players.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-slate-700 text-slate-600"
          >
            ?
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-slate-500">
        {gameState.players.length} / {MIN_PLAYERS} players joined
      </p>

      {isHost ? (
        <Button onClick={() => startGame()} disabled={!canStart || loading}>
          {canStart ? "Start Game" : `Waiting for ${MIN_PLAYERS - gameState.players.length} more…`}
        </Button>
      ) : (
        <p className="text-center text-sm text-slate-500">Waiting for the host to start…</p>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}

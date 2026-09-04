"use client";

import { MIN_PLAYERS } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useGameSync } from "@/lib/useGameSync";
import { useGameStore } from "@/lib/store";
import { ErrorState, LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

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
    return <ScreenFrame title="Gathering the village">{error ? <ErrorState message={`We couldn't find this game. ${error}`} retry={() => window.location.reload()} /> : <LoadingState label="Loading lobby" />}</ScreenFrame>;
  }

  const isHost = gameState.host === address;
  const canStart = isHost && gameState.players.length === MIN_PLAYERS;

  return (
    <ScreenFrame eyebrow="Private lobby" title="The village is gathering." description="Share the code with people you trust. The game begins when all nine seats are filled.">
      <div className="grid flex-1 gap-8 lg:grid-cols-[0.72fr_1.28fr]">
      <section className="flex flex-col justify-between rounded-md border border-border bg-card p-6 sm:p-8">
        <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Game code</p>
        <p className="mt-3 font-mono text-4xl font-semibold tracking-[0.22em] text-primary sm:text-5xl">
          {gameState.gameId}
        </p>
        <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">
          Send this code to your group. Each player should join from their own browser session.
        </p>
        </div>
        <div className="mt-10 border-t border-border pt-5">
          <p className="font-mono text-sm tabular-nums"><span className="text-primary">{gameState.players.length}</span> / {MIN_PLAYERS} seated</p>
          <p className="mt-1 text-xs text-muted-foreground">{MIN_PLAYERS - gameState.players.length === 0 ? "Every seat is filled." : `${MIN_PLAYERS - gameState.players.length} seats remain.`}</p>
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex items-baseline justify-between"><h2 className="text-lg font-semibold">Player circle</h2><span className="text-xs text-muted-foreground">Ready check</span></div>
      <div className="grid grid-cols-3 place-items-center gap-x-4 gap-y-8 sm:grid-cols-5">
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
            className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border font-mono text-xs text-muted-foreground"
            aria-label="Empty player seat"
          >
            ?
          </div>
        ))}
      </div></section></div>

      <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      {isHost ? (
        <Button onClick={() => startGame()} disabled={!canStart} loading={loading} className="sm:ml-auto">
          {canStart ? "Begin the first night" : `Waiting for ${MIN_PLAYERS - gameState.players.length} more`}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground sm:ml-auto">Waiting for the host to begin.</p>
      )}

      {error && <p className="text-sm text-destructive" role="alert">{error} Try again.</p>}
      </div>
    </ScreenFrame>
  );
}

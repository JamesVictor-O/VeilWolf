"use client";

import { MIN_PLAYERS } from "@veilwolf/game-engine";
import { Button } from "@veilwolf/ui";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ErrorState, LoadingState } from "@/components/AsyncState";
import { GameHeader } from "@/components/GameHeader";
import { ScreenFrame } from "@/components/ScreenFrame";
import { getStoredAvatar } from "@/lib/identity";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";

const SEAT_POSITIONS = [
  [50, 8], [75, 16], [90, 39], [83, 68], [63, 86],
  [37, 86], [17, 68], [10, 39], [25, 16],
] as const;

export default function LobbyPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, address, error } = useGameSync(gameId);
  const startGame = useGameStore((s) => s.startGame);
  const fillWithSimulatedPlayers = useGameStore((s) => s.fillWithSimulatedPlayers);
  const loading = useGameStore((s) => s.loading);
  const navigated = useRef(false);
  const [copied, setCopied] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(2);

  useEffect(() => setLocalAvatar(getStoredAvatar()), []);

  useEffect(() => {
    if (gameState && gameState.phase !== "SETUP" && !navigated.current) {
      navigated.current = true;
      router.replace(`/game/${gameId}/role-reveal`);
    }
  }, [gameState, gameId, router]);

  if (!gameState) {
    return (
      <ScreenFrame title="Gathering the village">
        {error ? <ErrorState message={`We couldn't find this game. ${error}`} retry={() => window.location.reload()} /> : <LoadingState label="Loading lobby" />}
      </ScreenFrame>
    );
  }

  const isHost = gameState.host === address;
  const canStart = isHost && gameState.players.length === MIN_PLAYERS;
  const remaining = MIN_PLAYERS - gameState.players.length;
  const seats = Array.from({ length: MIN_PLAYERS }, (_, index) => gameState.players[index]);

  async function copyGameCode() {
    await navigator.clipboard.writeText(gameState!.gameId);
    setCopied(true);
  }

  return (
    <main className="waiting-arena min-h-screen overflow-hidden bg-background text-foreground">
      <GameHeader context={`Arena ${gameState.players.length}/${MIN_PLAYERS}`} />

      <div className="waiting-arena-layout mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1680px] lg:grid-cols-[0.7fr_1.3fr]">
        <section className="waiting-invitation relative z-10 flex flex-col justify-between border-b border-border px-6 py-8 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-10 xl:px-16">
          <div className="waiting-enter" style={{ "--waiting-delay": "0ms" } as CSSProperties}>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">Private gathering // invitation active</p>
            <h1 className="mt-5 max-w-[8ch] text-[clamp(3rem,7dvh,6.6rem)] font-semibold leading-[0.88] tracking-[-0.065em]">Enter the circle.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">Nine strangers take their seats. Before dawn, two of them will be hunting.</p>
          </div>

          <div className="waiting-code-panel waiting-enter mt-8" style={{ "--waiting-delay": "120ms" } as CSSProperties}>
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Summoning code</p>
              <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />Gate open</span>
            </div>

            <button type="button" onClick={copyGameCode} className="group mt-4 flex w-full items-end justify-between border-y border-border py-5 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background" aria-label={`Copy game code ${gameState.gameId}`}>
              <span className="font-mono text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-none tracking-[0.2em] text-primary">{gameState.gameId}</span>
              <span className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-foreground">{copied ? "Copied" : "Copy"}</span>
            </button>

            <div className="mt-5 flex items-end justify-between gap-5">
              <div>
                <p className="font-mono text-sm tabular-nums"><span className="text-primary">{gameState.players.length}</span> / {MIN_PLAYERS} masks claimed</p>
                <p className="mt-1 text-xs text-muted-foreground">{remaining === 0 ? "The circle is complete." : `${remaining} ${remaining === 1 ? "presence" : "presences"} still missing.`}</p>
              </div>
              <div className="flex gap-1" aria-hidden="true">{seats.map((player, index) => <span key={index} className={`h-5 w-1 ${player ? "bg-primary" : "bg-border"}`} />)}</div>
            </div>
          </div>

          <div className="waiting-enter mt-7" style={{ "--waiting-delay": "220ms" } as CSSProperties}>
            {isHost ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {remaining > 0 && <Button variant="secondary" onClick={() => fillWithSimulatedPlayers()} loading={loading}>Summon simulated players</Button>}
                <Button onClick={() => startGame()} disabled={!canStart} loading={loading}>{canStart ? "Seal the circle" : `Awaiting ${remaining}`}</Button>
              </div>
            ) : <p className="border-l border-primary pl-4 text-sm text-muted-foreground">The host will seal the circle when every mask is claimed.</p>}
            {error && <p className="mt-3 text-sm text-destructive" role="alert">{error} Try again.</p>}
            {isHost && gameState.players.some((player) => isSimulatedPlayer(player.address)) && <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Simulation active // synthetic players act automatically</p>}
          </div>
        </section>

        <section className="waiting-stage relative min-h-[680px] overflow-hidden px-4 py-7 sm:px-8 lg:min-h-0 lg:py-8" aria-labelledby="circle-title">
          <div className="relative z-10 flex items-start justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Waiting arena</p>
              <h2 id="circle-title" className="mt-2 text-xl font-medium">The village assembles</h2>
            </div>
            <p className="max-w-48 text-right text-xs leading-5 text-muted-foreground">Every arrival changes who you can trust.</p>
          </div>

          <div className="waiting-circle relative mx-auto mt-5 h-[560px] max-w-[820px] sm:h-[620px] lg:h-[calc(100dvh-11.5rem)] lg:min-h-[540px] lg:max-h-[740px]">
            <div className="waiting-ring waiting-ring-outer" aria-hidden="true" />
            <div className="waiting-ring waiting-ring-inner" aria-hidden="true" />
            <div className="waiting-center" aria-hidden="true">
              <Image src="/veilwolflogo.png" alt="" width={180} height={180} className="waiting-center-mark" />
              <p className="font-mono text-3xl text-foreground"><span className="text-primary">{gameState.players.length}</span>/{MIN_PLAYERS}</p>
              <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.24em] text-muted-foreground">Circle forming</p>
            </div>

            <div className="waiting-seats">
              {seats.map((player, index) => {
                const [x, y] = SEAT_POSITIONS[index]!;
                const avatar = player?.address === address ? localAvatar : index % 5;
                const seatStyle = { "--seat-x": `${x}%`, "--seat-y": `${y}%`, "--seat-delay": `${180 + index * 65}ms` } as CSSProperties;

                return (
                  <div key={player?.address ?? `empty-${index}`} className={`waiting-seat ${player ? "is-claimed" : "is-empty"}`} style={seatStyle}>
                    <div className="waiting-portrait">
                      {player ? (
                        <Image src="/images/veilwolf-roster.png" alt="" width={2098} height={750} className="absolute bottom-0 h-full w-[500%] max-w-none object-cover object-bottom" style={{ left: `-${avatar * 100}%` }} />
                      ) : <span className="waiting-empty-rune">{String(index + 1).padStart(2, "0")}</span>}
                    </div>
                    <div className="mt-2 min-w-0 text-center">
                      <p className="max-w-28 truncate text-xs font-medium text-foreground">{player?.nickname ?? "Open seat"}</p>
                      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">{player ? (player.address === gameState.host ? "Host // ready" : isSimulatedPlayer(player.address) ? "Echo // ready" : "Ready") : "Awaiting"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function isSimulatedPlayer(address: string): boolean {
  return address.startsWith("simulated:");
}

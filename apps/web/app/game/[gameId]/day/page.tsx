"use client";

import { Button } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { GameHeader } from "@/components/GameHeader";
import { PlayerMask } from "@/components/PlayerMask";

export default function DayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, address } = useGameSync(gameId);
  const postDayMessage = useGameStore((s) => s.postDayMessage);
  const advanceToVote = useGameStore((s) => s.advanceToVote);
  const loading = useGameStore((s) => s.loading);
  const [message, setMessage] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState?.phase === "VOTE") router.replace(`/game/${gameId}/vote`);
    if (gameState?.phase === "NIGHT") router.replace(`/game/${gameId}/night`);
    if (gameState?.phase === "ENDED") router.replace(`/game/${gameId}/victory`);
  }, [gameState, gameId, router]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [gameState?.dayLog.length]);

  if (!gameState) {
    return <ScreenFrame title="The village wakes"><LoadingState label="Loading day" /></ScreenFrame>;
  }

  const turnLog = gameState.dayLog.filter((l) => l.turnNumber === gameState.turnNumber);
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  const self = gameState.players.find((p) => p.address === address);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage("");
    await postDayMessage(trimmed, "chat");
  }

  async function nominate(target: string, nickname: string) {
    await postDayMessage(`nominates ${nickname} for elimination.`, "nominate");
    void target;
  }

  async function second(target: string, nickname: string) {
    await postDayMessage(`seconds the nomination of ${nickname}.`, "second");
    void target;
  }

  return (
    <main className="day-chamber min-h-screen bg-background text-foreground">
      <GameHeader context={`Day ${gameState.turnNumber} · council`} />
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-[1680px] flex-col">
        <header className="grid border-b border-border lg:grid-cols-[0.72fr_1.28fr]">
          <div className="px-6 py-8 sm:px-10 lg:border-r lg:px-12 lg:py-9 xl:px-16">
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">Day {gameState.turnNumber} · public council</p>
            <h1 className="mt-4 text-[clamp(3rem,6dvh,5.5rem)] font-semibold leading-[0.9] tracking-[-0.06em]">The village gathers.</h1>
          </div>
          <div className="day-panorama relative min-h-40 overflow-hidden px-6 py-8 sm:px-10 lg:min-h-0 lg:px-12">
            <div className="absolute inset-x-0 bottom-0 h-full opacity-30"><PlayerMask index={2} name="The village" size="lg" /></div>
            <p className="relative z-10 ml-auto max-w-sm text-right text-base leading-7 text-muted-foreground">Listen for contradictions. Defend your name. Decide who must face the vote.</p>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[0.72fr_1.28fr]">
          <section className="border-b border-border px-5 py-6 sm:px-8 lg:border-b-0 lg:border-r lg:px-10">
            <div className="mb-5 flex items-baseline justify-between"><h2 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">The accused</h2><span className="font-mono text-xs tabular-nums text-muted-foreground">{alivePlayers.length} alive</span></div>
            <div className="day-player-list grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {alivePlayers.map((p, index) => (
          <article key={p.address} className="day-player-row flex min-w-0 items-center gap-3 border border-border bg-card p-3">
            <PlayerMask index={index} name={p.nickname} size="sm" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.nickname}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{p.address === address ? "You · listening" : "Statement pending"}</p></div>
            {p.address !== address && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => nominate(p.address, p.nickname)}
                  className="min-h-10 border border-border px-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors duration-100 hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Nominate
                </button>
                <button
                  type="button"
                  onClick={() => second(p.address, p.nickname)}
                  className="min-h-10 border border-border px-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors duration-100 hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Second
                </button>
              </div>
            )}
          </article>
        ))}
            </div>
          </section>

          <section className="flex min-h-[36rem] flex-col bg-card/60 lg:min-h-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-8"><div><h2 className="text-base font-semibold">Council transcript</h2><p className="mt-1 text-xs text-muted-foreground">Every word can become evidence.</p></div><span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" aria-label="Council live" /></div>
      <div className="day-transcript flex flex-1 flex-col gap-2 overflow-y-auto p-5 sm:p-8" aria-live="polite">
        {turnLog.map((entry) => (
          <div key={entry.id} className={`day-log-entry text-sm ${entry.type}`}>
            {entry.type === "system" ? (
              <p className="border-l border-border py-2 pl-4 italic text-muted-foreground">{entry.message}</p>
            ) : entry.type === "nominate" || entry.type === "second" ? (
              <p className="border-l border-primary bg-accent/40 px-4 py-3 text-primary">
                <strong>{entry.authorNickname}</strong> {entry.message}
              </p>
            ) : (
              <p className="max-w-[85%] border border-border bg-card px-4 py-3 text-foreground">
                <strong className="mr-2 text-primary">{entry.authorNickname}</strong>{entry.message}
              </p>
            )}
          </div>
        ))}
        {turnLog.length === 0 && <div className="my-auto text-center"><p className="text-sm font-medium">The square is quiet.</p><p className="mt-1 text-xs text-muted-foreground">Start the conversation when you are ready.</p></div>}
        <div ref={logEndRef} />
      </div>

      {self?.isAlive && (
        <form onSubmit={send} className="flex gap-2 border-t border-border p-4 sm:p-5">
          <label htmlFor="day-message" className="sr-only">Message the village</label>
          <input
            id="day-message"
            autoComplete="off"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something…"
            maxLength={280}
            className="min-h-12 min-w-0 flex-1 border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button type="submit" disabled={!message.trim()}>
            Send
          </Button>
        </form>
      )}
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">When discussion ends, every living player must choose.</p>
          <Button variant="secondary" onClick={() => advanceToVote()} loading={loading} className="w-full sm:w-auto">Call for the vote</Button>
        </footer>
      </div>
    </main>
  );
}

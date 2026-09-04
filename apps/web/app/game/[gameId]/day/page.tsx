"use client";

import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

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
    <ScreenFrame eyebrow={`Day ${gameState.turnNumber}`} title="The village gathers." description="Listen for contradictions. Defend yourself. Decide who should face the vote.">
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[0.72fr_1.28fr]">
      <section className="rounded-md border border-border bg-card p-5">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Living players</h2>
      <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 lg:grid-cols-3">
        {alivePlayers.map((p) => (
          <div key={p.address} className="flex flex-col items-center gap-1">
            <PlayerAvatar address={p.address} nickname={p.nickname} size="sm" />
            {p.address !== address && (
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => nominate(p.address, p.nickname)}
                  className="min-h-10 rounded-sm border border-border px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Nominate
                </button>
                <button
                  type="button"
                  onClick={() => second(p.address, p.nickname)}
                  className="min-h-10 rounded-sm border border-border px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Second
                </button>
              </div>
            )}
          </div>
        ))}
      </div></section>

      <section className="flex min-h-[25rem] flex-col rounded-md border border-border bg-card">
      <div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Village square</h2><p className="mt-1 text-xs text-muted-foreground">Living players only</p></div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5" aria-live="polite">
        {turnLog.map((entry) => (
          <div key={entry.id} className="text-sm">
            {entry.type === "system" ? (
              <p className="italic text-muted-foreground">{entry.message}</p>
            ) : entry.type === "nominate" || entry.type === "second" ? (
              <p className="text-primary">
                <strong>{entry.authorNickname}</strong> {entry.message}
              </p>
            ) : (
              <p className="text-foreground">
                <strong>{entry.authorNickname}:</strong>{" "}
                {entry.message}
              </p>
            )}
          </div>
        ))}
        {turnLog.length === 0 && <div className="my-auto text-center"><p className="text-sm font-medium">The square is quiet.</p><p className="mt-1 text-xs text-muted-foreground">Start the conversation when you are ready.</p></div>}
        <div ref={logEndRef} />
      </div>

      {self?.isAlive && (
        <form onSubmit={send} className="flex gap-2 border-t border-border p-4">
          <label htmlFor="day-message" className="sr-only">Message the village</label>
          <input
            id="day-message"
            autoComplete="off"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something…"
            maxLength={280}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={!message.trim()}>
            Send
          </Button>
        </form>
      )}
      </section></div>

      <Button variant="secondary" onClick={() => advanceToVote()} loading={loading} className="mt-6 w-full sm:ml-auto sm:w-auto">
        Proceed to Vote
      </Button>
    </ScreenFrame>
  );
}

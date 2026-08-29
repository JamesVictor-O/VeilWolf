"use client";

import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";

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
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [gameState?.dayLog.length]);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Loading day…
      </div>
    );
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
    <div className="flex flex-1 flex-col gap-4 px-4 py-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Turn {gameState.turnNumber}</p>
        <h1 className="text-xl font-bold text-slate-50">The village gathers</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {alivePlayers.map((p) => (
          <div key={p.address} className="flex flex-col items-center gap-1">
            <PlayerAvatar address={p.address} nickname={p.nickname} size="sm" />
            {p.address !== address && (
              <div className="flex gap-1">
                <button
                  onClick={() => nominate(p.address, p.nickname)}
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                >
                  Nominate
                </button>
                <button
                  onClick={() => second(p.address, p.nickname)}
                  className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                >
                  Second
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        {turnLog.map((entry) => (
          <div key={entry.id} className="text-sm">
            {entry.type === "system" ? (
              <p className="italic text-slate-500">{entry.message}</p>
            ) : entry.type === "nominate" || entry.type === "second" ? (
              <p className="text-amber-300">
                <strong>{entry.authorNickname}</strong> {entry.message}
              </p>
            ) : (
              <p className="text-slate-200">
                <strong className="text-violet-300">{entry.authorNickname}:</strong>{" "}
                {entry.message}
              </p>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {self?.isAlive && (
        <form onSubmit={send} className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something…"
            maxLength={280}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
          />
          <Button type="submit" disabled={!message.trim()}>
            Send
          </Button>
        </form>
      )}

      <Button variant="secondary" onClick={() => advanceToVote()} disabled={loading}>
        Proceed to Vote
      </Button>
    </div>
  );
}

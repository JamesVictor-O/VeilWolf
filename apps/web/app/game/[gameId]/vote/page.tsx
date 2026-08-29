"use client";

import type { Address } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";

export default function VotePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, address } = useGameSync(gameId);
  const submitVote = useGameStore((s) => s.submitVote);
  const revealVotes = useGameStore((s) => s.revealVotes);
  const loading = useGameStore((s) => s.loading);
  const [selected, setSelected] = useState<Address | null>(null);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === "NIGHT" || gameState.phase === "ENDED") {
      router.replace(`/game/${gameId}/elimination`);
    }
  }, [gameState, gameId, router]);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Loading vote…
      </div>
    );
  }

  const self = gameState.players.find((p) => p.address === address);
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  const votedCount = alivePlayers.filter((p) => p.hasVotedThisRound).length;
  const allVoted = votedCount === alivePlayers.length;

  if (!self?.isAlive) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">👻</span>
        <p className="text-slate-400">You&apos;ve been eliminated. Watch how it unfolds.</p>
        <p className="text-sm text-slate-600">{votedCount}/{alivePlayers.length} votes cast</p>
        {allVoted && (
          <Button onClick={() => revealVotes()} disabled={loading}>
            Reveal Votes
          </Button>
        )}
      </div>
    );
  }

  if (self.hasVotedThisRound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">🗳️</span>
        <p className="text-slate-300">Your vote is locked in.</p>
        <p className="text-sm text-slate-500">{votedCount}/{alivePlayers.length} votes cast</p>
        {allVoted && (
          <Button onClick={() => revealVotes()} disabled={loading}>
            Reveal Votes
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Turn {gameState.turnNumber}</p>
        <h1 className="text-xl font-bold text-slate-50">Who do you vote to eliminate?</h1>
      </div>

      <div className="grid flex-1 grid-cols-3 place-items-center gap-4 content-start">
        {alivePlayers.map((p) => (
          <button
            key={p.address}
            type="button"
            onClick={() => setSelected(p.address)}
            className={`rounded-xl p-2 transition-colors ${
              selected === p.address ? "bg-red-600/30 ring-2 ring-red-500" : ""
            }`}
          >
            <PlayerAvatar address={p.address} nickname={p.nickname} />
          </button>
        ))}
      </div>

      <Button
        variant="danger"
        disabled={!selected || loading}
        onClick={() => selected && submitVote(selected)}
      >
        Cast Vote
      </Button>
    </div>
  );
}

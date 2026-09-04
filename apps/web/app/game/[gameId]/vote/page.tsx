"use client";

import type { Address } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

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
    return <ScreenFrame title="Preparing the ballot"><LoadingState label="Loading vote" /></ScreenFrame>;
  }

  const self = gameState.players.find((p) => p.address === address);
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  const votedCount = alivePlayers.filter((p) => p.hasVotedThisRound).length;
  const allVoted = votedCount === alivePlayers.length;

  if (!self?.isAlive) {
    return (
      <ScreenFrame eyebrow="Spectator" title="The living must decide." description="You have been eliminated. Watch the ballot close without influencing the village.">
        <div className="flex flex-1 flex-col items-start justify-center gap-4"><p className="font-mono text-sm text-muted-foreground">{votedCount}/{alivePlayers.length} ballots sealed</p>
        {allVoted && (
          <Button onClick={() => revealVotes()} loading={loading}>
            Reveal Votes
          </Button>
        )}</div>
      </ScreenFrame>
    );
  }

  if (self.hasVotedThisRound) {
    return (
      <ScreenFrame eyebrow={`Vote ${gameState.turnNumber}`} title="Your ballot is sealed." description="No one can read your choice before the vote resolves.">
        <div className="flex flex-1 flex-col items-start justify-center gap-4"><p className="font-mono text-sm text-muted-foreground">{votedCount}/{alivePlayers.length} ballots sealed</p>
        {allVoted && (
          <Button onClick={() => revealVotes()} loading={loading}>
            Reveal Votes
          </Button>
        )}</div>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame eyebrow={`Vote ${gameState.turnNumber}`} title="Who should leave the village?" description="Choose one living player. Your ballot remains private until the result is resolved.">
      <div className="grid flex-1 grid-cols-3 place-items-center gap-x-4 gap-y-8 rounded-md border border-border bg-card p-6 sm:grid-cols-5 sm:p-8">
        {alivePlayers.map((p) => (
          <button
            key={p.address}
            type="button"
            onClick={() => setSelected(p.address)}
            aria-pressed={selected === p.address}
            className={`min-h-24 min-w-20 rounded-md p-2 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
              selected === p.address ? "bg-destructive/15 ring-2 ring-destructive" : "hover:bg-muted"
            }`}
          >
            <PlayerAvatar address={p.address} nickname={p.nickname} />
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">A sealed ballot cannot be changed.</p><Button
        variant="danger"
        disabled={!selected || loading}
        onClick={() => selected && submitVote(selected)}
        loading={loading}
        className="w-full sm:w-auto"
      >
        Cast Vote
      </Button></div>
    </ScreenFrame>
  );
}

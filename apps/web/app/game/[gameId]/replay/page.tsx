"use client";

import { type Address, type Role } from "@veilwolf/game-engine";
import { Button } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameSync } from "@/lib/useGameSync";
import { chainClient } from "@/lib/chainClient";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

export default function ReplayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState } = useGameSync(gameId);
  const [reveal, setReveal] = useState<Record<Address, Role> | null>(null);

  useEffect(() => {
    chainClient.getFinalReveal(gameId).then(setReveal);
  }, [gameId]);

  if (!gameState) {
    return <ScreenFrame title="Reconstructing the story"><LoadingState label="Loading replay" /></ScreenFrame>;
  }

  function nicknameOf(addr: Address): string {
    return gameState!.players.find((p) => p.address === addr)?.nickname ?? addr;
  }

  return (
    <ScreenFrame eyebrow="Public history" title="How the night unfolded." description="A redacted replay built only from finalized public outcomes.">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {gameState.roundHistory.map((round) => (
          <div
            key={round.turnNumber}
            className="rounded-md border border-border bg-card p-5"
          >
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              Turn {round.turnNumber}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {round.nightDeaths.length > 0 ? (
                round.nightDeaths.map((addr) => (
                  <li key={addr}>
                    Night · {nicknameOf(addr)} was killed
                    {reveal && ` (${reveal[addr]})`}
                  </li>
                ))
              ) : (
                <li>Night · No one died</li>
              )}
              {round.eliminatedByVote ? (
                <li>
                  Vote · {nicknameOf(round.eliminatedByVote)} was eliminated
                  {reveal && ` (${reveal[round.eliminatedByVote]})`}
                </li>
              ) : (
                <li>Vote · Tied, no elimination</li>
              )}
            </ul>
          </div>
        ))}
        {gameState.roundHistory.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-8 text-center"><p className="text-sm font-medium">No completed rounds.</p><p className="mt-1 text-xs text-muted-foreground">The public story appears here after the first vote.</p></div>
        )}
      </div>

      {gameState.winner && (
        <p className="text-center font-semibold text-foreground">
          Winner: {gameState.winner === "WEREWOLVES" ? "Werewolves" : "Villagers"}
        </p>
      )}

      <Button variant="secondary" onClick={() => router.push("/home")}>
        Back to Home
      </Button>
    </ScreenFrame>
  );
}

"use client";

import { mockChainClient, type Address, type Role } from "@veilwolf/game-engine";
import { Button } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameSync } from "@/lib/useGameSync";

export default function ReplayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState } = useGameSync(gameId);
  const [reveal, setReveal] = useState<Record<Address, Role> | null>(null);

  useEffect(() => {
    mockChainClient.getFinalReveal(gameId).then(setReveal);
  }, [gameId]);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Loading replay…
      </div>
    );
  }

  function nicknameOf(addr: Address): string {
    return gameState!.players.find((p) => p.address === addr)?.nickname ?? addr;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-center text-2xl font-bold text-slate-50">Replay</h1>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {gameState.roundHistory.map((round) => (
          <div
            key={round.turnNumber}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <p className="text-xs uppercase tracking-widest text-violet-400">
              Turn {round.turnNumber}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {round.nightDeaths.length > 0 ? (
                round.nightDeaths.map((addr) => (
                  <li key={addr}>
                    🌙 {nicknameOf(addr)} was killed in the night
                    {reveal && ` (${reveal[addr]})`}
                  </li>
                ))
              ) : (
                <li>🌙 No one died in the night</li>
              )}
              {round.eliminatedByVote ? (
                <li>
                  ⚖️ {nicknameOf(round.eliminatedByVote)} was voted out
                  {reveal && ` (${reveal[round.eliminatedByVote]})`}
                </li>
              ) : (
                <li>⚖️ The vote was tied — no elimination</li>
              )}
            </ul>
          </div>
        ))}
        {gameState.roundHistory.length === 0 && (
          <p className="text-center text-slate-500">No rounds completed yet.</p>
        )}
      </div>

      {gameState.winner && (
        <p className="text-center font-semibold text-slate-200">
          Winner: {gameState.winner === "WEREWOLVES" ? "🐺 Werewolves" : "🕊️ Villagers"}
        </p>
      )}

      <Button variant="secondary" onClick={() => router.push("/home")}>
        Back to Home
      </Button>
    </div>
  );
}

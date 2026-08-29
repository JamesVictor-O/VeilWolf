"use client";

import { mockChainClient, type Role } from "@veilwolf/game-engine";
import { Button, RoleCard } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameSync } from "@/lib/useGameSync";

export default function EliminationPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, address } = useGameSync(gameId);
  const [role, setRole] = useState<Role | null>(null);
  const [lastWords, setLastWords] = useState("");
  const [posted, setPosted] = useState(false);

  const eliminated = gameState?.lastEliminated ?? null;
  const eliminatedPlayer = gameState?.players.find((p) => p.address === eliminated) ?? null;
  const isMe = eliminated === address;

  useEffect(() => {
    if (!gameId || !eliminated) return;
    mockChainClient.getRevealedRole(gameId, eliminated).then(setRole);
  }, [gameId, eliminated]);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Loading results…
      </div>
    );
  }

  function handleContinue() {
    if (gameState!.winner) {
      router.push(`/game/${gameId}/victory`);
    } else {
      router.push(`/game/${gameId}/night`);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {eliminatedPlayer ? (
        <>
          <span className="text-5xl">⚖️</span>
          <h1 className="text-2xl font-bold text-slate-50">
            {eliminatedPlayer.nickname} was eliminated
          </h1>
          {role && <RoleCard role={role} className="mx-auto" />}

          {isMe && !posted && (
            <div className="flex w-full max-w-xs flex-col gap-2">
              <textarea
                value={lastWords}
                onChange={(e) => setLastWords(e.target.value)}
                placeholder="Any last words? (only shown on your screen)"
                maxLength={200}
                rows={3}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              />
              <Button variant="secondary" onClick={() => setPosted(true)} disabled={!lastWords.trim()}>
                Share last words
              </Button>
            </div>
          )}
          {isMe && posted && (
            <p className="max-w-xs italic text-slate-400">&ldquo;{lastWords}&rdquo;</p>
          )}
        </>
      ) : (
        <>
          <span className="text-5xl">🤝</span>
          <h1 className="text-2xl font-bold text-slate-50">The vote was tied</h1>
          <p className="text-slate-400">No one was eliminated this round.</p>
        </>
      )}

      <Button onClick={handleContinue}>
        {gameState.winner ? "See final results" : "Continue to Night"}
      </Button>
    </div>
  );
}

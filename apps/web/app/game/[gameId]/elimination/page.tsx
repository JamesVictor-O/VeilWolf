"use client";

import { type Role } from "@veilwolf/game-engine";
import { Button, RoleCard } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameSync } from "@/lib/useGameSync";
import { chainClient } from "@/lib/chainClient";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

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
    chainClient.getRevealedRole(gameId, eliminated).then(setRole);
  }, [gameId, eliminated]);

  if (!gameState) {
    return <ScreenFrame title="Counting every ballot"><LoadingState label="Loading results" /></ScreenFrame>;
  }

  function handleContinue() {
    if (gameState!.winner) {
      router.push(`/game/${gameId}/victory`);
    } else {
      router.push(`/game/${gameId}/night`);
    }
  }

  return (
    <ScreenFrame eyebrow="The verdict" title={eliminatedPlayer ? `${eliminatedPlayer.nickname} leaves the village.` : "The village could not decide."} description={eliminatedPlayer ? "The ballot is final. Their role can now be revealed according to this game's rules." : "The vote was tied. No one is eliminated this round."}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      {eliminatedPlayer ? (
        <>
          {role && <RoleCard role={role} className="mx-auto" />}

          {isMe && !posted && (
            <div className="flex w-full max-w-xs flex-col gap-2">
              <label htmlFor="last-words" className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Last words</label><textarea
                id="last-words"
                value={lastWords}
                onChange={(e) => setLastWords(e.target.value)}
                placeholder="Any last words? (only shown on your screen)"
                maxLength={200}
                rows={3}
                className="rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button variant="secondary" onClick={() => setPosted(true)} disabled={!lastWords.trim()}>
                Share last words
              </Button>
            </div>
          )}
          {isMe && posted && (
            <p className="max-w-xs italic text-muted-foreground">&ldquo;{lastWords}&rdquo;</p>
          )}
        </>
      ) : (
        <>
          <div className="grid h-24 w-24 place-items-center rounded-full border border-border font-mono text-3xl text-muted-foreground">—</div>
        </>
      )}

      <Button onClick={handleContinue}>
        {gameState.winner ? "See final results" : "Continue to Night"}
      </Button></div>
    </ScreenFrame>
  );
}

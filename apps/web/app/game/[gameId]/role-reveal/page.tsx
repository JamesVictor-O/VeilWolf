"use client";

import { RoleCard, Button } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useGameSync } from "@/lib/useGameSync";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

export default function RoleRevealPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, privateState } = useGameSync(gameId);
  const [revealed, setRevealed] = useState(false);

  if (!gameState || !privateState?.role) {
    return <ScreenFrame title="Sealing your role"><LoadingState label="Assigning roles" /></ScreenFrame>;
  }

  return (
    <ScreenFrame eyebrow={`Night ${gameState.turnNumber}`} title={revealed ? "Remember who you are." : "This secret is yours alone."} description={revealed ? "Read your ability carefully. The village will only see what you choose to show." : "Shield your screen, then reveal the role Midnight assigned to you."}>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        className="cursor-pointer rounded-lg border-none bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        aria-label={revealed ? "Hide role" : "Reveal role"}
        aria-pressed={revealed}
      >
        <RoleCard role={privateState.role} revealed={revealed} />
      </button>

      {revealed ? (
        <div className="flex w-full max-w-xs flex-col gap-3"><Button onClick={() => router.push(`/game/${gameId}/night`)}>I&apos;m ready for night</Button><Button variant="ghost" onClick={() => setRevealed(false)}>Hide role</Button></div>
      ) : (
        <p className="max-w-xs text-center text-xs leading-5 text-muted-foreground">Make sure no one else can see your screen. You can hide the card again before continuing.</p>
      )}
      </div>
    </ScreenFrame>
  );
}

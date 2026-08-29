"use client";

import { RoleCard, Button } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useGameSync } from "@/lib/useGameSync";

export default function RoleRevealPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, privateState } = useGameSync(gameId);
  const [revealed, setRevealed] = useState(false);

  if (!gameState || !privateState?.role) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Assigning roles…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Turn {gameState.turnNumber}</p>
        <h1 className="text-2xl font-bold text-slate-50">Your secret role</h1>
      </div>

      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="cursor-pointer border-none bg-transparent p-0"
        aria-label="Reveal role"
      >
        <RoleCard role={privateState.role} revealed={revealed} />
      </button>

      {revealed ? (
        <Button onClick={() => router.push(`/game/${gameId}/night`)}>
          I&apos;m ready for night
        </Button>
      ) : (
        <p className="text-sm text-slate-500">
          Make sure no one else can see your screen, then tap the card.
        </p>
      )}
    </div>
  );
}

"use client";

import { mockChainClient, type Address, type Role } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameSync } from "@/lib/useGameSync";

export default function VictoryPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, address } = useGameSync(gameId);
  const [reveal, setReveal] = useState<Record<Address, Role> | null>(null);

  useEffect(() => {
    if (gameState?.phase !== "ENDED") return;
    mockChainClient.getFinalReveal(gameId).then(setReveal);
  }, [gameId, gameState?.phase]);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Loading results…
      </div>
    );
  }

  if (gameState.phase !== "ENDED") {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        The game isn&apos;t over yet.
      </div>
    );
  }

  const won =
    (gameState.winner === "WEREWOLVES" && reveal?.[address ?? ""] === "WEREWOLF") ||
    (gameState.winner === "VILLAGERS" && reveal && reveal[address ?? ""] !== "WEREWOLF");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div>
        <span className="text-6xl">{gameState.winner === "WEREWOLVES" ? "🐺" : "🕊️"}</span>
        <h1 className="mt-4 text-3xl font-black text-slate-50">
          {gameState.winner === "WEREWOLVES" ? "The Werewolves Win" : "The Villagers Win"}
        </h1>
        {reveal && (
          <p className="mt-2 text-sm text-slate-400">
            {won ? "You were on the winning side!" : "Better luck next time."}
          </p>
        )}
      </div>

      <div className="grid w-full grid-cols-3 place-items-center gap-y-4">
        {gameState.players.map((p) => (
          <div key={p.address} className="flex flex-col items-center gap-1">
            <PlayerAvatar address={p.address} nickname={p.nickname} isAlive={p.isAlive} />
            {reveal && (
              <span className="text-[10px] uppercase tracking-wide text-slate-500">
                {reveal[p.address]}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={() => router.push(`/game/${gameId}/replay`)}>View Replay</Button>
        <Button variant="secondary" onClick={() => router.push("/home")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}

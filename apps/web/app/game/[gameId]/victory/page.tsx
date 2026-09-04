"use client";

import { type Address, type Role } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameSync } from "@/lib/useGameSync";
import { chainClient } from "@/lib/chainClient";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

export default function VictoryPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, address } = useGameSync(gameId);
  const [reveal, setReveal] = useState<Record<Address, Role> | null>(null);

  useEffect(() => {
    if (gameState?.phase !== "ENDED") return;
    chainClient.getFinalReveal(gameId).then(setReveal);
  }, [gameId, gameState?.phase]);

  if (!gameState) {
    return <ScreenFrame title="Sealing the final story"><LoadingState label="Loading results" /></ScreenFrame>;
  }

  if (gameState.phase !== "ENDED") {
    return (
      <ScreenFrame title="The story is not finished"><p className="text-muted-foreground">Return to the match and let the village decide.</p></ScreenFrame>
    );
  }

  const won =
    (gameState.winner === "WEREWOLVES" && reveal?.[address ?? ""] === "WEREWOLF") ||
    (gameState.winner === "VILLAGERS" && reveal && reveal[address ?? ""] !== "WEREWOLF");

  return (
    <ScreenFrame eyebrow="The final reveal" title={gameState.winner === "WEREWOLVES" ? "The wolves inherit the village." : "The village survives the night."} description="Every role is now revealed. The public history below preserves the story without exposing private choices made during play.">
      <div className="flex flex-1 flex-col gap-8">
      <div>
        {reveal && (
          <p className="text-sm text-muted-foreground">
            {won ? "You were on the winning side." : "Your side fell tonight."}
          </p>
        )}
      </div>

      <div className="grid w-full grid-cols-3 place-items-center gap-y-6 rounded-md border border-border bg-card p-6 sm:grid-cols-5">
        {gameState.players.map((p) => (
          <div key={p.address} className="flex flex-col items-center gap-1">
            <PlayerAvatar address={p.address} nickname={p.nickname} isAlive={p.isAlive} />
            {reveal && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {reveal[p.address]}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto flex w-full flex-col gap-2 sm:ml-auto sm:max-w-xs">
        <Button onClick={() => router.push(`/game/${gameId}/replay`)}>View Replay</Button>
        <Button variant="secondary" onClick={() => router.push("/home")}>
          Back to Home
        </Button>
      </div></div>
    </ScreenFrame>
  );
}

"use client";

import type { Address, Role } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";

const ROLE_PROMPT: Record<Role, string> = {
  WEREWOLF: "Choose a victim",
  VILLAGER: "Listen to the silence",
  DOCTOR: "Choose someone to protect",
  SEER: "Choose someone to investigate",
};

export default function NightPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, privateState, address } = useGameSync(gameId);
  const submitNightAction = useGameStore((s) => s.submitNightAction);
  const resolveDawn = useGameStore((s) => s.resolveDawn);
  const advanceToDay = useGameStore((s) => s.advanceToDay);
  const loading = useGameStore((s) => s.loading);
  const [selected, setSelected] = useState<Address | null>(null);
  const [investigation, setInvestigation] = useState<{
    target: Address;
    isWerewolf: boolean;
  } | null>(null);

  const self = useMemo(
    () => gameState?.players.find((p) => p.address === address) ?? null,
    [gameState, address],
  );

  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === "DAY") router.replace(`/game/${gameId}/day`);
    if (gameState.phase === "VOTE") router.replace(`/game/${gameId}/vote`);
    if (gameState.phase === "ENDED") router.replace(`/game/${gameId}/victory`);
  }, [gameState, gameId, router]);

  useEffect(() => {
    if (
      gameState?.phase === "DAWN" &&
      privateState?.role === "SEER" &&
      privateState.investigationResults[gameState.turnNumber]
    ) {
      setInvestigation(privateState.investigationResults[gameState.turnNumber]!);
    }
  }, [gameState, privateState]);

  if (!gameState || !privateState?.role || !self) {
    return <ScreenFrame title="Night is falling"><LoadingState label="Loading night" /></ScreenFrame>;
  }

  const role = privateState.role;
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  const actedCount = alivePlayers.filter((p) => p.hasActedThisNight).length;
  const allActed = actedCount === alivePlayers.length;

  if (gameState.phase === "DAWN") {
    const dawnLog = gameState.dayLog.filter(
      (l) => l.turnNumber === gameState.turnNumber && l.type === "system",
    );
    return (
      <ScreenFrame eyebrow={`Night ${gameState.turnNumber} resolved`} title="Dawn breaks over the village." description="The night has made its choice. Only the public outcome is revealed.">
        <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex max-w-xl flex-col gap-2 border-l border-primary pl-5">
          {dawnLog.map((l) => (
            <p key={l.id} className="text-lg font-medium">
              {l.message}
            </p>
          ))}
        </div>
        {investigation && role === "SEER" && (
          <p className="max-w-xl rounded-md border border-primary/50 bg-card px-5 py-4 text-sm text-foreground">
            Your investigation: this player is{" "}
            <strong>{investigation.isWerewolf ? "a werewolf" : "not a werewolf"}</strong>.
          </p>
        )}
        <Button
          onClick={async () => {
            await advanceToDay();
            router.push(`/game/${gameId}/day`);
          }}
          loading={loading}
          className="w-full sm:w-fit"
        >
          Continue to Day
        </Button></div>
      </ScreenFrame>
    );
  }

  if (self.hasActedThisNight) {
    return (
      <ScreenFrame eyebrow={`Night ${gameState.turnNumber}`} title={role === "VILLAGER" ? "Listen to the silence." : "Your choice is sealed."} description="Your private action stays on this device. The village sees only the final outcome.">
        <div className="flex flex-1 flex-col items-start justify-center gap-5">
        <h2 className="text-xl font-semibold">
          {role === "VILLAGER" ? "You have no night action" : "Action submitted"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Waiting for the village to finish. <span className="font-mono tabular-nums">{actedCount}/{alivePlayers.length}</span>
        </p>
        {allActed && (
          <Button onClick={() => resolveDawn()} loading={loading}>
            Resolve Night
          </Button>
        )}
        </div>
      </ScreenFrame>
    );
  }

  const eligibleTargets = alivePlayers.filter((p) =>
    role === "DOCTOR" ? true : p.address !== address,
  );

  return (
    <ScreenFrame eyebrow={`Night ${gameState.turnNumber} · ${role.toLowerCase()}`} title={ROLE_PROMPT[role]} description="Select one living player. Your target remains private while the proof confirms the action follows the rules.">
      <div className="grid flex-1 grid-cols-3 place-items-center gap-x-4 gap-y-8 rounded-md border border-border bg-card p-6 sm:grid-cols-5 sm:p-8">
        {eligibleTargets.map((p) => (
          <button
            key={p.address}
            type="button"
            onClick={() => setSelected(p.address)}
            aria-pressed={selected === p.address}
            className={`min-h-24 min-w-20 rounded-md p-2 transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
              selected === p.address ? "bg-accent ring-2 ring-primary" : "hover:bg-muted"
            }`}
          >
            <PlayerAvatar address={p.address} nickname={p.nickname} />
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">You cannot change a choice after it is sealed.</p><Button
        disabled={!selected || loading}
        onClick={() => selected && submitNightAction(selected)}
        loading={loading}
        className="w-full sm:w-auto"
      >
        Lock choice
      </Button></div>
    </ScreenFrame>
  );
}

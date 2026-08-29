"use client";

import type { Address } from "@veilwolf/game-engine";
import { Button, PlayerAvatar } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";

const ROLE_PROMPT: Record<string, string> = {
  WEREWOLF: "Choose a victim",
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
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Loading night…
      </div>
    );
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
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="text-5xl">🌅</span>
        <h1 className="text-2xl font-bold text-slate-50">Dawn breaks</h1>
        <div className="flex flex-col gap-2">
          {dawnLog.map((l) => (
            <p key={l.id} className="text-slate-300">
              {l.message}
            </p>
          ))}
        </div>
        {investigation && role === "SEER" && (
          <p className="rounded-lg border border-violet-700 bg-violet-950/40 px-4 py-2 text-sm text-violet-200">
            Your investigation: this player is{" "}
            <strong>{investigation.isWerewolf ? "a werewolf" : "not a werewolf"}</strong>.
          </p>
        )}
        <Button
          onClick={async () => {
            await advanceToDay();
            router.push(`/game/${gameId}/day`);
          }}
          disabled={loading}
        >
          Continue to Day
        </Button>
      </div>
    );
  }

  if (self.hasActedThisNight) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="text-5xl">🌙</span>
        <h1 className="text-xl font-bold text-slate-50">
          {role === "VILLAGER" ? "You have no night action" : "Action submitted"}
        </h1>
        <p className="text-sm text-slate-500">
          Waiting for the rest of the village to finish ({actedCount}/{alivePlayers.length})
        </p>
        {allActed && (
          <Button onClick={() => resolveDawn()} disabled={loading}>
            Resolve Night
          </Button>
        )}
      </div>
    );
  }

  const eligibleTargets = alivePlayers.filter((p) =>
    role === "DOCTOR" ? true : p.address !== address,
  );

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">Turn {gameState.turnNumber}</p>
        <h1 className="text-xl font-bold text-slate-50">{ROLE_PROMPT[role]}</h1>
      </div>

      <div className="grid flex-1 grid-cols-3 place-items-center gap-4 content-start">
        {eligibleTargets.map((p) => (
          <button
            key={p.address}
            type="button"
            onClick={() => setSelected(p.address)}
            className={`rounded-xl p-2 transition-colors ${
              selected === p.address ? "bg-violet-600/30 ring-2 ring-violet-500" : ""
            }`}
          >
            <PlayerAvatar address={p.address} nickname={p.nickname} />
          </button>
        ))}
      </div>

      <Button
        disabled={!selected || loading}
        onClick={() => selected && submitNightAction(selected)}
      >
        Confirm
      </Button>
    </div>
  );
}

"use client";

import type { Address, Role } from "@veilwolf/game-engine";
import { Button } from "@veilwolf/ui";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/lib/store";
import { useGameSync } from "@/lib/useGameSync";
import { LoadingState } from "@/components/AsyncState";
import { ScreenFrame } from "@/components/ScreenFrame";
import { GameHeader } from "@/components/GameHeader";
import { PlayerMask } from "@/components/PlayerMask";

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
      <main className="night-chamber min-h-screen overflow-hidden bg-background text-foreground">
        <GameHeader context={`Night ${gameState.turnNumber} · actions sealed`} />
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1680px] lg:grid-cols-[0.72fr_1.28fr]">
          <section className="flex flex-col justify-between border-b border-border px-6 py-9 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-16">
            <div className="game-enter" data-visible="true">
              <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">Night {gameState.turnNumber} · the village sleeps</p>
              <h1 className="mt-6 max-w-[9ch] text-[clamp(3.4rem,8dvh,7rem)] font-semibold leading-[0.88] tracking-[-0.065em]">{role === "VILLAGER" ? "Listen for what moves." : "Your choice is sealed."}</h1>
              <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">No name leaves this device. Only the consequence will survive the night.</p>
            </div>
            <div className="border-l border-primary pl-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Your status</p>
              <p className="mt-2 text-lg font-medium">{role === "VILLAGER" ? "No night action" : "Action committed"}</p>
            </div>
          </section>

          <section className="night-watch relative flex min-h-[650px] items-center justify-center overflow-hidden px-6 py-10 lg:min-h-0">
            <div className="night-moon" aria-hidden="true"><span>{actedCount}</span><small>of {alivePlayers.length}</small></div>
            <div className="relative z-10 w-full max-w-xl text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">The circle is listening</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{allActed ? "Every choice is in." : `${alivePlayers.length - actedCount} still move in the dark.`}</h2>
              <div className="mx-auto mt-10 flex max-w-md justify-center gap-2" aria-label={`${actedCount} of ${alivePlayers.length} players ready`}>
                {alivePlayers.map((player) => <span key={player.address} className={`night-status-mark ${player.hasActedThisNight ? "is-ready" : ""}`} />)}
              </div>
              <p className="mx-auto mt-8 max-w-sm text-sm leading-6 text-muted-foreground">Your screen may rest here. The veil will lift when the last player has chosen.</p>
              {allActed && <Button onClick={() => resolveDawn()} loading={loading} className="mt-8 w-full sm:w-auto">Call the dawn</Button>}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const eligibleTargets = alivePlayers.filter((p) =>
    role === "DOCTOR" ? true : p.address !== address,
  );

  return (
    <main className="night-chamber min-h-screen overflow-hidden bg-background text-foreground">
      <GameHeader context={`Night ${gameState.turnNumber} · ${role.toLowerCase()}`} />
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1680px] lg:grid-cols-[0.62fr_1.38fr]">
        <section className="flex flex-col justify-between border-b border-border px-6 py-9 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">Night {gameState.turnNumber} · {role.toLowerCase()}</p>
            <h1 className="mt-6 max-w-[8ch] text-[clamp(3.4rem,8dvh,7rem)] font-semibold leading-[0.88] tracking-[-0.065em]">{ROLE_PROMPT[role]}.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Your target remains private. The proof confirms only that your move obeyed the rules.</p>
          </div>
          <div className="border-l border-primary pl-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Before you seal it</p>
            <p className="mt-2 max-w-sm text-sm leading-6">You cannot change this choice after submission.</p>
          </div>
        </section>

        <section className="night-target-stage relative flex flex-col px-5 py-8 sm:px-8 lg:px-10">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
            <div><p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Living masks</p><h2 className="mt-2 text-xl font-medium">Choose carefully</h2></div>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">{selected ? "01 selected" : "00 selected"}</p>
          </div>
          <div className="night-target-grid grid flex-1 grid-cols-3 content-center gap-3 py-8 sm:grid-cols-5">
            {eligibleTargets.map((p, index) => (
          <button
            key={p.address}
            type="button"
            onClick={() => setSelected(p.address)}
            aria-pressed={selected === p.address}
            className={`night-target group relative min-h-44 border p-3 text-left transition-[border-color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${selected === p.address ? "is-selected border-primary bg-accent" : "border-border bg-card hover:border-primary/60"}`}
          >
            <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <PlayerMask index={index} name={p.nickname} size="lg" />
            <span className="mt-2 block truncate text-center text-sm font-medium">{p.nickname}</span>
            <span className="mt-1 block text-center font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{selected === p.address ? "Marked" : "Unmarked"}</span>
          </button>
        ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{selected ? "One mask has been marked." : "Select one living player."}</p>
            <Button disabled={!selected || loading} onClick={() => selected && submitNightAction(selected)} loading={loading} className="w-full sm:w-auto">Seal this choice</Button>
          </div>
        </section>
      </div>
    </main>
  );
}

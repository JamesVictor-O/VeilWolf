"use client";

import type { Role } from "@veilwolf/game-engine";
import { Button } from "@veilwolf/ui";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { LoadingState } from "@/components/AsyncState";
import { GameHeader } from "@/components/GameHeader";
import { ScreenFrame } from "@/components/ScreenFrame";
import { getStoredAvatar } from "@/lib/identity";
import { useGameSync } from "@/lib/useGameSync";

/* ─────────────────────────────────────────────────────────
 * ROLE REVEAL STORYBOARD
 *
 *    0ms   playable shell and sealed dossier are visible
 *  100ms   title settles into the chamber
 *  250ms   dossier rises into position
 *  400ms   privacy instruction enters
 *  Reveal  seal splits; portrait and role copy resolve together
 * ───────────────────────────────────────────────────────── */
const TIMING = { title: 100, dossier: 250, instruction: 400 } as const;

const ROLE_COPY: Record<Role, { title: string; allegiance: string; directive: string; rule: string; index: number }> = {
  WEREWOLF: { title: "Werewolf", allegiance: "The pack", directive: "Hunt without being seen.", rule: "Choose a victim with your ally. By day, become someone the village trusts.", index: 0 },
  VILLAGER: { title: "Villager", allegiance: "The village", directive: "Find the lie before it finds you.", rule: "You hold no night power. Watch every claim, contradiction, and sudden alliance.", index: 2 },
  DOCTOR: { title: "Doctor", allegiance: "The village", directive: "Stand between death and dawn.", rule: "Protect one player each night. If the wolves choose them, they survive.", index: 1 },
  SEER: { title: "Seer", allegiance: "The village", directive: "Know the truth. Hide that you know.", rule: "Investigate one player each night and learn whether the wolf is behind their mask.", index: 2 },
};

export default function RoleRevealPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { gameState, privateState } = useGameSync(gameId);
  const [revealed, setRevealed] = useState(false);
  const [stage, setStage] = useState(0);
  const [avatar, setAvatar] = useState(2);

  useEffect(() => {
    setAvatar(getStoredAvatar());
    const timers = [
      window.setTimeout(() => setStage(1), TIMING.title),
      window.setTimeout(() => setStage(2), TIMING.dossier),
      window.setTimeout(() => setStage(3), TIMING.instruction),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  if (!gameState || !privateState?.role) {
    return <ScreenFrame title="Sealing your role"><LoadingState label="Assigning roles" /></ScreenFrame>;
  }

  const role = privateState.role;
  const copy = ROLE_COPY[role];

  return (
    <main className="role-chamber min-h-screen overflow-hidden bg-background text-foreground">
      <GameHeader context={`Night ${gameState.turnNumber} · private`} />
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1680px] lg:grid-cols-[0.72fr_1.28fr]">
        <section className="relative z-10 flex flex-col justify-between border-b border-border px-6 py-8 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-16">
          <div className="game-enter" data-visible={stage >= 1}>
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-primary">Night {gameState.turnNumber} · eyes only</p>
            <h1 className="mt-6 max-w-[8ch] text-[clamp(3.2rem,8dvh,7rem)] font-semibold leading-[0.86] tracking-[-0.065em]">
              {revealed ? "Carry the secret." : "No one else can know."}
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              {revealed ? "Read it once. Remember it when every face begins to lie." : "Shield your screen. Break the seal only when you are alone."}
            </p>
          </div>

          <div className="game-enter mt-10 border-l border-primary pl-5" data-visible={stage >= 3}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Privacy protocol</p>
            <p className="mt-2 max-w-sm text-sm leading-6">Tap the dossier to {revealed ? "conceal your role again" : "reveal the identity Midnight assigned"}.</p>
          </div>
        </section>

        <section className="role-stage relative flex min-h-[680px] items-center justify-center overflow-hidden px-5 py-10 lg:min-h-0">
          <div className="role-orbit" aria-hidden="true"><Image src="/veilwolflogo.png" alt="" fill className="object-contain" /></div>
          <div className="game-enter relative z-10 flex w-full max-w-md flex-col items-center" data-visible={stage >= 2}>
            <button type="button" onClick={() => setRevealed((value) => !value)} className="role-dossier group relative w-full max-w-[22rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background" aria-label={revealed ? "Hide role" : "Reveal role"} aria-pressed={revealed}>
              <div className="role-dossier-inner" data-revealed={revealed}>
                <div className="role-dossier-back">
                  <div className="role-seal"><Image src="/veilwolflogo.png" alt="" width={120} height={120} /></div>
                  <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-primary">Break the seal</p>
                  <p className="mt-3 text-sm text-muted-foreground">Reveal when alone</p>
                  <span className="role-scan mt-10 block h-px w-32 bg-primary" aria-hidden="true" />
                </div>

                <div className="role-dossier-front">
                  <div className="role-portrait">
                    {role === "VILLAGER" ? (
                      <Image src="/images/veilwolf-roster.png" alt="" width={2098} height={750} className="absolute bottom-0 h-full w-[500%] max-w-none object-cover object-bottom" style={{ left: `-${avatar * 100}%` }} />
                    ) : (
                      <Image src="/images/veilwolf-role-triptych.png" alt="" width={1942} height={809} className="absolute bottom-0 h-full w-[300%] max-w-none object-cover object-bottom" style={{ left: `-${copy.index * 100}%` }} />
                    )}
                  </div>
                  <div className="relative z-10 border-t border-border bg-card px-7 py-6 text-left">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">{copy.allegiance}</p>
                    <h2 className="mt-2 text-4xl font-semibold tracking-tight">{copy.title}</h2>
                    <p className="mt-3 text-base font-medium">{copy.directive}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.rule}</p>
                  </div>
                </div>
              </div>
            </button>

            <div className={`mt-6 grid w-full max-w-[22rem] gap-3 transition-opacity duration-200 ${revealed ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!revealed}>
              <Button onClick={() => router.push(`/game/${gameId}/night`)}>Enter the first night</Button>
              <Button variant="ghost" onClick={() => setRevealed(false)}>Conceal role</Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

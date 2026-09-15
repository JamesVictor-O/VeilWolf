"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getStoredNickname } from "@/lib/identity";

/* ─────────────────────────────────────────────────────────
 * VEIL BOOT STORYBOARD
 *
 *    0ms   crest and system label establish the scene
 *  180ms   first security check resolves
 *  520ms   private channel resolves
 *  860ms   village connection resolves
 * 1650ms   route opens into the landing experience
 * ───────────────────────────────────────────────────────── */
const TIMING = {
  firstCheck: 180,
  secondCheck: 520,
  thirdCheck: 860,
  enter: 1650,
} as const;

const CHECKS = ["Masking identity", "Sealing private channel", "Entering the village"];

export default function RootPage() {
  const router = useRouter();
  const [stage, setStage] = useState(0);

  function enter() {
    const nickname = getStoredNickname();
    router.replace(nickname ? "/home" : "/onboarding/nickname");
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setStage(CHECKS.length);
      const timer = window.setTimeout(enter, 100);
      return () => window.clearTimeout(timer);
    }

    const timers = [
      window.setTimeout(() => setStage(1), TIMING.firstCheck),
      window.setTimeout(() => setStage(2), TIMING.secondCheck),
      window.setTimeout(() => setStage(3), TIMING.thirdCheck),
      window.setTimeout(enter, TIMING.enter),
    ];
    return () => timers.forEach(window.clearTimeout);
    // `enter` intentionally resolves the destination once at boot completion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <main className="veil-boot relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-background px-6 text-center" aria-busy="true">
      <div className="veil-boot-ring" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">Midnight protocol // 01</p>
        <div className="veil-boot-sigil mt-8 grid h-36 w-36 place-items-center overflow-hidden rounded-full border border-primary/60 bg-background sm:h-44 sm:w-44">
          <Image src="/veilwolflogo.png" alt="VeilWolf" width={352} height={352} priority className="h-full w-full scale-125 object-cover" />
        </div>
        <h1 className="mt-7 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">VEILWOLF</h1>
        <p className="mt-2 text-sm text-muted-foreground">Trust no face. Reveal no secret.</p>

        <div className="mt-10 w-64" aria-live="polite">
          <div className="h-px overflow-hidden bg-border">
            <div className="veil-boot-progress h-full bg-primary" />
          </div>
          <ul className="mt-4 space-y-2 text-left">
            {CHECKS.map((check, index) => (
              <li key={check} className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
                <span className={stage >= index + 1 ? "text-foreground" : "text-muted-foreground"}>{check}</span>
                <span className={stage >= index + 1 ? "text-primary" : "text-muted-foreground"} aria-hidden="true">
                  {stage >= index + 1 ? "VERIFIED" : "···"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={enter} className="mt-8 min-h-11 px-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          Skip intro
        </button>
      </div>
    </main>
  );
}

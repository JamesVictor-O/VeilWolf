"use client";

import { Button } from "@veilwolf/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GameHeader } from "@/components/GameHeader";
import { getOrCreateAddress, getStoredAvatar, getStoredNickname } from "@/lib/identity";
import { useGameStore } from "@/lib/store";

/* ─────────────────────────────────────────────────────────
 * COMMAND CHAMBER STORYBOARD
 *
 *    0ms   HUD and operative silhouette hold the frame
 *  120ms   player identity enters
 *  320ms   mission choices arm
 *  560ms   status rail resolves
 * ───────────────────────────────────────────────────────── */
const TIMING = { identity: 120, missions: 320, status: 560 } as const;
const AVATAR_NAMES = ["Scholar", "Hunter", "Healer", "Mourner", "Wanderer"] as const;

export default function HomePage() {
  const router = useRouter();
  const setIdentity = useGameStore((state) => state.setIdentity);
  const createGame = useGameStore((state) => state.createGame);
  const joinGame = useGameStore((state) => state.joinGame);
  const loading = useGameStore((state) => state.loading);
  const error = useGameStore((state) => state.error);
  const clearError = useGameStore((state) => state.clearError);
  const nickname = useGameStore((state) => state.nickname);
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"idle" | "join">("idle");
  const [avatar, setAvatar] = useState(2);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const stored = getStoredNickname();
    if (!stored) {
      router.replace("/onboarding/nickname");
      return;
    }
    setAvatar(getStoredAvatar());
    setIdentity(getOrCreateAddress(), stored);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(3);
      return;
    }
    const timers = [
      window.setTimeout(() => setStage(1), TIMING.identity),
      window.setTimeout(() => setStage(2), TIMING.missions),
      window.setTimeout(() => setStage(3), TIMING.status),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [router, setIdentity]);

  async function handleCreate() {
    clearError();
    try {
      const gameId = await createGame();
      router.push(`/lobby/${gameId}`);
    } catch {
      // The store exposes the recoverable error in the mission panel.
    }
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    clearError();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      await joinGame(code);
      router.push(`/lobby/${code}`);
    } catch {
      // The store exposes the recoverable error in the mission panel.
    }
  }

  return (
    <main className="home-chamber relative flex min-h-screen flex-col overflow-hidden bg-background">
      <GameHeader context={nickname ? `Operative: ${nickname}` : "Awaiting player"} />
      <div className="identity-fog" aria-hidden="true" />

      <div className="grid flex-1 lg:h-[calc(100dvh-5rem)] lg:min-h-0 lg:flex-none lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[56vh] flex-col justify-between overflow-hidden border-b border-border px-6 py-8 sm:px-10 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-14 lg:py-9">
          <div className="home-seal" aria-hidden="true">
            <Image src="/veilwolflogo.png" alt="" width={600} height={600} className="home-seal-mark h-full w-full scale-110 object-cover" />
          </div>

          <div className="home-enter relative z-10 flex items-center justify-between" data-visible={stage >= 1}>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              <span className="h-px w-10 bg-primary" aria-hidden="true" />
              Operative selected
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Mask {avatar + 1}/5</span>
          </div>

          <div className="home-enter relative z-10 max-w-2xl" data-visible={stage >= 1}>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Welcome back // {AVATAR_NAMES[avatar]}</p>
            <h1 className="home-title mt-4 text-balance text-5xl font-semibold leading-[0.9] tracking-[-0.06em] sm:text-7xl">
              Every village keeps a secret.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">Enter alone. Read every face. Leave with the truth—or make sure no one else does.</p>
          </div>

          <div className="home-operative pointer-events-none absolute bottom-0 right-0 z-[1] w-[48%] max-w-md" aria-hidden="true">
            <div className="relative aspect-[0.56/1] overflow-hidden">
              <Image
                src="/images/veilwolf-roster.png"
                alt=""
                width={2098}
                height={750}
                className="absolute bottom-0 h-full w-[500%] max-w-none object-cover object-bottom"
                style={{ left: `${avatar * -100}%` }}
              />
            </div>
          </div>

          <div className="home-enter relative z-10 flex max-w-xs items-center gap-3 border-l border-primary pl-4" data-visible={stage >= 3}>
            <span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden="true" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Private identity</p>
              <p className="mt-1 text-xs text-foreground">Masked and ready for assignment</p>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-6 py-10 sm:px-10 lg:min-h-0 lg:px-14 lg:py-8">
          <div className="home-enter w-full max-w-xl" data-visible={stage >= 2}>
            <div className="flex items-end justify-between border-b border-border pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Choose operation</p>
                <h2 className="mt-2 text-3xl font-semibold uppercase tracking-[-0.03em]">How will you enter?</h2>
              </div>
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:block">Network ready</span>
            </div>

            {mode === "idle" ? (
              <div className="mt-5 grid gap-3">
                <button type="button" onClick={handleCreate} disabled={loading} className="mission-card group relative min-h-36 overflow-hidden border border-primary bg-accent p-5 text-left text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Operation I · Host</span>
                  <span className="mt-6 block text-2xl font-semibold uppercase tracking-[-0.02em]">Create the circle</span>
                  <span className="mt-2 block max-w-sm text-xs leading-5 text-muted-foreground">Open a private village and summon eight suspects.</span>
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-mono text-2xl text-primary motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-x-1" aria-hidden="true">→</span>
                </button>
                <button type="button" onClick={() => setMode("join")} disabled={loading} className="mission-card group relative min-h-28 overflow-hidden border border-border bg-card p-5 text-left text-foreground transition-colors duration-100 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Operation II · Infiltrate</span>
                  <span className="mt-4 block text-xl font-semibold uppercase tracking-[-0.02em]">Enter with a code</span>
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-mono text-xl text-muted-foreground motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true">→</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="mt-5" noValidate>
                <div className="flex items-center justify-between">
                  <label htmlFor="join-code" className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Village access code</label>
                  <button type="button" onClick={() => setMode("idle")} className="min-h-10 px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Back</button>
                </div>
                <div className="identity-input-frame mt-2 p-px">
                  <input id="join-code" autoFocus autoComplete="off" spellCheck={false} maxLength={5} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="AB3XZ" aria-invalid={error ? "true" : undefined} aria-describedby={error ? "join-error" : "join-hint"} className="identity-name-input min-h-24 w-full border-0 bg-card px-5 text-center font-mono text-3xl tracking-[0.32em] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" />
                </div>
                <p id="join-hint" className="mt-3 text-xs text-muted-foreground">Five characters supplied by the circle host.</p>
                <Button type="submit" loading={loading} disabled={joinCode.trim().length !== 5} className="tutorial-confirm mt-5 w-full rounded-none uppercase tracking-[0.14em]">Breach the village</Button>
              </form>
            )}

            {error && <p id="join-error" className="mt-3 border-l border-destructive pl-3 text-sm text-destructive" role="alert">{error} Check the code and try again.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

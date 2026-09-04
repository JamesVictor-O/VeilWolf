"use client";

import { Button } from "@veilwolf/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrCreateAddress, getStoredNickname } from "@/lib/identity";
import { useGameStore } from "@/lib/store";
import { BrandMark } from "@/components/BrandMark";

export default function HomePage() {
  const router = useRouter();
  const setIdentity = useGameStore((s) => s.setIdentity);
  const createGame = useGameStore((s) => s.createGame);
  const joinGame = useGameStore((s) => s.joinGame);
  const loading = useGameStore((s) => s.loading);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);
  const nickname = useGameStore((s) => s.nickname);

  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"idle" | "join">("idle");

  useEffect(() => {
    const stored = getStoredNickname();
    if (!stored) {
      router.replace("/onboarding/nickname");
      return;
    }
    setIdentity(getOrCreateAddress(), stored);
  }, [router, setIdentity]);

  async function handleCreate() {
    clearError();
    try {
      const gameId = await createGame();
      router.push(`/lobby/${gameId}`);
    } catch {
      // The store exposes a recoverable error beside the triggering action.
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      await joinGame(code);
      router.push(`/lobby/${code}`);
    } catch {
      // The store exposes a recoverable error beside the form.
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-brand-bg lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative flex min-h-[58vh] flex-col justify-between border-b border-border p-6 sm:p-10 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-14">
        <div aria-hidden="true" className="absolute -left-52 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 rounded-full border border-border/70" />
        <BrandMark />
        <div className="relative max-w-2xl py-16">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">A game of trust and deception</p>
          <h1 className="text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-8xl">Every village keeps a secret.</h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Read the room. Protect your role. Prove every hidden choice without revealing it.</p>
        </div>
        <p className="relative font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Private by Midnight · Fair by design</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{nickname ? `Welcome back, ${nickname}` : "Enter the village"}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">How will you begin?</h2>
          <div className="mt-10 flex flex-col gap-3">
        <Button onClick={handleCreate} loading={loading} className="w-full">
          Create a game
        </Button>

        {mode === "idle" ? (
          <Button variant="secondary" onClick={() => setMode("join")} disabled={loading} className="w-full">
            Join with a code
          </Button>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-3" noValidate>
            <label htmlFor="join-code" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Game code</label>
            <input
              id="join-code"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={5}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="AB3XZ"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "join-error" : "join-hint"}
              className="min-h-12 rounded-md border border-input bg-card px-4 text-center font-mono text-lg tracking-[0.22em] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <p id="join-hint" className="text-xs text-muted-foreground">Five characters from the host.</p>
            <Button type="submit" loading={loading} disabled={!joinCode.trim()}>
              Enter village
            </Button>
          </form>
        )}

        {error && <p id="join-error" className="mt-2 text-sm text-destructive" role="alert">{error} Check the code and try again.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

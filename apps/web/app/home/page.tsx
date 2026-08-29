"use client";

import { Button } from "@veilwolf/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrCreateAddress, getStoredNickname } from "@/lib/identity";
import { useGameStore } from "@/lib/store";

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
    const gameId = await createGame();
    router.push(`/lobby/${gameId}`);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    await joinGame(code);
    router.push(`/lobby/${code}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-slate-50">🐺 VeilWolf</h1>
        {nickname && <p className="mt-1 text-sm text-slate-400">Welcome, {nickname}.</p>}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button onClick={handleCreate} disabled={loading}>
          Create Game
        </Button>

        {mode === "idle" ? (
          <Button variant="secondary" onClick={() => setMode("join")} disabled={loading}>
            Join Game
          </Button>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-2">
            <input
              autoFocus
              maxLength={5}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Game code (e.g. AB3XZ)"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-center font-mono text-lg tracking-widest text-slate-100 outline-none focus:border-violet-500"
            />
            <Button type="submit" variant="secondary" disabled={loading || !joinCode.trim()}>
              Join
            </Button>
          </form>
        )}

        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

"use client";

import { Button } from "@veilwolf/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getOrCreateAddress, setStoredNickname } from "@/lib/identity";
import { useGameStore } from "@/lib/store";

export default function NicknamePage() {
  const router = useRouter();
  const setIdentity = useGameStore((s) => s.setIdentity);
  const [nickname, setNickname] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length < 2) return;
    const address = getOrCreateAddress();
    setStoredNickname(trimmed);
    setIdentity(address, trimmed);
    router.push("/onboarding/tutorial");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-slate-50">
          🐺 VeilWolf
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          A hidden-role game of trust and deception.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <label className="text-sm font-medium text-slate-300" htmlFor="nickname">
          What should we call you?
        </label>
        <input
          id="nickname"
          autoFocus
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname"
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-violet-500"
        />
        <Button type="submit" disabled={nickname.trim().length < 2}>
          Continue
        </Button>
      </form>
    </div>
  );
}

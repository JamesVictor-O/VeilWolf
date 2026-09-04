"use client";

import { Button } from "@veilwolf/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getOrCreateAddress, setStoredNickname } from "@/lib/identity";
import { useGameStore } from "@/lib/store";
import { ScreenFrame } from "@/components/ScreenFrame";

export default function NicknamePage() {
  const router = useRouter();
  const setIdentity = useGameStore((s) => s.setIdentity);
  const [nickname, setNickname] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const trimmed = nickname.trim();
    if (trimmed.length < 2) return;
    const address = getOrCreateAddress();
    setStoredNickname(trimmed);
    setIdentity(address, trimmed);
    router.push("/onboarding/tutorial");
  }

  return (
    <ScreenFrame eyebrow="Before the first night" title="Choose the name they will remember." description="Use a nickname your group will recognize. Your game identity stays separate from your public wallet address.">
      <form onSubmit={handleSubmit} className="mt-auto flex w-full max-w-md flex-col gap-3 sm:mt-10" noValidate>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground" htmlFor="nickname">
          Nickname
        </label>
        <input
          id="nickname"
          autoFocus
          autoComplete="nickname"
          spellCheck={false}
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="The name your friends know"
          aria-invalid={submitted && nickname.trim().length < 2 ? "true" : undefined}
          aria-describedby="nickname-hint"
          className="min-h-12 rounded-md border border-input bg-card px-4 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <p id="nickname-hint" className={submitted && nickname.trim().length < 2 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{submitted && nickname.trim().length < 2 ? "Use at least two characters." : "2–20 characters. You can change this later."}</p>
        <Button type="submit" disabled={!nickname.trim()} className="mt-3 sm:w-fit">
          Continue
        </Button>
      </form>
    </ScreenFrame>
  );
}

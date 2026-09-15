"use client";

import { Button } from "@veilwolf/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameHeader } from "@/components/GameHeader";
import { getOrCreateAddress, setStoredAvatar, setStoredNickname } from "@/lib/identity";
import { useGameStore } from "@/lib/store";

/* ─────────────────────────────────────────────────────────
 * IDENTITY RITUAL STORYBOARD
 *
 *    0ms   the anonymous circle waits in silhouette
 *  100ms   invitation and title enter
 *  300ms   five masks assemble in sequence
 *  650ms   naming seal becomes available
 * ───────────────────────────────────────────────────────── */
const TIMING = { invitation: 100, masks: 300, form: 650 } as const;

const AVATARS = [
  { name: "The Scholar", omen: "Not every truth should be spoken." },
  { name: "The Hunter", omen: "Every footprint tells a different story." },
  { name: "The Healer", omen: "Mercy can look a lot like guilt." },
  { name: "The Mourner", omen: "The silent notice everything." },
  { name: "The Wanderer", omen: "No one remembers when they arrived." },
] as const;

export default function NicknamePage() {
  const router = useRouter();
  const setIdentity = useGameStore((state) => state.setIdentity);
  const inputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(2);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(3);
      return;
    }
    const timers = [
      window.setTimeout(() => setStage(1), TIMING.invitation),
      window.setTimeout(() => setStage(2), TIMING.masks),
      window.setTimeout(() => setStage(3), TIMING.form),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      inputRef.current?.focus();
      return;
    }
    const address = getOrCreateAddress();
    setStoredNickname(trimmed);
    setStoredAvatar(selectedAvatar);
    setIdentity(address, trimmed);
    router.push("/onboarding/tutorial");
  }

  return (
    <main className="identity-ritual relative flex min-h-screen flex-col overflow-hidden bg-background">
      <GameHeader context="Identity ritual" />
      <div className="identity-fog" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 lg:h-[calc(100dvh-5rem)] lg:min-h-0 lg:flex-none lg:grid-cols-[0.82fr_1.18fr] lg:overflow-hidden">
        <div className="flex min-h-0 flex-col justify-center px-6 py-12 sm:px-10 lg:px-12 lg:py-6 xl:px-14">
          <div className="ritual-enter" data-visible={stage >= 1}>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-primary" aria-hidden="true" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Invitation I · Claim your mask</p>
            </div>
            <h1 className="identity-title mt-6 max-w-xl text-balance text-5xl font-semibold leading-[0.92] tracking-[-0.055em] sm:text-6xl">
              The village must know your name.
              <span className="mt-2 block text-muted-foreground">Not who you are.</span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">Choose the face they will suspect. Choose the name they will whisper after nightfall.</p>
          </div>

          <form onSubmit={handleSubmit} className="ritual-enter identity-console mt-10 max-w-lg lg:mt-7" data-visible={stage >= 3} noValidate>
            <div className="flex items-end justify-between border-b border-border pb-3">
              <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary" htmlFor="nickname">Fighter designation</label>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Identity file // 01</span>
            </div>
            <div className="identity-input-frame relative mt-3 p-px">
              <input
                ref={inputRef}
                id="nickname"
                autoComplete="nickname"
                spellCheck={false}
                maxLength={20}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="ENTER YOUR NAME"
                aria-invalid={submitted && nickname.trim().length < 2 ? "true" : undefined}
                aria-describedby="nickname-hint"
                className="identity-name-input min-h-16 w-full border-0 bg-card px-5 pr-20 text-xl font-semibold uppercase tracking-[0.04em] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-primary" aria-hidden="true">{String(nickname.length).padStart(2, "0")}/20</span>
            </div>
            <div className="identity-dossier mt-3 flex min-h-14 items-center justify-between gap-4 border-l border-primary bg-card/50 px-4 py-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Selected combatant</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{AVATARS[selectedAvatar]?.name ?? "Unknown"}</p>
              </div>
              <p id="nickname-hint" className={`max-w-56 text-right text-xs ${submitted && nickname.trim().length < 2 ? "text-destructive" : "text-muted-foreground"}`}>{submitted && nickname.trim().length < 2 ? "Name requires two characters." : (AVATARS[selectedAvatar]?.omen ?? "Choose your mask.")}</p>
            </div>
            <Button type="submit" disabled={nickname.trim().length < 2} className="identity-confirm group mt-4 w-full rounded-none py-4 text-xs uppercase tracking-[0.18em] motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5">
              <span>Confirm identity</span>
              <span className="ml-auto font-mono text-[10px] opacity-70" aria-hidden="true">ENTER ↵</span>
            </Button>
          </form>
        </div>

        <div className="relative flex min-h-[31rem] flex-col justify-end overflow-hidden border-t border-border lg:h-full lg:min-h-0 lg:border-l lg:border-t-0">
          <div className="absolute inset-x-0 top-8 z-20 text-center lg:top-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Five strangers answer the call</p>
            <p className="mt-2 text-sm text-foreground">Select the mask they will remember.</p>
          </div>

          <div className="identity-moon" aria-hidden="true">
            <Image
              src="/veilwolflogo.png"
              alt=""
              width={500}
              height={500}
              className="identity-moon-mark h-full w-full scale-110 object-cover"
            />
          </div>
          <div
            className="identity-focus"
            style={{ transform: `translateX(${selectedAvatar * 100}%)` }}
            aria-hidden="true"
          />
          <div className="identity-roster min-h-0" data-visible={stage >= 2}>
            <Image src="/images/veilwolf-roster.png" alt="Five mysterious villagers waiting in the dark" width={2098} height={750} priority className="max-h-[55dvh] w-full object-contain object-bottom" />
          </div>

          <div className="relative z-20 grid grid-cols-5 border-t border-border bg-background/90 px-2 py-3 backdrop-blur-sm sm:px-5">
            {AVATARS.map((avatar, index) => {
              const selected = selectedAvatar === index;
              return (
                <button key={avatar.name} type="button" onClick={() => setSelectedAvatar(index)} aria-pressed={selected} className="group relative flex min-h-14 flex-col items-center justify-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <span className={`mb-2 h-px motion-safe:transition-[width,background-color] motion-safe:duration-150 ${selected ? "w-8 bg-primary" : "w-3 bg-border group-hover:w-5"}`} aria-hidden="true" />
                  <span className={`text-center text-[10px] font-semibold uppercase tracking-[0.08em] motion-safe:transition-colors motion-safe:duration-100 sm:text-xs ${selected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{avatar.name.replace("The ", "")}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

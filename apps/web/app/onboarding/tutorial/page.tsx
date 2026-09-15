"use client";

import { Button } from "@veilwolf/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { BrandMark } from "@/components/BrandMark";

/* ─────────────────────────────────────────────────────────
 * ONBOARDING STORYBOARD
 *
 *    0ms   shell and chapter controls are immediately usable
 *  100ms   opening statement settles into view
 *  300ms   village illustration and rule stage rise into place
 *  500ms   active chapter details resolve
 * ───────────────────────────────────────────────────────── */
const TIMING = { opening: 100, world: 300, details: 500 } as const;

const CHAPTERS = [
  {
    marker: "I",
    phase: "Night",
    title: "Close your eyes. Keep your secret.",
    story: "The village sleeps, but three powers move in the dark. Every choice is private. Only the consequence reaches dawn.",
    beats: [
      ["The wolves hunt", "Two hidden players agree on a victim."],
      ["The doctor protects", "One player may be spared from the attack."],
      ["The seer searches", "One allegiance is learned in complete secrecy."],
    ],
    cue: "Trust no silence.",
  },
  {
    marker: "II",
    phase: "Day",
    title: "Wake up. Read the room.",
    story: "Morning reveals what happened—not who caused it. Accuse, defend, misdirect, and notice who controls the conversation.",
    beats: [
      ["Speak carefully", "Anything you say can make you a target."],
      ["Build a case", "Patterns matter more than loud certainty."],
      ["Choose your trust", "An ally may be protecting the lie."],
    ],
    cue: "Everyone has a story.",
  },
  {
    marker: "III",
    phase: "Verdict",
    title: "Point a finger. Live with the choice.",
    story: "Every living player seals a private ballot. The village banishes one suspect, and their true role is finally revealed.",
    beats: [
      ["The village wins", "Find and eliminate both werewolves."],
      ["The wolves win", "Equal or outnumber everyone who remains."],
      ["The story continues", "Survivors return to night with fewer places to hide."],
    ],
    cue: "The truth always costs someone.",
  },
] as const;

export default function TutorialPage() {
  const router = useRouter();
  const [chapter, setChapter] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), TIMING.opening),
      setTimeout(() => setStage(2), TIMING.world),
      setTimeout(() => setStage(3), TIMING.details),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const active = CHAPTERS[chapter]!;
  const isLastChapter = chapter === CHAPTERS.length - 1;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-8 lg:px-12">
      <header className="relative z-20 flex items-center justify-between border-b border-border pb-5">
        <BrandMark />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Initiation · {chapter + 1}/{CHAPTERS.length}</p>
      </header>

      <section className="mx-auto w-full max-w-6xl py-8 sm:py-12">
        <div className="onboarding-enter grid items-end gap-7 lg:grid-cols-[0.82fr_1.18fr]" data-visible={stage >= 1}>
          <div className="relative z-10 pb-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Before the first night</p>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">Someone here is lying.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Nine enter the village. Everyone receives a secret. By morning, trust becomes the most dangerous weapon in the room.</p>
          </div>

          <div className="onboarding-enter relative aspect-[16/9] overflow-hidden rounded-md border border-border bg-card" data-visible={stage >= 2}>
            <Image src="/images/onboarding-village.png" alt="Nine figures gathered by lantern light in a moonlit village, watched by two hidden wolves" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-4 left-4 border-l border-primary pl-3 sm:bottom-5 sm:left-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">9 players · 4 roles · 1 village</p>
            </div>
          </div>
        </div>

        <div className="onboarding-enter mt-10 grid gap-6 border-t border-border pt-6 lg:grid-cols-[0.36fr_0.64fr] lg:gap-10" data-visible={stage >= 2}>
          <nav aria-label="How the game unfolds">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">The ritual</p>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {CHAPTERS.map((item, index) => (
                <button key={item.phase} type="button" onClick={() => setChapter(index)} aria-current={chapter === index ? "step" : undefined} className={`group min-h-14 rounded-md border px-3 py-3 text-left transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex lg:items-center lg:gap-4 lg:px-4 ${chapter === index ? "border-primary bg-accent text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <span className="font-mono text-xs text-primary">{item.marker}</span>
                  <span className="block text-sm font-semibold lg:flex-1">{item.phase}</span>
                  <span aria-hidden="true" className="hidden font-mono text-xs transition-transform duration-100 group-hover:translate-x-0.5 lg:block">→</span>
                </button>
              ))}
            </div>
          </nav>

          <article key={active.phase} className="onboarding-enter onboarding-rule-panel rounded-md border border-border bg-card p-6 sm:p-8" data-visible={stage >= 3} aria-live="polite">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{active.phase}</p>
              <p className="font-mono text-xs text-muted-foreground">0{chapter + 1} / 03</p>
            </div>
            <h2 className="mt-5 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">{active.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{active.story}</p>

            <ol className="mt-7 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
              {active.beats.map(([title, body], index) => (
                <li key={title} className="bg-background p-4 sm:min-h-36 sm:p-5" style={{ "--rule-index": index } as CSSProperties}>
                  <span className="font-mono text-xs text-primary">0{index + 1}</span>
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-col gap-5 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Remember</p>
                <p className="mt-1 text-lg font-medium text-foreground">“{active.cue}”</p>
              </div>
              {isLastChapter ? (
                <Button onClick={() => router.push("/home")} className="w-full sm:w-auto">Enter the village</Button>
              ) : (
                <Button onClick={() => setChapter((current) => current + 1)} className="w-full sm:w-auto">Continue to {CHAPTERS[chapter + 1]!.phase}</Button>
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

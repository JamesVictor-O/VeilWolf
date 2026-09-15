"use client";

import { Button } from "@veilwolf/ui";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { GameHeader } from "@/components/GameHeader";

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
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <GameHeader context={`Combat briefing · ${chapter + 1}/${CHAPTERS.length}`} />

      <section className="tutorial-stage mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-5 py-7 sm:px-8 lg:h-[calc(100dvh-5rem)] lg:flex-none lg:overflow-hidden lg:px-12 lg:py-6">
        <div className="onboarding-enter grid items-center gap-7 lg:h-[36%] lg:grid-cols-[0.78fr_1.22fr]" data-visible={stage >= 1}>
          <div className="relative z-10 pb-1">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-primary" aria-hidden="true" />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Pre-match intelligence</p>
            </div>
            <h1 className="tutorial-title mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[0.92] tracking-[-0.05em] sm:text-6xl">Someone here is lying.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">Nine enter. Four roles are dealt. Only one side leaves the village alive.</p>
          </div>

          <div className="tutorial-visual onboarding-enter relative h-full min-h-60 overflow-hidden border border-border bg-card" data-visible={stage >= 2}>
            <Image src="/images/onboarding-village.png" alt="Nine figures gathered by lantern light in a moonlit village, watched by two hidden wolves" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
            <div className="absolute left-4 top-4 border border-primary/60 bg-background/80 px-3 py-2 backdrop-blur-sm">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Threat detected</p>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between border-l border-primary pl-3 sm:bottom-5 sm:left-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">9 combatants · 4 roles · 1 survivor faction</p>
              <span className="font-mono text-[10px] text-primary">READY // 00:09</span>
            </div>
          </div>
        </div>

        <div className="onboarding-enter mt-7 grid gap-5 border-t border-border pt-5 lg:h-[60%] lg:grid-cols-[0.3fr_0.7fr] lg:gap-7" data-visible={stage >= 2}>
          <nav aria-label="How the game unfolds">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Choose briefing</p>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {CHAPTERS.map((item, index) => (
                <button key={item.phase} type="button" onClick={() => setChapter(index)} aria-current={chapter === index ? "step" : undefined} className={`tutorial-chapter group min-h-14 border px-3 py-3 text-left transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex lg:items-center lg:gap-4 lg:px-4 ${chapter === index ? "border-primary bg-accent text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <span className="font-mono text-xs text-primary">{item.marker}</span>
                  <span className="block text-sm font-semibold uppercase tracking-[0.08em] lg:flex-1">{item.phase}</span>
                  <span aria-hidden="true" className="hidden font-mono text-xs transition-transform duration-100 group-hover:translate-x-0.5 lg:block">→</span>
                </button>
              ))}
            </div>
            <div className="mt-4 hidden border-l border-primary px-4 py-3 lg:block">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Win condition</p>
              <p className="mt-1 text-xs text-foreground">Expose the enemy before they control the circle.</p>
            </div>
          </nav>

          <article key={active.phase} className="tutorial-dossier onboarding-enter onboarding-rule-panel flex min-h-0 flex-col border border-border bg-card p-5 sm:p-6" data-visible={stage >= 3} aria-live="polite">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{active.phase}</p>
              <p className="font-mono text-xs text-muted-foreground">0{chapter + 1} / 03</p>
            </div>
            <h2 className="mt-3 max-w-2xl text-2xl font-semibold uppercase tracking-[-0.025em] sm:text-3xl">{active.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{active.story}</p>

            <ol className="mt-4 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
              {active.beats.map(([title, body], index) => (
                <li key={title} className="tutorial-role-card group relative min-h-44 overflow-hidden bg-background" style={{ "--rule-index": index } as CSSProperties}>
                  <div className="tutorial-role-portrait absolute inset-0" style={{ "--portrait-index": index } as CSSProperties} aria-hidden="true">
                    <Image
                      src="/images/veilwolf-role-triptych.png"
                      alt=""
                      width={1920}
                      height={840}
                      className="absolute top-0 h-full w-[300%] max-w-none object-cover object-top"
                      style={{ left: `${index * -100}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-transparent" aria-hidden="true" />
                  <span className="absolute left-4 top-3 z-10 border border-primary/60 bg-background/70 px-2 py-1 font-mono text-[10px] text-primary backdrop-blur-sm">0{index + 1}</span>
                  <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.1em]">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-auto flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Remember</p>
                <p className="mt-1 text-lg font-medium text-foreground">“{active.cue}”</p>
              </div>
              {isLastChapter ? (
                <Button onClick={() => router.push("/home")} className="tutorial-confirm w-full rounded-none uppercase tracking-[0.12em] sm:w-auto">Begin match</Button>
              ) : (
                <Button onClick={() => setChapter((current) => current + 1)} className="tutorial-confirm w-full rounded-none uppercase tracking-[0.12em] sm:w-auto">Next: {CHAPTERS[chapter + 1]!.phase}</Button>
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

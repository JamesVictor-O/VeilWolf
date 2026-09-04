"use client";

import { Button } from "@veilwolf/ui";
import { useRouter } from "next/navigation";
import { ScreenFrame } from "@/components/ScreenFrame";

const RULES = [
  {
    title: "The setup",
    body: "9 players. 2 Werewolves hide among 5 Villagers, 1 Doctor, and 1 Seer. Everyone else only knows their own role.",
  },
  {
    title: "Night",
    body: "Werewolves silently choose a victim. The Doctor picks someone to protect. The Seer investigates one player to learn if they're a werewolf.",
  },
  {
    title: "Day",
    body: "The village wakes to the news. Discuss, accuse, defend — then nominate and second whoever you suspect.",
  },
  {
    title: "Vote",
    body: "Everyone votes. The player with the most votes is eliminated and their role is revealed.",
  },
  {
    title: "Win condition",
    body: "Villagers win by eliminating every werewolf. Werewolves win once they equal or outnumber everyone else.",
  },
];

export default function TutorialPage() {
  const router = useRouter();

  return (
    <ScreenFrame eyebrow="The rules" title="Survive the night. Control the story." description="Every match moves through the same five beats. Learn the rhythm once; the people make every game different.">
      <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2">
        {RULES.map((rule, index) => (
          <li key={rule.title} className="bg-card p-6 sm:p-7">
            <span className="font-mono text-xs text-primary">0{index + 1}</span>
            <h2 className="mt-5 text-lg font-semibold tracking-tight">{rule.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{rule.body}</p>
          </li>
        ))}
      </ol>
      <Button onClick={() => router.push("/home")} className="mt-8 w-full sm:ml-auto sm:w-auto">Enter the village</Button>
    </ScreenFrame>
  );
}

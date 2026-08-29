"use client";

import { Button } from "@veilwolf/ui";
import { useRouter } from "next/navigation";

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
    <div className="flex flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-50">How to play</h1>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {RULES.map((rule) => (
          <div key={rule.title} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h2 className="font-semibold text-violet-300">{rule.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{rule.body}</p>
          </div>
        ))}
      </div>
      <Button onClick={() => router.push("/home")}>Let&apos;s play</Button>
    </div>
  );
}

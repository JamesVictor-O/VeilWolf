import type { Role } from "@veilwolf/game-engine";

const ROLE_COPY: Record<
  Role,
  { label: string; description: string; accent: string; emoji: string }
> = {
  WEREWOLF: {
    label: "Werewolf",
    description:
      "Each night, coordinate with your fellow werewolf to choose a villager to eliminate. Blend in during the day.",
    accent: "border-red-500/60 from-red-950/60 to-red-900/20 text-red-200",
    emoji: "🐺",
  },
  VILLAGER: {
    label: "Villager",
    description:
      "You have no night action. Use the day to find contradictions and vote out the werewolves before they outnumber you.",
    accent: "border-slate-400/40 from-slate-800/60 to-slate-800/20 text-slate-200",
    emoji: "🧑‍🌾",
  },
  DOCTOR: {
    label: "Doctor",
    description:
      "Each night, choose one player to heal. If they're attacked, they survive. You may heal yourself.",
    accent: "border-emerald-500/60 from-emerald-950/60 to-emerald-900/20 text-emerald-200",
    emoji: "🩺",
  },
  SEER: {
    label: "Seer",
    description:
      "Each night, investigate one player to learn if they are a werewolf. Use what you learn carefully.",
    accent: "border-violet-500/60 from-violet-950/60 to-violet-900/20 text-violet-200",
    emoji: "🔮",
  },
};

export interface RoleCardProps {
  role: Role;
  revealed?: boolean;
  className?: string;
}

export function RoleCard({ role, revealed = true, className = "" }: RoleCardProps) {
  const copy = ROLE_COPY[role];

  if (!revealed) {
    return (
      <div
        className={`flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/60 ${className}`}
      >
        <span className="text-4xl">❔</span>
        <span className="mt-2 text-sm text-slate-400">Tap to reveal</span>
      </div>
    );
  }

  return (
    <div
      className={`flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-gradient-to-b p-6 text-center shadow-xl ${copy.accent} ${className}`}
    >
      <span className="text-5xl">{copy.emoji}</span>
      <span className="text-2xl font-bold tracking-wide">{copy.label}</span>
      <p className="text-sm leading-relaxed opacity-90">{copy.description}</p>
    </div>
  );
}

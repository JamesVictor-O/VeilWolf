import type { Role } from "@veilwolf/game-engine";

const ROLE_COPY: Record<
  Role,
  { label: string; description: string; accent: string; sigil: string; allegiance: string }
> = {
  WEREWOLF: {
    label: "Werewolf",
    description:
      "Each night, coordinate with your fellow werewolf to choose a villager to eliminate. Blend in during the day.",
    accent: "border-destructive/60 text-foreground",
    sigil: "W",
    allegiance: "The pack",
  },
  VILLAGER: {
    label: "Villager",
    description:
      "You have no night action. Use the day to find contradictions and vote out the werewolves before they outnumber you.",
    accent: "border-border text-foreground",
    sigil: "V",
    allegiance: "The village",
  },
  DOCTOR: {
    label: "Doctor",
    description:
      "Each night, choose one player to heal. If they're attacked, they survive. You may heal yourself.",
    accent: "border-primary/60 text-foreground",
    sigil: "+",
    allegiance: "The village",
  },
  SEER: {
    label: "Seer",
    description:
      "Each night, investigate one player to learn if they are a werewolf. Use what you learn carefully.",
    accent: "border-primary/60 text-foreground",
    sigil: "S",
    allegiance: "The village",
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
        className={`flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card ${className}`}
      >
        <span className="grid h-16 w-16 place-items-center rounded-full border border-primary/50 font-mono text-2xl text-primary">?</span>
        <span className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reveal when alone</span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex aspect-[3/4] w-full max-w-xs flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border bg-card p-8 text-center ${copy.accent} ${className}`}
    >
      <span aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-border" />
      <span className="grid h-20 w-20 place-items-center rounded-full border border-primary/60 font-mono text-3xl text-primary">{copy.sigil}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{copy.allegiance}</span>
      <span className="text-3xl font-semibold tracking-tight">{copy.label}</span>
      <p className="max-w-[26ch] text-sm leading-6 text-muted-foreground">{copy.description}</p>
    </div>
  );
}

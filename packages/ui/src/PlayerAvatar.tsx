const COLORS = ["bg-accent", "bg-secondary", "bg-muted"];

function colorForAddress(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length]!;
}

export interface PlayerAvatarProps {
  address: string;
  nickname: string;
  isAlive?: boolean;
  isHost?: boolean;
  ready?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
};

export function PlayerAvatar({
  address,
  nickname,
  isAlive = true,
  isHost = false,
  ready = false,
  size = "md",
  className = "",
}: PlayerAvatarProps) {
  const initials = nickname
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative">
        <div
          className={`flex items-center justify-center rounded-full border border-border font-mono font-semibold text-foreground ${SIZES[size]} ${
            isAlive ? colorForAddress(address) : "bg-muted"
          } ${isAlive ? "" : "opacity-40 grayscale"}`}
        >
          {initials || "?"}
        </div>
        {isHost && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[8px] font-black text-primary-foreground" title="Host">
            H
          </span>
        )}
        {ready && isAlive && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" title="Ready" />
        )}
        {!isAlive && (
          <span className="absolute inset-0 flex items-center justify-center text-lg">
            ×
          </span>
        )}
      </div>
      <span
        className={`max-w-[5rem] truncate text-xs ${
          isAlive ? "text-foreground" : "text-muted-foreground line-through"
        }`}
      >
        {nickname}
      </span>
    </div>
  );
}

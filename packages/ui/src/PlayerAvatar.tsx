const COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-orange-500",
];

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
          className={`flex items-center justify-center rounded-full font-bold text-white ${SIZES[size]} ${
            isAlive ? colorForAddress(address) : "bg-slate-700"
          } ${isAlive ? "" : "opacity-40 grayscale"}`}
        >
          {initials || "?"}
        </div>
        {isHost && (
          <span className="absolute -right-1 -top-1 text-xs" title="Host">
            👑
          </span>
        )}
        {ready && isAlive && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
        )}
        {!isAlive && (
          <span className="absolute inset-0 flex items-center justify-center text-lg">
            💀
          </span>
        )}
      </div>
      <span
        className={`max-w-[5rem] truncate text-xs ${
          isAlive ? "text-slate-200" : "text-slate-500 line-through"
        }`}
      >
        {nickname}
      </span>
    </div>
  );
}

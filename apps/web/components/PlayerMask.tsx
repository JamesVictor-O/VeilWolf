import Image from "next/image";

export function PlayerMask({ index, name, size = "md" }: { index: number; name: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`player-mask player-mask-${size}`}>
      <Image
        src="/images/veilwolf-roster.png"
        alt={`Masked portrait of ${name}`}
        width={2098}
        height={750}
        className="absolute bottom-0 h-full w-[500%] max-w-none object-cover object-bottom"
        style={{ left: `-${(index % 5) * 100}%` }}
      />
    </div>
  );
}

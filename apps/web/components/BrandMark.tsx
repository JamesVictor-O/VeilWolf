import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3" aria-label="VeilWolf">
      <span className="veilwolf-sigil grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-primary/70 bg-background" aria-hidden="true">
        <Image
          src="/veilwolflogo.png"
          alt=""
          width={96}
          height={96}
          priority
          className="h-full w-full scale-125 object-cover"
        />
      </span>
      {!compact && (
        <span className="hidden text-sm font-semibold uppercase tracking-[0.18em] md:inline">
          VeilWolf
        </span>
      )}
    </div>
  );
}

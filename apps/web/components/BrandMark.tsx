export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3" aria-label="VeilWolf">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/60 font-mono text-sm font-bold text-primary" aria-hidden="true">
        V
      </span>
      {!compact && (
        <span className="text-sm font-semibold uppercase tracking-[0.18em]">
          VeilWolf
        </span>
      )}
    </div>
  );
}

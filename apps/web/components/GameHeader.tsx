import { BrandMark } from "./BrandMark";

export function GameHeader({ context = "The village is listening" }: { context?: string }) {
  return (
    <header className="game-header relative z-20 flex min-h-20 items-center justify-between border-b border-border bg-background/95 px-5 sm:px-8 lg:px-12">
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden h-px w-8 bg-primary/70 sm:block" aria-hidden="true" />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Veil protocol</p>
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">Identity concealed</p>
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <BrandMark />
      </div>

      <div className="flex min-w-0 items-center justify-end gap-3 text-right">
        <div>
          <p className="max-w-28 truncate text-xs font-medium sm:max-w-none">{context}</p>
          <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:block">
            Circle secure
          </p>
        </div>
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-40 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
      </div>
    </header>
  );
}

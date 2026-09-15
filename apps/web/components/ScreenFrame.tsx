import type { ReactNode } from "react";
import { GameHeader } from "./GameHeader";

export function ScreenFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col bg-brand-bg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-56 h-[34rem] w-[34rem] rounded-full border border-border/60" />
      <GameHeader context={eyebrow ?? "Awaiting the first night"} />
      <section className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mb-8 max-w-2xl">
          {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
          <h1 className="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-6xl">{title}</h1>
          {description && <p className="mt-4 max-w-prose text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
        </div>
        {children}
      </section>
      {footer && <footer className="relative border-t border-border pt-5">{footer}</footer>}
    </main>
  );
}

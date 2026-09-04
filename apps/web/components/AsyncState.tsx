import { Button } from "@veilwolf/ui";

export function LoadingState({ label = "Preparing the village" }: { label?: string }) {
  return (
    <div className="flex min-h-[18rem] flex-col justify-center gap-4" role="status">
      <div className="h-3 w-24 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" />
      <div className="h-10 w-full max-w-md animate-pulse rounded-sm bg-muted motion-reduce:animate-none" />
      <div className="h-4 w-full max-w-xs animate-pulse rounded-sm bg-muted motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="max-w-lg rounded-md border border-destructive/50 bg-card p-6" role="alert">
      <p className="text-sm font-semibold">The trail went cold</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      {retry && <Button variant="secondary" className="mt-5" onClick={retry}>Try again</Button>}
    </div>
  );
}

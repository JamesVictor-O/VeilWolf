import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "border-primary bg-primary text-primary-foreground hover:brightness-95",
  secondary: "border-border bg-secondary text-secondary-foreground hover:bg-accent",
  danger: "border-destructive bg-destructive text-destructive-foreground hover:brightness-95",
  ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
};

export function Button({
  variant = "primary",
  className = "",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-r-transparent motion-reduce:animate-none"
        />
      )}
      {children}
    </button>
  );
}

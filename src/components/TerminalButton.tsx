import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "green" | "cyan" | "amber" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  bracket?: boolean;
}

const variantStyles: Record<Variant, string> = {
  green: "border-neon-green/70 text-neon-green hover:bg-neon-green hover:text-primary-foreground hover:shadow-glow-green",
  cyan: "border-neon-cyan/70 text-neon-cyan hover:bg-neon-cyan hover:text-primary-foreground hover:shadow-glow-cyan",
  amber: "border-neon-amber/70 text-neon-amber hover:bg-neon-amber hover:text-primary-foreground",
  danger: "border-destructive/60 text-destructive hover:bg-destructive/90 hover:text-destructive-foreground",
  ghost: "border-transparent text-dim hover:text-neon-green hover:border-border",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2.5 text-sm",
};

export const TerminalButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "green", size = "md", bracket = true, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        {...rest}
        className={cn(
          "inline-flex items-center justify-center gap-1 border bg-transparent font-mono font-bold uppercase tracking-wider rounded-sm transition-all duration-150 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed select-none",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
      >
        {bracket && <span aria-hidden>[</span>}
        <span className="whitespace-nowrap">{children}</span>
        {bracket && <span aria-hidden>]</span>}
      </button>
    );
  },
);
TerminalButton.displayName = "TerminalButton";
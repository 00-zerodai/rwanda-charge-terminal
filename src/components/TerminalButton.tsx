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
  green:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft border border-transparent",
  cyan:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft border border-transparent",
  amber:
    "bg-[hsl(var(--warning))] text-[hsl(var(--background))] hover:opacity-90 border border-transparent",
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-transparent",
  ghost:
    "bg-transparent text-foreground/80 hover:text-foreground hover:bg-muted border border-border",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs h-8",
  md: "px-4 py-2 text-sm h-9",
  lg: "px-5 py-2.5 text-sm h-11",
};

function prettify(child: any) {
  if (typeof child !== "string") return child;
  // Convert SCREAMING_SNAKE_CASE labels into "Title Case"
  return child
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const TerminalButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "green", size = "md", bracket: _b, className, children, ...rest }, ref) => {
    const content =
      typeof children === "string"
        ? prettify(children)
        : Array.isArray(children)
        ? children.map((c, i) => <span key={i}>{typeof c === "string" ? prettify(c) : c}</span>)
        : children;

    return (
      <button
        ref={ref}
        {...rest}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
      >
        {content}
      </button>
    );
  },
);
TerminalButton.displayName = "TerminalButton";

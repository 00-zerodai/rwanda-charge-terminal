import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const TerminalWindow = ({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-card border border-border rounded-2xl overflow-hidden shadow-elevated animate-[boot_0.3s_ease-out]",
      className,
    )}
  >
    {title && (
      <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground/90">
        {title}
      </div>
    )}
    <div className="p-4 sm:p-5 relative">{children}</div>
  </div>
);

export const TerminalLine = ({
  children,
  prompt: _p,
  tone = "green",
  className,
}: {
  children: ReactNode;
  prompt?: string;
  tone?: "green" | "cyan" | "amber" | "dim";
  className?: string;
}) => {
  const toneCls = {
    green: "text-foreground",
    cyan: "text-primary",
    amber: "text-[hsl(var(--warning))]",
    dim: "text-muted-foreground",
  }[tone];
  return (
    <div className={cn("text-sm leading-relaxed", toneCls, className)}>{children}</div>
  );
};

// Kept for API compatibility — renders text instantly without typing animation
export const Typewriter = ({
  text,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  cursor?: boolean;
  className?: string;
  onDone?: () => void;
}) => {
  useEffect(() => {
    onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <span className={className}>{text}</span>;
};

export const StatusBadge = ({
  status,
  label,
}: {
  status: "online" | "offline" | "busy" | "unknown";
  label?: string;
}) => {
  const map = {
    online: { color: "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30", dot: "bg-[hsl(var(--success))]", text: "Online" },
    offline: { color: "text-destructive bg-destructive/10 border-destructive/30", dot: "bg-destructive", text: "Offline" },
    busy: { color: "text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/30", dot: "bg-[hsl(var(--warning))]", text: "In use" },
    unknown: { color: "text-muted-foreground bg-muted border-border", dot: "bg-muted-foreground", text: "Unknown" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border", map.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", map.dot)} />
      {label ?? map.text}
    </span>
  );
};

// Re-export to keep prior import contracts
export const _unused = useState;

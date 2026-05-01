import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const TerminalWindow = ({
  title = "chargefinder@kigali:~",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("terminal-box rounded-sm overflow-hidden animate-boot", className)}>
    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-xs">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-neon-amber/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-neon-green/80 shadow-glow-green" />
      </div>
      <span className="ml-2 text-dim truncate">{title}</span>
    </div>
    <div className="p-3 sm:p-4 relative">{children}</div>
  </div>
);

export const TerminalLine = ({
  children,
  prompt = ">",
  tone = "green",
  className,
}: {
  children: ReactNode;
  prompt?: string;
  tone?: "green" | "cyan" | "amber" | "dim";
  className?: string;
}) => {
  const toneCls = {
    green: "text-neon-green",
    cyan: "text-neon-cyan",
    amber: "text-neon-amber",
    dim: "text-dim",
  }[tone];
  return (
    <div className={cn("flex gap-2 text-sm leading-relaxed", className)}>
      <span className={cn("select-none", toneCls)}>{prompt}</span>
      <span className="flex-1">{children}</span>
    </div>
  );
};

export const Typewriter = ({
  text,
  speed = 18,
  cursor = true,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  cursor?: boolean;
  className?: string;
  onDone?: () => void;
}) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
  }, [text]);
  useEffect(() => {
    if (i >= text.length) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => setI((v) => v + 1), speed);
    return () => clearTimeout(t);
  }, [i, text, speed, onDone]);
  return (
    <span className={className}>
      {text.slice(0, i)}
      {cursor && i < text.length && <span className="animate-blink">▊</span>}
    </span>
  );
};

export const StatusBadge = ({
  status,
  label,
}: {
  status: "online" | "offline" | "busy" | "unknown";
  label?: string;
}) => {
  const map = {
    online: { color: "text-neon-green", dot: "bg-neon-green shadow-glow-green", text: "ONLINE" },
    offline: { color: "text-destructive", dot: "bg-destructive", text: "OFFLINE" },
    busy: { color: "text-neon-amber", dot: "bg-neon-amber", text: "IN_USE" },
    unknown: { color: "text-dim", dot: "bg-muted-foreground", text: "UNKNOWN" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold tracking-wider", map.color)}>
      <span className={cn("h-2 w-2 rounded-full animate-pulse-glow", map.dot)} />
      [{label ?? map.text}]
    </span>
  );
};
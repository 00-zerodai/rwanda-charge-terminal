import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, MessageSquare, Link2, Facebook, Instagram } from "lucide-react";

const SHARE_URL = "https://voltarw.com";
const FEEDBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfph58f7kLjwU1ztzDqpAwbH-J2LhW_iWjoawzwtZhLRXcxig/viewform";
const SHARE_TEXT = `Check out Volta ⚡ — find EV charging & battery swap stations in Rwanda 🇷🇼\nHelp grow the EV ecosystem: ${SHARE_URL}`;
const GOAL = 500;

function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem("volta_session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("volta_session_id", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GrowthFeedbackDialog({ open, onOpenChange }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const sessionId = getOrCreateSessionId();
      // Register this visitor (idempotent via unique session_id)
      await supabase
        .from("volta_visitors")
        .insert({ session_id: sessionId })
        .then(() => undefined, () => undefined);

      const { count: total } = await supabase
        .from("volta_visitors")
        .select("*", { count: "exact", head: true });

      if (!cancelled && typeof total === "number") setCount(total);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const progress = Math.min(100, Math.round(((count ?? 0) / GOAL) * 100));

  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`, "_blank");
  const shareFacebook = () =>
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(SHARE_TEXT)}`,
      "_blank",
    );
  const shareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_TEXT);
      toast({ title: "Message copied", description: "Paste it in your Instagram story or DM." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually." });
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      toast({ title: "Link copied!" });
    } catch {
      toast({ title: "Copy failed", description: SHARE_URL });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md backdrop-blur-md rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Rocket size={18} />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold">Help us reach 500 users 🚀</DialogTitle>
            <DialogDescription className="text-xs">
              You're one of the early users of Volta. Help us grow EV infrastructure in Rwanda 🇷🇼
            </DialogDescription>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current users</span>
            <span className="font-medium text-foreground">
              {count ?? "—"} / {GOAL}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Share */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Know someone with an EV or electric bike? Share Volta with them.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={shareWhatsApp} className="justify-start">
              <MessageSquare size={14} /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={shareInstagram} className="justify-start">
              <Instagram size={14} /> Instagram
            </Button>
            <Button variant="outline" size="sm" onClick={shareFacebook} className="justify-start">
              <Facebook size={14} /> Facebook
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink} className="justify-start">
              <Link2 size={14} /> Copy link
            </Button>
          </div>
        </div>

        {/* Feedback */}
        <div className="rounded-xl border border-border bg-secondary/50 p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">Help us improve</p>
          <p className="text-xs text-muted-foreground">
            Your feedback is very important to us as we build the infrastructure for Rwanda's next EV transition ⚡🇷🇼
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => window.open(FEEDBACK_URL, "_blank", "noopener,noreferrer")}
          >
            Give feedback
          </Button>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition self-center"
        >
          Maybe later
        </button>
      </DialogContent>
    </Dialog>
  );
}
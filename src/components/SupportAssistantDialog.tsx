import { FormEvent, useEffect, useRef, useState } from "react";
import { CircleHelp, Mail, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { answerVoltaHelp } from "@/lib/support-help";
import { useLanguage } from "@/lib/i18n";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const QUICK_QUESTIONS = [
  "How do I get directions?",
  "How do I add or manage a station?",
  "How do I update available slots?",
  "What are the plans and payment options?",
];

export function SupportAssistantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
  }, [messages]);

  const sendQuestion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "assistant", text: answerVoltaHelp(trimmed) },
    ]);
    setQuestion("");
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendQuestion(question);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-5 pr-12">
          <div className="flex items-center gap-2">
            <CircleHelp size={20} className="text-primary" />
            <DialogTitle>{t("Volta Help Assistant")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("I answer common Volta questions using built-in help topics. For personal help, contact us by email or WhatsApp.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto p-5">
          <div
            ref={messageListRef}
            role="log"
            aria-live="polite"
            aria-label={t("Help conversation")}
            className="max-h-[34dvh] min-h-24 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3"
          >
            <p className="max-w-[90%] rounded-lg bg-card p-3 text-sm text-foreground">
              {t("Hi! Choose a common question or describe what you need help with.")}
            </p>
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-lg p-3 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {message.text}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((quickQuestion) => (
              <button
                key={quickQuestion}
                type="button"
                onClick={() => sendQuestion(quickQuestion)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                {t(quickQuestion)}
              </button>
            ))}
          </div>

          <form onSubmit={submitQuestion} className="flex gap-2">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
              placeholder={t("Describe the issue you're having")}
              aria-label={t("Describe the issue you're having")}
            />
            <Button type="submit" size="icon" aria-label={t("Send question")} disabled={!question.trim()}>
              <Send size={16} />
            </Button>
          </form>

          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href="mailto:b.bruno@fortisbpo.com?subject=Volta%20support"
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground hover:bg-muted"
            >
              <Mail size={16} className="shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{t("Email support")}</span>
                <span className="break-all font-medium">b.bruno@fortisbpo.com</span>
              </span>
            </a>
            <a
              href="https://wa.me/250788504946?text=Hello%20Volta%20Support"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground hover:bg-muted"
            >
              <MessageCircle size={16} className="shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{t("WhatsApp support")}</span>
                <span className="font-medium">+250 788 504 946</span>
              </span>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

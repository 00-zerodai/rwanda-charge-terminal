import { useEffect, useState } from "react";
import { Station } from "@/lib/stations";
import { TerminalLine, Typewriter } from "./Terminal";
import { TerminalButton } from "./TerminalButton";
import { logChargeSession } from "./StationSheet";

type Step = "connect" | "method" | "card" | "momo" | "processing" | "charging" | "done";
type ConnectMode = "qr" | "nfc";
type PayMethod = "CARD" | "MTN_MOMO" | "AIRTEL_MONEY";

export const ChargingFlow = ({ station, onDone }: { station: Station; onDone: () => void }) => {
  const [step, setStep] = useState<Step>("connect");
  const [mode, setMode] = useState<ConnectMode | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [amount] = useState(2500); // RWF demo

  const push = (line: string) => setLogs((l) => [...l, line]);

  useEffect(() => {
    if (step === "connect" && mode) {
      setLogs([]);
      const seq = [
        `Initiating ${mode.toUpperCase()} handshake…`,
        "Discovering charger…",
        `Charger found: ${station.id.slice(0, 8).toUpperCase()}`,
        "Verifying signature… OK",
        "Charger linked ✓",
      ];
      seq.forEach((line, i) =>
        setTimeout(() => {
          push(line);
          if (i === seq.length - 1) setTimeout(() => setStep("method"), 500);
        }, i * 600),
      );
    }
  }, [mode, step, station.id]);

  useEffect(() => {
    if (step === "processing") {
      setLogs([]);
      const seq = [
        `Authorizing ${amount.toLocaleString()} RWF via ${method}…`,
        "Contacting payment gateway…",
        "Authorizing…",
        "Payment successful (demo mode) ✓",
      ];
      seq.forEach((line, i) =>
        setTimeout(() => {
          push(line);
          if (i === seq.length - 1) setTimeout(() => setStep("charging"), 600);
        }, i * 700),
      );
    }
    if (step === "charging") {
      setLogs([]);
      const seq = [
        "Charger engaged",
        "Battery: 32% → 47% → 68% → 85%",
        "Session complete · 12.4 kWh delivered",
      ];
      seq.forEach((line, i) =>
        setTimeout(() => {
          push(line);
          if (i === seq.length - 1) {
            logChargeSession({
              id: crypto.randomUUID(),
              stationId: station.id,
              stationName: station.name,
              date: new Date().toISOString(),
              kwh: 12.4,
              amountRwf: amount,
              method: method ?? "CARD",
            });
            setTimeout(() => setStep("done"), 600);
          }
        }, i * 900),
      );
    }
  }, [step, amount, method, station.id, station.name]);

  return (
    <div className="space-y-3">
      {step === "connect" && !mode && (
        <>
          <h3 className="text-base font-semibold text-foreground">Connect to charger</h3>
          <p className="text-sm text-muted-foreground mt-1">Choose how to link with {station.name}.</p>
          <div className="flex flex-wrap gap-2">
            <TerminalButton variant="green" size="lg" onClick={() => setMode("qr")}>
              Scan QR
            </TerminalButton>
            <TerminalButton variant="ghost" size="lg" onClick={() => setMode("nfc")}>
              Tap NFC
            </TerminalButton>
          </div>
        </>
      )}

      {(step === "connect" && mode) || step === "processing" || step === "charging" ? (
        <div className="terminal-box bg-background/60 p-3 min-h-[140px] font-mono text-sm space-y-1">
          {logs.map((l, i) => (
            <TerminalLine key={i} tone={l.includes("✓") ? "green" : i === logs.length - 1 ? "cyan" : "dim"}>
              <Typewriter text={l} speed={10} cursor={i === logs.length - 1} />
            </TerminalLine>
          ))}
        </div>
      ) : null}

      {step === "method" && (
        <>
          <h3 className="text-base font-semibold text-foreground">Choose payment method</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <TerminalButton variant="green" size="lg" onClick={() => { setMethod("CARD"); setStep("card"); }}>
              Card
            </TerminalButton>
            <TerminalButton variant="amber" size="lg" onClick={() => { setMethod("MTN_MOMO"); setStep("momo"); }}>
              MTN MoMo
            </TerminalButton>
            <TerminalButton variant="danger" size="lg" onClick={() => { setMethod("AIRTEL_MONEY"); setStep("momo"); }}>
              Airtel Money
            </TerminalButton>
          </div>
        </>
      )}

      {step === "card" && (
        <CardForm onPay={() => setStep("processing")} amount={amount} />
      )}
      {step === "momo" && (
        <MomoForm provider={method!} onPay={() => setStep("processing")} amount={amount} />
      )}

      {step === "done" && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[hsl(var(--success))]">Charging complete</h3>
          <div className="bg-muted/30 border border-border rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Station</span><span className="font-medium">{station.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivered</span><span className="text-primary font-medium">12.4 kWh</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium">{amount.toLocaleString()} RWF</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{method}</span></div>
          </div>
          <TerminalButton variant="green" size="lg" onClick={onDone} className="w-full">Done</TerminalButton>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[10px] uppercase tracking-widest text-dim mb-1">$ {label}</span>
    {children}
  </label>
);

const inputCls =
  "w-full bg-input border border-border px-2 py-1.5 text-sm text-neon-green font-mono outline-none focus:border-neon-green focus:shadow-glow-green rounded-sm";

const CardForm = ({ onPay, amount }: { onPay: () => void; amount: number }) => {
  const [num, setNum] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/29");
  const [cvc, setCvc] = useState("123");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onPay(); }}
      className="space-y-3"
    >
      <TerminalLine tone="cyan">payment_form :: card</TerminalLine>
      <Field label="card_number">
        <input className={inputCls} value={num} onChange={(e) => setNum(e.target.value)} maxLength={19} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="exp"><input className={inputCls} value={exp} onChange={(e) => setExp(e.target.value)} maxLength={5} /></Field>
        <Field label="cvc"><input className={inputCls} value={cvc} onChange={(e) => setCvc(e.target.value)} maxLength={4} /></Field>
      </div>
      <PayBar amount={amount} />
    </form>
  );
};

const MomoForm = ({ provider, onPay, amount }: { provider: PayMethod; onPay: () => void; amount: number }) => {
  const [phone, setPhone] = useState("+2507");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onPay(); }} className="space-y-3">
      <TerminalLine tone="cyan">payment_form :: {provider.toLowerCase()}</TerminalLine>
      <Field label="phone_number">
        <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} />
      </Field>
      <p className="text-xs text-dim">A USSD prompt will be simulated on the demo handset.</p>
      <PayBar amount={amount} />
    </form>
  );
};

const PayBar = ({ amount }: { amount: number }) => (
  <div className="flex items-center justify-between border-t border-border pt-3">
    <div className="text-sm">
      <span className="text-dim">total :: </span>
      <span className="text-neon-green font-bold glow-green">{amount.toLocaleString()} RWF</span>
    </div>
    <TerminalButton variant="green" size="lg" type="submit">PAY_NOW</TerminalButton>
  </div>
);
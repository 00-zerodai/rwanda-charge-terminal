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
        `INIT ${mode.toUpperCase()}_HANDSHAKE...`,
        "DISCOVERING CHARGER ID...",
        `CHARGER FOUND: ${station.id.slice(0, 8).toUpperCase()}`,
        "VERIFYING SIGNATURE... OK",
        "CHARGER LINKED ✓",
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
        `INIT TX :: amount=${amount} RWF :: method=${method}`,
        "CONTACTING PAYMENT GATEWAY...",
        "AUTHORIZING...",
        "PAYMENT SUCCESSFUL [DEMO MODE] ✓",
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
        "CHARGER ENGAGED",
        "BATTERY: 32% → 47% → 68% → 85%",
        "SESSION COMPLETE :: 12.4 kWh delivered",
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
          <TerminalLine tone="cyan">
            <Typewriter text={`> link_charger --station="${station.name}"`} cursor={false} speed={10} />
          </TerminalLine>
          <p className="text-xs text-dim mt-2">Choose a connection method:</p>
          <div className="flex flex-wrap gap-2">
            <TerminalButton variant="green" size="lg" onClick={() => setMode("qr")}>
              SCAN_QR
            </TerminalButton>
            <TerminalButton variant="cyan" size="lg" onClick={() => setMode("nfc")}>
              TAP_NFC
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
          <TerminalLine tone="cyan">SELECT_PAYMENT_METHOD</TerminalLine>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <TerminalButton variant="green" size="lg" onClick={() => { setMethod("CARD"); setStep("card"); }}>
              CARD
            </TerminalButton>
            <TerminalButton variant="amber" size="lg" onClick={() => { setMethod("MTN_MOMO"); setStep("momo"); }}>
              MTN_MOMO
            </TerminalButton>
            <TerminalButton variant="danger" size="lg" onClick={() => { setMethod("AIRTEL_MONEY"); setStep("momo"); }}>
              AIRTEL_MONEY
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
          <TerminalLine tone="green">
            <span className="glow-green font-bold">SESSION_TERMINATED :: SUCCESS ✓</span>
          </TerminalLine>
          <div className="terminal-box p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-dim">station</span><span>{station.name}</span></div>
            <div className="flex justify-between"><span className="text-dim">delivered</span><span className="text-neon-cyan">12.4 kWh</span></div>
            <div className="flex justify-between"><span className="text-dim">paid</span><span className="text-neon-green">{amount.toLocaleString()} RWF</span></div>
            <div className="flex justify-between"><span className="text-dim">method</span><span>{method}</span></div>
          </div>
          <TerminalButton variant="green" size="lg" onClick={onDone}>EXIT</TerminalButton>
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
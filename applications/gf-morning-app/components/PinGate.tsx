"use client";
import { useEffect, useState } from "react";
import TermsPage from "./TermsPage";

const STORAGE_KEY = "mcc_auth";
const TERMS_KEY   = "mcc_terms_accepted";
const CORRECT_PIN = process.env.NEXT_PUBLIC_APP_PIN ?? "";
const PIN_LENGTH  = CORRECT_PIN.length || 4;

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "locked" | "terms" | "unlocked">("loading");
  const [pin, setPin]       = useState("");
  const [shake, setShake]   = useState(false);
  const [error, setError]   = useState(false);

  useEffect(() => {
    if (!CORRECT_PIN) { setStatus("unlocked"); return; }
    const auth    = localStorage.getItem(STORAGE_KEY);
    const terms   = localStorage.getItem(TERMS_KEY);
    if (auth === "true" && terms === "true") { setStatus("unlocked"); return; }
    if (auth === "true") { setStatus("terms"); return; }
    setStatus("locked");
  }, []);

  function attempt(entered: string) {
    if (entered === CORRECT_PIN) {
      localStorage.setItem(STORAGE_KEY, "true");
      const terms = localStorage.getItem(TERMS_KEY);
      setStatus(terms === "true" ? "unlocked" : "terms");
    } else {
      setShake(true);
      setError(true);
      setPin("");
      setTimeout(() => { setShake(false); setError(false); }, 600);
    }
  }

  function handleKey(digit: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) setTimeout(() => attempt(next), 120);
  }

  function handleAcceptTerms() {
    localStorage.setItem(TERMS_KEY, "true");
    setStatus("unlocked");
  }

  if (status === "loading")  return <div className="min-h-screen bg-slate-50" />;
  if (status === "unlocked") return <>{children}</>;
  if (status === "terms")    return <TermsPage onAccept={handleAcceptTerms} />;

  // status === "locked"
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-indigo-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">☀️</div>
          <h1 className="text-2xl font-bold text-slate-800">Good morning, pookie!</h1>
          <p className="text-sm text-slate-400 mt-1">Enter your PIN to continue</p>
        </div>

        <div className={`flex justify-center gap-4 mb-8 ${shake ? "pin-shake" : ""}`}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                error
                  ? "bg-red-400 border-red-400"
                  : i < pin.length
                  ? "bg-blue-600 border-blue-600"
                  : "bg-transparent border-slate-300"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d) => (
            <button
              key={d}
              onClick={() => {
                if (d === "⌫") setPin((p) => p.slice(0, -1));
                else if (d !== "") handleKey(d);
              }}
              className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                d === ""
                  ? "pointer-events-none"
                  : d === "⌫"
                  ? "bg-white/60 text-slate-400 border border-slate-200 hover:bg-white"
                  : "bg-white text-slate-800 border border-slate-200 shadow-sm hover:bg-blue-50 hover:border-blue-200"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

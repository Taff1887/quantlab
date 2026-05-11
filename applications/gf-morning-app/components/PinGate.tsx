"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mcc_auth";
const CORRECT_PIN = process.env.NEXT_PUBLIC_APP_PIN ?? "";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem(STORAGE_KEY);
    setStatus(auth === "true" ? "unlocked" : "locked");
  }, []);

  function handleSubmit() {
    if (pin === CORRECT_PIN) {
      localStorage.setItem(STORAGE_KEY, "true");
      setStatus("unlocked");
    } else {
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 600);
    }
  }

  function handleKey(digit: string) {
    if (pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === CORRECT_PIN.length) {
      setTimeout(() => {
        if (next === CORRECT_PIN) {
          localStorage.setItem(STORAGE_KEY, "true");
          setStatus("unlocked");
        } else {
          setShake(true);
          setPin("");
          setTimeout(() => setShake(false), 600);
        }
      }, 120);
    }
  }

  if (status === "loading") return <div className="min-h-screen bg-slate-50" />;
  if (status === "unlocked") return <>{children}</>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-indigo-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">☀️</div>
          <h1 className="text-2xl font-bold text-slate-800">Morning CC</h1>
          <p className="text-sm text-slate-400 mt-1">Enter your PIN to continue</p>
        </div>

        {/* PIN dots */}
        <div
          className={`flex justify-center gap-4 mb-8 transition-transform ${
            shake ? "animate-[wiggle_0.5s_ease-in-out]" : ""
          }`}
          style={shake ? { animation: "wiggle 0.5s ease-in-out" } : {}}
        >
          {Array.from({ length: CORRECT_PIN.length }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "bg-blue-600 border-blue-600"
                  : "bg-transparent border-slate-300"
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
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

        <style>{`
          @keyframes wiggle {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    </div>
  );
}

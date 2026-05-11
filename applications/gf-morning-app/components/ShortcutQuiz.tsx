"use client";
import { useEffect, useState } from "react";

interface Shortcut {
  q: string;
  answer: string[][];   // array of valid key combos (each combo is an array of key names)
  hint: string;
}

const SHORTCUTS: Shortcut[] = [
  { q: "Show all formulas instead of values in every cell", answer: [["Ctrl", "`"]], hint: "Best tool for auditing a model — every formula visible at once." },
  { q: "Open Paste Special dialog", answer: [["Ctrl", "Alt", "V"]], hint: "Then press V, Enter to paste values only — removes all formulas." },
  { q: "Toggle Absolute Reference ($) — cycle A1 → $A$1 → A$1 → $A1", answer: [["F4"]], hint: "Works in the formula bar as you're building a formula." },
  { q: "AutoSum the selected range (Excel guesses which cells)", answer: [["Alt", "="]], hint: "Works on the entire selection or guesses a range above/left." },
  { q: "Open Format Cells dialog (number, font, border, fill)", answer: [["Ctrl", "1"]], hint: "Fastest way to any formatting option — bypasses the ribbon entirely." },
  { q: "Fill Down — copy top cell to rest of selected range", answer: [["Ctrl", "D"]], hint: "Select from source cell downward first, then press." },
  { q: "Fill Right — copy leftmost cell across selection", answer: [["Ctrl", "R"]], hint: "Select from source cell rightward first, then press." },
  { q: "Insert static current date (won't change tomorrow)", answer: [["Ctrl", ";"]], hint: "For a dynamic date use =TODAY(). For static, use this shortcut." },
  { q: "Force calculation of all open workbooks", answer: [["F9"]], hint: "Essential when Excel is in Manual calculation mode on large models." },
  { q: "Toggle AutoFilter on the selected range", answer: [["Ctrl", "Shift", "L"]], hint: "Instant way to add/remove filter dropdowns without the ribbon." },
  { q: "Format selected cells as Currency ($)", answer: [["Ctrl", "Shift", "$"]], hint: "Applies 2-decimal currency format. Ctrl+Shift+% for percentage." },
  { q: "Format selected cells as Percentage (%)", answer: [["Ctrl", "Shift", "%"]], hint: "Applies 0% format. Add decimal places manually in Format Cells." },
  { q: "Go To — navigate to a named range or cell address", answer: [["F5"]], hint: "Type any range name or address (e.g. A5000) to jump there instantly." },
  { q: "Enter edit mode for the active cell", answer: [["F2"]], hint: "Then use arrow keys to move within the formula without selecting cells." },
  { q: "Create a Table (structured reference) from current range", answer: [["Ctrl", "T"]], hint: "Tables auto-expand, format, and enable [Column] references in formulas." },
  { q: "Select the entire column of the active cell", answer: [["Ctrl", "Space"]], hint: "Shift+Space selects the entire row instead." },
  { q: "Group selected rows or columns (add outline level)", answer: [["Alt", "Shift", "→"]], hint: "Alt+Shift+← to ungroup. Builds collapsible outline sections in models." },
  { q: "Hide selected rows", answer: [["Ctrl", "9"]], hint: "Ctrl+Shift+9 to unhide. Ctrl+0 hides columns; Ctrl+Shift+0 to unhide." },
  { q: "Insert a new worksheet tab", answer: [["Shift", "F11"]], hint: "Inserts to the left of the active sheet." },
  { q: "Format as General (remove all number formatting)", answer: [["Ctrl", "Shift", "~"]], hint: "Resets any number format back to plain General — the nuclear option." },
  { q: "Repeat the last action performed", answer: [["Ctrl", "Y"], ["F4"]], hint: "F4 also works (when not toggling references). Underused by most analysts." },
  { q: "Move to the last cell with data in the direction of the arrow key", answer: [["Ctrl", "→"]], hint: "Works in all four directions. Ctrl+Shift+Arrow to select to the edge." },
  { q: "Select to the last cell with data (extend selection right)", answer: [["Ctrl", "Shift", "→"]], hint: "Combine Ctrl+Shift+End to select the entire used range." },
  { q: "Open the Excel Name Manager (manage named ranges)", answer: [["Ctrl", "F3"]], hint: "Where you define LAMBDAs. Ctrl+Shift+F3 creates names from a selection." },
  { q: "Add an outline border to the selected range", answer: [["Ctrl", "Shift", "&"]], hint: "Ctrl+Shift+_ removes borders. Ctrl+1 for full border control." },
];

// Keyboard layout
interface KbKey { base: string; shifted?: string; label: string; wide?: boolean }

const MODIFIER_KEYS = ["Ctrl", "Shift", "Alt"];

const KEY_ROWS: KbKey[][] = [
  [
    { base: "Esc", label: "Esc" },
    { base: "F1", label: "F1" }, { base: "F2", label: "F2" }, { base: "F3", label: "F3" }, { base: "F4", label: "F4" },
    { base: "F5", label: "F5" }, { base: "F6", label: "F6" }, { base: "F7", label: "F7" }, { base: "F8", label: "F8" },
    { base: "F9", label: "F9" }, { base: "F10", label: "F10" }, { base: "F11", label: "F11" }, { base: "F12", label: "F12" },
  ],
  [
    { base: "`", shifted: "~", label: "`~" }, { base: "1", shifted: "!", label: "1!" }, { base: "2", shifted: "@", label: "2@" },
    { base: "3", shifted: "#", label: "3#" }, { base: "4", shifted: "$", label: "4$" }, { base: "5", shifted: "%", label: "5%" },
    { base: "6", shifted: "^", label: "6^" }, { base: "7", shifted: "&", label: "7&" }, { base: "8", shifted: "*", label: "8*" },
    { base: "9", shifted: "(", label: "9(" }, { base: "0", shifted: ")", label: "0)" },
    { base: "-", shifted: "_", label: "-_" }, { base: "=", shifted: "+", label: "=+" },
  ],
  [
    { base: "Q", label: "Q" }, { base: "W", label: "W" }, { base: "E", label: "E" }, { base: "R", label: "R" },
    { base: "T", label: "T" }, { base: "Y", label: "Y" }, { base: "U", label: "U" }, { base: "I", label: "I" },
    { base: "O", label: "O" }, { base: "P", label: "P" },
    { base: "[", shifted: "{", label: "[{" }, { base: "]", shifted: "}", label: "]}" },
  ],
  [
    { base: "A", label: "A" }, { base: "S", label: "S" }, { base: "D", label: "D" }, { base: "F", label: "F" },
    { base: "G", label: "G" }, { base: "H", label: "H" }, { base: "J", label: "J" }, { base: "K", label: "K" },
    { base: "L", label: "L" }, { base: ";", shifted: ":", label: ";:" }, { base: "'", shifted: "\"", label: "'\"" },
    { base: "Enter", label: "↵", wide: true },
  ],
  [
    { base: "Z", label: "Z" }, { base: "X", label: "X" }, { base: "C", label: "C" }, { base: "V", label: "V" },
    { base: "B", label: "B" }, { base: "N", label: "N" }, { base: "M", label: "M" },
    { base: ",", shifted: "<", label: ",<" }, { base: ".", shifted: ">", label: ".>" }, { base: "/", shifted: "?", label: "/?" },
  ],
  [
    { base: "Tab", label: "Tab" }, { base: "Space", label: "Space", wide: true },
    { base: "←", label: "←" }, { base: "↑", label: "↑" }, { base: "↓", label: "↓" }, { base: "→", label: "→" },
    { base: "Del", label: "Del" }, { base: "Backspace", label: "⌫" },
  ],
];

function normalise(keys: string[]) {
  return [...keys].map((k) => k.toLowerCase()).sort().join("+");
}

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const STORAGE_KEY = "shortcut_quiz_" + new Date().toISOString().split("T")[0];

export default function ShortcutQuiz() {
  const questionIdx = dayOfYear() % SHORTCUTS.length;
  const shortcut = SHORTCUTS[questionIdx];

  const [activeMods, setActiveMods] = useState<Set<string>>(new Set());
  const [mainKey, setMainKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  // Persist today's result in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { correct, keys } = JSON.parse(stored) as { correct: boolean; keys: string[] };
        setWasCorrect(correct);
        setSubmitted(true);
        // Re-populate keyboard state
        const mods = new Set(keys.filter((k) => MODIFIER_KEYS.includes(k)));
        const main = keys.find((k) => !MODIFIER_KEYS.includes(k)) ?? null;
        setActiveMods(mods);
        setMainKey(main);
      }
    } catch { /* ignore */ }
  }, []);

  function toggleMod(mod: string) {
    if (submitted) return;
    setActiveMods((prev) => {
      const next = new Set(prev);
      next.has(mod) ? next.delete(mod) : next.add(mod);
      return next;
    });
  }

  function pressKey(key: KbKey) {
    if (submitted) return;
    // If Shift is active and key has a shifted version, use shifted value
    const value = activeMods.has("Shift") && key.shifted ? key.shifted : key.base;
    setMainKey(value);
  }

  function handleSubmit() {
    if (!mainKey && activeMods.size === 0) return;
    const selectedKeys = [...activeMods, ...(mainKey ? [mainKey] : [])];
    const correct = shortcut.answer.some(
      (combo) => normalise(combo) === normalise(selectedKeys)
    );
    setWasCorrect(correct);
    setSubmitted(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ correct, keys: selectedKeys }));
    } catch { /* ignore */ }
  }

  function reset() {
    setActiveMods(new Set());
    setMainKey(null);
    setSubmitted(false);
    setWasCorrect(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  const selectedKeys = [...activeMods, ...(mainKey ? [mainKey] : [])];
  const selectedDisplay = selectedKeys.length
    ? selectedKeys.join(" + ")
    : "Select keys below";

  return (
    <div className="card">
      <div className="mb-3">
        <h2 className="section-title">⌨️ Shortcut of the Day</h2>
        <p className="text-xs text-slate-400 mt-0.5">Excel for Windows · new question every day</p>
      </div>

      {/* Question */}
      <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-4">
        <p className="text-sm font-semibold text-slate-800 leading-relaxed">{shortcut.q}</p>
      </div>

      {/* Selected combo display */}
      <div className={`rounded-xl px-4 py-2.5 mb-3 text-center border transition-all ${
        submitted
          ? wasCorrect
            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
            : "bg-red-50 border-red-300 text-red-800"
          : "bg-white border-slate-200 text-slate-700"
      }`}>
        <p className="text-xs text-slate-400 mb-0.5">Your answer</p>
        <p className="font-bold font-mono text-sm">
          {selectedKeys.length ? selectedKeys.join(" + ") : <span className="text-slate-300">—</span>}
        </p>
      </div>

      {/* Result */}
      {submitted && (
        <div className={`rounded-2xl px-4 py-3 mb-4 text-sm leading-relaxed ${
          wasCorrect ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
        }`}>
          <p className="font-bold mb-1">
            {wasCorrect ? "✅ Correct!" : "❌ Not quite"}
          </p>
          {!wasCorrect && (
            <p className="font-mono font-bold mb-1">
              Answer: {shortcut.answer[0].join(" + ")}
              {shortcut.answer.length > 1 && ` (or ${shortcut.answer[1].join(" + ")})`}
            </p>
          )}
          <p className="text-xs opacity-80 mt-1">{shortcut.hint}</p>
          <button onClick={reset} className="mt-2 text-xs font-semibold underline opacity-60">
            Try again
          </button>
        </div>
      )}

      {/* ── Keyboard ── */}
      <div className="select-none">
        {/* Modifier toggles */}
        <div className="flex gap-2 mb-2">
          {MODIFIER_KEYS.map((mod) => (
            <button
              key={mod}
              onClick={() => toggleMod(mod)}
              disabled={submitted}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                activeMods.has(mod)
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
              } disabled:opacity-40 disabled:cursor-default`}
            >
              {mod}
            </button>
          ))}
        </div>

        {/* Key rows */}
        <div className="space-y-1 overflow-x-auto pb-1">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 min-w-max">
              {row.map((key) => {
                const effectiveValue = activeMods.has("Shift") && key.shifted ? key.shifted : key.base;
                const isSelected = mainKey === effectiveValue;
                return (
                  <button
                    key={key.base}
                    onClick={() => pressKey(key)}
                    disabled={submitted}
                    className={`h-8 px-1.5 rounded-lg text-xs font-mono font-semibold border transition-all flex-shrink-0 ${
                      key.wide ? "min-w-[52px]" : "min-w-[28px]"
                    } ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                    } disabled:opacity-40 disabled:cursor-default`}
                  >
                    {key.label.length > 3 ? (
                      <span className="text-[9px]">{key.label}</span>
                    ) : key.shifted ? (
                      <span className="flex flex-col items-center leading-none gap-px">
                        <span className="text-[7px] text-slate-400">{key.shifted}</span>
                        <span>{key.base}</span>
                      </span>
                    ) : (
                      key.label
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selectedKeys.length === 0}
          className="btn-primary w-full mt-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check answer
        </button>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";

const CLAUSES = [
  {
    n: 1,
    title: "Supreme Authority Clause",
    body: "I acknowledge that Taffy Jackson is, at minimum, the Supreme Pookie Overlord, Director of Cuddles, and Chief Menace Officer of this relationship.",
  },
  {
    n: 2,
    title: "Cuddle Availability Clause",
    body: "I agree to provide cuddles, hugs, kisses, and general girlfriend affection on a commercially reasonable best-efforts basis.",
  },
  {
    n: 3,
    title: "Humping Rights Clause",
    body: "I acknowledge that Taffy is granted automatic humping privileges at random intervals, subject only to silliness, mutual happiness, and the general laws of being in love.",
  },
  {
    n: 4,
    title: "Weekend Feeding Clause",
    body: "I agree that Sunday shall involve cooking Taffy food for the week as fair payment for his ongoing services, and Saturday breakfast shall be treated as a sacred institution, especially if he is extra hungry.",
  },
  {
    n: 5,
    title: "Princess Treatment Clause",
    body: "In exchange, Taffy agrees to treat me like the beautiful, divine, wonderful queen that I am, including but not limited to compliments, kisses, carrying bags, opening doors, back scratches, massages, and continuing such massage services even while I fall asleep.",
  },
  {
    n: 6,
    title: "Ridiculous Behaviour Clause",
    body: "I accept that Taffy may occasionally call me ridiculous names, say absurd things, act like a menace, or behave in ways that no normal adult man should. I agree not to report this behaviour to the authorities unless it becomes unbearable.",
  },
  {
    n: 7,
    title: "Attention Clause",
    body: "I agree to give Taffy attention when he is being needy, annoying, dramatic, or pretending to be sad for affection.",
  },
  {
    n: 8,
    title: "Annoyance Waiver",
    body: "I understand that Taffy may be irritating, clingy, hyperactive, or weird. I waive all rights to be surprised by this.",
  },
  {
    n: 9,
    title: "Hot Girlfriend Acknowledgement",
    body: 'I acknowledge that I am extremely hot and that this may cause Taffy to behave irrationally, stare at me, or say "gyad daym" without warning.',
  },
  {
    n: 10,
    title: "Coffee Funding Clause",
    body: "I acknowledge that Taffy regularly pays for every single one of my coffees, and that this generous, noble, and financially questionable arrangement shall be maintained and upheld forever.",
  },
  {
    n: 11,
    title: "Flower Game Clause",
    body: "I agree that whenever we pass or enter a flower shop, Taffy is entitled to play the sacred flower game, in which he attempts to guess my favourite flowers. I further agree to provide appropriate feedback, encouragement, and judgment based on the accuracy of his guesses.",
  },
  {
    n: 12,
    title: "Dramatic Sigh and Tummy Clause",
    body: 'I am permitted to dramatically sigh, flop onto the bed, say "I\'m tired," or announce "my tummy hurts" with no further explanation. Taffy must respond with care, snacks, affection, and where applicable, the legally required phrase: "aww poor peen," followed immediately by a hug.',
  },
];

export default function TermsPage({ onAccept }: { onAccept: () => void }) {
  const [ticked1, setTicked1] = useState(false);
  const canAccept = ticked1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-indigo-50 flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-sky-400 to-blue-500 px-5 pt-10 pb-4 shadow-sm">
        <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-0.5">
          Legally Binding Document
        </p>
        <h1 className="text-xl font-bold text-white leading-snug">
          Terms &amp; Conditions of Pookie App Usage
        </h1>
        <p className="text-xs text-sky-100 mt-1">
          By opening this app, I, the undersigned girlfriend, hereby agree to the following highly binding and completely enforceable terms:
        </p>
      </div>

      {/* Scrollable clauses */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {CLAUSES.map((c) => (
          <div key={c.n} className="bg-white/90 rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 mt-0.5">
                {c.n}
              </span>
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">{c.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Spacer so content doesn't hide behind sticky footer */}
        <div className="h-4" />
      </div>

      {/* Sticky footer — checkboxes + accept */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-5 pt-4 pb-8 space-y-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {/* Single checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => setTicked1((v) => !v)}
            className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              ticked1 ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
            }`}
          >
            {ticked1 && <span className="text-white text-xs leading-none font-bold">✓</span>}
          </div>
          <p
            onClick={() => setTicked1((v) => !v)}
            className="text-xs text-slate-600 leading-relaxed"
          >
            I accept the 12 above terms in their entirety and, by pressing &ldquo;I Accept,&rdquo; confirm that I am locked into this relationship contract forever.
          </p>
        </label>

        {/* Accept button */}
        <button
          onClick={() => { if (canAccept) onAccept(); }}
          disabled={!canAccept}
          className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all ${
            canAccept
              ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-200"
              : "bg-slate-100 text-slate-300 cursor-not-allowed"
          }`}
        >
          {canAccept ? "I Accept 💕" : "Please tick both boxes above"}
        </button>
      </div>
    </div>
  );
}

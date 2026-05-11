"use client";

const FACTS = [
  "The word 'salary' comes from Latin 'salarium' — Roman soldiers were sometimes paid in salt. 🧂",
  "Goldman Sachs was founded in 1869 in a basement in Manhattan. It took 130 years to IPO. 🏛️",
  "Warren Buffett filed his first tax return at age 13, deducting his bicycle as a business expense. 🚲",
  "A single 'fat finger' trade in 2010 contributed to the Flash Crash, wiping $1 trillion from markets in minutes. 🖐️",
  "The ASX 200 has been called 'the world's biggest mining company and four banks' — because it basically is. ⛏️",
  "The world's first stock exchange opened in Amsterdam in 1602. The company listed: the Dutch East India Company. 🌍",
  "JP Morgan personally saved the US from collapse in 1907 by locking bankers in a room until they agreed to a rescue plan. 🔐",
  "The S&P 500 has never had a negative 20-year return. Ever. Buy and hold is boring but it works. 📈",
  "Australia went 28 years without a recession (1991–2020) — the longest run in modern history for a developed economy. 🦘",
  "George Soros made $1 billion in a single day 'breaking' the Bank of England in 1992. The pound duly collapsed. 💷",
  "The Federal Reserve was created in 1913 to prevent bank panics — then presided over the Great Depression 16 years later. 🎢",
  "Lehman Brothers survived the US Civil War, two World Wars, and the Great Depression before collapsing from US mortgage paper in 2008. 🏦",
  "The Dutch tulip bulb market collapsed in 1637. A single rare bulb sold for 10× a craftsman's annual salary before the crash. 🌷",
  "CFA Level 1 has a pass rate of around 37%. It's harder to pass than many law bar exams. 📚",
  "BlackRock manages $10 trillion+ in assets — more than the GDP of every country except the US and China. 🌐",
  "The average IB analyst works 80–100 hour weeks. That's the equivalent of holding 2.5 full-time jobs. ⏰",
  "The Excel VLOOKUP function was introduced in 1985. Many investment banks still build critical models on it 40 years later. 📊",
  "Australia's sovereign wealth fund (the Future Fund) was seeded with $60.5B of Telstra privatisation proceeds in 2006. 🦘",
  "The word 'bankruptcy' comes from Italian 'banca rotta' — broken bench. When a money changer couldn't pay, his trading bench was literally smashed. 🪑",
  "A financial advisor who simply matched the S&P 500 index would outperform ~85% of active fund managers over 15 years. 🎯",
  "Australia has one of the highest household debt-to-income ratios in the world. We really, really love property. 🏡",
  "The Bloomberg Terminal costs ~$24,000/year per seat. There are 325,000+ terminals globally. Bloomberg is worth ~$80B. 💻",
  "The word 'money' comes from the Roman goddess Juno Moneta, in whose temple coins were minted. 🏛️",
  "Despite producing 40% of the world's lithium, Australia has never had a major battery manufacturer. Yet. 🔋",
  "KKR's first mega LBO was RJR Nabisco in 1989 for $31.4B — the 'Barbarians at the Gate' deal still taught in business schools. 📖",
  "Vanguard, which pioneered low-cost index investing, is technically owned by its own funds — meaning it's owned by its investors. 🔄",
  "Compound interest: $10,000 at 7% p.a. becomes $76,000 in 30 years with zero extra contributions. 🧮",
  "The average age when a Goldman Sachs banker makes Managing Director is ~38. The average MD tenure: 3–5 years before they leave for a PE fund. 👔",
  "Australia's superannuation system holds $3.5 trillion — the 4th largest pension pool in the world, in a country of 26 million people. 💰",
  "The Chicago Mercantile Exchange started in 1898 trading butter and egg futures. Finance has humble roots. 🥚",
  "Negative interest rates actually happened — the ECB, Bank of Japan, and Swiss National Bank all went below zero. Depositors literally paid banks to hold cash. 📉",
  "The NYSE was founded in 1792 under a buttonwood tree on Wall Street. The first securities traded were US government bonds and bank stocks. 🌳",
  "Short selling was blamed for the 1929 crash. It was banned temporarily after the 2008 crisis. Critics disagree on whether either ban helped. 📰",
  "Australia's Big Four banks (CBA, ANZ, NAB, Westpac) are consistently among the world's most profitable relative to their asset size. 🏦",
  "The term 'bull market' and 'bear market' likely come from the way each animal attacks — bulls thrust upward 🐂, bears swipe downward 🐻.",
];

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export default function FunFactCard() {
  const fact = FACTS[dayOfYear() % FACTS.length];

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-100 rounded-2xl px-4 py-3 flex gap-3 items-start">
        <span className="text-lg flex-shrink-0 mt-0.5">💡</span>
        <div>
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-1">Daily Fact</p>
          <p className="text-sm text-slate-700 leading-relaxed">{fact}</p>
        </div>
      </div>
    </div>
  );
}

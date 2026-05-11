"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Question {
  q: string;
  options: string[];
  correct: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  { q: "Can inflation be negative?", options: ["No, it's always positive","Yes — it's called deflation","Only in developing economies","Only during wartime"], correct: 1, explanation: "Yes! Negative inflation is deflation. Japan experienced prolonged deflation through the 1990s–2000s." },
  { q: "What is one basis point (bps) equal to?", options: ["1% (one percent)","0.1% (one tenth)","0.01% (one hundredth)","10% (ten percent)"], correct: 2, explanation: "One basis point = 0.01%. So 100 bps = 1%. Used constantly in bond markets and rate discussions." },
  { q: "EBITDA stands for Earnings Before Interest, Taxes, Depreciation and…", options: ["Distribution allowances","Dilution adjustments","Amortisation","Administration costs"], correct: 2, explanation: "EBITDA = Earnings Before Interest, Taxes, Depreciation and Amortisation. A key proxy for operating cash flow." },
  { q: "Which is typically used as the 'risk-free rate' in financial models?", options: ["The Fed Funds Rate","The S&P 500 return","The 10-year US Treasury yield","The prime rate"], correct: 2, explanation: "The 10-year US Treasury yield is the standard proxy for the risk-free rate in DCF and CAPM." },
  { q: "What does IPO stand for?", options: ["Internal Profit Overview","Initial Public Offering","Institutional Portfolio Option","Interest Payment Obligation"], correct: 1, explanation: "IPO = Initial Public Offering — when a private company first sells shares to the public." },
  { q: "When a yield curve inverts, short-term rates are…", options: ["Equal to long-term rates","Higher than long-term rates","Lower than long-term rates","Unrelated to long-term rates"], correct: 1, explanation: "Inverted yield curve (short > long) has historically preceded recessions. One of the most watched indicators." },
  { q: "What does WACC stand for?", options: ["Weighted Average Capital Cost","Weighted Average Cost of Capital","Working Asset Capital Calculation","Worldwide Accounting & Cost Control"], correct: 1, explanation: "WACC = Weighted Average Cost of Capital — the blended cost of debt and equity used as the DCF discount rate." },
  { q: "Beta > 1 in equities means…", options: ["The stock pays a high dividend","The stock is less volatile than the market","The stock is more volatile than the market","The company has high leverage"], correct: 2, explanation: "Beta measures volatility relative to the market. Beta > 1 = amplifies market moves. Beta < 1 = more defensive." },
  { q: "What is a leveraged buyout (LBO)?", options: ["A share buyback funded by retained earnings","Acquiring a company primarily using debt","Buying a distressed asset at a discount","Issuing convertible bonds to fund an acquisition"], correct: 1, explanation: "In an LBO, a PE firm acquires a company using mostly debt, with the target's assets/cash flows as collateral." },
  { q: "In M&A, 'accretive' means the deal…", options: ["Destroys shareholder value","Creates regulatory issues","Increases the acquirer's EPS","Reduces the target's debt"], correct: 2, explanation: "An accretive deal increases the acquirer's earnings per share. The opposite — decreasing EPS — is 'dilutive'." },
  { q: "The Sharpe ratio measures…", options: ["Total portfolio return","Leverage in a strategy","Risk-adjusted return (return per unit of risk)","Correlation between two assets"], correct: 2, explanation: "Sharpe = (Return − Risk-Free Rate) ÷ Std Dev. Higher = better return per unit of volatility." },
  { q: "Can interest rates be negative?", options: ["No — rates can never go below zero","Yes — the ECB and Bank of Japan have both done it","Only in theory","Only central banks can hold negative rates"], correct: 1, explanation: "Yes! The ECB and Bank of Japan implemented negative rates. Depositors pay the bank to hold cash, pushing money into the economy." },
  { q: "What does 'going short' a stock mean?", options: ["Holding shares for a short period","Borrowing and selling shares, hoping to buy back cheaper","Buying call options on a stock","Reducing a long position by 50%"], correct: 1, explanation: "Short selling: borrow shares → sell them → buy back at lower price → return shares, pocket the difference." },
  { q: "How many companies are in the Dow Jones Industrial Average?", options: ["500","100","50","30"], correct: 3, explanation: "The DJIA tracks just 30 large US companies — price-weighted, unlike the market-cap-weighted S&P 500." },
  { q: "What is quantitative easing (QE)?", options: ["Raising rates to cool inflation","A central bank buying securities to inject money into the economy","The government cutting taxes to stimulate growth","Banks lowering lending standards"], correct: 1, explanation: "QE: central bank buys bonds from the market → increases money supply → lowers long-term rates." },
  { q: "In M&A, a 'tombstone' refers to…", options: ["A failed deal","A formal announcement of a completed transaction","A hostile takeover","A poison pill defence"], correct: 1, explanation: "Tombstones are formal deal announcements (historically printed ads) — a key way banks advertise their credentials." },
  { q: "What is alpha in investing?", options: ["Total portfolio return","Risk-adjusted return","Excess return above a benchmark","Volatility of a fund"], correct: 2, explanation: "Alpha is return generated above a benchmark (e.g., the S&P 500). Consistently generating positive alpha is very hard." },
  { q: "EV stands for… (as in EV/EBITDA)", options: ["Equity Value","Expected Value","Enterprise Value","Earnings Velocity"], correct: 2, explanation: "EV = Enterprise Value = market cap + debt − cash. Includes all capital providers, unlike equity value." },
  { q: "What is a convertible bond?", options: ["A bond exchangeable for another bond at maturity","A bond paying interest in foreign currency","A bond convertible into equity shares","A floating-rate bond"], correct: 2, explanation: "Convertible bonds can be converted into a fixed number of shares — lower yield in exchange for equity upside." },
  { q: "What is mezzanine financing?", options: ["Senior secured debt","Equity issued to retail investors","Hybrid debt/equity between senior debt and equity","A short-term bridge loan"], correct: 2, explanation: "Mezz debt sits between senior debt and equity — higher risk, higher return. Very common in LBOs." },
  { q: "NPV stands for…", options: ["Net Profit Volume","Net Present Value","Nominal Price Valuation","Net Portfolio Variance"], correct: 1, explanation: "NPV = Net Present Value — sum of future cash flows discounted to today. Positive NPV = value-creating investment." },
  { q: "What is the carry trade in FX?", options: ["Buying gold as inflation hedge","Borrowing in a low-rate currency, investing in a high-rate currency","Hedging FX exposure with forwards","Speculating on central bank rate decisions"], correct: 1, explanation: "Carry trade: borrow cheaply (e.g. JPY) → invest in high-yield assets (e.g. AUD bonds). Profit = interest differential." },
  { q: "Duration in fixed income measures…", options: ["Time until a bond matures","Coupon payment frequency","Price sensitivity to interest rate changes","Credit rating of a bond"], correct: 2, explanation: "Duration = how much a bond's price changes per 1% move in yields. Higher duration = more interest rate risk." },
  { q: "What does 'mark-to-market' mean?", options: ["Pricing assets at historical cost","Valuing assets at current market price","Marking up assets for sale","A tax accounting method"], correct: 1, explanation: "MTM = valuing a position at its current market price, not the original purchase price." },
  { q: "What is a rights issue?", options: ["A company buying back shares","Letting existing shareholders buy new shares at a discount","A legal IP dispute","Preferred converting to common equity"], correct: 1, explanation: "A rights issue lets existing shareholders buy additional shares at a discount — raises equity without fully diluting holders." },
  { q: "A credit default swap (CDS) is best described as…", options: ["Fixed vs floating interest rate swap","Synthetic insurance against a borrower defaulting","A currency exposure swap","A synthetic equity position"], correct: 1, explanation: "A CDS buyer pays a premium; if the borrower defaults, the seller compensates. CDS spreads widen as credit risk rises." },
  { q: "A 'haircut' in finance refers to…", options: ["A fee charged by prime brokers","A reduction applied to an asset's value for collateral purposes","A write-down of goodwill","Distressed debt discount"], correct: 1, explanation: "Haircut = % deducted from an asset's market value for collateral. 10% haircut on $100 bonds = $90 borrowing capacity." },
  { q: "What is the Modigliani-Miller theorem about?", options: ["GDP and inflation","Capital structure irrelevance in perfect markets","Pricing options using volatility","Bank reserve requirements"], correct: 1, explanation: "MM: in perfect markets (no taxes, bankruptcy costs), a firm's value is independent of how it's financed." },
  { q: "What is a tender offer in M&A?", options: ["An offer to buy distressed debt at par","A public offer to buy shares directly from shareholders","A management buyout proposal","A bankruptcy auction bid"], correct: 1, explanation: "A tender offer is a direct public bid to shareholders at a premium — often used in hostile or unsolicited takeovers." },
  { q: "DIP financing relates to…", options: ["Discretionary Income Planning","Private placement debt","Debtor-in-Possession financing for companies in bankruptcy","Daily interest on revolving credit"], correct: 2, explanation: "DIP = Debtor-in-Possession. Senior to all existing debt, it lets bankrupt companies borrow to continue operating during restructuring." },
  { q: "In a DCF, what does 'terminal value' represent?", options: ["Value of assets being liquidated","Cash flows beyond the explicit forecast period","Cost of terminating a project early","The final dividend payment"], correct: 1, explanation: "Terminal value captures cash flows beyond your forecast horizon. It often represents 60–80% of total DCF value." },
  { q: "What is a repo agreement?", options: ["An equity repurchase programme","Short-term borrowing using securities as collateral","A bond with a repayment option","Repatriation of foreign profits"], correct: 1, explanation: "Repo: sell a security → agree to buy it back later at a higher price. Effectively short-term collateralised borrowing." },
  { q: "The Volcker Rule restricts banks from…", options: ["Using leverage above a set limit","Making speculative proprietary trading bets with their own funds","Central banks buying government bonds","Hedge funds short selling"], correct: 1, explanation: "The Volcker Rule (Dodd-Frank, 2010) prohibits banks from proprietary trading for their own profit using depositor funds." },
  { q: "Book value per share equals…", options: ["Market cap ÷ shares","(Total assets − Total liabilities) ÷ shares","Net profit ÷ shares","Revenue ÷ shares"], correct: 1, explanation: "Book value per share = net assets per share. P/B < 1 means the market values the firm below its accounting net assets." },
  { q: "If P/E is 20x and EPS is $2, the share price is…", options: ["$10","$22","$40","$200"], correct: 2, explanation: "Price = P/E × EPS = 20 × $2 = $40. Simple but a core building block of every equity valuation." },
  { q: "What does 'dry powder' mean in private equity?", options: ["Committed but undeployed capital","A distressed debt strategy","Cash in money market funds","Regulatory capital reserves"], correct: 0, explanation: "Dry powder = committed capital that hasn't been invested yet. PE funds raise it, then deploy it deal by deal." },
  { q: "What is a revolving credit facility?", options: ["A fixed loan that cannot be repaid early","A flexible credit line that can be drawn, repaid, and redrawn","A variable-rate bond","A consumer product"], correct: 1, explanation: "A revolver is like a corporate credit card — draw, repay, redraw up to a limit. Key source of corporate liquidity." },
  { q: "Equity Value vs Enterprise Value: Equity Value…", options: ["Excludes goodwill","Represents what shareholders own after net debt","Is always higher","Uses EBITDA multiples only"], correct: 1, explanation: "Equity Value = Enterprise Value − Net Debt. EV is for all capital providers; Equity Value belongs to shareholders." },
  { q: "Basel III is primarily a framework for…", options: ["International accounting standards","Global bank capital and liquidity requirements","Cross-border tax rules","Derivatives exchange regulation"], correct: 1, explanation: "Basel III (post-GFC) sets minimum capital, leverage, and liquidity standards for banks — making the system more resilient." },
  { q: "What is quantitative tightening (QT)?", options: ["Raising rates at every meeting","A central bank shrinking its balance sheet by not reinvesting maturing bonds","Reducing bank reserve requirements","Tightening commercial lending standards"], correct: 1, explanation: "QT = opposite of QE. The central bank lets bonds mature without reinvesting, shrinking money supply." },
  { q: "Why do bond prices fall when interest rates rise?", options: ["Companies become less profitable","Existing bonds pay lower coupons relative to new bonds, making them less attractive","Rating agencies downgrade bonds automatically","Central banks mandate lower bond prices"], correct: 1, explanation: "Higher rates → new bonds pay more → existing bonds look less attractive → investors sell → prices fall. Prices and yields move inversely." },
  { q: "What is covenant-lite (cov-lite) debt?", options: ["Government-guaranteed debt","Debt with fewer financial maintenance covenants","A convertible bond issued at a discount","Short-term commercial paper"], correct: 1, explanation: "Cov-lite loans have fewer protective covenants for lenders. More borrower-friendly. Now the norm in leveraged loan markets." },
  { q: "A poison pill defence…", options: ["Loads a company with debt to deter buyers","Dilutes a hostile acquirer's stake via a shareholder rights plan","Sells off key assets to reduce appeal","Issues a legal injunction blocking a merger"], correct: 1, explanation: "A poison pill lets existing shareholders (not the acquirer) buy new shares at a steep discount, diluting the hostile bidder." },
  { q: "Primary market vs secondary market: primary market is where…", options: ["Stocks trade vs bonds trade","New securities are issued to raise capital vs existing securities are traded","Retail vs institutional investors trade","Domestic vs international securities trade"], correct: 1, explanation: "Primary: companies issue new securities to raise capital (IPOs, bond deals). Secondary: investors trade existing securities." },
  { q: "What is a market maker?", options: ["A regulator who sets exchange rules","A firm that provides liquidity by quoting buy and sell prices","A hedge fund that creates new markets","An algorithm that arbitrages discrepancies"], correct: 1, explanation: "Market makers profit from the bid-ask spread by continuously quoting both sides. They provide liquidity and keep markets functioning." },
  { q: "T+2 settlement means a trade settles…", options: ["2 hours after execution","2 weeks after execution","2 business days after execution","On the 2nd of the following month"], correct: 2, explanation: "T+2 = trade date plus 2 business days. The US moved from T+3 to T+2 in 2017; many markets moved to T+1 in 2024." },
  { q: "What is a bridge loan?", options: ["Long-term infrastructure loan","Short-term financing until permanent funding is arranged","A loan backed by bridge toll revenues","A government grant"], correct: 1, explanation: "Bridge loans are short-term, high-interest, and 'bridge' a financing gap — common in M&A until bond issuance closes." },
  { q: "Can you have a negative P/E ratio?", options: ["No, P/E is always positive","Yes — when a company is loss-making (negative earnings)","Only for financial companies","Only for startups"], correct: 1, explanation: "Yes! If EPS is negative (the company is losing money), P/E is negative. Many analysts then use forward P/E or EV/Revenue instead." },
  { q: "What is a special purpose vehicle (SPV)?", options: ["An executive company car","A separate legal entity created to isolate risk for a specific transaction","A distressed debt category","A currency hedge derivative"], correct: 1, explanation: "An SPV is a bankruptcy-remote entity set up for securitisation, project finance, or M&A — isolating risk from the parent company." },
  { q: "What is arbitrage?", options: ["Speculating on future price movements","Simultaneously buying and selling the same asset in different markets to profit from a price difference","Borrowing to invest in higher-yielding assets","A strategy that profits from rising volatility"], correct: 1, explanation: "Arbitrage = riskless profit from price discrepancies. In practice, most 'arb' trades carry some risk — hence the term 'risk arbitrage'." },
];

interface QuizAnswer {
  date: string;
  question_index: number;
  selected_index: number;
  is_correct: boolean;
}

interface QuizState {
  week: string;
  streak: number;
  coffee_won: boolean;
}

function todayStr() { return new Date().toISOString().split("T")[0]; }

function getWeekKey(date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function streakEmoji(n: number) {
  if (n === 0) return "—";
  if (n === 1) return "1 ✅";
  if (n === 2) return "2 🔥";
  return `${n} 🔥🔥`;
}

export default function QuizCard() {
  const today = todayStr();
  const currentWeek = getWeekKey();
  const questionIdx = dayOfYear() % QUESTIONS.length;
  const question = QUESTIONS[questionIdx];

  const [loading, setLoading] = useState(true);
  const [todayAnswer, setTodayAnswer] = useState<QuizAnswer | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({ week: currentWeek, streak: 0, coffee_won: false });
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  async function load() {
    setLoading(true);

    // Load today's answer
    const { data: ansData } = await supabase
      .from("quiz_answers")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    // Load quiz state
    const { data: stateData } = await supabase
      .from("quiz_state")
      .select("*")
      .eq("id", "singleton")
      .maybeSingle();

    let state: QuizState = { week: currentWeek, streak: 0, coffee_won: false };

    if (stateData) {
      // Reset on new week
      if ((stateData.week as string) !== currentWeek) {
        state = { week: currentWeek, streak: 0, coffee_won: false };
        await supabase.from("quiz_state").upsert({
          id: "singleton", week: currentWeek, streak: 0, coffee_won: false, updated_at: new Date().toISOString(),
        });
      } else {
        state = {
          week: stateData.week as string,
          streak: stateData.streak as number,
          coffee_won: stateData.coffee_won as boolean,
        };
      }
    }

    setQuizState(state);

    if (ansData) {
      const a: QuizAnswer = {
        date: ansData.date as string,
        question_index: ansData.question_index as number,
        selected_index: ansData.selected_index as number,
        is_correct: ansData.is_correct as boolean,
      };
      setTodayAnswer(a);
      setSelected(a.selected_index);
      setRevealed(true);
    }

    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function handleAnswer(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);

    const isCorrect = idx === question.correct;
    const newStreak = isCorrect ? quizState.streak + 1 : 0;
    const coffeeWon = quizState.coffee_won || newStreak >= 3;

    const newState: QuizState = { week: currentWeek, streak: newStreak, coffee_won: coffeeWon };
    setQuizState(newState);

    // Save answer
    await supabase.from("quiz_answers").upsert({
      id: today,
      date: today,
      question_index: questionIdx,
      selected_index: idx,
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    }, { onConflict: "date" });

    // Save state
    await supabase.from("quiz_state").upsert({
      id: "singleton",
      week: currentWeek,
      streak: newStreak,
      coffee_won: coffeeWon,
      updated_at: new Date().toISOString(),
    });
  }

  if (loading) return <div className="card animate-pulse h-40" />;

  const answeredCorrectly = todayAnswer?.is_correct ?? (revealed && selected === question.correct);
  const answeredWrong = revealed && selected !== question.correct;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">🧠 Question of the Day</h2>
          <p className="text-xs text-slate-400 mt-0.5">3 correct in a row = ☕ free coffee</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-400">Streak</p>
          <p className="text-sm font-bold text-slate-800">{streakEmoji(quizState.streak)}</p>
        </div>
      </div>

      {/* Coffee won banner */}
      {quizState.coffee_won && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-center">
          <p className="text-lg font-bold text-amber-700">☕ Coffee earned this week!</p>
          <p className="text-xs text-amber-600 mt-0.5">You got 3 in a row — go claim it 😄</p>
        </div>
      )}

      {/* Question */}
      <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-4">
        <p className="text-sm font-semibold text-slate-800 leading-relaxed">{question.q}</p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {question.options.map((opt, i) => {
          let style = "bg-white border-slate-200 text-slate-700";
          if (revealed) {
            if (i === question.correct) style = "bg-emerald-50 border-emerald-400 text-emerald-800";
            else if (i === selected && i !== question.correct) style = "bg-red-50 border-red-400 text-red-800";
            else style = "bg-slate-50 border-slate-100 text-slate-400";
          } else if (selected === i) {
            style = "bg-blue-50 border-blue-400 text-blue-800";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all disabled:cursor-default ${style}`}
            >
              <span className="font-bold mr-2">{["A","B","C","D"][i]}.</span>
              {opt}
              {revealed && i === question.correct && " ✓"}
              {revealed && i === selected && i !== question.correct && " ✗"}
            </button>
          );
        })}
      </div>

      {/* Result + explanation */}
      {revealed && (
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${answeredCorrectly ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          <p className="font-bold mb-1">
            {answeredCorrectly ? "✅ Correct!" : "❌ Not quite —"}
          </p>
          <p>{question.explanation}</p>
          {answeredWrong && (
            <p className="mt-1 text-xs opacity-80">Streak reset to 0. Come back tomorrow! 💪</p>
          )}
          {answeredCorrectly && quizState.streak < 3 && (
            <p className="mt-1 text-xs opacity-80">
              {3 - quizState.streak} more correct answer{3 - quizState.streak !== 1 ? "s" : ""} for a coffee ☕
            </p>
          )}
        </div>
      )}
    </div>
  );
}

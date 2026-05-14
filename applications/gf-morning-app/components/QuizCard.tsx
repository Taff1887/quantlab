"use client";
import { useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "../lib/supabase";

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

  // ── Harder questions — infrastructure, energy & renewables IB focus ──
  { q: "What is a Power Purchase Agreement (PPA)?", options: ["A government subsidy for renewable energy","A long-term contract to buy electricity at a fixed price","A loan facility for power plant construction","An agreement between transmission operators"], correct: 1, explanation: "A PPA is a long-term contract between a generator and a buyer (offtaker) for electricity at a pre-agreed price. It underpins project finance debt by locking in revenue — critical for renewables." },
  { q: "What does 'capacity factor' mean for a wind or solar farm?", options: ["The percentage of installed capacity that can be financed","Actual energy produced ÷ maximum possible output if running 24/7 at full capacity","The ratio of peak to off-peak generation","The efficiency of the inverter system"], correct: 1, explanation: "Capacity factor = actual output / nameplate capacity × 100%. A solar farm might run at 25% capacity factor (sun doesn't shine 24/7). Critical for revenue modelling — same MW rating, very different output." },
  { q: "LCOE stands for Levelised Cost of Energy. It measures…", options: ["The average wholesale electricity price","Total lifetime cost of building and operating a plant ÷ total lifetime energy produced","The peak cost of electricity during demand spikes","The cost per km of transmission line"], correct: 1, explanation: "LCOE is the all-in cost per MWh over the asset's life. Used to compare solar, wind, gas, nuclear etc. on a like-for-like basis — solar LCOE has fallen ~90% since 2010." },
  { q: "In project finance, what does 'non-recourse' mean?", options: ["The borrower has no obligation to repay","Lenders can only look to the project's assets and cash flows — not the sponsor's balance sheet","The debt cannot be refinanced","There is no security over the assets"], correct: 1, explanation: "Non-recourse debt is repaid only from the project's own cash flows and secured over its assets. If the project fails, lenders can't chase the sponsor. This ring-fences risk — essential for large infra." },
  { q: "DSCR in project finance means Debt Service Coverage Ratio. A DSCR of 1.30x means…", options: ["Debt is 130% of equity","The project generates $1.30 of cash for every $1.00 of debt service (interest + principal)","IRR is 30% above the hurdle rate","The loan-to-value ratio is 1.30x"], correct: 1, explanation: "DSCR = Project Cash Flow / Debt Service. 1.30x means a 30% cash flow buffer above what's needed to service debt. Lenders set a minimum DSCR covenant — often 1.10–1.25x for renewables." },
  { q: "What is the LLCR (Loan Life Coverage Ratio)?", options: ["The ratio of loan term to asset life","NPV of project cash flows over the loan life ÷ outstanding debt — a forward-looking DSCR","The ratio of senior to subordinated debt","Annual interest cost ÷ total loan balance"], correct: 1, explanation: "LLCR = PV of cash flows available for debt service over the loan life ÷ debt outstanding. A broader view than point-in-time DSCR — lenders use it to assess whether the loan will repay over its life." },
  { q: "What is 'merchant risk' for a power generator?", options: ["The risk the EPC contractor overruns budget","Exposure to spot electricity prices rather than contracted (PPA) revenue","Risk that the grid operator disconnects the plant","Currency risk on equipment imports"], correct: 1, explanation: "Merchant risk = uncontracted price exposure. A plant selling into the spot market earns whatever the grid pays that hour. Lenders typically cap merchant exposure — pure merchant projects are harder to finance." },
  { q: "What is a 'feed-in tariff' (FiT)?", options: ["A tariff charged to feed power into the grid","A government-guaranteed price paid per unit of renewable energy fed into the grid","A tax on fossil fuel generators","A connection fee for new generators"], correct: 1, explanation: "FiT: governments pay a fixed above-market price per MWh for renewable energy. Removes merchant risk entirely — the UK and Germany built massive solar/wind industries through FiTs in the 2000s–2010s." },
  { q: "What does 'curtailment' mean for a renewable energy project?", options: ["Early repayment of the project loan","Forced reduction in output when the grid can't absorb all the power generated","A reduction in government subsidies","Shutdown for scheduled maintenance"], correct: 1, explanation: "Curtailment happens when grid constraints or oversupply mean the operator is told to reduce output. It directly cuts revenue and is a key risk in markets with high renewable penetration (e.g. South Australia)." },
  { q: "In infrastructure valuation, what is a Regulated Asset Base (RAB)?", options: ["The depreciated book value of unregulated assets","The value of assets a regulated utility is permitted to earn a return on — set by the regulator","The total debt secured over infrastructure assets","The market value of listed infrastructure stocks"], correct: 1, explanation: "The RAB is the asset base on which regulators allow utilities (water, electricity networks, airports) to earn a set rate of return. RAB × allowed WACC drives allowed revenue — core to networks valuation." },
  { q: "In infrastructure M&A, what does 'greenfield' vs 'brownfield' mean?", options: ["Environmental rating of the project","Greenfield = building from scratch; Brownfield = acquiring/investing in an existing operating asset","Greenfield = onshore; Brownfield = offshore","The age of the asset (under/over 10 years)"], correct: 1, explanation: "Greenfield carries construction and ramp-up risk but higher returns. Brownfield has a track record, contracted revenues, and lower risk — trades at tighter returns. Most infra funds target brownfield." },
  { q: "An EPC contract in infrastructure stands for…", options: ["Equity, Principal, and Capital contract","Engineering, Procurement and Construction contract","Environmental Protection and Compliance agreement","Estimated Project Cost submission"], correct: 1, explanation: "An EPC (turnkey) contract means one contractor takes full responsibility for design, procurement and construction at a fixed price and timeline — transferring construction risk away from the project/lenders." },
  { q: "What is 'debt sculpting' in project finance?", options: ["Gradually increasing the loan size over time","Structuring debt repayments to match the project's expected cash flow profile","Cutting debt levels to reduce DSCR","A method of refinancing at lower rates"], correct: 1, explanation: "Sculpted debt repayments rise and fall with projected cash flows — higher repayments in strong years, lower in lean ones. This maintains a target DSCR throughout the loan life." },
  { q: "What is the difference between IRR and NPV in project finance?", options: ["IRR uses cash flows; NPV uses accounting profit","IRR is the discount rate that makes NPV zero; NPV is the absolute dollar value added at a given discount rate","NPV gives a percentage return; IRR gives a dollar amount","They always agree on whether to proceed with a project"], correct: 1, explanation: "NPV tells you the dollar value created. IRR tells you the return rate. They can conflict: a project with lower IRR may have higher NPV if it's larger scale. Infra funds typically quote equity IRR as the headline metric." },
  { q: "In renewable energy, what is 'P50' vs 'P90' generation?", options: ["50th and 90th percentile of electricity price forecasts","P50 = median expected output (50% chance of exceeding); P90 = conservative output (90% chance of exceeding)","The percentage of capacity online at peak vs off-peak","Two different turbine efficiency ratings"], correct: 1, explanation: "P50 is the central case; P90 is conservative — only 10% chance of doing worse. Banks often size debt to P90 to ensure DSCR holds even in a bad wind/solar year. Equity is underwritten to P50." },
  { q: "What is an 'offtake agreement' in project finance?", options: ["A contract for the project to purchase fuel or inputs","A long-term contract for a buyer to purchase the project's output (power, gas, water, etc.)","An agreement to sell the project after construction","A government guarantee on project debt"], correct: 1, explanation: "An offtake agreement commits a creditworthy buyer to purchase the project's output — de-risking revenue. In renewables, PPAs are the offtake. In LNG, long-term supply contracts serve the same role." },
  { q: "In infrastructure, 'availability-based' revenue means the project earns…", options: ["Revenue only when demand is highest","A fixed payment as long as the asset is available and operational — regardless of usage","Revenue linked to commodity prices","Variable payments based on passenger or traffic volumes"], correct: 1, explanation: "Availability-based revenue (e.g. hospitals, prisons, some roads) removes volume risk — you're paid for being ready. Much lower risk than demand/volume-based concessions (e.g. toll roads). Lenders love it." },
  { q: "What is 'gearing' in the context of an infrastructure project?", options: ["The operational efficiency ratio","The proportion of debt vs total project capital (debt ÷ total capital)","The speed at which construction ramps up","The ratio of revenues to operating costs"], correct: 1, explanation: "Gearing (leverage) = Debt / (Debt + Equity). Renewables projects typically gear at 70–80% — high, because contracted revenues and low operating costs make debt safe. Equity gets amplified returns." },
  { q: "Why do infrastructure assets typically trade at low equity return requirements vs other sectors?", options: ["They have higher growth potential","Their long-term contracted/regulated cash flows are predictable and low-risk — investors accept lower returns for stability","Infrastructure has no debt so is inherently less risky","Government ownership means zero default risk"], correct: 1, explanation: "Infra's predictable, inflation-linked, long-term cash flows attract pension funds and insurance companies who need stable returns — they bid up prices, compressing yields. Core infra equity targets 7–10% IRR vs 20%+ for PE." },
  { q: "What does it mean when an infrastructure fund says its assets are 'inflation-linked'?", options: ["The assets are priced in CPI-indexed bonds","Revenue or tariffs contractually increase with inflation (CPI) — protecting real returns","The assets are denominated in multiple currencies","Interest costs float with inflation"], correct: 1, explanation: "Many infra contracts (PPAs, concessions, regulated tariffs) include CPI escalation clauses. This naturally hedges inflation — as costs rise, revenue rises too. Key reason pension funds love infra." },
  { q: "In a project finance waterfall, which gets paid LAST?", options: ["Senior debt interest","Operating costs","Equity distributions to sponsors","Debt service reserve top-up"], correct: 2, explanation: "The waterfall: operating costs → senior debt service → reserve accounts → any subordinated debt → only then equity distributions. Equity bears first loss and last cash — compensated with higher returns." },
  { q: "What is a 'debt service reserve account' (DSRA) in project finance?", options: ["An account lenders use to hold collateral","A cash reserve (typically 6 months of debt service) held by the project to cover payments if cash flows dip","A fund for major maintenance capex","A reserve for cost overruns during construction"], correct: 1, explanation: "A DSRA (usually 6 months of interest + principal) protects lenders if short-term cash flow dips. It must be topped up before equity distributions. It's standard in all project finance structures." },
  { q: "What is the main reason solar and wind projects use high leverage (70–80% debt)?", options: ["Sponsors don't have enough equity capital","Revenue is long-term contracted with creditworthy offtakers, making cash flows highly predictable and debt safe","Tax rules require high gearing","Equity is unavailable for renewables projects"], correct: 1, explanation: "Long-term PPAs with investment-grade counterparties create bond-like, predictable cash flows. Banks are comfortable lending at 70–80% LTV because default risk is low. High leverage amplifies equity IRR." },
  { q: "In M&A, what is 'working capital' and why does it matter at deal close?", options: ["Cash set aside for working hours costs","Current assets minus current liabilities — buyers and sellers negotiate a 'normal' level; deviations adjust the purchase price","The capital the target spends on employees","Total revenue in the first month post-close"], correct: 1, explanation: "Working capital (CA − CL) represents the cash tied up in day-to-day operations. SPA purchase price adjustments mean if WC is above/below target at close, the price adjusts dollar-for-dollar. Often a key negotiation point." },
  { q: "What is a 'stapled finance' arrangement in M&A?", options: ["A forced merger of two companies by a regulator","Financing arranged by the sell-side bank that is offered to all bidders — 'stapled' to the deal","A bridge loan that converts to permanent debt at close","A form of vendor finance where the seller lends the buyer money"], correct: 1, explanation: "Stapled finance: the sell-side adviser arranges debt financing and offers it to all bidders. It speeds up bids and signals achievable leverage — but raises conflict-of-interest questions as the bank advises both sides." },
  { q: "What is a 'tuck-in' acquisition?", options: ["A hostile takeover by a smaller company","A small bolt-on acquisition integrated into an existing platform business","Buying a company and delisting it immediately","An acquisition funded entirely by equity"], correct: 1, explanation: "Tuck-ins are small, strategic bolt-ons that fold into an existing portfolio company. Very common in PE buy-and-build strategies — e.g. an infra platform buying adjacent assets in the same geography." },
  { q: "What is 'equity bridge financing' in infrastructure?", options: ["A loan to fund the gap between equity tranches being called","Short-term debt that bridges the equity contribution until long-term finance is arranged — often used at financial close","A grant from government to support project equity","Mezzanine debt ranked between senior and equity"], correct: 1, explanation: "Equity bridge loans let sponsors defer calling equity from their fund (saving management fees), using cheap short-term debt instead. Repaid when equity is eventually drawn. Common in infra and renewables." },
  { q: "In the context of renewable energy, what is 'basis risk' for a PPA?", options: ["The risk that the PPA counterparty defaults","The difference between the price at the project's delivery point and the broader market reference price in the PPA","Construction cost overruns above the base case","Interest rate risk on the project debt"], correct: 1, explanation: "Basis risk arises when the PPA references a hub price (e.g. NEM average) but the project's actual settlement is at a different node — due to congestion or distance. Can significantly erode revenue vs expectations." },
  { q: "What is a 'concession agreement' in infrastructure?", options: ["A government grant that doesn't need repaying","A contract granting a private company the right to develop, operate, and collect revenues from a public asset for a fixed term","A penalty clause in an EPC contract","A tax concession given to infrastructure investors"], correct: 1, explanation: "A concession grants a private operator the right to use public infrastructure (toll road, airport, port) and collect user fees for a set period (often 25–99 years). At end of term, it reverts to government." },
];

interface QuizAnswer {
  date: string;
  question_index: number;
  selected_index: number;
  is_correct: boolean;
}

interface QuizState {
  streak: number;        // rolling total — resets only on wrong answer
  recordStreak: number;  // highest streak ever
  coffee_won: boolean;   // just hit a coffee milestone (streak % 3 === 0)
  migrated?: boolean;    // one-time +1 streak correction flag
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_ANSWERS_KEY = "quiz_answers_local";
const LS_STATE_KEY   = "quiz_state_local";

function lsLoadAnswer(date: string): QuizAnswer | null {
  try {
    const raw = localStorage.getItem(LS_ANSWERS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, QuizAnswer>;
    return map[date] ?? null;
  } catch { return null; }
}

function lsSaveAnswer(answer: QuizAnswer) {
  try {
    const raw = localStorage.getItem(LS_ANSWERS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, QuizAnswer>) : {};
    map[answer.date] = answer;
    localStorage.setItem(LS_ANSWERS_KEY, JSON.stringify(map));
  } catch {}
}

function lsLoadState(): QuizState | null {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuizState;
  } catch { return null; }
}

function lsSaveState(state: QuizState) {
  try { localStorage.setItem(LS_STATE_KEY, JSON.stringify(state)); } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sydney-local date string YYYY-MM-DD — prevents UTC midnight issues */
function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

/** Day-of-year index using Sydney local date */
function dayOfYear() {
  const syd = new Date().toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit",
  }); // returns "DD/MM/YYYY"
  const [d, m, y] = syd.split("/").map(Number);
  const now   = new Date(y, m - 1, d);
  const start = new Date(y, 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

function streakLabel(n: number) {
  if (n === 0) return "—";
  if (n === 1) return "1 ✅";
  if (n <= 3) return `${n} 🔥`;
  return `${n} 🔥🔥`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuizCard() {
  const today      = todayStr();
  const questionIdx = dayOfYear() % QUESTIONS.length;
  const question   = QUESTIONS[questionIdx];

  const [loading, setLoading] = useState(true);
  const [todayAnswer, setTodayAnswer] = useState<QuizAnswer | null>(null);
  const [quizState, setQuizState] = useState<QuizState>({ streak: 0, recordStreak: 0, coffee_won: false });
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loadedDate, setLoadedDate] = useState(today);

  async function load() {
    setLoading(true);
    const currentToday = todayStr();
    setLoadedDate(currentToday);

    // ── Load today's answer ──────────────────────────────────────────────────
    let answerFromDb: QuizAnswer | null = null;

    if (SUPABASE_ENABLED) {
      try {
        const { data: ansData, error } = await supabase
          .from("quiz_answers")
          .select("*")
          .eq("date", currentToday)
          .maybeSingle();
        if (!error && ansData) {
          answerFromDb = {
            date:           ansData.date as string,
            question_index: ansData.question_index as number,
            selected_index: ansData.selected_index as number,
            is_correct:     ansData.is_correct as boolean,
          };
          lsSaveAnswer(answerFromDb);
        }
      } catch { /* fall through to localStorage */ }
    }
    if (!answerFromDb) answerFromDb = lsLoadAnswer(currentToday);

    // ── Load quiz state ──────────────────────────────────────────────────────
    let state: QuizState = { streak: 0, recordStreak: 0, coffee_won: false };

    if (SUPABASE_ENABLED) {
      try {
        const { data: sd, error } = await supabase
          .from("quiz_state")
          .select("*")
          .eq("id", "singleton")
          .maybeSingle();
        if (!error && sd) {
          state = {
            streak:       (sd.streak as number) ?? 0,
            recordStreak: (sd.record_streak as number | null) ?? 0,
            coffee_won:   (sd.coffee_won as boolean) ?? false,
            migrated:     (sd.migrated as boolean | null) ?? false,
          };
          lsSaveState(state);
        }
      } catch { /* fall through */ }
    }

    // localStorage fallback
    if (state.streak === 0 && !state.coffee_won) {
      const ls = lsLoadState();
      if (ls) state = ls;
    }

    // One-time +1 streak correction
    if (!state.migrated) {
      state.streak = Math.max(0, (state.streak ?? 0) + 1);
      state.recordStreak = Math.max(state.recordStreak ?? 0, state.streak);
      state.migrated = true;
      lsSaveState(state);
      if (SUPABASE_ENABLED) {
        supabase.from("quiz_state").upsert({
          id: "singleton", streak: state.streak, record_streak: state.recordStreak,
          coffee_won: state.coffee_won, migrated: true,
          updated_at: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    setQuizState(state);

    if (answerFromDb) {
      setTodayAnswer(answerFromDb);
      setSelected(answerFromDb.selected_index);
      setRevealed(true);
    }

    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Day-change detection — refresh when Sydney date rolls over
  useEffect(() => {
    const id = setInterval(() => {
      const newDay = todayStr();
      if (newDay !== loadedDate) {
        // New day: reset revealed state and reload
        setRevealed(false);
        setSelected(null);
        setTodayAnswer(null);
        load();
      }
    }, 60_000); // check every minute
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedDate]);

  async function handleAnswer(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);

    const isCorrect  = idx === question.correct;
    const newStreak  = isCorrect ? quizState.streak + 1 : 0;
    const newRecord  = Math.max(quizState.recordStreak, newStreak);
    // Coffee milestone: hit a multiple of 3 AND we just got one correct
    const coffeeWon  = isCorrect && newStreak > 0 && newStreak % 3 === 0;

    const newState: QuizState = {
      streak: newStreak, recordStreak: newRecord,
      coffee_won: coffeeWon, migrated: true,
    };
    setQuizState(newState);

    const answer: QuizAnswer = {
      date: today, question_index: questionIdx,
      selected_index: idx, is_correct: isCorrect,
    };
    setTodayAnswer(answer);

    lsSaveAnswer(answer);
    lsSaveState(newState);

    if (SUPABASE_ENABLED) {
      try {
        await supabase.from("quiz_answers").upsert({
          id: today, date: today, question_index: questionIdx,
          selected_index: idx, is_correct: isCorrect,
          created_at: new Date().toISOString(),
        }, { onConflict: "date" });

        await supabase.from("quiz_state").upsert({
          id: "singleton", streak: newStreak, record_streak: newRecord,
          coffee_won: coffeeWon, migrated: true,
          updated_at: new Date().toISOString(),
        });
      } catch { /* silent — localStorage already saved */ }
    }
  }

  if (loading) return <div className="card animate-pulse h-40" />;

  const answeredCorrectly = todayAnswer?.is_correct ?? (revealed && selected === question.correct);
  const answeredWrong = revealed && selected !== question.correct;

  // Current cycle position: X / 3 towards next coffee
  const cyclePos    = quizState.streak % 3;
  const toNextCoffee = cyclePos === 0 ? 3 : 3 - cyclePos;

  return (
    <div className="card">
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 -mx-5 -mt-5 px-5 pt-4 pb-3 mb-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧠</span>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">Question of the Day</p>
              <p className="text-xs text-sky-100">3 in a row = ☕ · {toNextCoffee} to go</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-white/60">Streak · Record</p>
            <p className="text-sm font-bold text-white">
              {streakLabel(quizState.streak)} · {quizState.recordStreak}🏆
            </p>
          </div>
        </div>
      </div>

      {/* Coffee won banner */}
      {quizState.coffee_won && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 text-center">
          <p className="text-lg font-bold text-amber-700">☕ Coffee earned!</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {quizState.streak} in a row — go claim it 😄
          </p>
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
          {answeredCorrectly && !quizState.coffee_won && (
            <p className="mt-1 text-xs opacity-80">
              {toNextCoffee} more correct answer{toNextCoffee !== 1 ? "s" : ""} for a coffee ☕
            </p>
          )}
        </div>
      )}
    </div>
  );
}

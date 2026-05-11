"use client";
import { useState } from "react";

interface ExcelFn {
  name: string;
  syntax: string;
  description: string;
  example: string;
  tip: string;
}

const FUNCTIONS: ExcelFn[] = [
  {
    name: "XLOOKUP",
    syntax: "=XLOOKUP(lookup_value, lookup_array, return_array, [not_found], [match_mode])",
    description: "The modern replacement for VLOOKUP. Searches a range and returns a value from another range — left-to-right OR right-to-left.",
    example: "=XLOOKUP(A2, CompanyNames, Revenue)\n→ returns Revenue for the company named in A2",
    tip: "Unlike VLOOKUP, XLOOKUP can look left, handles #N/A gracefully with a fallback, and doesn't need a column index number. Learn this, forget VLOOKUP.",
  },
  {
    name: "SUMIFS",
    syntax: "=SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2]...)",
    description: "Sums values meeting multiple conditions. The IB analyst's bread and butter for slicing financial data.",
    example: '=SUMIFS(Revenue, Region, "APAC", Year, 2024)\n→ total APAC revenue in 2024',
    tip: 'The sum_range comes FIRST — unlike COUNTIFS, this trips people up. Use wildcards: "*Tech*" for partial text matches.',
  },
  {
    name: "INDEX / MATCH",
    syntax: "=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))",
    description: "The power combo. INDEX returns a value by position; MATCH finds the position. Together, they outperform VLOOKUP in every way.",
    example: '=INDEX(B:B, MATCH("Goldman Sachs", A:A, 0))\n→ finds Goldman\'s row and returns column B',
    tip: "The '0' in MATCH = exact match. Use when your lookup column isn't the leftmost column — which is most of the time.",
  },
  {
    name: "IFERROR",
    syntax: "=IFERROR(value, value_if_error)",
    description: "Traps errors (#N/A, #DIV/0!, #REF! etc.) and replaces them with a fallback. Essential for clean financial models.",
    example: '=IFERROR(VLOOKUP(A2, Table, 2, 0), "—")\n→ shows "—" instead of ugly #N/A',
    tip: 'Use =IFERROR(formula, "") for blank, or =IFERROR(formula, 0) for numeric calculations. Wrapping every lookup in IFERROR is good practice.',
  },
  {
    name: "NPV",
    syntax: "=NPV(rate, value1, [value2]...)",
    description: "Net Present Value of future cash flows discounted at a given rate. Core DCF building block.",
    example: "=NPV(0.10, C5:C10)\n→ PV of year 1–6 cash flows at 10% (excludes year 0)",
    tip: "⚠️ Excel's NPV starts discounting from period 1. Add Year 0 investment OUTSIDE: =C4 + NPV(rate, C5:C10). Forgetting this is a classic error.",
  },
  {
    name: "XIRR",
    syntax: "=XIRR(values, dates, [guess])",
    description: "IRR for irregular cash flow dates — more realistic than IRR for actual deals where cash flows don't fall neatly at year-end.",
    example: "=XIRR(B4:B9, C4:C9)\n→ where B = cash flows and C = actual transaction dates",
    tip: "Always use XIRR over IRR in real models. If it returns an error, seed the iteration: =XIRR(values, dates, 0.2) starts from 20%.",
  },
  {
    name: "CHOOSE",
    syntax: "=CHOOSE(index_num, value1, value2, value3...)",
    description: "Returns one value from a list based on an index number. Classic for scenario toggles in financial models.",
    example: "=CHOOSE(ScenarioCell, BaseRevenue, BullRevenue, BearRevenue)\n→ switches between Base/Bull/Bear based on a dropdown",
    tip: "Combine with a data-validation dropdown (1/2/3). Far cleaner than nested IFs for 3+ scenarios. Widely used in LBO and DCF models.",
  },
  {
    name: "FILTER",
    syntax: "=FILTER(array, include, [if_empty])",
    description: "Dynamically filters a range based on conditions — a game-changer for dashboards without pivot tables.",
    example: '=FILTER(A2:C100, B2:B100="APAC")\n→ returns all rows where Region = APAC',
    tip: 'Chain conditions with * (AND) or + (OR):\n=FILTER(data, (Region="APAC")*(Year=2024))',
  },
  {
    name: "UNIQUE",
    syntax: "=UNIQUE(array, [by_col], [exactly_once])",
    description: "Returns deduplicated values from a range. Game-changer for dynamic dropdown lists.",
    example: "=SORT(UNIQUE(A2:A100))\n→ clean sorted list of all unique company names",
    tip: "Use as the source for a data-validation dropdown — it auto-updates as data grows. No more manually managing dropdown lists.",
  },
  {
    name: "LET",
    syntax: "=LET(name1, value1, [name2, value2...], calculation)",
    description: "Assigns names to intermediate values within a formula. Makes complex formulas readable and faster (each sub-expression computed once).",
    example: '=LET(\n  rev, SUM(B:B),\n  costs, SUM(C:C),\n  (rev - costs) / rev\n)\n→ clean EBITDA margin formula',
    tip: "If you reference the same sub-formula twice, wrap it in LET. Replaces the need for helper columns in complex single-cell formulas.",
  },
  {
    name: "EOMONTH",
    syntax: "=EOMONTH(start_date, months)",
    description: "Returns the last day of a month offset by N months. Used in models for period-end dates and interest accruals.",
    example: "=EOMONTH(TODAY(), 0) → last day of current month\n=EOMONTH(A1, 3) → last day, 3 months from A1",
    tip: "=EOMONTH(date, -1)+1 gives you the FIRST day of the current month. Great for building dynamic quarterly/monthly model headers.",
  },
  {
    name: "TEXT",
    syntax: '=TEXT(value, "format_string")',
    description: "Converts a number or date to formatted text. Essential for readable dashboard labels and concatenated strings.",
    example: '=TEXT(1234567, "$#,##0.0M") → "$1.2M"\n=TEXT(TODAY(), "dddd d MMMM") → "Monday 11 May"',
    tip: 'Common formats: "0.0%" for percentages, "#,##0" for thousands, "$#,##0.0M" for millions. Heads up: TEXT results are strings — keep the raw number for calculations.',
  },
  {
    name: "SUMPRODUCT",
    syntax: "=SUMPRODUCT(array1, [array2]...)",
    description: "Multiplies corresponding array elements and sums the result. Before SUMIFS existed, this was the go-to for multi-criteria aggregation.",
    example: '=SUMPRODUCT((Region="APAC") * (Year=2024) * Revenue)\n→ APAC 2024 revenue without helper columns',
    tip: "Still useful for weighted averages: =SUMPRODUCT(weights, values) / SUM(weights). More flexible than SUMIFS for complex criteria.",
  },
  {
    name: "PMT",
    syntax: "=PMT(rate, nper, pv, [fv], [type])",
    description: "Calculates the periodic payment for a loan. Core for debt schedule modelling and LBO analysis.",
    example: "=PMT(5%/12, 60, -500000)\n→ monthly repayment on a $500k loan at 5% p.a. over 5 years",
    tip: "PMT returns a negative number (cash outflow). Negate it: =-PMT(rate, nper, pv). Always use consistent periods — if rate is annual, nper must be in years.",
  },
  {
    name: "OFFSET",
    syntax: "=OFFSET(reference, rows, cols, [height], [width])",
    description: "Returns a reference offset from a starting cell. Powerful for dynamic ranges and rolling windows.",
    example: "=OFFSET(A1, 2, 3) → cell D3\n=SUM(OFFSET(B1, 0, 0, 1, 12)) → sum the next 12 columns from B1",
    tip: "⚠️ OFFSET is volatile — it recalculates every time anything in the workbook changes, which slows large models. INDEX can often replace it more efficiently.",
  },
  {
    name: "SEQUENCE",
    syntax: "=SEQUENCE(rows, [cols], [start], [step])",
    description: "Generates a sequence of numbers. Perfect for dynamic year/period headers in financial models.",
    example: "=SEQUENCE(1, 5, 2024, 1) → {2024, 2025, 2026, 2027, 2028}\n=DATE(SEQUENCE(1,5,2024), 12, 31) → 5 year-end dates",
    tip: "Combine with DATE or EDATE for dynamic calendar headers. No more manually typing years across columns — change the start year in one cell.",
  },
  {
    name: "LAMBDA",
    syntax: "=LAMBDA(param1, ..., formula) — defined in Name Manager",
    description: "Create your own reusable functions in Excel without VBA. Define once, use anywhere in the workbook.",
    example: 'Name: EBITDA_MARGIN\n=LAMBDA(ebitda, revenue, ebitda/revenue)\n\nUsage: =EBITDA_MARGIN(B5, C5)',
    tip: "Define in Formulas → Name Manager. Once saved, it works exactly like a built-in function. Perfect for standardising repeated complex formulas across a team's models.",
  },
  {
    name: "NETWORKDAYS / WORKDAY",
    syntax: "=NETWORKDAYS(start, end, [holidays])\n=WORKDAY(start, days, [holidays])",
    description: "NETWORKDAYS counts business days between dates. WORKDAY finds the date N business days from a start date.",
    example: "=NETWORKDAYS(SigningDate, ClosingDate)\n→ business days to close\n=WORKDAY(TradeDate, 2, holidays)\n→ T+2 settlement date",
    tip: "Always pass a holiday range as the third argument for accurate settlement calculations. NETWORKDAYS.INTL lets you customise the weekend definition (useful for Middle East markets).",
  },
  {
    name: "GETPIVOTDATA",
    syntax: "=GETPIVOTDATA(data_field, pivot_table, [field1, item1]...)",
    description: "Extracts specific data from a pivot table dynamically — more robust than cell references that break when a pivot refreshes.",
    example: '=GETPIVOTDATA("Revenue", A3, "Region", "APAC", "Year", 2024)',
    tip: "Excel auto-generates GETPIVOTDATA when you click inside a pivot from outside. To disable and use regular references: PivotTable Options → uncheck 'Generate GetPivotData'.",
  },
  {
    name: "Power Query (Get & Transform)",
    syntax: "Data → Get Data → From Table/Range or From File",
    description: "Not a formula — Excel's built-in ETL tool. Automates data cleaning, combining, and reshaping that would otherwise take hours manually.",
    example: "Load 12 monthly CSVs → combine → remove blanks → unpivot → load to model. Refreshes in one click when new data arrives.",
    tip: "Learn 'Merge Queries' (like a SQL JOIN) and 'Unpivot Columns' first — these two alone will save you hours a week. Every analyst should know Power Query basics.",
  },
];

function getWeekNumber(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export default function ExcelFunctionCard() {
  const [showExample, setShowExample] = useState(false);
  const fn = FUNCTIONS[getWeekNumber() % FUNCTIONS.length];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="section-title">📊 Excel Function of the Week</h2>
          <p className="text-xs text-slate-400 mt-0.5">Resets every Monday</p>
        </div>
        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">
          New week
        </span>
      </div>

      {/* Function name */}
      <div className="bg-slate-800 rounded-2xl px-4 py-3 mb-3">
        <p className="text-xs text-slate-400 mb-1 font-mono">Excel</p>
        <p className="text-xl font-bold text-white font-mono">{fn.name}</p>
        <p className="text-xs text-emerald-400 font-mono mt-1 leading-relaxed break-all">{fn.syntax}</p>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-700 leading-relaxed mb-3">{fn.description}</p>

      {/* Example toggle */}
      <button
        onClick={() => setShowExample((v) => !v)}
        className="text-xs font-semibold text-blue-600 mb-2"
      >
        {showExample ? "▲ Hide example" : "▼ Show example"}
      </button>

      {showExample && (
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-xs text-slate-400 font-semibold mb-1">Example</p>
          <p className="text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">{fn.example}</p>
        </div>
      )}

      {/* Pro tip */}
      <div className="flex gap-2 bg-amber-50 rounded-xl px-3 py-2.5">
        <span className="text-sm flex-shrink-0">💡</span>
        <p className="text-xs text-amber-800 leading-relaxed">{fn.tip}</p>
      </div>
    </div>
  );
}

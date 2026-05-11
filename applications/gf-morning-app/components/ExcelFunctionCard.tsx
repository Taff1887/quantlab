"use client";
import { useState } from "react";

interface ExcelFn {
  name: string;
  syntax: string;
  description: string;
  example: string;
  tip: string;
  level: "advanced" | "expert";
}

// Index 0 = week 20 of 2026 (20 % 20 = 0). Put the most advanced/obscure first.
const FUNCTIONS: ExcelFn[] = [
  {
    name: "BYROW / BYCOL",
    syntax: "=BYROW(array, LAMBDA(row, formula))\n=BYCOL(array, LAMBDA(col, formula))",
    description: "Apply a LAMBDA to every row (or column) of an array, returning one result per row/column. The cleanest way to eliminate per-row helper columns from your models.",
    example: "=BYROW(A2:D10, LAMBDA(r, MAX(r)))\n→ max of each of the 9 rows, returned as a single column\n\n=BYCOL(A2:D10, LAMBDA(c, AVERAGE(c)))\n→ average of each column, returned as a single row\n\n=BYROW(Revenue, LAMBDA(r, SUM(r)/COUNTA(r)))\n→ average revenue per non-blank period, for every company",
    tip: "BYROW/BYCOL are the replacement for 'drag down 500 rows' patterns. Combine with FILTER inside the LAMBDA for conditional per-row aggregation. Only available in Excel 365.",
    level: "expert",
  },
  {
    name: "MAKEARRAY",
    syntax: "=MAKEARRAY(rows, cols, LAMBDA(row, col, formula))",
    description: "Generate a 2D array of any size, where each cell value is computed by a LAMBDA. Build dynamic output tables without typing a single value.",
    example: "=MAKEARRAY(5, 4, LAMBDA(r,c, r*c))\n→ 5×4 multiplication table\n\n=MAKEARRAY(10, 12, LAMBDA(y, m,\n  IF(DATE(2024+y-1,m,1)>TODAY(),\"\",\n  SUMIFS(Revenue,Year,2024+y-1,Month,m))))\n→ 10-year × 12-month revenue grid, auto-updating",
    tip: "MAKEARRAY is SEQUENCE on steroids — it can produce any 2D structure based on row/column coordinates. Use it to build dynamic output tables, sensitivity analyses, or calendarised schedules.",
    level: "expert",
  },
  {
    name: "SCAN",
    syntax: "=SCAN(initial_value, array, LAMBDA(acc, value, formula))",
    description: "Like REDUCE but returns ALL intermediate accumulated values, not just the final result. Perfect for running totals, cumulative sums, and YTD calculations without helper columns.",
    example: "=SCAN(0, Monthly_Revenue, LAMBDA(acc, val, acc+val))\n→ running cumulative revenue for the year\n\n=SCAN(100, Returns, LAMBDA(acc, r, acc*(1+r)))\n→ growth of $100 invested, updated each period — a NAV index in one formula",
    tip: "SCAN is essentially REDUCE with memory. Pair it with BYROW/BYCOL for multi-dimensional running totals. SCAN(0, A:A, LAMBDA(a,v, a+v)) replaces every cumulative sum column in your model.",
    level: "expert",
  },
  {
    name: "REDUCE",
    syntax: "=REDUCE(initial_value, array, LAMBDA(acc, value, formula))",
    description: "Iterate over an array, accumulating a result. Returns only the final accumulated value. Think of it as a fold/aggregate operation over any range.",
    example: "=REDUCE(1, A2:A10, LAMBDA(acc, val, acc*val))\n→ product of all values (like PRODUCT() but customisable)\n\n=REDUCE(\"\", Names, LAMBDA(acc, n,\n  IF(acc=\"\", n, acc&\", \"&n)))\n→ concatenates all names with \", \" separator — no helper column",
    tip: "REDUCE is the power tool when SUMPRODUCT/SUMIFS can't express your logic. It's the right choice when each element needs to depend on the previous accumulated result.",
    level: "expert",
  },
  {
    name: "MAP",
    syntax: "=MAP(array1, [array2,...], LAMBDA(value1, [value2,...], formula))",
    description: "Apply a LAMBDA to each corresponding element across one or more arrays, returning an array of the same shape. Like a vectorised IF/calculation across multiple ranges simultaneously.",
    example: "=MAP(Revenue, Costs, LAMBDA(r, c, (r-c)/r))\n→ margin for every cell pair — no helper column needed\n\n=MAP(Prices, Quantities, LAMBDA(p,q,\n  IF(q=0, \"—\", p*q)))\n→ element-wise multiplication with a zero-guard",
    tip: "MAP replaces 'drag across multiple ranges' patterns. Pass up to 253 arrays — each element from each array is passed to the LAMBDA. This is your dynamic VLOOKUP-equivalent for computed columns.",
    level: "expert",
  },
  {
    name: "LAMBDA (Advanced patterns)",
    syntax: "=LAMBDA(param1, ..., formula) — named in the Name Manager",
    description: "Beyond the basics: recursive LAMBDA for factorial/Fibonacci, self-referencing named LAMBDAs, and composing LAMBDAs inside BYROW/MAP for complex pipelines.",
    example: "Recursive factorial:\nName: FACT_R\n=LAMBDA(n, IF(n<=1, 1, n*FACT_R(n-1)))\nUsage: =FACT_R(10) → 3628800\n\nComposed pipeline:\n=BYROW(Data, LAMBDA(r, MY_MARGIN(r)))\nwhere MY_MARGIN is itself a LAMBDA — clean, reusable, readable",
    tip: "Recursive LAMBDAs: name the LAMBDA in the Name Manager, then reference its own name inside the formula body. Excel handles the recursion up to a depth limit. This is as close to writing a real function as Excel gets.",
    level: "expert",
  },
  {
    name: "LET",
    syntax: "=LET(name1, value1, [name2, value2,...], calculation)",
    description: "Assign named variables within a formula — each sub-expression is computed once. Makes complex formulas readable and eliminates redundant calculation.",
    example: "=LET(\n  rev,  SUMIF(Region, \"APAC\", Revenue),\n  cost, SUMIF(Region, \"APAC\", Costs),\n  margin, (rev-cost)/rev,\n  IF(margin>0.3, \"✓ Target\", \"✗ Below\")\n)\n→ clean, fast, human-readable — no helper cells",
    tip: "If your formula references the same sub-expression more than once, LET makes it calculate once and reuse everywhere. It also means you can name intermediate results meaningfully — future you will thank present you.",
    level: "advanced",
  },
  {
    name: "FILTER (advanced)",
    syntax: "=FILTER(array, include, [if_empty])",
    description: "Beyond basic filtering: chain FILTER inside SORT, UNIQUE, BYROW, or other dynamic functions. Use arithmetic on boolean arrays for complex multi-condition filters.",
    example: "Complex AND + OR logic:\n=FILTER(Data,\n  ((Sector=\"Tech\")+(Sector=\"Finance\")) *\n  (Revenue>1e6) *\n  (Year=2024))\n→ Tech OR Finance, AND revenue >$1M, AND 2024 only\n\n=SORT(FILTER(Deals, Closed=TRUE), 3, -1)\n→ closed deals sorted by column 3 descending",
    tip: "* = AND logic (all must be TRUE=1). + = OR logic (at least one TRUE=1). ISNUMBER(SEARCH()) inside FILTER gives you partial text match filtering — an Excel-native fuzzy search.",
    level: "advanced",
  },
  {
    name: "XLOOKUP (advanced)",
    syntax: "=XLOOKUP(lookup, lookup_array, return_array, [not_found], [match_mode], [search_mode])",
    description: "Beyond basic usage: binary search for huge datasets, wildcard matching, approximate match with the nearest value, and reverse search to find the last match.",
    example: "Reverse search (last occurrence):\n=XLOOKUP(\"APAC\", Region, Deal, , 0, -1)\n\nNearest match (no exact needed):\n=XLOOKUP(Target_Rate, Rate_Table, Premium_Table, , 1)\n→ finds closest rate ≥ target\n\nWildcard:\n=XLOOKUP(\"*Goldman*\", Company, Revenue, \"Not found\", 2)",
    tip: "search_mode = -1 scans from the last row upward — finds the most recent entry (e.g., latest price for a security) without sorting. match_mode = 1 or -1 gives 'next largest/smallest' — perfect for rate tables and tiered pricing.",
    level: "advanced",
  },
  {
    name: "SEQUENCE (advanced)",
    syntax: "=SEQUENCE(rows, [cols], [start], [step])",
    description: "Beyond lists: combine SEQUENCE with DATE, EDATE, WORKDAY, and MAKEARRAY to generate full dynamic calendar structures with a single formula.",
    example: "Dynamic month-end dates for 5 years:\n=EOMONTH(DATE(2024,1,1), SEQUENCE(60)-1)\n→ 60 month-end dates starting Jan 2024\n\nAll Wednesdays in 2025:\n=FILTER(\n  DATE(2025,1,1)+SEQUENCE(365)-1,\n  WEEKDAY(DATE(2025,1,1)+SEQUENCE(365)-1,2)=3\n)\n→ every Wednesday, automatically",
    tip: "SEQUENCE is the engine behind most dynamic array date structures. Pair it with WORKDAY to generate business-day-only sequences, or FILTER+WEEKDAY for specific days of the week.",
    level: "advanced",
  },
  {
    name: "SUMPRODUCT (expert uses)",
    syntax: "=SUMPRODUCT(array1, [array2,...])",
    description: "Beyond element multiplication: SUMPRODUCT as a weighted aggregator, conditional counter, rank calculator, and multi-dimensional pivot — all without helper columns.",
    example: "Weighted average:\n=SUMPRODUCT(Weights, Returns)/SUM(Weights)\n\nCount unique values in a filtered range:\n=SUMPRODUCT((Region=\"APAC\")/COUNTIF(Company,Company))\n\nRank without ties (dense rank):\n=SUMPRODUCT((Score>Score_Cell)*1)+1",
    tip: "SUMPRODUCT evaluates arrays without Ctrl+Shift+Enter. The key insight: dividing TRUE/FALSE arrays by COUNTIF removes duplicates for counting unique values. Master this and you'll use it constantly.",
    level: "advanced",
  },
  {
    name: "INDIRECT (with structured references)",
    syntax: "=INDIRECT(ref_text, [a1])\nUsed with Table references: INDIRECT(\"Table1[Column]\")",
    description: "Dynamic table column references: build the table column name as a string, then resolve it at runtime. Powerful for dashboards with user-selected metrics.",
    example: "=SUM(INDIRECT(\"Deal_Table[\"&A1&\"]\" ))\n→ if A1 = \"Revenue\", sums Deal_Table[Revenue]\n→ if A1 = \"EBITDA\", sums Deal_Table[EBITDA]\n\n=INDIRECT(\"'\"\&SheetName_Cell&\"'!B5\")\n→ dynamic cross-sheet reference based on a dropdown",
    tip: "⚠️ INDIRECT is volatile — recalculates on every workbook change. In models with thousands of formulas, this causes significant slowdown. Use sparingly and never in large loops. Consider INDEX instead where possible.",
    level: "advanced",
  },
  {
    name: "TEXTSPLIT",
    syntax: "=TEXTSPLIT(text, col_delimiter, [row_delimiter], [ignore_empty], [match_mode], [pad_with])",
    description: "Split a text string into an array by one or more delimiters — horizontally, vertically, or into a 2D grid. Replaces years of manual Text-to-Columns and FIND/MID formulas.",
    example: '=TEXTSPLIT(A1, ",")\n→ splits "Apple,Google,Meta" into 3 columns\n\n=TEXTSPLIT(A1, ",", CHAR(10))\n→ splits on both commas AND line breaks into a 2D grid\n\n=SORT(UNIQUE(TEXTSPLIT(Tags, ",")))\n→ deduplicated sorted list from a comma-delimited tag field',
    tip: "TEXTSPLIT spills into as many cells as needed — no pre-allocating space. Combine with UNIQUE+SORT for instant tag/category extraction from messy text fields. Available in Excel 365 only.",
    level: "advanced",
  },
  {
    name: "GROUPBY / PIVOTBY",
    syntax: "=GROUPBY(row_fields, values, function, [field_headers], [total_depth], [sort_order], [filter_array])\n=PIVOTBY(row_fields, col_fields, values, function, ...)",
    description: "Native pivot-table-style aggregation inside a cell formula — no pivot table required. GROUPBY aggregates by row dimension; PIVOTBY creates a full row × column summary.",
    example: '=GROUPBY(Sector, Revenue, SUM)\n→ total revenue by sector, sorted automatically\n\n=PIVOTBY(Year, Region, Revenue, SUM)\n→ revenue grid: years as rows, regions as columns\n\n=GROUPBY(Manager, {Revenue,Deals}, {SUM,COUNTA})\n→ multi-metric summary per manager in one formula',
    tip: "GROUPBY/PIVOTBY are the dynamic array replacement for pivot tables. They spill, update automatically, and can be filtered and sorted inline. Filter with the filter_array argument: =GROUPBY(Sector, Rev, SUM, , , , Year=2024)",
    level: "expert",
  },
  {
    name: "CHOOSEROWS / CHOOSECOLS",
    syntax: "=CHOOSEROWS(array, row1, [row2,...])\n=CHOOSECOLS(array, col1, [col2,...])",
    description: "Return specific rows or columns from an array by index — including negative indexes to count from the end. Perfect for extracting the first/last N rows or reordering columns dynamically.",
    example: "=CHOOSEROWS(Data, 1, -1)\n→ first and last row of a dataset\n\n=CHOOSECOLS(Table, 1, 3, 5)\n→ columns 1, 3, and 5 only\n\n=CHOOSEROWS(SORT(Data, 2, -1), SEQUENCE(5))\n→ top 5 rows after sorting by column 2 descending",
    tip: "Negative indexes count from the end: CHOOSEROWS(Data, -1) = last row. This is the clean way to get the most recent entry from a table without OFFSET or MATCH workarounds.",
    level: "advanced",
  },
  {
    name: "VSTACK / HSTACK",
    syntax: "=VSTACK(array1, [array2,...])\n=HSTACK(array1, [array2,...])",
    description: "Vertically or horizontally combine multiple arrays/ranges into one. The clean, formula-based replacement for copy-pasting ranges together.",
    example: "=VSTACK(Q1_Data, Q2_Data, Q3_Data, Q4_Data)\n→ full-year data table, auto-updating as each quarter fills\n\n=HSTACK(Names, Scores, BYROW(Scores,LAMBDA(r,MAX(r))))\n→ original table with computed max column appended\n\n=VSTACK(Header_Row, SORT(Data, 1))\n→ sorted data with original header preserved",
    tip: "VSTACK/HSTACK are essential for combining data from multiple sheets or tables without Power Query. Pair with VSTACK + FILTER to stack results from multiple filtered queries.",
    level: "advanced",
  },
  {
    name: "TOROW / TOCOL",
    syntax: "=TOROW(array, [ignore], [scan_by_column])\n=TOCOL(array, [ignore], [scan_by_column])",
    description: "Flatten a 2D range into a single row or column, with optional blank/error filtering. The formula-based replacement for unstack operations that previously required Power Query.",
    example: "=TOROW(A1:D5)\n→ 20-cell 2D range flattened into a single row\n\n=TOCOL(A1:D5, 1)\n→ flatten to column, ignoring blanks\n\n=UNIQUE(TOCOL(Tags_Table, 1))\n→ unique tags extracted from a 2D tag matrix",
    tip: "ignore parameter: 0 = keep all, 1 = ignore blanks, 2 = ignore errors, 3 = ignore blanks and errors. TOCOL + UNIQUE is the formula-only way to deduplicate a 2D range.",
    level: "advanced",
  },
  {
    name: "ISOMITTED",
    syntax: "=ISOMITTED(argument) — used inside LAMBDA",
    description: "Returns TRUE if an optional LAMBDA parameter was not provided by the caller. Enables default parameter values in custom LAMBDA functions — proper optional arguments.",
    example: "=LAMBDA(value, [decimals],\n  LET(\n    d, IF(ISOMITTED(decimals), 2, decimals),\n    ROUND(value, d)\n  )\n)\n\nUsage: =MY_ROUND(A1) → rounds to 2dp (default)\n       =MY_ROUND(A1, 4) → rounds to 4dp",
    tip: "ISOMITTED is only meaningful inside a LAMBDA with optional parameters (defined with [brackets]). Without ISOMITTED, referencing an omitted parameter returns a #VALUE! error. This is what makes production-quality LAMBDAs possible.",
    level: "expert",
  },
  {
    name: "WRAPROWS / WRAPCOLS",
    syntax: "=WRAPROWS(vector, wrap_count, [pad_with])\n=WRAPCOLS(vector, wrap_count, [pad_with])",
    description: "Take a 1D range and reshape it into a 2D grid of a specified width (WRAPROWS) or height (WRAPCOLS). The inverse of TOROW/TOCOL.",
    example: "=WRAPROWS(A1:A12, 4)\n→ reshapes 12 monthly values into a 3×4 quarterly grid\n\n=WRAPROWS(Names, 5, \"\")\n→ wraps a list of names into rows of 5, padding blanks\n\n=WRAPROWS(SORT(Products), 3)\n→ sorted product list arranged 3-per-row",
    tip: "WRAPROWS/WRAPCOLS are the formula-based reshape tools. The pad_with parameter fills any short final row — use \"\" for blank padding or NA() to make gaps visible.",
    level: "advanced",
  },
  {
    name: "TRIMRANGE",
    syntax: "=TRIMRANGE(array, [trim_rows], [trim_cols])",
    description: "Removes trailing blank rows and/or columns from an array or range — returns only the data-containing portion. Critical when working with dynamic ranges where data length varies.",
    example: "=TRIMRANGE(A:D, 3, 3)\n→ entire columns A:D with trailing blank rows AND columns removed\n\n=ROWS(TRIMRANGE(Data_Table))\n→ actual count of non-blank rows in a variable-length range\n\n=SORT(TRIMRANGE(Input_Range))\n→ sort only the populated rows, not the entire column",
    tip: "trim_rows/trim_cols: 0=no trimming, 1=trim start, 2=trim end, 3=trim both. TRIMRANGE solves the 'my SORT/UNIQUE includes empty rows from the whole column' problem cleanly.",
    level: "advanced",
  },
  {
    name: "XMATCH (advanced)",
    syntax: "=XMATCH(lookup, lookup_array, [match_mode], [search_mode])",
    description: "The modern MATCH replacement. Binary search option for huge datasets, nearest match, wildcard, and reverse search — all in one function without MATCH's quirks.",
    example: "Binary search (sorted data, massive speed gain):\n=XMATCH(Target, Rate_Schedule, 1, 2)\n→ binary search for nearest value ≥ Target in sorted range\n\nLast occurrence:\n=XMATCH(\"APAC\", Region, 0, -1)\n→ row index of the most recent APAC entry\n\nWildcard:\n=XMATCH(\"*Goldman*\", Counterparty, 2)",
    tip: "search_mode=2 uses binary search — orders of magnitude faster than linear scan on sorted ranges with 100k+ rows. This is the right choice for large lookup tables in production models.",
    level: "advanced",
  },
];

function getWeekNumber(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const LEVEL_STYLE: Record<string, string> = {
  advanced: "bg-blue-100 text-blue-700",
  expert: "bg-purple-100 text-purple-700",
};

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
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${LEVEL_STYLE[fn.level]}`}>
          {fn.level}
        </span>
      </div>

      {/* Function name */}
      <div className="bg-slate-800 rounded-2xl px-4 py-3 mb-3">
        <p className="text-xs text-slate-400 mb-1 font-mono">Excel 365</p>
        <p className="text-lg font-bold text-white font-mono leading-tight">{fn.name}</p>
        <p className="text-xs text-emerald-400 font-mono mt-1.5 leading-relaxed whitespace-pre-line break-all">{fn.syntax}</p>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-700 leading-relaxed mb-3">{fn.description}</p>

      {/* Example toggle */}
      <button
        onClick={() => setShowExample((v) => !v)}
        className="text-xs font-semibold text-blue-600 mb-2"
      >
        {showExample ? "▲ Hide examples" : "▼ Show examples"}
      </button>

      {showExample && (
        <div className="bg-slate-800 rounded-xl px-3 py-3 mb-3">
          <p className="text-xs text-slate-400 font-semibold mb-2 font-mono">Examples</p>
          <p className="text-xs font-mono text-emerald-300 whitespace-pre-line leading-relaxed">{fn.example}</p>
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

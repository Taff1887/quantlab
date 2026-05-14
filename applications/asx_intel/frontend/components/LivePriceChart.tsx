"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

interface Bar {
  time: string;
  open: number | null;
  close: number | null;
}

interface Props {
  ticker: string;
  refreshSeconds?: number;
}

function fmtTime(iso: string) {
  try { return format(new Date(iso), "h:mma"); } catch { return iso.slice(11, 16); }
}

function fmtPrice(v: number) {
  return `$${v.toFixed(3)}`;
}

export default function LivePriceChart({ ticker, refreshSeconds = 60 }: Props) {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8000/companies/${ticker}/intraday?interval=5m`);
      if (!res.ok) return;
      const data = await res.json();
      setBars(data.bars ?? []);
      setLastUpdated(new Date());
    } catch { /* market closed or offline */ }
    finally { setLoading(false); }
  }, [ticker]);

  useEffect(() => {
    load();
    const id = setInterval(load, refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [load, refreshSeconds]);

  if (loading) {
    return <div className="h-56 flex items-center justify-center text-gray-500 text-sm animate-pulse">Loading…</div>;
  }

  if (bars.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-gray-500 text-sm gap-1">
        <span className="text-2xl">📉</span>
        <span>No intraday data — market may be closed</span>
        <span className="text-xs text-gray-600">ASX trades Mon–Fri, 10am–4pm AEST</span>
      </div>
    );
  }

  const openPrice = bars[0]?.open ?? bars[0]?.close ?? 0;
  const currentPrice = bars[bars.length - 1]?.close ?? 0;
  const isUp = currentPrice >= openPrice;
  const changePct = openPrice ? ((currentPrice - openPrice) / openPrice) * 100 : 0;
  const changeAbs = currentPrice - openPrice;

  const prices = bars.map(b => b.close).filter((p): p is number => p !== null);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad = (maxP - minP) * 0.15 || 0.01;

  // Thin out x-axis labels — show ~6 evenly spaced
  const labelEvery = Math.max(1, Math.floor(bars.length / 6));

  const chartData = bars.map((b, i) => ({
    time: fmtTime(b.time),
    price: b.close,
    showLabel: i === 0 || i === bars.length - 1 || i % labelEvery === 0,
  }));

  const colour = isUp ? "#10B981" : "#EF4444";
  const colourFade = isUp ? "#10B98120" : "#EF444420";

  return (
    <div className="space-y-4">
      {/* Price header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-end gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Current price</div>
            <div className="text-4xl font-bold font-mono text-white tracking-tight">
              {fmtPrice(currentPrice)}
            </div>
          </div>
          <div className={`text-xl font-bold font-mono mb-1 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {isUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
            <span className="text-sm font-normal ml-1 opacity-70">
              ({isUp ? "+" : ""}{fmtPrice(changeAbs)})
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Open: <span className="text-gray-300 font-mono">{fmtPrice(openPrice)}</span></div>
          <div>High: <span className="text-gray-300 font-mono">{fmtPrice(Math.max(...prices))}</span>  Low: <span className="text-gray-300 font-mono">{fmtPrice(Math.min(...prices))}</span></div>
          {lastUpdated && <div className="mt-0.5">Live · {format(lastUpdated, "HH:mm:ss")} · refreshes {refreshSeconds}s</div>}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colour} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Open price dashed reference */}
          <ReferenceLine
            y={openPrice}
            stroke="#4B5563"
            strokeDasharray="4 3"
            label={{
              value: `Open ${fmtPrice(openPrice)}`,
              position: "insideTopLeft",
              fill: "#6B7280",
              fontSize: 10,
            }}
          />

          <XAxis
            dataKey="time"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={labelEvery - 1}
          />
          <YAxis
            domain={[minP - pad, maxP + pad]}
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
            width={54}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9CA3AF" }}
            formatter={(v: number) => [fmtPrice(v), ticker]}
            itemStyle={{ color: colour }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={colour}
            strokeWidth={2}
            fill={`url(#grad-${ticker})`}
            dot={false}
            activeDot={{ r: 4, fill: colour, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="text-xs text-gray-600 text-center">
        Intraday 5-min bars · {bars.length} bars today · Data via Yahoo Finance
      </div>
    </div>
  );
}

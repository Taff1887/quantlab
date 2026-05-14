"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

interface Bar {
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

interface Props {
  ticker: string;
  interval?: string;
  refreshSeconds?: number;
}

function formatTime(iso: string) {
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return iso.slice(11, 16);
  }
}

function formatPrice(v: number) {
  return `$${v.toFixed(3)}`;
}

export default function LivePriceChart({ ticker, interval = "5m", refreshSeconds = 60 }: Props) {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/companies/${ticker}/intraday?interval=${interval}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBars(data.bars ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ticker, interval]);

  useEffect(() => {
    load();
    const id = setInterval(load, refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [load, refreshSeconds]);

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm animate-pulse">
        Loading price data…
      </div>
    );
  }

  if (error || bars.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-500 text-sm gap-1">
        <span>No intraday data available</span>
        <span className="text-xs">Market may be closed or outside ASX hours (10am–4pm AEST)</span>
      </div>
    );
  }

  const prices = bars.map((b) => b.close).filter((p): p is number => p !== null);
  const openPrice = bars[0]?.open ?? bars[0]?.close ?? 0;
  const currentPrice = bars[bars.length - 1]?.close ?? 0;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || 0.005;
  const dayMove = openPrice ? ((currentPrice - openPrice) / openPrice) * 100 : null;
  const isUp = (dayMove ?? 0) >= 0;

  const chartData = bars.map((b) => ({
    time: formatTime(b.time),
    price: b.close,
    volume: b.volume,
  }));

  return (
    <div className="space-y-3">
      {/* Price header */}
      <div className="flex items-end gap-4">
        <div>
          <span className="text-3xl font-bold font-mono text-white">{formatPrice(currentPrice)}</span>
          <span className="text-sm text-gray-500 ml-2">{ticker}.AX</span>
        </div>
        {dayMove !== null && (
          <span
            className={`text-lg font-semibold font-mono ${isUp ? "text-emerald-400" : "text-red-400"}`}
          >
            {isUp ? "+" : ""}{dayMove.toFixed(2)}%
          </span>
        )}
        {lastUpdated && (
          <span className="text-xs text-gray-500 ml-auto">
            Live · updated {format(lastUpdated, "HH:mm:ss")} · refreshes every {refreshSeconds}s
          </span>
        )}
      </div>

      {/* Line chart */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: "#6B7280", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fill: "#6B7280", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#9CA3AF" }}
            itemStyle={{ color: isUp ? "#34D399" : "#F87171" }}
            formatter={(value: number) => [formatPrice(value), "Price"]}
          />
          {/* Previous close / open reference line */}
          <ReferenceLine
            y={openPrice}
            stroke="#374151"
            strokeDasharray="4 4"
            label={{
              value: `Open $${openPrice.toFixed(3)}`,
              position: "insideTopRight",
              fill: "#6B7280",
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={isUp ? "#10B981" : "#EF4444"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: isUp ? "#10B981" : "#EF4444" }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        {[
          { label: "Open", value: formatPrice(openPrice) },
          { label: "High", value: formatPrice(Math.max(...prices)) },
          { label: "Low", value: formatPrice(Math.min(...prices)) },
          { label: "Bars", value: `${bars.length} × ${interval}` },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="text-gray-500 mb-0.5">{s.label}</div>
            <div className="font-mono text-gray-200 font-medium">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

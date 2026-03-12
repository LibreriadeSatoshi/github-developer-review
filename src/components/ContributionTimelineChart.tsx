"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { MonthlyData } from "@/lib/stats";

interface ContributionTimelineChartProps {
  data: MonthlyData[];
}

export default function ContributionTimelineChart({
  data,
}: ContributionTimelineChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) => {
              const [, m] = v.split("-");
              const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              return months[parseInt(m, 10) - 1] ?? v;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

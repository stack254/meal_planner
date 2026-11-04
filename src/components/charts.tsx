import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Weight } from "../data";
export function WeightChart({ records }: { records: Weight[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={records}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="#e5e9e2"
        />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(parseISO(v), "d MMM")}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={["dataMin - 1", "dataMax + 1"]}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip formatter={(v) => `${v} kg`} />
        <Line
          type="linear"
          dataKey="kg"
          stroke="#244d3a"
          strokeWidth={3}
          dot={{ r: 3 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
export function SpendingChart({
  records,
  formatMoney,
}: {
  records: { label: string; amount: number }[];
  formatMoney: (amount: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={records}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="#e5e9e2"
        />
        <XAxis dataKey="label" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => formatMoney(Number(v))} />
        <Bar dataKey="amount" fill="#83aa85" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

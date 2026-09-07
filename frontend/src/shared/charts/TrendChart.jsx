import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

// Consumes the "history" array from ai_core's dashboard payload:
// [{ timestamp, score }, ...]
export default function TrendChart({ history }) {
  const data = history.map((h) => ({
    date: new Date(h.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    score: h.score,
  }));

  return (
    <LineChart width={480} height={220} data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
      <CartesianGrid stroke="#2a2e38" strokeDasharray="3 3" />
      <XAxis dataKey="date" stroke="#9aa0ab" fontSize={12} />
      <YAxis domain={[0, 100]} stroke="#9aa0ab" fontSize={12} />
      <Tooltip contentStyle={{ background: "#171a21", border: "1px solid #2a2e38" }} />
      <ReferenceLine y={40} stroke="#d9a441" strokeDasharray="4 4" label={{ value: "moderate", fill: "#d9a441", fontSize: 10 }} />
      <ReferenceLine y={60} stroke="#d9741f" strokeDasharray="4 4" label={{ value: "high", fill: "#d9741f", fontSize: 10 }} />
      <ReferenceLine y={80} stroke="#c73e3e" strokeDasharray="4 4" label={{ value: "crisis-range", fill: "#c73e3e", fontSize: 10 }} />
      <Line type="monotone" dataKey="score" stroke="#5b8cff" strokeWidth={2} dot={{ r: 3 }} />
    </LineChart>
  );
}

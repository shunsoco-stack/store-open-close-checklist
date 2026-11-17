import type { Check } from "./types.ts";
import { needsAttention } from "./checklist.ts";

export function summarize(checks: Check[], now: string) {
  const eligible = checks.filter((c) => c.availableAt <= now);
  const done = eligible.filter((c) => c.completedAt);
  const times = done.map((c) => {
    const [hour, minute] = c.completedAt.slice(11).split(":").map(Number);
    return hour * 60 + minute + (c.completedAt.slice(0, 10) > c.date ? 1440 : 0);
  });
  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const hour = average === null ? "" : String(Math.floor(average / 60) % 24).padStart(2, "0");
  const minute = average === null ? "" : String(average % 60).padStart(2, "0");
  const issues: Record<string, number> = {};
  checks.forEach((c) =>
    c.items.forEach((i) => {
      if (needsAttention(i)) issues[i.title] = (issues[i.title] || 0) + 1;
    }),
  );
  return {
    rate: eligible.length ? Math.round((done.length / eligible.length) * 100) : 0,
    average: average === null ? "—" : `${average >= 1440 ? "翌" : ""}${hour}:${minute}`,
    issues,
  };
}

import type { Kind, Store } from "./types.ts";

export function japanNow(date = new Date()): string {
  return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 16).replace("T", " ");
}
export function addMinutes(value: string, minutes: number): string {
  return new Date(Date.parse(value.replace(" ", "T") + ":00Z") + minutes * 60000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}
export function addDays(date: string, days: number): string {
  return addMinutes(`${date} 00:00`, days * 1440).slice(0, 10);
}
export function businessDate(now: string, rollover = "05:00"): string {
  return now.slice(11) < rollover ? addDays(now.slice(0, 10), -1) : now.slice(0, 10);
}
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
export function eventAt(store: Store, date: string, kind: Kind): string {
  const time = store[kind];
  const next = time < store.rollover || (kind === "close" && time <= store.open);
  return `${next ? addDays(date, 1) : date} ${time}`;
}
export function timing(store: Store, date: string, kind: Kind) {
  const event = eventAt(store, date, kind);
  return {
    availableAt: addMinutes(event, -(kind === "open" ? store.openBefore : store.closeBefore)),
    deadline: addMinutes(event, kind === "open" ? -store.openDeadline : store.closeDeadline),
  };
}
export function daysBetween(from: string, to: string): number {
  return Math.max(
    0,
    Math.floor((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 86400000),
  );
}

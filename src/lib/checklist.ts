import { businessDate, timing, weekday } from "./dates.ts";
import type { Check, Data, Handover, Item, Kind, Store, TemplateItem } from "./types.ts";

export function createCheck(store: Store, date: string, kind: Kind): Check {
  return {
    id: `${store.id}_${date}_${kind}`,
    storeId: store.id,
    date,
    kind,
    ...timing(store, date, kind),
    items: store.templates[kind]
      .filter((item) => !item.weekdays.length || item.weekdays.includes(weekday(date)))
      .map((item) => ({
        ...item,
        weekdays: [...item.weekdays],
        options: [...item.options],
        status: "pending",
        value: "",
        comment: "",
        actor: "",
        at: "",
        photos: [],
        hadIssue: false,
      })),
    actor: "",
    changes: [],
    completedAt: "",
    completedBy: "",
    note: "",
  };
}
export function outOfRange(item: TemplateItem, value: string): boolean {
  return (
    item.type === "number" &&
    (value.trim() === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < item.min ||
      Number(value) > item.max)
  );
}
export function needsAttention(item: Item): boolean {
  return item.status === "issue" || (item.status === "handover" && item.hadIssue);
}
export function progress(check: Check) {
  return {
    total: check.items.length,
    done: check.items.filter((item) => item.status !== "pending").length,
    issues: check.items.filter(needsAttention).length,
    required: check.items.filter((item) => item.required && item.status === "pending").length,
  };
}
export function overdue(check: Check, now: string): boolean {
  return !check.completedAt && now > check.deadline && progress(check).required > 0;
}
export function incoming(check: Check, handovers: Handover[]): Handover[] {
  return handovers.filter(
    (h) =>
      h.storeId === check.storeId &&
      h.sourceId !== check.id &&
      h.target === check.kind &&
      h.createdAt <= check.availableAt &&
      h.status !== "done",
  );
}
export function canComplete(check: Check, handovers: Handover[], now: string): boolean {
  return (
    !!check.actor &&
    !check.completedAt &&
    now >= check.availableAt &&
    progress(check).required === 0 &&
    !incoming(check, handovers).some((h) => h.status === "unread")
  );
}
export function recordItem(check: Check, itemId: string, patch: Partial<Item>, now: string): Check {
  if (check.completedAt || !check.actor || now < check.availableAt) return check;
  return {
    ...check,
    items: check.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...patch,
            hadIssue:
              item.hadIssue ||
              !!patch.hadIssue ||
              item.status === "issue" ||
              patch.status === "issue",
            actor: check.actor,
            at: now,
          }
        : item,
    ),
  };
}
export function ensureToday(data: Data, now: string): Data {
  const checks = [...data.checks];
  for (const store of data.stores) {
    for (const kind of ["open", "close"] as const) {
      const check = createCheck(store, businessDate(now, store.rollover), kind);
      if (!checks.some((c) => c.id === check.id)) checks.push(check);
    }
  }
  return checks.length === data.checks.length ? data : { ...data, checks };
}

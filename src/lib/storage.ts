import type { Data } from "./types.ts";
import { seed } from "./seed.ts";
import { categories } from "./types.ts";

export const storageKey = "occ:v1";
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);
const time = (v: unknown) => str(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const date = (v: unknown) =>
  str(v) &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const stamp = (v: unknown) =>
  str(v) && (v === "" || (date(v.slice(0, 10)) && time(v.slice(11)) && v[10] === " "));
const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const unique = (rows: { id: string }[]) => new Set(rows.map((r) => r.id)).size === rows.length;

function template(v: unknown): boolean {
  return (
    object(v) &&
    str(v.id) &&
    !!v.id &&
    str(v.title) &&
    !!v.title.trim() &&
    categories.includes(v.category as (typeof categories)[number]) &&
    ["check", "number", "select"].includes(String(v.type)) &&
    typeof v.required === "boolean" &&
    Array.isArray(v.weekdays) &&
    v.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    finite(v.min) &&
    finite(v.max) &&
    Number(v.min) <= Number(v.max) &&
    str(v.unit) &&
    strings(v.options) &&
    (v.type !== "select" || v.options.length >= 2)
  );
}
export function validateData(value: unknown): value is Data {
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.stores) ||
    !value.stores.length ||
    !Array.isArray(value.checks) ||
    !Array.isArray(value.handovers)
  )
    return false;
  const storesValid = value.stores.every(
    (s) =>
      object(s) &&
      str(s.id) &&
      str(s.name) &&
      str(s.description) &&
      time(s.open) &&
      time(s.close) &&
      time(s.rollover) &&
      [s.openBefore, s.closeBefore, s.openDeadline, s.closeDeadline].every(
        (n) => finite(n) && Number(n) >= 0 && Number(n) <= 1440,
      ) &&
      strings(s.staff) &&
      s.staff.length > 0 &&
      s.staff.every((n) => n.trim()) &&
      object(s.templates) &&
      [s.templates.open, s.templates.close].every(
        (t) => Array.isArray(t) && t.length > 0 && t.every(template) && unique(t),
      ),
  );
  if (!storesValid || !unique(value.stores)) return false;
  const ids = value.stores.map((s) => s.id);
  const checksValid = value.checks.every(
    (c) =>
      object(c) &&
      str(c.id) &&
      ids.includes(c.storeId) &&
      date(c.date) &&
      ["open", "close"].includes(String(c.kind)) &&
      stamp(c.availableAt) &&
      !!c.availableAt &&
      stamp(c.deadline) &&
      !!c.deadline &&
      str(c.actor) &&
      str(c.completedBy) &&
      stamp(c.completedAt) &&
      str(c.note) &&
      Array.isArray(c.changes) &&
      c.changes.every((x) => object(x) && str(x.actor) && stamp(x.at) && !!x.at) &&
      Array.isArray(c.items) &&
      c.items.every(
        (i) =>
          template(i) &&
          object(i) &&
          ["pending", "ok", "issue", "handover"].includes(String(i.status)) &&
          str(i.value) &&
          str(i.comment) &&
          str(i.actor) &&
          stamp(i.at) &&
          strings(i.photos) &&
          typeof i.hadIssue === "boolean" &&
          i.photos.length <= 2 &&
          (i.status === "pending" || (!!i.actor && !!i.at)),
      ) &&
      unique(c.items),
  );
  const handoversValid = value.handovers.every(
    (h) =>
      object(h) &&
      str(h.id) &&
      ids.includes(h.storeId) &&
      ["sourceId", "itemId", "title", "reason", "createdBy", "acknowledgedBy", "resolvedBy"].every(
        (k) => str(h[k]),
      ) &&
      ["createdAt", "acknowledgedAt", "resolvedAt"].every((k) => stamp(h[k])) &&
      !!h.createdAt &&
      ["open", "close", "manager"].includes(String(h.target)) &&
      ["unread", "read", "done"].includes(String(h.status)) &&
      (h.status === "unread" || (!!h.acknowledgedBy && !!h.acknowledgedAt)) &&
      (h.status !== "done" || (!!h.resolvedBy && !!h.resolvedAt)),
  );
  if (!checksValid || !handoversValid || !unique(value.checks) || !unique(value.handovers)) {
    return false;
  }
  const data = value as Data;
  const recordsValid = data.checks.every((check) => {
    const timestamps = [
      ...check.changes.map((change) => change.at),
      ...check.items.map((item) => item.at).filter(Boolean),
    ];
    if (timestamps.some((at) => at < check.availableAt)) return false;
    if (!check.completedAt) return true;
    return (
      !!check.completedBy &&
      !!check.note.trim() &&
      check.completedAt >= check.availableAt &&
      timestamps.every((at) => at <= check.completedAt) &&
      !check.items.some((item) => item.required && item.status === "pending")
    );
  });
  const referencesValid = data.handovers.every((handover) => {
    if (!handover.title.trim() || !handover.reason.trim() || !handover.createdBy.trim())
      return false;
    if (handover.acknowledgedAt && handover.acknowledgedAt < handover.createdAt) return false;
    if (handover.resolvedAt && handover.resolvedAt < handover.acknowledgedAt) return false;
    if (!handover.sourceId) return !handover.itemId;
    const source = data.checks.find((check) => check.id === handover.sourceId);
    return (
      !!source &&
      source.storeId === handover.storeId &&
      (!handover.itemId || source.items.some((item) => item.id === handover.itemId))
    );
  });
  return recordsValid && referencesValid;
}
export function restore(raw: string | null, now: string): { data: Data; recovered: boolean } {
  if (raw === null) return { data: seed(now), recovered: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validateData(parsed)) return { data: parsed, recovered: false };
  } catch {
    /* Invalid JSON is replaced with explicitly disclosed demo data. */
  }
  return { data: seed(now), recovered: true };
}

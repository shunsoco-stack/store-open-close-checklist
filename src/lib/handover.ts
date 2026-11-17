import { daysBetween } from "./dates.ts";
import type { Handover } from "./types.ts";

export function createHandover(
  input: Pick<Handover, "id" | "storeId" | "sourceId" | "itemId" | "title" | "reason" | "target">,
  actor: string,
  now: string,
): Handover {
  if (!actor.trim() || !input.reason.trim()) throw new Error("担当者と理由を入力してください。");
  return {
    ...input,
    createdAt: now,
    createdBy: actor,
    status: "unread",
    acknowledgedBy: "",
    acknowledgedAt: "",
    resolvedBy: "",
    resolvedAt: "",
  };
}
export function transition(
  h: Handover,
  status: "read" | "done",
  actor: string,
  now: string,
): Handover {
  if (
    !actor ||
    h.status === "done" ||
    (status === "done" && h.status !== "read") ||
    (status === "read" && h.status !== "unread") ||
    now < h.createdAt ||
    (status === "done" && now < h.acknowledgedAt)
  )
    return h;
  return status === "read"
    ? { ...h, status, acknowledgedBy: actor, acknowledgedAt: now }
    : { ...h, status, resolvedBy: actor, resolvedAt: now };
}
export function carryDays(h: Handover, now: string): number {
  return daysBetween(h.createdAt, h.status === "done" ? h.resolvedAt : now);
}

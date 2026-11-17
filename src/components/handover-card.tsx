"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { carryDays, transition } from "@/lib/handover";
import { japanNow } from "@/lib/dates";
import { targetLabel } from "@/lib/types";
import type { Handover } from "@/lib/types";

export function HandoverCard({
  handover: h,
  actor: assigned,
}: {
  handover: Handover;
  actor?: string;
}) {
  const { data, now, update } = useApp();
  const [actor, setActor] = useState("");
  const store = data!.stores.find((s) => s.id === h.storeId)!;
  const days = carryDays(h, now);
  const badgeTone = h.status === "unread" ? "amber" : h.status === "done" ? "green" : "neutral";
  const person = assigned ?? actor;
  function advance(status: "read" | "done") {
    update((d) => ({
      ...d,
      handovers: d.handovers.map((x) =>
        x.id === h.id ? transition(x, status, person, japanNow()) : x,
      ),
    }));
  }
  return (
    <article className="panel handover-card">
      <div className="row between wrap">
        <span className={`badge ${badgeTone}`}>
          {{ unread: "未確認", read: "確認済み", done: "対応済み" }[h.status]}
        </span>
        <span className={days >= 3 && h.status !== "done" ? "danger-text" : "muted"}>
          {days}日持ち越し
        </span>
      </div>
      <h3>{h.title}</h3>
      <p className="preserve">{h.reason}</p>
      <p className="muted">
        {store.name} → {h.target === "manager" ? "店長" : `次の${targetLabel[h.target]}`}
      </p>
      <p className="small muted">
        {h.createdBy} · {h.createdAt}
      </p>
      {h.acknowledgedAt && (
        <p className="small">
          受け取り：{h.acknowledgedBy} · {h.acknowledgedAt}
        </p>
      )}
      {h.resolvedAt && (
        <p className="small">
          対応：{h.resolvedBy} · {h.resolvedAt}
        </p>
      )}
      {h.status !== "done" && (
        <div className="row wrap">
          {assigned === undefined && (
            <label>
              確認する担当者
              <select value={actor} onChange={(e) => setActor(e.target.value)}>
                <option value="">担当者を選択</option>
                {store.staff.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          )}
          <button
            className="button secondary"
            disabled={!person}
            onClick={() => advance(h.status === "unread" ? "read" : "done")}
          >
            {h.status === "unread" ? "確認しました" : "対応済みにする"}
          </button>
        </div>
      )}
    </article>
  );
}

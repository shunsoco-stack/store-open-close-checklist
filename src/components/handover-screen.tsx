"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { HandoverCard } from "./handover-card";
import { HandoverForm } from "./handover-form";
import { targetLabel } from "@/lib/types";

export function HandoverScreen() {
  const { data } = useApp();
  const [status, setStatus] = useState("all");
  const [store, setStore] = useState("");
  const [target, setTarget] = useState("");
  const [adding, setAdding] = useState(false);
  const [newStore, setNewStore] = useState("aonagi");
  if (!data) return null;
  const filtered = data.handovers
    .filter(
      (h) =>
        (status === "all" || h.status === status) &&
        (!store || h.storeId === store) &&
        (!target || h.target === target),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HANDOVER NOTES</p>
          <h1>申し送り</h1>
          <p className="muted">気づきをつないで、次の一日をスムーズに。</p>
        </div>
        <button className="button" onClick={() => setAdding(!adding)}>
          ＋ 申し送りを追加
        </button>
      </div>
      {adding && (
        <div className="panel">
          <label>
            店舗
            <select value={newStore} onChange={(e) => setNewStore(e.target.value)}>
              {data.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <HandoverForm
            key={newStore}
            store={data.stores.find((s) => s.id === newStore)!}
            onDone={() => setAdding(false)}
          />
        </div>
      )}
      <div className="filters panel">
        <label>
          状態
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">すべて</option>
            <option value="unread">未確認</option>
            <option value="read">確認済み</option>
            <option value="done">対応済み</option>
          </select>
        </label>
        <label>
          店舗
          <select value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="">すべての店舗</option>
            {data.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          宛先
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">すべての宛先</option>
            {Object.entries(targetLabel).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        {filtered.length}件 · 3日以上持ち越している申し送りを赤色で表示します。
      </p>
      <div className="handover-grid">
        {filtered.map((h) => (
          <HandoverCard key={h.id} handover={h} />
        ))}
      </div>
      {!filtered.length && <div className="empty panel">条件に一致する申し送りはありません。</div>}
    </>
  );
}

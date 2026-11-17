"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./app-provider";
import { canComplete, incoming, overdue, progress } from "@/lib/checklist";
import { japanNow } from "@/lib/dates";
import { categories, kindLabel } from "@/lib/types";
import { CheckItem } from "./check-item";
import { HandoverCard } from "./handover-card";
import { HandoverForm } from "./handover-form";

export function CheckScreen({ id }: { id: string }) {
  const { data, now, update, notify } = useApp();
  const [note, setNote] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  if (!data) return null;
  const check = data.checks.find((c) => c.id === id);
  if (!check)
    return (
      <div className="empty">
        <h1>見つかりません</h1>
        <Link href="/">今日へ戻る</Link>
      </div>
    );
  const store = data.stores.find((s) => s.id === check.storeId)!;
  const p = progress(check);
  const messages = incoming(check, data.handovers);
  const planned = now < check.availableAt;
  const disabled = !!check.completedAt || planned || !check.actor;
  return (
    <>
      <Link href="/" className="back-link">
        ← 今日のチェック
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {store.name} · {check.date} 営業日
          </p>
          <h1>{kindLabel[check.kind]}</h1>
          <p className="muted">締め時刻 {check.deadline}（日本時間）</p>
        </div>
        <span className="badge neutral">{store.description}</span>
      </div>
      <div className="sticky-progress panel">
        <div className="row between wrap">
          <strong>
            {p.total}項目中 {p.done}完了 · 要対応 {p.issues}
          </strong>
          <span className={p.required ? "danger-text" : "success-text"}>
            必須の未完了 {p.required}
          </span>
        </div>
        <div className="track">
          <i style={{ width: `${p.total ? (p.done / p.total) * 100 : 100}%` }} />
        </div>
      </div>
      {overdue(check, now) && (
        <div className="alert">
          未実施の警告：締め時刻を過ぎています。残りの必須項目を確認するか、理由を残して申し送ってください。
        </div>
      )}
      {planned && <div className="notice">{check.availableAt}から実施できます。</div>}
      {check.completedAt ? (
        <div className="success-box">
          <h2>✓ このチェックは完了しています</h2>
          <p>
            {check.completedBy} · {check.completedAt}
          </p>
          <p>記録はロックされています。申し送りの状態のみ更新できます。</p>
          <Link href={`/history/${id}`} className="text-link">
            記録を見る →
          </Link>
        </div>
      ) : (
        <section className="panel actor-panel">
          <h2>1. 担当者を選択</h2>
          <label>
            今回の担当者
            <select
              value={check.actor}
              disabled={planned}
              onChange={(e) => {
                const actor = e.target.value;
                if (!actor) return;
                update((d) => ({
                  ...d,
                  checks: d.checks.map((c) =>
                    c.id === id && !c.completedAt
                      ? { ...c, actor, changes: [...c.changes, { actor, at: japanNow() }] }
                      : c,
                  ),
                }));
              }}
            >
              <option value="">担当者を選択してください</option>
              {store.staff.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <p className="muted small">途中で交代できます。担当者の変更も時刻とともに記録します。</p>
          {check.changes.length > 0 && (
            <details>
              <summary>担当者の履歴（{check.changes.length}）</summary>
              {check.changes.map((c, i) => (
                <p key={i}>
                  {i === 0 ? "開始" : "交代"}：{c.actor} · {c.at}
                </p>
              ))}
            </details>
          )}
        </section>
      )}
      {messages.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>受け取った申し送り</h2>
            <span className="badge amber">
              未確認 {messages.filter((h) => h.status === "unread").length}
            </span>
          </div>
          <p className="muted">
            内容を読んで「確認しました」を押してください。未確認のままでは完了できません。
          </p>
          <div className="handover-grid">
            {messages.map((h) => (
              <HandoverCard key={h.id} handover={h} actor={planned ? "" : check.actor} />
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="section-heading">
          <h2>2. 項目をチェック</h2>
          <label className="inline-label">
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            未完了のみ
          </label>
        </div>
        {categories.map((category) => {
          const visible = check.items.some(
            (item) => item.category === category && (!onlyPending || item.status === "pending"),
          );
          if (!visible) return null;
          return (
            <div key={category} className="category-group">
              <h3 className="category-heading">{category}</h3>
              <div className="check-items">
                {check.items.map(
                  (item, index) =>
                    item.category === category &&
                    (!onlyPending || item.status === "pending") && (
                      <CheckItem
                        key={`${check.id}-${item.id}`}
                        item={item}
                        check={check}
                        store={store}
                        index={index}
                        disabled={disabled}
                      />
                    ),
                )}
              </div>
            </div>
          );
        })}
      </section>
      {!disabled && (
        <details className="panel">
          <summary>自由記述の申し送りを追加</summary>
          <HandoverForm store={store} check={check} />
        </details>
      )}
      {!check.completedAt && (
        <section className="panel completion-panel">
          <h2>3. チェックを完了</h2>
          <label>
            完了時のひとこと
            <textarea
              value={note}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="次の担当者へ、ひとこと残しましょう"
            />
          </label>
          <p>完了担当者：{check.actor || "未選択"}</p>
          {p.required > 0 && (
            <p className="warning-text">必須項目をすべて確認、または申し送りにしてください。</p>
          )}
          {messages.some((h) => h.status === "unread") && (
            <p className="warning-text">未確認の申し送りを受け取ってください。</p>
          )}
          <button
            className="button ok-button"
            disabled={!canComplete(check, data.handovers, now) || !note.trim()}
            onClick={() => {
              const at = japanNow();
              if (!canComplete(check, data.handovers, at) || !note.trim()) return;
              update((d) => ({
                ...d,
                checks: d.checks.map((c) =>
                  c.id === id
                    ? { ...c, completedAt: at, completedBy: c.actor, note: note.trim() }
                    : c,
                ),
              }));
              notify("チェックを完了し、記録をロックしました。");
            }}
          >
            ✓ 完了にする
          </button>
          <p className="small muted">
            担当者とひとことを残して完了すると、項目は編集できなくなります。
          </p>
        </section>
      )}
    </>
  );
}

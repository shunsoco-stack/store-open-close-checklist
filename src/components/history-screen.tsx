"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./app-provider";
import { addDays } from "@/lib/dates";
import { kindLabel } from "@/lib/types";
import { summarize } from "@/lib/summary";
import { csv, csvFilename, downloadCsv } from "@/lib/csv";
import { needsAttention, progress } from "@/lib/checklist";

export function HistoryScreen() {
  const { data, now } = useApp();
  const [from, setFrom] = useState(addDays(now.slice(0, 10), -14));
  const [to, setTo] = useState(now.slice(0, 10));
  const [store, setStore] = useState("");
  const [kind, setKind] = useState("");
  const [person, setPerson] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  if (!data) return null;
  const checks = data.checks
    .filter(
      (c) =>
        c.date >= from &&
        c.date <= to &&
        (!store || c.storeId === store) &&
        (!kind || c.kind === kind) &&
        (!person ||
          c.changes.some((x) => x.actor === person) ||
          c.items.some((x) => x.actor === person)) &&
        (!issuesOnly || c.items.some(needsAttention)),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.storeId.localeCompare(b.storeId));
  const summary = summarize(checks, now);
  const people = [
    ...new Set([
      ...data.stores.flatMap((s) => s.staff),
      ...data.checks.flatMap((c) => c.changes.map((p) => p.actor)),
    ]),
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RECORDS & INSIGHTS</p>
          <h1>記録・集計</h1>
          <p className="muted">毎日の確認を、振り返れる記録に。</p>
        </div>
        <button
          className="button"
          disabled={!from || !to || from > to}
          onClick={() => downloadCsv(csv(checks, data.stores), csvFilename(from, to))}
        >
          ↓ CSVダウンロード
        </button>
      </div>
      <div className="panel filters">
        <label>
          開始日
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          終了日
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          店舗
          <select value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="">すべて</option>
            {data.stores.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          種類
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">すべて</option>
            <option value="open">開店チェック</option>
            <option value="close">閉店チェック</option>
          </select>
        </label>
        <label>
          担当者
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">すべて</option>
            {people.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="inline-label">
          <input
            type="checkbox"
            checked={issuesOnly}
            onChange={(e) => setIssuesOnly(e.target.checked)}
          />
          要対応あり
        </label>
      </div>
      {from > to && <p className="danger-text">開始日は終了日以前にしてください。</p>}
      <h2 className="section-title">店舗ごとの実施状況</h2>
      <p className="small muted">
        実施率＝完了したチェック／実施可能になったチェック。平均時刻は開店・閉店別（深夜は翌日として集計）。現在の絞り込み条件を適用しています。
      </p>
      <div className="summary-grid">
        {data.stores
          .filter((s) => !store || s.id === store)
          .map((s) => (
            <div className="panel" key={s.id}>
              <h3>{s.name}</h3>
              {(["open", "close"] as const).map((k) => {
                const result = summarize(
                  checks.filter((c) => c.storeId === s.id && c.kind === k),
                  now,
                );
                return (
                  <div className="summary-row" key={k}>
                    <span>{kindLabel[k]}</span>
                    <strong>{result.rate}%</strong>
                    <small>平均 {result.average}</small>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
      <details className="panel issue-summary">
        <summary>項目別の要対応回数</summary>
        {Object.entries(summary.issues).length ? (
          Object.entries(summary.issues).map(([title, count]) => (
            <p className="row between" key={title}>
              <span>{title}</span>
              <strong>{count}回</strong>
            </p>
          ))
        ) : (
          <p>この期間に要対応はありません。</p>
        )}
      </details>
      <div className="section-heading">
        <h2>チェック記録</h2>
        <span className="muted">{checks.length}件</span>
      </div>
      <div className="panel records">
        {checks.map((c) => (
          <Link href={`/history/${c.id}`} className="record-row" key={c.id}>
            <span>
              <strong>{c.date}</strong>
              <small>{data.stores.find((s) => s.id === c.storeId)?.name}</small>
            </span>
            <span>
              {kindLabel[c.kind]}
              <small>{c.completedBy || c.actor || "担当者未選択"}</small>
            </span>
            <span className={`badge ${c.completedAt ? "green" : "neutral"}`}>
              {c.completedAt ? "完了" : now < c.availableAt ? "予定" : "未完了"}
            </span>
            <span className="record-meta">
              {progress(c).done} / {c.items.length}
              <small>要対応 {progress(c).issues}</small>
            </span>
            <span>→</span>
          </Link>
        ))}
        {!checks.length && <div className="empty">条件に一致する記録はありません。</div>}
      </div>
    </>
  );
}

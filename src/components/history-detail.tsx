"use client";
import Link from "next/link";
import { useApp } from "./app-provider";
import { kindLabel } from "@/lib/types";
import { csv, csvFilename, downloadCsv } from "@/lib/csv";
import { Photo } from "./photo";
import { HandoverCard } from "./handover-card";

export function HistoryDetail({ id }: { id: string }) {
  const { data } = useApp();
  if (!data) return null;
  const check = data.checks.find((c) => c.id === id);
  if (!check)
    return (
      <div className="empty">
        <h1>見つかりません</h1>
        <Link href="/history">記録一覧へ戻る</Link>
      </div>
    );
  const store = data.stores.find((s) => s.id === check.storeId)!;
  return (
    <>
      <Link href="/history" className="back-link no-print">
        ← 記録一覧
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {store.name} · {check.date} 営業日
          </p>
          <h1>{kindLabel[check.kind]}の記録</h1>
          <p>デモ用の架空データです · 日本時間（JST）</p>
        </div>
        <div className="row wrap no-print">
          <button className="button secondary" onClick={() => window.print()}>
            印刷
          </button>
          <button
            className="button"
            onClick={() =>
              downloadCsv(
                csv([check], data.stores),
                csvFilename(check.date, check.date, check, store),
              )
            }
          >
            CSV
          </button>
        </div>
      </div>
      <div className="panel">
        <h2>{check.completedAt ? "✓ 完了・ロック済み" : "未完了の記録"}</h2>
        <p>
          実施可能：{check.availableAt} ／ 締め：{check.deadline}
        </p>
        <p>
          完了：{check.completedAt || "—"} ／ 担当：{check.completedBy || "—"}
        </p>
        <p className="preserve">{check.note}</p>
        {!check.completedAt && (
          <Link className="button no-print" href={`/check/${id}`}>
            チェックを実施する
          </Link>
        )}
        <h3>担当者の履歴</h3>
        {check.changes.length ? (
          check.changes.map((c, i) => (
            <p key={i}>
              {i === 0 ? "開始" : "交代"}：{c.actor} · {c.at}
            </p>
          ))
        ) : (
          <p>未着手です。</p>
        )}
      </div>
      <section className="history-items">
        {check.items.map((item) => (
          <article className="panel" key={item.id}>
            <div className="row between wrap">
              <h3>{item.title}</h3>
              <span className={`badge ${item.status === "ok" ? "green" : "neutral"}`}>
                {
                  { pending: "未完了", ok: "OK", issue: "要対応", handover: "申し送り" }[
                    item.status
                  ]
                }
              </span>
            </div>
            <p className="small muted">
              {item.category} · {item.required ? "必須" : "任意"}
            </p>
            {item.value && (
              <p>
                確認結果：{item.value} {item.unit}
              </p>
            )}
            <p className="preserve">{item.comment}</p>
            <p className="audit">
              {item.actor || "未確認"} {item.at}
            </p>
            <div className="photos">
              {item.photos.map((id) => (
                <Photo key={id} id={id} />
              ))}
            </div>
          </article>
        ))}
      </section>
      <section>
        <h2>この記録からの申し送り</h2>
        <div className="handover-grid">
          {data.handovers
            .filter((h) => h.sourceId === id)
            .map((h) => (
              <HandoverCard key={h.id} handover={h} />
            ))}
        </div>
      </section>
    </>
  );
}

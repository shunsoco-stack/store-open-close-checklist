"use client";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./app-provider";
import { Icon } from "./icon";
import { businessDate, addDays, eventAt } from "@/lib/dates";
import { overdue, progress } from "@/lib/checklist";
import { kindLabel } from "@/lib/types";
import { carryDays } from "@/lib/handover";

export function Today() {
  const { data, now } = useApp();
  const [filter, setFilter] = useState("all");
  if (!data) return null;
  const todayChecks = data.checks.filter(
    (c) => c.date === businessDate(now, data.stores.find((s) => s.id === c.storeId)!.rollover),
  );
  const late = todayChecks.filter((c) => overdue(c, now));
  const unread = data.handovers.filter((h) => h.status === "unread");
  const completed = todayChecks.filter((c) => c.completedAt).length;
  const totalDone = todayChecks.reduce((sum, c) => sum + progress(c).done, 0);
  const total = todayChecks.reduce((sum, c) => sum + c.items.length, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAILY CHECKLIST</p>
          <h1>今日のチェック</h1>
          <p className="muted">一つずつ確認して、安心して次の担当者へ。</p>
        </div>
        <div className="date-chip">
          <Icon name="today" />
          <span>
            {businessDate(now)}
            <small>営業日 · 現在 {now.slice(11)}</small>
          </span>
        </div>
      </div>
      <div className="overview">
        <div className="overview-main">
          <span className="overview-icon">
            <Icon name="sun" size={30} />
          </span>
          <div>
            <h2>今日も、気持ちのいい一日に。</h2>
            <p>開店前の準備から、最後の施錠まで。お店の一日を見守ります。</p>
          </div>
        </div>
        <div className="overview-progress">
          <strong>
            {completed}
            <span> / {todayChecks.length}</span>
          </strong>
          <span>チェック完了</span>
        </div>
      </div>
      <div className="stats">
        <div>
          <span>チェックした項目</span>
          <strong>
            {totalDone}
            <small> / {total}</small>
          </strong>
          <div className="mini-track">
            <i style={{ width: `${total ? (totalDone / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div>
          <span>未確認の申し送り</span>
          <strong>
            {unread.length}
            <small> 件</small>
          </strong>
          <Link href="/handover">内容を確認する ↗</Link>
        </div>
        <div>
          <span>締め時刻を過ぎたチェック</span>
          <strong className={late.length ? "danger-text" : ""}>
            {late.length}
            <small> 件</small>
          </strong>
          <span className="muted">必須項目の未実施を確認</span>
        </div>
      </div>
      {late.length > 0 && (
        <div className="alert" role="alert">
          <strong>！ 未実施の警告</strong>
          <span>
            {late
              .map(
                (c) => `${data.stores.find((s) => s.id === c.storeId)?.name}の${kindLabel[c.kind]}`,
              )
              .join("、")}
            ：締め時刻を過ぎています。必須項目を確認してください。
          </span>
        </div>
      )}
      <section>
        <div className="section-heading">
          <h2>
            店舗のチェック <span className="count">3店舗</span>
          </h2>
          <div className="segmented">
            <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>
              すべて
            </button>
            <button
              className={filter === "pending" ? "selected" : ""}
              onClick={() => setFilter("pending")}
            >
              未完了
            </button>
          </div>
        </div>
        <div className="store-grid">
          {data.stores.map((store, index) => {
            const checks = todayChecks.filter(
              (c) => c.storeId === store.id && (filter === "all" || !c.completedAt),
            );
            if (!checks.length) return null;
            const date = businessDate(now, store.rollover);
            const nextOpen = eventAt(store, addDays(date, 1), "open");
            return (
              <article className="store-card" key={store.id}>
                <div className="store-title">
                  <span className={`store-symbol tone-${index}`}>
                    <Icon name="store" size={25} />
                  </span>
                  <div>
                    <h3>{store.name}</h3>
                    <p>
                      {store.description} · {store.open}–{store.close <= store.open ? "翌" : ""}
                      {store.close}
                    </p>
                  </div>
                  <span className="store-number">0{index + 1}</span>
                </div>
                <div className="store-meta">
                  営業日 {date}
                  {date !== now.slice(0, 10) && (
                    <span>
                      次の開店：
                      {nextOpen.slice(0, 10) === now.slice(0, 10)
                        ? "本日"
                        : nextOpen.slice(0, 10)}{" "}
                      {store.open}
                    </span>
                  )}
                </div>
                {checks.map((c) => {
                  const p = progress(c);
                  const planned = now < c.availableAt;
                  const badgeTone = c.completedAt ? "green" : planned ? "neutral" : "amber";
                  const status = c.completedAt
                    ? "完了"
                    : planned
                      ? "未着手（予定）"
                      : c.actor
                        ? "実施中"
                        : "未着手";
                  return (
                    <div className="check-preview" key={c.id}>
                      <div className="row between">
                        <h4>
                          <Icon name={c.kind === "open" ? "sun" : "moon"} />
                          {kindLabel[c.kind]}
                        </h4>
                        <span className={`badge ${badgeTone}`}>{status}</span>
                      </div>
                      <p className="deadline">
                        締め {c.deadline.slice(0, 10) > c.date ? "翌 " : ""}
                        {c.deadline.slice(11)}{" "}
                        <span>
                          {p.done} / {p.total} 項目
                        </span>
                      </p>
                      <div className="track">
                        <i style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                      </div>
                      <div className="preview-detail">
                        <span>
                          必須未完了 <b>{p.required}</b>
                        </span>
                        <span>要対応 {p.issues}</span>
                      </div>
                      <Link
                        className={`check-link ${planned ? "planned" : ""}`}
                        href={c.completedAt ? `/history/${c.id}` : `/check/${c.id}`}
                      >
                        {c.completedAt
                          ? "記録を見る"
                          : planned
                            ? `${c.availableAt.slice(11)}から実施できます`
                            : c.actor
                              ? "チェックを続ける"
                              : "チェックを始める"}
                        <Icon name="arrow" size={18} />
                      </Link>
                    </div>
                  );
                })}
              </article>
            );
          })}
        </div>
      </section>
      <section className="home-handovers">
        <div className="section-heading">
          <h2>
            <Icon name="handover" /> 次の担当者への申し送り{" "}
            <span className="count">未確認 {unread.length}</span>
          </h2>
          <Link href="/handover" className="text-link">
            すべて見る →
          </Link>
        </div>
        <div className="panel">
          {unread.length ? (
            unread.map((h) => (
              <Link href="/handover" className="handover-preview" key={h.id}>
                <span className="unread-dot" />
                <div>
                  <strong>{h.title}</strong>
                  <p>
                    {data.stores.find((s) => s.id === h.storeId)?.name} · {h.createdBy} ·{" "}
                    {h.createdAt}
                  </p>
                </div>
                <span className={`badge ${carryDays(h, now) >= 3 ? "red" : "neutral"}`}>
                  {carryDays(h, now)}日持ち越し
                </span>
                <Icon name="arrow" size={18} />
              </Link>
            ))
          ) : (
            <p className="empty">未確認の申し送りはありません。</p>
          )}
        </div>
      </section>
    </>
  );
}

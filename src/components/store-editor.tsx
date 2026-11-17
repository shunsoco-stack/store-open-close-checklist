"use client";
import { useState } from "react";
import type { Store } from "@/lib/types";
import { useApp } from "./app-provider";

export function StoreEditor({ store }: { store: Store }) {
  const { update, notify } = useApp();
  const [draft, setDraft] = useState(store);
  const [staff, setStaff] = useState(store.staff.join("\n"));
  const field = <K extends keyof Store>(key: K, value: Store[K]) =>
    setDraft({ ...draft, [key]: value });
  return (
    <form
      className="panel form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const names = [
          ...new Set(
            staff
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
        ];
        if (!names.length || !draft.name.trim()) {
          notify("店舗名と1名以上のスタッフを入力してください。");
          return;
        }
        update((d) => ({
          ...d,
          stores: d.stores.map((s) =>
            s.id === store.id
              ? { ...draft, templates: s.templates, staff: names, name: draft.name.trim() }
              : s,
          ),
        }));
        notify("店舗設定を保存しました。時刻の変更は次に生成される営業日から適用されます。");
      }}
    >
      <h2>営業時間・スタッフ</h2>
      <div className="form-grid">
        <label>
          店舗名
          <input
            required
            maxLength={40}
            value={draft.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          業態・説明
          <input
            maxLength={60}
            value={draft.description}
            onChange={(e) => field("description", e.target.value)}
          />
        </label>
      </div>
      <div className="form-grid">
        {(
          [
            ["open", "開店時刻"],
            ["close", "閉店時刻"],
            ["rollover", "営業日の切り替え"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="time"
              required
              value={draft[key]}
              onChange={(e) => field(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <p className="small muted">
        閉店時刻が開店時刻以前の場合は翌日です。切り替え時刻より前の時刻も翌日として扱います。
      </p>
      <div className="form-grid">
        {(
          [
            ["openBefore", "開店の何分前から実施可能"],
            ["closeBefore", "閉店の何分前から実施可能"],
            ["openDeadline", "開店の何分前が締め"],
            ["closeDeadline", "閉店の何分後が締め"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min="0"
              max="1440"
              required
              value={draft[key]}
              onChange={(e) => field(key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
      <label>
        スタッフ（1行に1名・架空の名前）
        <textarea required rows={4} value={staff} onChange={(e) => setStaff(e.target.value)} />
      </label>
      <p className="small muted">名前を変更しても過去の確認者名はそのまま残ります。</p>
      <button className="button" disabled={draft.openBefore < draft.openDeadline}>
        店舗設定を保存
      </button>
      {draft.openBefore < draft.openDeadline && (
        <p className="danger-text">開店チェックの実施開始は、締め時刻以前に設定してください。</p>
      )}
    </form>
  );
}

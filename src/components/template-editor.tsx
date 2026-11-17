"use client";
import { useState } from "react";
import type { TemplateItem } from "@/lib/types";
import { categories } from "@/lib/types";

export function TemplateEditor({
  item,
  onSave,
  onCancel,
}: {
  item: TemplateItem;
  onSave: (item: TemplateItem) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(item);
  const [options, setOptions] = useState(item.options.join("、"));
  const field = <K extends keyof TemplateItem>(key: K, value: TemplateItem[K]) =>
    setDraft({ ...draft, [key]: value });
  const choices = options
    .split(/[、,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const valid =
    draft.title.trim() &&
    draft.min <= draft.max &&
    (draft.type !== "select" || new Set(choices).size >= 2);
  return (
    <form
      className="panel editor form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ ...draft, title: draft.title.trim(), options: [...new Set(choices)] });
      }}
    >
      <h3>項目を編集</h3>
      <label>
        項目名
        <input
          required
          maxLength={100}
          value={draft.title}
          onChange={(e) => field("title", e.target.value)}
        />
      </label>
      <div className="form-grid">
        <label>
          カテゴリ
          <select
            value={draft.category}
            onChange={(e) => field("category", e.target.value as TemplateItem["category"])}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          種類
          <select
            value={draft.type}
            onChange={(e) => field("type", e.target.value as TemplateItem["type"])}
          >
            <option value="check">確認（チェックのみ）</option>
            <option value="number">数値</option>
            <option value="select">選択</option>
          </select>
        </label>
      </div>
      {draft.type === "number" && (
        <div className="form-grid">
          <label>
            最小値
            <input
              required
              type="number"
              step="any"
              value={draft.min}
              onChange={(e) => field("min", Number(e.target.value))}
            />
          </label>
          <label>
            最大値
            <input
              required
              type="number"
              step="any"
              value={draft.max}
              onChange={(e) => field("max", Number(e.target.value))}
            />
          </label>
          <label>
            単位
            <input
              maxLength={10}
              value={draft.unit}
              onChange={(e) => field("unit", e.target.value)}
            />
          </label>
        </div>
      )}
      {draft.type === "select" && (
        <label>
          選択肢（読点区切り・最初が正常の選択肢）
          <input required value={options} onChange={(e) => setOptions(e.target.value)} />
          <small>例：差異なし、差異あり。2種類以上必要です。</small>
        </label>
      )}
      <label className="inline-label">
        <input
          type="checkbox"
          checked={draft.required}
          onChange={(e) => field("required", e.target.checked)}
        />
        必須項目にする
      </label>
      <fieldset>
        <legend>実施する曜日（未選択なら毎日）</legend>
        <div className="weekdays">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={draft.weekdays.includes(index)}
                onChange={(e) =>
                  field(
                    "weekdays",
                    e.target.checked
                      ? [...draft.weekdays, index]
                      : draft.weekdays.filter((d) => d !== index),
                  )
                }
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>
      {!valid && <p className="warning-text">項目名・基準範囲・選択肢を確認してください。</p>}
      <div className="row">
        <button className="button" disabled={!valid}>
          保存
        </button>
        <button className="button secondary" type="button" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { categories, kindLabel } from "@/lib/types";
import type { Kind, TemplateItem } from "@/lib/types";
import { TemplateEditor } from "./template-editor";
import { StoreEditor } from "./store-editor";

export function TemplatesScreen() {
  const { data, update, notify } = useApp();
  const [storeId, setStoreId] = useState("aonagi");
  const [kind, setKind] = useState<Kind>("open");
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  if (!data) return null;
  const store = data.stores.find((s) => s.id === storeId)!;
  const items = store.templates[kind];
  function saveItems(next: TemplateItem[]) {
    update((d) => ({
      ...d,
      stores: d.stores.map((s) =>
        s.id === storeId ? { ...s, templates: { ...s.templates, [kind]: next } } : s,
      ),
    }));
  }
  function move(index: number, direction: number) {
    const target = moveTarget(index, direction);
    if (target === undefined) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    saveItems(next);
  }
  function moveTarget(index: number, direction: number): number | undefined {
    const group = items
      .map((item, position) => ({ item, position }))
      .filter(({ item }) => item.category === items[index].category)
      .map(({ position }) => position);
    return group[group.indexOf(index) + direction];
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE SETTINGS</p>
          <h1>店舗・テンプレート設定</h1>
          <p className="muted">お店ごとの、いつもの確認を整えましょう。</p>
        </div>
      </div>
      <div className="panel filters">
        <label>
          編集する店舗
          <select
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setEditing(null);
            }}
          >
            {data.stores.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">{store.description}</span>
      </div>
      <details className="settings-details">
        <summary>営業時間・スタッフの設定</summary>
        <StoreEditor key={storeId} store={store} />
      </details>
      <div className="section-heading">
        <div className="segmented">
          {(["open", "close"] as const).map((k) => (
            <button
              className={kind === k ? "selected" : ""}
              key={k}
              onClick={() => {
                setKind(k);
                setEditing(null);
              }}
            >
              {kindLabel[k]}
            </button>
          ))}
        </div>
        <button
          className="button"
          onClick={() =>
            setEditing({
              id: crypto.randomUUID(),
              title: "",
              category: "その他",
              type: "check",
              required: true,
              weekdays: [],
              min: 0,
              max: 5,
              unit: "",
              options: ["差異なし", "差異あり"],
            })
          }
        >
          ＋ 項目追加
        </button>
      </div>
      <div className="notice">
        変更は次に生成される営業日から適用されます。今日と過去の記録は保持されます。
      </div>
      {editing && (
        <TemplateEditor
          key={editing.id}
          item={editing}
          onCancel={() => setEditing(null)}
          onSave={(item) => {
            saveItems(
              items.some((i) => i.id === item.id)
                ? items.map((i) => (i.id === item.id ? item : i))
                : [...items, item],
            );
            setEditing(null);
            notify("テンプレートを保存しました。");
          }}
        />
      )}
      <div className="panel template-list">
        {categories.map((category) => {
          if (!items.some((item) => item.category === category)) return null;
          return (
            <section key={category}>
              <h3 className="category-heading">{category}</h3>
              {items.map(
                (item, index) =>
                  item.category === category && (
                    <div key={item.id} className="template-row">
                      <span className="muted">{String(index + 1).padStart(2, "0")}</span>
                      <div className="template-description">
                        <span className="small muted">
                          {item.category} ·{" "}
                          {{ check: "確認", number: "数値", select: "選択" }[item.type]} ·{" "}
                          {item.required ? "必須" : "任意"}
                        </span>
                        <h3>{item.title}</h3>
                        <span className="small muted">
                          {item.weekdays.length
                            ? item.weekdays.map((d) => "日月火水木金土"[d]).join("・") + "曜のみ"
                            : "毎日"}
                          {item.type === "number" && ` · ${item.min}〜${item.max}${item.unit}`}
                        </span>
                      </div>
                      <div className="row wrap template-actions">
                        <button
                          aria-label={`${item.title}を上に移動`}
                          disabled={moveTarget(index, -1) === undefined}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          aria-label={`${item.title}を下に移動`}
                          disabled={moveTarget(index, 1) === undefined}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </button>
                        <button onClick={() => setEditing(item)}>編集</button>
                        <button
                          className="danger-text"
                          disabled={items.length <= 1}
                          onClick={() => {
                            if (window.confirm(`「${item.title}」をテンプレートから削除しますか？`))
                              saveItems(items.filter((i) => i.id !== item.id));
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ),
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

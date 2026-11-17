"use client";
import { useState } from "react";
import type { Check, Item, Store } from "@/lib/types";
import { outOfRange, recordItem } from "@/lib/checklist";
import { japanNow } from "@/lib/dates";
import { savePhoto, deletePhoto } from "@/lib/photos";
import { useApp } from "./app-provider";
import { HandoverForm } from "./handover-form";
import { Photo } from "./photo";

export function CheckItem({
  item,
  check,
  store,
  index,
  disabled,
}: {
  item: Item;
  check: Check;
  store: Store;
  index: number;
  disabled: boolean;
}) {
  const { update, notify } = useApp();
  const [value, setValue] = useState(item.value);
  const [comment, setComment] = useState(item.comment);
  const [handover, setHandover] = useState(false);
  const [busy, setBusy] = useState(false);
  const rangeWarning = outOfRange(item, value);
  const badgeTone =
    item.status === "ok" ? "green" : item.status === "pending" ? "neutral" : "amber";
  const choiceWarning = item.type === "select" && value !== "" && value !== item.options[0];
  function save(status: Item["status"]) {
    if (status === "issue" && !comment.trim()) {
      notify("要対応の理由をコメントに入力してください。");
      return;
    }
    const at = japanNow();
    update((d) => ({
      ...d,
      checks: d.checks.map((c) =>
        c.id === check.id ? recordItem(c, item.id, { status, value, comment }, at) : c,
      ),
    }));
  }
  return (
    <article className={`panel item-card status-${item.status}`}>
      <div className="row between">
        <span className="small muted">
          {String(index + 1).padStart(2, "0")} · {item.category}
        </span>
        <span className={`badge ${badgeTone}`}>
          {{ pending: "未完了", ok: "✓ OK", issue: "要対応", handover: "申し送り" }[item.status]}
        </span>
      </div>
      <h3>
        {item.title} <span className="required-label">{item.required ? "必須" : "任意"}</span>
      </h3>
      <fieldset disabled={disabled || busy}>
        {item.type === "number" && (
          <label>
            数値（{item.unit}）
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <small>
              基準範囲：{item.min}〜{item.max} {item.unit}
            </small>
          </label>
        )}
        {item.type === "select" && (
          <label>
            確認結果
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">選択してください</option>
              {item.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        )}
        {((item.type === "number" && value !== "" && rangeWarning) || choiceWarning) && (
          <p className="warning-text">基準外の結果です。「要対応」として理由を残してください。</p>
        )}
        <label className="comment-label">
          コメント（要対応の場合は必須）
          <textarea
            rows={2}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="気づいたことや、対応が必要な理由"
          />
        </label>
        <div className="item-actions">
          <button
            className="button ok-button"
            disabled={rangeWarning || choiceWarning || (item.type === "select" && !value)}
            onClick={() => save("ok")}
          >
            ✓ OK
          </button>
          <button className="button issue-button" onClick={() => save("issue")}>
            ！ 要対応
          </button>
          <button className="button secondary" onClick={() => setHandover(!handover)}>
            申し送る
          </button>
        </div>
        <label className="file-label">
          ＋ 写真を添付（最大2枚）
          <input
            type="file"
            accept="image/*"
            disabled={item.photos.length >= 2 || busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || item.photos.length >= 2) return;
              setBusy(true);
              try {
                const id = await savePhoto(file);
                update((d) => ({
                  ...d,
                  checks: d.checks.map((c) =>
                    c.id === check.id
                      ? recordItem(c, item.id, { photos: [...item.photos, id] }, japanNow())
                      : c,
                  ),
                }));
              } catch (error) {
                notify(String(error));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {busy && <p role="status">写真を縮小して保存しています…</p>}
      </fieldset>
      <div className="photos">
        {item.photos.map((id) => (
          <div key={id}>
            <Photo id={id} />
            {!disabled && (
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await deletePhoto(id);
                    update((d) => ({
                      ...d,
                      checks: d.checks.map((c) =>
                        c.id === check.id
                          ? recordItem(
                              c,
                              item.id,
                              { photos: item.photos.filter((p) => p !== id) },
                              japanNow(),
                            )
                          : c,
                      ),
                    }));
                  } catch (error) {
                    notify(String(error));
                  }
                }}
              >
                写真を削除
              </button>
            )}
          </div>
        ))}
      </div>
      {item.at && (
        <p className="audit">
          確認：{item.actor} · {item.at}（日本時間）
        </p>
      )}
      {handover && !disabled && (
        <HandoverForm
          store={store}
          check={check}
          item={{
            ...item,
            value,
            comment,
            hadIssue: item.hadIssue || (value !== "" && rangeWarning) || choiceWarning,
          }}
          onDone={() => setHandover(false)}
        />
      )}
    </article>
  );
}

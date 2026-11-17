"use client";
import { useState } from "react";
import { createHandover } from "@/lib/handover";
import { japanNow } from "@/lib/dates";
import { recordItem } from "@/lib/checklist";
import { targetLabel } from "@/lib/types";
import type { Check, Item, Store, Handover } from "@/lib/types";
import { useApp } from "./app-provider";

export function HandoverForm({
  store,
  check,
  item,
  onDone,
}: {
  store: Store;
  check?: Check;
  item?: Item;
  onDone?: () => void;
}) {
  const { update } = useApp();
  const [title, setTitle] = useState(item?.title || "");
  const [reason, setReason] = useState(item?.comment || "");
  const [target, setTarget] = useState<Handover["target"]>("open");
  const [person, setPerson] = useState("");
  const actor = check?.actor || person;
  return (
    <form
      className="form-stack inset"
      onSubmit={(e) => {
        e.preventDefault();
        if (!actor || !reason.trim() || !title.trim() || check?.completedAt) return;
        const now = japanNow();
        const h = createHandover(
          {
            id: crypto.randomUUID(),
            storeId: store.id,
            sourceId: check?.id || "",
            itemId: item?.id || "",
            title: title.trim(),
            reason: reason.trim(),
            target,
          },
          actor,
          now,
        );
        update((d) => ({
          ...d,
          handovers: [...d.handovers, h],
          checks: d.checks.map((c) =>
            c.id === check?.id && item
              ? recordItem(
                  c,
                  item.id,
                  {
                    status: "handover",
                    comment: reason.trim(),
                    value: item.value,
                    hadIssue: item.hadIssue,
                  },
                  now,
                )
              : c,
          ),
        }));
        setTitle("");
        setReason("");
        onDone?.();
      }}
    >
      <h3>{item ? "この項目を申し送る" : "申し送りを追加"}</h3>
      {!check && (
        <label>
          担当者
          <select required value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">選択してください</option>
            {store.staff.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        件名
        <input required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        理由・次の担当者に伝えること
        <textarea
          required
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <label>
        宛先
        <select value={target} onChange={(e) => setTarget(e.target.value as Handover["target"])}>
          {Object.entries(targetLabel).map(([key, label]) => (
            <option key={key} value={key}>
              {key === "manager" ? label : `次の${label}`}
            </option>
          ))}
        </select>
      </label>
      <button className="button" disabled={!actor}>
        申し送りに保存
      </button>
    </form>
  );
}

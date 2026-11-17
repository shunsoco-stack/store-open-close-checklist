import { kindLabel } from "./types.ts";
import type { Check, Store } from "./types.ts";

function escape(value: string): string {
  const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csv(checks: Check[], stores: Store[]): string {
  const rows = [
    [
      "営業日",
      "店舗",
      "種類",
      "項目",
      "状態",
      "値",
      "担当者",
      "確認日時（日本時間）",
      "コメント",
      "完了者",
      "完了日時",
      "ひとこと",
    ],
  ];
  checks.forEach((c) =>
    c.items.forEach((i) =>
      rows.push([
        c.date,
        stores.find((s) => s.id === c.storeId)?.name || c.storeId,
        kindLabel[c.kind],
        i.title,
        { pending: "未完了", ok: "OK", issue: "要対応", handover: "申し送り" }[i.status],
        i.value,
        i.actor,
        i.at,
        i.comment,
        c.completedBy,
        c.completedAt,
        c.note,
      ]),
    ),
  );
  return "\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n");
}
export function csvFilename(from: string, to: string, check?: Check, store?: Store): string {
  return check && store
    ? `${kindLabel[check.kind]}_${store.name}_${check.date}.csv`
    : `開店閉店チェック_${from}_${to}.csv`;
}
export function downloadCsv(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

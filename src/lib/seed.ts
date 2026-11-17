import { addDays, addMinutes, businessDate } from "./dates.ts";
import { createCheck, incoming } from "./checklist.ts";
import { createHandover, transition } from "./handover.ts";
import { seedStores } from "./seed-templates.ts";
import { historyScenario } from "./seed-history.ts";
import type { Data } from "./types.ts";

export function seed(now: string): Data {
  const stores = seedStores();
  const data: Data = { version: 1, stores, checks: [], handovers: [] };
  for (const store of stores) {
    const today = businessDate(now, store.rollover);
    for (let ago = 14; ago >= 0; ago--) {
      for (const kind of ["open", "close"] as const) {
        const check = createCheck(store, addDays(today, -ago), kind);
        const scenario = historyScenario(store.id, ago, kind);
        const finish = addMinutes(check.deadline, ago === 3 ? 18 : -15);
        const keepInProgress =
          ago === 0 &&
          ((store.id === "aonagi" && kind === "close") ||
            (store.id === "minato" && kind === "open"));
        if (!keepInProgress && finish < now && ago !== 7) {
          check.actor = store.staff[scenario.staffIndex];
          check.changes = [{ actor: check.actor, at: check.availableAt }];
          if (ago === 4) {
            check.changes.push({ actor: store.staff[0], at: addMinutes(check.availableAt, 5) });
            check.actor = store.staff[0];
          }
          check.items = check.items.map((item, i) => ({
            ...item,
            status: "ok",
            value: item.type === "number" ? "3" : item.type === "select" ? "差異なし" : "",
            actor: i < 2 ? check.changes[0].actor : check.actor,
            at: addMinutes(finish, -check.items.length + i),
          }));
          check.completedAt = finish;
          check.completedBy = check.actor;
          check.note = scenario.note;
        } else if (ago === 0 && addMinutes(check.availableAt, 5) < now) {
          check.actor = store.staff[0];
          check.changes = [{ actor: check.actor, at: check.availableAt }];
          check.items[0] = {
            ...check.items[0],
            status: "ok",
            actor: check.actor,
            at: addMinutes(check.availableAt, 2),
          };
        }
        data.checks.push(check);
      }
    }
  }
  const examples = [
    {
      store: 0,
      ago: 4,
      title: "テーブル脚の拭き上げ",
      reason: "閉店時に間に合いませんでした。開店前にお願いします。",
      target: "open",
      state: "unread",
    },
    {
      store: 1,
      ago: 1,
      title: "入口マットの乾燥",
      reason: "洗浄したマットを乾燥中です。設置前に確認してください。",
      target: "open",
      state: "unread",
    },
    {
      store: 2,
      ago: 2,
      title: "テラス席の片付け",
      reason: "雨が降り始めたため、椅子を奥に移動しています。",
      target: "close",
      state: "read",
    },
    {
      store: 0,
      ago: 2,
      title: "冷蔵庫の温度が高め",
      reason: "扉を閉めて再確認をお願いします。サンプル画像を添付しました。",
      target: "manager",
      state: "read",
    },
    {
      store: 1,
      ago: 3,
      title: "清潔なタオルの配置",
      reason: "乾燥後のタオルを配置してください。",
      target: "open",
      state: "done",
    },
    {
      store: 2,
      ago: 5,
      title: "明日は配管業者が来店",
      reason: "店長への連絡メモです。入口で案内をお願いします。",
      target: "manager",
      state: "done",
    },
  ] as const;
  examples.forEach((example, i) => {
    const store = stores[example.store];
    const date = addDays(businessDate(now, store.rollover), -example.ago);
    const source = data.checks.find(
      (c) => c.storeId === store.id && c.date === date && c.kind === "close",
    )!;
    const at = source.completedAt || addMinutes(source.availableAt, 5);
    let h = createHandover(
      {
        id: `sample-h-${i}`,
        storeId: store.id,
        sourceId: source.id,
        itemId: i === 5 ? "" : source.items[i === 3 ? 1 : 0].id,
        title: example.title,
        reason: example.reason,
        target: example.target,
      },
      store.staff[0],
      at,
    );
    if (example.state !== "unread") h = transition(h, "read", store.staff[1], addMinutes(at, 10));
    if (example.state === "done") h = transition(h, "done", store.staff[1], addMinutes(at, 20));
    data.handovers.push(h);
    if (i !== 5) {
      const item = source.items[i === 3 ? 1 : 0];
      item.status = i === 3 ? "issue" : "handover";
      item.comment = example.reason;
      if (i === 3) {
        item.hadIssue = true;
        item.value = "8";
        item.photos = ["sample-fridge"];
      }
    }
  });
  // Unacknowledged incoming notes also prevent demo records from being locked.
  data.checks.forEach((check) => {
    if (incoming(check, data.handovers).some((h) => h.status === "unread")) {
      check.completedAt = "";
      check.completedBy = "";
      check.note = "";
    }
  });
  return data;
}

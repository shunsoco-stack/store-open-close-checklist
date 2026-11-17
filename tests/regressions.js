import test from "node:test";
import assert from "node:assert/strict";
import { seed } from "../src/lib/seed.ts";
import { createCheck, incoming, progress, recordItem } from "../src/lib/checklist.ts";
import { seedStores } from "../src/lib/seed-templates.ts";
import { summarize } from "../src/lib/summary.ts";
import { transition } from "../src/lib/handover.ts";
import { validateData } from "../src/lib/storage.ts";

const now = "2026-11-18 12:00";
test("要対応を申し送りにしても集計に残る", () => {
  let check = createCheck(seedStores()[0], "2026-11-18", "open");
  check.actor = "小野 花";
  const id = check.items[0].id;
  check = recordItem(check, id, { status: "issue", comment: "確認が必要" }, now);
  check = recordItem(check, id, { status: "handover" }, now);
  assert.equal(progress(check).issues, 1);
  assert.equal(summarize([check], now).issues[check.items[0].title], 1);
});
test("単なる未完了の申し送りは要対応回数に含めない", () => {
  const check = createCheck(seedStores()[0], "2026-11-18", "open");
  check.items[0].status = "handover";
  check.items[0].comment = "次の担当者へ";
  assert.deepEqual(summarize([check], now).issues, {});
});
test("確認済みの再受領で監査情報を書き換えない", () => {
  const h = seed(now).handovers.find((h) => h.status === "read");
  assert.equal(transition(h, "read", "別の人", now), h);
});
test("受領より前の時刻に対応済みにしない", () => {
  const h = seed(now).handovers.find((h) => h.status === "read");
  assert.equal(transition(h, "done", "別の人", h.createdAt), h);
});
test("シードの完了記録に未確認の受領対象を残さない", () => {
  const data = seed(now);
  data.checks
    .filter((c) => c.completedAt)
    .forEach((check) => {
      assert.ok(incoming(check, data.handovers).every((h) => h.status !== "unread"));
    });
});
test("存在しない申し送り元の参照を破損と判定", () => {
  const data = seed(now);
  data.handovers[0].sourceId = "missing";
  assert.equal(validateData(data), false);
});
test("未完了必須項目のあるロック済み記録を破損と判定", () => {
  const data = seed(now);
  const check = data.checks.find((c) => c.completedAt);
  check.items[0].status = "pending";
  assert.equal(validateData(data), false);
});
test("実施可能時刻より前の確認実績を破損と判定", () => {
  const data = seed(now);
  data.checks[0].items[0].at = "2000-01-01 00:00";
  assert.equal(validateData(data), false);
});

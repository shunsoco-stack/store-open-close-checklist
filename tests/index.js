import test from "node:test";
import "./regressions.js";
import assert from "node:assert/strict";
import {
  japanNow,
  businessDate,
  addDays,
  addMinutes,
  eventAt,
  timing,
  weekday,
} from "../src/lib/dates.ts";
import {
  createCheck,
  outOfRange,
  progress,
  overdue,
  incoming,
  canComplete,
  recordItem,
  ensureToday,
} from "../src/lib/checklist.ts";
import { createHandover, transition, carryDays } from "../src/lib/handover.ts";
import { summarize } from "../src/lib/summary.ts";
import { seed } from "../src/lib/seed.ts";
import { seedStores } from "../src/lib/seed-templates.ts";
import { validateData, restore } from "../src/lib/storage.ts";
import { csv, csvFilename } from "../src/lib/csv.ts";

const stores = seedStores();
const store = stores[0];
const date = "2026-11-18";
const now = `${date} 12:00`;
const make = () => createCheck(store, date, "open");
const handover = () =>
  createHandover(
    {
      id: "h",
      storeId: store.id,
      sourceId: "previous",
      itemId: "",
      title: "清掃",
      reason: "次の担当へ",
      target: "open",
    },
    "小野 花",
    "2026-11-17 21:00",
  );

test("日本時間へ変換する", () =>
  assert.equal(japanNow(new Date("2026-11-17T16:20:00Z")), "2026-11-18 01:20"));
test("0時台は前営業日", () => assert.equal(businessDate(`${date} 00:20`), "2026-11-17"));
test("04:59は前営業日", () => assert.equal(businessDate(`${date} 04:59`), "2026-11-17"));
test("05:00は当営業日", () => assert.equal(businessDate(`${date} 05:00`), date));
test("店舗独自の切り替え時刻", () =>
  assert.equal(businessDate(`${date} 06:29`, "06:30"), "2026-11-17"));
test("年末を越える日付加算", () => assert.equal(addDays("2026-12-31", 1), "2027-01-01"));
test("うるう年の月末", () => assert.equal(addDays("2028-03-01", -1), "2028-02-29"));
test("深夜を越える分加算", () => assert.equal(addMinutes(`${date} 23:50`, 20), "2026-11-19 00:10"));
test("深夜閉店は翌日", () => assert.equal(eventAt(stores[2], date, "close"), "2026-11-19 01:00"));
test("通常閉店は同日", () => assert.equal(eventAt(store, date, "close"), `${date} 20:00`));
test("開店実施可能時刻と締め", () =>
  assert.deepEqual(timing(store, date, "open"), {
    availableAt: `${date} 07:00`,
    deadline: `${date} 07:50`,
  }));
test("深夜閉店の実施可能時刻と締め", () =>
  assert.deepEqual(timing(stores[2], date, "close"), {
    availableAt: "2026-11-19 00:30",
    deadline: "2026-11-19 02:00",
  }));
test("月曜の曜日指定項目", () => {
  const c = createCheck(store, "2026-11-16", "open");
  assert.equal(weekday(c.date), 1);
  assert.equal(c.items.length, 13);
});
test("月曜以外は週次項目を除外", () => assert.equal(make().items.length, 12));
test("テンプレートと記録の状態を分離", () => {
  const c = make();
  c.items[0].title = "変更";
  assert.notEqual(store.templates.open[0].title, "変更");
});
test("数値の下限を許可", () => assert.equal(outOfRange(make().items[1], "0"), false));
test("数値の上限を許可", () => assert.equal(outOfRange(make().items[1], "5"), false));
test("範囲外を警告", () => assert.equal(outOfRange(make().items[1], "6"), true));
test("空値は数値の正常確認不可", () => assert.equal(outOfRange(make().items[1], ""), true));
test("数値でない文字は警告", () => assert.equal(outOfRange(make().items[1], "abc"), true));
test("進捗と任意項目の扱い", () => {
  const c = make();
  c.items[0].status = "issue";
  assert.deepEqual(progress(c), { total: 12, done: 1, issues: 1, required: 10 });
});
test("締め時刻後は未実施警告", () => assert.equal(overdue(make(), now), true));
test("締め時刻ちょうどは超過ではない", () => assert.equal(overdue(make(), `${date} 07:50`), false));
test("必須完了後は未実施警告なし", () => {
  const c = make();
  c.items.forEach((i) => (i.status = "ok"));
  assert.equal(overdue(c, now), false);
});
test("担当者未選択では更新不可", () => {
  const c = make();
  assert.equal(recordItem(c, c.items[0].id, { status: "ok" }, now), c);
});
test("実施可能時刻前は更新不可", () => {
  const c = make();
  c.actor = "小野 花";
  assert.equal(recordItem(c, c.items[0].id, { status: "ok" }, `${date} 06:59`), c);
});
test("確認者と確認時刻を記録", () => {
  const c = make();
  c.actor = "小野 花";
  const r = recordItem(c, c.items[0].id, { status: "ok" }, now);
  assert.equal(r.items[0].actor, c.actor);
  assert.equal(r.items[0].at, now);
});
test("ロック済み記録の更新不可", () => {
  const c = make();
  c.actor = "小野 花";
  c.completedAt = now;
  assert.equal(recordItem(c, c.items[0].id, { status: "ok" }, now), c);
});
test("必須未完了があれば完了不可", () => {
  const c = make();
  c.actor = "小野 花";
  assert.equal(canComplete(c, [], now), false);
});
test("必須を申し送りにしたら完了可能", () => {
  const c = make();
  c.actor = "小野 花";
  c.items.filter((i) => i.required).forEach((i) => (i.status = "handover"));
  assert.equal(canComplete(c, [], now), true);
});
test("未確認申し送りがあれば完了不可", () => {
  const c = make();
  c.actor = "小野 花";
  c.items.forEach((i) => (i.status = "ok"));
  assert.equal(canComplete(c, [handover()], now), false);
});
test("申し送り受領後に完了可能", () => {
  const c = make();
  c.actor = "小野 花";
  c.items.forEach((i) => (i.status = "ok"));
  assert.equal(canComplete(c, [transition(handover(), "read", "高瀬 悠", now)], now), true);
});
test("自分が作成した申し送りは受領対象外", () => {
  const h = handover();
  h.sourceId = make().id;
  assert.equal(incoming(make(), [h]).length, 0);
});
test("宛先の異なる申し送りは受領対象外", () => {
  const h = handover();
  h.target = "close";
  assert.equal(incoming(make(), [h]).length, 0);
});
test("申し送り理由は必須", () =>
  assert.throws(() => createHandover({ ...handover(), reason: " " }, "小野 花", now)));
test("受領前の対応済みは禁止", () => {
  const h = handover();
  assert.equal(transition(h, "done", "高瀬 悠", now), h);
});
test("受領者と時刻を記録", () => {
  const h = transition(handover(), "read", "高瀬 悠", now);
  assert.equal(h.acknowledgedBy, "高瀬 悠");
  assert.equal(h.acknowledgedAt, now);
});
test("対応者と時刻を記録", () => {
  const h = transition(transition(handover(), "read", "高瀬 悠", now), "done", "森田 澪", now);
  assert.equal(h.resolvedBy, "森田 澪");
  assert.equal(h.resolvedAt, now);
});
test("持ち越し日数", () => assert.equal(carryDays(handover(), "2026-11-20 01:00"), 3));
test("実施率の分母から予定を除外", () => {
  const c = make();
  c.completedAt = `${date} 07:40`;
  const future = createCheck(store, "2026-11-19", "open");
  assert.equal(summarize([c, future], now).rate, 100);
});
test("深夜完了をまたぐ平均時刻", () => {
  const a = make();
  a.completedAt = `${date} 23:30`;
  const b = make();
  b.completedAt = "2026-11-19 00:30";
  assert.equal(summarize([a, b], "2026-11-19 02:00").average, "翌00:00");
});
test("項目別要対応回数", () => {
  const c = make();
  c.items[1].status = "issue";
  assert.equal(summarize([c, c], now).issues[c.items[1].title], 2);
});
test("CSVはBOM付き・改行と引用符をエスケープ", () => {
  const c = make();
  c.items[0].comment = '改行\n"引用",値';
  const result = csv([c], stores);
  assert.ok(result.startsWith("\uFEFF"));
  assert.ok(result.includes('"改行\n""引用"",値"'));
});
test("CSVの数式を無効化", () => {
  const c = make();
  c.items[0].comment = "=1+1";
  assert.ok(csv([c], stores).includes("'=1+1"));
});
test("期間CSVのファイル名", () =>
  assert.equal(csvFilename("2026-11-01", date), "開店閉店チェック_2026-11-01_2026-11-18.csv"));
test("1回CSVのファイル名", () =>
  assert.equal(csvFilename(date, date, make(), store), "開店チェック_青凪店_2026-11-18.csv"));
test("シード保存データの検証", () => assert.equal(validateData(seed(now)), true));
test("破損JSONは通知付きで初期化", () => {
  const r = restore("{", now);
  assert.equal(r.recovered, true);
  assert.equal(validateData(r.data), true);
});
test("初回生成は破損通知なし", () => assert.equal(restore(null, now).recovered, false));
test("配列内部の破損を検出", () => {
  const d = seed(now);
  d.checks[0].items[0].photos = null;
  assert.equal(validateData(d), false);
});
test("存在しない店舗への参照を検出", () => {
  const d = seed(now);
  d.checks[0].storeId = "missing";
  assert.equal(validateData(d), false);
});
test("日付の不正を検出", () => {
  const d = seed(now);
  d.checks[0].date = "2026-02-30";
  assert.equal(validateData(d), false);
});
test("新しい営業日の項目を生成", () => {
  const d = seed(now);
  const next = ensureToday(d, "2026-11-19 06:00");
  assert.equal(next.checks.length, d.checks.length + 6);
});
test("当日項目は重複生成しない", () => {
  const d = seed(now);
  assert.equal(ensureToday(d, now), d);
});

const seedTimes = [
  "2026-11-18 00:00",
  "2026-11-18 00:40",
  "2026-11-18 01:20",
  "2026-11-18 04:59",
  "2026-11-18 05:00",
  "2026-11-18 06:40",
  "2026-11-18 07:00",
  "2026-11-18 08:00",
  "2026-11-18 12:00",
  "2026-11-18 18:40",
  "2026-11-18 19:59",
  "2026-11-18 20:30",
  "2026-11-18 23:59",
  "2026-11-30 23:59",
  "2026-12-31 23:59",
  "2027-01-01 00:10",
  "2027-01-01 05:00",
  "2028-03-01 00:01",
];
for (const current of seedTimes) {
  test(`シードの時刻整合性：${current}`, () => {
    const d = seed(current);
    assert.equal(validateData(d), true);
    assert.equal(d.stores.length, 3);
    assert.equal(d.handovers.length, 6);
    for (const s of d.stores) {
      for (const kind of ["open", "close"]) assert.ok(s.templates[kind].length >= 12);
    }
    for (const c of d.checks) {
      const stamps = [
        c.completedAt,
        ...c.changes.map((x) => x.at),
        ...c.items.map((i) => i.at),
      ].filter(Boolean);
      assert.ok(
        stamps.every((t) => t < current),
        `${c.id}: future event`,
      );
      assert.ok(
        stamps.every((t) => t >= c.availableAt),
        `${c.id}: before availability`,
      );
      if (c.availableAt >= current) {
        assert.equal(c.completedAt, "");
        assert.equal(c.actor, "");
        assert.ok(c.items.every((i) => i.status === "pending"));
      }
    }
    for (const h of d.handovers) {
      assert.ok(
        [h.createdAt, h.acknowledgedAt, h.resolvedAt].filter(Boolean).every((t) => t < current),
      );
    }
  });
}

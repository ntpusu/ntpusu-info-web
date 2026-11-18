// 檢查法定席次的解析與比對（stureps.ts 的 parseSeatQuota／describeSeats／seatStatus）。
// 直接匯入 .ts：需要 Node 22.18 以上（內建型別剝除），engines 已要求 >=22.23.4。
import assert from "node:assert/strict";
import { describeSeats, parseSeatQuota, seatStatus } from "../src/lib/stureps.ts";

let failed = 0;
function test(name, fn) {
  try {
    fn();
  } catch (err) {
    failed++;
    console.error(`✗ ${name}\n  ${err.message}`);
  }
}

const reps = (n) => Array.from({ length: n }, (_, i) => ({ name: `代表${i}` }));
const meeting = (totalSeats, count) => ({ name: "測試會議", totalSeats, assignedReps: reps(count) });
const kind = (totalSeats, count) => seatStatus(meeting(totalSeats, count)).kind;

test("parseSeatQuota：純數字、數字字串、至少N、帶單位", () => {
  assert.deepEqual(parseSeatQuota(2), { mode: "exact", n: 2 });
  assert.deepEqual(parseSeatQuota("2"), { mode: "exact", n: 2 });
  assert.deepEqual(parseSeatQuota("至少1"), { mode: "min", n: 1 });
  assert.deepEqual(parseSeatQuota("至少 2 名"), { mode: "min", n: 2 });
  assert.deepEqual(parseSeatQuota("3席"), { mode: "exact", n: 3 });
});

test("parseSeatQuota：無法解析時回傳 null", () => {
  assert.equal(parseSeatQuota("視需要"), null);
  assert.equal(parseSeatQuota("至多2"), null);
  assert.equal(parseSeatQuota(undefined), null);
});

test("至少1 且有 2 人：不得是 partial（本次回報的錯誤）", () => {
  assert.equal(kind("至少1", 2), "complete");
  assert.equal(kind("至少1", 1), "complete");
  assert.equal(kind("至少1", 0), "empty");
  assert.equal(kind("至少3", 2), "partial");
});

test("純數字：相符、不足、超過、無資料", () => {
  assert.equal(kind(2, 2), "complete");
  assert.equal(kind("2", 1), "partial");
  assert.equal(kind(2, 3), "over");
  assert.equal(kind(2, 0), "empty");
});

test("沒有法定席次或格式無法解析：不發警告", () => {
  assert.equal(kind(undefined, 2), "none-required");
  assert.equal(kind("", 0), "none-required");
  assert.equal(kind("視需要", 2), "unknown");
  assert.equal(kind("視需要", 0), "unknown");
});

test("describeSeats", () => {
  assert.equal(describeSeats(2), "法定 2 席");
  assert.equal(describeSeats("至少1"), "法定至少 1 席");
  assert.equal(describeSeats("視需要"), "法定 視需要");
  assert.equal(describeSeats(undefined), null);
});

if (failed) {
  console.error(`\n${failed} 項失敗`);
  process.exit(1);
}
console.log("席次檢查全部通過");

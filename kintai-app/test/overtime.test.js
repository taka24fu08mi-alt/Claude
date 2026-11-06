const test = require('node:test');
const assert = require('node:assert');
const ot = require('../lib/overtime');

test('平日 8:00〜20:00：朝1h＋夕方2h（17:30〜18:00は入れない）', () => {
  const r = ot.calcDay({ date: '2026-11-06', clockIn: '8:00', clockOut: '20:00' }); // 金曜
  assert.strictEqual(r.weekday, 180);
  assert.strictEqual(r.total, 180);
});
test('30分単位で切り捨て', () => {
  const r = ot.calcDay({ date: '2026-11-06', clockIn: '9:00', clockOut: '18:50' });
  assert.strictEqual(r.weekday, 30);
});
test('深夜（日付またぎ）', () => {
  const r = ot.calcDay({ date: '2026-11-06', clockIn: '9:00', clockOut: '23:00' });
  assert.strictEqual(r.weekday, 240);
  assert.strictEqual(r.weekdayDeep, 60);
});
test('休日と休憩', () => {
  const r = ot.calcDay({ date: '2026-11-07', clockIn: '9:00', clockOut: '18:00', breaks: [{ start: '12:00', end: '13:00' }] });
  assert.strictEqual(r.holiday, 480);
});
test('締め期間 21日〜20日', () => {
  const p = ot.periodRange('2026-11');
  assert.strictEqual(p.start, '2026-10-21');
  assert.strictEqual(p.end, '2026-11-20');
  assert.strictEqual(ot.periodOf('2026-11-21'), '2026-12');
  assert.strictEqual(ot.periodOf('2026-11-20'), '2026-11');
  assert.strictEqual(ot.periodRange('2027-01').start, '2026-12-21');
});
test('60h超え', () => {
  const rows = [{ calc: { total: 3500 } }, { calc: { total: 200 } }, { calc: { total: 60 } }];
  ot.addCumulative(rows);
  assert.deepStrictEqual(rows.map((r) => r.over60), [0, 100, 60]);
});

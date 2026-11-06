// 残業計算（業務日報_福島.xlsm のルールに合わせた試作版）
// - 定時 9:00〜17:30。17:30〜18:00 は残業に入れない
// - 平日 5:00〜9:00・18:00〜22:00 ＝ 平日残業、22:00〜翌5:00 ＝ 深夜
// - 休日は 5:00〜22:00 ＝ 休日残業、22:00〜翌5:00 ＝ 休日深夜
// - 区分ごとに 30分単位で切り捨て。月累計 60時間を超えた分は「60h超え」
// - 日報の客先欄「休憩」の時間は差し引く
// ※ 祝日・会社カレンダーは未対応（土日のみ休日扱い）

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const CATS = ['weekday', 'weekdayDeep', 'holiday', 'holidayDeep'];

function toMin(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function dayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}

function isHoliday(dateStr) {
  const d = dayOfWeek(dateStr);
  return d === 0 || d === 6;
}

function classify(minute, holiday) {
  const m = minute % 1440;
  const deep = m >= 22 * 60 || m < 5 * 60;
  if (holiday) return deep ? 'holidayDeep' : 'holiday';
  if (deep) return 'weekdayDeep';
  if ((m >= 5 * 60 && m < 9 * 60) || (m >= 18 * 60 && m < 22 * 60)) return 'weekday';
  return null; // 定時内 または 17:30〜18:00
}

// 1日分の計算。clockOut が clockIn 以前なら翌日の時刻とみなす
function calcDay({ date, clockIn, clockOut, breaks = [] }) {
  const s = toMin(clockIn);
  let e = toMin(clockOut);
  if (s == null || e == null) return null;
  if (e <= s) e += 1440;

  const brk = breaks
    .map(({ start, end }) => {
      let bs = toMin(start);
      let be = toMin(end);
      if (bs == null || be == null) return null;
      if (bs < s) { bs += 1440; be += 1440; }
      if (be <= bs) be += 1440;
      return [bs, be];
    })
    .filter(Boolean);

  const holiday = isHoliday(date);
  const res = { weekday: 0, weekdayDeep: 0, holiday: 0, holidayDeep: 0, worked: 0, breakMin: 0 };
  for (let t = s; t < e; t++) {
    if (brk.some(([a, b]) => t >= a && t < b)) { res.breakMin++; continue; }
    res.worked++;
    const c = classify(t, holiday);
    if (c) res[c]++;
  }
  for (const k of CATS) res[k] = Math.floor(res[k] / 30) * 30;
  res.total = CATS.reduce((sum, k) => sum + res[k], 0);
  return res;
}

// 締め期間：前月21日〜当月20日（「2026-11」→ 2026-10-21〜2026-11-20）
function periodRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 2, 21));
  const end = new Date(Date.UTC(y, m - 1, 20));
  const dates = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return { start: dates[0], end: dates[dates.length - 1], dates };
}

// 日付が属する締め期間（21日以降は翌月度）
function periodOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + (d >= 21 ? 1 : 0), 1));
  return dt.toISOString().slice(0, 7);
}

const OVER_60H = 60 * 60;

// 月の一覧に累計と60h超えを付ける
function addCumulative(rows) {
  let cum = 0;
  for (const r of rows) {
    if (!r.calc) { r.cumulative = cum; r.over60 = 0; continue; }
    const before = cum;
    cum += r.calc.total;
    r.cumulative = cum;
    r.over60 = Math.max(0, cum - Math.max(before, OVER_60H));
  }
  return rows;
}

function fmt(min) {
  if (!min) return '';
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

module.exports = { calcDay, periodRange, periodOf, addCumulative, isHoliday, dayOfWeek, WEEKDAYS, fmt, toMin };

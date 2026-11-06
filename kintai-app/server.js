const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { db, createUser, verifyPassword, hashPassword, ensureAdmin } = require('./lib/db');
const ot = require('./lib/overtime');

const PORT = Number(process.env.PORT || 3000);
const SESSION_DAYS = 14;
const KUBUN = ['', '代休', '有休', 'AM有休', 'PM有休', '夏季休暇', '年末年始特別休暇'];

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- 日本時間 ----
function nowJST() {
  const iso = new Date(Date.now() + 9 * 3600e3).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isYM = (s) => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s);
const isTime = (s) => s === '' || ot.toMin(s) != null;

// ---- ログイン状態 ----
function readCookie(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function auth(req, res, next) {
  const token = readCookie(req, 'sid');
  if (token) {
    const row = db.prepare(
      `SELECT u.id, u.emp_no, u.name, u.dept, u.role FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ? AND u.active = 1`
    ).get(token, Date.now());
    if (row) { req.user = row; return next(); }
  }
  res.status(401).json({ error: 'ログインしてください' });
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '管理者だけが使えます' });
  next();
}
// 本人か管理者だけ、他人のデータを見られる
function targetUserId(req) {
  const id = req.query.user_id ? Number(req.query.user_id) : req.user.id;
  if (id !== req.user.id && req.user.role !== 'admin') return null;
  return id;
}

app.post('/api/login', (req, res) => {
  const { emp_no, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE emp_no = ? AND active = 1').get(String(emp_no || ''));
  if (!u || !verifyPassword(String(password || ''), u.pw_salt, u.pw_hash)) {
    return res.status(401).json({ error: '社員番号かパスワードが違います' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)')
    .run(token, u.id, Date.now() + SESSION_DAYS * 864e5);
  res.setHeader('Set-Cookie',
    `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}` +
    (process.env.NODE_ENV === 'production' ? '; Secure' : ''));
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  const token = readCookie(req, 'sid');
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.use('/api', auth);

app.get('/api/me', (req, res) => {
  res.json({ user: req.user, today: nowJST().date, period: ot.periodOf(nowJST().date), kubun: KUBUN });
});

app.post('/api/password', (req, res) => {
  const { current, next: nextPw } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!verifyPassword(String(current || ''), u.pw_salt, u.pw_hash)) {
    return res.status(400).json({ error: '今のパスワードが違います' });
  }
  if (typeof nextPw !== 'string' || nextPw.length < 8) {
    return res.status(400).json({ error: '新しいパスワードは8文字以上にしてください' });
  }
  const { salt, hash } = hashPassword(nextPw);
  db.prepare('UPDATE users SET pw_salt = ?, pw_hash = ? WHERE id = ?').run(salt, hash, u.id);
  res.json({ ok: true });
});

// ---- 打刻 ----
function openPunch(userId, today) {
  // 夜勤で日付をまたいだ退勤に対応：今日か前日の、退勤していない打刻
  return db.prepare(
    `SELECT * FROM punches WHERE user_id = ? AND work_date IN (?, ?) AND clock_out IS NULL
     ORDER BY work_date DESC LIMIT 1`
  ).get(userId, today, addDays(today, -1));
}

app.get('/api/punch/today', (req, res) => {
  const { date } = nowJST();
  const today = db.prepare('SELECT * FROM punches WHERE user_id = ? AND work_date = ?').get(req.user.id, date);
  res.json({ date, punch: today || null, open: openPunch(req.user.id, date) || null });
});

app.post('/api/punch/in', (req, res) => {
  const { date, time } = nowJST();
  const exists = db.prepare('SELECT * FROM punches WHERE user_id = ? AND work_date = ?').get(req.user.id, date);
  if (exists && exists.clock_in) return res.status(409).json({ error: `今日はもう出勤済みです（${exists.clock_in}）` });
  db.prepare(
    `INSERT INTO punches (user_id, work_date, clock_in) VALUES (?,?,?)
     ON CONFLICT(user_id, work_date) DO UPDATE SET clock_in = excluded.clock_in`
  ).run(req.user.id, date, time);
  res.json({ ok: true, date, time });
});

app.post('/api/punch/out', (req, res) => {
  const { date, time } = nowJST();
  const p = openPunch(req.user.id, date);
  if (!p) return res.status(409).json({ error: '出勤の打刻がありません' });
  db.prepare('UPDATE punches SET clock_out = ? WHERE id = ?').run(time, p.id);
  res.json({ ok: true, date: p.work_date, time });
});

// 管理者による打刻の修正
app.put('/api/punch', adminOnly, (req, res) => {
  const { user_id, date, clock_in = '', clock_out = '' } = req.body || {};
  if (!Number.isInteger(user_id) || !isDate(date) || !isTime(clock_in) || !isTime(clock_out)) {
    return res.status(400).json({ error: '入力が正しくありません' });
  }
  db.prepare(
    `INSERT INTO punches (user_id, work_date, clock_in, clock_out) VALUES (?,?,?,?)
     ON CONFLICT(user_id, work_date) DO UPDATE SET clock_in = excluded.clock_in, clock_out = excluded.clock_out`
  ).run(user_id, date, clock_in || null, clock_out || null);
  res.json({ ok: true });
});

// ---- 作業日報 ----
function loadReport(userId, date) {
  const r = db.prepare('SELECT * FROM reports WHERE user_id = ? AND work_date = ?').get(userId, date);
  if (!r) return null;
  const items = db.prepare(
    'SELECT customer, start, end, content FROM report_items WHERE report_id = ? ORDER BY seq'
  ).all(r.id);
  return { date: r.work_date, kubun: r.kubun, notes: r.notes, alcohol: JSON.parse(r.alcohol), items, updated_at: r.updated_at };
}

app.get('/api/report', (req, res) => {
  const uid = targetUserId(req);
  if (uid == null) return res.status(403).json({ error: '見る権限がありません' });
  const date = req.query.date || nowJST().date;
  if (!isDate(date)) return res.status(400).json({ error: '日付が正しくありません' });
  const punch = db.prepare('SELECT clock_in, clock_out FROM punches WHERE user_id = ? AND work_date = ?').get(uid, date);
  res.json({ report: loadReport(uid, date), punch: punch || null });
});

app.put('/api/report', (req, res) => {
  const { date, kubun = '', notes = '', alcohol = {}, items = [] } = req.body || {};
  if (!isDate(date) || !KUBUN.includes(kubun) || !Array.isArray(items) || items.length > 10) {
    return res.status(400).json({ error: '入力が正しくありません（業務内容は10行まで）' });
  }
  for (const it of items) {
    if (!isTime(it.start || '') || !isTime(it.end || '')) {
      return res.status(400).json({ error: '時刻は「8:00」の形で入れてください' });
    }
  }
  const save = () => {
    db.prepare(
      `INSERT INTO reports (user_id, work_date, kubun, notes, alcohol, updated_at) VALUES (?,?,?,?,?,?)
       ON CONFLICT(user_id, work_date) DO UPDATE SET kubun = excluded.kubun, notes = excluded.notes,
       alcohol = excluded.alcohol, updated_at = excluded.updated_at`
    ).run(req.user.id, date, kubun, String(notes).slice(0, 2000), JSON.stringify(alcohol).slice(0, 2000), new Date().toISOString());
    const rid = db.prepare('SELECT id FROM reports WHERE user_id = ? AND work_date = ?').get(req.user.id, date).id;
    db.prepare('DELETE FROM report_items WHERE report_id = ?').run(rid);
    const ins = db.prepare('INSERT INTO report_items (report_id, seq, customer, start, end, content) VALUES (?,?,?,?,?,?)');
    items.forEach((it, i) => ins.run(rid, i, String(it.customer || '').slice(0, 100), it.start || '', it.end || '', String(it.content || '').slice(0, 500)));
  };
  db.exec('BEGIN');
  try { save(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ ok: true });
});

// ---- タイムカード一覧（締め期間：前月21日〜当月20日） ----
app.get('/api/timecard', (req, res) => {
  const uid = targetUserId(req);
  if (uid == null) return res.status(403).json({ error: '見る権限がありません' });
  const period = req.query.period || ot.periodOf(nowJST().date);
  if (!isYM(period)) return res.status(400).json({ error: '月が正しくありません' });
  const { start, end, dates } = ot.periodRange(period);

  const user = db.prepare('SELECT id, emp_no, name, dept FROM users WHERE id = ?').get(uid);
  if (!user) return res.status(404).json({ error: '社員が見つかりません' });
  const punches = new Map(db.prepare(
    'SELECT * FROM punches WHERE user_id = ? AND work_date BETWEEN ? AND ?'
  ).all(uid, start, end).map((p) => [p.work_date, p]));

  const rows = dates.map((date) => {
    const p = punches.get(date) || {};
    const rep = loadReport(uid, date);
    const breaks = (rep?.items || []).filter((it) => it.customer.trim() === '休憩');
    const calc = ot.calcDay({ date, clockIn: p.clock_in, clockOut: p.clock_out, breaks });
    return {
      date,
      wd: ot.WEEKDAYS[ot.dayOfWeek(date)],
      holiday: ot.isHoliday(date),
      clock_in: p.clock_in || '',
      clock_out: p.clock_out || '',
      kubun: rep?.kubun || '',
      reported: !!rep,
      calc,
    };
  });
  ot.addCumulative(rows);
  res.json({ user, period, start, end, rows });
});

// ---- 社員管理（管理者） ----
app.get('/api/users', adminOnly, (req, res) => {
  res.json({ users: db.prepare('SELECT id, emp_no, name, dept, role, active FROM users ORDER BY emp_no').all() });
});

app.post('/api/users', adminOnly, (req, res) => {
  const { emp_no, name, dept = '', role = 'employee', password } = req.body || {};
  if (!emp_no || !name || !['employee', 'admin'].includes(role) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: '社員番号・氏名・パスワード（8文字以上）を入れてください' });
  }
  try {
    const id = createUser({ emp_no: String(emp_no).trim(), name: String(name).trim(), dept: String(dept).trim(), role, password });
    res.json({ ok: true, id });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'その社員番号はもう登録されています' });
    throw e;
  }
});

// 今日の出勤状況（管理者）
app.get('/api/today-all', adminOnly, (req, res) => {
  const { date } = nowJST();
  const rows = db.prepare(
    `SELECT u.id, u.emp_no, u.name, u.dept, p.clock_in, p.clock_out,
            (SELECT kubun FROM reports r WHERE r.user_id = u.id AND r.work_date = ?) AS kubun
     FROM users u LEFT JOIN punches p ON p.user_id = u.id AND p.work_date = ?
     WHERE u.active = 1 ORDER BY u.dept, u.emp_no`
  ).all(date, date);
  res.json({ date, rows });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーでエラーが起きました' });
});

if (require.main === module) {
  const pw = ensureAdmin();
  if (pw) console.log(`初期管理者を作りました → 社員番号: admin / パスワード: ${pw}`);
  app.listen(PORT, () => console.log(`出退勤アプリ: http://localhost:${PORT}`));
}

module.exports = app;

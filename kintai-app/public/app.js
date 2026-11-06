'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let ME = null;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'エラーが起きました'), { status: res.status });
  return data;
}
const fmt = (m) => (m ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : '');
function td(text) { const el = document.createElement('td'); el.textContent = text ?? ''; return el; }
function opt(value, label) { const o = document.createElement('option'); o.value = value; o.textContent = label; return o; }

// ---- 起動 ----
async function boot() {
  try {
    const me = await api('/api/me');
    ME = me;
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#who').textContent = `${me.user.dept ? me.user.dept + ' ' : ''}${me.user.name}`;
    $$('[data-admin]').forEach((el) => (el.hidden = me.user.role !== 'admin'));
    const sel = $('#reportForm [name=kubun]');
    sel.replaceChildren(...me.kubun.map((k) => opt(k, k || '出勤')));
    $('#reportForm [name=date]').value = me.today;
    $('#tcPeriod').value = me.period;
    if (me.user.role === 'admin') await loadUsers();
    showTab('punch');
  } catch (e) {
    if (e.status !== 401) alert(e.message);
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#who').textContent = '';
  }
}

$('#loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    await api('/api/login', { method: 'POST', body: { emp_no: f.get('emp_no'), password: f.get('password') } });
    ev.target.reset();
    $('#loginMsg').textContent = '';
    boot();
  } catch (e) { $('#loginMsg').textContent = e.message; }
});

$('#logout').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); location.reload(); });

$('#pwForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    await api('/api/password', { method: 'POST', body: { current: f.get('current'), next: f.get('next') } });
    ev.target.reset();
    $('#pwMsg').textContent = '変更しました';
  } catch (e) { $('#pwMsg').textContent = e.message; }
});

// ---- タブ ----
function showTab(name) {
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  ['punch', 'report', 'timecard', 'admin'].forEach((t) => ($('#tab-' + t).hidden = t !== name));
  ({ punch: loadPunch, report: loadReport, timecard: loadTimecard, admin: loadAdmin })[name]();
}
$('#tabs').addEventListener('click', (ev) => { if (ev.target.dataset.tab) showTab(ev.target.dataset.tab); });

// ---- 打刻 ----
setInterval(() => {
  const d = new Date();
  $('#clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}, 1000);

async function loadPunch() {
  const { punch, open } = await api('/api/punch/today');
  const parts = [];
  if (punch?.clock_in) parts.push(`出勤 ${punch.clock_in}`);
  if (punch?.clock_out) parts.push(`退勤 ${punch.clock_out}`);
  if (open && open !== null && (!punch || open.work_date !== punch.work_date)) parts.push(`前日 ${open.clock_in} 出勤（未退勤）`);
  $('#punchState').textContent = parts.length ? parts.join(' / ') : 'まだ打刻していません';
  $('#btnIn').disabled = !!punch?.clock_in;
  $('#btnOut').disabled = !open;
}
async function punch(kind) {
  try {
    const r = await api('/api/punch/' + kind, { method: 'POST' });
    $('#punchMsg').textContent = `${kind === 'in' ? '出勤' : '退勤'}しました（${r.time}）`;
  } catch (e) { $('#punchMsg').textContent = e.message; }
  loadPunch();
}
$('#btnIn').addEventListener('click', () => punch('in'));
$('#btnOut').addEventListener('click', () => {
  if (confirm('退勤を打刻しますか？')) punch('out');
});

// ---- 日報 ----
function itemRow(it = {}) {
  const div = document.createElement('div');
  div.className = 'item';
  const field = (name, label, ph, cls) => {
    const l = document.createElement('label');
    if (cls) l.className = cls;
    l.textContent = label;
    const i = document.createElement('input');
    i.name = name; i.placeholder = ph; i.value = it[name] || '';
    l.append(i);
    return l;
  };
  const del = document.createElement('button');
  del.type = 'button'; del.textContent = '削除';
  del.addEventListener('click', () => div.remove());
  div.append(field('customer', '客先（休憩・直行など）', ''), field('start', '開始', '8:00'), field('end', '終了', '17:30'), del,
    field('content', '業務内容', '', 'content'));
  return div;
}
$('#addItem').addEventListener('click', () => {
  if ($$('#items .item').length >= 10) return alert('10行までです');
  $('#items').append(itemRow());
});

async function loadReport() {
  const f = $('#reportForm');
  const date = f.date.value;
  const { report, punch } = await api('/api/report?date=' + encodeURIComponent(date));
  $('#reportPunch').textContent = punch
    ? `打刻：出勤 ${punch.clock_in || '−'} / 退勤 ${punch.clock_out || '−'}` : '打刻：なし';
  const r = report || { kubun: '', notes: '', alcohol: {}, items: [] };
  f.kubun.value = r.kubun;
  f.notes.value = r.notes;
  f.al_before.value = r.alcohol.before || '';
  f.al_after.value = r.alcohol.after || '';
  f.al_car.value = r.alcohol.car || '';
  f.al_checker.value = r.alcohol.checker || '';
  f.al_device.checked = !!r.alcohol.device;
  f.al_ok.checked = !!r.alcohol.ok;
  $('#items').replaceChildren(...(r.items.length ? r.items : [{}]).map(itemRow));
  $('#reportMsg').textContent = report ? `保存済み（${new Date(report.updated_at).toLocaleString('ja-JP')}）` : '未提出';
}
$('#reportForm [name=date]').addEventListener('change', loadReport);

$('#reportForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const items = $$('#items .item').map((d) => ({
    customer: d.querySelector('[name=customer]').value.trim(),
    start: d.querySelector('[name=start]').value.trim(),
    end: d.querySelector('[name=end]').value.trim(),
    content: d.querySelector('[name=content]').value.trim(),
  })).filter((it) => it.customer || it.start || it.end || it.content);
  try {
    await api('/api/report', { method: 'PUT', body: {
      date: f.date.value, kubun: f.kubun.value, notes: f.notes.value, items,
      alcohol: { before: f.al_before.value.trim(), after: f.al_after.value.trim(), car: f.al_car.value.trim(),
        checker: f.al_checker.value.trim(), device: f.al_device.checked, ok: f.al_ok.checked },
    } });
    loadReport();
  } catch (e) { $('#reportMsg').textContent = e.message; }
});

// ---- タイムカード ----
async function loadTimecard() {
  const period = $('#tcPeriod').value;
  const uid = ME.user.role === 'admin' && $('#tcUser').value ? `&user_id=${$('#tcUser').value}` : '';
  const data = await api(`/api/timecard?period=${encodeURIComponent(period)}${uid}`);
  $('#tcTitle').textContent = `${data.user.name}（${data.user.emp_no}）　${data.start} 〜 ${data.end}`;
  const sum = { weekday: 0, weekdayDeep: 0, holiday: 0, holidayDeep: 0, total: 0, over60: 0 };
  const rows = data.rows.map((r) => {
    const tr = document.createElement('tr');
    if (r.holiday) tr.className = 'hol';
    const c = r.calc || {};
    for (const k of ['weekday', 'weekdayDeep', 'holiday', 'holidayDeep', 'total']) sum[k] += c[k] || 0;
    sum.over60 += r.over60;
    tr.append(td(`${r.date.slice(5).replace('-', '/')}(${r.wd})`), td(r.clock_in), td(r.clock_out), td(r.kubun),
      td(fmt(c.weekday)), td(fmt(c.weekdayDeep)), td(fmt(c.holiday)), td(fmt(c.holidayDeep)),
      td(fmt(c.total)), td(fmt(r.cumulative)), td(fmt(r.over60)), td(r.reported ? '✓' : ''));
    return tr;
  });
  $('#tcTable tbody').replaceChildren(...rows);
  const ft = document.createElement('tr');
  ft.append(td('合計'), td(''), td(''), td(''), td(fmt(sum.weekday)), td(fmt(sum.weekdayDeep)),
    td(fmt(sum.holiday)), td(fmt(sum.holidayDeep)), td(fmt(sum.total)), td(''), td(fmt(sum.over60)), td(''));
  $('#tcTable tfoot').replaceChildren(ft);
}
$('#tcPeriod').addEventListener('change', loadTimecard);
$('#tcUser').addEventListener('change', loadTimecard);

// ---- 管理 ----
async function loadUsers() {
  const { users } = await api('/api/users');
  const opts = () => users.map((u) => opt(u.id, `${u.emp_no} ${u.name}`));
  const cur = $('#tcUser').value;
  $('#tcUser').replaceChildren(...opts());
  $('#tcUser').value = cur || String(ME.user.id);
  $('#fixUser').replaceChildren(...opts());
}
async function loadAdmin() {
  if (ME.user.role !== 'admin') return;
  const { rows } = await api('/api/today-all');
  $('#todayTable tbody').replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    tr.append(td(r.emp_no), td(r.name), td(r.dept), td(r.clock_in), td(r.clock_out), td(r.kubun));
    return tr;
  }));
  $('#fixForm [name=date]').value ||= ME.today;
}
$('#fixForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    await api('/api/punch', { method: 'PUT', body: { user_id: Number(f.get('user_id')), date: f.get('date'),
      clock_in: f.get('clock_in').trim(), clock_out: f.get('clock_out').trim() } });
    $('#fixMsg').textContent = '修正しました';
    loadAdmin();
  } catch (e) { $('#fixMsg').textContent = e.message; }
});
$('#userForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    await api('/api/users', { method: 'POST', body: Object.fromEntries(f) });
    ev.target.reset();
    $('#userMsg').textContent = '登録しました';
    await loadUsers();
    loadAdmin();
  } catch (e) { $('#userMsg').textContent = e.message; }
});

boot();

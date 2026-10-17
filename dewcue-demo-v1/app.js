/* Dewcue interactive demo · vanilla JS, no build step.
   Simulates the extension popup, side panel and Smart corner cards. */
(function () {
  'use strict';
  var KEY = 'dewcue-demo-v1';
  var SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var ic = function (n, c) { return '<svg class="i ' + (c || '') + '" aria-hidden="true"><use href="assets/icons.svg#' + n + '"/></svg>'; };

  var TYPES = {
    water: { label: 'Water', icon: 'droplet', mascot: 'water', done: 'Done' },
    medicine: { label: 'Medicine', icon: 'pill', mascot: 'medicine', done: 'Taken' },
    bill: { label: 'Bill', icon: 'receipt', mascot: 'bill-due', done: 'Paid' },
    email: { label: 'Email', icon: 'mail', mascot: 'email', done: 'Done' },
    task: { label: 'Task', icon: 'task', mascot: 'task-done', done: 'Done' },
    timer: { label: 'Timer', icon: 'timer', mascot: 'timer', done: 'Done' }
  };
  var mascot = function (m) { return 'assets/mascot/hummingbird-' + m + '.png'; };

  /* ---------------- time helpers ---------------- */
  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function sod(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function at(dayTs, h, m) { var d = new Date(dayTs); d.setHours(h, m || 0, 0, 0); return d.getTime(); }
  function addDays(t, n) { var d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }
  function addMonths(t, n) { var d = new Date(t); var day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return d.getTime(); }
  function clock(t, withSec) { var d = new Date(t), h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + (withSec ? ':' + String(d.getSeconds()).padStart(2, '0') : '') + ' ' + ap; }
  function dayLabel(t) {
    var n = Date.now(), d = sod(t), today = sod(n);
    if (d === today) return 'Today'; if (d === addDays(today, 1)) return 'Tomorrow'; if (d === addDays(today, -1)) return 'Yesterday';
    var x = new Date(t); return DAYS[x.getDay()].slice(0, 3).replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + x.getDate() + ' ' + MONTHS[x.getMonth()];
  }
  function whenLabel(t) {
    var diff = t - Date.now();
    if (diff > 0 && diff < 90 * SEC) return 'in ' + Math.max(1, Math.round(diff / SEC)) + ' sec · ' + clock(t, true);
    if (diff > 0 && diff < HOUR) return 'in ' + Math.round(diff / MIN) + ' min · ' + clock(t);
    return dayLabel(t) + ' ' + clock(t);
  }
  function shortTime(t) {
    var diff = t - Date.now();
    if (diff > 0 && diff < 90 * SEC) return 'in ' + Math.max(1, Math.round(diff / SEC)) + 's';
    return sod(t) === sod(Date.now()) ? clock(t) : dayLabel(t) + (sod(t) - sod(Date.now()) < 7 * DAY && t > Date.now() ? ' · ' + clock(t) : '');
  }
  function ago(t) { var d = Date.now() - t; if (d < MIN) return 'now'; if (d < HOUR) return Math.round(d / MIN) + ' min ago'; if (d < DAY) return Math.round(d / HOUR) + 'h ago'; return dayLabel(t); }

  /* ---------------- natural-language parser ---------------- */
  var NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30 };
  function unitMs(u) { u = u.toLowerCase(); if (/^s/.test(u)) return SEC; if (/^(m|min)/.test(u) && !/^mo/.test(u)) return MIN; if (/^h/.test(u)) return HOUR; if (/^d/.test(u)) return DAY; if (/^w/.test(u)) return 7 * DAY; return MIN; }
  function unitName(ms, n) { var s = n === 1 ? '' : 's'; return ms === SEC ? 'second' + s : ms === MIN ? 'minute' + s : ms === HOUR ? 'hour' + s : ms === DAY ? 'day' + s : 'week' + s; }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  function parse(raw, nowTs) {
    var now = nowTs || Date.now(), t = ' ' + raw + ' ', m;
    var r = { rel: null, rep: null, h: null, mi: 0, dayOff: null, wd: null, mday: null, defH: null };
    function take(re) { var x = t.match(re); if (x) t = t.replace(x[0], ' '); return x; }
    var U = '(s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?|w|weeks?)';
    if ((m = take(new RegExp('\\b(?:in|after)\\s+(\\d+|an?|one|two|three|four|five|ten|fifteen|twenty|thirty)\\s*' + U + '\\b', 'i')))) {
      var n = /\d/.test(m[1]) ? +m[1] : NUMW[m[1].toLowerCase()]; r.rel = n * unitMs(m[2]);
    }
    if ((m = take(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)(?:\s+(?:of\s+)?(?:every|each)\s+month)?\b/i)) || (m = take(/\bon\s+(?:the\s+)?(\d{1,2})(?:\s+(?:of\s+)?(?:every|each)\s+month)\b/i))) {
      r.mday = Math.min(31, Math.max(1, +m[1])); if (/month/i.test(m[0])) r.rep = { kind: 'month', label: 'Monthly on the ' + ord(r.mday) };
    }
    if ((m = take(/\bevery\s+(\d+)\s*(s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?)\b/i))) { var um = unitMs(m[2]); r.rep = { kind: 'ms', ms: +m[1] * um, label: 'Every ' + m[1] + ' ' + unitName(um, +m[1]) }; }
    else if ((m = take(/\b(every\s+(hour|day|morning|evening|night|week|month|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|hourly|daily|weekly|monthly)\b/i))) {
      var w = (m[2] || m[1]).toLowerCase();
      if (w === 'hour' || w === 'hourly') r.rep = { kind: 'ms', ms: HOUR, label: 'Every hour' };
      else if (w === 'day' || w === 'daily') r.rep = { kind: 'ms', ms: DAY, label: 'Every day' };
      else if (w === 'morning') { r.rep = { kind: 'ms', ms: DAY, label: 'Every morning' }; r.defH = 9; }
      else if (w === 'evening') { r.rep = { kind: 'ms', ms: DAY, label: 'Every evening' }; r.defH = 18; }
      else if (w === 'night') { r.rep = { kind: 'ms', ms: DAY, label: 'Every night' }; r.defH = 21; }
      else if (w === 'week' || w === 'weekly') r.rep = { kind: 'ms', ms: 7 * DAY, label: 'Every week' };
      else if (w === 'month' || w === 'monthly') { r.rep = { kind: 'month', label: 'Every month' }; }
      else if (w === 'weekday') { r.rep = { kind: 'weekday', label: 'Weekdays' }; }
      else { r.wd = DAYS.indexOf(w); r.rep = { kind: 'ms', ms: 7 * DAY, label: 'Every ' + w[0].toUpperCase() + w.slice(1) }; }
    }
    if ((m = take(/\b(?:at\s+|by\s+|@\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i))) {
      var h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; r.h = h; r.mi = +(m[2] || 0);
    } else if ((m = take(/\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\b/i))) {
      var hh = +m[1]; if (hh < 7) hh += 12; r.h = hh % 24; r.mi = +(m[2] || 0);
    } else if ((m = take(/\b(?:at\s+)?(noon|midday|midnight)\b/i))) { r.h = /mid/i.test(m[1]) && m[1].toLowerCase() === 'midnight' ? 0 : 12; }
    if ((m = take(/\b(today|tonight|tomorrow|tmrw|tmr|this\s+evening|this\s+morning|this\s+afternoon)\b/i))) {
      var k = m[1].toLowerCase();
      r.dayOff = /^t(omorrow|mrw|mr)$/.test(k) ? 1 : 0;
      if (k === 'tonight') r.defH = 20; if (/evening/.test(k)) r.defH = 18; if (/morning/.test(k)) r.defH = 9; if (/afternoon/.test(k)) r.defH = 14;
    }
    if ((m = take(/\b(?:on\s+|next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i))) {
      var key = m[1].toLowerCase().slice(0, 3); r.wd = DAYS.map(function (d) { return d.slice(0, 3); }).indexOf(key);
    }

    var due = null, today = sod(now), H = r.h != null ? r.h : r.defH;
    if (r.rel != null) due = now + r.rel;
    else if (r.mday) {
      var d = new Date(today); d.setDate(r.mday); var c = at(d.getTime(), H != null ? H : 9, r.h != null ? r.mi : 0);
      if (c <= now) c = addMonths(c, 1); due = c;
    } else if (r.wd != null) {
      var diff = (r.wd - new Date(now).getDay() + 7) % 7, c2 = at(addDays(today, diff), H != null ? H : 9, r.h != null ? r.mi : 0);
      if (c2 <= now) c2 = addDays(c2, 7); due = c2;
    } else if (r.dayOff != null) {
      due = at(addDays(today, r.dayOff), H != null ? H : (r.dayOff ? 9 : null), r.h != null ? r.mi : 0);
      if (H == null && !r.dayOff) due = null;
      if (due != null && due <= now && r.dayOff === 0) due = addDays(due, 1);
    } else if (H != null) {
      due = at(today, H, r.h != null ? r.mi : 0); if (due <= now) due = addDays(due, 1);
    } else if (r.rep) {
      if (r.rep.kind === 'ms' && r.rep.ms < DAY) due = now + r.rep.ms;
      else if (r.rep.kind === 'month') { due = at(today, 9); if (due <= now) due = addMonths(due, 1); }
      else { due = at(today, 9); if (due <= now) due = addDays(due, 1); }
    }
    if (due && r.rep && r.rep.kind === 'weekday') { while ([0, 6].indexOf(new Date(due).getDay()) >= 0) due = addDays(due, 1); }

    var low = raw.toLowerCase(), type = 'task';
    if (/\b(water|drink|hydrat\w*|glass)\b/.test(low)) type = 'water';
    else if (/\b(pills?|tablets?|medicines?|medication|meds|vitamins?|capsules?|dose|inhaler)\b/.test(low)) type = 'medicine';
    else if (/\b(pay|bills?|rent|invoice|emi|subscription|due)\b/.test(low)) type = 'bill';
    else if (/\b(reply|email|e-mail|mail|respond|follow\s*up|inbox)\b/.test(low)) type = 'email';

    var title = t.replace(/^\s*(please\s+)?(remind\s+me\s+(to\s+)?|reminder\s+(to\s+)?|remember\s+to\s+|don'?t\s+forget\s+to\s+)/i, ' ')
      .replace(/\s+/g, ' ').trim().replace(/^(to|at|on|in|by)\s+/i, '').replace(/\s+(at|on|in|by|every|the|to|and)$/i, '').replace(/[\s,.-]+$/, '').trim();
    if (!title) title = { water: 'Drink a glass of water', medicine: 'Take medicine', bill: 'Pay bill', email: 'Reply to email', task: 'Reminder' }[type];
    title = title.charAt(0).toUpperCase() + title.slice(1);
    return { title: title, type: type, due: due, repeat: r.rep };
  }
  window.DewcueParse = parse; // exposed for testing

  /* ---------------- state ---------------- */
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  function seed() {
    var n = Date.now(), t = sod(n);
    var laterToday = Math.min(n + 2 * HOUR, at(t, 23, 30)); if (laterToday <= n + 5 * MIN) laterToday = n + 45 * MIN;
    return {
      v: 1, onboarded: false, notif: 'smart', screen: 'today', tab: 'today', panel: false, muted: false,
      reminders: [
        { id: uid(), title: 'Take vitamin D', type: 'medicine', due: Math.min(at(t, 9), n - 30 * MIN), repeat: { kind: 'ms', ms: DAY, label: 'Every day' }, done: true, doneAt: n - 20 * MIN, fired: true },
        { id: uid(), title: 'Pay electricity bill', type: 'bill', due: n - 2 * HOUR, repeat: null, done: false, fired: true },
        { id: uid(), title: 'Reply to Maya – “Q4 proposal”', type: 'email', due: n - 50 * MIN, repeat: null, done: false, fired: true },
        { id: uid(), title: 'Send homepage drafts', type: 'task', due: laterToday, repeat: null, done: false, fired: false },
        { id: uid(), title: 'Pay rent', type: 'bill', due: (function () { var d = new Date(t); d.setDate(5); var x = at(d.getTime(), 9); return x <= n ? addMonths(x, 1) : x; })(), repeat: { kind: 'month', label: 'Monthly on the 5th' }, done: false, fired: false },
        { id: uid(), title: 'Call mom', type: 'task', due: at(addDays(t, 1), 18), repeat: null, done: false, fired: false }
      ],
      buckets: [
        { id: 'b1', name: 'Northwind Studio', kind: 'Client', color: '#7C3AED', log: [
          { t: n - 2 * HOUR, text: 'Call with Jen: new colour palette approved. Homepage drafts due Friday.' },
          { t: n - DAY - 3 * HOUR, text: 'Saved from the web · Brand guidelines v3 – Figma' },
          { t: n - 3 * DAY, text: 'Invoice #1042 sent · $2,400 · net 15' }] },
        { id: 'b2', name: 'Lisbon apartment move', kind: 'Home', color: '#0EA5E9', log: [
          { t: n - DAY, text: 'Movers confirmed for the 28th. Need to book the van parking permit.' },
          { t: n - 4 * DAY, text: 'Landlord sent the inventory list.' }] },
        { id: 'b3', name: 'Portfolio v2', kind: 'Project', color: '#F59E0B', log: [
          { t: n - 3 * DAY, text: 'Case study draft for the Northwind rebrand is ready for review.' }] }
      ],
      queue: []
    };
  }
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = seed();
  S.queue = (S.queue || []).filter(function (q) { return q.kind !== 'rem' || S.reminders.some(function (r) { return r.id === q.id && !r.done; }); });
  // items that fell due while the page was closed count as overdue, not as a flood of cards
  S.reminders.forEach(function (r) { if (!r.done && r.due && r.due <= Date.now() && !r.fired) r.fired = true; if (r.whenBack) { r.whenBack = false; r.fired = false; r.due = Date.now() + 3 * SEC; } });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or blocked */ } }

  /* ---------------- UI state (not persisted) ---------------- */
  var ui = { open: false, input: '', search: '', searchOn: false, bucket: null, expanded: false, menu: null, resched: null, plan: 'year', toast: null, selNotif: S.notif || 'smart' };
  var timer = { mode: 'pomo', running: false, start: 0, acc: 0, cdLen: 5 * MIN, pomoPhase: 'focus', session: 1, tick: null };

  var app = $('#app'), host = $('#popupHost'), ext = $('#extBtn'), cardsEl = $('#cards');

  function gtoast(msg) { var g = $('#gtoast'); g.textContent = msg; g.classList.add('is-on'); clearTimeout(gtoast.t); gtoast.t = setTimeout(function () { g.classList.remove('is-on'); }, 2200); }

  /* ---------------- buckets of reminders ---------------- */
  function isOverdue(r) { return !r.done && r.due && r.due <= Date.now() && r.fired; }
  function lists() {
    var n = Date.now(), endToday = addDays(sod(n), 1), out = { today: [], upcoming: [], overdue: [] };
    S.reminders.forEach(function (r) {
      if (ui.search && r.title.toLowerCase().indexOf(ui.search.toLowerCase()) < 0) return;
      if (isOverdue(r)) out.overdue.push(r);
      else if (r.done) { if ((r.doneAt || 0) >= sod(n)) out.today.push(r); }
      else if (!r.due || r.due < endToday) out.today.push(r);
      else out.upcoming.push(r);
    });
    var by = function (a, b) { return (a.done - b.done) || ((a.due || 9e15) - (b.due || 9e15)); };
    out.today.sort(by); out.upcoming.sort(by); out.overdue.sort(by);
    return out;
  }

  /* ---------------- popup rendering ---------------- */
  function header() {
    var d = new Date();
    return '<header class="popup-header"><img class="logo" src="assets/logo/logo-horizontal.svg" alt="dewcue">' +
      '<span class="date">' + DAYS[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }).slice(0, 3) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</span><span class="spacer"></span>' +
      '<button class="icon-btn' + (ui.searchOn ? ' is-on' : '') + '" data-act="search" title="Search">' + ic('search') + '</button>' +
      '<button class="icon-btn' + (S.muted ? ' is-on' : '') + '" data-act="mute" title="' + (S.muted ? 'Unmute cues' : 'Quick mute') + '">' + ic(S.muted ? 'bell-off' : 'bell') + '</button>' +
      '<button class="icon-btn' + (S.panel ? ' is-on' : '') + '" data-act="panel" title="' + (S.panel ? 'Back to popup' : 'Open in side panel') + '">' + ic('panel-right') + '</button></header>';
  }
  function nav() {
    var items = [['today', 'Today', 'sun'], ['buckets', 'Buckets', 'folder'], ['timer', 'Timer', 'timer'], ['more', 'More', 'grid']];
    var cur = S.screen === 'upgrade' ? 'more' : S.screen;
    return '<nav class="bottom-nav">' + items.map(function (x) { return '<button class="nav-item' + (cur === x[0] ? ' is-active' : '') + '" data-nav="' + x[0] + '">' + ic(x[2]) + x[1] + '</button>'; }).join('') + '</nav>';
  }

  function render() {
    if (!S.onboarded) { app.innerHTML = onboarding(); return; }
    var body = '';
    if (S.screen === 'today') body = todayScreen();
    else if (S.screen === 'buckets') body = bucketsScreen();
    else if (S.screen === 'timer') body = timerScreen();
    else if (S.screen === 'more') body = moreScreen();
    else if (S.screen === 'upgrade') body = upgradeScreen();
    app.innerHTML = header() + body + nav();
    if (S.screen === 'today') { var inp = $('#smart', app); inp.value = ui.input; updatePreview(); updateList(); }
    if (S.screen === 'timer') updateTimer();
  }

  function onboarding() {
    var opt = function (k, t, d, icon, rec) {
      return '<div class="option' + (ui.selNotif === k ? ' is-selected' : '') + '" data-notif="' + k + '" role="radio" aria-checked="' + (ui.selNotif === k) + '" tabindex="0"><span class="radio"></span><div style="flex:1"><div class="ot">' + t + (rec ? '<span class="badge-rec">Recommended</span>' : '') + '</div><div class="od">' + d + '</div></div><span class="oi">' + ic(icon) + '</span></div>';
    };
    return '<div class="onb screen"><img class="hero" src="' + mascot('good-morning') + '" alt=""><h2>How should Dewcue remind you?</h2><p class="lead-p">You can change this any time in More → Notifications.</p>' +
      opt('smart', 'Smart notification', 'Small, silent cards in the corner of the page you’re on.', 'cards', true) +
      opt('system', 'System notification', 'Your computer’s standard notifications.', 'monitor') +
      opt('both', 'Both', 'Cards on the page plus a system alert.', 'layers') +
      '<p class="fine">' + ic('shield') + '<span>Smart asks Chrome for site access so cues can appear on any page. Dewcue never reads or stores your pages.</span></p>' +
      '<button class="btn btn-primary btn-lg btn-block" data-act="continue">Continue' + ic('arrow-right') + '</button></div>';
  }

  var CHIPS = [['water', 'droplet', 'Water every hour', 'drink water every hour'], ['medicine', 'pill', 'Vitamin D 9am daily', 'take vitamin D every day at 9am'], ['bill', 'receipt', 'Rent on 5th monthly', 'pay rent on 5th every month'], ['email', 'mail', 'Reply to Sam tomorrow 4pm', 'reply to Sam tomorrow 4pm']];
  function todayScreen() {
    return '<div class="popup-body screen"><div class="compose">' +
      (ui.searchOn ? '<div class="smart-input">' + ic('search', 'lead') + '<input id="searchIn" placeholder="Search reminders" value="' + esc(ui.search) + '" autocomplete="off"></div>' : '') +
      '<div class="smart-input" id="si">' + ic('plus', 'lead') + '<input id="smart" placeholder="Remind me to… (e.g. pay rent on 5th every month)" autocomplete="off" spellcheck="false" aria-label="New reminder"><span class="kbd">Enter ↵</span></div>' +
      '<div class="preview" id="preview"></div>' +
      '<div class="try" id="try">' + ic('sparkle') + 'Try: <button data-fill="drink water in 10 seconds">drink water in 10 seconds</button></div></div>' +
      '<nav class="tabs" id="tabs"></nav><div class="list-wrap"><div class="list" id="list"></div></div></div>';
  }
  function updatePreview() {
    var p = $('#preview', app), tr = $('#try', app), si = $('#si', app); if (!p) return;
    var v = ui.input.trim(); si.classList.toggle('has-text', !!v);
    if (!v) { tr.style.display = ''; p.innerHTML = CHIPS.map(function (c) { return '<button class="chip t-' + c[0] + '" data-fill="' + c[3] + '">' + ic(c[1]) + c[2] + '</button>'; }).join(''); return; }
    tr.style.display = 'none';
    var r = parse(v), T = TYPES[r.type];
    p.innerHTML = '<span class="chip is-type t-' + r.type + '"><span class="dot"></span>' + T.label + '</span>' +
      (r.due ? '<span class="chip is-parsed">' + ic('calendar') + '<span id="pvWhen">' + whenLabel(r.due) + '</span></span>' : '<span class="chip is-warn">' + ic('clock') + 'No time · Anytime today</span>') +
      (r.repeat ? '<span class="chip is-parsed">' + ic('repeat') + r.repeat.label + '</span>' : '') +
      '<span class="chip" style="max-width:100%;overflow:hidden">“' + esc(r.title) + '”</span>';
  }
  function itemHtml(r) {
    var T = TYPES[r.type] || TYPES.task, over = isOverdue(r);
    var time = r.done ? 'Done' : r.due ? (over ? ago(r.due) : shortTime(r.due)) : 'Anytime';
    return '<div class="item t-' + r.type + (r.done ? ' is-done' : '') + '" data-id="' + r.id + '">' +
      '<button class="check' + (r.done ? ' is-done' : '') + '" data-act="toggle" title="' + (r.done ? 'Mark not done' : 'Mark done') + '">' + (r.done ? ic('check') : '') + '</button>' +
      '<span class="type-chip">' + ic(T.icon) + '</span><div class="body"><div class="title">' + esc(r.title) + '</div><div class="meta">' + T.label +
      (r.repeat ? ' <span class="sep">·</span> ' + ic('repeat') + ' ' + esc(r.repeat.label) : '') + (r.snoozed && !r.done ? ' <span class="sep">·</span> Snoozed' : '') + '</div></div>' +
      '<span class="time' + (over ? ' is-overdue' : '') + '">' + time + '</span><button class="del" data-act="delete" title="Delete">' + ic('x') + '</button></div>';
  }
  function updateList() {
    var L = lists(), tabs = $('#tabs', app), list = $('#list', app);
    updatePip();
    if (!tabs) return;
    var todayOpen = L.today.filter(function (r) { return !r.done; }).length;
    tabs.innerHTML = '<button class="tab' + (S.tab === 'today' ? ' is-active' : '') + '" data-tab="today">Today <span class="count">' + todayOpen + '</span></button>' +
      '<button class="tab' + (S.tab === 'upcoming' ? ' is-active' : '') + '" data-tab="upcoming">Upcoming <span class="count">' + L.upcoming.length + '</span></button>' +
      '<button class="tab' + (S.tab === 'overdue' ? ' is-active' : '') + '" data-tab="overdue">Overdue <span class="count' + (L.overdue.length ? ' is-alert' : '') + '">' + L.overdue.length + '</span></button>';
    var arr = L[S.tab];
    var key = S.tab + '|' + arr.map(function (r) { return r.id + r.done + r.due; }).join(',');
    if (list.dataset.key === key) { // just refresh the relative times
      arr.forEach(function (r) { var el = list.querySelector('[data-id="' + r.id + '"] .time'); if (el && !r.done && r.due) el.textContent = isOverdue(r) ? ago(r.due) : shortTime(r.due); });
      return;
    }
    list.dataset.key = key;
    if (!arr.length) {
      var e = { today: ['task-done', 'All clear for today', 'Add one above, or try “drink water in 10 seconds”.'], upcoming: ['milestone', 'Nothing coming up', 'Future reminders land here.'], overdue: ['streak', 'Nothing overdue', 'You’re on top of things.'] }[S.tab];
      list.innerHTML = '<div class="empty"><img src="' + mascot(e[0]) + '" alt=""><b>' + e[1] + '</b>' + e[2] + '</div>'; return;
    }
    list.innerHTML = arr.map(itemHtml).join('');
  }
  function updatePip() {
    var n = S.reminders.filter(isOverdue).length, pip = $('#pip');
    pip.hidden = !n; pip.textContent = n;
  }

  function addReminder(text) {
    var r = parse(text); if (!text.trim()) return;
    var rem = { id: uid(), title: r.title, type: r.type, due: r.due, repeat: r.repeat, done: false, fired: false, created: Date.now() };
    S.reminders.push(rem); save();
    var L = lists(); S.tab = L.upcoming.indexOf(rem) >= 0 ? 'upcoming' : 'today';
    ui.input = ''; var inp = $('#smart', app); if (inp) inp.value = '';
    updatePreview(); updateList();
    var el = $('[data-id="' + rem.id + '"]', app); if (el) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 900); var lw = el.closest('.list-wrap'); if (lw) { var top = el.offsetTop - lw.offsetTop; if (top < lw.scrollTop || top > lw.scrollTop + lw.clientHeight - 60) lw.scrollTop = top - 8; } }
  }

  /* ---------------- Buckets ---------------- */
  function bucketsScreen() {
    if (ui.bucket) {
      var b = S.buckets.filter(function (x) { return x.id === ui.bucket; })[0];
      return '<div class="screen"><div class="pad row gap-8" style="height:44px"><button class="icon-btn sm" data-act="bucket-back" title="Back">' + ic('arrow-left') + '</button>' +
        '<span class="screen-title" style="font-size:15px">' + esc(b.name) + '</span><span class="spacer"></span><span class="badge-local">' + ic('laptop') + 'This computer</span></div>' +
        '<div class="pad" style="padding-top:6px"><div class="segmented" style="height:36px"><span class="is-active">Updates</span><span>Tasks</span><span>Saved</span><span>Notes</span></div>' +
        '<div class="smart-input" style="margin-top:12px">' + ic('note', 'lead') + '<input id="logIn" placeholder="Add an update…" autocomplete="off"><span class="kbd">↵</span></div></div>' +
        '<div class="scroll"><ul class="log" style="--bc:' + b.color + '">' + b.log.slice().sort(function (a, c) { return c.t - a.t; }).map(function (l) { return '<li><div class="lw">' + dayLabel(l.t) + ' · ' + clock(l.t) + '</div><div class="lt">' + esc(l.text) + '</div></li>'; }).join('') + '</ul></div></div>';
    }
    return '<div class="screen"><div class="pad row" style="height:48px"><span class="screen-title">Buckets</span><span class="muted" style="font-size:12px;margin-left:8px">3 of 3 · Free</span><span class="spacer"></span><button class="btn btn-secondary btn-sm" data-act="new-bucket">' + ic('plus', 'i-sm') + 'New <span class="badge-premium">' + ic('star') + 'Premium</span></button></div>' +
      '<div class="scroll">' + S.buckets.map(function (b) {
        var last = Math.max.apply(null, b.log.map(function (l) { return l.t; }));
        return '<div class="bucket" data-bucket="' + b.id + '"><span class="sw" style="background:' + b.color + '">' + b.name[0] + '</span><div><div class="bn">' + esc(b.name) + '</div><div class="bm">' + b.kind + ' · updated ' + ago(last) + ' · ' + b.log.length + ' updates</div></div>' + ic('chevron-right', 'chev') + '</div>';
      }).join('') + '<p class="muted" style="font-size:12px;text-align:center;margin-top:14px">Buckets keep client, home and project updates in one calm log.</p></div></div>';
  }

  /* ---------------- Timer ---------------- */
  function timerScreen() {
    var seg = [['stopwatch', 'Stopwatch'], ['countdown', 'Countdown'], ['pomo', 'Pomodoro']];
    var presets = timer.mode === 'countdown' ? '<div class="presets">' + [1, 5, 10, 25].map(function (m) { return '<button class="chip' + (timer.cdLen === m * MIN ? ' is-on' : '') + '" data-cd="' + m + '">' + m + ' min</button>'; }).join('') + '</div>'
      : timer.mode === 'pomo' ? '<div class="presets"><span class="chip">' + ic('timer') + '25 / 5 min</span><span class="chip is-ghost">Custom preset <span class="badge-premium">' + ic('star') + 'Premium</span></span></div>' : '<div class="presets"><span class="chip">' + ic('flag') + 'Tracks focus time</span></div>';
    return '<div class="screen"><div class="pad row" style="height:48px"><span class="screen-title">Timer</span></div><div class="pad"><div class="segmented">' +
      seg.map(function (s) { return '<span data-tmode="' + s[0] + '" class="' + (timer.mode === s[0] ? 'is-active' : '') + '">' + s[1] + '</span>'; }).join('') + '</div></div>' +
      '<div class="timer-face"><div class="ring" id="ring"><svg viewBox="0 0 220 220"><circle class="trk" cx="110" cy="110" r="100"/><circle class="bar" id="ringBar" cx="110" cy="110" r="100" stroke-dasharray="628.3" stroke-dashoffset="0"/></svg><div class="digits"><b id="tDigits">25:00</b><span id="tSub"></span></div></div>' +
      '<div class="timer-ctrl"><button class="btn btn-primary" id="tMain" data-act="t-toggle" style="min-width:150px"></button><button class="btn btn-secondary" data-act="t-reset">' + ic('rotate', 'i-sm') + 'Reset</button></div>' + presets + '</div></div>';
  }
  function tElapsed() { return timer.acc + (timer.running ? Date.now() - timer.start : 0); }
  function tTarget() { return timer.mode === 'countdown' ? timer.cdLen : timer.mode === 'pomo' ? (timer.pomoPhase === 'focus' ? 25 * MIN : 5 * MIN) : 0; }
  function fmt(ms) { var s = Math.max(0, Math.round(ms / SEC)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s).padStart(2, '0'); }
  function updateTimer() {
    var el = tElapsed(), tgt = tTarget();
    if (tgt && el >= tgt && timer.running) { // finished
      timer.running = false; timer.acc = 0;
      var phase = timer.pomoPhase;
      pushCard({ kind: 'timer', key: 'timer-' + uid(), title: timer.mode === 'pomo' ? (phase === 'focus' ? 'Focus session done. Take 5.' : 'Break over. Ready to focus?') : 'Countdown finished', sub: timer.mode === 'pomo' ? 'Session ' + timer.session + ' of 4' : fmt(timer.cdLen) + ' timer' });
      if (timer.mode === 'pomo') { if (phase === 'break') timer.session = timer.session % 4 + 1; timer.pomoPhase = phase === 'focus' ? 'break' : 'focus'; }
      el = 0;
    }
    var d = $('#tDigits', app); if (!d) return;
    var shown = tgt ? tgt - el : el;
    d.textContent = fmt(shown);
    var bar = $('#ringBar', app), frac = tgt ? el / tgt : (el % MIN) / MIN;
    bar.setAttribute('stroke-dashoffset', String(628.3 * frac));
    $('#ring', app).classList.toggle('is-break', timer.mode === 'pomo' && timer.pomoPhase === 'break');
    $('#tSub', app).textContent = timer.mode === 'pomo' ? (timer.pomoPhase === 'focus' ? 'Focus · session ' + timer.session + ' of 4' : 'Break') : timer.mode === 'countdown' ? 'Countdown' : 'Stopwatch';
    $('#tMain', app).innerHTML = timer.running ? ic('timer', 'i-sm') + 'Pause' : ic('play', 'i-sm') + (el ? 'Resume' : timer.mode === 'pomo' ? (timer.pomoPhase === 'focus' ? 'Start focus' : 'Start break') : 'Start');
  }
  function tickLoop() { clearInterval(timer.tick); timer.tick = setInterval(function () { if (!timer.running) { clearInterval(timer.tick); } updateTimer(); }, 250); }

  /* ---------------- More / Upgrade ---------------- */
  function moreScreen() {
    var row = function (icon, t, v, prem) { return '<div class="mrow" data-more="' + t + '">' + ic(icon) + t + '<span class="v">' + (prem ? '<span class="badge-premium">' + ic('star') + 'Premium</span>' : '') + (v || '') + ic('chevron-right') + '</span></div>'; };
    return '<div class="screen"><div class="pad row" style="height:48px"><span class="screen-title">More</span></div><div class="scroll">' +
      '<div class="menu-group" style="margin-top:0"><div class="section-label">Plan &amp; progress</div>' + row('flag', 'Milestones', '1 of 1') + row('flame', 'Streaks', '7 days') + row('chart', 'Weekly review', '', true) + row('timer', 'Focus stats', '', true) + row('history', 'History', 'Last 30 days') + '</div>' +
      '<div class="menu-group"><div class="section-label">Reminders &amp; nudges</div>' + row('droplet', 'Nudges', '2 of 4 on') + row('cake', 'Birthdays', '3 of 5') + row('card', 'Subscriptions', '', true) + row('globe', 'Site reminders', '', true) + '</div>' +
      '<div class="menu-group"><div class="section-label">Settings</div>' + row('moon', 'Quiet hours', '10 PM–7 AM') + row('bell', 'Notifications', { smart: 'Smart', system: 'System', both: 'Both' }[S.notif]) + row('palette', 'Themes', 'Light') + row('database', 'Data &amp; backup', 'This computer') + '</div>' +
      '<div class="upsell"><img src="' + mascot('milestone') + '" alt="" width="44" height="44"><div style="flex:1"><b>Upgrade to Premium</b><p>14-day free trial · no card needed</p></div><button class="btn btn-primary btn-sm" data-act="upgrade">Upgrade</button></div></div></div>';
  }
  function upgradeScreen() {
    var plan = function (k, n, d, price, per, extra) { return '<div class="plan' + (ui.plan === k ? ' is-selected' : '') + '" data-plan="' + k + '"><span class="radio"></span><div><div class="pn">' + n + '</div><div class="pd">' + d + '</div>' + (extra || '') + '</div><div class="pp"><b>' + price + '</b><span>' + per + '</span></div></div>'; };
    var left = 37, cta = { year: 'Then $39/year.', month: 'Then $4.99/month.', life: 'Then a one-time $99.' }[ui.plan];
    return '<div class="screen"><div class="pad row gap-8" style="height:48px"><button class="icon-btn sm" data-nav="more" title="Back">' + ic('arrow-left') + '</button><span class="screen-title">Dewcue Premium</span></div><div class="scroll">' +
      '<p class="muted" style="font-size:13px;margin:0 0 12px">Unlimited everything. Still calm.</p>' +
      plan('year', 'Yearly <span class="badge-rec">Recommended</span>', '$3.25/month, billed yearly · Save 35%', '$39', 'per year') +
      plan('month', 'Monthly', 'Cancel any time', '$4.99', 'per month') +
      plan('life', 'Lifetime', 'Pay once. First 500 customers only.', '$99', 'one time', '<div class="pd" style="color:#9A7410;font-weight:600;margin-top:4px">' + left + ' of 500 left</div><div class="left-meter"><span style="width:' + (100 - left / 5) + '%"></span></div>') +
      '<ul class="feat"><li>' + ic('check') + 'Unlimited repeats, alarms &amp; buckets</li><li>' + ic('check') + '“No reply in N days” email follow-ups</li><li>' + ic('check') + 'All 4 nudges, your own schedules</li><li>' + ic('check') + 'Search every bucket and full history</li></ul>' +
      '<button class="btn btn-primary btn-lg btn-block" data-act="checkout">Start 14-day free trial</button><p class="muted" style="font-size:11.5px;text-align:center;margin-top:8px">No card needed. ' + cta + ' Cancel any time.<br>Secure checkout by Lemon Squeezy · taxes handled</p></div></div>';
  }

  /* ---------------- corner cards ---------------- */
  function pushCard(c) {
    if (c.kind === 'rem' && S.queue.some(function (q) { return q.id === c.id; })) return;
    if (!c.key) c.key = c.kind === 'rem' ? 'r-' + c.id : c.kind + '-' + uid();
    S.queue.push(c); save(); renderCards();
  }
  function cardData(q) {
    if (q.kind === 'rem') {
      var r = S.reminders.filter(function (x) { return x.id === q.id; })[0]; if (!r) return null;
      var T = TYPES[r.type] || TYPES.task;
      var sub = r.repeat ? r.repeat.label : (r.snoozed ? 'Snoozed reminder' : 'One-time reminder');
      var titles = { water: 'Time for a glass of water' };
      return { type: r.type, eyebrow: T.label, when: 'now', title: r.type === 'water' && /^drink( a glass of)? water$/i.test(r.title) ? titles.water : r.title, sub: sub, img: mascot(T.mascot), done: T.done, actions: true, r: r };
    }
    if (q.kind === 'timer') return { type: 'timer', eyebrow: 'Timer', when: 'now', title: q.title, sub: q.sub, img: mascot('timer'), simple: 'Got it' };
    if (q.kind === 'away') {
      var od = S.reminders.filter(isOverdue).slice(0, 3);
      var list = od.length ? '<ul class="mini-list">' + od.map(function (r) { return '<li class="t-' + r.type + '"><span class="bar"></span><span class="t">' + esc(r.title) + '</span><span class="w">' + ago(r.due) + '</span></li>'; }).join('') + '</ul>' : '<p class="sub">Nothing slipped. Nice.</p>';
      return { type: 'away', eyebrow: 'While you were away', when: '· 2h 14m', title: od.length + ' reminder' + (od.length === 1 ? '' : 's') + ' came due', sub: '', img: mascot('while-you-were-away'), extra: list, simple: 'Review', review: true };
    }
    if (q.kind === 'morning') {
      var L = lists(), open = L.today.filter(function (r) { return !r.done; });
      return { type: 'morning', eyebrow: 'Good morning', when: '· ' + clock(Date.now()), title: open.length + ' thing' + (open.length === 1 ? '' : 's') + ' on today, ' + L.overdue.length + ' overdue', sub: 'First up: ' + (open[0] ? esc(open[0].title) : 'nothing. Enjoy the calm.'), img: mascot('good-morning'), extra: '<div class="stat-row"><span class="stat">' + ic('flame') + '<b>7</b> day streak</span><span class="stat">' + ic('droplet') + '<b>3</b> of 8 water</span></div>', simple: 'Open Today', review: true };
    }
  }
  var lastTop = null;
  function cardHtml(q, i, total, isTop) {
    if (q.kind === 'toast') return '<div class="cue toast t-done" data-key="' + q.key + '"><div class="mascot"><img src="' + mascot('task-done') + '" alt=""></div><div class="content"><div class="eyebrow">Task done</div><div class="title">' + esc(q.title) + '</div></div></div>';
    var c = cardData(q); if (!c) return '';
    var menu = ui.menu === q.key ? snoozeMenu() : '';
    var resched = ui.resched === q.key ? reschedHtml(c.r) : '';
    var moreChip = isTop && !ui.expanded && total > 1 ? '<button class="more-chip" data-act="expand">' + ic('layers') + '+' + (total - 1) + ' more</button>' : '';
    var actions = c.actions ? '<div class="actions"><button class="cue-btn is-primary" data-act="c-done">' + ic('check') + c.done + '</button><button class="cue-btn' + (ui.menu === q.key ? ' is-open' : '') + '" data-act="c-snooze">Snooze' + ic('chevron-down') + '</button><button class="cue-btn' + (ui.resched === q.key ? ' is-open' : '') + '" data-act="c-resched">' + ic('calendar') + 'Reschedule</button></div>'
      : '<div class="actions"><button class="cue-btn is-primary" data-act="' + (c.review ? 'c-review' : 'c-dismiss') + '">' + ic('check') + c.simple + '</button><button class="cue-btn" data-act="c-dismiss">Dismiss</button></div>';
    return '<div class="cue t-' + c.type + (isTop && lastTop !== q.key ? '' : ' no-anim') + '" data-key="' + q.key + '" role="alert">' + moreChip + menu +
      '<div class="mascot"><img src="' + c.img + '" alt=""></div><div class="content"><div class="eyebrow">' + c.eyebrow + '<span class="when">' + (c.when === 'now' ? '· now' : c.when) + '</span></div><div class="title">' + c.title + '</div>' + (c.sub ? '<div class="sub">' + c.sub + '</div>' : '') + '</div>' +
      '<button class="more" data-act="c-dismiss" title="Dismiss">' + ic('x') + '</button>' + (c.extra ? '<div class="extra">' + c.extra + '</div>' : '') + (resched ? '<div class="extra">' + resched + '</div>' : '') + actions + '</div>';
  }
  function snoozeTargets() {
    var n = Date.now(), t = sod(n), eve = at(t, 18); if (eve <= n + 30 * MIN) eve = at(t, 21) > n + 30 * MIN ? at(t, 21) : at(addDays(t, 1), 18);
    return [['demo', 'clock', '10 sec', 'demo', n + 10 * SEC], ['10m', 'clock', '10 min', clock(n + 10 * MIN), n + 10 * MIN], ['1h', 'clock', '1 hour', clock(n + HOUR), n + HOUR],
      ['eve', 'sunrise', sod(eve) === t ? 'This evening' : 'Tomorrow evening', clock(eve), eve], ['tom', 'calendar', 'Tomorrow', dayLabel(at(addDays(t, 1), 9)).replace('Tomorrow', DAYS[new Date(addDays(t, 1)).getDay()].slice(0, 3).replace(/^./, function (c) { return c.toUpperCase(); })) + ' 9:00 AM', at(addDays(t, 1), 9)], ['back', 'laptop', 'When I’m back', 'next visit', null]];
  }
  function snoozeMenu() {
    return '<div class="menu" role="menu">' + snoozeTargets().map(function (s) { return '<button class="menu-item" style="width:100%" data-snooze="' + s[0] + '">' + ic(s[1]) + s[2] + (s[0] === 'demo' ? ' <span class="badge-premium" style="background:#FEF3C7;color:#92400E">demo</span>' : '') + '<span class="hint">' + s[3] + '</span></button>'; }).join('') + '</div>';
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function localInput(t) { var d = new Date(t); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function reschedHtml() {
    var n = Date.now();
    return '<div class="resched"><div class="quick"><button class="chip" data-rq="30">In 30 min</button><button class="chip" data-rq="tonight">Tonight 8 PM</button><button class="chip" data-rq="tom">Tomorrow 9 AM</button></div>' +
      '<div class="row gap-6"><input type="datetime-local" id="rsIn" value="' + localInput(n + HOUR) + '" aria-label="New date and time"><button class="btn btn-primary btn-sm" data-act="rs-save">Save</button></div></div>';
  }
  function renderCards() {
    var q = S.muted ? S.queue.filter(function (x) { return x.kind === 'toast'; }) : S.queue;
    if (!q.length) { cardsEl.innerHTML = ''; ui.expanded = false; cardsEl.classList.remove('is-expanded'); lastTop = null; return; }
    if (q.length < 2) ui.expanded = false;
    cardsEl.classList.toggle('is-expanded', ui.expanded);
    var html = '';
    if (ui.expanded) {
      html = '<div class="stack-head">' + q.length + ' reminders<button data-act="collapse">Show less</button></div>' + q.map(function (x, i) { return cardHtml(x, i, q.length, i === 0); }).join('');
    } else html = cardHtml(q[0], 0, q.length, true);
    cardsEl.innerHTML = html;
    cardsEl.querySelectorAll('.no-anim').forEach(function (e) { e.style.animation = 'none'; });
    lastTop = q[0].key;
  }
  function removeCard(key, after) {
    var el = cardsEl.querySelector('[data-key="' + key + '"]');
    var go = function () { S.queue = S.queue.filter(function (x) { return x.key !== key; }); if (ui.menu === key) ui.menu = null; if (ui.resched === key) ui.resched = null; save(); renderCards(); if (after) after(); };
    if (el) { el.classList.add('out'); el.style.animation = ''; setTimeout(go, 170); } else go();
  }
  function findQ(key) { return S.queue.filter(function (x) { return x.key === key; })[0]; }
  function nextDue(r) {
    var d = r.due || Date.now(), n = Date.now();
    var step = function (x) { if (r.repeat.kind === 'month') return addMonths(x, 1); if (r.repeat.kind === 'weekday') { x = addDays(x, 1); while ([0, 6].indexOf(new Date(x).getDay()) >= 0) x = addDays(x, 1); return x; } return x + r.repeat.ms; };
    var x = step(d), guard = 0; while (x <= n && guard++ < 10000) x = step(x); return x;
  }
  function completeReminder(r) {
    if (r.repeat) { // log this occurrence as done, schedule the next one
      S.reminders.push({ id: uid(), title: r.title, type: r.type, due: r.due, repeat: null, done: true, doneAt: Date.now(), fired: true, occurrence: true });
      r.due = nextDue(r); r.fired = false; r.snoozed = false;
    } else { r.done = true; r.doneAt = Date.now(); }
    S.queue = S.queue.filter(function (x) { return x.id !== r.id; });
  }
  function doneCard(key) {
    var q = findQ(key); if (!q) return; var r = S.reminders.filter(function (x) { return x.id === q.id; })[0];
    var el = cardsEl.querySelector('[data-key="' + key + '"]');
    var finish = function () {
      if (r) completeReminder(r);
      var tk = 'toast-' + uid(); S.queue = S.queue.filter(function (x) { return x.key !== key; }); S.queue.unshift({ kind: 'toast', key: tk, title: r ? r.title : 'Done' });
      ui.menu = ui.resched = null; save(); renderCards(); updateList();
      setTimeout(function () { removeCard(tk); }, 1400);
    };
    if (el) { el.style.animation = ''; el.classList.add('out'); setTimeout(finish, 160); } else finish();
  }
  function snooze(key, which) {
    var q = findQ(key), r = q && S.reminders.filter(function (x) { return x.id === q.id; })[0]; if (!r) return;
    var tgt = snoozeTargets().filter(function (s) { return s[0] === which; })[0];
    r.snoozed = true; r.fired = false;
    if (which === 'back') { r.whenBack = true; r.due = Date.now() + DAY; gtoast('Snoozed until you’re back (demo: switch tabs and return, or reload)'); }
    else { r.due = tgt[4]; gtoast('Snoozed · back ' + whenLabel(r.due)); }
    ui.menu = null; removeCard(key, updateList);
  }
  function reschedule(key, ts) {
    var q = findQ(key), r = q && S.reminders.filter(function (x) { return x.id === q.id; })[0]; if (!r || !ts || isNaN(ts)) return;
    if (ts <= Date.now()) { gtoast('Pick a time in the future'); return; }
    r.due = ts; r.fired = false; r.snoozed = false; gtoast('Rescheduled · ' + whenLabel(ts));
    ui.resched = null; removeCard(key, updateList);
  }

  /* ---------------- scheduler (real timers) ---------------- */
  function tick() {
    var n = Date.now(), changed = false;
    S.reminders.forEach(function (r) {
      if (!r.done && !r.fired && r.due && r.due <= n && !r.whenBack) { r.fired = true; changed = true; pushCard({ kind: 'rem', id: r.id }); }
    });
    if (changed) save();
    if (ui.open || S.panel) { if (S.screen === 'today') { updateList(); var pw = $('#pvWhen', app); if (pw && ui.input.trim()) { var p = parse(ui.input.trim()); if (p.due) pw.textContent = whenLabel(p.due); } } } else updatePip();
  }
  setInterval(tick, 500);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    var any = false; S.reminders.forEach(function (r) { if (r.whenBack) { r.whenBack = false; r.due = Date.now() + 1500; any = true; } }); if (any) save();
  });

  /* ---------------- popup open / close / side panel ---------------- */
  function placePopup() {
    var b = $('#browser').getBoundingClientRect(), e = ext.getBoundingClientRect();
    host.style.top = (e.bottom - b.top + 6) + 'px';
    host.style.right = Math.max(8, b.right - e.right - 8) + 'px';
  }
  function openPopup() {
    if (S.panel) { var sp = $('#sidepanel'); sp.animate([{ opacity: .6 }, { opacity: 1 }], { duration: 250 }); return; }
    $('#extHint').hidden = true; ui.open = true; placePopup(); render(); host.classList.add('is-open'); ext.classList.add('is-open');
    setTimeout(function () { var i = $('#smart', app); if (i) i.focus(); }, 60);
  }
  function closePopup() { ui.open = false; ui.menu = null; host.classList.remove('is-open'); ext.classList.remove('is-open'); }
  function setPanel(on) {
    S.panel = on; save();
    var sp = $('#sidepanel');
    if (on) { closePopup(); $('#spHost').appendChild(app); app.classList.add('in-panel'); host.classList.add('is-empty'); sp.classList.add('is-open'); $('#extHint').hidden = true; render(); }
    else { sp.classList.remove('is-open'); setTimeout(function () { if (!S.panel) { host.appendChild(app); app.classList.remove('in-panel'); host.classList.remove('is-empty'); } }, 230); }
  }
  ext.addEventListener('click', function (e) { e.stopPropagation(); ui.open ? closePopup() : openPopup(); });
  $('#spClose').addEventListener('click', function () { setPanel(false); });
  document.addEventListener('mousedown', function (e) {
    if (!ui.open) return;
    if (host.contains(e.target) || ext.contains(e.target) || $('#demoPanel').contains(e.target)) return;
    closePopup();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (ui.menu || ui.resched) { ui.menu = ui.resched = null; renderCards(); } else if (ui.open) closePopup(); }
  });

  /* ---------------- events inside the app ---------------- */
  app.addEventListener('input', function (e) {
    if (e.target.id === 'smart') { ui.input = e.target.value; updatePreview(); }
    if (e.target.id === 'searchIn') { ui.search = e.target.value; updateList(); }
  });
  app.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') { if (e.target.matches && e.target.matches('.option') && e.key === ' ') e.target.click(); return; }
    if (e.target.id === 'smart') { e.preventDefault(); addReminder(e.target.value); }
    if (e.target.id === 'logIn' && e.target.value.trim()) {
      var b = S.buckets.filter(function (x) { return x.id === ui.bucket; })[0]; b.log.push({ t: Date.now(), text: e.target.value.trim() }); save(); render(); var li = $('#logIn', app); if (li) li.focus();
    }
    if (e.target.matches && e.target.matches('.option')) e.target.click();
  });
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-nav],[data-tab],[data-fill],[data-notif],[data-bucket],[data-tmode],[data-cd],[data-plan],[data-more]'); if (!t) return;
    var d = t.dataset;
    if (d.notif) { ui.selNotif = d.notif; app.innerHTML = onboarding(); return; }
    if (d.nav) { S.screen = d.nav; ui.bucket = null; save(); render(); return; }
    if (d.tab) { S.tab = d.tab; save(); updateList(); return; }
    if (d.fill) { ui.input = d.fill; var i = $('#smart', app); i.value = d.fill; i.focus(); updatePreview(); return; }
    if (d.bucket) { ui.bucket = d.bucket; render(); var li = $('#logIn', app); if (li) li.focus(); return; }
    if (d.tmode) { if (timer.mode !== d.tmode) { timer.mode = d.tmode; timer.running = false; timer.acc = 0; timer.pomoPhase = 'focus'; } render(); return; }
    if (d.cd) { timer.cdLen = +d.cd * MIN; timer.running = false; timer.acc = 0; render(); return; }
    if (d.plan) { ui.plan = d.plan; render(); return; }
    if (d.more) { gtoast(d.more + ' · not part of this demo'); return; }
    var id = t.closest('.item') && t.closest('.item').dataset.id, r = id && S.reminders.filter(function (x) { return x.id === id; })[0];
    switch (d.act) {
      case 'continue': S.notif = ui.selNotif; S.onboarded = true; save(); render(); setTimeout(function () { var i = $('#smart', app); if (i) i.focus(); }, 50); break;
      case 'search': ui.searchOn = !ui.searchOn; if (!ui.searchOn) ui.search = ''; render(); if (ui.searchOn) $('#searchIn', app).focus(); break;
      case 'mute': S.muted = !S.muted; save(); render(); renderCards(); gtoast(S.muted ? 'Cues muted. They’ll wait quietly in the list.' : 'Cues back on'); break;
      case 'panel': setPanel(!S.panel); break;
      case 'toggle': if (!r) break;
        if (r.done) { r.done = false; r.doneAt = null; } else { completeReminder(r); renderCards(); }
        save(); updateList(); break;
      case 'delete': S.reminders = S.reminders.filter(function (x) { return x !== r; }); S.queue = S.queue.filter(function (x) { return x.id !== id; }); save(); updateList(); renderCards(); break;
      case 'bucket-back': ui.bucket = null; render(); break;
      case 'new-bucket': S.screen = 'upgrade'; render(); break;
      case 't-toggle':
        if (timer.running) { timer.acc += Date.now() - timer.start; timer.running = false; } else { timer.start = Date.now(); timer.running = true; tickLoop(); }
        updateTimer(); break;
      case 't-reset': timer.running = false; timer.acc = 0; updateTimer(); break;
      case 'upgrade': S.screen = 'upgrade'; render(); break;
      case 'checkout': gtoast('Demo only · checkout (Lemon Squeezy) is not connected'); break;
    }
  });

  /* ---------------- events on cards ---------------- */
  cardsEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-snooze],[data-rq]'); if (!t) { return; }
    var card = t.closest('.cue'), key = card && card.dataset.key, d = t.dataset;
    if (d.snooze) { snooze(key, d.snooze); return; }
    if (d.rq) { var n = Date.now(), ts = d.rq === '30' ? n + 30 * MIN : d.rq === 'tonight' ? (at(sod(n), 20) > n ? at(sod(n), 20) : at(addDays(sod(n), 1), 20)) : at(addDays(sod(n), 1), 9); reschedule(key, ts); return; }
    switch (d.act) {
      case 'expand': ui.expanded = true; renderCards(); break;
      case 'collapse': ui.expanded = false; renderCards(); break;
      case 'c-done': doneCard(key); break;
      case 'c-snooze': ui.menu = ui.menu === key ? null : key; ui.resched = null; renderCards(); break;
      case 'c-resched': ui.resched = ui.resched === key ? null : key; ui.menu = null; renderCards(); break;
      case 'rs-save': var v = card.querySelector('#rsIn').value; reschedule(key, v ? new Date(v).getTime() : NaN); break;
      case 'c-review': removeCard(key); S.screen = 'today'; S.tab = findQ(key) && findQ(key).kind === 'away' ? 'overdue' : 'today'; save(); if (!ui.open && !S.panel) openPopup(); else render(); break;
      case 'c-dismiss': removeCard(key); break;
    }
  });
  document.addEventListener('mousedown', function (e) { if ((ui.menu) && !e.target.closest('.menu') && !e.target.closest('[data-act="c-snooze"]')) { ui.menu = null; renderCards(); } });

  /* ---------------- demo controls ---------------- */
  var pending = [];
  $('#dpToggle').addEventListener('click', function () { $('#demoPanel').classList.toggle('is-collapsed'); });
  $('#demoPanel').addEventListener('click', function (e) {
    var b = e.target.closest('[data-demo]'); if (!b) return;
    var k = b.dataset.demo;
    if (k === 'fire') {
      if (S.muted) { S.muted = false; save(); if (ui.open || S.panel) render(); }
      var n = Date.now();
      [['Drink a glass of water', 'water', 300, { kind: 'ms', ms: HOUR, label: 'Every hour' }], ['Take vitamin B12', 'medicine', 2000, { kind: 'ms', ms: DAY, label: 'Every day' }], ['Pay internet bill · $49', 'bill', 4000, null], ['Reply to Sam – “Contract draft”', 'email', 6000, null]]
        .forEach(function (x) { S.reminders.push({ id: uid(), title: x[0], type: x[1], due: n + x[2], repeat: x[3], done: false, fired: false, sample: true }); });
      save(); if (ui.open || S.panel) updateList(); gtoast('4 sample reminders queued over the next ~6 seconds');
    }
    if (k === 'away') pushCard({ kind: 'away' });
    if (k === 'morning') pushCard({ kind: 'morning' });
    if (k === 'reset') {
      pending.forEach(clearTimeout); try { localStorage.removeItem(KEY); } catch (er) { /* ignore */ }
      var wasPanel = S.panel; S = seed(); ui.input = ''; ui.search = ''; ui.searchOn = false; ui.bucket = null; ui.expanded = false; ui.menu = ui.resched = null; ui.selNotif = 'smart';
      timer.running = false; timer.acc = 0; timer.mode = 'pomo'; timer.pomoPhase = 'focus'; timer.session = 1;
      if (wasPanel) setPanel(false); closePopup(); save(); renderCards(); updatePip(); $('#extHint').hidden = false; gtoast('Demo reset');
    }
  });

  /* ---------------- boot ---------------- */
  ['#page', '.viewport', '#browser'].forEach(function (sel) { var el = $(sel); el.addEventListener('scroll', function () { if (el.scrollTop || el.scrollLeft) { el.scrollTop = 0; el.scrollLeft = 0; } }); });
  window.addEventListener('resize', function () { if (ui.open) placePopup(); });
  render(); renderCards(); updatePip();
  if (S.panel) { S.panel = false; setPanel(true); }
  if (S.onboarded) $('#extHint').hidden = true;
})();

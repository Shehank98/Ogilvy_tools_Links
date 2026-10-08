/**
 * Ogilvy Automation Desk – Google Apps Script backend
 * ---------------------------------------------------
 * Data lives in the Google Sheet this script is attached to:
 *   Users · Codes · Sessions · Tickets · Tools
 *
 * Setup: see README.md in this folder. In short:
 *   1. Paste this file into Extensions → Apps Script of a new Google Sheet.
 *   2. Run setup() once (grants permissions, creates the sheets, seeds sample tools).
 *   3. Add Script properties: ADMIN_USER, ADMIN_PASS (and optionally ADMIN_EMAIL).
 *   4. Deploy → New deployment → Web app (Execute as: Me, Access: Anyone).
 */

var CFG = {
  APP_NAME: 'Ogilvy Automation Desk',
  DEFAULT_DOMAINS: 'ogilvy.com',
  CODE_TTL_MIN: 15,
  CODE_MAX_TRIES: 5,
  CODES_PER_HOUR: 5,
  LOGIN_MAX_FAILS: 8,
  LOGIN_LOCK_SEC: 900,
  USER_SESSION_DAYS: 7,
  ADMIN_SESSION_HOURS: 8,
  PW_ROUNDS: 1000,
  TYPES: ['Bug', 'Suggestion'],
  PRIORITIES: ['Low', 'Medium', 'High', 'Critical'],
  STATUSES: ['New', 'In Review', 'In Progress', 'Testing', 'Resolved', 'Declined']
};

var SHEETS = {
  Users: ['email', 'name', 'salt', 'hash', 'verified', 'createdAt', 'lastLogin'],
  Codes: ['email', 'purpose', 'codeHash', 'expiresAt', 'attempts'],
  Sessions: ['tokenHash', 'email', 'kind', 'expiresAt'],
  Tickets: ['id', 'createdAt', 'updatedAt', 'email', 'name', 'type', 'title', 'tool', 'priority',
            'description', 'steps', 'status', 'adminNote', 'history'],
  Tools: ['name', 'description', 'url', 'category', 'icon', 'status', 'active', 'order']
};

/* ============================ ENTRY POINTS ============================ */

var ACTIONS = {
  register: register_, verify: verify_, resend: resend_,
  login: login_, logout: logout_,
  requestReset: requestReset_, resetPassword: resetPassword_,
  tools: tools_, myTickets: myTickets_, createTicket: createTicket_,
  adminLogin: adminLogin_, adminTickets: adminTickets_, adminUpdate: adminUpdate_
};
// Actions that write to the sheet are serialised so IDs and rows never collide.
var WRITE_ACTIONS = ['register', 'verify', 'resend', 'login', 'logout', 'requestReset',
                     'resetPassword', 'createTicket', 'adminLogin', 'adminUpdate'];

function doGet() {
  return json_({ ok: true, service: CFG.APP_NAME, message: 'Backend is running. Use POST.' });
}

function doPost(e) {
  var out, lock = null;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = ACTIONS[req.action];
    if (!fn || !Object.prototype.hasOwnProperty.call(ACTIONS, req.action)) throw fail_('Unknown action.');
    if (WRITE_ACTIONS.indexOf(req.action) > -1) {
      lock = LockService.getScriptLock();
      lock.waitLock(25000);
    }
    out = fn(req);
    out.ok = true;
  } catch (ex) {
    out = { ok: false, error: ex.userMessage || 'Something went wrong. Please try again.', code: ex.code || '' };
    if (!ex.userMessage) console.error(ex && ex.stack ? ex.stack : ex);
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (x) {} }
  }
  return json_(out);
}

/** Run once from the editor. Creates sheets, secret and sample tools. */
function setup() {
  Object.keys(SHEETS).forEach(function (n) { sheet_(n); });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) {
    props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  var tools = sheet_('Tools');
  if (tools.getLastRow() < 2) {
    [
      ['Brief Builder', 'Turn a client call into a structured brief in minutes.', 'https://example.com/brief-builder', 'Planning', '📝', 'Live', 'TRUE', 1],
      ['Asset Resizer', 'Batch-resize creative to every channel format.', 'https://example.com/asset-resizer', 'Production', '🖼️', 'Live', 'TRUE', 2],
      ['Report Pilot', 'Auto-build weekly performance decks from raw exports.', 'https://example.com/report-pilot', 'Analytics', '📊', 'Beta', 'TRUE', 3],
      ['Copy Checker', 'Brand-voice and compliance check for draft copy.', '', 'Creative', '✅', 'Coming Soon', 'TRUE', 4]
    ].forEach(function (r) { tools.appendRow(r); });
  }
  Logger.log('Setup complete. Now add ADMIN_USER and ADMIN_PASS under Project Settings → Script properties, then deploy as a Web app.');
}

/* ============================ AUTH ============================ */

function register_(req) {
  var email = normEmail_(req.email);
  var name = clean_(req.name, 80);
  if (name.length < 2) throw fail_('Please enter your full name.');
  checkPassword_(req.password);

  var user = findUser_(email);
  if (user && truthy_(user.verified)) throw fail_('An account with this email already exists. Please sign in.');

  var salt = newSalt_();
  var rec = { email: email, name: name, salt: salt, hash: 'x' + hashPw_(req.password, salt), verified: 'FALSE',
              createdAt: new Date(), lastLogin: '' };
  if (user) writeRow_('Users', user._row, rec); else appendRow_('Users', rec);

  sendCode_(email, 'verify', name);
  return { message: 'We sent a 6-digit code to ' + email + '.' };
}

function verify_(req) {
  var email = normEmail_(req.email);
  var user = findUser_(email);
  if (!user) throw fail_('Account not found. Please create it again.');
  consumeCode_(email, 'verify', req.code);
  user.verified = 'TRUE';
  user.lastLogin = new Date();
  writeRow_('Users', user._row, user);
  prune_();
  return sessionFor_(user);
}

function resend_(req) {
  var email = normEmail_(req.email);
  var user = findUser_(email);
  if (user && !truthy_(user.verified)) sendCode_(email, 'verify', user.name);
  return { message: 'If that account is waiting for verification, a new code is on its way.' };
}

function login_(req) {
  var email = normEmail_(req.email);
  throttleCheck_('lf:' + email);
  var user = findUser_(email);
  var salt = user ? String(user.salt) : 'dummy-salt';
  var ok = hashEq_('x' + hashPw_(String(req.password || ''), salt), user ? String(user.hash) : 'x-no-user');
  if (!user || !ok) {
    throttleHit_('lf:' + email);
    throw fail_('Incorrect email or password.');
  }
  if (!truthy_(user.verified)) {
    sendCode_(email, 'verify', user.name);
    throw fail_('Please verify your email first. We just sent you a new code.', 'UNVERIFIED');
  }
  CacheService.getScriptCache().remove('lf:' + email);
  user.lastLogin = new Date();
  writeRow_('Users', user._row, user);
  prune_();
  return sessionFor_(user);
}

function logout_(req) {
  var h = 'x' + sha_(String(req.token || ''));
  rows_('Sessions').forEach(function (s) { if (String(s.tokenHash) === h) deleteRow_('Sessions', s._row); });
  return {};
}

function requestReset_(req) {
  var email = normEmail_(req.email);
  var user = findUser_(email);
  if (user && truthy_(user.verified)) {
    try { sendCode_(email, 'reset', user.name); } catch (ex) { /* never reveal whether the account exists */ }
  }
  return { message: 'If that account exists, a reset code is on its way.' };
}

function resetPassword_(req) {
  var email = normEmail_(req.email);
  checkPassword_(req.password);
  var user = findUser_(email);
  if (!user) throw fail_('Incorrect or expired code.');
  consumeCode_(email, 'reset', req.code);
  user.salt = newSalt_();
  user.hash = 'x' + hashPw_(req.password, user.salt);
  writeRow_('Users', user._row, user);
  // sign the user out everywhere
  rows_('Sessions').reverse().forEach(function (s) {
    if (String(s.email) === email && s.kind === 'user') deleteRow_('Sessions', s._row);
  });
  return { message: 'Password updated. You can sign in now.' };
}

/* ---- verification codes ---- */

function sendCode_(email, purpose, name) {
  var cache = CacheService.getScriptCache();
  var key = 'rl:' + purpose + ':' + email;
  var n = Number(cache.get(key) || 0);
  if (n >= CFG.CODES_PER_HOUR) throw fail_('Too many code requests. Please try again in an hour.');
  cache.put(key, String(n + 1), 3600);

  var code = ('000000' + (parseInt(randomHex_().slice(0, 8), 16) % 1000000)).slice(-6);
  rows_('Codes').reverse().forEach(function (c) {
    if (String(c.email) === email && c.purpose === purpose) deleteRow_('Codes', c._row);
  });
  appendRow_('Codes', {
    email: email, purpose: purpose, codeHash: 'x' + codeHash_(email, purpose, code),
    expiresAt: new Date(Date.now() + CFG.CODE_TTL_MIN * 60000), attempts: 0
  });

  var heading = purpose === 'verify' ? 'Verify your email' : 'Reset your password';
  var intro = purpose === 'verify'
    ? 'Hi ' + esc_(firstName_(name)) + ', use this code to finish creating your ' + CFG.APP_NAME + ' account.'
    : 'Use this code to choose a new password for your ' + CFG.APP_NAME + ' account.';
  sendMail_(email, 'Your ' + CFG.APP_NAME + ' code: ' + code, heading,
    '<p>' + intro + '</p>' +
    '<p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:20px 0;color:#111">' + code + '</p>' +
    '<p style="color:#6e6e6e;font-size:13px">The code expires in ' + CFG.CODE_TTL_MIN + ' minutes. If you didn\'t ask for it, you can ignore this email.</p>',
    'Your code is ' + code + ' (valid for ' + CFG.CODE_TTL_MIN + ' minutes).');
}

function consumeCode_(email, purpose, code) {
  code = String(code || '').trim();
  var row = null;
  rows_('Codes').forEach(function (c) { if (String(c.email) === email && c.purpose === purpose) row = c; });
  if (!row || ts_(row.expiresAt) < Date.now()) {
    if (row) deleteRow_('Codes', row._row);
    throw fail_('That code has expired. Please request a new one.');
  }
  var tries = Number(row.attempts) || 0;
  if (tries >= CFG.CODE_MAX_TRIES) {
    deleteRow_('Codes', row._row);
    throw fail_('Too many wrong attempts. Please request a new code.');
  }
  if (!/^\d{6}$/.test(code) || !hashEq_('x' + codeHash_(email, purpose, code), String(row.codeHash))) {
    row.attempts = tries + 1;
    writeRow_('Codes', row._row, row);
    throw fail_('Incorrect code. ' + (CFG.CODE_MAX_TRIES - row.attempts) + ' tries left.');
  }
  deleteRow_('Codes', row._row);
}

/* ============================ SESSIONS ============================ */

function sessionFor_(user) {
  return {
    token: newSession_(user.email, 'user', CFG.USER_SESSION_DAYS * 86400000),
    user: { email: user.email, name: user.name }
  };
}

function newSession_(email, kind, ttlMs) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  appendRow_('Sessions', { tokenHash: 'x' + sha_(token), email: email, kind: kind, expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

function requireSession_(token, kind) {
  if (!token || typeof token !== 'string') throw fail_('Please sign in again.', 'AUTH');
  var h = 'x' + sha_(token), found = null;
  rows_('Sessions').forEach(function (s) { if (String(s.tokenHash) === h && s.kind === kind) found = s; });
  if (!found || ts_(found.expiresAt) < Date.now()) throw fail_('Your session has expired. Please sign in again.', 'AUTH');
  return found;
}

function prune_() {
  ['Sessions', 'Codes'].forEach(function (name) {
    var all = rows_(name);
    var keep = all.filter(function (r) { return ts_(r.expiresAt) >= Date.now(); });
    if (keep.length === all.length) return;
    var sh = sheet_(name), cols = SHEETS[name];
    sh.getRange(2, 1, all.length, cols.length).clearContent();
    if (keep.length) {
      sh.getRange(2, 1, keep.length, cols.length).setValues(keep.map(function (r) {
        return cols.map(function (c) { return r[c] === undefined ? '' : r[c]; });
      }));
    }
  });
}

/* ============================ TOOLS & TICKETS ============================ */

function tools_(req) {
  requireSession_(req.token, 'user');
  var list = rows_('Tools').filter(function (t) { return truthy_(t.active) && String(t.name).trim(); })
    .sort(function (a, b) { return (Number(a.order) || 999) - (Number(b.order) || 999); })
    .map(function (t) {
      return {
        name: String(t.name).trim(), description: String(t.description || ''), url: String(t.url || '').trim(),
        category: String(t.category || 'General').trim() || 'General', icon: String(t.icon || '').trim(),
        status: String(t.status || 'Live').trim() || 'Live'
      };
    });
  return { tools: list };
}

function myTickets_(req) {
  var s = requireSession_(req.token, 'user');
  var mine = rows_('Tickets').filter(function (t) { return String(t.email).toLowerCase() === String(s.email).toLowerCase(); })
    .map(ticketOut_).sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
  return { tickets: mine };
}

function createTicket_(req) {
  var s = requireSession_(req.token, 'user');
  var user = findUser_(String(s.email));
  if (!user) throw fail_('Please sign in again.', 'AUTH');

  var type = CFG.TYPES.indexOf(req.type) > -1 ? req.type : null;
  var priority = CFG.PRIORITIES.indexOf(req.priority) > -1 ? req.priority : 'Medium';
  var title = clean_(req.title, 120), desc = clean_(req.description, 5000);
  if (!type) throw fail_('Choose Bug or Suggestion.');
  if (title.length < 5) throw fail_('Please add a clearer title (5+ characters).');
  if (desc.length < 10) throw fail_('Please add a bit more detail to the description.');

  var props = PropertiesService.getScriptProperties();
  var seq = Number(props.getProperty('TICKET_SEQ') || 0) + 1;
  props.setProperty('TICKET_SEQ', String(seq));
  var id = 'OGA-' + ('0000' + seq).slice(-4);
  var now = new Date();

  var t = {
    id: id, createdAt: now, updatedAt: now, email: user.email, name: user.name, type: type,
    title: title, tool: clean_(req.tool, 100), priority: priority, description: desc,
    steps: type === 'Bug' ? clean_(req.steps, 3000) : '', status: 'New', adminNote: '',
    history: JSON.stringify([{ at: now.toISOString(), status: 'New', note: 'Ticket raised' }])
  };
  appendRow_('Tickets', t);

  safe_(function () {
    sendMail_(user.email, '[' + id + '] We got your ' + type.toLowerCase(), 'Ticket ' + id + ' received',
      '<p>Hi ' + esc_(firstName_(user.name)) + ', thanks for raising this. The Automation team will review it shortly.</p>' + ticketBlock_(t) +
      '<p style="color:#6e6e6e;font-size:13px">Track progress any time in the <strong>My tickets</strong> tab.</p>',
      'Ticket ' + id + ' received: ' + title);
  });
  var adminTo = props.getProperty('ADMIN_EMAIL');
  if (adminTo) {
    safe_(function () {
      sendMail_(adminTo, '[' + id + '] New ' + type.toLowerCase() + ' from ' + user.name, 'New ' + type.toLowerCase() + ' raised',
        '<p>' + esc_(user.name) + ' &lt;' + esc_(user.email) + '&gt; raised a ' + esc_(priority) + '-priority ' + type.toLowerCase() + '.</p>' + ticketBlock_(t),
        'New ticket ' + id + ': ' + title);
    });
  }
  return { ticket: ticketOut_(t) };
}

/* ============================ ADMIN ============================ */

function adminLogin_(req) {
  throttleCheck_('lf:admin');
  var props = PropertiesService.getScriptProperties();
  var u = props.getProperty('ADMIN_USER'), p = props.getProperty('ADMIN_PASS');
  if (!u || !p) throw fail_('Admin access is not configured yet. Set ADMIN_USER and ADMIN_PASS in Script properties.');
  var ok = hashEq_(sha_('u:' + String(req.username || '')), sha_('u:' + u)) &
           hashEq_(sha_('p:' + String(req.password || '')), sha_('p:' + p));
  if (!ok) { throttleHit_('lf:admin'); throw fail_('Incorrect admin username or password.'); }
  CacheService.getScriptCache().remove('lf:admin');
  prune_();
  return { token: newSession_('admin', 'admin', CFG.ADMIN_SESSION_HOURS * 3600000) };
}

function adminTickets_(req) {
  requireSession_(req.token, 'admin');
  var all = rows_('Tickets').map(ticketOut_).sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
  return { tickets: all };
}

function adminUpdate_(req) {
  requireSession_(req.token, 'admin');
  if (CFG.STATUSES.indexOf(req.status) === -1) throw fail_('Invalid status.');
  var row = null;
  rows_('Tickets').forEach(function (t) { if (t.id === req.id) row = t; });
  if (!row) throw fail_('Ticket not found.');

  var note = clean_(req.note, 2000), now = new Date();
  var hist = parseHist_(row.history);
  var changed = row.status !== req.status || note;
  if (changed) hist.push({ at: now.toISOString(), status: req.status, note: note });
  row.status = req.status;
  if (note) row.adminNote = note;
  row.updatedAt = now;
  row.history = JSON.stringify(hist);
  writeRow_('Tickets', row._row, row);

  var emailed = false;
  if (req.notify === true && changed) {
    emailed = safe_(function () {
      sendMail_(row.email, '[' + row.id + '] Status: ' + row.status, 'Ticket ' + row.id + ' updated',
        '<p>Hi ' + esc_(firstName_(row.name)) + ', your ticket is now <strong>' + esc_(row.status) + '</strong>.</p>' +
        (note ? '<p style="background:#f6f6f6;border-left:3px solid #E4002B;padding:10px 14px;white-space:pre-wrap">' + esc_(note) + '</p>' : '') +
        ticketBlock_(row),
        'Ticket ' + row.id + ' is now ' + row.status + (note ? ': ' + note : ''));
    });
  }
  return { ticket: ticketOut_(row), emailed: !!emailed };
}

/* ============================ HELPERS ============================ */

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(msg, code) {
  var e = new Error(msg);
  e.userMessage = msg;
  e.code = code || '';
  return e;
}

function safe_(fn) {
  try { fn(); return true; } catch (ex) { console.error(ex && ex.stack ? ex.stack : ex); return false; }
}

function truthy_(v) { return v === true || /^(true|yes|1)$/i.test(String(v).trim()); }

function ts_(v) { return v instanceof Date ? v.getTime() : (new Date(v).getTime() || 0); }

function iso_(v) { return v instanceof Date ? v.toISOString() : String(v || ''); }

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function firstName_(n) { return String(n || '').trim().split(/\s+/)[0] || 'there'; }

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function normEmail_(raw) {
  var e = String(raw || '').trim().toLowerCase();
  var m = e.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  var domains = (PropertiesService.getScriptProperties().getProperty('ALLOWED_DOMAINS') || CFG.DEFAULT_DOMAINS)
    .toLowerCase().split(',').map(function (d) { return d.trim(); });
  if (!m || e.length > 120 || domains.indexOf(m[1]) === -1) {
    throw fail_('Please use your @' + domains[0] + ' email address.');
  }
  return e;
}

function checkPassword_(p) {
  p = String(p || '');
  if (p.length < 10 || p.length > 128 || !/[a-z]/i.test(p) || !/\d/.test(p)) {
    throw fail_('Password needs 10+ characters with at least one letter and one number.');
  }
}

/* ---- crypto ---- */

function hex_(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function sha_(s) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8));
}

function secret_() { return PropertiesService.getScriptProperties().getProperty('SECRET') || ''; }

function randomHex_() { return sha_(Utilities.getUuid() + Utilities.getUuid() + Date.now()).slice(0, 32); }

// Salts are prefixed so Sheets never mistakes an all-digit value for a number.
function newSalt_() { return 's' + randomHex_(); }

function hashPw_(pw, salt) {
  var h = String(salt) + secret_();
  for (var i = 0; i < CFG.PW_ROUNDS; i++) h = sha_(h + pw);
  return h;
}

function codeHash_(email, purpose, code) { return sha_(secret_() + ':' + email + ':' + purpose + ':' + code); }

function hashEq_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/* ---- throttling (per-key failure counter in cache) ---- */

function throttleCheck_(key) {
  if (Number(CacheService.getScriptCache().get(key) || 0) >= CFG.LOGIN_MAX_FAILS) {
    throw fail_('Too many failed attempts. Please wait 15 minutes and try again.');
  }
}

function throttleHit_(key) {
  var c = CacheService.getScriptCache();
  c.put(key, String(Number(c.get(key) || 0) + 1), CFG.LOGIN_LOCK_SEC);
}

/* ---- sheet access ---- */

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  var book = ss_(), sh = book.getSheetByName(name);
  if (!sh) {
    sh = book.insertSheet(name);
    sh.appendRow(SHEETS[name]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function cell_(v) {
  if (v instanceof Date || typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v == null ? '' : v);
  // stop user text being run as a spreadsheet formula
  return /^[=+\-@\t\r]/.test(s) ? ' ' + s : s;
}

function rows_(name) {
  var sh = sheet_(name), n = sh.getLastRow(), cols = SHEETS[name];
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, cols.length).getValues().map(function (r, i) {
    var o = { _row: i + 2 };
    cols.forEach(function (c, j) { o[c] = r[j]; });
    return o;
  });
}

function toCells_(name, obj) {
  return SHEETS[name].map(function (c) { return cell_(obj[c]); });
}

function appendRow_(name, obj) { sheet_(name).appendRow(toCells_(name, obj)); }

function writeRow_(name, row, obj) {
  sheet_(name).getRange(row, 1, 1, SHEETS[name].length).setValues([toCells_(name, obj)]);
}

function deleteRow_(name, row) { sheet_(name).deleteRow(row); }

function findUser_(email) {
  var found = null;
  rows_('Users').forEach(function (u) { if (String(u.email).toLowerCase() === email) found = u; });
  return found;
}

function parseHist_(h) {
  try { var a = JSON.parse(h); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

function ticketOut_(t) {
  return {
    id: String(t.id), createdAt: iso_(t.createdAt), updatedAt: iso_(t.updatedAt), email: String(t.email), name: String(t.name),
    type: String(t.type), title: String(t.title), tool: String(t.tool || ''), priority: String(t.priority),
    description: String(t.description), steps: String(t.steps || ''), status: String(t.status),
    adminNote: String(t.adminNote || ''), history: parseHist_(t.history)
  };
}

/* ---- email ---- */

function ticketBlock_(t) {
  var rows = [['Ticket', t.id], ['Type', t.type], ['Priority', t.priority], ['Tool', t.tool || '—'], ['Title', t.title]];
  return '<table style="border-collapse:collapse;margin:16px 0;font-size:14px">' + rows.map(function (r) {
    return '<tr><td style="padding:4px 16px 4px 0;color:#6e6e6e">' + r[0] + '</td><td style="padding:4px 0"><strong>' + esc_(r[1]) + '</strong></td></tr>';
  }).join('') + '</table>';
}

function sendMail_(to, subject, heading, bodyHtml, plain) {
  var html = '<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1d1d1d">' +
    '<div style="border-top:4px solid #E4002B;padding:18px 0 4px"><span style="font-size:22px;font-weight:700;color:#E4002B">Ogilvy</span> ' +
    '<span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6e6e6e">Automation Desk</span></div>' +
    '<h2 style="margin:12px 0 8px;color:#111">' + esc_(heading) + '</h2>' + bodyHtml +
    '<p style="border-top:1px solid #e4e4e4;margin-top:24px;padding-top:12px;font-size:12px;color:#6e6e6e">Ogilvy · Automation Team</p></div>';
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, body: plain || heading, name: CFG.APP_NAME });
}

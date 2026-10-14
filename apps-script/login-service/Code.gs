/**
 * Login Service – Google Apps Script
 * ===================================
 * A small, stack-agnostic login backend. Any website or app (React, PHP, .NET,
 * plain HTML...) can call it over HTTPS with JSON. Your Google Sheet is the
 * database and your Google account sends the emails.
 *
 *   Sign up (company email + password) -> 6-digit code by email -> verified
 *   Sign in / sign out / who-am-I (session token)
 *   Forgot password -> code by email -> new password (signs out all devices)
 *   Account settings -> change password, change name, sign out everywhere
 *
 * Everything you may want to tune is a Script Property (Project Settings ->
 * Script properties). Run setup() once and every setting appears there with its
 * default value, ready to edit. See README.md for the full guide.
 *
 * Request:  POST <web app URL>   body (text) = JSON { "action": "...", ... }
 * Response: JSON { "ok": true, ... }  or  { "ok": false, "error": "...", "code": "..." }
 */

/* =========================== SETTINGS =========================== */

var DEFAULTS = {
  APP_NAME: 'My App',                 // shown in emails
  SENDER_NAME: '',                    // "From" name; empty = APP_NAME
  ALLOWED_DOMAINS: 'ogilvy.com',      // comma separated, or * for any email address
  CODE_TTL_MIN: 15,                   // minutes a 6-digit code stays valid
  CODE_MAX_TRIES: 5,                  // wrong guesses before a code is burned
  CODES_PER_HOUR: 5,                  // code emails per address, per purpose, per hour
  LOGIN_MAX_FAILS: 8,                 // wrong passwords before a temporary lock
  LOCK_MINUTES: 15,                   // length of that lock
  SESSION_DAYS: 7,                    // how long a sign-in lasts
  MIN_PASSWORD: 6,                    // shortest allowed password
  PASSWORD_NEEDS_MIXED: true,         // require at least one letter AND one number
  PW_ROUNDS: 1000,                    // hashing rounds (higher = slower, stronger)
  LOG_ROWS: 2000,                     // how many AuthLog rows to keep
  NOTIFY_PASSWORD_CHANGE: true        // email the user when their password changes
};

var SHEETS = {
  Users: ['email', 'name', 'salt', 'hash', 'verified', 'createdAt', 'lastLogin', 'passwordChangedAt'],
  Codes: ['email', 'purpose', 'codeHash', 'expiresAt', 'attempts'],
  Sessions: ['tokenHash', 'email', 'expiresAt', 'createdAt'],
  AuthLog: ['time', 'event', 'email', 'detail']
};

var ACTIONS = {
  config: config_,
  register: register_, verify: verify_, resend: resend_,
  login: login_, me: me_, logout: logout_, logoutAll: logoutAll_,
  requestReset: requestReset_, resetPassword: resetPassword_,
  changePassword: changePassword_, updateProfile: updateProfile_
};
// Actions that write to the sheet are serialised so rows never collide.
var WRITE_ACTIONS = ['register', 'verify', 'resend', 'login', 'logout', 'logoutAll',
                     'requestReset', 'resetPassword', 'changePassword', 'updateProfile'];

var _props = null;
function cfg_(key) {
  _props = _props || PropertiesService.getScriptProperties().getProperties();
  var raw = _props[key], d = DEFAULTS[key];
  if (raw === undefined || raw === null || String(raw).trim() === '') return d;
  if (typeof d === 'number') { var n = Number(raw); return isFinite(n) && n > 0 ? n : d; }
  if (typeof d === 'boolean') return /^(true|yes|1)$/i.test(String(raw).trim());
  return String(raw).trim();
}

/* =========================== ENTRY POINTS =========================== */

function doGet(e) {
  // Handy for checking the deployment in a browser: ?action=config
  var action = e && e.parameter && e.parameter.action;
  if (action === 'config') return json_(Object.assign({ ok: true }, config_()));
  return json_({ ok: true, service: cfg_('APP_NAME') + ' login service', message: 'Running. Use POST.' });
}

function doPost(e) {
  var out, lock = null;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!Object.prototype.hasOwnProperty.call(ACTIONS, req.action)) throw fail_('Unknown action.');
    if (WRITE_ACTIONS.indexOf(req.action) > -1) {
      lock = LockService.getScriptLock();
      lock.waitLock(25000);
    }
    out = ACTIONS[req.action](req) || {};
    out.ok = true;
  } catch (ex) {
    out = { ok: false, error: ex.userMessage || 'Something went wrong. Please try again.', code: ex.code || '' };
    if (!ex.userMessage) console.error(ex && ex.stack ? ex.stack : ex);
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (x) {} }
  }
  return json_(out);
}

/* =========================== ADMIN HELPERS (run from the editor) =========================== */

/** Run once. Creates the sheets, a private secret, and writes every setting (with its default) into Script properties. */
function setup() {
  Object.keys(SHEETS).forEach(function (n) { sheet_(n); });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  var existing = props.getProperties();
  Object.keys(DEFAULTS).forEach(function (k) {
    if (existing[k] === undefined) props.setProperty(k, String(DEFAULTS[k]));
  });
  Logger.log('Setup complete. Edit the settings under Project Settings -> Script properties, then Deploy -> New deployment -> Web app.');
  showSettings();
}

/** Prints the settings currently in force (never prints the secret). */
function showSettings() {
  _props = null;
  Object.keys(DEFAULTS).forEach(function (k) { Logger.log(k + ' = ' + cfg_(k)); });
  Logger.log('Web app URL: ' + (ScriptApp.getService().getUrl() || '(not deployed yet)'));
  Logger.log('Emails left today: ' + MailApp.getRemainingDailyQuota());
}

/** Sends a sample code email to YOU (the script owner) to prove real delivery. */
function sendTestEmail() {
  var me = Session.getEffectiveUser().getEmail();
  sendCodeMail_(me, 'verify', '123456', 'Test');
  Logger.log('Test email sent to ' + me + '. Check your inbox (and spam).');
}

/** Deletes expired codes and sessions right now (also happens automatically). */
function cleanUp() { prune_(); trimLog_(); Logger.log('Clean-up done.'); }

/* =========================== PUBLIC ACTIONS =========================== */

/** Public settings so a front end can show the right hints. Contains nothing secret. */
function config_() {
  return {
    appName: cfg_('APP_NAME'),
    allowedDomains: cfg_('ALLOWED_DOMAINS').split(',').map(function (d) { return d.trim(); }),
    codeLength: 6,
    codeTtlMinutes: cfg_('CODE_TTL_MIN'),
    sessionDays: cfg_('SESSION_DAYS'),
    minPassword: cfg_('MIN_PASSWORD'),
    passwordNeedsLetterAndNumber: cfg_('PASSWORD_NEEDS_MIXED'),
    passwordHint: passwordHint_()
  };
}

function register_(req) {
  var email = normEmail_(req.email);
  var name = clean_(req.name, 80);
  if (name.length < 2) throw fail_('Please enter your full name.');
  checkPassword_(req.password);

  var user = findUser_(email);
  if (user && truthy_(user.verified)) throw fail_('An account with this email already exists. Please sign in.');

  var salt = newSalt_();
  var rec = {
    email: email, name: name, salt: salt, hash: 'x' + hashPw_(req.password, salt), verified: 'FALSE',
    createdAt: new Date(), lastLogin: '', passwordChangedAt: new Date()
  };
  if (user) writeRow_('Users', user._row, rec); else appendRow_('Users', rec);
  sendCode_(email, 'verify', name);
  log_('register', email, 'code sent');
  return { message: 'We sent a 6-digit code to ' + email + '.', next: 'verify' };
}

function verify_(req) {
  var email = normEmail_(req.email);
  var user = findUser_(email);
  if (!user) throw fail_('Account not found. Please create it again.');
  consumeCode_(email, 'verify', req.code);
  user.verified = 'TRUE';
  user.lastLogin = new Date();
  writeRow_('Users', user._row, user);
  log_('verified', email, '');
  return startSession_(user);
}

function resend_(req) {
  var email = normEmail_(req.email);
  var user = findUser_(email);
  // Same answer whether or not the account exists.
  if (user && !truthy_(user.verified)) sendCode_(email, 'verify', user.name);
  return { message: 'If that account is waiting for verification, a new code is on its way.' };
}

function login_(req) {
  var email = normEmail_(req.email);
  throttleCheck_('lf:' + email);
  var user = findUser_(email);
  var salt = user ? String(user.salt) : 'sdummy-salt';
  // Always hash, even for unknown emails, so timing does not reveal who has an account.
  var ok = hashEq_('x' + hashPw_(String(req.password || ''), salt), user ? String(user.hash) : 'x-no-user');
  if (!user || !ok) {
    throttleHit_('lf:' + email);
    log_('login_failed', email, user ? 'bad password' : 'unknown email');
    throw fail_('Incorrect email or password.');
  }
  if (!truthy_(user.verified)) {
    sendCode_(email, 'verify', user.name);
    throw fail_('Please verify your email first. We just sent you a new code.', 'UNVERIFIED');
  }
  CacheService.getScriptCache().remove('lf:' + email);
  user.lastLogin = new Date();
  writeRow_('Users', user._row, user);
  log_('login', email, '');
  return startSession_(user);
}

/** Who is signed in? A host system's server can call this to validate a token. */
function me_(req) {
  var s = requireSession_(req.token);
  var user = findUser_(String(s.email));
  if (!user || !truthy_(user.verified)) throw fail_('Please sign in again.', 'AUTH');
  return { user: publicUser_(user), expiresAt: iso_(s.expiresAt) };
}

function logout_(req) {
  var h = 'x' + sha_(String(req.token || ''));
  rows_('Sessions').forEach(function (s) {
    if (String(s.tokenHash) === h) { deleteRow_('Sessions', s._row); CacheService.getScriptCache().remove('s:' + h); log_('logout', s.email, ''); }
  });
  return {};
}

/** Sign out on every device (account settings). */
function logoutAll_(req) {
  var s = requireSession_(req.token);
  var n = revokeSessions_(String(s.email), null);
  log_('logout_all', s.email, n + ' sessions');
  return { message: 'Signed out everywhere.', revoked: n };
}

/* ---- forgot password ---- */

function requestReset_(req) {
  var email = normEmail_(req.email);
  var user = findUser_(email);
  if (user && truthy_(user.verified)) {
    try { sendCode_(email, 'reset', user.name); log_('reset_requested', email, ''); }
    catch (ex) { console.error(ex); } // never reveal whether the account exists
  }
  return { message: 'If that account exists, a reset code is on its way to ' + email + '.', next: 'reset' };
}

function resetPassword_(req) {
  var email = normEmail_(req.email);
  checkPassword_(req.password);
  var user = findUser_(email);
  if (!user) throw fail_('Incorrect or expired code.');
  consumeCode_(email, 'reset', req.code);
  setPassword_(user, req.password);
  revokeSessions_(email, null); // sign out everywhere
  log_('password_reset', email, '');
  notifyPasswordChanged_(user, 'reset');
  return { message: 'Password updated. You can sign in now.' };
}

/* ---- account settings ---- */

function changePassword_(req) {
  var s = requireSession_(req.token);
  var user = findUser_(String(s.email));
  if (!user) throw fail_('Please sign in again.', 'AUTH');
  throttleCheck_('lf:' + user.email);
  if (!hashEq_('x' + hashPw_(String(req.currentPassword || ''), String(user.salt)), String(user.hash))) {
    throttleHit_('lf:' + user.email);
    log_('change_password_failed', user.email, 'wrong current password');
    throw fail_('Your current password is not correct.');
  }
  checkPassword_(req.newPassword);
  if (String(req.newPassword) === String(req.currentPassword)) throw fail_('Choose a password different from the current one.');
  setPassword_(user, req.newPassword);
  // Keep THIS device signed in, sign every other device out.
  revokeSessions_(String(user.email), 'x' + sha_(String(req.token)));
  log_('password_changed', user.email, '');
  notifyPasswordChanged_(user, 'change');
  return { message: 'Password changed. Other devices were signed out.' };
}

function updateProfile_(req) {
  var s = requireSession_(req.token);
  var user = findUser_(String(s.email));
  if (!user) throw fail_('Please sign in again.', 'AUTH');
  var name = clean_(req.name, 80);
  if (name.length < 2) throw fail_('Please enter your full name.');
  user.name = name;
  writeRow_('Users', user._row, user);
  log_('profile_updated', user.email, '');
  return { user: publicUser_(user) };
}

/* =========================== CODES =========================== */

function sendCode_(email, purpose, name) {
  var cache = CacheService.getScriptCache();
  var key = 'rl:' + purpose + ':' + email;
  var n = Number(cache.get(key) || 0);
  if (n >= cfg_('CODES_PER_HOUR')) throw fail_('Too many code requests. Please try again in an hour.');

  var code = ('000000' + (parseInt(randomHex_().slice(0, 8), 16) % 1000000)).slice(-6);
  var previous = rows_('Codes').filter(function (c) { return String(c.email) === email && c.purpose === purpose; });
  try {
    sendCodeMail_(email, purpose, code, name); // send first: a failed send must not use up the allowance
  } catch (ex) {
    console.error(ex);
    throw fail_('We could not send the email just now. Please try again shortly.');
  }
  cache.put(key, String(n + 1), 3600);
  previous.reverse().forEach(function (c) { deleteRow_('Codes', c._row); });
  appendRow_('Codes', {
    email: email, purpose: purpose, codeHash: 'x' + codeHash_(email, purpose, code),
    expiresAt: new Date(Date.now() + cfg_('CODE_TTL_MIN') * 60000), attempts: 0
  });
}

function consumeCode_(email, purpose, input) {
  var code = String(input || '').trim();
  var row = null;
  rows_('Codes').forEach(function (c) { if (String(c.email) === email && c.purpose === purpose) row = c; });
  if (!row || ts_(row.expiresAt) < Date.now()) {
    if (row) deleteRow_('Codes', row._row);
    throw fail_('That code has expired. Please request a new one.');
  }
  var tries = Number(row.attempts) || 0;
  if (tries >= cfg_('CODE_MAX_TRIES')) {
    deleteRow_('Codes', row._row);
    throw fail_('Too many wrong attempts. Please request a new code.');
  }
  if (!/^\d{6}$/.test(code) || !hashEq_('x' + codeHash_(email, purpose, code), String(row.codeHash))) {
    row.attempts = tries + 1;
    writeRow_('Codes', row._row, row);
    log_('code_failed', email, purpose);
    throw fail_('Incorrect code. ' + Math.max(0, cfg_('CODE_MAX_TRIES') - row.attempts) + ' tries left.');
  }
  deleteRow_('Codes', row._row);
}

/* =========================== EMAIL =========================== */

function sendCodeMail_(to, purpose, code, name) {
  var app = cfg_('APP_NAME');
  var verify = purpose === 'verify';
  var heading = verify ? 'Verify your email' : 'Reset your password';
  var intro = verify
    ? 'Hi ' + esc_(firstName_(name)) + ', use this code to finish creating your ' + esc_(app) + ' account.'
    : 'Hi ' + esc_(firstName_(name)) + ', use this code to choose a new password for your ' + esc_(app) + ' account.';
  sendMail_(to, app + ' code: ' + code, heading,
    '<p>' + intro + '</p>' +
    '<p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:20px 0;color:#111">' + code + '</p>' +
    '<p style="color:#6e6e6e;font-size:13px">The code expires in ' + cfg_('CODE_TTL_MIN') + ' minutes. If you didn\'t ask for it, you can ignore this email.</p>',
    'Your ' + app + ' code is ' + code + ' (valid for ' + cfg_('CODE_TTL_MIN') + ' minutes).');
}

function notifyPasswordChanged_(user, how) {
  if (!cfg_('NOTIFY_PASSWORD_CHANGE')) return;
  try {
    sendMail_(String(user.email), cfg_('APP_NAME') + ': your password was changed', 'Password changed',
      '<p>Hi ' + esc_(firstName_(user.name)) + ', the password on your ' + esc_(cfg_('APP_NAME')) + ' account was just ' +
      (how === 'reset' ? 'reset' : 'changed') + '.</p>' +
      '<p style="color:#6e6e6e;font-size:13px">If this was you, no action is needed. If it wasn\'t, reset your password straight away and tell your administrator.</p>',
      'The password on your ' + cfg_('APP_NAME') + ' account was just ' + (how === 'reset' ? 'reset' : 'changed') + '.');
  } catch (ex) { console.error(ex); }
}

function sendMail_(to, subject, heading, bodyHtml, plain) {
  var app = cfg_('APP_NAME');
  var html = '<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1d1d1d">' +
    '<div style="border-top:4px solid #E4002B;padding:18px 0 4px"><span style="font-size:22px;font-weight:700;color:#E4002B">' + esc_(app) + '</span></div>' +
    '<h2 style="margin:12px 0 8px;color:#111">' + esc_(heading) + '</h2>' + bodyHtml +
    '<p style="border-top:1px solid #e4e4e4;margin-top:24px;padding-top:12px;font-size:12px;color:#6e6e6e">' + esc_(app) + '</p></div>';
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, body: plain || heading, name: cfg_('SENDER_NAME') || app });
}

/* =========================== SESSIONS =========================== */

function startSession_(user) {
  prune_();
  trimLog_();
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  appendRow_('Sessions', {
    tokenHash: 'x' + sha_(token), email: user.email,
    expiresAt: new Date(Date.now() + cfg_('SESSION_DAYS') * 86400000), createdAt: new Date()
  });
  return { token: token, user: publicUser_(user), expiresInDays: cfg_('SESSION_DAYS') };
}

function requireSession_(token) {
  if (!token || typeof token !== 'string' || token.length < 20) throw fail_('Please sign in again.', 'AUTH');
  var h = 'x' + sha_(token), cache = CacheService.getScriptCache();
  var hit = cache.get('s:' + h);
  if (hit) {
    var p = JSON.parse(hit);
    if (p.exp > Date.now()) return { email: p.email, expiresAt: new Date(p.exp) };
  }
  var found = null;
  rows_('Sessions').forEach(function (s) { if (String(s.tokenHash) === h) found = s; });
  if (!found || ts_(found.expiresAt) < Date.now()) throw fail_('Your session has expired. Please sign in again.', 'AUTH');
  cache.put('s:' + h, JSON.stringify({ email: String(found.email), exp: ts_(found.expiresAt) }), 300);
  return found;
}

/** Removes a user's sessions (optionally keeping one). Returns how many were removed. */
function revokeSessions_(email, keepHash) {
  var cache = CacheService.getScriptCache(), n = 0;
  rows_('Sessions').reverse().forEach(function (s) {
    if (String(s.email) === email && String(s.tokenHash) !== keepHash) {
      cache.remove('s:' + String(s.tokenHash));
      deleteRow_('Sessions', s._row);
      n++;
    }
  });
  return n;
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

/* =========================== USERS & PASSWORDS =========================== */

function findUser_(email) {
  var found = null;
  rows_('Users').forEach(function (u) { if (String(u.email).toLowerCase() === email) found = u; });
  return found;
}

function publicUser_(u) { return { email: String(u.email), name: String(u.name) }; }

function setPassword_(user, newPassword) {
  user.salt = newSalt_();
  user.hash = 'x' + hashPw_(newPassword, user.salt);
  user.passwordChangedAt = new Date();
  writeRow_('Users', user._row, user);
  CacheService.getScriptCache().remove('lf:' + user.email);
}

function passwordHint_() {
  var min = cfg_('MIN_PASSWORD');
  return 'At least ' + min + ' characters' + (cfg_('PASSWORD_NEEDS_MIXED') ? ', with a letter and a number.' : '.');
}

function checkPassword_(p) {
  p = String(p || '');
  var ok = p.length >= cfg_('MIN_PASSWORD') && p.length <= 128;
  if (ok && cfg_('PASSWORD_NEEDS_MIXED')) ok = /[a-z]/i.test(p) && /\d/.test(p);
  if (!ok) throw fail_('Password needs ' + passwordHint_().replace(/\.$/, '').replace('At least ', '') + '.');
}

function normEmail_(raw) {
  var e = String(raw || '').trim().toLowerCase();
  var m = e.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  var domains = cfg_('ALLOWED_DOMAINS').toLowerCase().split(',').map(function (d) { return d.trim(); }).filter(Boolean);
  var any = domains.indexOf('*') > -1;
  if (!m || e.length > 120 || (!any && domains.indexOf(m[1]) === -1)) {
    throw fail_(any ? 'Please enter a valid email address.' : 'Please use your @' + domains[0] + ' email address.');
  }
  return e;
}

/* =========================== CRYPTO & THROTTLING =========================== */

function hex_(bytes) { return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join(''); }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)); }
function secret_() { return PropertiesService.getScriptProperties().getProperty('SECRET') || ''; }
function randomHex_() { return sha_(Utilities.getUuid() + Utilities.getUuid() + Date.now()).slice(0, 32); }
// Prefixed so Sheets never mistakes an all-digit value for a number.
function newSalt_() { return 's' + randomHex_(); }

function hashPw_(pw, salt) {
  var h = String(salt) + secret_();
  for (var i = 0, n = cfg_('PW_ROUNDS'); i < n; i++) h = sha_(h + pw);
  return h;
}

function codeHash_(email, purpose, code) { return sha_(secret_() + ':' + email + ':' + purpose + ':' + code); }

function hashEq_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function throttleCheck_(key) {
  if (Number(CacheService.getScriptCache().get(key) || 0) >= cfg_('LOGIN_MAX_FAILS')) {
    throw fail_('Too many failed attempts. Please wait ' + cfg_('LOCK_MINUTES') + ' minutes and try again.', 'LOCKED');
  }
}

function throttleHit_(key) {
  var c = CacheService.getScriptCache();
  c.put(key, String(Number(c.get(key) || 0) + 1), Math.min(cfg_('LOCK_MINUTES') * 60, 21600));
}

/* =========================== SHEET ACCESS & SMALL HELPERS =========================== */

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function fail_(msg, code) {
  var e = new Error(msg);
  e.userMessage = msg;
  e.code = code || '';
  return e;
}

function truthy_(v) { return v === true || /^(true|yes|1)$/i.test(String(v).trim()); }
function ts_(v) { return v instanceof Date ? v.getTime() : (new Date(v).getTime() || 0); }
function iso_(v) { return v instanceof Date ? v.toISOString() : String(v || ''); }
function firstName_(n) { return String(n || '').trim().split(/\s+/)[0] || 'there'; }

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

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

// Stops user-typed text from being run as a spreadsheet formula.
function cell_(v) {
  if (v instanceof Date || typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v == null ? '' : v);
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

function toCells_(name, obj) { return SHEETS[name].map(function (c) { return cell_(obj[c]); }); }
function appendRow_(name, obj) { sheet_(name).appendRow(toCells_(name, obj)); }
function writeRow_(name, row, obj) { sheet_(name).getRange(row, 1, 1, SHEETS[name].length).setValues([toCells_(name, obj)]); }
function deleteRow_(name, row) { sheet_(name).deleteRow(row); }

/** Audit trail: who did what and when. Never contains passwords, codes or tokens. */
function log_(event, email, detail) {
  try { appendRow_('AuthLog', { time: new Date(), event: event, email: email || '', detail: detail || '' }); }
  catch (ex) { console.error(ex); }
}

function trimLog_() {
  var sh = sheet_('AuthLog'), n = sh.getLastRow(), keep = cfg_('LOG_ROWS');
  if (n - 1 > keep * 1.2) sh.deleteRows(2, n - 1 - keep);
}

// Runs Code.gs in Node with in-memory stand-ins for Google's services, so the
// whole login flow can be tested without a Google account.
//   node test-harness.js            -> runs the built-in checks
//   const h = require('./test-harness'); h.call('login', {...})   -> use from your own tests
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path');

function create(codePath = path.join(__dirname, 'Code.gs')) {
  const props = {}, cache = {}, mails = [], sheets = {};
  let offset = 0; // milliseconds the fake clock is ahead of real time
  class FDate extends Date {
    constructor(...a) { a.length ? super(...a) : super(Date.now() + offset); }
    static now() { return Date.now() + offset; }
  }
  const mkSheet = (name) => {
    const rows = [];
    return {
      name, rows,
      appendRow: (r) => { rows.push(r.slice()); },
      getLastRow: () => rows.length,
      setFrozenRows() {},
      deleteRow: (i) => { rows.splice(i - 1, 1); },
      deleteRows: (i, n) => { rows.splice(i - 1, n); },
      getRange: (r, c, nr, nc) => ({
        getValues: () => rows.slice(r - 1, r - 1 + nr).map((x) => x.slice(c - 1, c - 1 + nc)),
        setValues: (v) => v.forEach((row, i) => { rows[r - 1 + i] = row.slice(); }),
        clearContent: () => { rows.splice(r - 1, nr); },
      }),
    };
  };
  const ctx = {
    console: { log() {}, error() {}, warn() {} }, JSON, Math, parseInt, String, Number, Array, Object, RegExp, Error, Date: FDate, isFinite,
    Logger: { log() {} },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@ogilvy.com' }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => sheets[n], insertSheet: (n) => (sheets[n] = mkSheet(n)) }), openById() {} },
    Utilities: {
      computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()].map((b) => (b > 127 ? b - 256 : b)),
      DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }, getUuid: () => crypto.randomUUID(),
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); },
      getProperties: () => ({ ...props }),
    }) },
    CacheService: { getScriptCache: () => ({
      get: (k) => { const e = cache[k]; if (!e) return null; if (e.exp && e.exp < Date.now() + offset) { delete cache[k]; return null; } return e.v; },
      put: (k, v, ttl) => { cache[k] = { v, exp: ttl ? Date.now() + offset + ttl * 1000 : 0 }; },
      remove: (k) => { delete cache[k]; },
    }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: (o) => { if (!/^[^\s@,;]+@[^\s@,;]+$/.test(o.to)) throw new Error('Invalid email: ' + o.to); mails.push(o); } },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }) },
    ContentService: { MimeType: { JSON: 1 }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(codePath, 'utf8'), ctx);
  ctx.setup();
  // Google starts every request as a fresh execution, so per-request caches are cleared.
  const call = (action, body = {}) => (ctx._props = null, JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ action, ...body }) } }).s));
  return {
    ctx, call, mails, sheets, props, cache,
    advance: (ms) => { offset += ms; },
    setProp: (k, v) => { props[k] = String(v); },
    lastCode: (to) => { const m = [...mails].reverse().find((x) => x.to === to && /code/i.test(x.subject)); return m && m.subject.match(/(\d{6})/)[1]; },
    get: () => (ctx._props = null, JSON.parse(ctx.doGet({ parameter: { action: 'config' } }).s)),
  };
}
module.exports = { create };

/* ------------------------- built-in checks ------------------------- */
if (require.main === module) {
  const assert = require('assert');
  let n = 0;
  const ok = (m) => console.log('PASS', ++n, m);
  const h = create();
  const { call, mails, sheets } = h;
  const MIN = 60000, HOUR = 3600000, DAY = 86400000;

  // --- settings
  let r = h.get();
  assert(r.ok && r.minPassword === 6 && r.allowedDomains[0] === 'ogilvy.com' && r.codeTtlMinutes === 15); ok('config returns the public settings (and no secrets)');
  assert(!JSON.stringify(r).includes(h.props.SECRET)); 
  assert(h.props.SECRET && h.props.CODE_TTL_MIN === '15' && h.props.ALLOWED_DOMAINS === 'ogilvy.com'); ok('setup() wrote every setting into Script properties');

  // --- sign up
  r = call('register', { name: 'Sam Lee', email: 'sam@gmail.com', password: 'abc123' }); assert(!r.ok && /@ogilvy\.com/.test(r.error)); ok('other email domains are refused');
  r = call('register', { name: 'Sam Lee', email: 'sam.lee@ogilvy.com', password: 'abc12' }); assert(!r.ok && /6 characters/.test(r.error)); ok('5-character password refused (minimum 6)');
  r = call('register', { name: 'Sam Lee', email: 'sam.lee@ogilvy.com', password: 'abcdef' }); assert(!r.ok); ok('letters-only password refused (needs a number too)');
  r = call('register', { name: 'S', email: 'sam.lee@ogilvy.com', password: 'abc123' }); assert(!r.ok); ok('one-letter name refused');
  r = call('register', { name: '=HYPERLINK("http://x")', email: 'Sam.Lee@Ogilvy.com', password: 'abc123' }); assert(r.ok && r.next === 'verify'); ok('valid sign-up accepted; email is case-insensitive');
  assert(mails.length === 1 && mails[0].to === 'sam.lee@ogilvy.com' && /code: \d{6}/.test(mails[0].subject)); ok('a 6-digit code email was sent to the address');
  const u = sheets.Users.rows[0]; assert(!/^=/.test(u[1]) && !JSON.stringify(sheets.Users.rows).includes('abc123')); ok('password never stored in clear; a name starting with "=" cannot become a formula');
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'abc123' }); assert(!r.ok && r.code === 'UNVERIFIED'); ok('cannot sign in before verifying (a new code is sent)');
  r = call('register', { name: 'Sam Lee', email: 'sam.lee@ogilvy.com', password: 'abc123' }); assert(r.ok); ok('re-registering an unverified address is allowed (retry)');

  // --- verify
  r = call('verify', { email: 'sam.lee@ogilvy.com', code: '000000' }); assert(!r.ok && /Incorrect code\. 4 tries left/.test(r.error)); ok('wrong code: "4 tries left"');
  r = call('verify', { email: 'sam.lee@ogilvy.com', code: h.lastCode('sam.lee@ogilvy.com') }); assert(r.ok && r.token.length >= 40 && r.user.name.startsWith('')); const token = r.token; ok('right code verifies and signs in (returns a session token)');
  r = call('verify', { email: 'sam.lee@ogilvy.com', code: h.lastCode('sam.lee@ogilvy.com') }); assert(!r.ok); ok('a code cannot be used twice');
  assert(!JSON.stringify(sheets.Sessions.rows).includes(token) && !JSON.stringify(sheets.Codes.rows).includes(h.lastCode('sam.lee@ogilvy.com'))); ok('tokens are stored only as hashes');

  // --- me / session
  r = call('me', { token }); assert(r.ok && r.user.email === 'sam.lee@ogilvy.com'); ok('me: a valid token returns the user');
  r = call('me', { token: 'x'.repeat(40) }); assert(!r.ok && r.code === 'AUTH'); ok('me: a made-up token is rejected (code AUTH)');
  r = call('me', {}); assert(!r.ok && r.code === 'AUTH'); ok('me: no token is rejected');

  // --- login
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'wrongpass1' }); assert(!r.ok && /Incorrect email or password/.test(r.error)); ok('wrong password: generic message');
  r = call('login', { email: 'nobody@ogilvy.com', password: 'abc123' }); assert(!r.ok && /Incorrect email or password/.test(r.error)); ok('unknown email: the SAME generic message (no account enumeration)');
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'abc123' }); assert(r.ok && r.token !== token); const t2 = r.token; ok('correct password signs in (new token)');

  // --- lockout
  for (let i = 0; i < 8; i++) call('login', { email: 'sam.lee@ogilvy.com', password: 'bad' + i });
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'abc123' }); assert(!r.ok && r.code === 'LOCKED'); ok('8 wrong passwords lock the account, even for the right password');
  h.advance(16 * MIN); r = call('login', { email: 'sam.lee@ogilvy.com', password: 'abc123' }); assert(r.ok); ok('...and the lock lifts after 15 minutes');

  // --- forgot password
  const before = mails.length;
  r = call('requestReset', { email: 'ghost@ogilvy.com' }); assert(r.ok && mails.length === before); ok('forgot password: unknown address gets the same reply and NO email');
  r = call('requestReset', { email: 'sam.lee@ogilvy.com' }); assert(r.ok && r.next === 'reset' && mails.length === before + 1); ok('forgot password: a reset code is emailed');
  const rc = h.lastCode('sam.lee@ogilvy.com');
  r = call('resetPassword', { email: 'sam.lee@ogilvy.com', code: rc, password: 'short' }); assert(!r.ok); ok('reset: weak new password refused');
  r = call('resetPassword', { email: 'sam.lee@ogilvy.com', code: '111111', password: 'newpass99' }); assert(!r.ok); ok('reset: wrong code refused');
  r = call('resetPassword', { email: 'sam.lee@ogilvy.com', code: rc, password: 'newpass99' }); assert(r.ok); ok('reset: right code sets the new password');
  assert(mails.some((m) => /password was changed/.test(m.subject))); ok('a "your password was changed" notice was emailed');
  r = call('me', { token: t2 }); assert(!r.ok && r.code === 'AUTH'); ok('reset signed out every existing session');
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'abc123' }); assert(!r.ok); r = call('login', { email: 'sam.lee@ogilvy.com', password: 'newpass99' }); assert(r.ok); const t3 = r.token; ok('old password stops working, new one works');

  // --- code limits & expiry
  call('requestReset', { email: 'sam.lee@ogilvy.com' });
  for (let i = 0; i < 5; i++) call('resetPassword', { email: 'sam.lee@ogilvy.com', code: '222222', password: 'newpass98' });
  r = call('resetPassword', { email: 'sam.lee@ogilvy.com', code: h.lastCode('sam.lee@ogilvy.com'), password: 'newpass98' }); assert(!r.ok && /expired|request a new/.test(r.error)); ok('5 wrong guesses burn the code (the right code no longer works)');
  call('requestReset', { email: 'sam.lee@ogilvy.com' }); h.advance(16 * MIN);
  r = call('resetPassword', { email: 'sam.lee@ogilvy.com', code: h.lastCode('sam.lee@ogilvy.com'), password: 'newpass98' }); assert(!r.ok && /expired/.test(r.error)); ok('a code is dead after 15 minutes');
  const sent = mails.length; let blocked = null;
  for (let i = 0; i < 7; i++) { r = call('requestReset', { email: 'sam.lee@ogilvy.com' }); }
  assert(mails.length - sent <= 5); ok('no more than 5 code emails per hour per address (' + (mails.length - sent) + ' sent for 7 requests)');
  h.advance(61 * MIN);

  // --- settings (account)
  r = call('updateProfile', { token: t3, name: 'Samantha Lee' }); assert(r.ok && r.user.name === 'Samantha Lee'); ok('settings: change name');
  r = call('me', { token: t3 }); assert(r.user.name === 'Samantha Lee'); ok('settings: new name is returned by me');
  r = call('changePassword', { token: t3, currentPassword: 'wrong', newPassword: 'another11' }); assert(!r.ok && /current password/.test(r.error)); ok('settings: wrong current password refused');
  r = call('changePassword', { token: t3, currentPassword: 'newpass99', newPassword: 'newpass99' }); assert(!r.ok); ok('settings: new password must differ');
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'newpass99' }); const other = r.token;
  r = call('changePassword', { token: t3, currentPassword: 'newpass99', newPassword: 'another11' }); assert(r.ok); ok('settings: change password');
  assert(call('me', { token: t3 }).ok && !call('me', { token: other }).ok); ok('...this device stays signed in, other devices are signed out');
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'another11' }); assert(r.ok); const d2 = r.token;
  r = call('logoutAll', { token: t3 }); assert(r.ok && r.revoked >= 2); assert(!call('me', { token: t3 }).ok && !call('me', { token: d2 }).ok); ok('settings: "sign out everywhere" revokes every session');
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'another11' }); const t4 = r.token;
  r = call('logout', { token: t4 }); assert(r.ok && !call('me', { token: t4 }).ok); ok('logout ends just this session');

  // --- session expiry
  r = call('login', { email: 'sam.lee@ogilvy.com', password: 'another11' }); const t5 = r.token;
  h.advance(6 * DAY); assert(call('me', { token: t5 }).ok); h.advance(2 * DAY); assert(!call('me', { token: t5 }).ok); ok('a session lasts 7 days, then expires');

  // --- settings change behaviour
  h.setProp('MIN_PASSWORD', '10'); h.setProp('PASSWORD_NEEDS_MIXED', 'false');
  r = call('register', { name: 'Kim Park', email: 'kim.park@ogilvy.com', password: 'abcdefghi' }); assert(!r.ok && /10 characters/.test(r.error));
  r = call('register', { name: 'Kim Park', email: 'kim.park@ogilvy.com', password: 'abcdefghij' }); assert(r.ok); ok('changing MIN_PASSWORD / PASSWORD_NEEDS_MIXED in Script properties changes the rules');
  h.setProp('ALLOWED_DOMAINS', 'ogilvy.com, wpp.com'); r = call('register', { name: 'Lee Ray', email: 'lee@wpp.com', password: 'abcdefghij' }); assert(r.ok); ok('ALLOWED_DOMAINS accepts several domains');
  h.setProp('ALLOWED_DOMAINS', '*'); r = call('register', { name: 'Any One', email: 'any@gmail.com', password: 'abcdefghij' }); assert(r.ok); ok('ALLOWED_DOMAINS = * accepts any address');
  h.setProp('APP_NAME', 'Acme Portal'); h.setProp('SENDER_NAME', 'Acme Security'); call('resend', { email: 'kim.park@ogilvy.com' });
  const lastMail = mails[mails.length - 1]; assert(lastMail.to === 'kim.park@ogilvy.com' && /Acme Portal code/.test(lastMail.subject) && lastMail.name === 'Acme Security'); ok('APP_NAME and SENDER_NAME are applied to emails live (no code change or redeploy)');

  // --- audit log
  const events = sheets.AuthLog.rows.map((x) => x[1]); assert(['register', 'verified', 'login', 'login_failed', 'password_reset', 'password_changed', 'logout_all'].every((e) => events.includes(e))); ok('AuthLog recorded: ' + [...new Set(events)].join(', '));
  const logText = JSON.stringify(sheets.AuthLog.rows); assert(!/newpass|another11|abc123|token/.test(logText)); ok('AuthLog never contains passwords, codes or tokens');

  // --- a failed email must not use up the hourly allowance or leave a dead code behind
  const realSend = h.ctx.MailApp.sendEmail; const codesBefore = sheets.Codes.rows.length;
  h.ctx.MailApp.sendEmail = () => { throw new Error('Gmail is down'); };
  for (let i = 0; i < 8; i++) { r = call('register', { name: 'Zed Zed', email: 'zed@wpp.com', password: 'abcdefghij' }); assert(!r.ok && /could not send the email/.test(r.error)); }
  h.ctx.MailApp.sendEmail = realSend;
  r = call('register', { name: 'Zed Zed', email: 'zed@wpp.com', password: 'abcdefghij' }); assert(r.ok); assert(sheets.Codes.rows.length === codesBefore + 1); ok('8 failed email sends did not use up the allowance; the next try works and leaves exactly one code');

  // --- misc
  r = call('nope', {}); assert(!r.ok); r = call('constructor', {}); assert(!r.ok); ok('unknown / prototype-trick actions are refused');
  console.log(`\nALL ${n} CHECKS PASSED`);
}

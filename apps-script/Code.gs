/**
 * Tools Hub – mail relay (Google Apps Script)
 * -------------------------------------------
 * The Tools Hub server POSTs { secret, to, subject, html, text } here and this
 * script sends the email from the Google account that owns the script.
 *
 * Safety: requests without the shared secret are rejected, and mail can only
 * go to addresses on the allowed company domain(s), so it can't be abused as
 * an open relay. Setup steps are in README.md.
 */

var MAX_HTML = 60000;

function doGet() {
  return json_({ ok: true, service: 'Tools Hub mail relay' });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var props = PropertiesService.getScriptProperties();

    var secret = props.getProperty('MAIL_SECRET');
    if (!secret) throw new Error('MAIL_SECRET is not set in Script properties.');
    if (!safeEqual_(String(req.secret || ''), secret)) throw new Error('Unauthorized.');

    // Health probe from the app: proves the secret matches and that the script is
    // allowed to send mail (reading the quota needs the mail permission). Sends nothing.
    if (req.ping) return json_({ ok: true, quota: MailApp.getRemainingDailyQuota() });

    var to = String(req.to || '').trim().toLowerCase();
    var domains = (props.getProperty('ALLOWED_DOMAINS') || 'ogilvy.com')
      .toLowerCase().split(',').map(function (d) { return d.trim(); });
    var m = to.match(/^[^\s@,;]+@([^\s@,;]+)$/);
    if (!m || domains.indexOf(m[1]) === -1) throw new Error('Recipient is not on an allowed domain.');

    var subject = String(req.subject || '').replace(/[\r\n]+/g, ' ').slice(0, 200);
    var html = String(req.html || '');
    if (!subject || !html) throw new Error('Subject and html are required.');
    if (html.length > MAX_HTML) throw new Error('Message too large.');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily email quota reached.');

    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: html,
      body: String(req.text || subject).slice(0, 5000),
      name: props.getProperty('SENDER_NAME') || 'Ogilvy Tools Hub'
    });
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/** Run once from the editor to grant the email permission. */
function authorize() {
  Logger.log('Remaining daily email quota: ' + MailApp.getRemainingDailyQuota());
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function safeEqual_(a, b) {
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

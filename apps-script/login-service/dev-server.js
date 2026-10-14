// Try the login service on your own machine, no Google account needed.
//   node dev-server.js            then open http://localhost:8787/demo.html
// It runs the real Code.gs with in-memory stand-ins for Sheets and Gmail, and
// prints every email (so you can read the 6-digit codes) in this terminal.
// Data is lost when you stop it. Not for production.
const http = require('http'), fs = require('fs'), path = require('path');
const { create } = require('./test-harness');
const PORT = Number(process.env.PORT || 8787);

const h = create();
h.setProp('APP_NAME', process.env.APP_NAME || 'Demo App');
const realSend = h.ctx.MailApp.sendEmail;
h.ctx.MailApp.sendEmail = (o) => {
  realSend(o);
  console.log(`\n✉  to ${o.to}\n   ${o.subject}\n   ${o.body}\n`);
};

const results = {}; let n = 0;
const send = (res, status, type, body, extra = {}) => { res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', ...extra }); res.end(body); };

http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', () => {
    const url = req.url.split('?')[0];
    if (req.method === 'OPTIONS') return send(res, 204, 'text/plain', '', { 'Access-Control-Allow-Headers': '*' });
    // Like Google: a POST answers with a redirect, and the result is fetched from the new address.
    if (req.method === 'POST' && url === '/exec') {
      const id = ++n;
      h.ctx._props = null; // Google starts every request fresh
      results[id] = h.ctx.doPost({ postData: { contents: body } }).s;
      return send(res, 302, 'text/plain', '', { Location: `/result/${id}` });
    }
    if (url.startsWith('/result/')) return send(res, 200, 'application/json', results[url.split('/')[2]] || '{}');
    if (req.method === 'GET' && url === '/exec') return h.ctx._props = null, send(res, 200, 'application/json', h.ctx.doGet({ parameter: { action: 'config' } }).s);
    if (url === '/__mails') return send(res, 200, 'application/json', JSON.stringify(h.mails));
    const file = { '/': 'demo.html', '/demo.html': 'demo.html', '/login-client.js': 'login-client.js' }[url];
    if (file) return send(res, 200, file.endsWith('.js') ? 'text/javascript' : 'text/html', fs.readFileSync(path.join(__dirname, file)));
    send(res, 404, 'text/plain', 'Not found');
  });
}).listen(PORT, () => console.log(`Login service dev server: http://localhost:${PORT}/demo.html   (API at /exec)`));

// Host-system server: protect a route by asking the login service who the caller is.
const LOGIN_API = process.env.LOGIN_API_URL;               // the Apps Script web app URL (.../exec)
const cache = new Map();                                    // token -> { user, until }  (saves a ~1 s Apps Script call per request)

async function currentUser(token) {
  if (!token) return null;
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;
  const res = await fetch(LOGIN_API, {
    method: 'POST', redirect: 'follow',
    body: JSON.stringify({ action: 'me', token }),           // plain-string body = text/plain, no CORS preflight
  });
  const data = await res.json();
  if (!data.ok) { cache.delete(token); return null; }        // code === 'AUTH' means expired / revoked
  cache.set(token, { user: data.user, until: Date.now() + 60_000 });
  return data.user;
}
module.exports = { currentUser };

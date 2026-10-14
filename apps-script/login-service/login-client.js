/**
 * Tiny browser/Node client for the Apps Script Login Service. No dependencies.
 *
 *   const auth = createAuthClient({ apiUrl: 'https://script.google.com/macros/s/XXXX/exec' });
 *   await auth.login(email, password);   // stores the session token
 *   auth.user                            // { email, name } or null
 *   await auth.me();                     // re-checks the token with the server
 *
 * Every method throws an Error whose .message is safe to show the user, and
 * whose .code is one of: '', 'AUTH', 'UNVERIFIED', 'LOCKED', 'NETWORK'.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.createAuthClient = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createAuthClient(opts) {
    var apiUrl = opts.apiUrl;
    var key = opts.storageKey || 'login_session';
    var store = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var listeners = [];
    var session = read();

    function read() { try { return JSON.parse(store.getItem(key)) || null; } catch (e) { return null; } }
    function save(s) {
      session = s;
      try { s ? store.setItem(key, JSON.stringify(s)) : store.removeItem(key); } catch (e) {}
      listeners.forEach(function (fn) { fn(s && s.user); });
    }

    async function call(action, body) {
      var res;
      try {
        // A plain string body is sent as text/plain, a "simple" CORS request that Apps Script accepts.
        res = await fetch(apiUrl, { method: 'POST', redirect: 'follow', body: JSON.stringify(Object.assign({ action: action }, body || {})) });
      } catch (e) { var n = new Error('Network error. Check your connection and try again.'); n.code = 'NETWORK'; throw n; }
      var data;
      try { data = await res.json(); } catch (e) { var u = new Error('Unexpected response from the login service.'); u.code = 'NETWORK'; throw u; }
      if (!data.ok) {
        if (data.code === 'AUTH') save(null); // expired or revoked: forget it
        var err = new Error(data.error || 'Request failed.'); err.code = data.code || ''; throw err;
      }
      return data;
    }
    function withToken(body) { return Object.assign({ token: session && session.token }, body); }
    function adopt(r) { save({ token: r.token, user: r.user }); return r.user; }

    return {
      get user() { return session ? session.user : null; },
      get token() { return session ? session.token : null; },
      isSignedIn: function () { return !!session; },
      onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; },

      config: function () { return call('config'); },
      register: function (name, email, password) { return call('register', { name: name, email: email, password: password }); },
      verify: async function (email, code) { return adopt(await call('verify', { email: email, code: code })); },
      resend: function (email) { return call('resend', { email: email }); },
      login: async function (email, password) { return adopt(await call('login', { email: email, password: password })); },
      me: async function () { var r = await call('me', withToken()); save({ token: session.token, user: r.user }); return r.user; },
      logout: async function () { try { if (session) await call('logout', withToken()); } finally { save(null); } },

      requestReset: function (email) { return call('requestReset', { email: email }); },
      resetPassword: function (email, code, password) { return call('resetPassword', { email: email, code: code, password: password }); },

      changePassword: function (currentPassword, newPassword) { return call('changePassword', withToken({ currentPassword: currentPassword, newPassword: newPassword })); },
      updateName: async function (name) { var r = await call('updateProfile', withToken({ name: name })); save({ token: session.token, user: r.user }); return r.user; },
      logoutEverywhere: async function () { try { return await call('logoutAll', withToken()); } finally { save(null); } }
    };
  }
  return createAuthClient;
});

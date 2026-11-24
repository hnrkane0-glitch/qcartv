// QuickCart — accounts & sessions (Vercel serverless function).
// Passwords are verified HERE, never in the browser, and the browser never downloads the users table.
//
//   POST /api/auth  {action, ...}
//   public:  login, staff-login, register
//   token:   me, change-password, staff-save, staff-status, staff-list
//   admin:   admin-users, admin-user-create, admin-user-set, admin-dbmap
//
// Env: QC_ENC_KEY (required), QC_ADMIN_PASSWORD (platform admin login, username "admin"),
//      FIREBASE_DB_SECRET (needed once the database rules are locked down).
const { MAIN, enc, fbGet, fbPut, hashPw, checkPw, isHashed, signTok, verifyTok, tokenOf, timingSafe, jbody, validDb, secureOn, mintDbToken, throttle, throttleClear, clientIp } = require('./_qc');
const { PLANS, getPlans, getSettings } = require('./_plans');

const out = (res, code, o) => res.status(code).json(o);
const MIN_PW = 8;
const tooMany = (res, m) => out(res, 429, { ok: false, error: 'Too many attempts. Please wait ' + m + ' minute' + (m === 1 ? '' : 's') + ' and try again.' });
const hide = (u) => { const o = Object.assign({}, u); ['password', 'resetToken', 'resetExpires', 'resetTokenHash', 'sealed'].forEach((k) => delete o[k]); Object.keys(o).forEach((k) => { if (/^reset/i.test(k)) delete o[k]; }); return o; };
const patch = async (path, data) => { const r = await fetch(`${MAIN}/${path}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) throw new Error('Database write failed (' + r.status + ')'); };
async function findBy(field, value) {
  // 1) fast indexed query (needs ".indexOn" in the Firebase rules)
  let d = null, r = await fetch(`${MAIN}/users.json?orderBy="${field}"&equalTo=${enc(JSON.stringify(String(value)))}`);
  if (r.ok) { d = await r.json(); }
  // 2) fallback = how upgrade 50 worked: read /users and match here (no index needed, case-insensitive)
  if (!r.ok || !d || typeof d !== 'object' || !Object.keys(d).length) {
    const r2 = await fetch(`${MAIN}/users.json`);
    if (r2.status === 401 || r2.status === 403) throw new Error('Database access denied. Add FIREBASE_DB_SECRET in Vercel (or restore your previous Firebase rules), then redeploy.');
    if (!r2.ok) { if (r.ok) return []; throw new Error('Could not read the users database (' + r2.status + ').'); }
    const all = (await r2.json()) || {}; const want = String(value).trim().toLowerCase();
    d = {}; Object.keys(all).forEach((k) => { const u = all[k]; if (u && typeof u === 'object' && String(u[field] || '').trim().toLowerCase() === want) d[k] = u; });
  }
  return Object.keys(d).map((k) => ({ key: k, u: d[k] })).filter((x) => x.u && typeof x.u === 'object');
}
async function findLogin(id) {   // by username, then by e-mail (case-insensitive)
  id = String(id || '').trim(); const lo = id.toLowerCase(); let hits = await findBy('username', id);
  if (!hits.length && lo !== id) hits = await findBy('username', lo);
  if (!hits.length) hits = await findBy('email', id);
  if (!hits.length && lo !== id) hits = await findBy('email', lo);
  return hits;
}
const hasAccess = (u) => { const now = Date.now(); return (u.trialEnds && new Date(u.trialEnds) > now && u.status !== 'revoked' && u.status !== 'suspended') || (u.subExpires && new Date(u.subExpires) > now && u.status !== 'revoked') || (u.status === 'active' && !u.subExpires && !u.trialEnds); };
const expiredMsg = 'Your subscription has expired. Please renew to continue.';
function ownerView(o) { return { username: o.username, email: o.email, plan: o.plan, businessName: o.businessName, status: o.status, trialEnds: o.trialEnds, subExpires: o.subExpires, entitled: o.entitled, config: o.config }; }
const ADMIN = { username: 'admin', email: 'admin@quickcart.ng', plan: 'premium', status: 'active', businessName: 'QuickCart' };
const adminOk = (p) => p && p.r === 'admin';
const ownerOf = (p, b) => (p.r === 'admin' ? String(b.owner || 'admin').toLowerCase() : String(p.u).toLowerCase());

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return out(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const b = jbody(req), act = b.action;
    const tok = verifyTok(tokenOf(req));

    /* ───────── public ───────── */
    if (act === 'login') {
      const id = String(b.user || '').trim(), pw = String(b.pass || '');
      if (!id || !pw) return out(res, 400, { ok: false, error: 'Please enter your email and password.' });
      const ip = clientIp(req), t1 = await throttle('login-id', ip + '|' + id.toLowerCase(), 8, 15 * 60000); if (!t1.ok) return tooMany(res, t1.retryMin);
      const t2 = await throttle('login-ip', ip, 40, 15 * 60000); if (!t2.ok) return tooMany(res, t2.retryMin);
      if (id.toLowerCase() === 'admin' || id.toLowerCase() === ADMIN.email) {
        const ap = process.env.QC_ADMIN_PASSWORD;
        if (!ap) return out(res, 403, { ok: false, error: 'Platform admin login is not set up. Add QC_ADMIN_PASSWORD in Vercel → Environment Variables.' });
        if (!timingSafe(pw, ap)) return out(res, 401, { ok: false, error: 'Invalid email or password. Please try again.' });
        await throttleClear(t1.id);
        return out(res, 200, { ok: true, token: signTok({ u: 'admin', r: 'admin', k: 'admin' }, 1), user: ADMIN });
      }
      const hits = await findLogin(id);
      const m = hits.find((x) => checkPw(pw, x.u.password));
      if (!m) return out(res, 401, { ok: false, error: 'Invalid email or password. Please try again.' });
      await throttleClear(t1.id);
      if (m.u.isStaff) return out(res, 403, { ok: false, error: 'This is a staff account. Please use the Staff Login tab.' });
      if (!isHashed(m.u.password)) { try { await patch('users/' + enc(m.key), { password: hashPw(pw) }); } catch (e) { /* retry next login */ } }
      const u = hide(m.u);
      if (m.u.status === 'revoked' || m.u.status === 'suspended') return out(res, 403, { ok: false, error: 'This account has been disabled. Please contact support.' });
      if (m.u.status === 'pending_card') {   // older sign-ups that never added a card: start their free trial now, no card needed
        const trialEnds = new Date(Date.now() + (await getSettings()).trialDays * 86400000).toISOString();
        try { await patch('users/' + enc(m.key), { status: 'trial', trialEnds }); } catch (e) { /* retry next login */ }
        m.u.status = 'trial'; m.u.trialEnds = trialEnds;
        return out(res, 200, { ok: true, token: signTok({ u: m.u.username, r: 'owner', k: m.key }), user: hide(m.u) });
      }
      if (!hasAccess(m.u)) return out(res, 403, { ok: false, error: expiredMsg, user: u, token: signTok({ u: m.u.username, r: 'owner', k: m.key }, 1), expired: true });
      return out(res, 200, { ok: true, token: signTok({ u: m.u.username, r: 'owner', k: m.key }), user: u });
    }

    if (act === 'staff-login') {
      const company = String(b.company || '').trim().toLowerCase(), un = String(b.user || '').trim().toLowerCase(), pw = String(b.pass || '');
      if (!company || !un || !pw) return out(res, 400, { ok: false, error: 'Enter the Company ID, your username and your password.' });
      const sip = clientIp(req), s1 = await throttle('staff-id', sip + '|' + company + '|' + un, 8, 15 * 60000); if (!s1.ok) return tooMany(res, s1.retryMin);
      const s2 = await throttle('login-ip', sip, 40, 15 * 60000); if (!s2.ok) return tooMany(res, s2.retryMin);
      let owner;
      if (company === 'admin' || company === ADMIN.email) owner = ADMIN;
      else owner = (await findBy('email', company)).map((x) => x.u).find((u) => !u.isStaff) || (await findBy('email', b.company.trim())).map((x) => x.u).find((u) => !u.isStaff);
      if (!owner) return out(res, 404, { ok: false, error: 'Company ID not found. Use the store email your boss subscribed with.' });
      const on = String(owner.username || '').toLowerCase();
      const mine = (await findBy('username', un)).filter((x) => x.u.isStaff && String(x.u.owner || '').toLowerCase() === on);
      if (!mine.length) return out(res, 404, { ok: false, error: 'No staff with that username in this company.' });
      const rec = mine.find((x) => checkPw(pw, x.u.password));
      if (!rec) return out(res, 401, { ok: false, error: 'Wrong password. Please try again.' });
      await throttleClear(s1.id);
      if (rec.u.status && rec.u.status !== 'active') return out(res, 403, { ok: false, error: 'Your account is suspended. Please contact your boss.' });
      if (on !== 'admin' && !hasAccess(owner)) return out(res, 403, { ok: false, error: "This company's subscription has expired. Please tell your boss to renew." });
      if (!isHashed(rec.u.password)) { try { await patch('users/' + enc(rec.key), { password: hashPw(pw) }); } catch (e) { } }
      return out(res, 200, { ok: true, token: signTok({ u: rec.u.username, r: 'staff', o: on, ou: String(owner.username || on), k: rec.key }, 3), rec: hide(rec.u), owner: ownerView(owner) });
    }

    /* ── SIGN-UP = a LEAD. No account, no login, no card. The details go to the platform backend + your inbox; you call them,
          agree the modules, invoice them, then create the account in Backend Console → Clients. ── */
    if (act === 'register' || act === 'lead-resend') {
      const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
      const stg = await getSettings(); if (stg.signups && stg.signups.open === false) return out(res, 403, { ok: false, error: stg.signups.message || 'New sign-ups are paused right now. Please check back soon.' });
      if (b.website) return out(res, 200, { ok: true, lead: true, id: 'ok' });   // honeypot
      const rt = await throttle('register', clientIp(req), 8, 60 * 60000); if (!rt.ok) return tooMany(res, rt.retryMin);
      const mailer = require('./_mail'), TO = process.env.ADMIN_EMAIL || process.env.CONTACT_TO || 'hnrkane@gmail.com';
      let lead, id;
      if (act === 'lead-resend') {
        id = clean(b.id, 40); const email0 = clean(b.email, 120).toLowerCase(); lead = id && await fbGet(`${MAIN}/leads/${enc(id)}`);
        if (!lead || String(lead.email).toLowerCase() !== email0) return out(res, 404, { ok: false, error: 'We could not find that request. Please fill the form again.' });
        const rr = await throttle('lead-resend', id, 3, 60 * 60000); if (!rr.ok) return tooMany(res, rr.retryMin);
        await patch('leads/' + enc(id), { resends: (Number(lead.resends) || 0) + 1, lastResendAt: new Date().toISOString() });
      } else {
        if (b.terms !== true) return out(res, 400, { ok: false, error: 'Please accept the Terms of Service and Privacy Policy to continue.' });
        const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 30), biz = clean(b.biz, 100);
        if (!name || !email || !biz || !phone) return out(res, 400, { ok: false, error: 'Please fill in your name, phone, email and business name.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return out(res, 400, { ok: false, error: 'Please enter a valid email.' });
        if (phone.replace(/\D/g, '').length < 7) return out(res, 400, { ok: false, error: 'Please enter a valid phone number.' });
        id = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        lead = { id, name, email, phone, whatsapp: clean(b.whatsapp, 30) || phone, businessName: biz, industry: clean(b.industry, 60), city: clean(b.city, 60), country: clean(b.country, 40) || 'Nigeria', outlets: clean(b.outlets, 10), staffCount: clean(b.staffCount, 10), interests: (Array.isArray(b.interests) ? b.interests : []).map((x) => clean(x, 30)).slice(0, 30), source: clean(b.source, 60), message: clean(b.message, 1500), status: 'new', createdAt: new Date().toISOString(), ip: clientIp(req), resends: 0 };
        await fbPut(`${MAIN}/leads/${enc(id)}`, lead);
      }
      const row = (k, v) => v ? `<tr><td style="padding:6px 10px;color:#666">${mailer.esc(k)}</td><td style="padding:6px 10px"><b>${mailer.esc(v)}</b></td></tr>` : '';
      const table = '<table style="border-collapse:collapse;font-size:14px">' + row('Name', lead.name) + row('Business', lead.businessName) + row('Industry', lead.industry) + row('Phone', lead.phone) + row('WhatsApp', lead.whatsapp) + row('Email', lead.email) + row('City', lead.city) + row('Outlets', lead.outlets) + row('Staff', lead.staffCount) + row('Interested in', (lead.interests || []).join(', ')) + row('Heard about us', lead.source) + row('Message', lead.message) + row('Lead ID', lead.id) + '</table>';
      let sent = { admin: false, user: false };
      try { await mailer.sendMail({ to: TO, subject: (act === 'lead-resend' ? '↻ Lead resent: ' : '🔔 New sign-up lead: ') + lead.businessName + ' — ' + lead.name, html: mailer.shell('New lead', '<p>Reach out to this prospect:</p>' + table + '<p>Open Backend Console → Leads to register them once they have paid.</p>'), text: 'New lead ' + lead.name + ' ' + lead.phone + ' ' + lead.email + ' ' + lead.businessName, replyTo: lead.email }); sent.admin = true; } catch (e) { /* email provider not set — lead is still saved in the console */ }
      try { await mailer.sendMail({ to: lead.email, subject: 'We received your request — ' + lead.businessName, html: mailer.shell('Thanks, ' + mailer.esc(lead.name.split(' ')[0]) + '!', '<p>We have your details and a QuickCart specialist will contact you shortly on <b>' + mailer.esc(lead.phone) + '</b> to understand your business and agree the right modules.</p><p>After you pay your invoice we create your account and send your login details by email and WhatsApp.</p>' + table), text: 'Thanks ' + lead.name + ', we will contact you shortly.' }); sent.user = true; } catch (e) { }
      return out(res, 200, { ok: true, lead: true, id: lead.id, notified: sent });
    }

    /* ───────── needs a valid session ───────── */
    if (!tok) return out(res, 401, { ok: false, code: 'NO_SESSION', error: 'Your session has expired. Please log in again.' });

    if (act === 'dbtoken') {   // short-lived database access token (only when QC_SECURE_DB=1 — see SETUP.md)
      if (!secureOn()) return out(res, 200, { ok: true, dbToken: null });
      let owner = 'admin';
      if (tok.r !== 'admin' && !(tok.r === 'staff' && tok.o === 'admin')) {
        const acct = await fbGet(`${MAIN}/users/${enc(tok.r === 'staff' ? 'user_' + (tok.ou || tok.o) : tok.k)}`);
        if (!acct) return out(res, 404, { ok: false, error: 'Account not found.' });
        if (acct.status === 'revoked' || acct.status === 'suspended') return out(res, 403, { ok: false, error: 'This account has been disabled.' });
        if (String(tok.o || '') !== 'admin' && !hasAccess(acct)) return out(res, 403, { ok: false, expired: true, error: expiredMsg });
        owner = String(acct.username || tok.u);
      }
      const m = mintDbToken(owner, tok.r, 12);
      return out(res, 200, { ok: true, dbToken: m.token, dbTokenExp: m.exp });
    }

    if (act === 'me') {
      if (tok.r === 'admin') return out(res, 200, { ok: true, user: ADMIN, role: 'admin' });
      const u = await fbGet(`${MAIN}/users/${enc(tok.k)}`); if (!u) return out(res, 404, { ok: false, error: 'Account not found.' });
      let own = null; if (tok.r === 'staff') { own = await fbGet(`${MAIN}/users/${enc('user_' + (tok.ou || tok.o))}`); }
      return out(res, 200, { ok: true, role: tok.r, user: Object.assign(hide(u), tok.r === 'staff' ? { modules: u.modules, entitled: own && own.entitled, config: own && own.config, status: own ? own.status : u.status } : {}) });
    }

    if (act === 'change-password') {
      if (tok.r === 'admin') return out(res, 400, { ok: false, error: 'Change the admin password in Vercel (QC_ADMIN_PASSWORD).' });
      const np = String(b.newPass || ''); if (np.length < MIN_PW) return out(res, 400, { ok: false, error: 'Password must be at least ' + MIN_PW + ' characters.' });
      const u = await fbGet(`${MAIN}/users/${enc(tok.k)}`); if (!u) return out(res, 404, { ok: false, error: 'Account not found.' });
      if (!b.force && !checkPw(String(b.oldPass || ''), u.password)) return out(res, 401, { ok: false, error: 'Current password is wrong.' });
      await patch('users/' + enc(tok.k), { password: hashPw(np) });
      return out(res, 200, { ok: true });
    }

    if (act === 'verify-password') {   // re-ask password before showing sensitive settings
      if (tok.r === 'admin') return out(res, 200, { ok: timingSafe(String(b.pass || ''), process.env.QC_ADMIN_PASSWORD || '\u0000') });
      const u = await fbGet(`${MAIN}/users/${enc(tok.k)}`);
      return out(res, 200, { ok: !!u && checkPw(String(b.pass || ''), u.password) });
    }

    /* support tickets / feature requests from the customer's dashboard (stored server-side; answered in Backend Console) */
    if (act === 'ticket-create' || act === 'ticket-mine' || act === 'announcements') {
      if (act === 'announcements') { const g = (await fbGet(`${MAIN}/platform/announcements`)) || {}; return out(res, 200, { ok: true, items: Object.keys(g).map((k) => Object.assign({ id: k }, g[k])).filter((a) => a && a.active !== false).slice(-5) }); }
      const ownerKey = tok.r === 'staff' ? String(tok.ou || tok.o) : String(tok.u);
      if (act === 'ticket-mine') { const all = (await fbGet(`${MAIN}/tickets`)) || {}; return out(res, 200, { ok: true, tickets: Object.keys(all).filter((k) => all[k] && all[k].owner === ownerKey).map((k) => Object.assign({ id: k }, all[k])).sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1)) }); }
      const rt = await throttle('ticket', ownerKey, 15, 60 * 60000); if (!rt.ok) return tooMany(res, rt.retryMin);
      const text = String(b.text || '').trim().slice(0, 3000), subject = String(b.subject || '').trim().slice(0, 120); if (!text || !subject) return out(res, 400, { ok: false, error: 'Please add a subject and describe the issue.' });
      const id = 'T' + Date.now().toString(36), rec = { owner: ownerKey, by: tok.u, role: tok.r, type: ['issue', 'question', 'feature', 'error'].includes(b.type) ? b.type : 'issue', subject, status: 'open', priority: ['low', 'normal', 'high'].includes(b.priority) ? b.priority : 'normal', module: String(b.module || '').slice(0, 40), messages: [{ from: 'customer', text, at: new Date().toISOString() }], context: String(b.context || '').slice(0, 600), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await fbPut(`${MAIN}/tickets/${id}`, rec);
      try { const mailer = require('./_mail'); await mailer.sendMail({ to: process.env.ADMIN_EMAIL || process.env.CONTACT_TO || 'hnrkane@gmail.com', subject: '🎫 ' + rec.type + ': ' + subject + ' — ' + ownerKey, html: mailer.shell('Support ticket', '<p><b>' + mailer.esc(ownerKey) + '</b> (' + mailer.esc(tok.u) + ')</p><p>' + mailer.esc(text) + '</p>'), text: text }); } catch (e) { }
      return out(res, 200, { ok: true, id });
    }

    if (act === 'staff-password') {   // Settings → Security: the owner sets/resets a staff member's password
      if (tok.r === 'staff') return out(res, 403, { ok: false, error: 'Only the owner can change staff passwords.' });
      const owner = ownerOf(tok, b), pw = String(b.password || ''); if (pw.length < 6) return out(res, 400, { ok: false, error: 'Password must be at least 6 characters.' });
      const u = await fbGet(`${MAIN}/users/${enc(String(b.key || ''))}`); if (!u || !u.isStaff || String(u.owner || '').toLowerCase() !== owner) return out(res, 404, { ok: false, error: 'Staff not found.' });
      await patch('users/' + enc(String(b.key)), { password: hashPw(pw) }); return out(res, 200, { ok: true });
    }
    /* staff management: the owner (or platform admin) only */
    if (act === 'staff-save' || act === 'staff-status' || act === 'staff-list') {
      if (tok.r === 'staff') return out(res, 403, { ok: false, error: 'Only the owner can manage staff.' });
      const owner = ownerOf(tok, b);
      if (act === 'staff-list') {
        const all = await findBy('owner', owner);
        return out(res, 200, { ok: true, staff: all.filter((x) => x.u.isStaff).map((x) => Object.assign({ key: x.key }, hide(x.u))) });
      }
      if (act === 'staff-status') {
        const key = String(b.key || ''); const u = await fbGet(`${MAIN}/users/${enc(key)}`);
        if (!u || !u.isStaff || String(u.owner || '').toLowerCase() !== owner) return out(res, 404, { ok: false, error: 'Staff not found.' });
        if (!['active', 'suspended'].includes(b.status)) return out(res, 400, { ok: false, error: 'Bad status' });
        await patch('users/' + enc(key), { status: b.status }); return out(res, 200, { ok: true });
      }
      const username = String(b.username || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,40}$/.test(username) || username === 'admin') return out(res, 400, { ok: false, error: 'Username must be 2–40 letters, numbers, dots or dashes.' });
      const base = { modules: Array.isArray(b.modules) ? b.modules.map(String).slice(0, 60) : [], fullname: String(b.fullname || '').slice(0, 80), email: String(b.email || '').slice(0, 120), department: String(b.department || '').slice(0, 60), role: String(b.role || 'staff').slice(0, 40), outlet: String(b.outlet || '').slice(0, 60), phone: String(b.phone || '').slice(0, 30) };
      if (b.key) {
        const u = await fbGet(`${MAIN}/users/${enc(b.key)}`);
        if (!u || !u.isStaff || String(u.owner || '').toLowerCase() !== owner) return out(res, 404, { ok: false, error: 'Staff not found.' });
        const up = Object.assign({}, base); if (b.password) { if (String(b.password).length < 6) return out(res, 400, { ok: false, error: 'Password must be at least 6 characters.' }); up.password = hashPw(b.password); }
        await patch('users/' + enc(b.key), up); return out(res, 200, { ok: true, key: b.key });
      }
      if (!b.password || String(b.password).length < 6) return out(res, 400, { ok: false, error: 'Password must be at least 6 characters.' });
      if ((await findBy('username', username)).length) return out(res, 409, { ok: false, error: 'That username is already taken — choose another.' });
      const key = 'staff-' + username + '-' + Date.now().toString(36);
      await fbPut(`${MAIN}/users/${enc(key)}`, Object.assign({}, base, { owner, username, password: hashPw(b.password), plan: 'staff', status: 'active', isStaff: true, email: base.email || username + '@staff.local', createdAt: new Date().toISOString() }));
      return out(res, 200, { ok: true, key });
    }

    /* ───────── platform admin only ───────── */
    if (!adminOk(tok)) return out(res, 403, { ok: false, error: 'Admin only.' });

    if (act === 'admin-users') {
      const r = await fetch(`${MAIN}/users.json`); const d = (await r.json()) || {};
      const users = Object.keys(d).filter((k) => /^(user_|staff-)/.test(k) && d[k] && typeof d[k] === 'object').map((k) => Object.assign({ key: k }, hide(d[k])));
      return out(res, 200, { ok: true, users });
    }
    if (act === 'admin-user-create') {
      const u = b.user || {}; const username = String(u.username || '').trim().toLowerCase();
      if (!username || !u.password) return out(res, 400, { ok: false, error: 'Username and password are required.' });
      if ((await findBy('username', username)).length) return out(res, 409, { ok: false, error: 'That username is already taken.' });
      const key = 'user_' + username + '_' + Date.now();
      const rec = Object.assign({ status: 'active' }, u, { username, password: hashPw(u.password), createdManually: true, createdAt: new Date().toISOString() }); if (Array.isArray(u.entitled)) rec.entitled = u.entitled.map(String).slice(0, 60);
      await fbPut(`${MAIN}/users/${enc(key)}`, rec);
      if (rec.dbUrl && validDb(rec.dbUrl)) await fbPut(`${MAIN}/dbmap/${enc(username)}`, rec.dbUrl);
      return out(res, 200, { ok: true, key });
    }
    if (act === 'admin-user-set') {
      const allowed = ['status', 'plan', 'dbUrl', 'trialEnds', 'subExpires', 'notes', 'backupUntil', 'entitled', 'config', 'businessName', 'phone', 'email', 'name', 'billingCycle', 'tags', 'manager', 'industry'], up = {};
      allowed.forEach((k) => { if (b.patch && k in b.patch) up[k] = b.patch[k]; });
      if (up.dbUrl && !validDb(up.dbUrl)) return out(res, 400, { ok: false, error: 'Not a valid Firebase database URL.' });
      await patch('users/' + enc(String(b.key)), up); return out(res, 200, { ok: true });
    }
    if (act === 'admin-dbmap') {
      if (!validDb(b.url)) return out(res, 400, { ok: false, error: 'Not a valid Firebase database URL.' });
      const un = String(b.username || '').trim().toLowerCase(); if (!/^[a-z0-9._@+-]{1,80}$/.test(un)) return out(res, 400, { ok: false, error: 'Bad username' });
      await fbPut(`${MAIN}/dbmap/${enc(un)}`, String(b.url).replace(/\/+$/, '')); return out(res, 200, { ok: true });
    }
    return out(res, 400, { ok: false, error: 'Unknown action' });
  } catch (e) {
    return out(res, 500, { ok: false, error: e && e.message ? e.message : 'Server error' });
  }
};

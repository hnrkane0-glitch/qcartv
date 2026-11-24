// ════════════════════════════════════════════════════════════════════════════
// QUICKCART — BACKEND CONSOLE API   POST /api/console  { action, ... }   (platform admin only)
// SECTIONS (search for the ═══ headings):  OVERVIEW · LEADS · CLIENTS · ENTITLEMENTS · INVOICES · TICKETS · ANNOUNCEMENTS
//                                          · MIGRATIONS · CLIENT DATABASE MOVE · AUDIT · SECURITY
// Everything that is per-customer is stored ON that customer's record (users/user_xxx): entitled[], config{limits,flags,...}.
// Everything global lives under platform/… so changing one customer never touches another.
// ════════════════════════════════════════════════════════════════════════════
const { MAIN, enc, fbGet, fbPut, hashPw, verifyTok, tokenOf, jbody, validDb } = require('./_qc');
const CAT = require('../assets/qc-catalog.js');
const mailer = require('./_mail');

const out = (res, code, o) => res.status(code).json(o);
const now = () => new Date().toISOString();
const patch = async (path, data) => { const r = await fetch(`${MAIN}/${path}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) throw new Error('Database write failed (' + r.status + ')'); };
const del = async (path) => { await fetch(`${MAIN}/${path}.json`, { method: 'DELETE' }); };
const list = async (path) => { const d = (await fbGet(`${MAIN}/${path}`)) || {}; return Object.keys(d).filter((k) => d[k] && typeof d[k] === 'object').map((k) => Object.assign({ _k: k }, d[k])); };
const strip = (u) => { const o = Object.assign({}, u); ['password', 'resetToken', 'resetExpires', 'resetTokenHash', 'sealed'].forEach((k) => delete o[k]); return o; };
const clean = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 200);
const isOwnerRec = (u) => u && typeof u === 'object' && !u.isStaff && u.username && u.username !== 'admin';

async function audit(act, detail) { try { await fbPut(`${MAIN}/platform/console_audit/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, { at: now(), act, detail: String(detail || '').slice(0, 300) }); } catch (e) { } }
function genPassword() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; let p = ''; for (let i = 0; i < 10; i++) p += a[Math.floor(Math.random() * a.length)]; return p + '#' + Math.floor(10 + Math.random() * 89); }

/* ═══ MIGRATIONS ═══ — versioned, idempotent upgrade scripts. Add a new one at the END of the array with a new id; never edit old ones.
   Each has run(ctx) where ctx = { owners, dry, log } . They are safe to run twice. Applied ids are stored in platform/migrations. */
const MIGRATIONS = [
  { id: '2026-001-grandfather-modules', title: 'Give older accounts every module (so nothing disappears)', desc: 'Accounts created before the module system have no "entitled" list. This sets it to ALL modules so they keep working, then you trim each customer in Clients.',
    async run(c) { let n = 0; for (const o of c.owners) { if (!Array.isArray(o.u.entitled)) { n++; if (!c.dry) await patch('users/' + enc(o.key), { entitled: CAT.MODULES.map((m) => m.id), config: o.u.config || {} }); } } return `${n} account(s) updated`; } },
  { id: '2026-002-normalise-usernames', title: 'Lower-case usernames & emails', desc: 'Prevents "Shop@x.com" vs "shop@x.com" login mismatches.',
    async run(c) { let n = 0; for (const o of c.owners) { const up = {}; if (o.u.username && o.u.username !== String(o.u.username).toLowerCase()) up.username = String(o.u.username).toLowerCase(); if (o.u.email && o.u.email !== String(o.u.email).toLowerCase()) up.email = String(o.u.email).toLowerCase(); if (Object.keys(up).length) { n++; if (!c.dry) await patch('users/' + enc(o.key), up); } } return `${n} account(s) fixed`; } },
  { id: '2026-003-move-audit', title: 'Move staff activity & sessions to the owner-only audit area', desc: 'Copies users/<owner>/activity and /sessions to audit/<owner>/… so database rules can hide them from staff.',
    async run(c) { let n = 0; for (const o of c.owners) { for (const part of ['activity', 'sessions']) { const d = await fbGet(`${MAIN}/users/${enc(o.u.username)}/${part}`); if (d && typeof d === 'object') { n++; if (!c.dry) { await fbPut(`${MAIN}/audit/${enc(o.u.username)}/${part}`, d); } } } } return `${n} node(s) copied (originals kept; delete them after checking)`; } },
  { id: '2026-004-order-source', title: 'Tag old orders with a source', desc: 'Orders without a "source" field are tagged "pos" or "online" so reports can split channels.',
    async run(c) { let n = 0; for (const o of c.owners) { const d = (await fbGet(`${MAIN}/users/${enc(o.u.username)}/orders`)) || {}; for (const k of Object.keys(d)) { if (d[k] && !d[k].source) { n++; if (!c.dry) await patch(`users/${enc(o.u.username)}/orders/${enc(k)}`, { source: String(k).startsWith('POS') ? 'pos' : 'online' }); } } } return `${n} order(s) tagged`; } },
  { id: '2026-005-default-outlet-settings', title: 'Create the settings nodes new modules expect', desc: 'Creates empty price_levels/outlets/loyalty_config containers where missing so the new screens load cleanly.',
    async run(c) { let n = 0; for (const o of c.owners) { const base = `${MAIN}/users/${enc(o.u.username)}/settings`; for (const k of ['outlets', 'price_levels']) { const d = await fbGet(`${base}/${k}`); if (d === null) { n++; if (!c.dry) await fbPut(`${base}/${k}/_init`, { _init: true }); } } } return `${n} container(s) created`; } }
];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return out(res, 405, { ok: false, error: 'POST only' });
  try {
    const b = jbody(req), act = b.action, tok = verifyTok(tokenOf(req));
    if (!tok || tok.r !== 'admin') return out(res, 403, { ok: false, error: 'Platform admin only.' });

    /* ═══ OVERVIEW ═══ */
    if (act === 'overview') {
      const users = Object.values((await fbGet(`${MAIN}/users`)) || {}).filter(isOwnerRec), leads = await list('leads'), tickets = await list('tickets'), inv = await list('platform/invoices');
      const active = users.filter((u) => u.status === 'active' || u.status === 'trial'), soon = Date.now() + 14 * 864e5;
      const mrr = active.reduce((s, u) => s + (CAT.quote(Array.isArray(u.entitled) ? u.entitled : CAT.MODULES.map((m) => m.id), 'monthly').perMonth), 0);
      const adoption = {}; users.forEach((u) => (Array.isArray(u.entitled) ? u.entitled : []).forEach((m) => { adoption[m] = (adoption[m] || 0) + 1; }));
      return out(res, 200, { ok: true, clients: users.length, active: active.length, suspended: users.filter((u) => u.status === 'suspended' || u.status === 'revoked').length, expiring: users.filter((u) => u.subExpires && new Date(u.subExpires) < soon && new Date(u.subExpires) > Date.now()).map((u) => ({ username: u.username, businessName: u.businessName, subExpires: u.subExpires })), expired: users.filter((u) => u.subExpires && new Date(u.subExpires) < Date.now()).length, newLeads: leads.filter((l) => l.status === 'new').length, leads: leads.length, openTickets: tickets.filter((t) => t.status !== 'closed').length, mrr, unpaid: inv.filter((i) => i.status === 'sent').reduce((s, i) => s + (Number(i.total) || 0), 0), adoption, paidThisMonth: inv.filter((i) => i.status === 'paid' && String(i.paidAt || '').slice(0, 7) === now().slice(0, 7)).reduce((s, i) => s + (Number(i.total) || 0), 0) });
    }

    /* ═══ LEADS ═══ (people who filled the sign-up form) */
    if (act === 'leads') { const l = await list('leads'); l.sort((a, c) => (a.createdAt < c.createdAt ? 1 : -1)); return out(res, 200, { ok: true, leads: l }); }
    if (act === 'lead-set') { const up = {}; ['status', 'notes', 'assignedTo', 'interests', 'quoteModules', 'followUpAt'].forEach((k) => { if (b.patch && k in b.patch) up[k] = b.patch[k]; }); up.updatedAt = now(); await patch('leads/' + enc(b.id), up); await audit('lead-set', b.id + ' ' + JSON.stringify(up).slice(0, 120)); return out(res, 200, { ok: true }); }
    if (act === 'lead-delete') { await del('leads/' + enc(b.id)); await audit('lead-delete', b.id); return out(res, 200, { ok: true }); }

    /* ═══ CLIENTS ═══ */
    if (act === 'clients') {
      const d = (await fbGet(`${MAIN}/users`)) || {}, staff = {}; Object.keys(d).forEach((k) => { const u = d[k]; if (u && u.isStaff) staff[String(u.owner || '').toLowerCase()] = (staff[String(u.owner || '').toLowerCase()] || 0) + 1; });
      const clients = Object.keys(d).filter((k) => isOwnerRec(d[k])).map((k) => Object.assign({ key: k, staffCount: staff[String(d[k].username).toLowerCase()] || 0, legacy: !Array.isArray(d[k].entitled) }, strip(d[k])));
      return out(res, 200, { ok: true, clients });
    }
    if (act === 'client-create') {
      const u = b.user || {}, username = clean(u.username, 40).toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (!username || username === 'admin') return out(res, 400, { ok: false, error: 'Choose a username (letters/numbers).' });
      const email = clean(u.email, 120).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return out(res, 400, { ok: false, error: 'A valid email is required — it is the Company ID their staff use.' });
      const all = (await fbGet(`${MAIN}/users`)) || {}; if (Object.values(all).some((x) => x && (String(x.username).toLowerCase() === username || String(x.email).toLowerCase() === email))) return out(res, 409, { ok: false, error: 'That username or email already exists.' });
      const ent = CAT.expand(Array.isArray(b.entitled) ? b.entitled : []), pw = clean(b.password, 100) || genPassword(), days = Number(b.days) || (b.cycle === 'yearly' ? 365 : 30);
      const rec = { name: clean(u.name, 80), email, phone: clean(u.phone, 30), businessName: clean(u.businessName, 100), username, password: hashPw(pw), plan: 'custom', status: 'active', entitled: ent, config: { limits: b.limits || {}, flags: b.flags || {} }, billingCycle: b.cycle === 'yearly' ? 'yearly' : 'monthly', subExpires: new Date(Date.now() + days * 864e5).toISOString(), createdAt: now(), createdManually: true, industry: clean(u.industry, 60), notes: clean(b.notes, 1000), fromLead: b.leadId || '' };
      const key = 'user_' + username; await fbPut(`${MAIN}/users/${enc(key)}`, rec);
      try { await fbPut(`${MAIN}/users/${enc(username)}/settings/store_profile`, { name: rec.businessName, whatsapp: rec.phone }); } catch (e) { }
      if (b.leadId) { try { await patch('leads/' + enc(b.leadId), { status: 'converted', clientKey: key, convertedAt: now() }); } catch (e) { } }
      let mailed = false; if (b.sendCredentials) { try { const app = process.env.APP_URL || ''; await mailer.sendMail({ to: email, subject: 'Your QuickCart login details', html: mailer.shell('Welcome to QuickCart 🎉', `<p>Hi ${mailer.esc(rec.name.split(' ')[0] || 'there')}, your account is ready.</p><table style="font-size:14px"><tr><td>Login page</td><td><b>${mailer.esc(app)}/landing</b></td></tr><tr><td>Email</td><td><b>${mailer.esc(email)}</b></td></tr><tr><td>Password</td><td><b>${mailer.esc(pw)}</b></td></tr></table><p>Your staff sign in with <b>Company ID = ${mailer.esc(email)}</b>.</p><p><b>Please change your password in Settings → Security after you log in.</b></p><p>Modules on your plan: ${ent.map((i) => mailer.esc((CAT.byId[i] || {}).name || i)).join(', ')}</p>`), text: 'Login: ' + email + ' / ' + pw }); mailed = true; } catch (e) { } }
      await audit('client-create', username + ' modules=' + ent.join(',')); return out(res, 200, { ok: true, key, username, password: pw, mailed, entitled: ent });
    }
    if (act === 'client-set') {
      const allowed = ['status', 'entitled', 'config', 'businessName', 'phone', 'email', 'name', 'billingCycle', 'subExpires', 'trialEnds', 'notes', 'tags', 'manager', 'industry', 'plan'], up = {};
      allowed.forEach((k) => { if (b.patch && k in b.patch) up[k] = b.patch[k]; }); if (up.entitled) up.entitled = CAT.expand(up.entitled.map(String)); if (up.email) up.email = String(up.email).toLowerCase();
      if (!Object.keys(up).length) return out(res, 400, { ok: false, error: 'Nothing to change.' });
      await patch('users/' + enc(String(b.key)), up); await audit('client-set', b.key + ' ' + Object.keys(up).join(',') + (up.entitled ? ' modules=' + up.entitled.join(',') : '')); return out(res, 200, { ok: true, entitled: up.entitled });
    }
    if (act === 'client-password') {
      const pw = clean(b.password, 100) || genPassword(); if (pw.length < 8) return out(res, 400, { ok: false, error: 'Password must be at least 8 characters.' });
      await patch('users/' + enc(String(b.key)), { password: hashPw(pw) }); await audit('client-password', b.key);
      let mailed = false; if (b.send) { const u = await fbGet(`${MAIN}/users/${enc(String(b.key))}`); try { await mailer.sendMail({ to: u.email, subject: 'Your QuickCart password was reset', html: mailer.shell('Password reset', `<p>Your new temporary password is <b>${mailer.esc(pw)}</b>. Please change it in Settings → Security.</p>`), text: 'New password: ' + pw }); mailed = true; } catch (e) { } }
      return out(res, 200, { ok: true, password: pw, mailed });
    }
    if (act === 'client-delete') { if (b.confirm !== 'DELETE') return out(res, 400, { ok: false, error: 'Type DELETE to confirm.' }); await del('users/' + enc(String(b.key))); await audit('client-delete', b.key); return out(res, 200, { ok: true }); }
    if (act === 'client-staff') { const all = (await fbGet(`${MAIN}/users`)) || {}; const un = String(b.username || '').toLowerCase(); return out(res, 200, { ok: true, staff: Object.keys(all).filter((k) => all[k] && all[k].isStaff && String(all[k].owner).toLowerCase() === un).map((k) => Object.assign({ key: k }, strip(all[k]))) }); }

    /* ═══ ENTITLEMENTS ═══ (catalogue + quotes) */
    if (act === 'catalog') return out(res, 200, { ok: true, modules: CAT.MODULES, bundles: CAT.BUNDLES, annual: CAT.ANNUAL_DISCOUNT });
    if (act === 'quote') return out(res, 200, { ok: true, quote: CAT.quote(b.modules || [], b.cycle) });

    /* ═══ INVOICES ═══ (what YOU bill your customers) */
    if (act === 'invoices') { const l = await list('platform/invoices'); l.sort((a, c) => (a.createdAt < c.createdAt ? 1 : -1)); return out(res, 200, { ok: true, invoices: l }); }
    if (act === 'invoice-create') {
      const q = CAT.quote(b.modules || [], b.cycle), n = (await list('platform/invoices')).length + 1, id = 'inv' + Date.now().toString(36);
      const rec = { no: 'QC-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0'), clientKey: b.clientKey || '', clientName: clean(b.clientName, 100), clientEmail: clean(b.clientEmail, 120), clientPhone: clean(b.clientPhone, 30), leadId: b.leadId || '', modules: q.lines.map((l) => l.id), lines: q.lines, cycle: q.cycle, subtotal: q.subtotal, vat: q.vat, total: q.total, discount: Number(b.discount) || 0, status: 'sent', createdAt: now(), due: b.due || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), note: clean(b.note, 500) };
      rec.total = Math.max(0, rec.total - rec.discount); await fbPut(`${MAIN}/platform/invoices/${id}`, rec); await audit('invoice-create', rec.no + ' ₦' + rec.total);
      let mailed = false; if (b.email && rec.clientEmail) { try { await mailer.sendMail({ to: rec.clientEmail, subject: 'Invoice ' + rec.no + ' — QuickCart', html: mailer.shell('Invoice ' + rec.no, `<p>Amount due: <b>₦${rec.total.toLocaleString('en-NG')}</b> (${rec.cycle})</p><ul>${rec.lines.map((l) => '<li>' + mailer.esc(l.name) + ' — ₦' + l.monthly.toLocaleString('en-NG') + '/mo</li>').join('')}</ul><p>Pay to the account details we shared, then reply with your proof of payment. Your account is created right after payment is confirmed.</p>`), text: 'Invoice ' + rec.no }); mailed = true; } catch (e) { } }
      return out(res, 200, { ok: true, id, invoice: rec, mailed });
    }
    if (act === 'invoice-set') {
      const up = {}; ['status', 'note', 'paidAt', 'paidVia'].forEach((k) => { if (b.patch && k in b.patch) up[k] = b.patch[k]; }); if (up.status === 'paid' && !up.paidAt) up.paidAt = now();
      await patch('platform/invoices/' + enc(b.id), up);
      if (up.status === 'paid' && b.extend) { const inv = await fbGet(`${MAIN}/platform/invoices/${enc(b.id)}`); if (inv && inv.clientKey) { const u = await fbGet(`${MAIN}/users/${enc(inv.clientKey)}`); const base = u && u.subExpires && new Date(u.subExpires) > Date.now() ? new Date(u.subExpires) : new Date(); const exp = new Date(base.getTime() + (inv.cycle === 'yearly' ? 365 : 30) * 864e5).toISOString(); await patch('users/' + enc(inv.clientKey), { subExpires: exp, status: 'active', entitled: CAT.expand(inv.modules || []) }); await audit('subscription-extended', inv.clientKey + ' → ' + exp.slice(0, 10)); } }
      await audit('invoice-set', b.id + ' ' + (up.status || '')); return out(res, 200, { ok: true });
    }

    /* ═══ TICKETS ═══ (support requests & feature requests from customers) */
    if (act === 'tickets') { const l = await list('tickets'); l.sort((a, c) => (a.updatedAt < c.updatedAt ? 1 : -1)); return out(res, 200, { ok: true, tickets: l }); }
    if (act === 'ticket-reply') { const t = await fbGet(`${MAIN}/tickets/${enc(b.id)}`); if (!t) return out(res, 404, { ok: false, error: 'Ticket not found' }); const msgs = (t.messages || []).concat([{ from: 'support', text: clean(b.text, 3000), at: now() }]); await patch('tickets/' + enc(b.id), { messages: msgs, status: b.status || 'answered', updatedAt: now() }); await audit('ticket-reply', b.id); return out(res, 200, { ok: true }); }
    if (act === 'ticket-set') { await patch('tickets/' + enc(b.id), Object.assign({}, b.patch || {}, { updatedAt: now() })); return out(res, 200, { ok: true }); }

    /* ═══ ANNOUNCEMENTS ═══ global (all customers) or targeted via client config.announcements */
    if (act === 'announcements') return out(res, 200, { ok: true, items: await list('platform/announcements') });
    if (act === 'announce-set') { const id = b.id || 'a' + Date.now().toString(36); await fbPut(`${MAIN}/platform/announcements/${id}`, { title: clean(b.title, 100), text: clean(b.text, 600), level: ['info', 'warn', 'critical'].includes(b.level) ? b.level : 'info', active: b.active !== false, target: b.target || 'all', createdAt: now() }); await audit('announce', b.title); return out(res, 200, { ok: true, id }); }
    if (act === 'announce-delete') { await del('platform/announcements/' + enc(b.id)); return out(res, 200, { ok: true }); }

    /* ═══ MIGRATIONS ═══ */
    if (act === 'migrations') { const done = (await fbGet(`${MAIN}/platform/migrations`)) || {}; return out(res, 200, { ok: true, migrations: MIGRATIONS.map((m) => ({ id: m.id, title: m.title, desc: m.desc, applied: done[m.id] || null })) }); }
    if (act === 'migration-run') {
      const m = MIGRATIONS.find((x) => x.id === b.id); if (!m) return out(res, 404, { ok: false, error: 'Unknown migration' });
      const all = (await fbGet(`${MAIN}/users`)) || {}, owners = Object.keys(all).filter((k) => isOwnerRec(all[k])).map((k) => ({ key: k, u: all[k] })), dry = b.dry !== false;
      const result = await m.run({ owners, dry }); if (!dry) { await fbPut(`${MAIN}/platform/migrations/${m.id}`, { at: now(), result }); await audit('migration', m.id + ': ' + result); }
      return out(res, 200, { ok: true, dry, result });
    }

    /* ═══ CLIENT DATABASE MOVE ═══ copy ONE customer from the shared database to their own Firebase, verify, then switch them over */
    if (act === 'db-move') {
      const un = String(b.username || '').toLowerCase(), url = String(b.url || '').replace(/\/+$/, ''); if (!validDb(url)) return out(res, 400, { ok: false, error: 'Not a valid Firebase Realtime Database URL.' });
      const src = await fbGet(`${MAIN}/users/${enc(un)}`); if (!src) return out(res, 404, { ok: false, error: 'No data found for ' + un });
      const keys = Object.keys(src), summary = keys.map((k) => ({ node: k, children: src[k] && typeof src[k] === 'object' ? Object.keys(src[k]).length : 1 }));
      if (b.dry !== false) return out(res, 200, { ok: true, dry: true, summary, note: 'Dry run — nothing copied. Run again with dry=false to copy.' });
      const w = await fetch(url + '/.json', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(src) }); if (!w.ok) return out(res, 502, { ok: false, error: 'Could not write to that database (' + w.status + '). Allow read/write in its rules first.' });
      const back = await (await fetch(url + '/.json?shallow=true')).json().catch(() => ({})), missing = keys.filter((k) => !(k in (back || {})));
      if (missing.length) return out(res, 500, { ok: false, error: 'Verification failed — missing: ' + missing.join(', ') });
      if (b.switch) await fbPut(`${MAIN}/dbmap/${enc(un)}`, url); await audit('db-move', un + ' → ' + url + (b.switch ? ' (switched)' : ' (copy only)')); return out(res, 200, { ok: true, dry: false, copied: summary, switched: !!b.switch });
    }

    /* ═══ AUDIT ═══ */
    if (act === 'console-audit') { const l = await list('platform/console_audit'); l.sort((a, c) => (a.at < c.at ? 1 : -1)); return out(res, 200, { ok: true, items: l.slice(0, 300) }); }

    /* ═══ SECURITY ═══ login/lockout overview + force logout (rotates nothing server-side; tokens expire) */
    if (act === 'security') { const rl = (await fbGet(`${MAIN}/ratelimit`)) || {}; return out(res, 200, { ok: true, throttled: Object.keys(rl).length, secureDb: process.env.QC_SECURE_DB === '1', mailConfigured: mailer.configured(), adminEmail: process.env.ADMIN_EMAIL || process.env.CONTACT_TO || '(default)', env: { QC_ENC_KEY: !!process.env.QC_ENC_KEY, QC_ADMIN_PASSWORD: !!process.env.QC_ADMIN_PASSWORD, FIREBASE_DB_SECRET: !!process.env.FIREBASE_DB_SECRET, APP_URL: !!process.env.APP_URL } }); }

    return out(res, 400, { ok: false, error: 'Unknown action' });
  } catch (e) { return out(res, 500, { ok: false, error: e && e.message ? e.message : 'Server error' }); }
};

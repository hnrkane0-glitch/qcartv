require('./_fbauth');
// QuickCart — ONE serverless function that serves the small public endpoints, so the project stays within Vercel's free-plan
// limit of 12 functions.  The public URLs did NOT change: vercel.json rewrites each of them to /api/misc?qcfn=<name>
//   /api/contact · /api/forgot-password · /api/reset-password · /api/domain · /sitemap.xml · /robots.txt
const H = {};

H['contact'] = (() => {
// QuickCart — "Contact us" form.  POST { name, email, phone?, topic?, message, website(honeypot) }
// 1) saves a copy in Firebase (/contact_messages, server-only)  2) emails it to CONTACT_TO (default hnrkane@gmail.com)
// The visitor's address is set as Reply-To, so you can just hit "Reply" in your inbox.
const { sendMail, configured, shell, esc } = require('./_mail');

const FB = 'https://sneakerai-c96f0-default-rtdb.firebaseio.com';
const TO = process.env.CONTACT_TO || 'hnrkane@gmail.com';
const hits = new Map();   // best-effort flood guard (per server instance)

function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }

return async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  let b = {};
  try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (e) {}

  if (b.website) return res.status(200).json({ ok: true });   // honeypot: bots fill this in; pretend success

  const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 30),
        topic = clean(b.topic, 60) || 'General question', message = clean(b.message, 4000);
  if (!name || !message) return res.status(400).json({ ok: false, error: 'Please fill in your name and message.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });

  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket && req.socket.remoteAddress || '?').trim();
  const now = Date.now(), recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) return res.status(429).json({ ok: false, error: 'Too many messages — please wait a few minutes or email us directly.' });
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 500) hits.clear();

  const record = { name, email, phone, topic, message, at: now, ip };
  let saved = false, mailed = false;
  try {
    const r = await fetch(`${FB}/contact_messages.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
    saved = r.ok;
  } catch (e) { console.error('contact save failed:', e.message); }

  if (configured()) {
    try {
      const html = shell('New message from the website', `
        <table role="presentation" style="width:100%;font-size:14px;color:#3b4a6b;margin:0 0 18px">
          <tr><td style="padding:4px 0;width:90px;color:#7a88a8">Name</td><td><b>${esc(name)}</b></td></tr>
          <tr><td style="padding:4px 0;color:#7a88a8">Email</td><td><a href="mailto:${esc(email)}" style="color:#ff5a1f">${esc(email)}</a></td></tr>
          ${phone ? `<tr><td style="padding:4px 0;color:#7a88a8">Phone</td><td>${esc(phone)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#7a88a8">Topic</td><td>${esc(topic)}</td></tr>
        </table>
        <div style="background:#f6f8fd;border-radius:12px;padding:18px;font-size:15px;line-height:1.7;color:#0a1f44;white-space:pre-wrap">${esc(message)}</div>
        <p style="margin:18px 0 0;font-size:12px;color:#7a88a8">Just hit Reply — it goes to ${esc(email)}.</p>`);
      await sendMail({ to: TO, replyTo: email, subject: `[QuickCart] ${topic} — ${name}`, html,
        text: `New website message\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\nTopic: ${topic}\n\n${message}\n` });
      mailed = true;
    } catch (e) { console.error('contact mail failed:', e.code || '', e.message, e.detail ? JSON.stringify(e.detail) : ''); }
  }

  if (saved || mailed) return res.status(200).json({ ok: true });
  return res.status(503).json({ ok: false, error: 'We could not send your message right now. Please email hnrkane@gmail.com directly.' });
};
})();

H['forgot-password'] = (() => {
// QuickCart — "Forgot password": emails a one-time reset link to the owner's registered address.
// POST { email }  →  { ok:true }  (always the same answer, so nobody can probe which emails exist)
// Errors that the OWNER of the platform must fix (e.g. email not set up) are returned as { ok:false, code }.
const crypto = require('crypto');
const { sendMail, configured, shell, esc } = require('./_mail');
const { throttle, clientIp } = require('./_qc');

const FB = 'https://sneakerai-c96f0-default-rtdb.firebaseio.com';
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const COOLDOWN_MS = 60 * 1000;        // one email per minute per account
const TTL_MS = 60 * 60 * 1000;        // link valid for 1 hour

function baseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return proto + '://' + host;
}

return async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (e) {}
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, code: 'bad_email', error: 'Please enter a valid email address.' });
  const th = await throttle('forgot', clientIp(req) + '|' + email, 5, 60 * 60000); if (!th.ok) return res.status(429).json({ ok: false, code: 'rate', error: 'Too many requests. Please try again later.' });
  const th2 = await throttle('forgot-ip', clientIp(req), 20, 60 * 60000); if (!th2.ok) return res.status(429).json({ ok: false, code: 'rate', error: 'Too many requests. Please try again later.' });
  if (!configured()) return res.status(503).json({ ok: false, code: 'mail_not_configured', error: 'Email sending is not set up on this site yet.' });

  try {
    const r = await fetch(`${FB}/users.json`);
    const users = (r.ok && (await r.json())) || {};
    const hit = Object.entries(users).find(([, u]) => u && !u.isStaff && String(u.email || '').trim().toLowerCase() === email);
    if (hit) {
      const [key, user] = hit;
      const last = user.resetToken && user.resetToken.sentAt ? Number(user.resetToken.sentAt) : 0;
      if (Date.now() - last < COOLDOWN_MS) return res.status(200).json({ ok: true, throttled: true });
      const token = crypto.randomBytes(32).toString('hex');
      const put = await fetch(`${FB}/users/${encodeURIComponent(key)}/resetToken.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: sha(token), expires: Date.now() + TTL_MS, sentAt: Date.now() })
      });
      if (!put.ok) throw Object.assign(new Error('db'), { code: 'db_failed' });
      const link = `${baseUrl(req)}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      const name = (user.name || '').split(' ')[0] || 'there';
      const html = shell('Reset your password', `
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#3b4a6b">Hi ${esc(name)}, we received a request to reset the password for your QuickCart account. Tap the button below to choose a new one. This link works <b>once</b> and expires in <b>1 hour</b>.</p>
        <p style="margin:26px 0"><a href="${link}" style="display:inline-block;background:#ff5a1f;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px">Choose a new password →</a></p>
        <p style="margin:0 0 8px;font-size:13px;color:#7a88a8">Button not working? Paste this into your browser:</p>
        <p style="margin:0 0 18px;font-size:12px;word-break:break-all;color:#14306b">${esc(link)}</p>
        <p style="margin:0;font-size:13px;color:#7a88a8">Didn't ask for this? You can ignore this email — your password stays the same.</p>`);
      await sendMail({ to: email, subject: 'Reset your QuickCart password', html,
        text: `Reset your QuickCart password (valid 1 hour, one use):\n${link}\n\nIf you didn't request this, ignore this email.` });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('forgot-password failed:', e.code || '', e.message, e.detail ? JSON.stringify(e.detail) : '');
    if (e.code === 'mail_failed') return res.status(502).json({ ok: false, code: 'mail_failed', error: 'The email provider rejected the message. Check MAIL_FROM is a verified sender.' });
    return res.status(500).json({ ok: false, code: 'server', error: 'Something went wrong. Please try again.' });
  }
};
})();

H['reset-password'] = (() => {
// QuickCart — completes a password reset.
// POST { action:'check', email, token }                → { ok:true }  if the link is still valid
// POST { action:'reset', email, token, password }      → { ok:true }  sets the new password, burns the token
const crypto = require('crypto');
const { sendMail, configured, shell } = require('./_mail');

const FB = 'https://sneakerai-c96f0-default-rtdb.firebaseio.com';
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

return async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  let b = {};
  try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (e) {}
  const email = String(b.email || '').trim().toLowerCase(), token = String(b.token || '');
  const invalid = () => res.status(400).json({ ok: false, code: 'invalid_link', error: 'This reset link is invalid or has expired. Please request a new one.' });
  if (!email || !/^[a-f0-9]{64}$/.test(token)) return invalid();

  try {
    const r = await fetch(`${FB}/users.json`);
    const users = (r.ok && (await r.json())) || {};
    const hit = Object.entries(users).find(([, u]) => u && !u.isStaff && String(u.email || '').trim().toLowerCase() === email);
    const rt = hit && hit[1].resetToken;
    if (!rt || !rt.hash || !same(rt.hash, sha(token)) || Number(rt.expires) < Date.now()) return invalid();
    if (b.action !== 'reset') return res.status(200).json({ ok: true });

    const pw = String(b.password || '');
    if (pw.length < 8) return res.status(400).json({ ok: false, code: 'weak', error: 'Password must be at least 8 characters.' });
    // the app stores passwords as btoa(password) — keep that format so existing login keeps working
    const stored = require('./_qc').hashPw(pw);
    const key = hit[0];
    const up = await fetch(`${FB}/users/${encodeURIComponent(key)}.json`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: stored, resetToken: null, passwordChangedAt: new Date().toISOString() })
    });
    if (!up.ok) throw new Error('db write failed');
    if (configured()) {   // courtesy heads-up, never blocks the reset
      sendMail({ to: email, subject: 'Your QuickCart password was changed',
        html: shell('Password changed', '<p style="margin:0;font-size:15px;line-height:1.7;color:#3b4a6b">Your QuickCart password was just changed. If this was not you, reset it again right away.</p>'),
        text: 'Your QuickCart password was just changed. If this was not you, reset it again right away.' }).catch(() => {});
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('reset-password failed:', e.message);
    return res.status(500).json({ ok: false, code: 'server', error: 'Something went wrong. Please try again.' });
  }
};
})();

H['domain'] = (() => {
// QuickCart — custom domain helper (Vercel serverless function)
// Adds / checks / removes a store owner's domain on THIS Vercel project via the Vercel API.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   VERCEL_API_TOKEN   – create at vercel.com/account/tokens
//   VERCEL_PROJECT_ID  – Project → Settings → General → Project ID
//   VERCEL_TEAM_ID     – only if the project lives under a team (optional)
//
// If these are not set the endpoint answers {notConfigured:true} and the admin UI
// falls back to manual mode (you add the domain in Vercel yourself).

const FB = 'https://sneakerai-c96f0-default-rtdb.firebaseio.com';
const key = (d) => String(d).toLowerCase().replace(/\./g, ',');
const validDomain = (d) => /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d);

return async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = body.action;
  const domain = String(body.domain || '').trim().toLowerCase();
  const owner = String(body.owner || '').trim().toLowerCase();

  const TOKEN = process.env.VERCEL_API_TOKEN, PROJECT = process.env.VERCEL_PROJECT_ID, TEAM = process.env.VERCEL_TEAM_ID;
  if (!TOKEN || !PROJECT) return res.status(200).json({ ok: false, notConfigured: true });

  if (!validDomain(domain) || /(^|\.)quickcart\.(ng|com)$/.test(domain) || /\.vercel\.app$/.test(domain)) {
    return res.status(400).json({ ok: false, error: 'Invalid domain' });
  }
  if (!owner) return res.status(400).json({ ok: false, error: 'Missing owner' });

  // A domain can only be touched by the store that claimed it
  try {
    const r = await fetch(`${FB}/domains/${key(domain)}.json`);
    const claim = r.ok ? await r.json() : null;
    if (claim && claim.owner && String(claim.owner).toLowerCase() !== owner) {
      return res.status(403).json({ ok: false, error: 'This domain belongs to another store' });
    }
  } catch (e) { /* DB unreachable – continue */ }

  const q = TEAM ? `?teamId=${encodeURIComponent(TEAM)}` : '';
  const qAnd = TEAM ? `&teamId=${encodeURIComponent(TEAM)}` : '';
  const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
  const base = `https://api.vercel.com`;

  async function vc(method, path, payload) {
    const r = await fetch(base + path, { method, headers: H, body: payload ? JSON.stringify(payload) : undefined });
    let j = {}; try { j = await r.json(); } catch (e) {}
    return { status: r.status, data: j };
  }
  async function status() {
    const info = await vc('GET', `/v9/projects/${PROJECT}/domains/${encodeURIComponent(domain)}${q}`);
    const cfg = await vc('GET', `/v6/domains/${encodeURIComponent(domain)}/config${q}`);
    const verified = !!(info.data && info.data.verified);
    const misconfigured = cfg.data && typeof cfg.data.misconfigured === 'boolean' ? cfg.data.misconfigured : true;
    const v = info.data && info.data.verification && info.data.verification[0];
    return { connected: verified && !misconfigured, verified, misconfigured, txt: v ? { domain: v.domain, value: v.value } : null };
  }

  try {
    if (action === 'add') {
      const a = await vc('POST', `/v10/projects/${PROJECT}/domains${q}`, { name: domain });
      if (a.status >= 400 && !(a.data.error && /already/i.test(a.data.error.message || ''))) {
        return res.status(200).json({ ok: false, error: (a.data.error && a.data.error.message) || 'Could not add domain' });
      }
      const st = await status();
      return res.status(200).json({ ok: true, ...st, verification: a.data.verification || null });
    }
    if (action === 'check') {
      // ask Vercel to re-verify first (harmless if already verified)
      await vc('POST', `/v9/projects/${PROJECT}/domains/${encodeURIComponent(domain)}/verify${q}`);
      return res.status(200).json({ ok: true, ...(await status()) });
    }
    if (action === 'remove') {
      await vc('DELETE', `/v9/projects/${PROJECT}/domains/${encodeURIComponent(domain)}${q}`);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'Domain service error' });
  }
};
})();

H['seo'] = (() => {
// QuickCart — /sitemap.xml and /robots.txt, built from the address the visitor used (or APP_URL), so nothing to edit when you change domain.
return (req, res) => {
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const base = (process.env.APP_URL || (host ? proto + '://' + host : '')).replace(/\/+$/, '');
  const f = (req.query && req.query.f) || 'robots';
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (f === 'sitemap') {
    const pages = [['/', '1.0'], ['/features', '0.9'], ['/demo', '0.8'], ['/how-it-works', '0.8'], ['/pricing', '0.9'], ['/faq', '0.7'], ['/contact', '0.6'], ['/terms', '0.3'], ['/privacy', '0.3']];
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map((p) => `  <url><loc>${base}${p[0]}</loc><priority>${p[1]}</priority></url>`).join('\n') + '\n</urlset>\n');
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(`User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\nDisallow: /pos\nDisallow: /payment\nDisallow: /api/\n${base ? 'Sitemap: ' + base + '/sitemap.xml\n' : ''}`);
};
})();

module.exports = (req, res) => {
  let k = req.query && req.query.qcfn;
  if (!k) { try { k = new URL(req.url, 'http://x').searchParams.get('qcfn'); } catch (e) {} }
  const h = H[String(k || '')];
  if (!h) return res.status(404).json({ ok: false, error: 'Not found' });
  return h(req, res);
};

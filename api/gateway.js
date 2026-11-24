// ════════════════════════════════════════════════════════════════════════════
// QUICKCART — CARD / BANK PAYMENT GATEWAY (provider-neutral)     POST /api/gateway { action, ... }
// Lets each customer take online card + bank-transfer payments that SETTLE INTO THEIR OWN BANK ACCOUNT (Moniepoint, OPay-linked,
// GTBank, Access … any Nigerian bank) through a licensed processor. QuickCart never touches the money or the card number:
//   customer taps Pay → processor's hosted checkout (card entered there) → processor settles to the merchant's bank → we verify.
// Providers supported: "monnify" (Moniepoint's gateway)  ·  "flutterwave"  ·  "paystack".
// Each merchant saves THEIR OWN keys in Dashboard → Settings → Payments. Secret keys are encrypted (AES-256-GCM, QC_ENC_KEY)
// and are never sent back to the browser.
// Actions:  config-get · config-save (owner) · config-test (owner) · init · verify
// ════════════════════════════════════════════════════════════════════════════
const { MAIN, enc, baseFor, fbGet, fbPut, getSecrets, putSecrets, verifyTok, tokenOf, jbody, throttle, clientIp } = require('./_qc');
const out = (res, code, o) => res.status(code).json(o);
const PROVIDERS = {
  monnify: { name: 'Moniepoint (Monnify)', keys: ['apiKey', 'secretKey', 'contractCode'] },
  flutterwave: { name: 'Flutterwave', keys: ['secretKey'] },
  paystack: { name: 'Paystack', keys: ['secretKey'] }
};
const j = async (url, opt) => { const r = await fetch(url, opt); let b = null; try { b = await r.json(); } catch (e) { b = {}; } return { ok: r.ok, status: r.status, body: b }; };

/* ── per-provider adapters ── */
const A = {
  async monnify(s, mode, o) {
    const base = mode === 'live' ? 'https://api.monnify.com' : 'https://sandbox.monnify.com';
    const au = await j(base + '/api/v1/auth/login', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(s.apiKey + ':' + s.secretKey).toString('base64') } });
    const tk = au.body && au.body.responseBody && au.body.responseBody.accessToken; if (!tk) throw new Error('Monnify rejected the API key/secret — check them (and that Test/Live matches).');
    const H = { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' };
    if (o.test) return { ok: true };
    if (o.init) { const r = await j(base + '/api/v1/merchant/transactions/init-transaction', { method: 'POST', headers: H, body: JSON.stringify({ amount: o.amount, customerName: o.name, customerEmail: o.email, paymentReference: o.ref, paymentDescription: o.desc, currencyCode: 'NGN', contractCode: s.contractCode, redirectUrl: o.redirect, paymentMethods: ['CARD', 'ACCOUNT_TRANSFER', 'USSD'] }) }); const b = r.body && r.body.responseBody; if (!b || !b.checkoutUrl) throw new Error((r.body && r.body.responseMessage) || 'Monnify could not start the payment'); return { url: b.checkoutUrl }; }
    const r = await j(base + '/api/v2/merchant/transactions/query?paymentReference=' + encodeURIComponent(o.ref), { headers: H }); const b = r.body && r.body.responseBody; return { paid: !!b && b.paymentStatus === 'PAID', amount: b ? Number(b.amountPaid) : 0, status: b && b.paymentStatus };
  },
  async flutterwave(s, mode, o) {
    const H = { Authorization: 'Bearer ' + s.secretKey, 'Content-Type': 'application/json' };
    if (o.test) { const r = await j('https://api.flutterwave.com/v3/banks/NG', { headers: H }); if (!r.ok) throw new Error('Flutterwave rejected the secret key.'); return { ok: true }; }
    if (o.init) { const r = await j('https://api.flutterwave.com/v3/payments', { method: 'POST', headers: H, body: JSON.stringify({ tx_ref: o.ref, amount: o.amount, currency: 'NGN', redirect_url: o.redirect, customer: { email: o.email, name: o.name }, customizations: { title: o.biz, description: o.desc } }) }); const l = r.body && r.body.data && r.body.data.link; if (!l) throw new Error((r.body && r.body.message) || 'Flutterwave could not start the payment'); return { url: l }; }
    const r = await j('https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=' + encodeURIComponent(o.ref), { headers: H }); const d = r.body && r.body.data; return { paid: !!d && d.status === 'successful' && d.currency === 'NGN', amount: d ? Number(d.amount) : 0, status: d && d.status };
  },
  async paystack(s, mode, o) {
    const H = { Authorization: 'Bearer ' + s.secretKey, 'Content-Type': 'application/json' };
    if (o.test) { const r = await j('https://api.paystack.co/bank?country=nigeria&perPage=1', { headers: H }); if (!r.ok) throw new Error('Paystack rejected the secret key.'); return { ok: true }; }
    if (o.init) { const r = await j('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: H, body: JSON.stringify({ email: o.email, amount: Math.round(o.amount * 100), reference: o.ref, callback_url: o.redirect, currency: 'NGN' }) }); const u = r.body && r.body.data && r.body.data.authorization_url; if (!u) throw new Error((r.body && r.body.message) || 'Paystack could not start the payment'); return { url: u }; }
    const r = await j('https://api.paystack.co/transaction/verify/' + encodeURIComponent(o.ref), { headers: H }); const d = r.body && r.body.data; return { paid: !!d && d.status === 'success', amount: d ? Number(d.amount) / 100 : 0, status: d && d.status };
  }
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return out(res, 405, { ok: false, error: 'POST only' });
  try {
    const b = jbody(req), tok = verifyTok(tokenOf(req)); if (!tok) return out(res, 401, { ok: false, error: 'Please log in again.' });
    const owner = String(tok.r === 'staff' ? (tok.ou || tok.o) : tok.u).toLowerCase().replace(/^user_/, ''), base = await baseFor(owner), act = b.action, isOwner = tok.r !== 'staff';
    const cfg = (await fbGet(`${base}/settings/gateway`)) || {};
    if (act === 'config-get') return out(res, 200, { ok: true, providers: PROVIDERS, config: { provider: cfg.provider || '', mode: cfg.mode || 'test', configured: !!cfg.provider && !!cfg.configured, updatedAt: cfg.updatedAt || null } });
    if (act === 'config-save' || act === 'config-test') {
      if (!isOwner) return out(res, 403, { ok: false, error: 'Only the owner can change payment settings.' });
      const p = PROVIDERS[b.provider]; if (!p) return out(res, 400, { ok: false, error: 'Choose a provider.' });
      const old = await getSecrets(base, 'gateway'), keys = {}; p.keys.forEach((k) => { const v = String((b.keys || {})[k] || '').trim(); keys[k] = v || (old.provider === b.provider ? old[k] : '') || ''; });
      const miss = p.keys.filter((k) => !keys[k]); if (miss.length) return out(res, 400, { ok: false, error: 'Missing: ' + miss.join(', ') });
      const mode = b.mode === 'live' ? 'live' : 'test';
      try { await A[b.provider](keys, mode, { test: true }); } catch (e) { return out(res, 400, { ok: false, error: e.message }); }
      if (act === 'config-test') return out(res, 200, { ok: true, message: 'Connected to ' + p.name + ' successfully.' });
      await putSecrets(base, 'gateway', Object.assign({ provider: b.provider }, keys)); await fbPut(`${base}/settings/gateway`, { provider: b.provider, mode, configured: true, updatedAt: new Date().toISOString() });
      return out(res, 200, { ok: true, message: 'Saved. Customers can now pay by card / transfer at your POS and online store.' });
    }
    if (!cfg.provider || !cfg.configured) return out(res, 409, { ok: false, code: 'NO_GATEWAY', error: 'Online card payment is not set up. The owner can add it in Settings → Payments.' });
    const sec = await getSecrets(base, 'gateway'); if (!sec || sec.provider !== cfg.provider) return out(res, 409, { ok: false, code: 'NO_GATEWAY', error: 'Payment keys are missing. Re-save them in Settings → Payments.' });
    if (act === 'init') {
      const rt = await throttle('gw-init', owner, 120, 60 * 60000); if (!rt.ok) return out(res, 429, { ok: false, error: 'Too many payment requests. Wait a few minutes.' });
      const amount = Math.round(Number(b.amount)); if (!(amount >= 100) || amount > 50000000) return out(res, 400, { ok: false, error: 'Invalid amount.' });
      const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) || 'QC' + Date.now().toString(36);
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email || '')) ? String(b.email) : 'customer@quickcart.ng';
      const origin = (req.headers && (req.headers.origin || ('https://' + req.headers.host))) || process.env.APP_URL || '';
      const r = await A[cfg.provider](sec, cfg.mode, { init: true, amount, ref, email, name: String(b.name || 'Customer').slice(0, 60), desc: String(b.desc || 'Payment').slice(0, 80), biz: String(b.biz || 'Store').slice(0, 60), redirect: origin + '/payment-done.html?ref=' + encodeURIComponent(ref) });
      await fbPut(`${base}/gateway_tx/${ref}`, { amount, provider: cfg.provider, status: 'pending', at: new Date().toISOString(), by: tok.u });
      return out(res, 200, { ok: true, url: r.url, ref, provider: cfg.provider });
    }
    if (act === 'verify') {
      const ref = String(b.ref || '').replace(/[^A-Za-z0-9_-]/g, ''), tx = await fbGet(`${base}/gateway_tx/${ref}`); if (!tx) return out(res, 404, { ok: false, error: 'Unknown payment reference.' });
      if (tx.status === 'paid') return out(res, 200, { ok: true, paid: true, amount: tx.amount, provider: tx.provider });
      const r = await A[tx.provider](sec, cfg.mode, { ref }); const paid = !!r.paid && r.amount >= tx.amount - 0.5;
      if (paid) await fbPut(`${base}/gateway_tx/${ref}`, Object.assign({}, tx, { status: 'paid', paidAt: new Date().toISOString(), confirmed: r.amount }));
      return out(res, 200, { ok: true, paid, status: r.status || 'pending', amount: tx.amount, provider: tx.provider });
    }
    return out(res, 400, { ok: false, error: 'Unknown action' });
  } catch (e) { return out(res, 500, { ok: false, error: e && e.message ? e.message : 'Server error' }); }
};

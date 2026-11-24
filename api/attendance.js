// ════════════════════════════════════════════════════════════════════════════
// QUICKCART — ATTENDANCE DEVICES   (fingerprint / face / card machines)
//   1) ZKTeco "ADMS / push" protocol — machine calls   /iclock/cdata  /iclock/getrequest   (rewritten to this file in vercel.json)
//   2) Generic webhook — any device, PC bridge script or app:  POST /api/attendance?key=DEVICEKEY   {pin, time, type}
//   3) Owner actions (token):  device-add · device-list · device-remove · device-key
// Punches are stored at users/<owner>/attendance/<YYYY-MM-DD>/<pin>_<time>  (deterministic key → retries never duplicate).
// Device registry (server-only):  devices/<SN or key> → { owner, name, outlet, lastSeen }
// ════════════════════════════════════════════════════════════════════════════
const { MAIN, enc, baseFor, fbGet, fbPut, verifyTok, tokenOf, jbody, raw, crypto } = require('./_qc');
const patch = async (u, d) => { await fetch(u + '.json', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); };
const text = (res, s, code) => { res.status(code || 200).setHeader('Content-Type', 'text/plain'); res.send(s); };
const cleanSN = (s) => String(s || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);

async function savePunch(owner, dev, pin, time, status, verify) {
  const base = await baseFor(owner), t = String(time).replace(' ', 'T').slice(0, 19), day = t.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(t)) return false;
  await fbPut(`${base}/attendance/${day}/${enc(String(pin).slice(0, 20))}_${t.replace(/\D/g, '')}`, { pin: String(pin).slice(0, 20), at: t, status: status == null ? '' : String(status), verify: verify == null ? '' : String(verify), device: dev.name || dev.sn || '', outlet: dev.outlet || '', rx: new Date().toISOString() });
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = new URL(req.url, 'http://x'), p = url.pathname, SN = cleanSN(url.searchParams.get('SN') || (req.query && req.query.SN));
    /* ── ZKTeco ADMS push ── */
    if (/iclock/.test(p) || SN) {
      const dev = SN && await fbGet(`${MAIN}/devices/${enc(SN)}`);
      if (!dev) { if (SN) { try { await fbPut(`${MAIN}/devices_unknown/${enc(SN)}`, { sn: SN, seen: new Date().toISOString(), ip: req.headers['x-forwarded-for'] || '' }); } catch (e) { } } return text(res, 'OK'); }
      await patch(`${MAIN}/devices/${enc(SN)}`, { lastSeen: new Date().toISOString() });
      if (/getrequest|devicecmd/.test(p)) return text(res, 'OK');
      if (req.method === 'GET') return text(res, `GET OPTION FROM: ${SN}\nATTLOGStamp=None\nOPERLOGStamp=9999\nErrorDelay=60\nDelay=30\nTransTimes=00:00;14:00\nTransInterval=1\nTransFlag=TransData AttLog\nRealtime=1\nEncrypt=0\n`);
      const table = url.searchParams.get('table') || '', body = await raw(req); let n = 0;
      if (/ATTLOG/i.test(table)) for (const line of String(body || '').split(/\r?\n/)) { const c = line.split('\t'); if (c.length >= 2 && c[0] && /\d{4}-\d{2}-\d{2}/.test(c[1])) { if (await savePunch(dev.owner, Object.assign({ sn: SN }, dev), c[0].trim(), c[1].trim(), c[2], c[3])) n++; } }
      return text(res, 'OK: ' + n);
    }
    /* ── generic webhook (device key in ?key= or x-device-key) ── */
    const b = jbody(req), key = cleanSN(url.searchParams.get('key') || req.headers['x-device-key'] || b.key);
    if (key && !b.action) {
      const dev = await fbGet(`${MAIN}/devices/${enc(key)}`); if (!dev) return res.status(401).json({ ok: false, error: 'Unknown device key' });
      await patch(`${MAIN}/devices/${enc(key)}`, { lastSeen: new Date().toISOString() });
      const rows = Array.isArray(b) ? b : Array.isArray(b.punches) ? b.punches : [b]; let n = 0;
      for (const r of rows.slice(0, 500)) if (await savePunch(dev.owner, Object.assign({ sn: key }, dev), r.pin || r.userId || r.id, r.time || r.timestamp, r.type || r.status, r.verify)) n++;
      return res.status(200).json({ ok: true, saved: n });
    }
    /* ── owner actions ── */
    const tok = verifyTok(tokenOf(req)); if (!tok || tok.r === 'staff') return res.status(403).json({ ok: false, error: 'Owner only.' });
    const owner = String(tok.u).toLowerCase().replace(/^user_/, '');
    if (b.action === 'device-list') { const all = (await fbGet(`${MAIN}/devices`)) || {}, unk = (await fbGet(`${MAIN}/devices_unknown`)) || {}; return res.status(200).json({ ok: true, devices: Object.keys(all).filter((k) => all[k].owner === owner).map((k) => Object.assign({ id: k }, all[k])), unknown: Object.keys(unk).map((k) => unk[k]).filter((x) => Date.now() - new Date(x.seen) < 7 * 864e5) }); }
    if (b.action === 'device-add') {
      const sn = cleanSN(b.sn) || ('wh' + crypto.randomBytes(8).toString('hex')), ex = await fbGet(`${MAIN}/devices/${enc(sn)}`);
      if (ex && ex.owner !== owner) return res.status(409).json({ ok: false, error: 'That serial number is already registered to another account.' });
      await fbPut(`${MAIN}/devices/${enc(sn)}`, { owner, name: String(b.name || 'Attendance machine').slice(0, 60), outlet: String(b.outlet || '').slice(0, 60), kind: b.sn ? 'zk-push' : 'webhook', createdAt: ex ? ex.createdAt : new Date().toISOString(), lastSeen: ex ? ex.lastSeen : null });
      return res.status(200).json({ ok: true, id: sn });
    }
    if (b.action === 'device-remove') { const d = await fbGet(`${MAIN}/devices/${enc(cleanSN(b.id))}`); if (d && d.owner === owner) await fetch(`${MAIN}/devices/${enc(cleanSN(b.id))}.json`, { method: 'DELETE' }); return res.status(200).json({ ok: true }); }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  } catch (e) { return res.status(500).json({ ok: false, error: e && e.message ? e.message : 'Server error' }); }
};

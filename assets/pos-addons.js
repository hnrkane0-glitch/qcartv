/* pos-addons.js — merged bundle. Contains, in this exact load order: pos-ext.js, pos-v60.js. */

/* ═══ pos-ext.js ═══ */
try {
/* QuickCart POS extension — loaded after the POS inline script.
   1) Barcode scanning (USB/Bluetooth scanners + phone camera) with instant price display
   2) Multi-bank terminals (Paystack, Moniepoint, OPay + any bank via webhook) that auto-complete the sale
   3) Settings UI, receipt printing */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var OWNER = function () { return (window.QCDB && QCDB.owner && QCDB.owner()) || 'admin'; };
  var NSB = function () { return getNS(); };
  var L = localStorage;
  function jparse(s, d) { try { return JSON.parse(s); } catch (e) { return d; } }
  function prodImg(p) { return (p && (p.image || (p.images && p.images[0]) || p.img)) || ''; }
  window.prodImg = prodImg;

  /* ══════════════════ BARCODE ══════════════════ */
  var BC = { idx: {}, mode: L.getItem('qc_scan_mode') || 'add', sound: L.getItem('qc_scan_sound') !== '0', buf: '', last: 0, fast: true, ctx: null };

  function variants(c) {
    c = String(c || '').trim().replace(/\s+/g, '').toLowerCase(); if (!c) return [];
    var out = [c], d = c.replace(/\D/g, '');
    if (d && d === c) { var t = d.replace(/^0+/, ''); if (t && t !== c) out.push(t); if (d.length === 12) out.push('0' + d); if (d.length === 13 && d[0] === '0') out.push(d.slice(1)); }
    return out;
  }
  window.indexBarcodes = function () {
    BC.idx = {};
    (window._prods || []).forEach(function (p) {
      var codes = [p.barcode, p.sku, p.code].concat(Array.isArray(p.barcodes) ? p.barcodes : []);
      codes.forEach(function (c) { variants(c).forEach(function (v) { if (!BC.idx[v]) BC.idx[v] = p._k; }); });
    });
  };
  function findByCode(code) { var vs = variants(code); for (var i = 0; i < vs.length; i++) { if (BC.idx[vs[i]]) return (window._prods || []).find(function (p) { return p._k === BC.idx[vs[i]]; }); } return null; }
  window.findByCode = findByCode;

  function beep(ok) {
    if (!BC.sound) return;
    try { BC.ctx = BC.ctx || new (window.AudioContext || window.webkitAudioContext)(); var o = BC.ctx.createOscillator(), g = BC.ctx.createGain(); o.type = 'sine'; o.frequency.value = ok ? 1040 : 220; g.gain.value = .08; o.connect(g); g.connect(BC.ctx.destination); o.start(); o.stop(BC.ctx.currentTime + (ok ? .09 : .28)); } catch (e) {}
  }
  var flashT;
  function flash(p, code, extra) {
    var el = $('scan-flash'); if (!el) { el = document.createElement('div'); el.id = 'scan-flash'; el.className = 'scan-flash'; document.body.appendChild(el); }
    if (p) {
      var q = Number(p.quantity) || 0, img = prodImg(p);
      el.className = 'scan-flash on';
      el.innerHTML = '<div class="sf-img">' + (img ? '<img src="' + esc(img) + '" alt="">' : '📦') + '</div><div><div class="sf-n">' + esc(p.name || '') + '</div><div class="sf-p">' + fm(p.price) + '</div><div class="sf-s">' + (extra || (q > 0 ? q + ' in stock' : 'Out of stock')) + '</div></div>';
    } else {
      el.className = 'scan-flash on bad';
      el.innerHTML = '<div class="sf-img">❓</div><div><div class="sf-n">No product with barcode</div><div class="sf-p">' + esc(code) + '</div><div class="sf-s">Add it in Dashboard → Products</div></div>';
    }
    clearTimeout(flashT); flashT = setTimeout(function () { el.classList.remove('on'); }, p ? 2800 : 3500);
  }
  window.handleScan = function (code) {
    code = String(code || '').trim(); if (code.length < 2) return false;
    var p = findByCode(code);
    if (!p) { beep(false); flash(null, code); return false; }
    beep(true);
    if (BC.mode === 'add') {
      var q = Number(p.quantity) || 0;
      if (p.inStock === false || q <= 0) { flash(p, code, '⚠ Out of stock — not added'); return true; }
      addItem(p._k); flash(p, code, '✓ Added to sale · ' + q + ' in stock');
    } else flash(p, code, 'Price check · ' + (Number(p.quantity) || 0) + ' in stock');
    return true;
  };
  window.setScanMode = function (m) { BC.mode = m; L.setItem('qc_scan_mode', m); refreshScanMode(); pToast(m === 'add' ? 'Scan adds items to the sale' : 'Price-check mode — scans only show the price', 'ok'); };
  function refreshScanMode() { ['add', 'check'].forEach(function (m) { var b = $('sm-' + m); if (b) b.classList.toggle('on', BC.mode === m); }); }
  window.refreshScanMode = refreshScanMode;

  // Hardware scanners behave like a very fast keyboard that ends with Enter.
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var blocked = ['pay-modal', 'recov', 'sumov', 'co-modal'].some(function (id) { var el = $(id); return el && el.classList.contains('open'); }) || ($('pos-settings-modal') && $('pos-settings-modal').style.display === 'flex') || ($('stock-modal') && $('stock-modal').style.display === 'flex');
    if (blocked) return;
    var now = Date.now();
    if (e.key === 'Enter') {
      if (BC.buf.length >= 4 && BC.fast) {
        var code = BC.buf; BC.buf = '';
        var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) { t.value = ''; if (t.id === 'srch') doSearch(''); }
        e.preventDefault(); e.stopPropagation(); handleScan(code); return;
      }
      var s = $('srch'); if (e.target === s && s.value.trim()) { var pf = findByCode(s.value); if (pf) { e.preventDefault(); handleScan(s.value); s.value = ''; doSearch(''); } }
      BC.buf = ''; return;
    }
    if (e.key.length === 1) {
      if (now - BC.last > 60) { BC.buf = ''; BC.fast = true; }
      BC.buf += e.key; BC.last = now;
    }
  }, true);

  // Camera scanner
  var CAM = { stream: null, timer: null, det: null, zx: null, lastCode: '', lastAt: 0 };
  window.openScanner = async function () {
    var m = $('scan-modal');
    if (!m) { m = document.createElement('div'); m.id = 'scan-modal'; m.style.cssText = 'position:fixed;inset:0;z-index:9400;display:none;align-items:center;justify-content:center;'; document.body.appendChild(m); }
    m.innerHTML = '<div class="scan-box"><div style="padding:16px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--b);"><div><div style="font-size:16px;font-weight:800;letter-spacing:-.02em;">📷 Scan barcode</div><div style="font-size:11px;color:var(--t3);margin-top:2px;">Point the camera at a product barcode</div></div><button onclick="closeScanner()" style="border:1.5px solid var(--b2);background:var(--s);padding:7px 14px;font-weight:800;font-size:12px;color:var(--t);">Done</button></div>'
      + '<div class="scan-view"><video id="scan-video" playsinline muted></video><i></i></div>'
      + '<div style="padding:14px 18px;"><div class="scan-mode" style="width:max-content;margin-bottom:10px;"><button id="sm-add" onclick="setScanMode(\'add\')">➕ Add to sale</button><button id="sm-check" onclick="setScanMode(\'check\')">🏷 Price check</button></div>'
      + '<div id="scan-msg" style="font-size:12px;color:var(--t2);">Starting camera…</div>'
      + '<div style="display:flex;gap:6px;margin-top:10px;"><input id="scan-manual" placeholder="Or type the barcode and press Enter" style="flex:1;padding:10px 12px;font-size:13px;" onkeydown="if(event.key===\'Enter\'){handleScan(this.value);this.value=\'\';}"></div></div></div>';
    m.style.display = 'flex'; refreshScanMode();
    try {
      CAM.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      var v = $('scan-video'); v.srcObject = CAM.stream; await v.play();
      if ('BarcodeDetector' in window) {
        var fmts = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code', 'data_matrix']; try { var sup = await BarcodeDetector.getSupportedFormats(); fmts = fmts.filter(function (f) { return sup.indexOf(f) > -1; }); } catch (e) {}
        CAM.det = new BarcodeDetector({ formats: fmts });
        $('scan-msg').textContent = 'Scanning… hold the barcode steady inside the box';
        CAM.timer = setInterval(async function () { try { var r = await CAM.det.detect(v); if (r && r[0]) camHit(r[0].rawValue); } catch (e) {} }, 220);
      } else { await loadZX(); startZX(v); }
    } catch (e) { $('scan-msg').innerHTML = '⚠️ Camera unavailable (' + esc(e.message || e.name) + '). Allow camera access in the browser, or type the barcode below. A USB/Bluetooth scanner works without the camera.'; }
  };
  function camHit(code) { var n = Date.now(); if (code === CAM.lastCode && n - CAM.lastAt < 1800) return; CAM.lastCode = code; CAM.lastAt = n; var ok = handleScan(code); var mm = $('scan-msg'); if (mm) mm.textContent = (ok ? '✓ ' : '✗ ') + code; }
  function loadZX() { return new Promise(function (res, rej) { if (window.ZXing) return res(); var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'; s.onload = res; s.onerror = function () { rej(new Error('Scanner library could not load')); }; document.head.appendChild(s); }); }
  function startZX(v) {
    $('scan-msg').textContent = 'Scanning… hold the barcode steady inside the box';
    var reader = new ZXing.BrowserMultiFormatReader(); CAM.zx = reader;
    CAM.timer = setInterval(async function () { try { var r = await reader.decodeFromVideoElement(v); if (r) camHit(r.getText()); } catch (e) {} }, 300);
  }
  window.closeScanner = function () {
    clearInterval(CAM.timer); CAM.timer = null;
    if (CAM.zx) { try { CAM.zx.reset(); } catch (e) {} CAM.zx = null; }
    if (CAM.stream) { CAM.stream.getTracks().forEach(function (t) { t.stop(); }); CAM.stream = null; }
    var m = $('scan-modal'); if (m) m.style.display = 'none';
  };

  /* ══════════════════ TERMINALS ══════════════════ */
  var PNAME = { paystack: 'Paystack Terminal', moniepoint: 'Moniepoint', opay: 'OPay', generic: 'Bank alert' };
  var PICON = { paystack: '🔷', moniepoint: '🟠', opay: '🟢', generic: '🏦' };
  var TERM = { loaded: false, p: {}, envKey: false, noEnc: false };
  function apiTerm(action, payload) { return termApi(action, Object.assign({ owner: OWNER() }, payload || {})); }

  window.loadTerminals = async function () {
    try {
      var r = await apiTerm('config'); TERM.p = r.providers || {}; TERM.envKey = !!(r.providers && r.providers.paystackEnvKey); TERM.noEnc = !!(r.providers && r.providers.noEncKey); TERM.loaded = true;
      // keep the legacy single-terminal field working
      if (TERM.p.paystack && TERM.p.paystack.cfg && TERM.p.paystack.cfg.terminalId) POS_CFG.terminalId = TERM.p.paystack.cfg.terminalId;
    } catch (e) { TERM.loaded = false; }
    return TERM;
  };
  function tinfo(id) {
    var d = TERM.p[id] || { cfg: {}, secretsSet: {} }, c = d.cfg || {}, s = d.secretsSet || {}, push = false, listen = false;
    if (id === 'paystack') { push = !!(c.terminalId && (s.secretKey || TERM.envKey)); listen = push; }
    if (id === 'moniepoint') { push = !!(c.serial && s.clientId && s.clientSecret); listen = push || !!s.webhookSecret; }
    if (id === 'opay') { push = !!(c.serial && c.headMerchantId && c.merchantId && s.privateKey && s.opayPublicKey && s.clientAuthKey); listen = push; }
    return { id: id, cfg: c, sec: s, enabled: !!c.enabled, push: push, listen: listen, name: c.label || PNAME[id], serial: c.serial || c.terminalId || '' };
  }
  function enabledTerms() { return ['paystack', 'moniepoint', 'opay'].map(tinfo).filter(function (t) { return t.enabled && (t.push || t.listen); }); }
  function genericOn() { var g = TERM.p.generic; return !!(g && g.cfg && g.cfg.enabled); }

  /* ── payment inbox (bank confirmations pushed by /api/webhook) ── */
  async function fetchInbox() {
    try { var r = await fetch(NSB() + '/payment_inbox.json?orderBy=%22%24key%22&limitToLast=40'); if (!r.ok) return []; var o = await r.json(); return o ? Object.keys(o).map(function (k) { return Object.assign({ _key: k }, o[k]); }) : []; } catch (e) { return []; }
  }
  function serialsOk(e) {
    if (!e.terminal) return true;
    var t = TERM.p[e.provider]; if (!t || !t.cfg || !t.cfg.serial) return true;
    return String(e.terminal).toLowerCase() === String(t.cfg.serial).toLowerCase();
  }
  function matchInbox(list, total, since) {
    for (var i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      if (!e.success || e.claimedBy) continue;
      if (Math.round(Number(e.amount) * 100) !== Math.round(Number(total) * 100)) continue; // EXACT amount only
      if ((Number(e.at) || 0) < since - 120000) continue;
      if (!serialsOk(e)) continue;
      return e;
    }
    return null;
  }
  // claim with a conditional write so two cashiers/devices can never use one payment twice
  async function claimInbox(key, ref) {
    var url = NSB() + '/payment_inbox/' + encodeURIComponent(key) + '.json';
    var g = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' } }); var etag = g.headers.get('ETag'); var cur = await g.json();
    if (!cur || cur.claimedBy) return false;
    cur.claimedBy = ref; cur.claimedAt = new Date().toISOString();
    var h = { 'Content-Type': 'application/json' }; if (etag) h['if-match'] = etag;
    var p = await fetch(url, { method: 'PUT', headers: h, body: JSON.stringify(cur) });
    return p.ok;
  }

  function stepsBox(total, how) { return '<div class="payhint">' + how + '</div>'; }
  function waitUI(total, providerLabel, how) {
    return payHead(total) + stepsBox(total, how)
      + '<div class="paywait"><div class="vp-dot"></div><span id="trm-txt">Starting…</span></div>'
      + '<div class="progress-bar"><div class="progress-fill" id="trm-prog" style="width:6%"></div></div>'
      + '<div style="display:flex;gap:8px;margin-top:16px;"><button onclick="cardTermCancel(' + total + ')" style="flex:1;' + PMG + '">✕ Cancel</button></div>'
      + '<div style="text-align:center;margin-top:12px;"><a href="#" onclick="manualFallback(' + total + ');return false;" style="font-size:11px;color:var(--t3);text-decoration:underline;">Customer already paid but nothing happened? Record it manually</a></div>';
  }
  window.manualFallback = function (total) { stopTermPoll(); cardExternal(total); };

  /* method: 'card' | 'transfer'; providerId: terminal to push to (or null = just listen) */
  window.startTerminalPay = async function (providerId, total, method, skipPush) {
    stopTermPoll(); var sid = ++_termSession, since = Date.now(), t = providerId ? tinfo(providerId) : null;
    var ref = newRef('POS-' + (providerId ? providerId.slice(0, 3).toUpperCase() : 'WAIT')), email = (typeof cardEmail === 'function' ? cardEmail() : '') || '';
    var label = t ? t.name : 'bank';
    var willPush = !!(t && t.push && !skipPush);
    showPayModal((PICON[providerId] || '💳') + ' ' + (t ? t.name : 'Waiting for payment'), method === 'transfer' ? 'Customer pays by transfer' : 'Customer pays by card');
    var how = willPush ? 'The amount <b>' + fm(total) + '</b> is being sent to terminal <b>' + esc(t.serial) + '</b>. Customer taps / inserts the card' + (method === 'transfer' ? ' or chooses transfer' : '') + ' on the terminal.'
      : 'Type exactly <b>' + fm(total) + '</b> on the terminal' + (t ? ' (' + esc(t.name) + ')' : '') + ' and take the payment. The sale completes automatically the moment the bank confirms <b>exactly ' + fm(total) + '</b>.';
    setBody(waitUI(total, label, how));
    var handle = null;
    if (willPush) {
      try { var r = await apiTerm('push', { provider: providerId, amount: total, reference: ref, method: method, email: email, description: 'POS sale ' + ref }); if (sid !== _termSession) return; handle = r.handle || null; setTxt('Sent to terminal — waiting for customer…'); }
      catch (e) { if (sid !== _termSession) return; pushFailed(total, providerId, method, e); return; }
    } else setTxt('Listening for your bank’s confirmation…');
    var n = 0, max = 150, busy = false;
    _termPoll = setInterval(async function () {
      if (busy) return; busy = true; n++;
      try {
        if (sid !== _termSession) return;
        var win = null, via = '';
        if (handle) {
          var s = await apiTerm('status', { provider: providerId, reference: ref, amount: total, handle: handle });
          if (sid !== _termSession) return;
          if (s.paid) { win = { provider: providerId, amount: s.amount || total, channel: s.method || '', ref: ref }; via = 'push'; }
          else if (s.declined) { stopTermPoll(); cardError(total, 'The terminal reported the payment was declined or cancelled. Nothing was charged to the sale.'); return; }
          else if (s.mismatch) { stopTermPoll(); cardError(total, s.error || 'Amount collected does not match the sale total.'); return; }
          else setTxt(s.delivered ? 'Terminal ready — waiting for customer to pay…' : 'Waiting for the terminal to receive the amount…');
        }
        if (!win) {
          var m = matchInbox(await fetchInbox(), total, since);
          if (m && await claimInbox(m._key, ref)) { win = { provider: m.provider, amount: m.amount, channel: m.channel, ref: m.ref, inboxKey: m._key }; via = 'webhook'; }
        }
        if (win) {
          stopTermPoll(); setTxt('✅ Payment confirmed'); beep(true);
          closePayModal();
          await finalizeOrder(buildOrder(method === 'transfer' ? 'transfer' : 'card', {
            ref: ref, cardVia: (win.provider || providerId || 'bank') + '-terminal', terminal: PNAME[win.provider || providerId] || 'Bank', terminalSerial: t ? t.serial : '',
            bankRef: win.ref || '', actualChannel: win.channel || '', confirmedBy: via, verified: true, autoConfirmed: true, inboxKey: win.inboxKey || '', customerEmail: email, confirmedAt: new Date().toISOString()
          }));
          return;
        }
        var pr = $('trm-prog'); if (pr) pr.style.width = Math.min(95, 8 + n / max * 87) + '%';
      } catch (e) { /* transient — keep polling */ }
      finally { busy = false; }
      if (n >= max) { stopTermPoll(); cardError(total, 'No confirmation received after 6 minutes. If the customer already paid, check the terminal receipt / your bank app before charging again, then use “Record it manually”.'); }
    }, 2400);
  };
  function setTxt(t) { var e = $('trm-txt'); if (e) e.textContent = t; }
  function pushFailed(total, pid, method, e) {
    var t = tinfo(pid), listen = t.listen;
    setBody('<div style="text-align:center;padding:6px 0 12px;"><div style="font-size:36px;">⚠️</div><p style="font-size:13px;color:var(--rd);margin:8px 0;line-height:1.6;">' + esc(e.message || 'Could not reach the terminal') + '</p></div>'
      + (listen ? '<button class="optbtn live" onclick="startTerminalPay(\'' + pid + '\',' + total + ',\'' + method + '\',true)"><b>Type the amount on the terminal instead</b><small>We’ll still complete the sale automatically when the bank confirms exactly ' + fm(total) + '.</small></button>' : '')
      + '<div style="display:flex;gap:8px;">' + backBtn('← Other options', 'openCardModal(' + total + ')') + backBtn('Close', 'closePayModal()') + '</div>');
  }
  window.cardTermCancel = function (total) { stopTermPoll(); pToast('Cancelled — also cancel on the terminal screen', 'err'); openCardModal(total); };

  /* ── Card chooser ── */
  window.openCardModal = function (total) {
    stopTermPoll();
    showPayModal('💳 Card Payment', 'Choose how the customer will pay by card');
    var terms = enabledTerms(), h = payHead(total)
      + '<label style="' + PML + '">Customer email for receipt (optional)</label><input id="card-email" type="email" placeholder="customer@email.com" style="' + PMI + 'margin-bottom:12px;">';
    if (!terms.length) h += '<div class="payhint">No payment terminal is linked yet. Open <b>⚙ Settings → Payment terminals</b> to link Paystack, Moniepoint or OPay so card sales complete automatically.</div>';
    terms.forEach(function (t) {
      if (t.push) h += '<button class="optbtn live" onclick="startTerminalPay(\'' + t.id + '\',' + total + ',\'card\')"><b>' + PICON[t.id] + ' ' + esc(t.name) + ' — send to terminal</b><small>Pushes ' + fm(total) + ' to terminal ' + esc(t.serial) + '. Sale completes automatically once the card is approved.</small></button>';
      h += '<button class="optbtn" onclick="startTerminalPay(\'' + t.id + '\',' + total + ',\'card\',true)"><b>' + PICON[t.id] + ' ' + esc(t.name) + ' — I’ll type the amount on the machine</b><small>Enter exactly ' + fm(total) + ' on the terminal. We detect the approval and finish the sale for you.</small></button>';
    });
    h += '<button class="optbtn" onclick="cardExternal(' + total + ')"><b>🧾 Other card machine (manual)</b><small>Any bank POS — charge ' + fm(total) + ', then record the approval code.</small></button>'
      + '<button class="optbtn" onclick="cardOnline(' + total + ')"><b>🌐 Online card checkout</b><small>Customer types card details on Paystack’s secure page.</small></button>'
      + '<div style="display:flex;gap:8px;margin-top:4px;">' + backBtn('Cancel', 'closePayModal()') + '</div>';
    setBody(h);
  };

  /* ── Transfer ── */
  window.initTransferPayment = function (total) {
    stopTermPoll(); var terms = enabledTerms().filter(function (t) { return t.listen; });
    fetch(NSB() + '/settings/bank_account.json').then(function (r) { return r.json(); }).catch(function () { return null; }).then(function (a) {
      a = a || {}; var bank = a.bank || a.bankName || '', acct = a.account || a.accountNumber || '', nm = a.name || a.accountName || L.getItem('qc_biz_name') || 'Your Business';
      var auto = terms.length > 0 || genericOn();
      showPayModal('🏦 Bank Transfer', auto ? 'Confirms automatically when the money lands' : 'Customer sends the exact amount');
      var h = '';
      if (acct) h += '<div class="transfer-info"><div class="acct-bank">' + esc(bank || 'Bank not set') + '</div><div class="acct-num">' + esc(acct) + '</div><div class="acct-name">' + esc(nm) + '</div><div class="acct-amount">' + fm(total) + '</div></div>';
      else h += payHead(total) + '<div class="payhint">No bank account saved. Add one in <b>⚙ Settings → Bank & transfer</b>, or use a terminal below to show a transfer account on the machine.</div>';
      terms.forEach(function (t) {
        if (t.id === 'moniepoint' && t.push) h += '<button class="optbtn live" onclick="startTerminalPay(\'moniepoint\',' + total + ',\'transfer\')"><b>🟠 Show transfer account on Moniepoint terminal</b><small>Customer scans / transfers on the terminal screen. Auto-confirmed.</small></button>';
        if (t.id === 'paystack' && t.push) h += '<button class="optbtn live" onclick="startTerminalPay(\'paystack\',' + total + ',\'transfer\')"><b>🔷 Send to Paystack terminal</b><small>Customer chooses “Bank transfer” on the terminal. Auto-confirmed.</small></button>';
        if (t.id === 'opay' && t.push) h += '<button class="optbtn live" onclick="startTerminalPay(\'opay\',' + total + ',\'transfer\')"><b>🟢 Send to OPay terminal</b><small>Customer pays on the terminal. Auto-confirmed.</small></button>';
      });
      if (auto) h += '<button class="optbtn live" onclick="listenTransfer(' + total + ')"><b>⚡ I’ve given the customer the account — wait for payment</b><small>We watch for a credit of exactly ' + fm(total) + ' and finish the sale instantly.</small></button>';
      var ref = newRef('POS-TRF');
      h += '<div style="background:rgba(245,200,66,.12);border:1px solid rgba(245,200,66,.35);border-radius:14px;padding:10px 12px;margin:6px 0 12px;font-size:11px;color:var(--t2);"><strong>Reference:</strong> ' + esc(ref) + '<br><small>Ask the customer to use this as the narration</small></div>'
        + '<details style="margin-bottom:12px;"><summary style="font-size:12px;font-weight:700;color:var(--t2);cursor:pointer;">Confirm manually (no bank auto-detect)</summary>'
        + '<div style="margin-top:10px;"><label style="' + PML + '">Sender name / session ID (optional)</label><input id="trf-note" type="text" placeholder="e.g. Chinedu O. / 2301…" style="' + PMI + 'margin-bottom:8px;"><p style="font-size:11px;color:var(--t3);margin-bottom:8px;">Only press confirm after the credit alert shows in your bank app.</p>'
        + '<button onclick="confirmTransfer(\'' + ref + '\',' + total + ')" style="width:100%;background:var(--gr);' + PMB + '">✓ Confirm Received</button></div></details>'
        + '<div style="display:flex;gap:8px;">' + backBtn('Cancel', 'closePayModal()') + '</div>';
      setBody(h);
    });
  };
  window.listenTransfer = function (total) { startTerminalPay(null, total, 'transfer', true); };

  /* receipt description */
  window.payDescOf = function (o) {
    if (o.payMethod === 'cash') return 'Cash';
    if (o.payMethod === 'card') { var v = o.autoConfirmed ? (o.terminal || 'Terminal') : (o.cardVia === 'external-pos' ? (o.terminal || 'POS') + (o.approvalCode ? ' · ' + o.approvalCode : '') : o.cardVia === 'paystack-terminal' ? 'Paystack POS' : 'Paystack'); return 'Card (' + v + ')'; }
    if (o.payMethod === 'transfer') return 'Bank Transfer' + (o.autoConfirmed && o.terminal ? ' (' + o.terminal + ')' : '');
    if (o.payMethod === 'split') return 'Cash ' + fm(o.cashPaid) + ' + ' + (o.otherMethod === 'transfer' ? 'Transfer ' : 'Card ') + fm(o.cardPaid);
    return o.payMethod;
  };

  /* ══════════════════ SETTINGS ══════════════════ */
  var RC = { header: '', address: '', phone: '', footer: 'Thank you for shopping with us!', paper: '80', autoPrint: true, logo: '', vatNote: '' };
  window.RCPT = RC;
  async function loadReceiptCfg() { try { var r = await fetch(NSB() + '/settings/receipt.json'); var d = await r.json(); if (d && typeof d === 'object') Object.assign(RC, d); } catch (e) {} applyPaper(); }
  function applyPaper() {
    var w = RC.paper === '58' ? '58mm' : RC.paper === 'a4' ? '190mm' : '80mm';
    document.documentElement.style.setProperty('--paper', w);
    var st = $('page-size-style'); if (!st) { st = document.createElement('style'); st.id = 'page-size-style'; document.head.appendChild(st); }
    st.textContent = '@media print{@page{size:' + (RC.paper === 'a4' ? 'A4' : w + ' auto') + ';margin:0}}';
  }
  window.loadReceiptCfg = loadReceiptCfg;

  var WEBHOOK = function (p) { return location.origin + '/api/webhook?p=' + p + '&o=' + encodeURIComponent(OWNER()); };
  function fld(id, label, val, o) {
    o = o || {}; var set = o.isSet ? '<span class="set">✓ saved</span>' : '';
    var input = o.area ? '<textarea id="' + id + '" placeholder="' + esc(o.ph || '') + '" spellcheck="false" autocomplete="off">' + esc(val || '') + '</textarea>' : '<input id="' + id + '" type="' + (o.secret ? 'password' : 'text') + '" autocomplete="off" value="' + esc(val || '') + '" placeholder="' + esc(o.isSet ? '•••••••• (leave blank to keep)' : (o.ph || '')) + '">';
    return '<div class="tf"><label>' + label + set + '</label>' + input + (o.help ? '<div class="help">' + o.help + '</div>' : '') + '</div>';
  }
  function urlRow(url) { return '<div class="tf"><label>Your webhook URL</label><div class="urlrow"><input readonly value="' + esc(url) + '" onclick="this.select()"><button onclick="copyTxt(this,\'' + esc(url) + '\')">Copy</button></div></div>'; }
  window.copyTxt = function (b, t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); }).catch(function () { prompt('Copy this:', t); }); };

  function termCard(id) {
    var t = tinfo(id), c = t.cfg, s = t.sec, body = '', sub = '', status = t.push ? 'READY' : (t.listen ? 'LISTEN ONLY' : 'NOT SET UP');
    if (id === 'paystack') {
      sub = 'Card, transfer, USSD & QR on a Paystack terminal';
      body = '<div class="tsteps"><b>Where to find these</b><br>1. Paystack Dashboard → <b>Settings → API Keys & Webhooks</b> → copy your <b>Live Secret Key</b> (sk_live_…).<br>2. Dashboard → <b>Terminals</b> → your terminal’s <b>ID</b>.<br>3. Optional (auto-detect when you type the amount on the machine): set the Live Webhook URL below. <b>Paystack allows only one webhook URL per account</b>, so skip this if something else already uses it — pushing from the POS works without it.</div>'
        + fld('tm-paystack-terminalId', 'Terminal ID', c.terminalId, { ph: 'e.g. 7895939016' })
        + fld('tm-paystack-secretKey', 'Secret key', '', { secret: true, ph: 'sk_live_…', isSet: s.secretKey || TERM.envKey, help: TERM.envKey && !s.secretKey ? 'Using the platform-wide PAYSTACK_SECRET_KEY. Save your own key here to use your own Paystack account.' : 'Stored encrypted on the server. It is never shown again.' })
        + urlRow(WEBHOOK('paystack'));
    }
    if (id === 'moniepoint') {
      sub = 'Push amount to terminal · card & POS transfer · auto-confirm';
      body = '<div class="tsteps"><b>Setup (Moniepoint business account)</b><br>1. <b>Settings → ERP Integration</b> → choose your ERP → <b>Create client</b>. Copy the <b>Client ID</b> and <b>Client Secret</b> (the secret is shown only once).<br>2. <b>POS terminal configuration → POS Terminal features</b> → switch on <b>ERP integration</b> (terminal app 1.7.2 or higher).<br>3. <b>Terminal serial</b>: printed on the back of the terminal (like P260…) or in the Moniepoint app.<br>4. Optional — auto-detect when you type the amount on the terminal: <b>Settings → POS App Developers → Webhooks</b> → add the URL below, tick Purchase / Transfer / Collection events, and paste the secret it generates (terminal app 1.11.0+).<br>Support: pos-integrations@moniepoint.com</div>'
        + fld('tm-moniepoint-serial', 'Terminal serial number', c.serial, { ph: 'P260…' })
        + fld('tm-moniepoint-clientId', 'Client ID', '', { secret: true, ph: 'from ERP Integration', isSet: s.clientId })
        + fld('tm-moniepoint-clientSecret', 'Client Secret', '', { secret: true, ph: 'from ERP Integration', isSet: s.clientSecret })
        + fld('tm-moniepoint-webhookSecret', 'Webhook secret (optional)', '', { secret: true, ph: 'from Webhooks page', isSet: s.webhookSecret })
        + urlRow(WEBHOOK('moniepoint'))
        + '<div class="tf"><label>Amount unit sent to the terminal</label><select id="tm-moniepoint-amountUnit"><option value="naira"' + (c.amountUnit !== 'kobo' ? ' selected' : '') + '>Naira (default)</option><option value="kobo"' + (c.amountUnit === 'kobo' ? ' selected' : '') + '>Kobo</option></select><div class="help">Do a ₦50 test sale first. If the terminal shows ₦0.50 or ₦5,000, switch this.</div></div>';
    }
    if (id === 'opay') {
      sub = 'OPay POS API — RSA-signed requests';
      body = '<div class="tsteps"><b>Setup (OPay Business dashboard, Super Admin)</b><br>1. <b>Developer Tools</b> → copy <b>Business ID</b>, <b>Branch ID</b> and your <b>Client Auth Key</b>.<br>2. Create an RSA key pair (<code>openssl genrsa -out private.pem 2048</code> then <code>openssl rsa -in private.pem -pubout -out public.pem</code>). Upload <b>public.pem</b> to OPay; paste <b>private.pem</b> below. Also paste <b>OPay’s public key</b> from the dashboard.<br>3. <b>Terminal SN</b> = the POS serial number. Ask OPay for your <b>subSceneEnum</b> value (their docs say to contact them) and that the POS API is enabled for your account.<br>4. Developer Tools → <b>“POS & Others”</b> → paste the webhook URL below.</div>'
        + fld('tm-opay-headMerchantId', 'Business ID (headMerchantId)', c.headMerchantId) + fld('tm-opay-merchantId', 'Branch ID (merchantId)', c.merchantId)
        + fld('tm-opay-serial', 'Terminal SN', c.serial) + fld('tm-opay-subScene', 'subSceneEnum (from OPay)', c.subScene, { ph: 'e.g. CASH_API' })
        + fld('tm-opay-clientAuthKey', 'Client Auth Key', '', { secret: true, isSet: s.clientAuthKey })
        + fld('tm-opay-privateKey', 'Your private key (PEM)', '', { area: true, ph: '-----BEGIN PRIVATE KEY-----…', isSet: s.privateKey })
        + fld('tm-opay-opayPublicKey', 'OPay public key (PEM)', '', { area: true, ph: '-----BEGIN PUBLIC KEY-----…', isSet: s.opayPublicKey })
        + urlRow(WEBHOOK('opay'));
    }
    return '<div class="tcard' + (c.enabled ? ' on' : '') + '" id="tc-' + id + '"><div class="tcard-hd" onclick="this.parentNode.classList.toggle(\'open\')"><div style="font-size:24px">' + PICON[id] + '</div><div><b>' + PNAME[id] + '</b><small>' + sub + '</small></div><span class="badge' + (t.push ? ' ok' : '') + '">' + status + '</span></div>'
      + '<div class="tcard-bd"><div class="tf" style="display:flex;align-items:center;gap:10px;"><label style="margin:0;flex:1;">Enable on this POS</label><input type="checkbox" id="tm-' + id + '-enabled" ' + (c.enabled ? 'checked' : '') + ' style="width:22px;height:22px;"></div>'
      + fld('tm-' + id + '-label', 'Nickname (optional)', c.label, { ph: PNAME[id] }) + body
      + '<div class="tact"><button class="btn-test" onclick="testTerm(\'' + id + '\')">Test</button><button class="btn-save" onclick="saveTerm(\'' + id + '\')">Save ' + PNAME[id] + '</button></div></div></div>';
  }
  function genericCard() {
    var g = TERM.p.generic || { cfg: {}, secretsSet: {} }, on = !!(g.cfg && g.cfg.enabled);
    return '<div class="tcard' + (on ? ' on' : '') + '" id="tc-generic"><div class="tcard-hd" onclick="this.parentNode.classList.toggle(\'open\')"><div style="font-size:24px">🏦</div><div><b>Any other bank (PalmPay, Kuda, GTBank…)</b><small>Auto-confirm transfers from any bank-alert webhook</small></div><span class="badge' + (on ? ' ok' : '') + '">' + (on ? 'ACTIVE' : 'OFF') + '</span></div>'
      + '<div class="tcard-bd"><div class="tsteps"><b>How this works</b><br>PalmPay, Kuda and most banks do <b>not</b> publish an API to push amounts to their terminals. What <i>does</i> work is a credit-alert webhook: anything that can send an HTTP POST when money arrives (your bank’s business API, Monnify / Paystack virtual accounts, Zapier, Make, n8n, an alert-forwarding app…) can notify the POS.<br>Send a POST to the URL below with header <code>x-qc-secret: &lt;your secret&gt;</code> and JSON <code>{"amount": 5000, "reference": "optional", "status": "success"}</code>. Sales complete when the amount matches exactly.</div>'
      + urlRow(WEBHOOK('generic'))
      + '<div class="tf"><label>Secret' + (g.secretsSet && g.secretsSet.webhookSecret ? '<span class="set">✓ set</span>' : '') + '</label><div class="urlrow"><input id="tm-generic-token" readonly placeholder="Press Generate — shown only once"><button onclick="genToken()">Generate</button></div><div class="help">Generating a new secret replaces the old one.</div></div></div></div>';
  }
  window.genToken = async function () {
    try { var r = await apiTerm('newGenericToken'); $('tm-generic-token').value = r.token; $('tm-generic-token').select(); pToast('Secret generated — copy it now', 'ok'); await loadTerminals(); }
    catch (e) { pToast('❌ ' + e.message, 'err'); }
  };
  function readTerm(id) {
    var g = function (f) { var e = $('tm-' + id + '-' + f); return e ? (e.type === 'checkbox' ? e.checked : e.value) : undefined; };
    var pubF = { paystack: ['terminalId', 'label'], moniepoint: ['serial', 'label', 'amountUnit'], opay: ['serial', 'label', 'headMerchantId', 'merchantId', 'subScene'] }[id], secF = { paystack: ['secretKey'], moniepoint: ['clientId', 'clientSecret', 'webhookSecret'], opay: ['privateKey', 'opayPublicKey', 'clientAuthKey'] }[id];
    var cfg = { enabled: !!g('enabled') }, secrets = {}; pubF.forEach(function (f) { cfg[f] = g(f); }); secF.forEach(function (f) { secrets[f] = g(f); });
    return { cfg: cfg, secrets: secrets };
  }
  window.saveTerm = async function (id) {
    var d = readTerm(id);
    try { await apiTerm('save', { provider: id, cfg: d.cfg, secrets: d.secrets }); pToast('✅ ' + PNAME[id] + ' saved', 'ok'); await loadTerminals(); renderTerminals(id); }
    catch (e) { pToast('❌ ' + e.message, 'err'); }
  };
  window.testTerm = async function (id) {
    try { await saveTermQuiet(id); var r = await apiTerm('test', { provider: id }); pToast((r.ok ? '✅ ' : '⚠️ ') + (r.message || r.error || (r.ok ? 'OK' : 'Failed')), r.ok ? 'ok' : 'err'); }
    catch (e) { pToast('❌ ' + e.message, 'err'); }
  };
  async function saveTermQuiet(id) { var d = readTerm(id); await apiTerm('save', { provider: id, cfg: d.cfg, secrets: d.secrets }); await loadTerminals(); }
  function renderTerminals(openId) {
    var box = $('terminals-box'); if (!box) return;
    var warn = TERM.noEnc ? '<div class="payhint"><b>One-time server setup needed:</b> add an environment variable <code>QC_ENC_KEY</code> (any long random text) in Vercel → Settings → Environment Variables, then redeploy. It encrypts your bank keys. Until then keys cannot be saved.</div>' : '';
    box.innerHTML = warn + ['paystack', 'moniepoint', 'opay'].map(termCard).join('') + genericCard();
    if (openId) { var el = $('tc-' + openId); if (el) el.classList.add('open'); }
  }

  window.setTab = function (t) {
    ['pay', 'bank', 'receipt', 'scan'].forEach(function (k) { var p = $('st-' + k), b = $('stb-' + k); if (p) p.style.display = k === t ? 'block' : 'none'; if (b) b.classList.toggle('on', k === t); });
  };
  window.openPosSettings = async function () {
    if (window.qcCanPosSettings && !window.qcCanPosSettings()) { QC.alert('Only the store owner or an Admin can change POS settings.',{title:'Owner only'}); return; }
    $('pos-settings-modal').style.display = 'flex'; setTab('pay');
    $('terminals-box').innerHTML = '<div style="padding:24px;text-align:center;color:var(--t3);">Loading…</div>';
    await loadTerminals(); renderTerminals();
    try {
      var ns = NSB();
      var res = await Promise.all([fetch(ns + '/settings/paystack_key.json').then(function (r) { return r.json(); }).catch(function () { return null; }), fetch(ns + '/settings/bank_account.json').then(function (r) { return r.json(); }).catch(function () { return null; }), fetch(ns + '/settings/local_providers.json').then(function (r) { return r.json(); }).catch(function () { return null; })]);
      if (res[0] && typeof res[0] === 'string') $('ps-ps-key').value = res[0];
      try { var lk = await fetch(ns + '/settings/paystack_locked.json').then(function (r) { return r.json(); }); var kf = $('ps-ps-key'); if (lk === true && kf) { kf.disabled = true; kf.title = 'Locked. Change it in Admin > Settings.'; } } catch (e) {}
      var b = res[1]; if (b) { $('ps-bank-name').value = b.bank || b.bankName || ''; $('ps-bank-acct').value = b.account || b.accountNumber || ''; $('ps-bank-aname').value = b.name || b.accountName || ''; }
      renderLocalProvidersForm(res[2] || {});
    } catch (e) {}
    await loadReceiptCfg();
    $('rc-address').value = RC.address || ''; $('rc-phone').value = RC.phone || ''; $('rc-header').value = RC.header || ''; $('rc-footer').value = RC.footer || ''; $('rc-paper').value = RC.paper || '80'; $('rc-auto').checked = !!RC.autoPrint; $('rc-vat').value = RC.vatNote || '';
    $('rc-logo-prev').innerHTML = RC.logo ? '<img src="' + RC.logo + '" style="max-height:48px;filter:grayscale(1)">' : '<span style="color:var(--t3);font-size:11px;">No logo</span>';
    $('sc-sound').checked = BC.sound; $('sc-mode').value = BC.mode;
  };
  window.savePosSettings = async function () {
    if (window.qcCanPosSettings && !window.qcCanPosSettings()) { QC.alert('Only the store owner or an Admin can change POS settings.',{title:'Owner only'}); return; }
    var ns = NSB(), H = { 'Content-Type': 'application/json' };
    var bank = { bank: $('ps-bank-name').value.trim(), account: $('ps-bank-acct').value.trim(), name: $('ps-bank-aname').value.trim() }, lp = {};
    bank.bankName = bank.bank; bank.accountNumber = bank.account; bank.accountName = bank.name;
    LOCAL_PROVIDERS_LIST.forEach(function (k) { var btn = $('lp-toggle-' + k); lp[k] = { enabled: !!btn && btn.textContent.trim() === 'ON', account: ($('lp-acct-' + k) || {}).value || '', name: ($('lp-name-' + k) || {}).value || '' }; });
    RC.address = $('rc-address').value.trim(); RC.phone = $('rc-phone').value.trim(); RC.header = $('rc-header').value.trim(); RC.footer = $('rc-footer').value.trim(); RC.paper = $('rc-paper').value; RC.autoPrint = $('rc-auto').checked; RC.vatNote = $('rc-vat').value.trim();
    BC.sound = $('sc-sound').checked; BC.mode = $('sc-mode').value; L.setItem('qc_scan_sound', BC.sound ? '1' : '0'); L.setItem('qc_scan_mode', BC.mode);
    var psKey = $('ps-ps-key').value.trim();
    try {
      var saves = [fetch(ns + '/settings/bank_account.json', { method: 'PUT', headers: H, body: JSON.stringify(bank) }), fetch(ns + '/settings/local_providers.json', { method: 'PUT', headers: H, body: JSON.stringify(lp) }), fetch(ns + '/settings/receipt.json', { method: 'PUT', headers: H, body: JSON.stringify(RC) })];
      if (psKey && !$('ps-ps-key').disabled) saves.push(fetch(ns + '/settings/paystack_key.json', { method: 'PUT', headers: H, body: JSON.stringify(psKey) }));
      var rs = await Promise.all(saves); if (rs.some(function (r) { return !r.ok; })) throw new Error('save');
      if (psKey) PAYSTACK_PUB_KEY = psKey;
      applyPaper(); refreshScanMode(); pToast('✅ Settings saved', 'ok'); $('pos-settings-modal').style.display = 'none'; loadLocalPayProviders();
    } catch (e) { pToast('Failed to save settings', 'err'); }
  };
  window.pickLogo = function (inp) {
    var f = inp.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function (e) { var im = new Image(); im.onload = function () { var w = Math.min(320, im.width), h = Math.round(im.height * w / im.width), c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h); RC.logo = c.toDataURL('image/png'); $('rc-logo-prev').innerHTML = '<img src="' + RC.logo + '" style="max-height:48px;filter:grayscale(1)">'; }; im.src = e.target.result; };
    rd.readAsDataURL(f); inp.value = '';
  };
  window.clearLogo = function () { RC.logo = ''; $('rc-logo-prev').innerHTML = '<span style="color:var(--t3);font-size:11px;">No logo</span>'; };
  window.testTerminal = function () { testTerm('paystack'); };

  /* ══════════════════ RECEIPT ══════════════════ */
  window.showReceipt = function (o) {
    var biz = L.getItem('qc_biz_name') || 'QuickCart Store', now = new Date(o.createdAt || Date.now());
    var sub = o.items.reduce(function (s, i) { return s + i.price * i.qty; }, 0), qtyN = o.items.reduce(function (s, i) { return s + i.qty; }, 0);
    var h = (RC.logo ? '<img class="r-logoimg" src="' + RC.logo + '" alt="">' : '') + '<div class="r-logo">' + esc(biz) + '</div>'
      + (RC.address ? '<div class="r-sub" style="margin-bottom:2px;">' + esc(RC.address) + '</div>' : '') + (RC.phone ? '<div class="r-sub" style="margin-bottom:2px;">Tel: ' + esc(RC.phone) + '</div>' : '') + (RC.header ? '<div class="r-sub" style="margin-bottom:2px;">' + esc(RC.header) + '</div>' : '')
      + '<div class="r-div"></div><div style="font-size:10px;color:#444;line-height:1.6;">Receipt: <b>' + esc(o.ref) + '</b><br>Date: ' + now.toLocaleString('en-NG') + '<br>Cashier: ' + esc(o.cashier || '') + '</div><div class="r-div"></div>'
      + o.items.map(function (it) { return '<div class="r-item"><span class="n">' + esc(it.name) + '<br><small style="color:#666">' + it.qty + ' × ' + fm(it.price) + '</small></span><span>' + fm(it.price * it.qty) + '</span></div>'; }).join('')
      + '<div class="r-div"></div><div class="r-totals">'
      + '<div class="r-trow" style="font-weight:400;font-size:11px;color:#444;"><span>Items (' + qtyN + ')</span><span>' + fm(sub) + '</span></div>'
      + (o.discount ? '<div class="r-trow" style="font-weight:400;font-size:11px;color:#444;"><span>Discount</span><span>−' + fm(o.discount) + '</span></div>' : '')
      + '<div class="r-trow" style="font-size:15px;"><span>TOTAL</span><span>' + fm(o.total) + '</span></div>'
      + '<div class="r-trow" style="font-weight:400;font-size:11px;color:#444;"><span>Paid by</span><span>' + esc(payDescOf(o)) + '</span></div>'
      + (o.tendered && o.payMethod === 'cash' ? '<div class="r-trow" style="font-weight:400;font-size:11px;color:#444;"><span>Tendered</span><span>' + fm(o.tendered) + '</span></div>' : '')
      + (o.change > 0 ? '<div class="r-trow"><span>CHANGE</span><span>' + fm(o.change) + '</span></div>' : '')
      + (o.autoConfirmed ? '<div class="r-trow" style="font-weight:400;font-size:10px;color:#444;"><span>Bank confirmed</span><span>✓ ' + esc(o.bankRef || o.terminal || '') + '</span></div>' : '')
      + (o.approvalCode ? '<div class="r-trow" style="font-weight:400;font-size:10px;color:#444;"><span>Approval code</span><span>' + esc(o.approvalCode) + '</span></div>' : '')
      + '</div>' + (RC.vatNote ? '<div class="r-sub" style="margin-top:8px;">' + esc(RC.vatNote) + '</div>' : '')
      + '<div class="r-thank">' + esc(RC.footer || 'Thank you!') + '<br><small style="font-size:9px;font-weight:400;color:#888;">Powered by QuickCart POS</small></div>';
    $('recin').innerHTML = h; $('recov').classList.add('open'); applyPaper();
    var pb = document.querySelector('.r-print'); if (pb) pb.onclick = function () { window.print(); };
    if (RC.autoPrint && !o._noPrint) setTimeout(function () { window.print(); }, 450);
  };

  /* ══════════════════ boot ══════════════════ */
  window.addEventListener('DOMContentLoaded', function () {
    refreshScanMode(); loadTerminals(); loadReceiptCfg();
  });
})();
} catch (e) { if (window.console) console.error("[pos-ext.js]", e); }

/* ═══ pos-v60.js ═══ */
try {
/* QuickCart POS v60 — loaded after pos.html's inline script and pos-ext.js.
   1) Filter drawer (outlet, category, brand, price, stock, price level, price profile, type, sort) replaces STOCK/BOOK
   2) Price levels, price profiles and wholesale quantity tiers applied live to the grid and the cart
   3) Clean thermal receipt: prints ONLY the receipt (80mm / 58mm / A4) through an isolated print frame
   4) POS session log + staff activity trail (login, sales, voids, discounts, outlet) visible to the admin in HR
   5) Services appear beside products; staff are locked to the outlet on their account */
(function () {
  'use strict';
  var L = localStorage, $ = function (i) { return document.getElementById(i); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var fm = function (n) { n = Number(n) || 0; return '₦' + Math.round(n).toLocaleString('en-NG'); };
  var ns = function () { return window.getNS ? getNS() : QCDB.base(); };
  var jp = function (s, d) { try { return JSON.parse(s); } catch (e) { return d; } };
  function api(p, m, b) { return fetch(ns() + '/' + p + '.json', { method: m || 'GET', body: b === undefined ? undefined : JSON.stringify(b), keepalive: m === 'PATCH' }).then(function (r) { return r.json().catch(function () { return null; }); }); }
  /* audit data lives OUTSIDE the store tree (audit/<owner>/…) so database rules can hide it from staff */
  function aurl(path) { var d = L.getItem('qc_db_url'), o = L.getItem('qc_owner') || L.getItem('qc_logged_user') || 'admin'; return (d ? d + '/audit/' : 'https://sneakerai-c96f0-default-rtdb.firebaseio.com/audit/' + encodeURIComponent(o) + '/') + path + '.json'; }
  function aapi(p, m, b) { return fetch(aurl(p), { method: m || 'GET', body: b === undefined ? undefined : JSON.stringify(b), keepalive: m === 'PATCH' }).catch(function () { }); }
  var isStaff = function () { return L.getItem('qc_is_staff') === '1'; };
  var who = function () { return { user: L.getItem('qc_logged_user') || '', name: L.getItem('qc_full_name') || L.getItem('qc_biz_name') || L.getItem('qc_logged_user') || 'Cashier', role: L.getItem('qc_role') || (isStaff() ? 'staff' : 'owner'), outlet: L.getItem('qc_outlet') || '' }; };

  /* ════════ ACTIVITY + SESSION LOG ════════ */
  var SID = null, SES = { sales: 0, total: 0 };
  function logAct(action, detail, extra) {
    var w = who(), at = new Date().toISOString();
    var rec = Object.assign({ at: at, user: w.user, name: w.name, role: w.role, outlet: w.outlet, action: action, detail: detail || '', where: 'pos', device: window.deviceId ? deviceId() : '', session: SID || '' }, extra || {});
    return aapi('activity/' + at.slice(0, 10), 'POST', rec);
  }
  window.QCLog = logAct;
  function startSession() {
    var w = who(), at = new Date().toISOString(); SID = sessionStorage.getItem('qc_sid_pos');
    if (SID) { aapi('sessions/' + SID, 'PATCH', { lastSeen: at, outlet: w.outlet }); return; }
    SID = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); sessionStorage.setItem('qc_sid_pos', SID);
    aapi('sessions/' + SID, 'PUT', { user: w.user, name: w.name, role: w.role, outlet: w.outlet, where: 'pos', device: window.deviceId ? deviceId() : '', loginAt: at, lastSeen: at, sales: 0, total: 0, status: 'open', ua: navigator.userAgent.slice(0, 90) });
    logAct('POS opened', 'Session started' + (w.outlet ? ' at ' + w.outlet : ''));
  }
  function endSession() { if (!SID) return; var at = new Date().toISOString(); try { aapi('sessions/' + SID, 'PATCH', { logoutAt: at, lastSeen: at, status: 'closed', sales: SES.sales, total: SES.total }); } catch (e) { } }
  function beat() { if (!SID) return; aapi('sessions/' + SID, 'PATCH', { lastSeen: new Date().toISOString(), sales: SES.sales, total: SES.total, outlet: who().outlet }); }
  window.addEventListener('pagehide', endSession); window.addEventListener('beforeunload', endSession);
  setInterval(beat, 60000);

  /* ════════ DATA FOR FILTERS / PRICING ════════ */
  var F = { q: '', cat: 'All', brand: '', outlet: '', pmin: '', pmax: '', stock: '', type: '', level: L.getItem('qc_pos_level') || '', profile: L.getItem('qc_pos_profile') || '', sort: 'name' };
  var LEVELS = {}, PROFILES = {}, TIERS = [], OSTOCK = {}, SERVICES = [], FLASH = [], COUPONS = {}, SEC = {}, GROUPS = {};
  function rebase() { (window._prods || []).forEach(function (p) { if (p._base === undefined) p._base = Number(p.price) || 0; }); }
  function unitPrice(p, qty) {
    var b = p._base !== undefined ? p._base : Number(p.price) || 0, v = b;
    if (p.isService && p.noDiscount) return b;
    var lv = LEVELS[F.level]; if (lv) { var x = Number(lv.value) || 0; v = lv.type === 'percent' ? b * (1 - x / 100) : lv.type === 'fixed' ? Math.max(0, b - x) : b * (x || 1); }
    var pf = PROFILES[F.profile]; if (pf) { var adj = Number((pf.byCategory || {})[p.category]); if (isNaN(adj) || (pf.byCategory || {})[p.category] === undefined) adj = Number(pf.adjust) || 0; v = v * (1 + adj / 100); if (pf.round) v = Math.round(v / pf.round) * pf.round; }
    var now = Date.now(); FLASH.forEach(function (f) { if (f.active !== false && now >= new Date(f.start) && now <= new Date(f.end) && ((f.category && f.category === p.category) || (f.productKeys || []).indexOf(p._k) > -1)) v = v * (1 - (Number(f.pct) || 0) / 100); });
    if (qty) { var best = 0; TIERS.forEach(function (t) { if (qty >= t.minQty && t.pct > best && (!t.category || t.category === p.category)) best = t.pct; }); if (best) v = v * (1 - best / 100); }
    return Math.round(v);
  }
  function applyPrices() { rebase(); (window._prods || []).forEach(function (p) { p.price = unitPrice(p, 0); }); if (window._cart) _cart.forEach(function (i) { var p = _prods.filter(function (x) { return x._k === i._k; })[0]; if (p) i.price = unitPrice(p, i.qty); }); }

  async function loadAux() {
    var r = await Promise.all([api('settings/price_levels'), api('settings/price_profiles'), api('settings/wholesale_tiers'), api('outlet_stock'), api('services'), api('marketing/flash'), api('marketing/coupons'), api('settings/security_rules'), api('settings/customer_groups')]);
    FLASH = Object.keys(r[5] || {}).map(function (k) { return r[5][k]; }); COUPONS = r[6] || {}; SEC = r[7] || {}; GROUPS = r[8] || {};
    LEVELS = r[0] || {}; PROFILES = r[1] || {}; TIERS = Object.keys(r[2] || {}).map(function (k) { return r[2][k]; }).filter(function (t) { return t && t.active !== false; }); OSTOCK = r[3] || {};
    SERVICES = Object.keys(r[4] || {}).map(function (k) { return Object.assign({ _k: 'svc_' + k, isService: true }, r[4][k]); }).filter(function (s) { return s.active !== false; });
    mergeServices();
  }
  function mergeServices() {
    if (!window._prods) return; window._prods = _prods.filter(function (p) { return !p.isService; });
    SERVICES.forEach(function (s) { _prods.push({ _k: s._k, isService: true, name: s.name, category: s.category || 'Services', price: Number(s.price) || 0, quantity: 99999, inStock: true, brand: s.duration ? s.duration + ' min' : 'Service', cost: Number(s.cost) || 0, sku: s.code || '', image: s.image || '', description: s.description || '', noDiscount: false, consumes: s.consumes || [] }); });
    rebase(); applyPrices();
  }

  /* ════════ FILTER ENGINE ════════ */
  function inOutlet(p, o) { if (!o) return true; if (p.isService) return !p.outlets || !p.outlets.length || [].concat(p.outlets).indexOf(o) > -1; if (p.outlet === o || [].concat(p.outlets || []).indexOf(o) > -1) return true; var s = OSTOCK[o]; return !!(s && Number(s[p._k]) > 0); }
  function filtered() {
    var q = (F.q || '').toLowerCase().trim(), pmin = F.pmin !== '' ? Number(F.pmin) : null, pmax = F.pmax !== '' ? Number(F.pmax) : null;
    var out = (window._prods || []).filter(function (p) {
      if (F.cat !== 'All' && p.category !== F.cat) return false; if (F.brand && p.brand !== F.brand) return false; if (!inOutlet(p, F.outlet)) return false;
      var pr = Number(p.price) || 0; if (pmin !== null && pr < pmin) return false; if (pmax !== null && pr > pmax) return false;
      var qty = Number(p.quantity) || 0, low = qty <= (Number(p.reorderPoint) || 5);
      if (F.stock === 'in' && (p.inStock === false || qty <= 0)) return false; if (F.stock === 'low' && !(qty > 0 && low && !p.isService)) return false; if (F.stock === 'out' && !(p.inStock === false || qty <= 0)) return false;
      if (F.type === 'product' && p.isService) return false; if (F.type === 'service' && !p.isService) return false;
      if (q && ((p.name || '') + ' ' + (p.brand || '') + ' ' + (p.category || '') + ' ' + (p.barcode || '') + ' ' + (p.sku || '') + ' ' + (p.description || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var S = { name: function (a, b) { return String(a.name || '').localeCompare(b.name || ''); }, plow: function (a, b) { return a.price - b.price; }, phigh: function (a, b) { return b.price - a.price; }, stock: function (a, b) { return (Number(b.quantity) || 0) - (Number(a.quantity) || 0); }, newest: function (a, b) { return String(b.createdAt || '').localeCompare(a.createdAt || ''); } };
    return out.sort(S[F.sort] || S.name);
  }
  function count() { var n = 0; ['brand', 'outlet', 'pmin', 'pmax', 'stock', 'type', 'level', 'profile'].forEach(function (k) { if (F[k] !== '' && F[k] != null) n++; }); if (F.sort !== 'name') n++; return n; }
  function paint() {
    var list = filtered(); if (window.QCPOS) QCPOS.grid(list); updBadge(); chips();
    var s = $('srch'); if (s && s.value !== F.q) s.value = F.q;
  }
  window.filterCat = function (cat) { F.cat = cat; if (window.QCPOS) QCPOS.active(cat); paint(); };
  window.doSearch = function (q) { F.q = q || ''; paint(); };
  window.renderGrid = function () { paint(); };
  function updBadge() { var b = $('qf-badge'); if (b) { var n = count(); b.textContent = n; b.style.display = n ? 'flex' : 'none'; } }
  function chips() {
    var host = $('qf-chips'); if (!host) { var pills = $('cpills'); if (!pills) return; host = document.createElement('div'); host.id = 'qf-chips'; pills.parentNode.insertBefore(host, pills.nextSibling); }
    var c = [];
    if (F.outlet) c.push(['outlet', '🏬 ' + F.outlet]); if (F.brand) c.push(['brand', 'Brand: ' + F.brand]); if (F.pmin !== '' || F.pmax !== '') c.push(['pmin', '₦' + (F.pmin || 0) + ' – ' + (F.pmax !== '' ? '₦' + F.pmax : 'any')]); if (F.stock) c.push(['stock', { in: 'In stock', low: 'Low stock', out: 'Out of stock' }[F.stock]]); if (F.type) c.push(['type', F.type === 'service' ? 'Services only' : 'Products only']);
    if (F.level && LEVELS[F.level]) c.push(['level', '💰 ' + LEVELS[F.level].name]); if (F.profile && PROFILES[F.profile]) c.push(['profile', '🏷 ' + PROFILES[F.profile].name]);
    host.className = 'qf-chips'; host.innerHTML = c.map(function (x) { return '<span class="qf-chip" data-k="' + x[0] + '">' + esc(x[1]) + ' ✕</span>'; }).join('') + (c.length ? '<span class="qf-chip qf-clear" data-k="all">Clear all</span>' : '') + '<span class="qf-res">' + filtered().length + ' shown</span>';
    host.querySelectorAll('.qf-chip').forEach(function (e) { e.onclick = function () { var k = e.getAttribute('data-k'); if (k === 'all') resetF(); else { F[k] = ''; if (k === 'pmin') F.pmax = ''; persist(); applyPrices(); } paint(); }; });
  }
  function persist() { L.setItem('qc_pos_level', F.level); L.setItem('qc_pos_profile', F.profile); }
  function resetF() { var keep = F.q, cat = F.cat; F = { q: keep, cat: cat, brand: '', outlet: '', pmin: '', pmax: '', stock: '', type: '', level: '', profile: '', sort: 'name' }; persist(); applyPrices(); }

  function css() {
    if ($('qf-css')) return; var fl = document.createElement('link'); fl.rel = 'stylesheet'; fl.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap'; document.head.appendChild(fl); var s = document.createElement('style'); s.id = 'qf-css';
    s.textContent = '.qf-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:0 2px 8px}.qf-chips:empty{display:none}.qf-chip{background:var(--s3,#252525);border:1px solid var(--b2,#333);border-radius:99px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--t,#fff)}.qf-clear{background:none;color:var(--t3,#999)}.qf-res{margin-left:auto;font-size:11px;color:var(--t3,#999)}' +
      '.qf-btn{position:relative}.qf-badge{position:absolute;top:-6px;right:-6px;min-width:17px;height:17px;border-radius:9px;background:#00c076;color:#06121a;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center;padding:0 4px}' +
      '.qf-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:none;justify-content:flex-end}.qf-ov.open{display:flex}.qf-dr{width:min(420px,100%);height:100%;background:var(--s,#161616);border-left:1px solid var(--b,#2a2a2a);display:flex;flex-direction:column;animation:qfin .2s ease}@keyframes qfin{from{transform:translateX(30px);opacity:0}to{transform:none;opacity:1}}' +
      '.qf-h{padding:16px 18px;border-bottom:1px solid var(--b,#2a2a2a);display:flex;align-items:center;justify-content:space-between}.qf-h h3{font-size:16px;font-weight:700;letter-spacing:-.01em}.qf-x{background:none;border:0;color:var(--t2,#aaa);font-size:20px}' +
      '.qf-b{flex:1;overflow:auto;padding:16px 18px;display:grid;gap:14px;align-content:start}.qf-b label{display:block;font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--t3,#888);margin-bottom:5px}' +
      '.qf-b input,.qf-b select{width:100%;background:var(--s2,#1e1e1e);border:1px solid var(--b2,#333);color:var(--t,#fff);padding:10px 11px;font-size:13px;border-radius:7px;outline:none}.qf-b input:focus,.qf-b select:focus{border-color:#666}.qf-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.qf-f{padding:14px 18px;border-top:1px solid var(--b,#2a2a2a);display:flex;gap:10px}.qf-f button{flex:1;padding:12px;font-weight:700;font-size:13px;border-radius:8px;border:1px solid var(--b2,#333);background:none;color:var(--t,#fff)}.qf-f .go{background:#fff;color:#000;border-color:#fff;flex:2}' +
      '.qf-hint{font-size:11px;color:var(--t3,#888);line-height:1.5}' +
      'body,button,input,select,textarea{font-family:"Geist",-apple-system,"Segoe UI",sans-serif!important}@media print{body>*:not(#qc-print-root){display:none!important}}';
    document.head.appendChild(s);
  }
  function opts(arr, sel, blank) { return '<option value="">' + blank + '</option>' + arr.map(function (a) { var v = typeof a === 'object' ? a.v : a, l = typeof a === 'object' ? a.l : a; return '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); }
  window.openFilter = async function () {
    css(); var ov = $('qf-ov'); if (!ov) { ov = document.createElement('div'); ov.id = 'qf-ov'; ov.className = 'qf-ov'; ov.onclick = function (e) { if (e.target === ov) ov.classList.remove('open'); }; document.body.appendChild(ov); }
    var P = window._prods || [], cats = [], brands = []; P.forEach(function (p) { if (p.category && cats.indexOf(p.category) < 0) cats.push(p.category); if (p.brand && brands.indexOf(p.brand) < 0 && !p.isService) brands.push(p.brand); });
    var outs = []; try { var oo = await api('settings/outlets'); outs = Object.keys(oo || {}).map(function (k) { return oo[k] && oo[k].name; }).filter(Boolean); } catch (e) { } if (!outs.length) outs = jp(L.getItem('qc_outlets_c'), []);
    ov.innerHTML = '<div class="qf-dr"><div class="qf-h"><h3>Filter products</h3><button class="qf-x" id="qf-x">✕</button></div><div class="qf-b">' +
      '<div><label>Search (name, SKU, barcode, brand)</label><input id="f-q" value="' + esc(F.q) + '" placeholder="Type to search…"></div>' +
      '<div class="qf-2"><div><label>Store / outlet</label><select id="f-outlet">' + opts(outs, F.outlet, 'All outlets') + '</select></div><div><label>Category</label><select id="f-cat">' + opts(cats, F.cat === 'All' ? '' : F.cat, 'All categories') + '</select></div></div>' +
      '<div class="qf-2"><div><label>Brand</label><select id="f-brand">' + opts(brands.sort(), F.brand, 'All brands') + '</select></div><div><label>Type</label><select id="f-type">' + opts([{ v: 'product', l: 'Products' }, { v: 'service', l: 'Services' }], F.type, 'Products & services') + '</select></div></div>' +
      '<div class="qf-2"><div><label>Price from (₦)</label><input id="f-pmin" type="number" min="0" value="' + esc(F.pmin) + '"></div><div><label>Price to (₦)</label><input id="f-pmax" type="number" min="0" value="' + esc(F.pmax) + '"></div></div>' +
      '<div class="qf-2"><div><label>Stock status</label><select id="f-stock">' + opts([{ v: 'in', l: 'In stock' }, { v: 'low', l: 'Low stock' }, { v: 'out', l: 'Out of stock' }], F.stock, 'Any') + '</select></div><div><label>Sort by</label><select id="f-sort">' + [['name', 'Name A–Z'], ['plow', 'Price: low → high'], ['phigh', 'Price: high → low'], ['stock', 'Most stock'], ['newest', 'Newest']].map(function (s) { return '<option value="' + s[0] + '"' + (F.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="qf-2"><div><label>Price level</label><select id="f-level">' + opts(Object.keys(LEVELS).map(function (k) { return { v: k, l: LEVELS[k].name }; }), F.level, 'Standard price') + '</select></div><div><label>Price profile</label><select id="f-profile">' + opts(Object.keys(PROFILES).map(function (k) { return { v: k, l: PROFILES[k].name }; }), F.profile, 'No profile') + '</select></div></div>' +
      '<div class="qf-hint">Price level and price profile re-price every product and the current cart (e.g. Wholesale, Staff, VIP). Create them in Dashboard → Price Levels / Wholesale.</div></div>' +
      '<div class="qf-f"><button id="f-reset">Reset</button><button class="go" id="f-go">Show <span id="f-n"></span> items</button></div></div>';
    var gv = function (i) { return $(i).value; };
    function read() { F.q = gv('f-q'); F.cat = gv('f-cat') || 'All'; F.outlet = gv('f-outlet'); F.brand = gv('f-brand'); F.type = gv('f-type'); F.pmin = gv('f-pmin'); F.pmax = gv('f-pmax'); F.stock = gv('f-stock'); F.sort = gv('f-sort'); F.level = gv('f-level'); F.profile = gv('f-profile'); persist(); applyPrices(); $('f-n').textContent = filtered().length; }
    ov.querySelectorAll('input,select').forEach(function (e) { e.oninput = read; e.onchange = read; }); read();
    $('qf-x').onclick = function () { ov.classList.remove('open'); }; $('f-go').onclick = function () { read(); if (window.QCPOS) QCPOS.active(F.cat); paint(); ov.classList.remove('open'); logAct('Filter used', JSON.stringify({ outlet: F.outlet, cat: F.cat, level: F.level, profile: F.profile })); };
    $('f-reset').onclick = function () { resetF(); ov.classList.remove('open'); if (window.QCPOS) QCPOS.active('All'); paint(); };
    ov.classList.add('open');
  };

  /* repricing in cart: wholesale tiers react to quantity */
  var _rc = window.renderCart;
  if (typeof _rc === 'function') window.renderCart = function () { try { (window._cart || []).forEach(function (i) { var p = _prods.filter(function (x) { return x._k === i._k; })[0]; if (p) i.price = unitPrice(p, i.qty); }); } catch (e) { } return _rc.apply(this, arguments); };

  /* ════════ RECEIPT (thermal) ════════ */
  var RCFG = function () { return window.RCPT || { paper: '80', footer: 'Thank you for shopping with us!' }; };
  function payText(o) {
    if (o.payMethod === 'split') return 'Cash ' + fm(o.cashPaid) + ' + ' + (o.otherMethod === 'transfer' ? 'Transfer ' : 'Card ') + fm(o.cardPaid);
    var m = String(o.payMethod || 'cash'); return m.charAt(0).toUpperCase() + m.slice(1);
  }
  function receiptBody(o) {
    var R = RCFG(), biz = L.getItem('qc_biz_name') || 'QuickCart Store', d = new Date(o.createdAt || Date.now()), qty = (o.items || []).reduce(function (s, i) { return s + i.qty; }, 0), sub = (o.items || []).reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var row = function (a, b, bold) { return '<div class="r ' + (bold ? 'b' : '') + '"><span>' + a + '</span><span>' + b + '</span></div>'; };
    return (R.logo ? '<img class="lg" src="' + R.logo + '" alt="">' : '') + '<div class="c big">' + esc(biz) + '</div>' + (o.outlet ? '<div class="c">' + esc(o.outlet) + '</div>' : '') + (R.address ? '<div class="c sm">' + esc(R.address) + '</div>' : '') + (R.phone ? '<div class="c sm">Tel: ' + esc(R.phone) + '</div>' : '') + (R.header ? '<div class="c sm">' + esc(R.header) + '</div>' : '') +
      '<hr>' + '<div class="sm">Receipt: <b>' + esc(o.ref) + '</b></div><div class="sm">Date: ' + d.toLocaleDateString('en-NG') + ' ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) + '</div><div class="sm">Cashier: ' + esc(o.cashier || '') + '</div>' + (o.customerName ? '<div class="sm">Customer: ' + esc(o.customerName) + '</div>' : '') +
      '<hr>' + (o.items || []).map(function (it) { return '<div class="it"><div>' + esc(it.name) + '</div><div class="r sm"><span>' + it.qty + ' x ' + fm(it.price) + '</span><span>' + fm(it.price * it.qty) + '</span></div></div>'; }).join('') +
      '<hr>' + row('Items (' + qty + ')', fm(sub)) + (o.discount ? row('Discount', '-' + fm(o.discount)) : '') + (o.vat ? row('VAT incl.', fm(o.vat)) : '') + '<div class="r b tot"><span>TOTAL</span><span>' + fm(o.total) + '</span></div>' +
      row('Paid by', esc(payText(o))) + (o.payMethod === 'cash' && o.tendered ? row('Tendered', fm(o.tendered)) : '') + (o.change > 0 ? row('Change', fm(o.change), 1) : '') + (o.approvalCode ? row('Approval', esc(o.approvalCode)) : '') + (o.autoConfirmed ? row('Bank confirmed', '✓') : '') + (o.loyaltyEarned ? row('Points earned', '+' + o.loyaltyEarned) : '') +
      (o.offline ? '<div class="c sm">[ offline sale – synced later ]</div>' : '') + '<hr><div class="c">' + esc(R.footer || 'Thank you!') + '</div>' + (R.vatNote ? '<div class="c sm">' + esc(R.vatNote) + '</div>' : '') + '<div class="c sm mut">Powered by QuickCart</div>';
  }
  function receiptCss(paper) {
    var w = paper === '58' ? '58mm' : paper === 'a4' ? '190mm' : '80mm', fs = paper === '58' ? '10px' : paper === 'a4' ? '13px' : '11.5px';
    return '@page{size:' + (paper === 'a4' ? 'A4' : w + ' auto') + ';margin:' + (paper === 'a4' ? '10mm' : '0') + '}*{box-sizing:border-box;margin:0;padding:0}html,body{background:#fff;color:#000}body{width:' + w + ';padding:' + (paper === 'a4' ? '0' : '3mm 3mm 6mm') + ';font:' + fs + '/1.45 "Courier New",ui-monospace,Menlo,monospace;-webkit-print-color-adjust:exact}' +
      '.c{text-align:center}.big{font-size:1.5em;font-weight:700;margin-bottom:2px}.sm{font-size:.88em}.mut{color:#555}.b{font-weight:700}.r{display:flex;justify-content:space-between;gap:8px}.r span:last-child{white-space:nowrap;text-align:right}hr{border:0;border-top:1px dashed #000;margin:6px 0}.it{margin-bottom:4px}.tot{font-size:1.3em;margin:4px 0}.lg{display:block;margin:0 auto 4px;max-width:60%;max-height:48px;filter:grayscale(1)}';
  }
  function showRcpt(o) {
    var R = RCFG(); R.paper = R.paper || '80'; var inn = $('recin');
    if (inn) { inn.innerHTML = '<style>.thermal-prev{background:#fff;color:#000;padding:14px;max-width:' + (R.paper === '58' ? '240px' : '320px') + ';margin:0 auto;font-family:"Courier New",monospace;font-size:12px}' + receiptCss(R.paper).replace(/@page\{[^}]*\}|\*\{[^}]*\}|html,body\{[^}]*\}|body\{[^}]*\}/g, '').replace(/\.(c|big|sm|mut|b|r|it|tot|lg)\b/g, '.thermal-prev .$1').replace(/hr\{/g, '.thermal-prev hr{') + '</style><div class="thermal-prev">' + receiptBody(o) + '</div>'; }
    var ov = $('recov'); if (ov) ov.classList.add('open'); window.__lastReceipt = o;
    var pb = document.querySelector('.r-print'); if (pb) pb.onclick = function () { printReceipt(o); };
    if (R.autoPrint !== false && !o._noPrint) setTimeout(function () { printReceipt(o); }, 400);
  }
  window.showReceipt = showRcpt;
  function printReceipt(o) {
    o = o || window.__lastReceipt; if (!o) return; var R = RCFG(), html = '<!doctype html><html><head><meta charset="utf-8"><title>Receipt ' + esc(o.ref) + '</title><style>' + receiptCss(R.paper || '80') + '</style></head><body>' + receiptBody(o) + '</body></html>';
    var old = document.getElementById('qc-print-root'); if (old) old.remove();
    var f = document.createElement('iframe'); f.id = 'qc-print-root'; f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.appendChild(f);
    var d = f.contentWindow.document; d.open(); d.write(html); d.close();
    var go = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.__printErr = e; } logAct('Receipt printed', o.ref); setTimeout(function () { if (f.parentNode) f.remove(); }, 60000); };
    var img = d.querySelector('img'); if (img && !img.complete) img.onload = go; else setTimeout(go, 80);
  }
  window.printReceipt = printReceipt; window.__receiptHtml = function (o) { return receiptCss(RCFG().paper || '80') + '||' + receiptBody(o); };
  var _wp = window.print; window.print = function () { var ov = $('recov'); if (ov && ov.classList.contains('open') && window.__lastReceipt) return printReceipt(); return _wp.apply(window, arguments); };

  /* ════════ WRAP SALES / VOIDS / DISCOUNTS ════════ */
  function wrap(name, fn) { var o = window[name]; if (typeof o === 'function') window[name] = function () { return fn.call(this, o, arguments); }; }
  wrap('finalizeOrder', function (o, a) {
    var ord = a[0]; try { var P = window._prods || []; ord.items = (ord.items || []).map(function (i) { var p = P.filter(function (x) { return x._k === i.k; })[0]; if (p && p.isService) i.service = true; return i; }); if (ord.items.some(function (i) { return i.service; }) && ord.items.every(function (i) { return i.service; })) ord.source = ord.source === 'pos' ? 'service' : ord.source; ord.sessionId = SID || ''; var lc = window.__posCustomer; if (lc) { ord.customerName = lc.name; ord.customerPhone = lc.phone; ord.customerKey = lc.key; } } catch (e) { }
    var r = o.apply(this, a); SES.sales++; SES.total += Number(ord.total) || 0; logAct('Sale', ord.ref + ' · ' + fm(ord.total) + ' · ' + ord.payMethod, { ref: ord.ref, amount: ord.total });
    Promise.resolve(r).then(function () { beat(); loyaltyAward(ord); }); return r;
  });
  wrap('applyStock', function (o, a) { var items = (a[0] || []).filter(function (i) { return !/^svc_/.test(i.k); }), extra = []; (a[0] || []).forEach(function (i) { if (/^svc_/.test(i.k)) { var s = SERVICES.filter(function (x) { return x._k === i.k; })[0]; (s && s.consumes || []).forEach(function (c) { extra.push({ k: c.k, name: c.name, qty: c.qty * i.qty, price: 0 }); }); } }); return o.call(this, items.concat(extra)); });
  wrap('clearCart', function (o, a) { var n = (window._cart || []).length; var r = o.apply(this, a); if (n) Promise.resolve(r).then(function () { if (!(window._cart || []).length) logAct('Cart cleared', n + ' line(s) removed before payment'); }); return r; });
  wrap('applyDisc', function (o, a) { var r = o.apply(this, a); try { if (window._disc) logAct('Discount applied', fm(_disc) + ' on cart of ' + fm(typeof cartSub === 'function' ? cartSub() : 0)); } catch (e) { } return r; });
  var _pu = window.put; if (typeof _pu === 'function') window.put = function (url) { if (/\/products\/svc_/.test(url)) return Promise.resolve({ ok: true, json: function () { return Promise.resolve(null); } }); return _pu.apply(this, arguments); };

  /* loyalty: award points on sale to the customer selected at POS (if any) */
  async function loyaltyAward(o) {
    var c = window.__posCustomer; if (!c || !c.key) return;
    try { var cfg = (await api('settings/loyalty_config')) || {}, rate = Number(cfg.earnRate) || 1, mult = 1; var m = await api('settings/loyalty_members/' + c.key); if (!m) return;
      var tiers = cfg.tiers || [{ name: 'Bronze', min: 0, mult: 1 }, { name: 'Silver', min: 50000, mult: 1.25 }, { name: 'Gold', min: 200000, mult: 1.5 }, { name: 'Diamond', min: 500000, mult: 2 }]; var spent = Number(m.totalSpent || 0); tiers.forEach(function (t) { if (spent >= t.min) mult = t.mult; });
      var ev = await api('marketing/bonus_events'); Object.keys(ev || {}).forEach(function (k) { var e = ev[k], n = new Date(); if (new Date(e.from) <= n && n <= new Date(e.to + 'T23:59:59')) mult *= Number(e.mult) || 1; }); var pts = Math.floor((o.total / 100) * rate * mult * 100) / 100; pts = Math.round(pts); var hist = (m.history || []).concat([{ at: new Date().toISOString(), type: 'earn', pts: pts, ref: o.ref, amount: o.total }]).slice(-60);
      await api('settings/loyalty_members/' + c.key, 'PATCH', { points: (Number(m.points) || 0) + pts, totalSpent: spent + o.total, lastVisit: new Date().toISOString(), visits: (Number(m.visits) || 0) + 1, history: hist }); logAct('Loyalty points', c.name + ' +' + pts); } catch (e) { }
  }
  /* customer picker */
  window.pickPosCustomer = async function () {
    var m = (await api('settings/loyalty_members')) || {}, ks = Object.keys(m);
    var f = await QC.form({ title: 'Attach customer', sub: 'Pick a loyalty member to earn points on this sale.', submit: 'Attach', fields: [{ name: 'k', label: 'Customer', type: 'select', options: [{ value: '', label: 'Walk-in (none)' }].concat(ks.map(function (k) { return { value: k, label: (m[k].name || k) + ' · ' + (m[k].phone || '') + ' · ' + (m[k].points || 0) + ' pts' }; })) }] });
    if (f) { window.__posCustomer = f.k ? { key: f.k, name: m[f.k].name, phone: m[f.k].phone } : null; var gp = f.k && GROUPS[m[f.k].group]; if (gp) { F.level = gp.level || ''; F.profile = gp.profile || ''; persist(); applyPrices(); paint(); if (window.pToast) pToast('Price level set: ' + gp.name, 'ok'); } var b = $('qf-cust'); if (b) b.textContent = f.k ? '👤 ' + m[f.k].name.split(' ')[0] : '👤'; }
  };

  /* ════════ OUTLET LOCK FOR STAFF ════════ */
  async function lockOutlet() {
    if (!isStaff()) return; var n = $('cnm'); if (!n) return; var base = L.getItem('qc_full_name') || 'Cashier', o = L.getItem('qc_outlet') || '';
    n.textContent = base + (o ? ' · ' + o : ' · All outlets'); n.style.cursor = 'default'; n.title = 'Your outlet is set by the admin'; n.onclick = null;
    window.initOutlet = async function () { };
  }

  /* ════════ TOP BAR: STOCK/BOOK → FILTER ════════ */
  function topbar() {
    css(); var bs = document.querySelectorAll('.tb-btn'), done = false;
    bs.forEach(function (b) { var oc = b.getAttribute('onclick') || ''; if (/openStockModal|openSum/.test(oc)) { if (!done) { b.className = 'tb-btn qf-btn'; b.setAttribute('onclick', 'openFilter()'); b.setAttribute('title', 'Filter products'); b.innerHTML = '<span style="display:block;font-size:16px;line-height:1">⚙︎</span><span style="font-size:9px;display:block;margin-top:1px;font-weight:900">FILTER</span><span class="qf-badge" id="qf-badge"></span>'; b.firstElementChild.textContent = '☰'; done = true; } else b.remove(); } });
    var r = document.querySelector('.tb-r'); if (r && !$('qf-cust')) { var cp = document.createElement('button'); cp.className = 'tb-btn'; cp.title = 'Coupon code'; cp.setAttribute('onclick', 'applyCoupon()'); cp.textContent = '🎟'; r.insertBefore(cp, r.firstChild); var c = document.createElement('button'); c.className = 'tb-btn'; c.id = 'qf-cust'; c.title = 'Attach loyalty customer'; c.setAttribute('onclick', 'pickPosCustomer()'); c.textContent = '👤'; r.insertBefore(c, r.firstChild); }
    var sb = $('srch'); if (sb) { sb.removeAttribute('oninput'); sb.oninput = function () { F.q = sb.value; paint(); }; }
  }
  window.addEventListener('DOMContentLoaded', function () { topbar(); css(); setTimeout(function () { startSession(); lockOutlet(); }, 900); });
  /* after products load (loadProds ends by calling buildPills + renderGrid) re-merge services and re-apply prices */
  wrap('loadProds', function (o, a) { var r = o.apply(this, a); return Promise.resolve(r).then(function () { return loadAux(); }).then(function () { applyPrices(); if (typeof buildPills === 'function') buildPills(); F.cat = 'All'; paint(); }); });


  /* ════════ MANAGER PIN FOR BIG DISCOUNTS + COUPONS ════════ */
  wrap('applyDisc', function (o, a) {
    var r = o.apply(this, a);
    try { var sub = typeof cartSub === 'function' ? cartSub() : 0, pct = sub ? (window._disc / sub * 100) : 0; if (isStaff() && SEC.managerPin && pct > (Number(SEC.pinOverPct) || 15)) { var d = window._disc; window._disc = 0; if (typeof renderCart === 'function') renderCart(); QC.prompt('Manager PIN needed for a ' + Math.round(pct) + '% discount', { type: 'password' }).then(function (pin) { if (pin === String(SEC.managerPin)) { window._disc = d; renderCart(); logAct('Discount approved by manager PIN', fm(d)); } else { logAct('Discount BLOCKED (wrong PIN)', fm(d)); if (window.pToast) pToast('Wrong PIN — discount not applied', 'err'); } }); } } catch (e) { }
    return r;
  });
  window.applyCoupon = async function () {
    var code = await QC.prompt('Enter coupon code', {}); if (!code) return; code = String(code).trim().toUpperCase(); var k = Object.keys(COUPONS).filter(function (x) { return COUPONS[x].code === code; })[0], c = k && COUPONS[k], sub = cartSub(), err = '';
    if (!c || c.active === false) err = 'Invalid coupon'; else if (c.expiry && new Date(c.expiry + 'T23:59:59') < new Date()) err = 'Coupon expired'; else if (c.maxUses && (c.used || 0) >= c.maxUses) err = 'Coupon fully used'; else if (c.min && sub < c.min) err = 'Spend at least ' + fm(c.min) + ' to use this coupon';
    if (err) { logAct('Coupon rejected', code + ' — ' + err); return window.pToast ? pToast('🎟 ' + err, 'err') : alert(err); }
    window._disc = Math.min(sub, c.type === 'percent' ? Math.round(sub * c.value / 100) : c.value); window.__coupon = { id: k, code: code, used: c.used || 0 }; var dr = $('drow'); if (dr) dr.style.display = 'flex'; var cd = $('cdisc'); if (cd) cd.textContent = '−' + fm(window._disc); renderCart(); logAct('Coupon applied', code + ' ' + fm(window._disc)); if (window.pToast) pToast('🎟 ' + code + ' applied: −' + fm(window._disc), 'ok');
  };
  wrap('finalizeOrder', function (o, a) { var cp = window.__coupon; if (cp) { a[0].coupon = cp.code; a[0].couponDiscount = window._disc; api('marketing/coupons/' + cp.id, 'PATCH', { used: cp.used + 1 }); window.__coupon = null; } return o.apply(this, a); });

  /* ════════ OFFLINE MODE (auto-switch, popup, waiting bar, auto-sync) ════════ */
  var realOnLine = navigator.onLine, forced = false, popped = false, bar = null;
  try { Object.defineProperty(navigator, 'onLine', { configurable: true, get: function () { return realOnLine && !forced; } }); } catch (e) { }
  function pend() { try { return (JSON.parse(L.getItem('qc_pos_q') || '[]')).length; } catch (e) { return 0; } }
  function offCss() { if ($('qf-off-css')) return; var s = document.createElement('style'); s.id = 'qf-off-css'; s.textContent = '#qf-offbar{position:fixed;left:0;right:0;top:0;z-index:8000;background:#b45309;color:#fff;font:600 13px/1 var(--font,sans-serif);padding:9px 14px;display:none;align-items:center;gap:12px;justify-content:center}#qf-offbar.on{display:flex}#qf-offbar.sync{background:#0a7c42}#qf-offbar button{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:6px;padding:4px 10px;font:600 12px var(--font,sans-serif);cursor:pointer}body.qf-offline .tb{margin-top:34px}.qf-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px}.qf-modal>div{background:var(--s,#161616);color:var(--t,#fff);border:1px solid var(--b2,#333);border-radius:12px;max-width:420px;width:100%;padding:24px;text-align:center}.qf-modal h3{margin:8px 0;font-size:18px}.qf-modal p{color:var(--t2,#aaa);font-size:13px;line-height:1.6;margin:0 0 18px}.qf-modal button{background:#fff;color:#000;border:0;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer}'; document.head.appendChild(s); }
  function ensureBar() { if (bar) return bar; offCss(); bar = document.createElement('div'); bar.id = 'qf-offbar'; document.body.appendChild(bar); return bar; }
  function paintOff() {
    var b = ensureBar(), n = pend(), off = !navigator.onLine;
    document.body.classList.toggle('qf-offline', off || n > 0);
    if (off) { b.className = 'on'; b.innerHTML = '📡 OFFLINE MODE — selling continues · <b>' + n + '</b> sale' + (n === 1 ? '' : 's') + ' waiting to sync'; }
    else if (n > 0) { b.className = 'on sync'; b.innerHTML = '🔄 Back online — syncing <b>' + n + '</b> sale' + (n === 1 ? '' : 's') + '… <button id="qf-syncnow">Sync now</button>'; var sn = $('qf-syncnow'); if (sn) sn.onclick = function () { if (typeof syncOff === 'function') syncOff(); }; }
    else { b.className = ''; }
  }
  function offlinePopup() {
    if (popped) return; popped = true; offCss(); var m = document.createElement('div'); m.className = 'qf-modal'; m.innerHTML = '<div><div style="font-size:34px">📡</div><h3>You are offline</h3><p>QuickCart switched to <b>Offline Mode</b> automatically. Keep selling as normal — every sale is saved on this device and uploads by itself the moment the internet is back. Offline sales are marked ⚡ in your reports.</p><button id="qf-ok">Continue selling offline</button></div>'; document.body.appendChild(m); m.querySelector('#qf-ok').onclick = function () { m.remove(); }; logAct('Went offline', pend() + ' sale(s) pending');
  }
  function goOff() { realOnLine = false; offlinePopup(); paintOff(); if (typeof updConn === 'function') updConn(); }
  function goOn() { realOnLine = true; var n = pend(); popped = false; paintOff(); if (typeof updConn === 'function') updConn(); if (n && typeof syncOff === 'function') { logAct('Back online', 'syncing ' + n + ' sale(s)'); Promise.resolve(syncOff()).then(function () { paintOff(); if (!pend()) { var b = ensureBar(); b.className = 'on sync'; b.innerHTML = '✓ All offline sales synced'; setTimeout(paintOff, 3500); } }); } }
  window.addEventListener('offline', goOff); window.addEventListener('online', goOn);
  /* heartbeat: navigator.onLine can say "online" with no real internet (weak WiFi, expired data) — probe the database */
  function probe() { var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000); fetch(ns() + '/.json?shallow=true&limitToFirst=1&_=' + Date.now(), { cache: 'no-store', signal: ctl && ctl.signal }).then(function () { clearTimeout(t); if (!realOnLine || forced) { forced = false; goOn(); } else paintOff(); }).catch(function () { clearTimeout(t); if (navigator.onLine && realOnLine) { forced = true; goOff(); } }); }
  setInterval(probe, 15000); setTimeout(function () { if (!navigator.onLine) goOff(); else paintOff(); }, 1200);
  window.QCOffline = { pend: pend, paint: paintOff, simulateOffline: function () { forced = true; goOff(); }, simulateOnline: function () { forced = false; goOn(); } };
  /* queue loyalty points earned while offline; replay when online */
  var _la = loyaltyAward; loyaltyAward = async function (o) { if (!navigator.onLine) { var q = jp(L.getItem('qc_pos_lq'), []); var c = window.__posCustomer; if (c && c.key) { q.push({ o: { ref: o.ref, total: o.total }, c: c }); L.setItem('qc_pos_lq', JSON.stringify(q)); } return; } return _la(o); };
  window.addEventListener('online', function () { var q = jp(L.getItem('qc_pos_lq'), []); if (!q.length) return; L.setItem('qc_pos_lq', '[]'); q.forEach(function (x) { var prev = window.__posCustomer; window.__posCustomer = x.c; _la(x.o); window.__posCustomer = prev; }); });
  window.QCPOSV60 = { F: F, filtered: filtered, unitPrice: unitPrice, logAct: logAct, session: function () { return SID; }, printReceipt: printReceipt };
})();
} catch (e) { if (window.console) console.error("[pos-v60.js]", e); }

/* admin-pages.js — merged bundle. Contains, in this exact load order: admin-products.js, admin-orders.js, admin-inventory.js, admin-count.js. */

/* ═══ admin-products.js ═══ */
try {
/* QuickCart admin — Products page upgrade (loaded after admin.html's own script; overrides its product functions).
   Fixes: images/barcode/SKU/cost/description/unit/VAT/reorder were never saved.
   Adds: image compression, barcode generate/scan/preview/labels, smart import wizard, richer list. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var NS = function () { return getUserNS(); };
  var money = function (n) { return '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG'); };
  var H = { 'Content-Type': 'application/json' };
  function lazy(src, test) { return new Promise(function (res, rej) { if (test()) return res(); var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src.split('/').pop() + ' — check your internet')); }; document.head.appendChild(s); }); }
  var loadBarcodeLib = function () { return lazy('https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js', function () { return window.JsBarcode; }); };
  var loadSheetJS = function () { return lazy('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', function () { return window.XLSX; }); };

  var css = document.createElement('style');
  css.textContent = '.pimg-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:6px}.pimg{aspect-ratio:1;border:1px solid var(--border);border-radius:12px;overflow:hidden;position:relative;background:var(--grey1)}.pimg img{width:100%;height:100%;object-fit:cover}.pimg .x{position:absolute;top:4px;right:4px;background:rgba(0,0,0,.72);color:#fff;border:none;width:22px;height:22px;border-radius:50%;font-size:13px;cursor:pointer;line-height:1}.pimg .main{position:absolute;left:4px;bottom:4px;background:var(--accent);color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px}.pimg .mk{position:absolute;left:4px;bottom:4px;background:rgba(0,0,0,.6);color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;border:none;cursor:pointer}'
    + '.bc-row{display:flex;gap:6px}.bc-row input{flex:1}.bc-row button{white-space:nowrap}#bc-prev{margin-top:6px;max-height:70px}'
    + '.stk{font-size:10px;font-weight:800;padding:3px 9px;border-radius:99px;display:inline-block}.stk.ok{background:rgba(10,157,107,.12);color:#0a9d6b}.stk.low{background:rgba(245,158,11,.16);color:#b45309}.stk.out{background:rgba(214,51,108,.12);color:#d6336c}.stk.na{background:var(--grey1);color:var(--ink3)}'
    + '.pf-bar{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 12px}.pf-bar select,.pf-bar input{padding:8px 11px;border:1px solid var(--border);border-radius:10px;font-size:12px;background:#fff}'
    + '.pg-bar{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;font-size:12px;color:var(--ink3)}'
    + '#imp-bg{position:fixed;inset:0;background:rgba(20,18,26,.55);backdrop-filter:blur(6px);z-index:9000;display:none;align-items:center;justify-content:center;padding:14px}#imp-bg.on{display:flex}'
    + '#imp-box{background:#fff;border-radius:22px;width:860px;max-width:100%;max-height:94vh;overflow:auto;box-shadow:0 30px 80px rgba(20,18,26,.3)}'
    + '.imp-hd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}.imp-hd h3{font-size:18px;font-weight:800;letter-spacing:-.02em;margin:0}.imp-bd{padding:20px 22px}'
    + '.drop{border:2px dashed var(--border);border-radius:18px;padding:34px 20px;text-align:center;cursor:pointer;transition:.2s;background:var(--grey1)}.drop:hover,.drop.over{border-color:var(--accent);background:rgba(23,23,23,.05)}.drop b{display:block;font-size:15px;margin:6px 0 4px}.drop small{color:var(--ink3);font-size:12px}'
    + '.fmt-badge{display:inline-block;background:rgba(10,157,107,.12);color:#0a9d6b;font-weight:800;font-size:11px;padding:4px 12px;border-radius:99px}'
    + '.map-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.map-grid label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);display:block;margin-bottom:4px}.map-grid select{width:100%;padding:8px;border:1px solid var(--border);border-radius:10px;font-size:12px}.map-grid .auto select{border-color:rgba(10,157,107,.5);background:rgba(10,157,107,.05)}'
    + '.imp-tbl{width:100%;border-collapse:collapse;font-size:11px}.imp-tbl th,.imp-tbl td{padding:7px 9px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}.imp-tbl th{background:var(--grey1);font-size:10px;text-transform:uppercase;letter-spacing:.05em}'
    + '.imp-issues{max-height:110px;overflow:auto;font-size:11px;background:#fff8f0;border:1px solid #fde1c8;border-radius:12px;padding:10px 12px;margin:10px 0;line-height:1.7}'
    + '.imp-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.imp-opts select,.imp-opts input{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font-size:12px}.imp-opts label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);display:block;margin-bottom:4px}'
    + '@media(max-width:700px){.pimg-grid{grid-template-columns:repeat(3,1fr)}.map-grid,.imp-opts{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(css);

  /* ══════════ IMAGES ══════════ */
  var IMG = []; // ordered list of data-URLs / http URLs, first = main
  function compress(file, maxW, q) {
    return new Promise(function (res, rej) {
      var rd = new FileReader();
      rd.onerror = function () { rej(new Error('Could not read image')); };
      rd.onload = function (e) { var im = new Image(); im.onerror = function () { rej(new Error('Not a valid image: ' + file.name)); }; im.onload = function () { res(scale(im, maxW, q)); }; im.src = e.target.result; };
      rd.readAsDataURL(file);
    });
  }
  function scale(im, maxW, q) {
    var r = Math.min(1, maxW / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * r)), h = Math.max(1, Math.round(im.height * r)), c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h); return c.toDataURL('image/jpeg', q);
  }
  function thumbOf(src, maxW, q) { return new Promise(function (res) { if (!/^data:/.test(src)) return res(src); var im = new Image(); im.onload = function () { res(scale(im, maxW, q)); }; im.onerror = function () { res(src); }; im.src = src; }); }
  function renderImgs() {
    var g = $('img-preview-grid'); if (!g) return; g.className = 'pimg-grid';
    g.innerHTML = IMG.map(function (u, i) { return '<div class="pimg"><img src="' + esc(u) + '" alt="">' + '<button class="x" onclick="removeProductImage(' + i + ')">×</button>' + (i === 0 ? '<span class="main">MAIN</span>' : '<button class="mk" onclick="makeMainImage(' + i + ')">Make main</button>') + '</div>'; }).join('')
      + (IMG.length < 5 ? '<div id="img-upload-btn" onclick="document.getElementById(\'f-img-file\').click()" style="aspect-ratio:1;border:2px dashed var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--grey1);flex-direction:column;gap:4px"><span style="font-size:24px">📷</span><span style="font-size:10px;font-weight:600;color:var(--ink3)">Add image</span></div>' : '');
  }
  window.handleProductImages = async function (input) {
    var files = Array.from(input.files || []).slice(0, 5 - IMG.length); input.value = '';
    for (var i = 0; i < files.length; i++) { try { IMG.push(await compress(files[i], 900, 0.82)); } catch (e) { toast('⚠️ ' + e.message); } }
    var u = $('f-img'); if (u) u.value = ''; renderImgs();
  };
  window.removeProductImage = function (i) { IMG.splice(i, 1); renderImgs(); };
  window.makeMainImage = function (i) { var x = IMG.splice(i, 1)[0]; IMG.unshift(x); renderImgs(); };

  /* ══════════ BARCODE ══════════ */
  function ean13(prefix) { var d = (prefix || '200') + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'); d = d.slice(0, 12); var s = 0; for (var i = 0; i < 12; i++) s += Number(d[i]) * (i % 2 ? 3 : 1); return d + ((10 - s % 10) % 10); }
  function taken(code, selfKey) { code = String(code || '').trim(); return code && Object.keys(prods).some(function (k) { return k !== selfKey && String(prods[k].barcode || '').trim() === code; }); }
  window.genBarcode = function () { var self = $('f-eid').value, c, n = 0; do { c = ean13('200'); n++; } while (taken(c, self) && n < 50); $('f-barcode').value = c; previewBarcode(); toast('Barcode generated — print the label from the list'); };
  window.previewBarcode = async function () {
    var v = ($('f-barcode').value || '').trim(), svg = $('bc-prev'); if (!svg) return; if (!v) { svg.innerHTML = ''; return; }
    try { await loadBarcodeLib(); var fmt = /^\d{13}$/.test(v) ? 'EAN13' : /^\d{8}$/.test(v) ? 'EAN8' : /^\d{12}$/.test(v) ? 'UPC' : 'CODE128'; try { JsBarcode(svg, v, { format: fmt, height: 44, fontSize: 12, margin: 0, width: 1.6 }); } catch (e) { JsBarcode(svg, v, { format: 'CODE128', height: 44, fontSize: 12, margin: 0, width: 1.6 }); } } catch (e) { svg.innerHTML = ''; }
  };
  var CAM = {};
  window.scanBarcodeInto = async function (targetId) {
    var m = $('adm-scan'); if (!m) { m = document.createElement('div'); m.id = 'adm-scan'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9500;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px'; document.body.appendChild(m); }
    m.innerHTML = '<video id="adm-scan-v" playsinline muted style="width:min(480px,92vw);border-radius:16px;background:#000"></video><div id="adm-scan-m" style="color:#fff;font-size:13px">Starting camera…</div><button onclick="closeAdmScan()" style="padding:10px 22px;border-radius:99px;border:none;font-weight:800">Cancel</button>'; m.style.display = 'flex';
    try {
      CAM.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }); var v = $('adm-scan-v'); v.srcObject = CAM.stream; await v.play();
      var hit = function (code) { $(targetId).value = code; closeAdmScan(); if (targetId === 'f-barcode') previewBarcode(); toast('✓ Scanned ' + code); };
      if ('BarcodeDetector' in window) { var d = new BarcodeDetector(); CAM.t = setInterval(async function () { try { var r = await d.detect(v); if (r[0]) hit(r[0].rawValue); } catch (e) {} }, 220); $('adm-scan-m').textContent = 'Hold the barcode in view'; }
      else { await lazy('https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js', function () { return window.ZXing; }); var rd = new ZXing.BrowserMultiFormatReader(); CAM.zx = rd; CAM.t = setInterval(async function () { try { var r = await rd.decodeFromVideoElement(v); if (r) hit(r.getText()); } catch (e) {} }, 300); $('adm-scan-m').textContent = 'Hold the barcode in view'; }
    } catch (e) { $('adm-scan-m').textContent = 'Camera unavailable: ' + (e.message || e.name) + '. A USB scanner works by clicking the barcode box and scanning.'; }
  };
  window.closeAdmScan = function () { clearInterval(CAM.t); if (CAM.zx) { try { CAM.zx.reset(); } catch (e) {} CAM.zx = null; } if (CAM.stream) { CAM.stream.getTracks().forEach(function (t) { t.stop(); }); CAM.stream = null; } var m = $('adm-scan'); if (m) m.style.display = 'none'; };

  window.printLabels = async function (keys) {
    keys = keys && keys.length ? keys : Array.from(selectedIds);
    if (!keys.length) { toast('Tick the products you want labels for'); return; }
    var qty = Number(await QC.prompt('How many labels per product?', { title: 'Print labels', type: 'number', value: 1, required: true, ok: 'Print' })) || 0; if (!qty) return;
    try { await loadBarcodeLib(); } catch (e) { toast('❌ ' + e.message); return; }
    var cells = [];
    keys.forEach(function (k) {
      var p = prods[k]; if (!p) return; var code = String(p.barcode || p.sku || '').trim(); if (!code) return;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); var f = /^\d{13}$/.test(code) ? 'EAN13' : /^\d{8}$/.test(code) ? 'EAN8' : /^\d{12}$/.test(code) ? 'UPC' : 'CODE128';
      try { JsBarcode(svg, code, { format: f, height: 36, fontSize: 11, margin: 0, width: 1.5 }); } catch (e) { try { JsBarcode(svg, code, { format: 'CODE128', height: 36, fontSize: 11, margin: 0, width: 1.5 }); } catch (e2) { return; } }
      for (var i = 0; i < qty; i++) cells.push('<div class="l"><div class="n">' + esc((p.name || '').slice(0, 34)) + '</div>' + svg.outerHTML + '<div class="p">' + money(p.price) + '</div></div>');
    });
    if (!cells.length) { toast('None of the selected products has a barcode or SKU'); return; }
    var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print labels'); return; }
    w.document.write('<!doctype html><title>Labels</title><style>body{margin:0;font-family:Arial,sans-serif}.wrap{display:flex;flex-wrap:wrap}.l{width:50mm;height:30mm;box-sizing:border-box;padding:2mm;text-align:center;border:1px dashed #ccc;overflow:hidden;page-break-inside:avoid}.n{font-size:8pt;font-weight:700;line-height:1.1;height:9mm;overflow:hidden}.l svg{max-width:100%;height:12mm}.p{font-size:11pt;font-weight:800}@media print{.l{border:none}}</style><div class="wrap">' + cells.join('') + '</div><script>setTimeout(function(){print()},400)<\/script>'); w.document.close();
  };

  /* ══════════ SAVE / EDIT ══════════ */
  var V = function (id) { var e = $(id); return e ? e.value : ''; };
  var SELF_FIELDS = ['f-name', 'f-brand', 'f-sku', 'f-price', 'f-cost', 'f-orig', 'f-qty', 'f-reorder', 'f-barcode', 'f-desc', 'f-url', 'f-img', 'f-eid'];
  window.saveDeal = async function () {
    var name = V('f-name').trim(), brand = V('f-brand').trim(), cat = V('f-cat'), price = Number(V('f-price')), eid = V('f-eid'), store = V('f-store') || 'My Store';
    if (!name || !cat || !(price >= 0) || V('f-price') === '') { toast('⚠️ Fill Name, Category and Selling Price'); return; }
    var barcode = V('f-barcode').trim(), sku = V('f-sku').trim();
    if (barcode && taken(barcode, eid)) { toast('⚠️ Another product already uses barcode ' + barcode); $('f-barcode').focus(); return; }
    var btn = document.querySelector('#p-deals .acts .btn-orange'); if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      var url = V('f-url').trim(), inRaw = V('f-instock') || 'true', qty = Math.max(0, Math.round(Number(V('f-qty')) || 0));
      var id = eid || (NS_slug(name) + '-' + Math.random().toString(36).slice(2, 6));
      var list = IMG.slice(), main = list[0] || V('f-img').trim() || '';
      if (/^\[multiple/.test(main)) main = '';
      var thumb = main ? await thumbOf(main, 520, 0.74) : '';
      var prev = eid ? (prods[eid] || {}) : {};
      var rec = Object.assign({}, prev, {
        name: name, brand: brand, category: cat, subcategory: V('f-sub') || '', price: price, originalPrice: Number(V('f-orig')) || null, cost: Number(V('f-cost')) || 0,
        store: store, storeUrl: (typeof applyAffiliateTag === 'function' ? applyAffiliateTag(url, store) : url) || url, quantity: qty,
        inStock: inRaw === 'true' ? true : inRaw === 'reserve' ? 'reserve' : inRaw === 'service' ? 'service' : false,
        image: thumb, hasGallery: list.filter(function (u) { return /^data:/.test(u); }).length > 1 || undefined, tag: V('f-tag'), sponsored: V('f-sponsored') === '1' || undefined,
        sku: sku, barcode: barcode, description: V('f-desc').trim(), unit: V('f-unit') || 'piece', reorderPoint: Number(V('f-reorder')) || 0, vat: Number(V('f-vat')) || 0, priceLevel: V('f-pricelevel') || '',
        lastUpdated: new Date().toISOString()
      });
      if (!eid) rec.createdAt = rec.lastUpdated;
      Object.keys(rec).forEach(function (k) { if (rec[k] === undefined) delete rec[k]; });
      var r = await fetch(DB + '/' + id + '.json', { method: 'PUT', headers: H, body: JSON.stringify(rec) });
      if (!r.ok) throw new Error('Database refused the save (' + r.status + ')');
      // extra photos live in their own node so the product list stays fast
      var gal = list.filter(function (u) { return /^data:/.test(u); });
      if (gal.length > 1 || (eid && prev.hasGallery)) { await fetch(NS() + '/product_gallery/' + id + '.json', { method: gal.length > 1 ? 'PUT' : 'DELETE', headers: H, body: gal.length > 1 ? JSON.stringify(list) : undefined }); }
      prods[id] = rec; toast(eid ? '✅ Product updated — live in POS & Store' : '✅ Product added — live in POS & Store'); clearForm(); loadProds();
    } catch (e) { toast('❌ ' + (e.message || 'Save failed. Check connection.')); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '💾 Save Product → Sync to POS & Store'; } }
  };
  function NS_slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item'; }
  window.clearForm = function () {
    SELF_FIELDS.forEach(function (i) { var e = $(i); if (e) e.value = ''; });
    ['f-cat', 'f-tag', 'f-pricelevel', 'f-sponsored'].forEach(function (i) { var e = $(i); if (e) e.value = ''; });
    if ($('f-store')) $('f-store').value = 'My Store'; if ($('f-instock')) $('f-instock').value = 'true'; if ($('f-unit')) $('f-unit').value = 'piece'; if ($('f-vat')) $('f-vat').value = '0';
    if (window.qcFillSubs) window.qcFillSubs('', '');
    IMG = []; renderImgs(); previewBarcode(); $('ftitle').textContent = 'Add New Product';
  };
  window.editProd = async function (k) {
    var p = prods[k]; if (!p) return;
    var set = function (id, v) { var e = $(id); if (e) e.value = v == null ? '' : v; };
    set('f-name', p.name); set('f-brand', p.brand); set('f-sku', p.sku); set('f-price', p.price); set('f-cost', p.cost || ''); set('f-orig', p.originalPrice || ''); set('f-qty', p.quantity != null ? p.quantity : ''); set('f-reorder', p.reorderPoint || ''); set('f-barcode', p.barcode); set('f-desc', p.description);
    set('f-url', p.storeUrl); set('f-store', p.store || 'My Store'); set('f-tag', p.tag); set('f-sponsored', p.sponsored ? '1' : ''); set('f-unit', p.unit || 'piece'); set('f-vat', p.vat || 0); set('f-pricelevel', p.priceLevel); set('f-eid', k);
    var cs = $('f-cat'); if (cs && p.category && !Array.from(cs.options).some(function (o) { return o.value === p.category; })) { cs.add(new Option(p.category, p.category)); } set('f-cat', p.category); if (window.qcFillSubs) window.qcFillSubs(p.category, p.subcategory);
    set('f-instock', p.inStock === true ? 'true' : p.inStock === 'reserve' ? 'reserve' : p.inStock === 'service' ? 'service' : 'affiliate');
    IMG = p.image ? [p.image] : []; set('f-img', /^https?:/.test(p.image || '') ? p.image : ''); renderImgs(); previewBarcode();
    if (p.hasGallery) { try { var g = await (await fetch(NS() + '/product_gallery/' + k + '.json')).json(); if (Array.isArray(g) && g.length) { IMG = g; renderImgs(); } } catch (e) {} }
    $('ftitle').textContent = 'Edit: ' + p.name; $('p-deals').scrollIntoView({ behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); toast('Editing: ' + p.name);
  };
  window.delProd = async function (k) {
    if (!await QC.confirm('Delete "' + (prods[k] && prods[k].name) + '"?', { title: 'Delete product', ok: 'Delete', danger: true })) return;
    await fetch(DB + '/' + k + '.json', { method: 'DELETE' }); await fetch(NS() + '/product_gallery/' + k + '.json', { method: 'DELETE' }).catch(function () {}); toast('Deleted'); loadProds();
  };

  /* ══════════ LIST ══════════ */
  var PG = { page: 1, size: 50, cat: '', stock: '', sort: 'new' };
  function stockState(p) { var q = Number(p.quantity) || 0, rp = Number(p.reorderPoint) || 0; if (p.inStock === 'service' || p.inStock === false && !q && p.storeUrl) return ['na', 'n/a']; if (q <= 0) return ['out', 'Out']; if (rp && q <= rp) return ['low', 'Low · ' + q]; return ['ok', q + '']; }
  window.renderProds = function (data) {
    var all = Object.keys(data || {}), q = (V('psearch') || '').toLowerCase().trim();
    var keys = all.filter(function (k) {
      var p = data[k]; if (PG.cat && p.category !== PG.cat) return false;
      var st = stockState(p)[0]; if (PG.stock && PG.stock !== st) return false;
      if (q && ((p.name || '') + ' ' + (p.brand || '') + ' ' + (p.category || '') + ' ' + (p.sku || '') + ' ' + (p.barcode || '')).toLowerCase().indexOf(q) < 0) return false; return true;
    });
    keys.sort(function (a, b) { var A = data[a], B = data[b]; if (PG.sort === 'name') return (A.name || '').localeCompare(B.name || ''); if (PG.sort === 'stock') return (Number(A.quantity) || 0) - (Number(B.quantity) || 0); if (PG.sort === 'price') return (Number(B.price) || 0) - (Number(A.price) || 0); return String(B.lastUpdated || '').localeCompare(String(A.lastUpdated || '')); });
    $('pcnt').textContent = all.length; updateSelCount();
    var pages = Math.max(1, Math.ceil(keys.length / PG.size)); if (PG.page > pages) PG.page = pages; var slice = keys.slice((PG.page - 1) * PG.size, PG.page * PG.size);
    // filter bar (built once)
    if (!$('pf-bar')) { var bar = document.createElement('div'); bar.id = 'pf-bar'; bar.className = 'pf-bar'; var tc = document.querySelector('#p-deals .tbl-controls'); tc.parentNode.insertBefore(bar, tc); }
    var cats = {}; all.forEach(function (k) { cats[data[k].category || 'Uncategorised'] = 1; });
    $('pf-bar').innerHTML = '<select onchange="PGset(\'cat\',this.value)"><option value="">All categories</option>' + Object.keys(cats).sort().map(function (c) { return '<option ' + (PG.cat === c ? 'selected' : '') + ' value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('') + '</select>'
      + '<select onchange="PGset(\'stock\',this.value)"><option value="">Any stock</option><option value="ok"' + (PG.stock === 'ok' ? ' selected' : '') + '>In stock</option><option value="low"' + (PG.stock === 'low' ? ' selected' : '') + '>Low stock</option><option value="out"' + (PG.stock === 'out' ? ' selected' : '') + '>Out of stock</option></select>'
      + '<select onchange="PGset(\'sort\',this.value)"><option value="new">Newest</option><option value="name"' + (PG.sort === 'name' ? ' selected' : '') + '>Name A–Z</option><option value="stock"' + (PG.sort === 'stock' ? ' selected' : '') + '>Lowest stock</option><option value="price"' + (PG.sort === 'price' ? ' selected' : '') + '>Highest price</option></select>'
      + '<button class="btn btn-grey btn-sm" onclick="printLabels()">🏷 Print barcode labels</button>';
    var th = document.querySelector('#p-deals table thead tr'); if (th) th.innerHTML = '<th style="width:36px"></th><th>Img</th><th>Product</th><th>SKU / Barcode</th><th>Category</th><th>Price</th><th>Margin</th><th>Stock</th><th>Actions</th>';
    $('prod-tb').innerHTML = !slice.length ? '<tr class="empty-row"><td colspan="9">' + (all.length ? 'No products match your filters' : 'No products yet — add one above or import your list.') + '</td></tr>' :
      slice.map(function (k) {
        var p = data[k], base = Number(p.price) || 0, cost = Number(p.cost) || 0, mg = cost && base ? Math.round((base - cost) / base * 100) : null, st = stockState(p);
        return '<tr id="row_' + k + '" class="' + (selectedIds.has(k) ? 'selected' : '') + '"><td style="width:36px;text-align:center"><input type="checkbox" class="row-chk" data-id="' + k + '" ' + (selectedIds.has(k) ? 'checked' : '') + ' onchange="toggleRow(this)"></td>'
          + '<td>' + (p.image ? '<img class="td-img" src="' + esc(p.image) + '" loading="lazy" onerror="this.style.display=\'none\'">' : CE(p.category)) + '</td>'
          + '<td><strong style="font-size:12px">' + esc(p.name) + '</strong>' + (p.tag ? '<span class="bdg" style="background:var(--grey1);color:#555;margin-left:5px">' + esc(p.tag) + '</span>' : '') + '<div style="font-size:10px;color:var(--ink3)">' + esc(p.brand || '') + '</div></td>'
          + '<td style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--ink3)">' + esc(p.sku || '—') + '<br>' + esc(p.barcode || '') + '</td><td style="font-size:11px;color:var(--ink3)">' + esc(p.category || '—') + '</td>'
          + '<td style="font-weight:700;font-family:\'DM Mono\',monospace;font-size:11px">' + money(base) + (p.originalPrice > base ? '<br><s style="color:var(--ink4);font-weight:400">' + money(p.originalPrice) + '</s>' : '') + '</td>'
          + '<td style="font-size:11px;font-weight:700;color:' + (mg == null ? 'var(--ink4)' : mg < 10 ? '#d6336c' : '#0a9d6b') + '">' + (mg == null ? '—' : mg + '%') + '</td>'
          + '<td><span class="stk ' + st[0] + '">' + st[1] + '</span></td>'
          + '<td style="display:flex;gap:4px"><button class="btn btn-grey btn-sm" onclick="editProd(\'' + k + '\')">Edit</button><button class="btn btn-red btn-sm" onclick="delProd(\'' + k + '\')">Del</button></td></tr>';
      }).join('');
    var pb = $('pg-bar'); if (!pb) { pb = document.createElement('div'); pb.id = 'pg-bar'; pb.className = 'pg-bar'; $('prod-tb').closest('.box').appendChild(pb); }
    pb.innerHTML = '<span>' + keys.length + ' product' + (keys.length === 1 ? '' : 's') + (keys.length !== all.length ? ' (filtered)' : '') + '</span><span><button class="btn btn-grey btn-sm" ' + (PG.page <= 1 ? 'disabled' : '') + ' onclick="PGgo(-1)">‹ Prev</button> &nbsp;Page ' + PG.page + ' of ' + pages + '&nbsp; <button class="btn btn-grey btn-sm" ' + (PG.page >= pages ? 'disabled' : '') + ' onclick="PGgo(1)">Next ›</button></span>';
  };
  window.PGset = function (k, v) { PG[k] = v; PG.page = 1; renderProds(prods); };
  window.PGgo = function (d) { PG.page += d; renderProds(prods); };
  window.filterProds = function () { PG.page = 1; renderProds(prods); };

  /* ══════════ IMPORT WIZARD ══════════ */
  var IM = { a: null, map: null, fileName: '' };
  function modal() {
    var bg = $('imp-bg'); if (bg) return bg; bg = document.createElement('div'); bg.id = 'imp-bg'; bg.onclick = function (e) { if (e.target === bg) closeImport(); }; bg.innerHTML = '<div id="imp-box"></div>'; document.body.appendChild(bg); return bg;
  }
  window.openImport = function (prefillText) {
    modal().classList.add('on'); IM.a = null;
    $('imp-box').innerHTML = '<div class="imp-hd"><div><h3>📥 Import products</h3><div style="font-size:12px;color:var(--ink3);margin-top:3px">Drop your existing list in <b>any format</b> — we detect it and arrange the columns for you.</div></div><button class="btn btn-grey btn-sm" onclick="closeImport()">✕</button></div>'
      + '<div class="imp-bd"><div class="drop" id="imp-drop" onclick="document.getElementById(\'imp-file\').click()"><div style="font-size:34px">📄</div><b>Drop a file here or click to choose</b><small>CSV · Excel (.xlsx/.xls) · JSON · TSV · text — from Excel, Google Sheets, another POS, Shopify, anything</small></div>'
      + '<input type="file" id="imp-file" accept=".csv,.tsv,.txt,.json,.xlsx,.xls,.xlsm,.ods" style="display:none" onchange="impFile(this.files[0])">'
      + '<div style="text-align:center;margin:14px 0;font-size:11px;color:var(--ink4);font-weight:700;letter-spacing:.1em">OR PASTE</div>'
      + '<textarea id="imp-paste" rows="5" placeholder="Paste rows copied from Excel / Google Sheets, CSV text, or JSON…" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:14px;font-family:\'DM Mono\',monospace;font-size:11px">' + esc(prefillText || '') + '</textarea>'
      + '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-orange" onclick="impPaste()">Detect &amp; preview →</button><button class="btn btn-grey" onclick="downloadProductTemplate()">⬇ Download sample template</button></div></div>';
    var d = $('imp-drop');
    ['dragover', 'dragenter'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
    d.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) impFile(f); });
  };
  window.closeImport = function () { var b = $('imp-bg'); if (b) b.classList.remove('on'); };
  window.importProductsFile = function (input) { var f = input.files && input.files[0]; input.value = ''; openImport(); if (f) impFile(f); };
  window.openBulkPasteModal = function () { openImport(); };
  window.impPaste = function () { var t = $('imp-paste').value; if (!t.trim()) { toast('Paste something first'); return; } IM.fileName = 'pasted data'; analyse({ text: t }); };
  window.impFile = async function (f) {
    if (!f) return; IM.fileName = f.name; var ext = (f.name.split('.').pop() || '').toLowerCase();
    try {
      if (/^(xlsx|xls|xlsm|ods)$/.test(ext)) {
        $('imp-box').querySelector('.imp-bd').insertAdjacentHTML('afterbegin', '<div style="font-size:12px;color:var(--ink3);margin-bottom:8px">Reading spreadsheet…</div>');
        await loadSheetJS(); var wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }), best = null, bn = -1;
        wb.SheetNames.forEach(function (n) { var rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }); var c = rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); }).length; if (c > bn) { bn = c; best = rows; } });
        analyse({ rows: (best || []).map(function (r) { return r.map(function (x) { return typeof x === 'number' ? (Number.isInteger(x) ? String(x) : String(x)) : String(x == null ? '' : x); }); }), format: 'Excel (' + ext.toUpperCase() + ')' });
      } else analyse({ text: await f.text() });
    } catch (e) { toast('❌ Could not read file: ' + e.message); }
  };
  function analyse(input) {
    var a = QCImport.analyse(input); if (a.error) { toast('⚠️ ' + a.error); return; }
    IM.a = a; IM.map = Object.assign({}, a.map); renderPreview();
  }
  function renderPreview() {
    var a = IM.a, built = QCImport.build(a, IM.map, { defaultCategory: ($('imp-defcat') || {}).value || '' }), P = built.products;
    var opts = function (sel) { return '<option value="">— not in file —</option>' + a.headers.map(function (h, i) { return '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + esc(h || 'Column ' + (i + 1)) + '</option>'; }).join(''); };
    var existing = Object.keys(prods).length;
    var upd = 0; P.forEach(function (p) { if (QCImport.matchExisting(p, prods)) upd++; });
    $('imp-box').innerHTML = '<div class="imp-hd"><div><h3>📥 Review import</h3><div style="font-size:12px;color:var(--ink3);margin-top:4px"><span class="fmt-badge">' + esc(a.format) + '</span> &nbsp;' + esc(IM.fileName) + ' · ' + a.total + ' rows · ' + (a.hasHeader ? 'header row found' : 'no header — columns guessed from the data') + '</div></div><button class="btn btn-grey btn-sm" onclick="closeImport()">✕</button></div>'
      + '<div class="imp-bd">' + (a.warn ? '<div class="imp-issues">⚠️ ' + esc(a.warn) + '</div>' : '')
      + '<div style="font-size:12px;font-weight:800;margin-bottom:2px">Column mapping <span style="font-weight:500;color:var(--ink3)">— green = detected automatically, change if wrong</span></div><div class="map-grid">'
      + QCImport.FIELDS.map(function (f) { var sel = IM.map[f] != null ? IM.map[f] : null; return '<div class="' + (sel != null ? 'auto' : '') + '"><label>' + QCImport.LABELS[f] + (f === 'name' ? ' *' : '') + '</label><select onchange="impMap(\'' + f + '\',this.value)">' + opts(sel) + '</select></div>'; }).join('') + '</div>'
      + '<div style="font-size:12px;font-weight:800;margin:14px 0 6px">Preview (first 6 of ' + P.length + ' products)</div><div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px"><table class="imp-tbl"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Cost</th><th>Qty</th><th>SKU</th><th>Barcode</th></tr></thead><tbody>'
      + P.slice(0, 6).map(function (p) { return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.category) + '</td><td>' + money(p.price) + '</td><td>' + (p.cost ? money(p.cost) : '—') + '</td><td>' + p.quantity + '</td><td>' + esc(p.sku || '—') + '</td><td>' + esc(p.barcode || '—') + '</td></tr>'; }).join('') + '</tbody></table></div>'
      + (built.issues.length ? '<div class="imp-issues"><b>' + built.issues.length + ' note' + (built.issues.length > 1 ? 's' : '') + ':</b><br>' + built.issues.slice(0, 40).map(function (i) { return 'Row ' + i.row + ': ' + esc(i.msg); }).join('<br>') + '</div>' : '')
      + '<div class="imp-opts"><div><label>If the product already exists (' + upd + ' match)</label><select id="imp-dup"><option value="update">Update it (match barcode → SKU → name)</option><option value="skip">Skip it</option><option value="new">Create a duplicate anyway</option></select></div>'
      + '<div><label>Stock quantity</label><select id="imp-qtymode"><option value="set">Set stock to the quantity in file</option><option value="add">Add file quantity to current stock</option><option value="keep">Keep current stock (don’t touch)</option></select></div>'
      + '<div><label>Default category (when missing)</label><input id="imp-defcat" value="' + esc(($('imp-defcat') || {}).value || '') + '" placeholder="e.g. General" onchange="renderImpPreview()"></div><div><label>Sell on</label><select id="imp-store"><option value="My Store">My Store (POS + online)</option></select></div></div>'
      + '<div id="imp-prog" style="display:none;margin-bottom:10px"><div style="height:8px;background:var(--grey1);border-radius:99px;overflow:hidden"><div id="imp-bar" style="height:100%;width:0;background:linear-gradient(90deg,var(--accent),#333);transition:.2s"></div></div><div id="imp-ptxt" style="font-size:11px;color:var(--ink3);margin-top:5px"></div></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-orange" id="imp-go" onclick="runImport()"' + (P.length ? '' : ' disabled') + '>Import ' + P.length + ' product' + (P.length === 1 ? '' : 's') + '</button><button class="btn btn-grey" onclick="openImport()">← Back</button></div>'
      + '<p style="font-size:11px;color:var(--ink3);margin-top:12px">You can edit any product afterwards to add images, descriptions and more.</p></div>';
  }
  window.renderImpPreview = renderPreview;
  window.impMap = function (f, v) { if (v === '') delete IM.map[f]; else { var n = Number(v); Object.keys(IM.map).forEach(function (k) { if (IM.map[k] === n && k !== f) delete IM.map[k]; }); IM.map[f] = n; } var dc = ($('imp-defcat') || {}).value; renderPreview(); if ($('imp-defcat')) $('imp-defcat').value = dc || ''; };
  window.runImport = async function () {
    var dup = V('imp-dup') || 'update', qm = V('imp-qtymode') || 'set', built = QCImport.build(IM.a, IM.map, { defaultCategory: V('imp-defcat') });
    var P = built.products; if (!P.length) return; $('imp-go').disabled = true; $('imp-prog').style.display = 'block';
    var takenIds = {}; Object.keys(prods).forEach(function (k) { takenIds[k] = 1; });
    var writes = {}, added = 0, updated = 0, skipped = 0, now = new Date().toISOString();
    P.forEach(function (p) {
      var row = Object.assign({}, p); delete row._row; row.store = V('imp-store') || 'My Store'; row.inStock = true; row.lastUpdated = now;
      var ex = dup === 'new' ? null : QCImport.matchExisting(p, Object.assign({}, prods, writes));
      if (ex) {
        if (dup === 'skip') { skipped++; return; }
        var old = writes[ex] || prods[ex] || {}, rec = Object.assign({}, old);
        Object.keys(row).forEach(function (k) { if (row[k] !== '' && row[k] != null && !(k === 'price' && !row[k])) rec[k] = row[k]; });
        if (qm === 'keep') rec.quantity = old.quantity || 0; else if (qm === 'add') rec.quantity = (Number(old.quantity) || 0) + (Number(p.quantity) || 0);
        if (old.image && !row.image) rec.image = old.image; writes[ex] = rec; updated++;
      } else { row.createdAt = now; if (qm === 'keep') row.quantity = 0; writes[QCImport.newId(p, takenIds)] = row; added++; }
    });
    var ids = Object.keys(writes), CH = 80, done = 0;
    try {
      for (var i = 0; i < ids.length; i += CH) {
        var chunk = {}; ids.slice(i, i + CH).forEach(function (k) { chunk[k] = writes[k]; });
        var r = await fetch(DB + '.json', { method: 'PATCH', headers: H, body: JSON.stringify(chunk) }); if (!r.ok) throw new Error('Database refused a batch (' + r.status + ')');
        done += Object.keys(chunk).length; $('imp-bar').style.width = Math.round(done / ids.length * 100) + '%'; $('imp-ptxt').textContent = done + ' / ' + ids.length + ' saved…';
      }
      Object.assign(prods, writes);
      $('imp-box').innerHTML = '<div class="imp-hd"><h3>✅ Import complete</h3><button class="btn btn-grey btn-sm" onclick="closeImport()">✕</button></div><div class="imp-bd" style="text-align:center;padding:36px"><div style="font-size:46px">🎉</div><div style="font-size:22px;font-weight:800;margin:8px 0">' + added + ' added · ' + updated + ' updated' + (skipped ? ' · ' + skipped + ' skipped' : '') + '</div><div style="font-size:13px;color:var(--ink3);margin-bottom:18px">They’re live in the POS and online store now. Scan-ready wherever a barcode was provided.</div><button class="btn btn-orange" onclick="closeImport()">Done</button></div>';
      loadProds();
    } catch (e) { toast('❌ ' + e.message); $('imp-go').disabled = false; $('imp-ptxt').textContent = 'Stopped after ' + done + ' products: ' + e.message; }
  };

  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  var COLS = ['name', 'brand', 'category', 'price', 'originalPrice', 'cost', 'quantity', 'sku', 'barcode', 'unit', 'reorderPoint', 'vat', 'description', 'image', 'supplier', 'tag'];
  function dl(name, text, type) { var b = new Blob(['\uFEFF' + text], { type: type || 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  window.exportProductsCSV = function () { var keys = Object.keys(prods || {}); if (!keys.length) { toast('No products to export'); return; } dl('products-' + new Date().toISOString().slice(0, 10) + '.csv', [COLS.join(',')].concat(keys.map(function (k) { return COLS.map(function (c) { var v = prods[k][c]; if (c === 'image' && /^data:/.test(v || '')) v = ''; return csvCell(v); }).join(','); })).join('\r\n')); toast('✅ Exported ' + keys.length + ' products'); };
  window.downloadProductTemplate = function () { dl('products-template.csv', [COLS.join(','), 'Golden Penny Spaghetti 500g,Golden Penny,Groceries,1250,1400,980,48,GP-SP-500,6001234567890,pack,10,0,Quality spaghetti,,Dangote,', 'Peak Milk Tin 400g,Peak,Dairy,3400,,2900,12,PK-400,6009876543210,piece,5,7.5,Full cream milk powder,,FrieslandCampina,NEW'].join('\r\n')); };

  /* ══════════ page wiring ══════════ */
  function wire() {
    // import toolbar → one smart button
    var imp = $('import-products-file'); if (imp) { var bar = imp.parentNode; bar.innerHTML = '<button class="btn btn-orange btn-sm" onclick="openImport()">📥 Import products (any format)</button><button class="btn btn-grey btn-sm" onclick="downloadProductTemplate()">⬇ Sample template</button><button class="btn btn-grey btn-sm" onclick="exportProductsCSV()">⬆ Export all</button>'; var sub = bar.previousElementSibling; if (sub) sub.innerHTML = '<div style="font-family:\'Syne\',sans-serif;font-size:14px;font-weight:800;color:#fff;margin-bottom:3px">📥 Bring your existing product list</div><div style="font-size:11px;color:rgba(255,255,255,.55)">CSV, Excel, JSON or paste from a sheet — columns are detected and arranged automatically. Update existing products by barcode / SKU / name.</div>'; }
    // barcode field → generate / scan / preview
    var bc = $('f-barcode'); if (bc && !$('bc-prev')) { var w = bc.parentNode; bc.outerHTML = '<div class="bc-row"><input id="f-barcode" placeholder="Scan or type barcode" oninput="previewBarcode()" autocomplete="off"><button class="btn btn-grey btn-sm" type="button" onclick="genBarcode()">⚡ Generate</button><button class="btn btn-grey btn-sm" type="button" onclick="scanBarcodeInto(\'f-barcode\')">📷</button></div><svg id="bc-prev"></svg><p class="hint">This barcode is what the POS scanner matches. Leave blank if none.</p>'; var lb = w.querySelector('label'); if (lb) lb.textContent = 'Barcode (POS scan code)'; }
    var sk = $('f-sku'); if (sk) sk.placeholder = 'SKU-001 (also scannable)';
    // keep import file input working for any old callers
    var fi = $('f-img-file'); if (fi) fi.setAttribute('onchange', 'handleProductImages(this)');
    // categories: allow adding new
    var cat = $('f-cat'); if (cat && !Array.from(cat.options).some(function (o) { return o.value === '__new'; })) { cat.add(new Option('➕ Add new category…', '__new')); cat.addEventListener('change', function () { if (cat.value === '__new') { QC.prompt('Category name', { title: 'New category', ok: 'Add category', required: true, placeholder: 'e.g. Beverages' }).then(function (n) { n = (n || '').trim(); if (n) { cat.add(new Option(n, n), cat.options.length - 1); cat.value = n; } else cat.value = ''; }); } }); }
    // categories created in Store Builder become selectable here too
    fetch(NS() + '/settings/store_design/categories.json').then(function (r) { return r.json(); }).then(function (cs) { if (!Array.isArray(cs) || !cat) return; cs.forEach(function (c) { if (c && c.name && !Array.from(cat.options).some(function (o) { return o.value === c.name; })) cat.add(new Option(c.name, c.name), cat.options.length - 1); }); }).catch(function () {});
    // subcategories (created in the Page Editor / Store Builder) — optional second dropdown under Category
    (function () {
      if (!cat || $('f-sub')) return;
      var wrap = cat.closest('.ff') || cat.parentNode, box = document.createElement('div');
      box.className = 'ff'; box.id = 'f-sub-wrap'; box.style.display = 'none';
      box.innerHTML = '<label>Subcategory (optional)</label><select id="f-sub"><option value="">— None —</option></select>';
      wrap.parentNode.insertBefore(box, wrap.nextSibling);
      var SUBS = {};
      window.qcFillSubs = function (c, sel) {
        var sb = $('f-sub'), list = SUBS[c] || [];
        sb.innerHTML = '<option value="">— None —</option>' + list.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
        if (sel && list.indexOf(sel) < 0) sb.add(new Option(sel, sel));
        sb.value = sel || ''; box.style.display = (list.length || sel) ? '' : 'none';
      };
      cat.addEventListener('change', function () { window.qcFillSubs(cat.value, ''); });
      fetch(NS() + '/settings/store_design/categories.json').then(function (r) { return r.json(); }).then(function (cs) {
        if (!Array.isArray(cs)) return;
        cs.forEach(function (c) { if (c && c.name && Array.isArray(c.subs)) SUBS[c.name] = c.subs.filter(Boolean); });
        window.qcFillSubs(cat.value, '');
      }).catch(function () {});
    })();
    // show the "My Store" default and clean title
    var t = $('ftitle'); if (t && /Deal/.test(t.textContent)) t.textContent = 'Add New Product';
    var h3 = document.querySelector('#p-deals .box-hd h3'); if (h3) h3.firstChild.textContent = 'All Products (';
    var sp = $('psearch'); if (sp) sp.placeholder = 'Search name, SKU or barcode…';
    renderImgs(); if (typeof prods === 'object' && Object.keys(prods).length) renderProds(prods);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  // USB scanner convenience: scanning into the barcode box shouldn't submit/jump
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'f-barcode') { e.preventDefault(); previewBarcode(); var n = $('f-name'); if (n && !n.value) n.focus(); } });
})();
} catch (e) { if (window.console) console.error("[admin-products.js]", e); }

/* ═══ admin-orders.js ═══ */
try {
/* QuickCart admin — Orders upgrade. Loaded after admin.html's script; overrides renderOrds/filterOrds/exportOrdersCSV.
   Click any order → detail drawer with the standard fulfilment workflow:
   Pending → Approve payment → Processing → Shipped → Delivered · Decline / Cancel (restocks) · Refund · Notes · Contact · Print */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var money = function (n) { return '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG'); };
  var H = { 'Content-Type': 'application/json' };
  var NS = function () { return getUserNS(); };
  var who = function () { return localStorage.getItem('qc_full_name') || localStorage.getItem('qc_logged_user') || 'admin'; };

  var ST = {
    pending:    { l: 'Awaiting payment', c: '#b45309', bg: 'rgba(245,158,11,.15)' },
    paid:       { l: 'Paid',             c: '#0a9d6b', bg: 'rgba(10,157,107,.13)' },
    processing: { l: 'Processing',       c: '#2563eb', bg: 'rgba(37,99,235,.12)' },
    shipped:    { l: 'Shipped',          c: '#7c3aed', bg: 'rgba(124,58,237,.12)' },
    delivered:  { l: 'Delivered',        c: '#047857', bg: 'rgba(4,120,87,.14)' },
    cancelled:  { l: 'Cancelled',        c: '#6b7280', bg: 'rgba(107,114,128,.14)' },
    declined:   { l: 'Declined',         c: '#d6336c', bg: 'rgba(214,51,108,.12)' },
    refunded:   { l: 'Refunded',         c: '#6b7280', bg: 'rgba(107,114,128,.14)' }
  };
  var statusOf = function (o) { var s = String(o.status || 'paid').toLowerCase(); if (s === 'completed' || s === 'complete') return 'delivered'; return ST[s] ? s : 'paid'; };
  var isPOS = function (o) { return o.source === 'pos'; };
  var created = function (o) { return o.createdAt || o.date || ''; };
  var custName = function (o) { return o.customerName || (o.customer && o.customer.name) || (isPOS(o) ? 'Walk-in customer' : '—'); };
  var custPhone = function (o) { return o.phone || (o.customer && o.customer.phone) || ''; };
  var custEmail = function (o) { return o.email || (o.customer && o.customer.email) || o.customerEmail || ''; };
  var custAddr = function (o) { return o.address || (o.customer && o.customer.address) || ''; };
  var qtyOf = function (i) { return Number(i.qty != null ? i.qty : i.q) || 0; };
  var badge = function (s) { var x = ST[s] || ST.paid; return '<span style="background:' + x.bg + ';color:' + x.c + ';font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;letter-spacing:.03em;white-space:nowrap">' + x.l.toUpperCase() + '</span>'; };
  var payLabel = function (o) { var m = o.payMethod || o.method || ''; return ({ card: 'Card', transfer: 'Bank transfer', cash: 'Cash', whatsapp: 'WhatsApp order', split: 'Split', pod: 'Pay on delivery' })[m] || m || '—'; };

  var S = { status: 'all', source: 'all', range: 'all', page: 1, size: 40, sel: {}, open: null };

  var css = document.createElement('style');
  css.textContent = '.ok-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.ok{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px 16px}.ok b{display:block;font-size:22px;font-weight:800;letter-spacing:-.03em}.ok span{font-size:11px;color:var(--ink3);font-weight:600}'
    + '.chips{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 10px}.chip{border:1.5px solid var(--border);background:#fff;border-radius:99px;padding:6px 13px;font-size:11px;font-weight:700;cursor:pointer;color:var(--ink3)}.chip.on{background:var(--ink,#14121a);color:#fff;border-color:var(--ink,#14121a)}.chip i{font-style:normal;opacity:.6;margin-left:4px}'
    + '.of-bar{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 12px;align-items:center}.of-bar select{padding:8px 11px;border:1px solid var(--border);border-radius:10px;font-size:12px;background:#fff}'
    + '#ord-tb tr.orow{cursor:pointer;transition:.12s}#ord-tb tr.orow:hover{background:rgba(23,23,23,.05)}'
    + '#od-bg{position:fixed;inset:0;background:rgba(20,18,26,.45);backdrop-filter:blur(3px);z-index:8000;display:none}#od-bg.on{display:block}'
    + '#od{position:fixed;top:0;right:0;bottom:0;width:560px;max-width:100%;background:#fff;z-index:8001;transform:translateX(105%);transition:.28s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;box-shadow:-20px 0 60px rgba(20,18,26,.25)}#od.on{transform:none}'
    + '.od-hd{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px}.od-bd{flex:1;overflow:auto;padding:16px 20px 24px}.od-ft{padding:14px 20px;border-top:1px solid var(--border);background:#faf7f2;display:flex;gap:8px;flex-wrap:wrap}'
    + '.od-sec{margin-bottom:18px}.od-sec h4{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);margin:0 0 8px}'
    + '.od-card{border:1px solid var(--border);border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.7}'
    + '.od-it{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px}.od-it:last-child{border:none}.od-it img,.od-it .ph{width:42px;height:42px;border-radius:10px;object-fit:cover;background:var(--grey1);display:flex;align-items:center;justify-content:center;flex-shrink:0}'
    + '.tl{position:relative;padding-left:20px}.tl:before{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:2px;background:var(--border)}.tl div{position:relative;margin-bottom:12px;font-size:12px}.tl div:before{content:"";position:absolute;left:-19px;top:4px;width:10px;height:10px;border-radius:50%;background:var(--accent);border:2px solid #fff;box-shadow:0 0 0 1px var(--accent)}.tl small{display:block;color:var(--ink3);font-size:11px}'
    + '.abtn{border:none;border-radius:99px;padding:10px 16px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit}.abtn.go{background:linear-gradient(135deg,#171717,#333);color:#fff}.abtn.ok2{background:#0a9d6b;color:#fff}.abtn.no{background:rgba(214,51,108,.1);color:#d6336c}.abtn.gr{background:#efe9e1;color:#14121a}'
    + '@media(max-width:700px){.ok-row{grid-template-columns:1fr 1fr}#od{width:100%}}';
  document.head.appendChild(css);

  /* ── data helpers ── */
  var inRange = function (o) { if (S.range === 'all') return true; var d = new Date(created(o)); if (isNaN(d)) return false; var now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); if (S.range === 'today') return d >= start; var days = S.range === '7d' ? 7 : 30; return d >= new Date(start.getTime() - (days - 1) * 864e5); };
  function visible(data) {
    var q = (($('osearch') || {}).value || '').toLowerCase().trim();
    return Object.keys(data || {}).filter(function (k) {
      var o = data[k], s = statusOf(o);
      if (S.status !== 'all') { if (S.status === 'closed') { if (s !== 'cancelled' && s !== 'declined') return false; } else if (s !== S.status) return false; }
      if (S.source !== 'all' && (S.source === 'pos') !== isPOS(o)) return false;
      if (!inRange(o)) return false;
      if (q && ((o.ref || k) + ' ' + custName(o) + ' ' + custPhone(o) + ' ' + custEmail(o) + ' ' + (o.bankRef || '') + ' ' + (o.items || []).map(function (i) { return i.name; }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return new Date(created(data[b])) - new Date(created(data[a])); });
  }

  /* ── page shell (built once) ── */
  function shell() {
    var p = $('p-orders'); if (!p || $('ord-kpis')) return;
    p.innerHTML = '<div class="ptitle">Orders</div><div class="psub">Click any order to approve, decline, ship, refund or contact the customer. Online and POS sales in one place.</div>'
      + '<div class="ok-row" id="ord-kpis"></div>'
      + '<div class="box"><div class="box-hd"><h3>All orders (<span id="ord-count">0</span>)</h3><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><input class="sinput" id="osearch" placeholder="Search ref, name, phone, item…" oninput="filterOrds()" type="text"><button class="btn btn-grey btn-sm" onclick="exportOrdersCSV()">⬇ Export CSV</button></div></div>'
      + '<div class="chips" id="ord-chips"></div>'
      + '<div class="of-bar"><select onchange="ordSet(\'source\',this.value)"><option value="all">All sources</option><option value="online">🌐 Online store</option><option value="pos">🏪 POS</option></select><select onchange="ordSet(\'range\',this.value)"><option value="all">All time</option><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select>'
      + '<span id="ord-bulk" style="display:none;gap:6px;margin-left:auto"><button class="abtn gr" onclick="ordBulk(\'processing\')">Mark processing</button><button class="abtn gr" onclick="ordBulk(\'shipped\')">Mark shipped</button><button class="abtn ok2" onclick="ordBulk(\'delivered\')">Mark delivered</button></span></div>'
      + '<div style="overflow-x:auto"><table><thead><tr><th style="width:34px"><input type="checkbox" onchange="ordSelAll(this)"></th><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody id="ord-tb"></tbody></table></div><div id="ord-pg" class="pg-bar" style="display:flex;justify-content:space-between;padding:12px 16px;font-size:12px;color:var(--ink3)"></div></div>';
    var bg = document.createElement('div'); bg.id = 'od-bg'; bg.onclick = closeOrder; document.body.appendChild(bg);
    var d = document.createElement('div'); d.id = 'od'; document.body.appendChild(d);
  }
  window.ordSet = function (k, v) { S[k] = v; S.page = 1; renderOrds(orders); };
  window.ordSelAll = function (cb) { var ks = visible(orders).slice((S.page - 1) * S.size, S.page * S.size); ks.forEach(function (k) { if (cb.checked) S.sel[k] = 1; else delete S.sel[k]; }); renderOrds(orders); };
  window.ordTick = function (k, cb, ev) { ev.stopPropagation(); if (cb.checked) S.sel[k] = 1; else delete S.sel[k]; var n = Object.keys(S.sel).length; $('ord-bulk').style.display = n ? 'flex' : 'none'; };

  window.renderOrds = function (data) {
    shell(); data = data || orders; var all = Object.keys(data), cnt = { all: all.length, closed: 0 };
    all.forEach(function (k) { var s = statusOf(data[k]); cnt[s] = (cnt[s] || 0) + 1; if (s === 'cancelled' || s === 'declined') cnt.closed++; });
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var rev = all.filter(function (k) { var o = data[k], s = statusOf(o); return new Date(created(o)) >= today && s !== 'cancelled' && s !== 'declined' && s !== 'refunded' && s !== 'pending'; }).reduce(function (t, k) { return t + (Number(data[k].total) || 0); }, 0);
    $('ord-kpis').innerHTML = '<div class="ok"><b style="color:#b45309">' + (cnt.pending || 0) + '</b><span>Awaiting payment / approval</span></div><div class="ok"><b style="color:#2563eb">' + ((cnt.paid || 0) + (cnt.processing || 0)) + '</b><span>To fulfil (paid &amp; processing)</span></div><div class="ok"><b style="color:#7c3aed">' + (cnt.shipped || 0) + '</b><span>On the way</span></div><div class="ok"><b>' + money(rev) + '</b><span>Revenue today</span></div>';
    var chips = [['all', 'All'], ['pending', 'Awaiting payment'], ['paid', 'Paid'], ['processing', 'Processing'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['closed', 'Cancelled / declined'], ['refunded', 'Refunded']];
    $('ord-chips').innerHTML = chips.map(function (c) { return '<button class="chip' + (S.status === c[0] ? ' on' : '') + '" onclick="ordSet(\'status\',\'' + c[0] + '\')">' + c[1] + '<i>' + (cnt[c[0]] || 0) + '</i></button>'; }).join('');
    var keys = visible(data), pages = Math.max(1, Math.ceil(keys.length / S.size)); if (S.page > pages) S.page = pages; var slice = keys.slice((S.page - 1) * S.size, S.page * S.size);
    $('ord-count').textContent = keys.length;
    $('ord-tb').innerHTML = !slice.length ? '<tr class="empty-row"><td colspan="8">' + (all.length ? 'No orders match these filters' : 'No orders yet') + '</td></tr>' : slice.map(function (k) {
      var o = data[k], s = statusOf(o), d = created(o), n = (o.items || []).reduce(function (t, i) { return t + qtyOf(i); }, 0);
      return '<tr class="orow" onclick="openOrder(\'' + k + '\')"><td onclick="event.stopPropagation()"><input type="checkbox" ' + (S.sel[k] ? 'checked' : '') + ' onchange="ordTick(\'' + k + '\',this,event)"></td>'
        + '<td><div style="font-family:\'DM Mono\',monospace;font-size:11px;font-weight:700">' + esc((o.ref || k).slice(0, 18)) + '</div><div style="font-size:10px;color:var(--ink4)">' + (isPOS(o) ? '🏪 POS' : '🌐 Online') + '</div></td>'
        + '<td><div style="font-weight:600;font-size:12px">' + esc(custName(o)) + '</div><div style="font-size:10px;color:var(--ink3)">' + esc(custPhone(o)) + '</div></td><td>' + n + '</td>'
        + '<td style="font-weight:800;font-family:\'DM Mono\',monospace">' + money(o.total) + '</td><td style="font-size:11px;color:var(--ink3)">' + esc(payLabel(o)) + (o.autoConfirmed ? ' <span title="Confirmed automatically by the bank" style="color:#0a9d6b">✓ auto</span>' : '') + '</td><td>' + badge(s) + '</td>'
        + '<td style="font-size:11px;color:var(--ink3);white-space:nowrap">' + (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + '<br>' + new Date(d).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : '—') + '</td></tr>';
    }).join('');
    $('ord-pg').innerHTML = '<span>' + keys.length + ' order' + (keys.length === 1 ? '' : 's') + '</span><span><button class="btn btn-grey btn-sm" ' + (S.page <= 1 ? 'disabled' : '') + ' onclick="ordPg(-1)">‹ Prev</button> Page ' + S.page + '/' + pages + ' <button class="btn btn-grey btn-sm" ' + (S.page >= pages ? 'disabled' : '') + ' onclick="ordPg(1)">Next ›</button></span>';
    $('ord-bulk').style.display = Object.keys(S.sel).length ? 'flex' : 'none';
  };
  window.ordPg = function (d) { S.page += d; renderOrds(orders); };
  window.filterOrds = function () { S.page = 1; renderOrds(orders); };

  /* ── workflow ── */
  function actions(o) {
    var s = statusOf(o), a = [];
    if (isPOS(o)) { if (s === 'paid' || s === 'delivered') a.push(['refund', 'Refund / void sale', 'no']); return a; }
    if (s === 'pending') { a.push(['approve', '✓ Approve payment', 'ok2'], ['decline', 'Decline', 'no']); }
    if (s === 'paid') { a.push(['processing', 'Start processing', 'go'], ['shipped', 'Mark shipped', 'gr'], ['cancel', 'Cancel order', 'no']); }
    if (s === 'processing') { a.push(['shipped', 'Mark shipped', 'go'], ['delivered', 'Mark delivered', 'gr'], ['cancel', 'Cancel order', 'no']); }
    if (s === 'shipped') { a.push(['delivered', '✓ Mark delivered', 'ok2']); }
    if (s === 'paid' || s === 'processing' || s === 'shipped' || s === 'delivered') a.push(['refund', 'Refund', 'no']);
    return a;
  }
  async function restock(o) {
    if (o.stockRestored) return 0; var n = 0;
    for (var i = 0; i < (o.items || []).length; i++) {
      var it = o.items[i], k = it.k || it.id, q = qtyOf(it); if (!k || !q || !prods[k]) continue;
      if (!isPOS(o) && !it.stockTracked) continue; // online items the store never decremented
      try { var r = await fetch(DB + '/' + encodeURIComponent(k) + '/quantity.json', { method: 'PUT', headers: H, body: JSON.stringify({ '.sv': { increment: q } }) }); if (r.ok) { prods[k].quantity = (Number(prods[k].quantity) || 0) + q; n += q; } } catch (e) {}
    }
    return n;
  }
  async function commit(k, patch, hist) {
    var o = orders[k]; var h = Array.isArray(o.history) ? o.history.slice() : [{ s: statusOf(o), at: created(o) || new Date().toISOString(), by: isPOS(o) ? (o.cashier || 'POS') : 'customer', note: 'Order placed' }];
    if (hist) h.push(Object.assign({ at: new Date().toISOString(), by: who() }, hist)); patch.history = h; patch.updatedAt = new Date().toISOString();
    var r = await fetch(ORDERS_DB + '/' + encodeURIComponent(k) + '.json', { method: 'PATCH', headers: H, body: JSON.stringify(patch) });
    if (!r.ok) throw new Error('Could not save (' + r.status + ')'); Object.assign(o, patch);
  }
  window.orderAct = async function (k, act) {
    var o = orders[k]; if (!o) return; var note = '', patch = {}, hist = {}, msg = '';
    try {
      if (act === 'approve') { if (!await QC.confirm('Confirm you have received ' + money(o.total) + ' from ' + custName(o) + '?')) return; patch.status = 'paid'; patch.paidAt = new Date().toISOString(); hist = { s: 'paid', note: 'Payment approved' }; msg = 'Payment approved'; }
      if (act === 'processing') { patch.status = 'processing'; hist = { s: 'processing', note: 'Being prepared' }; msg = 'Marked as processing'; }
      if (act === 'shipped') { var c = await QC.prompt('Courier / rider and tracking number', { title: 'Mark as shipped', sub: 'Optional — saved on the order so you can share it with the customer.', value: o.courier || '', ok: 'Mark as shipped', placeholder: 'e.g. GIG Logistics · 1234567' }); if (c === null) return; patch.status = 'shipped'; patch.courier = c; patch.shippedAt = new Date().toISOString(); hist = { s: 'shipped', note: c ? 'Shipped via ' + c : 'Shipped' }; msg = 'Marked as shipped'; }
      if (act === 'delivered') { patch.status = 'delivered'; patch.deliveredAt = new Date().toISOString(); hist = { s: 'delivered', note: 'Delivered to customer' }; msg = 'Marked as delivered'; }
      if (act === 'decline' || act === 'cancel') {
        var reason = await QC.prompt('Reason', { title: (act === 'decline' ? 'Decline' : 'Cancel') + ' this order', sub: 'Shown in the order history' + (custPhone(o) ? ' and used in the WhatsApp message.' : '.'), ok: act === 'decline' ? 'Decline order' : 'Cancel order', placeholder: 'e.g. Item out of stock' }); if (reason === null) return;
        var paidCard = (o.method === 'card' || o.payMethod === 'card') && statusOf(o) !== 'pending';
        if (paidCard && !await QC.confirm('This customer already PAID by card. Cancelling does not send money back — refund them from your Paystack dashboard. Continue?')) return;
        var n = await restock(o); patch.status = act === 'decline' ? 'declined' : 'cancelled'; patch.cancelReason = reason; patch.stockRestored = true; hist = { s: patch.status, note: (reason || 'No reason given') + (n ? ' · ' + n + ' item(s) returned to stock' : '') }; msg = (act === 'decline' ? 'Order declined' : 'Order cancelled') + (n ? ' · stock restored' : '');
      }
      if (act === 'refund') {
        var amt = await QC.prompt('Refund amount (₦)', { title: 'Refund order', sub: 'Full amount is ' + money(o.total) + '.', type: 'number', value: o.total, required: true, ok: 'Next' }); if (amt === null) return; amt = Number(String(amt).replace(/[^\d.]/g, '')); if (!(amt > 0) || amt > Number(o.total) + 0.01) { toast('⚠️ Enter an amount between 1 and ' + o.total); return; }
        var whyR = await QC.prompt('Reason for refund', { title: 'Refund reason', ok: 'Next', placeholder: 'Optional' }); if (whyR === null) return; var why = whyR || ''; var back = await QC.confirm('Return the items to stock?\n\nYes = put them back on the shelf\nNo = damaged / not returned', { title: 'Restock items?', ok: 'Yes, restock', cancel: 'No' });
        var n2 = back ? await restock(o) : 0; patch.status = 'refunded'; patch.refund = { amount: amt, reason: why, at: new Date().toISOString(), by: who(), restocked: !!back }; if (back) patch.stockRestored = true;
        hist = { s: 'refunded', note: money(amt) + ' refunded' + (why ? ' — ' + why : '') + (n2 ? ' · ' + n2 + ' returned to stock' : '') + ((o.method === 'card' || o.payMethod === 'card') ? ' (send the money back from Paystack / your terminal)' : '') }; msg = 'Refund recorded';
      }
      await commit(k, patch, hist); toast('✅ ' + msg); renderOrds(orders); if (S.open === k) openOrder(k);
    } catch (e) { toast('❌ ' + e.message); }
  };
  window.orderNote = async function (k) {
    var t = ($('od-note') || {}).value || ''; if (!t.trim()) return; try { await commit(k, {}, { s: 'note', note: t.trim() }); toast('Note added'); openOrder(k); } catch (e) { toast('❌ ' + e.message); }
  };
  window.ordBulk = async function (status) {
    var ks = Object.keys(S.sel).filter(function (k) { return orders[k] && !isPOS(orders[k]); }); if (!ks.length) { toast('Select online orders first'); return; }
    if (!await QC.confirm('Mark ' + ks.length + ' order(s) as ' + status + '?')) return; var done = 0;
    for (var i = 0; i < ks.length; i++) { var o = orders[ks[i]], s = statusOf(o); if (s === 'cancelled' || s === 'declined' || s === 'refunded' || s === 'pending') continue; try { var p = { status: status }; p[status + 'At'] = new Date().toISOString(); await commit(ks[i], p, { s: status, note: 'Bulk update' }); done++; } catch (e) {} }
    S.sel = {}; toast('✅ ' + done + ' order(s) updated'); renderOrds(orders);
  };

  /* ── drawer ── */
  function waNum(p) { var d = String(p || '').replace(/\D/g, ''); if (d.indexOf('234') === 0) return d; if (d[0] === '0') return '234' + d.slice(1); return d; }
  function waMsg(o) {
    var n = custName(o).split(' ')[0], r = o.ref || '', s = statusOf(o);
    var m = { pending: 'we have received your order ' + r + ' and are waiting for payment confirmation.', paid: 'your payment for order ' + r + ' is confirmed. We are getting it ready.', processing: 'your order ' + r + ' is being prepared.', shipped: 'your order ' + r + ' is on its way' + (o.courier ? ' (' + o.courier + ')' : '') + '.', delivered: 'your order ' + r + ' has been delivered. Thank you for shopping with us!', declined: 'we are sorry, we could not complete order ' + r + (o.cancelReason ? ' (' + o.cancelReason + ')' : '') + '.', cancelled: 'your order ' + r + ' was cancelled' + (o.cancelReason ? ' (' + o.cancelReason + ')' : '') + '.', refunded: 'your refund for order ' + r + ' has been processed.' }[s] || 'an update on order ' + r + '.';
    return 'Hello ' + n + ', ' + m;
  }
  window.openOrder = function (k) {
    var o = orders[k]; if (!o) return; S.open = k; shell(); var s = statusOf(o), d = created(o);
    var hist = (Array.isArray(o.history) && o.history.length ? o.history : [{ s: s, at: d, by: isPOS(o) ? (o.cashier || 'POS') : 'customer', note: 'Order placed' }]).slice().reverse();
    var items = (o.items || []).map(function (i) { return '<div class="od-it">' + (i.image ? '<img src="' + esc(i.image) + '" alt="">' : '<div class="ph">📦</div>') + '<div style="flex:1;min-width:0"><div style="font-weight:700">' + esc(i.name) + (i.size ? ' <span style="color:var(--ink3);font-weight:500">(' + esc(i.size) + ')</span>' : '') + '</div><div style="font-size:11px;color:var(--ink3)">' + qtyOf(i) + ' × ' + money(i.price) + (i.sku ? ' · ' + esc(i.sku) : '') + '</div></div><b>' + money(qtyOf(i) * (Number(i.price) || 0)) + '</b></div>'; }).join('');
    var ph = custPhone(o), em = custEmail(o), acts = actions(o);
    $('od').innerHTML = '<div class="od-hd"><div><div style="font-family:\'DM Mono\',monospace;font-size:13px;font-weight:800">' + esc(o.ref || k) + '</div><div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">' + badge(s) + '<span style="font-size:11px;color:var(--ink3)">' + (isPOS(o) ? '🏪 POS · ' + esc(o.cashier || '') : '🌐 Online store') + ' · ' + (d ? new Date(d).toLocaleString('en-NG') : '') + '</span></div></div><button class="btn btn-grey btn-sm" onclick="closeOrder()">✕</button></div>'
      + '<div class="od-bd">'
      + (isPOS(o) && !ph && !custAddr(o) ? '' : '<div class="od-sec"><h4>Customer</h4><div class="od-card"><b>' + esc(custName(o)) + '</b>' + (ph ? '<br>📞 ' + esc(ph) : '') + (em ? '<br>✉️ ' + esc(em) : '') + (custAddr(o) ? '<br>📍 ' + esc(custAddr(o)) : '') + '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' + (ph ? '<a class="abtn ok2" style="text-decoration:none" target="_blank" href="https://wa.me/' + waNum(ph) + '?text=' + encodeURIComponent(waMsg(o)) + '">💬 WhatsApp update</a><a class="abtn gr" style="text-decoration:none" href="tel:' + esc(ph) + '">Call</a>' : '') + (em ? '<a class="abtn gr" style="text-decoration:none" href="mailto:' + esc(em) + '?subject=' + encodeURIComponent('Your order ' + (o.ref || '')) + '&body=' + encodeURIComponent(waMsg(o)) + '">Email</a>' : '') + '</div></div></div>')
      + '<div class="od-sec"><h4>Items</h4><div class="od-card" style="padding:4px 14px">' + (items || '<div style="padding:10px;color:var(--ink3)">No items recorded</div>') + '</div></div>'
      + '<div class="od-sec"><h4>Payment</h4><div class="od-card">' + (o.subtotal && o.subtotal !== o.total ? 'Subtotal: ' + money(o.subtotal) + '<br>' : '') + (o.discount ? 'Discount: −' + money(o.discount) + '<br>' : '') + '<b style="font-size:16px">Total: ' + money(o.total) + '</b><br>Method: ' + esc(payLabel(o)) + (o.terminal ? ' · ' + esc(o.terminal) : '') + (o.bankRef ? '<br>Bank ref: <span style="font-family:\'DM Mono\',monospace;font-size:11px">' + esc(o.bankRef) + '</span>' : '') + (o.approvalCode ? '<br>Approval code: ' + esc(o.approvalCode) : '') + (o.autoConfirmed ? '<br><span style="color:#0a9d6b;font-weight:700">✓ Confirmed automatically by the bank</span>' : '') + (o.refund ? '<br><span style="color:#d6336c;font-weight:700">Refunded ' + money(o.refund.amount) + '</span>' : '') + (o.courier ? '<br>Courier: ' + esc(o.courier) : '') + (o.cancelReason ? '<br>Reason: ' + esc(o.cancelReason) : '') + '</div></div>'
      + '<div class="od-sec"><h4>Timeline</h4><div class="tl">' + hist.map(function (h) { return '<div><b>' + esc((ST[h.s] && ST[h.s].l) || (h.s === 'note' ? 'Note' : h.s || '')) + '</b>' + (h.note ? ' — ' + esc(h.note) : '') + '<small>' + (h.at ? new Date(h.at).toLocaleString('en-NG') : '') + ' · ' + esc(h.by || '') + '</small></div>'; }).join('') + '</div></div>'
      + '<div class="od-sec"><h4>Internal note</h4><div style="display:flex;gap:6px"><input id="od-note" placeholder="Visible to your team only…" style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:12px;font-size:13px"><button class="abtn gr" onclick="orderNote(\'' + k + '\')">Add</button></div></div></div>'
      + '<div class="od-ft">' + acts.map(function (a) { return '<button class="abtn ' + a[2] + '" onclick="orderAct(\'' + k + '\',\'' + a[0] + '\')">' + a[1] + '</button>'; }).join('') + '<button class="abtn gr" style="margin-left:auto" onclick="printOrder(\'' + k + '\')">🖨 Print</button></div>';
    $('od-bg').classList.add('on'); $('od').classList.add('on');
  };
  window.closeOrder = function () { S.open = null; var a = $('od'), b = $('od-bg'); if (a) a.classList.remove('on'); if (b) b.classList.remove('on'); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOrder(); });

  window.printOrder = function (k) {
    var o = orders[k]; if (!o) return; var biz = localStorage.getItem('qc_biz_name') || 'Your Store', w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print'); return; }
    var rows = (o.items || []).map(function (i) { return '<tr><td>' + esc(i.name) + (i.size ? ' (' + esc(i.size) + ')' : '') + '</td><td style="text-align:center">' + qtyOf(i) + '</td><td style="text-align:right">' + money(i.price) + '</td><td style="text-align:right">' + money(qtyOf(i) * i.price) + '</td></tr>'; }).join('');
    w.document.write('<!doctype html><title>Invoice ' + esc(o.ref || k) + '</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:30px auto;color:#14121a;font-size:13px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}th{background:#f6f2ec;font-size:11px;text-transform:uppercase}.r{text-align:right}.tot{font-size:16px;font-weight:800}</style><h1>' + esc(biz) + '</h1><div style="color:#666">Invoice / Packing slip</div><hr><div style="display:flex;justify-content:space-between"><div><b>Bill to</b><br>' + esc(custName(o)) + '<br>' + esc(custPhone(o)) + '<br>' + esc(custAddr(o)) + '</div><div class="r"><b>' + esc(o.ref || k) + '</b><br>' + (created(o) ? new Date(created(o)).toLocaleString('en-NG') : '') + '<br>Status: ' + esc((ST[statusOf(o)] || {}).l) + '<br>Payment: ' + esc(payLabel(o)) + '</div></div><table><tr><th>Item</th><th style="text-align:center">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>' + rows + '</table><div class="r">' + (o.discount ? 'Discount: −' + money(o.discount) + '<br>' : '') + '<span class="tot">Total: ' + money(o.total) + '</span></div><script>setTimeout(function(){print()},300)<\/script>'); w.document.close();
  };

  var csv = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  window.exportOrdersCSV = function () {
    var ks = visible(orders); if (!ks.length) { toast('No orders to export'); return; }
    var rows = [['Ref', 'Date', 'Source', 'Status', 'Customer', 'Phone', 'Email', 'Address', 'Items', 'Total', 'Payment', 'Bank ref', 'Courier', 'Refund']].concat(ks.map(function (k) { var o = orders[k]; return [o.ref || k, created(o), isPOS(o) ? 'POS' : 'Online', statusOf(o), custName(o), custPhone(o), custEmail(o), custAddr(o), (o.items || []).map(function (i) { return qtyOf(i) + 'x ' + i.name; }).join('; '), o.total, payLabel(o), o.bankRef || '', o.courier || '', o.refund ? o.refund.amount : '']; }));
    var b = new Blob(['\uFEFF' + rows.map(function (r) { return r.map(csv).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'orders-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); toast('✅ Exported ' + ks.length + ' orders');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', shell); else shell();
})();
} catch (e) { if (window.console) console.error("[admin-orders.js]", e); }

/* ═══ admin-inventory.js ═══ */
try {
/* QuickCart admin — Inventory tracker (overrides loadInventory & friends from admin.html).
   • Working search / category / status filters, sorting, pagination
   • Stock value at cost & retail, days-of-cover from real sales, slow movers, expiry alerts
   • Receive stock (goods-received note, multi-line, scan-friendly, optional cost update)
   • Adjust stock with a reason (damaged, expired, lost, found…)
   • Full movement ledger: every change recorded; sales & returns derived from orders
   • Reorder suggestions grouped by supplier (print / copy / receive) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var money = function (n) { return '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG'); };
  var H = { 'Content-Type': 'application/json' };
  var who = function () { return localStorage.getItem('qc_full_name') || localStorage.getItem('qc_logged_user') || 'admin'; };
  var SDB = function () { return getSettingsDB(); };
  var DAY = 864e5;

  var INV = { tab: 'stock', q: '', cat: '', st: '', sort: 'name', page: 1, size: 50, sales: {}, saleRows: [], ledger: [], mv: { type: '', range: '30', q: '' }, loaded: 0 };
  var REASONS = [['correction', 'Stock correction'], ['damaged', 'Damaged'], ['expired', 'Expired'], ['lost', 'Lost / stolen'], ['found', 'Found'], ['sample', 'Sample / promo'], ['own-use', 'Own use'], ['supplier-return', 'Returned to supplier'], ['customer-return', 'Customer return'], ['opening', 'Opening stock']];
  var TYPE_L = { sale: 'Sale', return: 'Return (restock)', receive: 'Goods received', adjust: 'Adjustment', count: 'Stock count', damaged: 'Damaged', expired: 'Expired', lost: 'Lost / stolen', found: 'Found', correction: 'Correction' };

  var css = document.createElement('style');
  css.textContent = '.iv-tabs{display:flex;gap:6px;margin:0 0 14px;flex-wrap:wrap}.iv-tabs button{border:1.5px solid var(--border);background:#fff;border-radius:99px;padding:8px 16px;font-size:12px;font-weight:800;color:var(--ink3);cursor:pointer;font-family:inherit}.iv-tabs button.on{background:var(--ink,#14121a);color:#fff;border-color:var(--ink,#14121a)}'
    + '.iv-k{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px}.iv-k div{background:#fff;border:1px solid var(--border);border-radius:16px;padding:13px 15px}.iv-k b{display:block;font-size:19px;font-weight:800;letter-spacing:-.03em;margin-top:2px}.iv-k span{font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em}'
    + '.iv-bar{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 12px;align-items:center}.iv-bar input,.iv-bar select{padding:8px 11px;border:1px solid var(--border);border-radius:10px;font-size:12px;background:#fff}.iv-bar input{min-width:200px}'
    + '.iv-th{width:36px;height:36px;border-radius:9px;object-fit:cover;background:var(--grey1);display:flex;align-items:center;justify-content:center}.iv-mini{border:none;background:var(--grey1);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit}.iv-mini.pri{background:var(--accent);color:#fff}'
    + '#iv-bg{position:fixed;inset:0;background:rgba(20,18,26,.55);backdrop-filter:blur(6px);z-index:9000;display:none;align-items:center;justify-content:center;padding:14px}#iv-bg.on{display:flex}#iv-box{background:#fff;border-radius:22px;width:780px;max-width:100%;max-height:94vh;overflow:auto;box-shadow:0 30px 80px rgba(20,18,26,.3)}'
    + '.iv-hd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start}.iv-hd h3{margin:0;font-size:18px;font-weight:800;letter-spacing:-.02em}.iv-bd{padding:18px 22px}'
    + '.iv-f{display:grid;grid-template-columns:1fr 1fr;gap:10px}.iv-f label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);display:block;margin-bottom:4px}.iv-f input,.iv-f select,.iv-f textarea{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font-size:13px;font-family:inherit}'
    + '.iv-lines input{padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:12px;width:84px}.iv-sugg{position:absolute;left:0;right:0;top:100%;background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.15);z-index:5;max-height:240px;overflow:auto}.iv-sugg div{padding:9px 12px;font-size:12px;cursor:pointer;border-bottom:1px solid var(--border)}.iv-sugg div:hover{background:rgba(23,23,23,.07)}'
    + '@media(max-width:900px){.iv-k{grid-template-columns:repeat(2,1fr)}.iv-f{grid-template-columns:1fr}}';
  document.head.appendChild(css);

  /* ── data ── */
  async function loadSales(force) {
    if (!force && Date.now() - INV.loaded < 60000) return;
    var ord = {}, led = {};
    try { ord = await (await fetch(ORDERS_DB + '.json')).json() || {}; } catch (e) {}
    try { led = await (await fetch(SDB() + '/stock_movements.json?orderBy=%22%24key%22&limitToLast=1500')).json() || {}; } catch (e) {}
    var now = Date.now(), sales = {}, rows = [];
    Object.keys(ord).forEach(function (ok) {
      var o = ord[ok], st = String(o.status || 'paid').toLowerCase(), at = Date.parse(o.createdAt || o.date || '') || 0, pos = o.source === 'pos';
      (o.items || []).forEach(function (i) {
        var k = i.k || i.id, q = Number(i.qty != null ? i.qty : i.q) || 0; if (!k || !q) return; if (!pos && !i.stockTracked) return;
        var s = sales[k] = sales[k] || { d30: 0, d90: 0, all: 0, last: 0 };
        rows.push({ type: 'sale', at: at, iso: o.createdAt || '', productKey: k, product: i.name, change: -q, ref: o.ref || ok, by: pos ? (o.cashier || 'POS') : 'online store', src: pos ? 'POS' : 'Online' });
        var gone = st === 'cancelled' || st === 'declined' || (st === 'refunded' && o.stockRestored);
        if (o.stockRestored) rows.push({ type: 'return', at: Date.parse(o.updatedAt || '') || at, iso: o.updatedAt || '', productKey: k, product: i.name, change: +q, ref: o.ref || ok, by: (o.history && o.history.length ? (o.history[o.history.length - 1].by || '') : ''), src: 'Order ' + st });
        if (gone) return;
        s.all += q; if (now - at <= 30 * DAY) s.d30 += q; if (now - at <= 90 * DAY) s.d90 += q; if (at > s.last) s.last = at;
      });
    });
    INV.sales = sales; INV.saleRows = rows;
    INV.ledger = Object.keys(led).map(function (id) { var m = led[id]; return Object.assign({}, m, { _id: id, at: Date.parse(m.at || '') || 0, iso: m.at }); });
    INV.loaded = Date.now();
  }
  window.invSales = function () { return INV.sales; };
  var vel = function (k) { var s = INV.sales[k]; return s ? s.d30 / 30 : 0; };
  var rpOf = function (p) { return p.reorderPoint != null && p.reorderPoint !== '' ? Number(p.reorderPoint) : 5; };
  function stateOf(p, k) {
    var q = Number(p.quantity) || 0, s = INV.sales[k] || { d30: 0 };
    if (p.inStock === 'service') return 'na';
    if (q <= 0) return 'out'; if (q <= rpOf(p)) return 'low';
    if (s.d30 === 0 && q > 0 && (!p.createdAt || Date.now() - Date.parse(p.createdAt) > 30 * DAY)) return 'slow'; return 'ok';
  }
  var BADGE = { out: ['Out of stock', 'out'], low: ['Low', 'low'], ok: ['OK', 'ok'], slow: ['No sales 30d', 'na'], na: ['n/a', 'na'] };
  var expDays = function (p) { if (!p.expiry) return null; var t = Date.parse(p.expiry); return isNaN(t) ? null : Math.floor((t - Date.now()) / DAY); };

  /* ── incr + ledger ── */
  async function incr(k, d) {
    var r = await fetch(DB + '/' + encodeURIComponent(k) + '/quantity.json', { method: 'PUT', headers: H, body: JSON.stringify({ '.sv': { increment: d } }) }); if (!r.ok) throw new Error('Stock update refused (' + r.status + ')');
    var q = Number(await (await fetch(DB + '/' + encodeURIComponent(k) + '/quantity.json')).json()) || 0, p = prods[k] || {};
    if (typeof p.inStock === 'boolean' || p.inStock === undefined) { fetch(DB + '/' + encodeURIComponent(k) + '/inStock.json', { method: 'PUT', headers: H, body: JSON.stringify(q > 0) }).catch(function () {}); }
    if (prods[k]) { prods[k].quantity = q; if (typeof prods[k].inStock === 'boolean') prods[k].inStock = q > 0; } return q;
  }
  var seq = 0;
  function log(e) { var at = new Date().toISOString(), id = Date.now() + '_' + (seq++) + '_' + Math.random().toString(36).slice(2, 5); e = Object.assign({ at: at, by: who() }, e); INV.ledger.push(Object.assign({ _id: id, at: Date.parse(at) }, e)); return fetch(SDB() + '/stock_movements/' + id + '.json', { method: 'PUT', headers: H, body: JSON.stringify(e) }).catch(function () {}); }
  window.invLog = log; window.invIncr = incr;

  /* ── page shell ── */
  function shell() {
    var p = $('p-inventory'); if (!p) return; if ($('iv-root')) return;
    p.innerHTML = '<div class="ptitle">Inventory</div><div class="psub">Live stock levels, receiving, adjustments and a full movement history for POS and online store.</div><div id="iv-root"></div>';
    var bg = document.createElement('div'); bg.id = 'iv-bg'; bg.innerHTML = '<div id="iv-box"></div>'; bg.onclick = function (e) { if (e.target === bg) ivClose(); }; document.body.appendChild(bg);
  }
  window.ivClose = function () { $('iv-bg').classList.remove('on'); };
  window.ivTab = function (t) { INV.tab = t; INV.page = 1; ivRender(); };
  window.ivSet = function (k, v) { INV[k] = v; INV.page = 1; ivRender(true); };

  window.loadInventory = async function () {
    shell(); if (!$('iv-root')) return;
    if (!Object.keys(prods || {}).length) { try { await loadProds(); } catch (e) {} }
    $('iv-root').innerHTML = '<div style="padding:30px;text-align:center;color:var(--ink3)">Loading inventory…</div>';
    await loadSales(true); ivRender();
  };
  window.filterInventory = function () { ivRender(true); };

  function ivRender(keepFocus) {
    var root = $('iv-root'); if (!root) return; var keys = Object.keys(prods || {}), units = 0, vc = 0, vr = 0, low = 0, out = 0, exp = 0;
    keys.forEach(function (k) { var p = prods[k], q = Math.max(0, Number(p.quantity) || 0), s = stateOf(p, k); units += q; vc += q * (Number(p.cost) || 0); vr += q * (Number(p.price) || 0); if (s === 'low') low++; if (s === 'out') out++; var d = expDays(p); if (d !== null && d <= 30 && q > 0) exp++; });
    var tabs = [['stock', '📦 Stock levels'], ['reorder', '🛒 Reorder (' + (low + out) + ')'], ['moves', '🧾 Movement history']];
    var h = '<div class="iv-k"><div><span>Products</span><b>' + keys.length + '</b></div><div><span>Units on hand</span><b>' + units.toLocaleString() + '</b></div><div><span>Value at cost</span><b>' + money(vc) + '</b></div><div><span>Value at retail</span><b>' + money(vr) + '</b><small style="color:#0a9d6b;font-weight:700">+' + money(vr - vc) + ' potential</small></div><div><span>Low / Out</span><b style="color:#d6336c">' + low + ' / ' + out + '</b></div><div><span>Expiring ≤30d</span><b style="color:' + (exp ? '#b45309' : 'inherit') + '">' + exp + '</b></div></div>'
      + '<div class="iv-tabs">' + tabs.map(function (t) { return '<button class="' + (INV.tab === t[0] ? 'on' : '') + '" onclick="ivTab(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('') + '<span style="margin-left:auto;display:flex;gap:6px"><button class="btn btn-orange btn-sm" onclick="ivReceive()">＋ Receive stock</button><button class="btn btn-grey btn-sm" onclick="exportInventoryCSV()">⬇ Valuation CSV</button></span></div>';
    h += INV.tab === 'stock' ? stockTab(keys) : INV.tab === 'reorder' ? reorderTab(keys) : movesTab();
    var f = document.activeElement && document.activeElement.id; root.innerHTML = h;
    if (keepFocus && f && $(f)) { var el = $(f); el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
  }

  /* ── tab: stock ── */
  function stockTab(keys) {
    var q = INV.q.toLowerCase().trim(), cats = {}; keys.forEach(function (k) { cats[prods[k].category || 'Uncategorised'] = 1; });
    var list = keys.filter(function (k) {
      var p = prods[k]; if (INV.cat && (p.category || 'Uncategorised') !== INV.cat) return false;
      var s = stateOf(p, k); if (INV.st === 'attention') { if (s !== 'low' && s !== 'out') return false; } else if (INV.st === 'expiring') { var d = expDays(p); if (d === null || d > 30) return false; } else if (INV.st && s !== INV.st) return false;
      if (q && ((p.name || '') + ' ' + (p.sku || '') + ' ' + (p.barcode || '') + ' ' + (p.brand || '') + ' ' + (p.supplier || '')).toLowerCase().indexOf(q) < 0) return false; return true;
    });
    list.sort(function (a, b) { var A = prods[a], B = prods[b]; if (INV.sort === 'qty') return (Number(A.quantity) || 0) - (Number(B.quantity) || 0); if (INV.sort === 'value') return (Number(B.quantity) * (Number(B.cost) || Number(B.price)) || 0) - (Number(A.quantity) * (Number(A.cost) || Number(A.price)) || 0); if (INV.sort === 'cover') return cover(a) - cover(b); return (A.name || '').localeCompare(B.name || ''); });
    var pages = Math.max(1, Math.ceil(list.length / INV.size)); if (INV.page > pages) INV.page = pages; var sl = list.slice((INV.page - 1) * INV.size, INV.page * INV.size);
    var opt = function (v, l, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + l + '</option>'; };
    return '<div class="box"><div class="box-hd"><h3>Stock levels (' + list.length + ')</h3></div><div class="iv-bar"><input id="iv-q" placeholder="Search name, SKU, barcode, supplier…" value="' + esc(INV.q) + '" oninput="ivSet(\'q\',this.value)">'
      + '<select onchange="ivSet(\'cat\',this.value)"><option value="">All categories</option>' + Object.keys(cats).sort().map(function (c) { return opt(esc(c), esc(c), INV.cat); }).join('') + '</select>'
      + '<select onchange="ivSet(\'st\',this.value)">' + opt('', 'Any status', INV.st) + opt('attention', '⚠ Needs attention (low + out)', INV.st) + opt('low', 'Low stock', INV.st) + opt('out', 'Out of stock', INV.st) + opt('slow', 'No sales in 30 days', INV.st) + opt('expiring', 'Expiring ≤ 30 days', INV.st) + opt('ok', 'Healthy', INV.st) + '</select>'
      + '<select onchange="ivSet(\'sort\',this.value)">' + opt('name', 'Sort: Name', INV.sort) + opt('qty', 'Sort: Lowest stock', INV.sort) + opt('cover', 'Sort: Least days of cover', INV.sort) + opt('value', 'Sort: Highest value', INV.sort) + '</select></div>'
      + '<div style="overflow-x:auto"><table><thead><tr><th>Product</th><th>SKU / Barcode</th><th>Cost</th><th>Price</th><th style="text-align:center">On hand</th><th style="text-align:center">Reorder at</th><th>Value</th><th>Sold 30d</th><th>Cover</th><th>Status</th><th></th></tr></thead><tbody>'
      + (sl.length ? sl.map(function (k) {
        var p = prods[k], qn = Number(p.quantity) || 0, s = stateOf(p, k), b = BADGE[s], sd = (INV.sales[k] || {}).d30 || 0, cv = cover(k), ed = expDays(p);
        return '<tr><td style="min-width:180px"><div style="display:flex;gap:9px;align-items:center">' + (p.image ? '<img class="iv-th" src="' + esc(p.image) + '" loading="lazy">' : '<div class="iv-th">📦</div>') + '<div><b style="font-size:12px">' + esc(p.name) + '</b><div style="font-size:10px;color:var(--ink3)">' + esc(p.category || '') + (ed !== null && ed <= 30 ? ' · <span style="color:#b45309;font-weight:700">' + (ed < 0 ? 'EXPIRED' : 'exp ' + ed + 'd') + '</span>' : '') + '</div></div></div></td>'
          + '<td style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--ink3)">' + esc(p.sku || '—') + '<br>' + esc(p.barcode || '') + '</td><td style="font-size:11px">' + (p.cost ? money(p.cost) : '<span style="color:var(--ink4)">—</span>') + '</td><td style="font-size:11px">' + money(p.price) + '</td>'
          + '<td style="text-align:center;font-weight:800;font-size:14px">' + qn + '</td><td style="text-align:center;color:var(--ink3)">' + rpOf(p) + '</td><td style="font-size:11px">' + money(qn * (Number(p.cost) || Number(p.price) || 0)) + '</td><td style="font-size:11px">' + sd + '</td><td style="font-size:11px">' + (cv === Infinity ? '—' : Math.round(cv) + 'd') + '</td><td><span class="stk ' + b[1] + '">' + b[0] + '</span></td>'
          + '<td style="white-space:nowrap"><button class="iv-mini pri" onclick="ivReceive(\'' + k + '\')">＋ Receive</button> <button class="iv-mini" onclick="ivAdjust(\'' + k + '\')">Adjust</button> <button class="iv-mini" onclick="ivHistory(\'' + k + '\')">History</button></td></tr>';
      }).join('') : '<tr class="empty-row"><td colspan="11">' + (keys.length ? 'No products match' : 'No products yet — add or import some first') + '</td></tr>')
      + '</tbody></table></div><div class="pg-bar" style="display:flex;justify-content:space-between;padding:12px 16px;font-size:12px;color:var(--ink3)"><span>' + list.length + ' products</span><span><button class="btn btn-grey btn-sm" ' + (INV.page <= 1 ? 'disabled' : '') + ' onclick="INV_pg(-1)">‹</button> Page ' + INV.page + '/' + pages + ' <button class="btn btn-grey btn-sm" ' + (INV.page >= pages ? 'disabled' : '') + ' onclick="INV_pg(1)">›</button></span></div></div>';
  }
  window.INV_pg = function (d) { INV.page += d; ivRender(); };
  function cover(k) { var v = vel(k), q = Number(prods[k].quantity) || 0; return v > 0 ? q / v : Infinity; }

  /* ── tab: reorder ── */
  function suggestion(k) { var p = prods[k], q = Number(p.quantity) || 0, v = vel(k), target = Math.max(rpOf(p) * 2, Math.ceil(v * 21)); return Math.max(0, Math.ceil(target - q)); }
  function reorderTab(keys) {
    var need = keys.filter(function (k) { var s = stateOf(prods[k], k); return s === 'low' || s === 'out' || (cover(k) < 7 && (Number(prods[k].quantity) || 0) > 0); });
    var groups = {}; need.forEach(function (k) { var s = prods[k].supplier || 'No supplier set'; (groups[s] = groups[s] || []).push(k); });
    var total = 0; need.forEach(function (k) { total += suggestion(k) * (Number(prods[k].cost) || 0); });
    if (!need.length) return '<div class="box" style="padding:40px;text-align:center;color:var(--ink3)"><div style="font-size:40px">✅</div><b>Nothing needs reordering</b><div style="font-size:12px;margin-top:4px">Everything is above its reorder point and has more than a week of cover.</div></div>';
    return '<div class="box"><div class="box-hd"><h3>Suggested reorder — ' + need.length + ' products · est. ' + money(total) + '</h3><span><button class="btn btn-grey btn-sm" onclick="ivCopyReorder()">📋 Copy for WhatsApp</button> <button class="btn btn-grey btn-sm" onclick="ivPrintReorder()">🖨 Print</button></span></div><div style="padding:0 16px 14px;font-size:11px;color:var(--ink3)">Suggested quantity brings each product to the larger of 2× its reorder point or 3 weeks of sales (based on the last 30 days).</div>'
      + Object.keys(groups).sort().map(function (g) { return '<div style="padding:0 16px"><div style="font-size:12px;font-weight:800;margin:10px 0 6px">🏭 ' + esc(g) + '</div><table><thead><tr><th>Product</th><th>On hand</th><th>Sold 30d</th><th>Suggest order</th><th>Est. cost</th><th></th></tr></thead><tbody>' + groups[g].map(function (k) { var p = prods[k], sg = suggestion(k); return '<tr><td><b style="font-size:12px">' + esc(p.name) + '</b></td><td>' + (Number(p.quantity) || 0) + '</td><td>' + (((INV.sales[k] || {}).d30) || 0) + '</td><td style="font-weight:800">' + sg + '</td><td>' + (p.cost ? money(sg * p.cost) : '—') + '</td><td><button class="iv-mini pri" onclick="ivReceive(\'' + k + '\',' + sg + ')">Receive</button></td></tr>'; }).join('') + '</tbody></table></div>'; }).join('') + '<div style="height:12px"></div></div>';
  }
  function reorderText() {
    var keys = Object.keys(prods).filter(function (k) { var s = stateOf(prods[k], k); return s === 'low' || s === 'out' || (cover(k) < 7 && (Number(prods[k].quantity) || 0) > 0); }), g = {};
    keys.forEach(function (k) { var s = prods[k].supplier || 'Supplier'; (g[s] = g[s] || []).push(k); });
    return { g: g, text: Object.keys(g).map(function (s) { return '*' + s + '*\n' + g[s].map(function (k) { return '• ' + prods[k].name + ' — ' + suggestion(k) + (prods[k].unit && prods[k].unit !== 'piece' ? ' ' + prods[k].unit : ''); }).join('\n'); }).join('\n\n') };
  }
  window.ivCopyReorder = function () { var t = 'Order request — ' + (localStorage.getItem('qc_biz_name') || '') + '\n\n' + reorderText().text; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('📋 Copied — paste into WhatsApp'); }).catch(function () { QC.text('Copy and paste into WhatsApp', t); }); };
  window.ivPrintReorder = function () { var r = reorderText(), w = window.open('', '_blank'); if (!w) return; w.document.write('<!doctype html><title>Reorder list</title><body style="font-family:Arial;max-width:700px;margin:30px auto"><h2>Purchase list · ' + new Date().toLocaleDateString('en-NG') + '</h2>' + Object.keys(r.g).map(function (s) { return '<h3>' + esc(s) + '</h3><table style="width:100%;border-collapse:collapse">' + r.g[s].map(function (k) { return '<tr><td style="padding:6px;border-bottom:1px solid #ddd">' + esc(prods[k].name) + '</td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right"><b>' + suggestion(k) + '</b></td></tr>'; }).join('') + '</table>'; }).join('') + '<script>setTimeout(print,300)<\/script>'); w.document.close(); };

  /* ── tab: movements ── */
  function movesTab() {
    var cut = INV.mv.range === 'all' ? 0 : Date.now() - Number(INV.mv.range) * DAY, q = (INV.mv.q || '').toLowerCase();
    var all = INV.saleRows.concat(INV.ledger).filter(function (m) { return m.at >= cut && (!INV.mv.type || m.type === INV.mv.type || (INV.mv.type === 'adjust' && ['adjust', 'damaged', 'expired', 'lost', 'found', 'correction'].indexOf(m.type) > -1)) && (!q || ((m.product || '') + ' ' + (m.ref || '') + ' ' + (m.by || '')).toLowerCase().indexOf(q) > -1); }).sort(function (a, b) { return b.at - a.at; });
    INV._mv = all; var sl = all.slice(0, 300), o = function (v, l) { return '<option value="' + v + '"' + (INV.mv.type === v ? ' selected' : '') + '>' + l + '</option>'; }, r = function (v, l) { return '<option value="' + v + '"' + (INV.mv.range === v ? ' selected' : '') + '>' + l + '</option>'; };
    return '<div class="box"><div class="box-hd"><h3>Movement history (' + all.length + ')</h3><button class="btn btn-grey btn-sm" onclick="ivExportMoves()">⬇ Export</button></div><div class="iv-bar"><input id="iv-mq" placeholder="Search product, ref, person…" value="' + esc(INV.mv.q) + '" oninput="INV.mv.q=this.value;ivRender(true)"><select onchange="INV.mv.type=this.value;ivRender()">' + o('', 'All movements') + o('sale', 'Sales') + o('return', 'Returns') + o('receive', 'Goods received') + o('adjust', 'Adjustments') + o('count', 'Stock counts') + '</select><select onchange="INV.mv.range=this.value;ivRender()">' + r('7', 'Last 7 days') + r('30', 'Last 30 days') + r('90', 'Last 90 days') + r('all', 'All time') + '</select></div>'
      + '<div style="overflow-x:auto"><table><thead><tr><th>When</th><th>Product</th><th>Type</th><th style="text-align:center">Change</th><th style="text-align:center">Balance</th><th>Ref / reason</th><th>By</th></tr></thead><tbody>'
      + (sl.length ? sl.map(function (m) { var ch = Number(m.change) || 0, rs = m.reason ? (REASONS.filter(function (x) { return x[0] === m.reason; })[0] || [0, m.reason])[1] : ''; return '<tr><td style="font-size:11px;white-space:nowrap">' + (m.at ? new Date(m.at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '') + '</td><td style="font-size:12px;font-weight:600">' + esc(m.product || '') + '</td><td style="font-size:11px">' + esc(TYPE_L[m.type] || m.type) + '</td><td style="text-align:center;font-weight:800;color:' + (ch < 0 ? '#d6336c' : '#0a9d6b') + '">' + (ch > 0 ? '+' : '') + ch + '</td><td style="text-align:center;font-size:11px;color:var(--ink3)">' + (m.after != null ? m.after : '—') + '</td><td style="font-size:11px;color:var(--ink3)">' + esc(m.ref || '') + (rs ? ' ' + esc(rs) : '') + (m.supplier ? ' · ' + esc(m.supplier) : '') + (m.note ? ' — ' + esc(m.note) : '') + '</td><td style="font-size:11px">' + esc(m.by || '') + '</td></tr>'; }).join('') : '<tr class="empty-row"><td colspan="7">No movements in this period</td></tr>') + '</tbody></table></div>' + (all.length > 300 ? '<div style="padding:10px 16px;font-size:11px;color:var(--ink3)">Showing latest 300 — export for the full list.</div>' : '') + '</div>';
  }
  window.INV = INV; window.ivRender = ivRender; // used by inline handlers
  window.ivExportMoves = function () { var rows = [['When', 'Product', 'Type', 'Change', 'Balance after', 'Ref', 'Reason', 'Supplier', 'Note', 'By']].concat((INV._mv || []).map(function (m) { return [m.at ? new Date(m.at).toISOString() : '', m.product, TYPE_L[m.type] || m.type, m.change, m.after != null ? m.after : '', m.ref || '', m.reason || '', m.supplier || '', m.note || '', m.by || '']; })); dlCsv('stock-movements-' + new Date().toISOString().slice(0, 10) + '.csv', rows); };
  function dlCsv(name, rows) { var t = rows.map(function (r) { return r.map(function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n'); var b = new Blob(['\uFEFF' + t], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); }
  window.exportInventoryCSV = function () { var keys = Object.keys(prods || {}); if (!keys.length) { toast('No data'); return; } dlCsv('inventory-valuation-' + new Date().toISOString().slice(0, 10) + '.csv', [['Name', 'SKU', 'Barcode', 'Category', 'Supplier', 'Cost', 'Price', 'On hand', 'Reorder point', 'Value at cost', 'Value at retail', 'Sold 30d', 'Status']].concat(keys.map(function (k) { var p = prods[k], q = Number(p.quantity) || 0; return [p.name, p.sku || '', p.barcode || '', p.category || '', p.supplier || '', p.cost || 0, p.price || 0, q, rpOf(p), q * (p.cost || 0), q * (p.price || 0), ((INV.sales[k] || {}).d30) || 0, BADGE[stateOf(p, k)][0]]; }))); };

  /* ── modals ── */
  function box(html) { shell(); $('iv-box').innerHTML = html; $('iv-bg').classList.add('on'); }
  window.openInvEdit = function (k) { ivAdjust(k); };
  window.ivHistory = async function (k) {
    await loadSales(); var p = prods[k] || {}, rows = INV.saleRows.concat(INV.ledger).filter(function (m) { return m.productKey === k; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 100);
    box('<div class="iv-hd"><div><h3>' + esc(p.name) + '</h3><div style="font-size:12px;color:var(--ink3);margin-top:3px">On hand: <b>' + (Number(p.quantity) || 0) + '</b> · sold last 30d: ' + (((INV.sales[k] || {}).d30) || 0) + '</div></div><button class="btn btn-grey btn-sm" onclick="ivClose()">✕</button></div><div class="iv-bd"><table><thead><tr><th>When</th><th>Type</th><th>Change</th><th>Ref / reason</th><th>By</th></tr></thead><tbody>' + (rows.length ? rows.map(function (m) { var ch = Number(m.change) || 0; return '<tr><td style="font-size:11px">' + new Date(m.at).toLocaleString('en-NG') + '</td><td style="font-size:11px">' + esc(TYPE_L[m.type] || m.type) + '</td><td style="font-weight:800;color:' + (ch < 0 ? '#d6336c' : '#0a9d6b') + '">' + (ch > 0 ? '+' : '') + ch + '</td><td style="font-size:11px;color:var(--ink3)">' + esc(m.ref || m.reason || '') + (m.note ? ' — ' + esc(m.note) : '') + '</td><td style="font-size:11px">' + esc(m.by || '') + '</td></tr>'; }).join('') : '<tr class="empty-row"><td colspan="5">No recorded movements yet</td></tr>') + '</tbody></table></div>');
  };
  window.ivAdjust = function (k) {
    var p = prods[k]; if (!p) return;
    box('<div class="iv-hd"><div><h3>Adjust stock</h3><div style="font-size:12px;color:var(--ink3);margin-top:3px">' + esc(p.name) + ' — currently <b>' + (Number(p.quantity) || 0) + '</b></div></div><button class="btn btn-grey btn-sm" onclick="ivClose()">✕</button></div><div class="iv-bd"><div class="iv-f">'
      + '<div><label>Action</label><select id="ad-mode" onchange="ivAdPreview()"><option value="set">Set stock to…</option><option value="add">Add…</option><option value="remove">Remove…</option></select></div><div><label>Quantity</label><input type="number" id="ad-qty" min="0" value="' + (Number(p.quantity) || 0) + '" oninput="ivAdPreview()"></div>'
      + '<div><label>Reason</label><select id="ad-reason">' + REASONS.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + '</option>'; }).join('') + '</select></div><div><label>Reorder point</label><input type="number" id="ad-rp" min="0" value="' + rpOf(p) + '"></div>'
      + '<div style="grid-column:1/-1"><label>Note</label><input id="ad-note" placeholder="e.g. 2 cartons water-damaged in store room"></div></div><div id="ad-prev" style="margin:12px 0;font-size:13px;font-weight:700"></div><div style="display:flex;gap:8px"><button class="btn btn-orange" onclick="ivAdSave(\'' + k + '\')">💾 Save adjustment</button><button class="btn btn-grey" onclick="ivClose()">Cancel</button></div></div>'); INV._ad = k; ivAdPreview();
  };
  function adTarget() { var p = prods[INV._ad], cur = Number(p.quantity) || 0, v = Math.max(0, Number($('ad-qty').value) || 0), m = $('ad-mode').value; return m === 'set' ? v : m === 'add' ? cur + v : Math.max(0, cur - v); }
  window.ivAdPreview = function () { var p = prods[INV._ad]; if (!p || !$('ad-prev')) return; var cur = Number(p.quantity) || 0, t = adTarget(), d = t - cur; $('ad-prev').innerHTML = cur + ' → <span style="color:' + (d < 0 ? '#d6336c' : d > 0 ? '#0a9d6b' : 'inherit') + '">' + t + '</span> (' + (d > 0 ? '+' : '') + d + ' · ' + money(Math.abs(d) * (Number(p.cost) || Number(p.price) || 0)) + ')'; };
  window.ivAdSave = async function (k) {
    var p = prods[k], cur = Number(p.quantity) || 0, t = adTarget(), d = t - cur, rp = Math.max(0, Number($('ad-rp').value) || 0);
    try {
      var after = cur; if (d !== 0) { after = await incr(k, d); await log({ type: $('ad-reason').value === 'damaged' || $('ad-reason').value === 'expired' || $('ad-reason').value === 'lost' || $('ad-reason').value === 'found' ? $('ad-reason').value : 'adjust', productKey: k, product: p.name, before: cur, after: after, change: d, reason: $('ad-reason').value, note: $('ad-note').value.trim(), ref: 'Manual adjustment' }); }
      if (rp !== rpOf(p)) { await fetch(DB + '/' + encodeURIComponent(k) + '/reorderPoint.json', { method: 'PUT', headers: H, body: JSON.stringify(rp) }); prods[k].reorderPoint = rp; }
      ivClose(); toast('✅ Stock updated' + (d ? ' (' + (d > 0 ? '+' : '') + d + ')' : '')); ivRender();
    } catch (e) { toast('❌ ' + e.message); }
  };
  window.saveInventoryUpdate = function () {};

  /* Receive stock (goods received note) */
  var RC = { lines: [] };
  window.ivReceive = function (k, qty) {
    RC.lines = []; if (k && prods[k]) RC.lines.push({ k: k, qty: qty || 1, cost: Number(prods[k].cost) || 0, expiry: prods[k].expiry || '' });
    box('<div class="iv-hd"><div><h3>Receive stock</h3><div style="font-size:12px;color:var(--ink3);margin-top:3px">Record goods coming in — scan or search each product</div></div><button class="btn btn-grey btn-sm" onclick="ivClose()">✕</button></div><div class="iv-bd"><div class="iv-f"><div><label>Supplier</label><input id="rc-sup" list="rc-suplist" placeholder="e.g. Dangote Distributors" value="' + esc(k && prods[k] ? prods[k].supplier || '' : '') + '"><datalist id="rc-suplist">' + supplierList() + '</datalist></div><div><label>Invoice / waybill no.</label><input id="rc-ref" placeholder="optional"></div></div>'
      + '<div style="position:relative;margin:14px 0 8px"><input id="rc-find" autocomplete="off" placeholder="📷 Scan barcode or type product name / SKU…" style="width:100%;padding:11px 14px;border:1.5px solid var(--accent);border-radius:12px;font-size:13px" oninput="ivRcFind(this.value)" onkeydown="if(event.key===\'Enter\'){ivRcEnter(this.value);event.preventDefault()}"><div id="rc-sugg" class="iv-sugg" style="display:none"></div></div><div id="rc-lines" class="iv-lines"></div>'
      + '<label style="display:flex;gap:7px;align-items:center;font-size:12px;margin:12px 0;font-weight:600"><input type="checkbox" id="rc-upcost" checked> Update product cost price when it differs</label><div style="display:flex;gap:8px"><button class="btn btn-orange" onclick="ivRcSave()">✅ Add to stock</button><button class="btn btn-grey" onclick="ivClose()">Cancel</button></div></div>'); rcRender(); setTimeout(function () { var f = $('rc-find'); if (f) f.focus(); }, 60);
  };
  function supplierList() { var s = {}; Object.keys(prods).forEach(function (k) { if (prods[k].supplier) s[prods[k].supplier] = 1; }); return Object.keys(s).map(function (x) { return '<option value="' + esc(x) + '">'; }).join(''); }
  function search(q) { q = String(q || '').toLowerCase().trim(); if (!q) return []; return Object.keys(prods).filter(function (k) { var p = prods[k]; return ((p.name || '') + ' ' + (p.sku || '') + ' ' + (p.barcode || '')).toLowerCase().indexOf(q) > -1; }).slice(0, 8); }
  window.ivRcFind = function (v) { var r = search(v), s = $('rc-sugg'); if (!r.length || String(v).length < 2) { s.style.display = 'none'; return; } s.style.display = 'block'; s.innerHTML = r.map(function (k) { return '<div onclick="ivRcAdd(\'' + k + '\')"><b>' + esc(prods[k].name) + '</b> <span style="color:var(--ink3)">· ' + esc(prods[k].sku || prods[k].barcode || '') + ' · stock ' + (Number(prods[k].quantity) || 0) + '</span></div>'; }).join(''); };
  window.ivRcEnter = function (v) { v = String(v).trim().toLowerCase(); var ex = Object.keys(prods).filter(function (k) { return String(prods[k].barcode || '').toLowerCase() === v || String(prods[k].sku || '').toLowerCase() === v; }); var hit = ex.length ? ex[0] : (search(v).length === 1 ? search(v)[0] : null); if (hit) ivRcAdd(hit); else toast(search(v).length > 1 ? 'Several matches — pick one below' : '❌ No product matches "' + v + '"'); };
  window.ivRcAdd = function (k) { var l = RC.lines.filter(function (x) { return x.k === k; })[0]; if (l) l.qty++; else RC.lines.push({ k: k, qty: 1, cost: Number(prods[k].cost) || 0, expiry: prods[k].expiry || '' }); var f = $('rc-find'); f.value = ''; $('rc-sugg').style.display = 'none'; rcRender(); f.focus(); };
  window.ivRcSet = function (i, f, v) { RC.lines[i][f] = f === 'expiry' ? v : Math.max(0, Number(v) || 0); rcTotal(); };
  window.ivRcDel = function (i) { RC.lines.splice(i, 1); rcRender(); };
  function rcTotal() { var t = RC.lines.reduce(function (s, l) { return s + l.qty * l.cost; }, 0), u = RC.lines.reduce(function (s, l) { return s + l.qty; }, 0), e = $('rc-total'); if (e) e.textContent = u + ' units · ' + money(t); }
  function rcRender() { $('rc-lines').innerHTML = RC.lines.length ? '<table><thead><tr><th>Product</th><th>Qty</th><th>Unit cost ₦</th><th>Expiry</th><th></th></tr></thead><tbody>' + RC.lines.map(function (l, i) { var p = prods[l.k]; return '<tr><td style="font-size:12px;font-weight:600">' + esc(p.name) + '<div style="font-size:10px;color:var(--ink3)">now ' + (Number(p.quantity) || 0) + '</div></td><td><input type="number" min="1" value="' + l.qty + '" oninput="ivRcSet(' + i + ',\'qty\',this.value)"></td><td><input type="number" min="0" value="' + l.cost + '" oninput="ivRcSet(' + i + ',\'cost\',this.value)"></td><td><input type="date" style="width:130px" value="' + esc(l.expiry || '') + '" onchange="ivRcSet(' + i + ',\'expiry\',this.value)"></td><td><button class="iv-mini" onclick="ivRcDel(' + i + ')">✕</button></td></tr>'; }).join('') + '</tbody></table><div id="rc-total" style="text-align:right;font-weight:800;margin-top:8px"></div>' : '<div style="padding:18px;text-align:center;color:var(--ink3);font-size:12px;border:1.5px dashed var(--border);border-radius:14px">No products yet — scan a barcode or search above</div>'; rcTotal(); }
  window.ivRcSave = async function () {
    if (!RC.lines.length) { toast('Add at least one product'); return; } var sup = $('rc-sup').value.trim(), ref = $('rc-ref').value.trim(), up = $('rc-upcost').checked, n = 0;
    try {
      for (var i = 0; i < RC.lines.length; i++) {
        var l = RC.lines[i], p = prods[l.k]; if (!l.qty) continue; var before = Number(p.quantity) || 0, after = await incr(l.k, l.qty), patch = {};
        if (up && l.cost && l.cost !== Number(p.cost)) patch.cost = l.cost; if (sup) patch.supplier = sup; if (l.expiry) patch.expiry = l.expiry; patch.lastReceivedAt = new Date().toISOString();
        await fetch(DB + '/' + encodeURIComponent(l.k) + '.json', { method: 'PATCH', headers: H, body: JSON.stringify(patch) }); Object.assign(prods[l.k], patch);
        await log({ type: 'receive', productKey: l.k, product: p.name, before: before, after: after, change: l.qty, ref: ref || 'Goods received', supplier: sup, cost: l.cost }); n += l.qty;
      }
      ivClose(); toast('✅ ' + n + ' units added to stock'); ivRender();
    } catch (e) { toast('❌ ' + e.message + ' — some lines may already be saved; check History'); }
  };

  window.loadSalesForStock = loadSales;
})();
} catch (e) { if (window.console) console.error("[admin-inventory.js]", e); }

/* ═══ admin-count.js ═══ */
try {
/* QuickCart admin — Stock Count upgrade (loaded after admin.html + admin-inventory.js).
   Keeps the existing draft/autosave/history storage, and replaces the start screen, grid, review and apply steps.
   KEY FIX: the old code applied (counted − snapshot) as an increment, so any sale made BEFORE a shelf was counted
   was deducted twice. Each line now carries its own count time; at apply we set
       final stock = counted + (every movement recorded after that line was counted)
   so sales/receipts during a count are never lost or double-counted. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var H = { 'Content-Type': 'application/json' };
  var money = function (n) { return '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG'); };
  var sgn = function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); };
  var REASONS = [['', 'Unexplained'], ['miscount', 'Miscount / recounted'], ['theft', 'Theft / loss'], ['damaged', 'Damaged'], ['expired', 'Expired'], ['supplier', 'Supplier short/over delivery'], ['unrecorded-sale', 'Unrecorded sale'], ['found', 'Found / misplaced stock'], ['other', 'Other']];
  var TYPES = [['all', 'Full count — everything'], ['category', 'By category'], ['abc', 'High-value items (top 80% of stock value)'], ['low', 'Low & out-of-stock items'], ['stale', 'Not counted in 90 days (cycle count)'], ['sample', 'Random spot-check (10%)'], ['zero', 'Zero / negative stock check']];
  var unit = function (p) { return Number(p && p.cost) || Number(p && p.price) || 0; };

  var css = document.createElement('style');
  css.textContent = '.sc-opts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:100%;margin-top:12px}.sc-opts label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);display:block;margin-bottom:4px}.sc-opts input,.sc-opts select{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:10px;font-size:12px;font-family:inherit;background:#fff}'
    + '.rv-k{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.rv-k div{background:var(--grey1);border-radius:14px;padding:11px 13px}.rv-k b{display:block;font-size:17px;font-weight:800;letter-spacing:-.02em}.rv-k span{font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em}'
    + '#cr-bg{position:fixed;inset:0;background:rgba(20,18,26,.55);backdrop-filter:blur(6px);z-index:9100;display:none;align-items:center;justify-content:center;padding:14px}#cr-bg.on{display:flex}#cr-box{background:#fff;border-radius:22px;width:980px;max-width:100%;max-height:94vh;overflow:auto;box-shadow:0 30px 80px rgba(20,18,26,.3)}'
    + '.cr-hd{padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between}.cr-hd h3{margin:0;font-size:18px;font-weight:800;letter-spacing:-.02em}.cr-bd{padding:18px 22px}.cr-ft{padding:14px 22px;border-top:1px solid var(--border);background:#faf7f2;display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
    + '.cr-appr{background:#fff8f0;border:1.5px solid #fde1c8;border-radius:14px;padding:12px 14px;margin-top:12px;font-size:12px}.cr-appr input[type=text]{padding:8px 10px;border:1px solid var(--border);border-radius:9px;font-size:12px;margin-left:6px}'
    + '.sc-tag{font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;background:rgba(245,158,11,.16);color:#b45309;margin-left:5px}.sc-sel{padding:5px;border:1px solid var(--border);border-radius:8px;font-size:11px;max-width:150px}'
    + '@media(max-width:900px){.sc-opts{grid-template-columns:1fr 1fr}.rv-k{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(css);

  /* ── start screen ── */
  function wireStart() {
    var row = $('sc-start-row'); if (!row || $('sc-type')) return;
    var left = row.firstElementChild, right = row.lastElementChild; right.innerHTML = '<button class="btn btn-orange" onclick="startCountSession()">▶ Start count</button>';
    left.querySelector('p').innerHTML = 'Choose what to count. Staff can scan or type quantities; sales made while you count are handled automatically.';
    row.insertAdjacentHTML('beforeend', '<div class="sc-opts"><div><label>Count name</label><input id="sc-name" placeholder="e.g. Month-end — main shelf"></div><div><label>Count type</label><select id="sc-type" onchange="scTypeChange()">' + TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></div><div id="sc-scope-wrap"><label>Category</label><select id="sc-scope"><option value="">All categories</option></select></div><div><label>Approval needed above (₦)</label><input type="number" id="sc-thresh" min="0" value="' + (localStorage.getItem('qc_count_thresh') || 50000) + '"></div>'
      + '<div style="grid-column:1/-1;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><label style="display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;font-size:12px;font-weight:600;margin:0"><input type="checkbox" id="sc-blind" style="width:auto"> Blind count (hide system quantity so staff count honestly)</label><button class="btn btn-grey btn-sm" onclick="scPrintSheet(true)">🖨 Print blank count sheet</button><button class="btn btn-grey btn-sm" onclick="scPrintSheet(false)">🖨 Sheet with system qty</button></div></div>');
    // the original start row had scope + blind in the right block; hide the category picker unless needed
    scTypeChange();
    // active-session toolbar: camera + undo + recount filter
    var scan = $('sc-scan'); if (scan && !$('sc-cam')) { scan.insertAdjacentHTML('afterend', '<button class="btn btn-grey btn-sm" id="sc-cam" onclick="scCam()">📷 Camera</button><button class="btn btn-grey btn-sm" onclick="scUndo()">↶ Undo scan</button><button class="btn btn-grey btn-sm" onclick="scPrintSheet(!_cs.blind,true)">🖨 Sheet</button>'); scan.placeholder = '📷 Scan barcode or type SKU/name, press Enter (+1 each)'; }
    var sh = $('sc-show'); if (sh && !Array.from(sh.options).some(function (o) { return o.value === 'recount'; })) sh.add(new Option('Needs recount', 'recount'));
    var hh = document.querySelector('#count-history-tbl'); if (hh) { var th = hh.closest('table').querySelector('thead tr'); if (th) th.innerHTML = '<th>Date</th><th>Name</th><th>Items</th><th>Accuracy</th><th>Variances</th><th>Value</th><th>By / approved</th><th>Status</th><th></th>'; }
  }
  window.scTypeChange = function () { var t = $('sc-type'), w = $('sc-scope-wrap'); if (w && t) { w.style.display = t.value === 'category' ? '' : 'none'; if (t.value === 'category') csFillCats(); } };

  function pickKeys(type, scope) {
    var keys = Object.keys(prods || {}), q = function (k) { return Math.max(0, Number(prods[k].quantity) || 0); };
    if (type === 'category') return keys.filter(function (k) { return !scope || prods[k].category === scope; });
    if (type === 'low') return keys.filter(function (k) { var n = Number(prods[k].quantity) || 0, rp = prods[k].reorderPoint != null && prods[k].reorderPoint !== '' ? Number(prods[k].reorderPoint) : 5; return n <= rp; });
    if (type === 'zero') return keys.filter(function (k) { return (Number(prods[k].quantity) || 0) <= 0; });
    if (type === 'stale') return keys.filter(function (k) { var t = Date.parse(prods[k].lastCountedAt || ''); return !t || Date.now() - t > 90 * 864e5; });
    if (type === 'sample') { var a = keys.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a.slice(0, Math.max(Math.min(20, a.length), Math.ceil(a.length * 0.1))); }
    if (type === 'abc') { var s = keys.map(function (k) { return [k, q(k) * unit(prods[k])]; }).sort(function (a, b) { return b[1] - a[1]; }), tot = s.reduce(function (t, x) { return t + x[1]; }, 0), run = 0, out = []; for (var n = 0; n < s.length; n++) { out.push(s[n][0]); run += s[n][1]; if (tot && run / tot >= 0.8 && out.length >= 10) break; } return out; }
    return keys;
  }

  window.startCountSession = async function () {
    if (!Object.keys(prods || {}).length) { try { await loadProds(); } catch (e) {} }
    var type = $('sc-type').value, scope = type === 'category' ? $('sc-scope').value : '', blind = $('sc-blind').checked, th = Math.max(0, Number($('sc-thresh').value) || 0);
    var keys = pickKeys(type, scope); if (!keys.length) { toast('Nothing to count for that selection'); return; }
    localStorage.setItem('qc_count_thresh', th); var rows = {};
    keys.forEach(function (k) { rows[k] = { sys: Number(prods[k].quantity) || 0, phys: null, note: '', at: 0, reason: '' }; });
    var now = Date.now(); _cs = { id: 'cnt_' + now, date: new Date(now).toISOString(), startedAt: now, name: ($('sc-name').value || '').trim(), type: type, scope: scope, blind: blind, thresh: th, rows: rows, by: csWho() };
    _csFilter = { q: '', cat: '', show: 'all' }; csOpen(); toast('Count started — ' + keys.length + ' items. Scan or type quantities.');
  };
  var _open = window.csOpen;
  window.csOpen = function () { if (_cs) { if (!_cs.startedAt) _cs.startedAt = Date.parse(_cs.date) || Date.now(); if (_cs.thresh == null) _cs.thresh = Number(localStorage.getItem('qc_count_thresh')) || 0; } _open(); var m = $('sc-session-mode'); if (m && _cs) m.textContent = '· ' + (_cs.name ? _cs.name + ' · ' : '') + ((TYPES.filter(function (t) { return t[0] === _cs.type; })[0] || [0, _cs.scope || 'All'])[1]).split(' — ')[0] + (_cs.blind ? ' · Blind' : ''); wireGrid(); csRender(); };
  function wireGrid() { var th = $('count-tbl') && $('count-tbl').closest('table').querySelector('thead tr'); if (th) th.innerHTML = '<th>Product</th><th>SKU / Barcode</th><th id="sc-th-sys"' + (_cs && _cs.blind ? ' style="display:none"' : '') + '>System</th><th>Counted</th><th>Variance</th><th>Value</th><th>Reason</th><th>Note</th>'; }

  /* ── grid ── */
  var rowVar = function (r) { return r.phys === null || r.phys === undefined ? null : r.phys - r.sys; };
  window.csRender = function () {
    if (!_cs) return; wireGrid(); var q = (_csFilter.q || '').toLowerCase(), html = '', shown = 0;
    Object.keys(_cs.rows).forEach(function (k) {
      var p = prods[k] || {}, r = _cs.rows[k], v = rowVar(r);
      if (_csFilter.cat && p.category !== _csFilter.cat) return; if (q && ((p.name || '') + ' ' + (p.sku || '') + ' ' + (p.barcode || '') + ' ' + (p.brand || '')).toLowerCase().indexOf(q) < 0) return;
      if (_csFilter.show === 'uncounted' && r.phys !== null) return; if (_csFilter.show === 'counted' && r.phys === null) return; if (_csFilter.show === 'var' && (v === null || v === 0)) return; if (_csFilter.show === 'recount' && !r.recount) return;
      if (++shown > 400) return;
      var vc = v === null ? 'var(--ink3)' : v === 0 ? 'var(--green)' : v > 0 ? '#171717' : 'var(--red)';
      html += '<tr data-k="' + esc(k) + '"><td><strong style="font-size:12px">' + esc(p.name || '—') + '</strong>' + (r.recount ? '<span class="sc-tag">RECOUNT' + (r.first != null ? ' · 1st: ' + r.first : '') + '</span>' : '') + '<div style="font-size:10px;color:var(--ink3)">' + esc(p.category || '') + '</div></td><td style="font-size:10px;color:var(--ink3);font-family:\'DM Mono\',monospace">' + esc(p.sku || '') + '<br>' + esc(p.barcode || '') + '</td>'
        + (_cs.blind ? '' : '<td style="font-weight:700">' + r.sys + '</td>') + '<td><input type="number" min="0" class="sc-in" value="' + (r.phys === null || r.phys === undefined ? '' : r.phys) + '" placeholder="—" onfocus="this.select()" oninput="csInput(this)" style="width:80px;border:1px solid var(--border);border-radius:8px;padding:6px;font-size:13px;text-align:center;font-weight:700;outline:none"></td>'
        + '<td class="sc-v" style="font-weight:800;color:' + vc + '">' + (v === null ? '—' : sgn(v)) + '</td><td class="sc-vv" style="font-size:11px;color:' + vc + '">' + (v ? money(Math.abs(v) * unit(p)) : '') + '</td>'
        + '<td>' + (v ? '<select class="sc-sel" onchange="scReason(this)">' + REASONS.map(function (x) { return '<option value="' + x[0] + '"' + (r.reason === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' : '') + '</td>'
        + '<td><input type="text" class="sc-nt" value="' + esc(r.note) + '" placeholder="note" oninput="csNote(this)" style="width:120px;border:1px solid var(--border);border-radius:8px;padding:6px;font-size:11px;outline:none"></td></tr>';
    });
    $('count-tbl').innerHTML = html || '<tr class="empty-row"><td colspan="8">Nothing matches this filter</td></tr>'; csStats();
  };
  window.csInput = function (el) {
    var k = csRowOf(el); if (!k || !_cs) return; var r = _cs.rows[k]; r.phys = el.value === '' ? null : Math.max(0, Math.floor(Number(el.value) || 0)); r.at = r.phys === null ? 0 : Date.now();
    var v = rowVar(r), tr = el.closest('tr'), prev = !!tr.querySelector('.sc-sel'); tr.querySelector('.sc-v').textContent = v === null ? '—' : sgn(v);
    var vc = v === null ? 'var(--ink3)' : v === 0 ? 'var(--green)' : v > 0 ? '#171717' : 'var(--red)'; tr.querySelector('.sc-v').style.color = vc; var vv = tr.querySelector('.sc-vv'); vv.textContent = v ? money(Math.abs(v) * unit(prods[k])) : ''; vv.style.color = vc;
    if (!!v !== prev) { var cells = tr.children; cells[6].innerHTML = v ? '<select class="sc-sel" onchange="scReason(this)">' + REASONS.map(function (x) { return '<option value="' + x[0] + '"' + (r.reason === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' : ''; }
    csStats(); csAutosave();
  };
  window.scReason = function (el) { var k = csRowOf(el); if (k && _cs) { _cs.rows[k].reason = el.value; csAutosave(); } };
  var scans = [];
  function codeHit(v) {
    v = String(v || '').trim().toLowerCase(); if (!v || !_cs) return null; var keys = Object.keys(_cs.rows);
    var ex = keys.filter(function (k) { var p = prods[k] || {}; return String(p.barcode || '').toLowerCase() === v || String(p.sku || '').toLowerCase() === v; }); if (ex.length) return ex;
    var nm = keys.filter(function (k) { return String((prods[k] || {}).name || '').toLowerCase() === v; }); if (nm.length) return nm;
    return keys.filter(function (k) { return String((prods[k] || {}).name || '').toLowerCase().indexOf(v) > -1; });
  }
  function bump(k) { var r = _cs.rows[k]; scans.push({ k: k, prev: r.phys, prevAt: r.at }); if (scans.length > 80) scans.shift(); r.phys = (r.phys === null || r.phys === undefined ? 0 : r.phys) + 1; r.at = Date.now(); }
  window.csQuick = function (v) {
    if (!_cs) return; var hit = codeHit(v); if (!hit || !hit.length) { toast('❌ No product in this count matches "' + String(v).trim() + '"'); return false; }
    if (hit.length > 1) { _csFilter.q = String(v).trim(); $('sc-search').value = _csFilter.q; csRender(); toast(hit.length + ' matches — type the count on the right row'); return false; }
    bump(hit[0]); if (_csFilter.q || _csFilter.show !== 'all' || _csFilter.cat) { _csFilter = { q: '', cat: '', show: 'all' }; $('sc-search').value = ''; $('sc-cat').value = ''; $('sc-show').value = 'all'; }
    csRender(); var tr = document.querySelector('#count-tbl tr[data-k="' + hit[0].replace(/"/g, '\\"') + '"]'); if (tr) { tr.style.background = '#fff3e0'; tr.scrollIntoView({ block: 'center' }); setTimeout(function () { tr.style.background = ''; }, 900); }
    toast('✓ ' + (prods[hit[0]].name || '') + ' → ' + _cs.rows[hit[0]].phys); csStats(); csAutosave(); return true;
  };
  window.scUndo = function () { var s = scans.pop(); if (!s || !_cs || !_cs.rows[s.k]) { toast('Nothing to undo'); return; } _cs.rows[s.k].phys = s.prev; _cs.rows[s.k].at = s.prevAt || 0; csRender(); csAutosave(); toast('↶ Undid last scan'); };
  window.csAcceptRest = function () { if (!_cs) return; var n = 0, t = Date.now(); Object.keys(_cs.rows).forEach(function (k) { var r = _cs.rows[k]; if (r.phys === null || r.phys === undefined) { r.phys = r.sys; r.at = t; n++; } }); csRender(); csAutosave(); toast('Accepted ' + n + ' uncounted items as matching'); };
  window.csTotals = function () { var t = { total: 0, counted: 0, variances: 0, over: 0, short: 0, value: 0 }; Object.keys(_cs.rows).forEach(function (k) { var r = _cs.rows[k]; t.total++; if (r.phys === null || r.phys === undefined) return; t.counted++; var d = r.phys - r.sys; if (d) { t.variances++; if (d > 0) t.over += d; else t.short += -d; t.value += d * unit(prods[k]); } }); return t; };

  /* camera */
  var CAM = {};
  window.scCam = async function () {
    var m = $('sc-cam-m'); if (!m) { m = document.createElement('div'); m.id = 'sc-cam-m'; m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9500;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px'; document.body.appendChild(m); }
    m.innerHTML = '<video id="sc-cam-v" playsinline muted style="width:min(480px,92vw);border-radius:16px;background:#000"></video><div id="sc-cam-t" style="color:#fff;font-size:13px;text-align:center">Starting camera…</div><button onclick="scCamClose()" style="padding:10px 24px;border-radius:99px;border:none;font-weight:800">Done</button>'; m.style.display = 'flex';
    try {
      CAM.s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }); var v = $('sc-cam-v'); v.srcObject = CAM.s; await v.play(); var last = '', lastAt = 0;
      var hit = function (c) { var n = Date.now(); if (c === last && n - lastAt < 1800) return; last = c; lastAt = n; var ok = csQuick(c); var t = $('sc-cam-t'); if (t) t.textContent = (ok ? '✓ ' : '✗ ') + c + (ok ? ' → ' + (_cs.rows[codeHit(c)[0]] || {}).phys : ''); };
      if ('BarcodeDetector' in window) { var d = new BarcodeDetector(); CAM.t = setInterval(async function () { try { var r = await d.detect(v); if (r[0]) hit(r[0].rawValue); } catch (e) {} }, 220); $('sc-cam-t').textContent = 'Scan each item — every scan adds 1'; }
      else { await new Promise(function (res, rej) { if (window.ZXing) return res(); var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); var rd = new ZXing.BrowserMultiFormatReader(); CAM.z = rd; CAM.t = setInterval(async function () { try { var r = await rd.decodeFromVideoElement(v); if (r) hit(r.getText()); } catch (e) {} }, 300); $('sc-cam-t').textContent = 'Scan each item — every scan adds 1'; }
    } catch (e) { $('sc-cam-t').textContent = 'Camera unavailable: ' + (e.message || e.name) + '. A USB scanner works in the scan box.'; }
  };
  window.scCamClose = function () { clearInterval(CAM.t); if (CAM.z) { try { CAM.z.reset(); } catch (e) {} CAM.z = null; } if (CAM.s) { CAM.s.getTracks().forEach(function (t) { t.stop(); }); CAM.s = null; } var m = $('sc-cam-m'); if (m) m.style.display = 'none'; };

  /* count sheet */
  window.scPrintSheet = function (blind, fromSession) {
    var keys, title;
    if (fromSession && _cs) { keys = Object.keys(_cs.rows); title = _cs.name || 'Stock count'; } else { var t = ($('sc-type') || {}).value || 'all'; keys = pickKeys(t, ($('sc-scope') || {}).value); title = (($('sc-name') || {}).value || 'Stock count sheet'); }
    if (!keys.length) { toast('Nothing to print'); return; }
    var by = {}; keys.forEach(function (k) { (by[prods[k].category || 'Uncategorised'] = by[prods[k].category || 'Uncategorised'] || []).push(k); });
    var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print'); return; }
    w.document.write('<!doctype html><title>' + esc(title) + '</title><style>body{font-family:Arial,sans-serif;margin:18px;font-size:12px}h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:6px 0 16px}td,th{border:1px solid #999;padding:6px 7px;text-align:left}th{background:#eee;font-size:10px;text-transform:uppercase}.box{width:90px}h3{margin:14px 0 2px;font-size:13px;background:#14121a;color:#fff;padding:5px 8px}.sig{margin-top:26px;display:flex;gap:40px}.sig div{border-top:1px solid #000;padding-top:4px;width:200px}</style><h2>' + esc(title) + '</h2><div>' + new Date().toLocaleDateString('en-NG', { dateStyle: 'long' }) + ' · ' + keys.length + ' items · ' + (blind ? 'Blind sheet' : 'With system quantities') + '</div>'
      + Object.keys(by).sort().map(function (c) { return '<h3>' + esc(c) + '</h3><table><tr><th>Product</th><th>SKU / Barcode</th>' + (blind ? '' : '<th>System</th>') + '<th class="box">Counted</th><th>Recount</th><th>Note</th></tr>' + by[c].sort(function (a, b) { return (prods[a].name || '').localeCompare(prods[b].name || ''); }).map(function (k) { var p = prods[k]; return '<tr><td>' + esc(p.name) + '</td><td>' + esc(p.sku || p.barcode || '') + '</td>' + (blind ? '' : '<td>' + (fromSession && _cs ? _cs.rows[k].sys : (Number(p.quantity) || 0)) + '</td>') + '<td></td><td></td><td></td></tr>'; }).join('') + '</table>'; }).join('')
      + '<div class="sig"><div>Counted by</div><div>Checked by</div><div>Date</div></div><script>setTimeout(function(){print()},400)<\/script>'); w.document.close();
  };

  /* ── review & apply ── */
  function movementsFor() { var I = window.INV || {}; return (I.saleRows || []).concat(I.ledger || []); }
  function analyse(mv) {
    var by = {}; mv.forEach(function (m) { if (m.productKey) (by[m.productKey] = by[m.productKey] || []).push(m); });
    var lines = [], t = { counted: 0, uncounted: 0, ok: 0, over: 0, short: 0, overV: 0, shortV: 0, adj: 0 };
    Object.keys(_cs.rows).forEach(function (k) {
      var r = _cs.rows[k], p = prods[k] || {}; if (r.phys === null || r.phys === undefined) { t.uncounted++; return; } t.counted++;
      var at = r.at || _cs.startedAt, ms = (by[k] || []).filter(function (m) { return m.ref !== _cs.id; });
      var between = ms.filter(function (m) { return m.at > _cs.startedAt && m.at <= at; }).reduce(function (s, m) { return s + (Number(m.change) || 0); }, 0);
      var after = ms.filter(function (m) { return m.at > at; }).reduce(function (s, m) { return s + (Number(m.change) || 0); }, 0);
      var expected = r.sys + between, variance = r.phys - expected, value = variance * unit(p);
      if (between) t.adj++;
      if (variance === 0) t.ok++; else if (variance > 0) { t.over += variance; t.overV += value; } else { t.short += -variance; t.shortV += -value; }
      lines.push({ key: k, name: p.name || '', sku: p.sku || p.barcode || '', sys: r.sys, expected: expected, phys: r.phys, diff: variance, value: value, soldDuring: between, after: after, reason: r.reason || '', note: r.note || '', recount: !!r.recount, at: at });
    });
    t.net = t.overV - t.shortV; t.accuracy = t.counted ? Math.round(t.ok / t.counted * 1000) / 10 : 100; return { lines: lines, t: t };
  }
  window.finalizeCount = async function () {
    if (!_cs) { toast('No active session'); return; } var t0 = csTotals(); if (!t0.counted) { toast('Count at least one item first'); return; }
    var bg = $('cr-bg'); if (!bg) { bg = document.createElement('div'); bg.id = 'cr-bg'; bg.innerHTML = '<div id="cr-box"></div>'; document.body.appendChild(bg); }
    $('cr-box').innerHTML = '<div class="cr-bd" style="padding:40px;text-align:center;color:var(--ink3)">Checking sales made while you were counting…</div>'; bg.classList.add('on');
    try { if (window.loadSalesForStock) await window.loadSalesForStock(true); } catch (e) {}
    renderReview();
  };
  var RV = null;
  function renderReview() {
    RV = analyse(movementsFor()); var t = RV.t, vl = RV.lines.filter(function (l) { return l.diff !== 0; }).sort(function (a, b) { return Math.abs(b.value) - Math.abs(a.value); });
    var big = vl.some(function (l) { return Math.abs(l.value) >= _cs.thresh; }), needApproval = _cs.thresh > 0 && (Math.abs(t.net) >= _cs.thresh || big);
    $('cr-box').innerHTML = '<div class="cr-hd"><div><h3>Review count — ' + esc(_cs.name || 'Stock count') + '</h3><div style="font-size:12px;color:var(--ink3);margin-top:3px">Nothing changes in your stock until you press Apply.' + (t.adj ? ' <b>' + t.adj + '</b> line(s) had sales/receipts while counting — already accounted for.' : '') + '</div></div><button class="btn btn-grey btn-sm" onclick="crClose()">✕</button></div><div class="cr-bd">'
      + '<div class="rv-k"><div><b>' + t.counted + '</b><span>Counted (' + t.uncounted + ' not)</span></div><div><b style="color:' + (t.accuracy >= 98 ? '#0a9d6b' : t.accuracy >= 90 ? '#b45309' : '#d6336c') + '">' + t.accuracy + '%</b><span>Accuracy (lines matching)</span></div><div><b style="color:#d6336c">−' + t.short + ' · ' + money(t.shortV) + '</b><span>Shortage</span></div><div><b style="color:#171717">+' + t.over + ' · ' + money(t.overV) + '</b><span>Overage</span></div><div><b style="color:' + (t.net < 0 ? '#d6336c' : '#0a9d6b') + '">' + (t.net < 0 ? '−' : '+') + money(Math.abs(t.net)) + '</b><span>Net value impact</span></div></div>'
      + (vl.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Product</th><th>Expected</th><th>Counted</th><th>Variance</th><th>Value</th><th>Reason</th><th></th></tr></thead><tbody>' + vl.map(function (l) { return '<tr><td style="font-size:12px"><b>' + esc(l.name) + '</b>' + (l.soldDuring ? '<div style="font-size:10px;color:var(--ink3)">sys ' + l.sys + ' · ' + sgn(l.soldDuring) + ' moved during count</div>' : '') + (Math.abs(l.value) >= _cs.thresh && _cs.thresh ? '<span class="sc-tag">HIGH VALUE</span>' : '') + '</td><td>' + l.expected + '</td><td style="font-weight:700">' + l.phys + '</td><td style="font-weight:800;color:' + (l.diff < 0 ? '#d6336c' : '#171717') + '">' + sgn(l.diff) + '</td><td style="font-size:11px">' + money(Math.abs(l.value)) + '</td><td><select class="sc-sel" onchange="crReason(\'' + l.key + '\',this.value)">' + REASONS.map(function (x) { return '<option value="' + x[0] + '"' + (l.reason === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></td><td><button class="btn btn-grey btn-sm" onclick="crRecount(\'' + l.key + '\')">Recount</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div style="padding:26px;text-align:center"><div style="font-size:38px">🎯</div><b>Every counted item matches. No adjustments needed.</b></div>')
      + (needApproval ? '<div class="cr-appr"><b>⚠ Approval required</b> — variance is above your ₦' + Number(_cs.thresh).toLocaleString() + ' limit.<br><label style="display:inline-flex;align-items:center;gap:6px;margin-top:8px"><input type="checkbox" id="cr-ok"> I have reviewed these variances and approve the adjustments.</label> <input type="text" id="cr-who" placeholder="Approver name" value="' + esc(csWho()) + '"></div>' : '')
      + '</div><div class="cr-ft"><button class="btn btn-grey" onclick="crClose()">← Back to counting</button>' + (vl.length ? '<button class="btn btn-grey" onclick="crRecountAll()">Recount all high-value variances</button>' : '') + '<span style="margin-left:auto"></span><button class="btn btn-orange" onclick="crApply(' + (needApproval ? 'true' : 'false') + ')">✅ Apply ' + vl.length + ' adjustment' + (vl.length === 1 ? '' : 's') + ' &amp; finish</button></div>';
  }
  window.crClose = function () { var b = $('cr-bg'); if (b) b.classList.remove('on'); };
  window.crReason = function (k, v) { if (_cs && _cs.rows[k]) { _cs.rows[k].reason = v; csAutosave(); } };
  window.crRecount = function (k) { var r = _cs.rows[k]; r.first = r.phys; r.phys = null; r.at = 0; r.recount = true; csRender(); csAutosave(); crClose(); $('sc-show').value = 'recount'; _csFilter.show = 'recount'; csRender(); toast('Sent back for recount — enter the new count'); };
  window.crRecountAll = function () { var n = 0; RV.lines.forEach(function (l) { if (l.diff && Math.abs(l.value) >= (_cs.thresh || 1)) { var r = _cs.rows[l.key]; r.first = r.phys; r.phys = null; r.at = 0; r.recount = true; n++; } }); if (!n) { toast('No high-value variances'); return; } crClose(); _csFilter.show = 'recount'; $('sc-show').value = 'recount'; csRender(); csAutosave(); toast(n + ' item(s) sent for recount'); };

  window.crApply = async function (needApproval) {
    var approver = ''; if (needApproval) { if (!$('cr-ok').checked || !($('cr-who').value || '').trim()) { toast('⚠️ Tick the approval box and enter the approver’s name'); return; } approver = $('cr-who').value.trim(); }
    var btn = document.querySelector('#cr-box .cr-ft .btn-orange'); if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
    try { if (window.loadSalesForStock) await window.loadSalesForStock(true); } catch (e) {} // pick up any sale made since the review opened
    RV = analyse(movementsFor()); var sbase = getSettingsDB(), base = getDB(), ts = Date.now(), fail = 0, applied = 0, i = 0, stamp = {}, nowIso = new Date().toISOString();
    for (; i < RV.lines.length; i++) {
      var l = RV.lines[i]; stamp[l.key + '/lastCountedAt'] = nowIso; stamp[l.key + '/lastCountQty'] = l.phys;
      try {
        var live = Number(await (await fetch(base + '/' + encodeURIComponent(l.key) + '/quantity.json')).json()) || 0, truth = Math.max(0, l.phys + l.after), delta = truth - live; if (delta === 0) continue;
        var u = await fetch(base + '/' + encodeURIComponent(l.key) + '/quantity.json', { method: 'PUT', headers: H, body: JSON.stringify({ '.sv': { increment: delta } }) }); if (!u.ok) throw new Error('refused');
        var q = Number(await (await fetch(base + '/' + encodeURIComponent(l.key) + '/quantity.json')).json()) || 0, pr = prods[l.key] || {};
        if (typeof pr.inStock === 'boolean' || pr.inStock === undefined) fetch(base + '/' + encodeURIComponent(l.key) + '/inStock.json', { method: 'PUT', headers: H, body: JSON.stringify(q > 0) }).catch(function () {});
        if (prods[l.key]) prods[l.key].quantity = q; applied++;
        var entry = { type: 'count', ref: _cs.id, productKey: l.key, product: l.name, before: live, after: q, change: delta, reason: l.reason, note: l.note, countedQty: l.phys, expected: l.expected, by: csWho(), at: new Date().toISOString() };
        if (window.invLog) await window.invLog(entry); else fetch(sbase + '/stock_movements/' + ts + '_' + i + '.json', { method: 'PUT', headers: H, body: JSON.stringify(entry) }).catch(function () {});
      } catch (e) { fail++; }
    }
    try { var keys = Object.keys(stamp), CH = 300; for (var c = 0; c < keys.length; c += CH) { var chunk = {}; keys.slice(c, c + CH).forEach(function (k) { chunk[k] = stamp[k]; }); await fetch(base + '.json', { method: 'PATCH', headers: H, body: JSON.stringify(chunk) }); } } catch (e) {}
    var t = RV.t, lines = RV.lines.filter(function (l) { return l.diff !== 0 || l.note || l.reason; }).map(function (l) { return { key: l.key, name: l.name, sku: l.sku, sys: l.expected, phys: l.phys, diff: l.diff, value: l.value, note: l.note, reason: l.reason, recount: l.recount }; });
    var hist = { id: _cs.id, name: _cs.name || '', type: _cs.type || 'all', date: _cs.date, finishedAt: new Date().toISOString(), scope: _cs.scope || '', blind: !!_cs.blind, items: t.counted, totalItems: Object.keys(_cs.rows).length, variances: lines.filter(function (l) { return l.diff; }).length, over: t.over, short: t.short, value: t.net, accuracy: t.accuracy, approvedBy: approver, updatedBy: csWho(), status: fail ? 'partial' : 'completed', lines: lines };
    try { await fetch(sbase + '/count_history/' + ts + '.json', { method: 'PUT', headers: H, body: JSON.stringify(hist) }); } catch (e) {}
    try { await fetch(sbase + '/count_draft.json', { method: 'DELETE' }); } catch (e) {}
    clearTimeout(_csDraftTimer); scans = []; crClose(); csClose(fail ? 'Partial' : 'Completed'); try { await loadProds(); } catch (e) {} if (window.loadSalesForStock) window.loadSalesForStock(true); loadCountHistory();
    toast(fail ? '⚠️ Finished with ' + fail + ' failed update(s) — review in history' : '✅ Count complete — ' + applied + ' stock adjustment' + (applied === 1 ? '' : 's') + ' applied · accuracy ' + t.accuracy + '%');
  };

  /* ── history ── */
  window.loadCountHistory = async function () {
    csFillCats(); csCheckDraft(); wireStart();
    try {
      var d = await (await fetch(getSettingsDB() + '/count_history.json')).json(); if (!d) return; _csHist = d;
      var entries = Object.keys(d).map(function (id) { return Object.assign({ _id: id }, d[id]); }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      $('sc-last').textContent = new Date(entries[0].date).toLocaleDateString('en-NG');
      $('count-history-tbl').innerHTML = entries.slice(0, 30).map(function (e) {
        var ok = e.status === 'completed', acc = e.accuracy != null ? e.accuracy + '%' : '—', ac = e.accuracy == null ? 'inherit' : e.accuracy >= 98 ? '#0a9d6b' : e.accuracy >= 90 ? '#b45309' : '#d6336c';
        return '<tr><td>' + new Date(e.date).toLocaleDateString('en-NG') + '</td><td style="font-size:12px">' + esc(e.name || e.scope || 'Full count') + '</td><td>' + (e.items || 0) + '</td><td style="font-weight:800;color:' + ac + '">' + acc + '</td><td style="color:' + (e.variances > 0 ? 'var(--red)' : 'var(--green)') + '">' + (e.variances || 0) + '</td><td>' + (e.value ? ((e.value < 0 ? '−' : '+') + money(Math.abs(e.value))) : '—') + '</td><td style="font-size:11px">' + esc(e.updatedBy || '—') + (e.approvedBy ? '<br><span style="color:#0a9d6b">✓ ' + esc(e.approvedBy) + '</span>' : '') + '</td><td><span class="bdg" style="background:var(--grey1);color:' + (ok ? 'var(--green)' : 'var(--red)') + '">' + esc(e.status || '') + '</span></td><td>' + (e.lines ? '<button class="btn btn-grey btn-sm" onclick="csShowHist(\'' + e._id + '\')">View</button>' : '') + '</td></tr>';
      }).join('');
    } catch (e) {}
  };
  window.csShowHist = function (id) {
    var e = _csHist[id]; if (!e) return; var box = $('sc-detail'), rl = function (v) { var x = REASONS.filter(function (r) { return r[0] === v; })[0]; return x ? x[1] : v || ''; };
    box.style.display = 'block';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px"><strong style="font-size:13px">' + esc(e.name || 'Count') + ' — ' + new Date(e.date).toLocaleString('en-NG') + ' · ' + esc(e.scope || 'All categories') + (e.blind ? ' (blind)' : '') + (e.accuracy != null ? ' · accuracy ' + e.accuracy + '%' : '') + (e.approvedBy ? ' · approved by ' + esc(e.approvedBy) : '') + '</strong><span><button class="btn btn-grey btn-sm" onclick="csHistCSV(\'' + id + '\')">⬇ CSV</button> <button class="btn btn-grey btn-sm" onclick="document.getElementById(\'sc-detail\').style.display=\'none\'">Close</button></span></div>'
      + '<div style="overflow-x:auto"><table><thead><tr><th>Product</th><th>SKU</th><th>Expected</th><th>Counted</th><th>Variance</th><th>Value</th><th>Reason</th><th>Note</th></tr></thead><tbody>' + ((e.lines || []).map(function (l) { return '<tr><td>' + esc(l.name) + (l.recount ? ' <span class="sc-tag">recounted</span>' : '') + '</td><td>' + esc(l.sku) + '</td><td>' + l.sys + '</td><td>' + l.phys + '</td><td style="font-weight:700;color:' + (l.diff < 0 ? 'var(--red)' : l.diff > 0 ? '#171717' : 'var(--green)') + '">' + (l.diff > 0 ? '+' : '') + l.diff + '</td><td>' + money(l.value) + '</td><td style="font-size:11px">' + esc(rl(l.reason)) + '</td><td>' + esc(l.note) + '</td></tr>'; }).join('') || '<tr class="empty-row"><td colspan="8">No variances — stock matched perfectly ✓</td></tr>') + '</tbody></table></div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  window.csHistCSV = function (id) { var e = _csHist[id]; if (!e) return; var rows = [['Product', 'SKU', 'Expected', 'Counted', 'Variance', 'Value', 'Reason', 'Note']]; (e.lines || []).forEach(function (l) { rows.push([l.name, l.sku, l.sys, l.phys, l.diff, l.value, l.reason || '', l.note]); }); csDownload('count-' + id + '.csv', csCSV(rows)); };
  window.exportCountCSV = function () { if (!_cs) return; var rows = [['Product', 'SKU', 'Barcode', 'Category', 'System', 'Counted', 'Variance', 'Value', 'Reason', 'Note']]; Object.keys(_cs.rows).forEach(function (k) { var p = prods[k] || {}, r = _cs.rows[k], d = rowVar(r); rows.push([p.name, p.sku || '', p.barcode || '', p.category || '', r.sys, r.phys === null || r.phys === undefined ? '' : r.phys, d === null ? '' : d, d === null ? '' : d * unit(p), r.reason || '', r.note]); }); csDownload('stock-count-' + Date.now() + '.csv', csCSV(rows)); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireStart); else wireStart();
})();
} catch (e) { if (window.console) console.error("[admin-count.js]", e); }

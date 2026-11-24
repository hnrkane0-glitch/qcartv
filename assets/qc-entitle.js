/* ════════════════════════════════════════════════════════════════════════════
   QUICKCART — ENTITLEMENTS  (what each customer is allowed to see)
   The platform admin switches modules on/off per customer in the Backend Console. This file makes the dashboard & POS obey.
   Rules:  owner sees only modules switched on for THEIR account ·  staff see only (modules ON) ∩ (roles the owner ticked for them)
   Account with no `modules` field yet (older customers) = everything stays on until you set it in the console.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var C = window.QC_CATALOG; if (!C) return; var L = localStorage;
  var QCE = window.QCE = {};
  function read(k) { try { return JSON.parse(L.getItem(k)); } catch (e) { return null; } }
  QCE.mods = function () { var m = read('qc_modules'); return Array.isArray(m) ? m : null; };       /* null → legacy: all on */
  QCE.config = function () { return read('qc_config') || {}; };
  QCE.isPlatformAdmin = function () { return L.getItem('qc_logged_user') === 'admin' && L.getItem('qc_is_staff') !== '1'; };
  QCE.has = function (id) { if (!id) return true; if (QCE.isPlatformAdmin()) return true; var m = QCE.mods(); return m === null ? true : m.indexOf(id) > -1; };
  QCE.hasPanel = function (p) { return QCE.has(C.moduleOfPanel(p)); };
  QCE.limit = function (k, dflt) { var c = QCE.config(); return c.limits && c.limits[k] != null ? c.limits[k] : dflt; };
  QCE.flag = function (k, dflt) { var c = QCE.config(); return c.flags && c.flags[k] != null ? c.flags[k] : dflt; };

  /* learn modules/config from any /api/auth response (login, staff-login, me) — no edits to the login code needed */
  var _f = window.fetch;
  window.fetch = function (u, o) {
    var p = _f.apply(this, arguments);
    try { if (typeof u === 'string' && /\/api\/auth/.test(u)) p.then(function (r) { r.clone().json().then(function (j) { if (!j) return; var src = j.owner || j.user; if (src && (src.entitled || src.config)) save(src); }).catch(function () { }); }).catch(function () { }); } catch (e) { }
    return p;
  };
  function save(src) {
    var arr = src.entitled || src.ownerEntitled; if (Array.isArray(arr)) L.setItem('qc_modules', JSON.stringify(arr)); else if (arr && typeof arr === 'object') L.setItem('qc_modules', JSON.stringify(Object.keys(arr).filter(function (k) { return arr[k]; })));
    if (src.config) L.setItem('qc_config', JSON.stringify(src.config)); if (src.status) L.setItem('qc_acct_status', src.status);
    QCE.apply();
  }
  /* refresh from the server (so a switch you flip in the console takes effect without re-login) */
  QCE.refresh = function () {
    var t = L.getItem('qc_token') || L.getItem('qc_tok'); if (!t || !L.getItem('qc_logged_user')) return;
    _f('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'me', token: t }) }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok && j.user) { if (j.user.entitled || j.user.config) save(j.user); if (j.user.status === 'revoked' || j.user.status === 'suspended') { L.setItem('qc_acct_status', j.user.status); } } }).catch(function () { });
  };

  /* hide sidebar entries & section headings the account doesn't own */
  QCE.apply = function () {
    var aside = document.querySelector('aside.sidebar'); if (!aside) return;
    [].forEach.call(aside.querySelectorAll('.sb'), function (el) {
      var m = (el.getAttribute('onclick') || '').match(/go\('(\w+)'/), pid = m && m[1]; if (!pid) return; var mod = C.moduleOfPanel(pid); if (!mod) return;
      var off = !QCE.has(mod); if (off) { el.style.display = 'none'; el.setAttribute('data-qce', '1'); } else if (el.getAttribute('data-qce')) { el.style.display = ''; el.removeAttribute('data-qce'); }
    });
    var hdr = null, cnt = 0; function flush() { if (hdr) hdr.style.display = cnt ? '' : 'none'; }
    [].forEach.call(aside.children, function (k) { if (k.classList.contains('sb')) { if (k.style.display !== 'none') cnt++; } else { flush(); hdr = k; cnt = 0; } }); flush();
    document.documentElement.setAttribute('data-modules', (QCE.mods() || ['all']).join(','));
  };
  /* gate navigation + staff permission checks */
  function install() {
    if (typeof window.canGo === 'function' && !window.canGo.__qce) { var og = window.canGo; window.canGo = function (n) { if (!QCE.hasPanel(n)) return false; return og.apply(this, arguments); }; window.canGo.__qce = 1; }
    if (typeof window.go === 'function' && !window.go.__qce) { var o = window.go; window.go = function (n) { if (!QCE.hasPanel(n)) { var mod = C.byId[C.moduleOfPanel(n)]; QCE.locked(mod); return; } return o.apply(this, arguments); }; window.go.__qce = 1; }
    if (window.QCDB && QCDB.can && !QCDB.can.__qce) { var oc = QCDB.can; QCDB.can = function (name) { var id = C.moduleOfRole(name); if (id && !QCE.has(id)) return false; return oc.apply(this, arguments); }; QCDB.can.__qce = 1; }
    if (typeof window.applyStaffAccess === 'function' && !window.applyStaffAccess.__qce) { var oa = window.applyStaffAccess; window.applyStaffAccess = function () { var r = oa.apply(this, arguments); QCE.apply(); return r; }; window.applyStaffAccess.__qce = 1; }
  }
  QCE.locked = function (mod) {
    var m = mod || { name: 'This feature' }, msg = '🔒 ' + m.name + ' is not on your plan yet. Contact your QuickCart account manager to add it.';
    try { window.toast(msg); } catch (e) { alert(msg); }
  };
  /* roles screen: only show permission checkboxes for modules the account owns */
  QCE.filterRoleChecks = function () { [].forEach.call(document.querySelectorAll('[data-role-mod],[data-mod-name]'), function (e) { var n = e.getAttribute('data-role-mod') || e.getAttribute('data-mod-name'), id = C.moduleOfRole(n); if (id && !QCE.has(id)) e.style.display = 'none'; }); };
  window.addEventListener('load', function () { setTimeout(function () { install(); QCE.apply(); QCE.refresh(); }, 400); setInterval(function () { install(); QCE.apply(); }, 3000); setInterval(QCE.refresh, 300000); });
})();

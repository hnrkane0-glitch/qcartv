/* ════════════════════════════════════════════════════════════════════════════
   QUICKCART — MODULE CATALOGUE  (single source of truth)
   Used by: pricing page · signup · backend console · dashboard gating · POS gating · API (invoices, quotes)
   To add a module: add ONE entry in MODULES below. To change a price: edit its `price`.  Nothing else needs touching.
   ════════════════════════════════════════════════════════════════════════════ */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.QC_CATALOG = factory(); })(typeof self !== 'undefined' ? self : this, function () {

  /* ── MODULES ───────────────────────────────────────────────────────────────
     id        short key stored in users/<owner>/modules
     price     ₦ per month (annual billing gets `annualDiscount`)
     panels    dashboard panel ids that appear in the sidebar when the module is ON
     roles     role-module names (the staff permission checkboxes) that belong to this module
     requires  other modules that must also be on                                                  */
  var MODULES = [
    { id: 'core', name: 'QuickCart Core', group: 'Core', price: 15000, base: true, icon: '🏪',
      desc: 'Point of sale, products, orders, basic inventory, staff roles, settings, reports, help centre and offline selling.',
      features: ['Point of Sale (POS) with offline mode & auto-sync', 'Products, categories, barcodes & images', 'Orders & receipts (58mm / 80mm thermal, A4)', 'Basic inventory & low-stock alerts', 'Staff accounts with role permissions', 'Daily sales reports & CSV export', 'Help centre, tickets & feature requests'],
      panels: ['dashboard', 'deals', 'orders', 'inventory', 'import', 'roles', 'settings', 'pending', 'adslots', 'botconfig', 'help'], roles: ['Dashboard', 'Products', 'Orders', 'Inventory', 'Roles', 'Settings', 'POS', 'Help'] },

    { id: 'accounting', name: 'Accounting & Books', group: 'Finance', price: 10000, icon: '📒',
      desc: 'Double-entry ledger, books of account, receivables/payables, budgets, fixed assets, VAT and financial statements.',
      features: ['Chart of accounts & general ledger', 'Sales, purchases, cash, bank & petty-cash books', 'Profit & Loss, Balance Sheet, Cash Flow, Trial Balance', 'Receivables & payables with ageing', 'Budgets vs actual', 'Fixed assets & depreciation', 'VAT / tax report, outlet P&L'], panels: ['accounting', 'advisor'], roles: ['Accounting'] },

    { id: 'invoicing', name: 'Invoicing & Quotes', group: 'Finance', price: 4000, icon: '🧾',
      desc: 'Create, send, print and export invoices, quotes, proforma, receipts, credit notes, delivery notes and recurring invoices.',
      features: ['11 document types (invoice, proforma, quote, credit note…)', 'Your logo, bank details & terms', 'Print or save as PDF', 'Partial payments & statuses', 'Recurring invoices', 'Export to CSV'], panels: ['invoices'], roles: ['Invoices'] },

    { id: 'advinv', name: 'Advanced Inventory', group: 'Inventory', price: 8000, icon: '📦',
      desc: 'Multi-outlet stock, transfers, suppliers, purchase orders, batches & expiry, stock counts, adjustments and reorder intelligence.',
      features: ['Stock by outlet / warehouse', 'Transfers with in-transit tracking', 'Suppliers & purchase orders → auto bills', 'Batch / lot & expiry alerts', 'Stock count & adjustments with reasons', 'Reorder suggestions from sales velocity', 'Stock valuation (cost vs retail)'], panels: ['advinv', 'stockcount'], roles: ['Stock Count', 'Advanced Inventory'] },

    { id: 'wholesale', name: 'Wholesale & Pricing', group: 'Inventory', price: 6000, icon: '🏷️',
      desc: 'Price levels, price profiles, quantity tiers, customer groups and bulk price tools — live at the POS.',
      features: ['Price levels (wholesale, VIP, staff)', 'Price profiles by % or category', 'Quantity break tiers', 'Customer groups with credit limits', 'Price-list export & bulk price update'], panels: ['wholesale', 'pricelevel'], roles: ['Price Levels', 'Wholesale'] },

    { id: 'production', name: 'Production & Manufacturing', group: 'Operations', price: 9000, icon: '🏭',
      desc: 'Recipes/BOMs linked to products and raw materials, production orders, MRP planning and costing.',
      features: ['BOM linked to finished product', 'Production orders (planned → active → done)', 'Raw-material consumption & waste', 'MRP: shortages → purchase order', 'Auto re-costing of finished goods'], panels: ['production'], roles: ['Production'] },

    { id: 'outlets', name: 'Multi-Outlet & Stores', group: 'Operations', price: 7000, icon: '🏬',
      desc: 'Unlimited stores/outlets, outlet-locked staff, outlet reports and stock per outlet.', features: ['Unlimited outlets / warehouses', 'Staff locked to their outlet', 'Outlet-level reports & P&L', 'Outlet filter at the POS'], panels: [], roles: ['Outlets'] },

    { id: 'hr', name: 'HR, Attendance & Payroll', group: 'People', price: 8000, icon: '👥',
      desc: 'Staff records, login/attendance tracking, biometric device sync, shifts, leave, payroll with commission and payslips.',
      features: ['Staff directory & documents', 'Auto attendance from logins', 'Biometric / attendance device sync (ZKTeco, generic)', 'Shifts, lateness & overtime', 'Leave management', 'Payroll with commission, deductions, payslips', 'Admin-only activity log of every staff action'], panels: ['hr'], roles: ['HR'] },

    { id: 'crm', name: 'Customers (360°)', group: 'Customers', price: 4000, icon: '🙋',
      desc: 'Customer profiles, segments, wallet/credit, birthdays and purchase history.', features: ['Auto-built customer profiles', 'VIP / At-risk / Lost segments', 'Wallet & store credit', 'Birthday list', 'Export'], panels: ['customers'], roles: ['Customers'] },

    { id: 'loyalty', name: 'Loyalty & Rewards', group: 'Customers', price: 5000, icon: '🎁',
      desc: 'Points, tiers, rewards, vouchers and bonus events — earn and redeem at the POS.', features: ['Points on every sale', 'Silver / Gold / Diamond tiers', 'Rewards catalogue & vouchers', 'Double-points events', 'Birthday & referral bonuses'], panels: ['loyalty'], roles: ['Loyalty'] },

    { id: 'marketing', name: 'Marketing Suite', group: 'Customers', price: 6000, icon: '📣',
      desc: 'Campaigns, coupons, flash sales, gift cards, referrals and daily automations.', features: ['WhatsApp / SMS / email campaigns to segments', 'Coupon engine with limits & expiry', 'Timed flash sales that reprice at the POS', 'Gift cards', 'Referrals & daily automations'], panels: ['newsletter', 'alerts', 'coupons', 'flash', 'affiliate'], roles: ['Newsletter', 'Coupons', 'Flash Sales'] },

    { id: 'services', name: 'Services & Bookings', group: 'Industry', price: 6000, icon: '🛎️',
      desc: 'Sell services alongside products: catalogue, appointments, providers, packages and commissions.', features: ['Service catalogue with duration & cost', 'Appointments & clash prevention', 'Providers & commissions', 'Packages & memberships', 'Services in the POS'], panels: ['services'], roles: ['Services'] },

    { id: 'hotel', name: 'Hotel Management', group: 'Industry', price: 20000, icon: '🏨',
      desc: 'Rooms, reservations, check-in/out, folios, housekeeping and hotel reports.', features: ['Room board & types', 'Reservations with clash prevention', 'Check-in / check-out & folio charges', 'Housekeeping', 'ADR & occupancy'], panels: ['hotel'], roles: ['Hotel'] },

    { id: 'hospital', name: 'Hospital, Clinic & Lab', group: 'Industry', price: 25000, icon: '🏥',
      desc: 'Patient records & medical history, appointments, consultations, laboratory, pharmacy queue, wards and billing.', features: ['Patient registry (blood group, allergies, HMO)', 'Medical history & consultations', 'Laboratory requests, results & printable reports', 'Pharmacy / prescription queue', 'Wards & bed management', 'Billing queue'], panels: ['hospital'], roles: ['Hospital'] },

    { id: 'lounge', name: 'Lounge, Bar & Restaurant', group: 'Industry', price: 12000, icon: '🍸',
      desc: 'Tables, open tabs, reservations, menu margins and shift reports.', features: ['Tables & zones', 'Open tabs billed at close', 'Reservations with minimum spend', 'Menu margins', 'Waiter / shift sales'], panels: ['lounge'], roles: ['Lounge'] },

    { id: 'security', name: 'Security & Fraud Detection', group: 'Protection', price: 6000, icon: '🛡️',
      desc: 'Risk alerts for voids, discounts, after-hours sales, stock shrinkage and suspicious logins, plus a tamper-proof audit trail.', features: ['Fraud rules with live alerts', 'Risk score per staff', 'Tamper-proof audit trail (admin-only)', 'Login & device monitoring', 'Permission matrix review'], panels: ['security'], roles: ['Security'] },

    { id: 'storefront', name: 'Online Store & Website', group: 'Sales Channels', price: 8000, icon: '🌐',
      desc: 'Your online shop, page editor and custom domain.', features: ['Online storefront', 'Page / store editor', 'Custom domain', 'Online orders into your POS stock'], panels: ['domain', 'pageeditor'], roles: [] }
  ];

  /* panel id → module id (derived) and role-name → module id (derived) */
  var panelModule = {}, roleModule = {}, byId = {};
  MODULES.forEach(function (m) { byId[m.id] = m; m.panels.forEach(function (p) { panelModule[p] = m.id; }); m.roles.forEach(function (r) { roleModule[r] = m.id; }); });

  /* ── BUNDLES (starting points when you register a client; every module can still be toggled) ── */
  var BUNDLES = [
    { id: 'retail', name: 'Retail / Supermarket', modules: ['core', 'advinv', 'wholesale', 'crm', 'loyalty', 'marketing', 'accounting', 'hr', 'outlets', 'security'] },
    { id: 'restaurant', name: 'Restaurant / Lounge', modules: ['core', 'lounge', 'production', 'advinv', 'accounting', 'hr', 'loyalty'] },
    { id: 'hotel', name: 'Hotel', modules: ['core', 'hotel', 'lounge', 'accounting', 'invoicing', 'hr', 'security'] },
    { id: 'clinic', name: 'Clinic / Hospital / Lab', modules: ['core', 'hospital', 'services', 'advinv', 'invoicing', 'accounting', 'hr', 'security'] },
    { id: 'salon', name: 'Salon / Spa / Services', modules: ['core', 'services', 'crm', 'loyalty', 'marketing', 'accounting'] },
    { id: 'factory', name: 'Manufacturer / Bakery', modules: ['core', 'production', 'advinv', 'wholesale', 'accounting', 'invoicing', 'hr'] },
    { id: 'starter', name: 'Starter (POS only)', modules: ['core'] },
    { id: 'all', name: 'Everything', modules: MODULES.map(function (m) { return m.id; }) }
  ];

  var ANNUAL_DISCOUNT = 0.17;   /* 17% off when billed yearly (≈ 2 months free) */
  var SETUP_FEE = 0;            /* one-off onboarding fee — set here if you charge one */
  var VAT = 0.075;

  function quote(ids, cycle, extraOutlets) {
    ids = (ids || []).filter(function (i) { return byId[i]; }); if (ids.indexOf('core') < 0) ids.unshift('core');
    var lines = ids.map(function (i) { return { id: i, name: byId[i].name, monthly: byId[i].price }; });
    var monthly = lines.reduce(function (s, l) { return s + l.monthly; }, 0), yearly = cycle === 'yearly';
    var perMonth = yearly ? Math.round(monthly * (1 - ANNUAL_DISCOUNT)) : monthly, total = perMonth * (yearly ? 12 : 1);
    return { lines: lines, monthlyList: monthly, perMonth: perMonth, cycle: yearly ? 'yearly' : 'monthly', subtotal: total + SETUP_FEE, vat: Math.round((total + SETUP_FEE) * VAT), total: Math.round((total + SETUP_FEE) * (1 + VAT)), saved: yearly ? monthly * 12 - total : 0, setup: SETUP_FEE };
  }
  function expand(ids) { var set = {}; (ids || []).forEach(function (i) { set[i] = 1; (byId[i] && byId[i].requires || []).forEach(function (r) { set[r] = 1; }); }); set.core = 1; return Object.keys(set); }
  function moduleOfPanel(p) { return panelModule[p] || null; }
  function moduleOfRole(r) { return roleModule[r] || null; }

  return { MODULES: MODULES, BUNDLES: BUNDLES, byId: byId, panelModule: panelModule, roleModule: roleModule, ANNUAL_DISCOUNT: ANNUAL_DISCOUNT, SETUP_FEE: SETUP_FEE, VAT: VAT, quote: quote, expand: expand, moduleOfPanel: moduleOfPanel, moduleOfRole: moduleOfRole, GROUPS: ['Core', 'Finance', 'Inventory', 'Operations', 'People', 'Customers', 'Industry', 'Protection', 'Sales Channels'] };
});

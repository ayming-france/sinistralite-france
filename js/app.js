// ── App entry point ──

import { loadDataset, getData, getStore } from './data.js';
import { state, VIEW_CONFIG } from './state.js';
import { el, viewEl } from './utils.js';
import { initNav, switchView } from './nav.js';
import { setupSearch, selectCode, setLevel } from './search.js';
import { renderKPIs, renderNationalState } from './kpi.js';
import { renderCausesChart, renderFunnelChart, renderPositionStrip, renderComparisonChart, setupCompToggle, renderEvolutionCharts, renderDemographics } from './charts.js';
import { renderInsights, toggleInsights, toggleShare, copyLink, downloadPDF } from './insights.js';

// Event listeners for drawer buttons (all views)
function attachDrawerListeners() {
  ['insightsBtn', 'mp-insightsBtn', 'trajet-insightsBtn'].forEach(function(id) {
    var btn = el(id);
    if (btn) btn.addEventListener('click', toggleInsights);
  });
  ['shareBtn', 'mp-shareBtn', 'trajet-shareBtn'].forEach(function(id) {
    var btn = el(id);
    if (btn) btn.addEventListener('click', toggleShare);
  });
  var closeIns = el('insightsCloseBtn');
  if (closeIns) closeIns.addEventListener('click', toggleInsights);
  var closeShare = el('shareCloseBtn');
  if (closeShare) closeShare.addEventListener('click', toggleShare);
  var copyBtn = el('copyLinkBtn');
  if (copyBtn) copyBtn.addEventListener('click', copyLink);
  var pdfBtn = el('downloadPDFBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', downloadPDF);
}

// ── Render orchestration ──
function render(viewId, code, level) {
  var data = getData(viewId);
  var cfg = VIEW_CONFIG[viewId];
  var store = getStore(viewId, level);
  var entry = store[code];
  if (!entry) return;

  viewEl(viewId, 'emptyState').style.display = 'none';
  viewEl(viewId, 'results').classList.add('visible');

  var s = entry.stats;
  var nat = data.meta.national;

  viewEl(viewId, 'selTitle').textContent = code + ' // ' + entry.libelle;
  var levelLabel = level === 'naf5' ? 'Code NAF' : level === 'naf4' ? 'Sous-classe NAF' : 'Division NAF';
  var subText = levelLabel;
  if (entry.codes_naf5) subText += ' // ' + entry.codes_naf5.length + ' codes NAF agrégés';
  viewEl(viewId, 'selSub').textContent = subText;

  // Breadcrumb
  var bc = viewEl(viewId, 'breadcrumb');
  var crumbs = [];
  var naf2code = code.substring(0, 2);
  var naf4code = code.substring(0, 4);
  var naf2entry = data.by_naf2[naf2code];
  var naf4entry = data.by_naf4[naf4code];
  if (level === 'naf5') {
    if (naf2entry) crumbs.push({ code: naf2code, label: naf2code + ' ' + naf2entry.libelle, level: 'naf2' });
    if (naf4entry) crumbs.push({ code: naf4code, label: naf4code + ' ' + naf4entry.libelle, level: 'naf4' });
    crumbs.push({ label: code, current: true });
  } else if (level === 'naf4') {
    if (naf2entry) crumbs.push({ code: naf2code, label: naf2code + ' ' + naf2entry.libelle, level: 'naf2' });
    crumbs.push({ label: code, current: true });
  } else {
    crumbs.push({ label: code, current: true });
  }
  bc.innerHTML = crumbs.map(function(c, i) {
    var sep = i < crumbs.length - 1 ? '<span class="sep">&rsaquo;</span>' : '';
    if (c.current) return '<span class="current">' + c.label + '</span>';
    return '<a data-code="' + c.code + '" data-level="' + c.level + '">' + c.label + '</a>' + sep;
  }).join('');
  bc.querySelectorAll('a[data-code]').forEach(function(a) {
    a.addEventListener('click', function() {
      setLevel(viewId, this.dataset.level);
      selectCode(viewId, this.dataset.code, this.dataset.level, render);
    });
  });

  // Ranking by event count
  var eventKey = cfg.eventKey;
  var allAtLevel = Object.entries(getStore(viewId, level))
    .map(function(pair) { return { code: pair[0], count: pair[1].stats[eventKey] }; })
    .sort(function(a, b) { return b.count - a.count; });

  renderKPIs(viewId, s, nat, cfg, allAtLevel, code);
  renderInsights(viewId, s, nat, entry.risk_causes || {}, cfg, entry.yearly);
  renderPositionStrip(viewId, code, level, s.indice_frequence, render);
  if (cfg.causesTitle) {
    renderCausesChart(viewId, entry.risk_causes);
  }
  renderFunnelChart(viewId, s, cfg);
  renderComparisonChart(viewId, code, level, render);
  renderEvolutionCharts(viewId, entry, level);
  renderDemographics(viewId, entry);
}

// ── URL hash routing ──
function loadFromHash() {
  var hash = window.location.hash.replace('#', '').trim();
  if (!hash) return;

  // Parse: #at/CODE, #mp/CODE, or legacy #CODE
  var viewId, code;
  if (hash.startsWith('at/')) {
    viewId = 'at';
    code = hash.substring(3);
  } else if (hash.startsWith('mp/')) {
    viewId = 'mp';
    code = hash.substring(3);
  } else if (hash.startsWith('trajet/')) {
    viewId = 'trajet';
    code = hash.substring(7);
  } else if (hash === 'at' || hash === 'mp' || hash === 'trajet') {
    switchView(hash);
    return;
  } else {
    // Legacy: bare code maps to AT
    viewId = 'at';
    code = hash;
  }

  if (viewId !== state.activeView) switchView(viewId);

  if (!code) return;

  var data = getData(viewId);
  for (var i = 0; i < 3; i++) {
    var levels = ['naf5', 'naf4', 'naf2'];
    var level = levels[i];
    if (data['by_' + level][code]) {
      setLevel(viewId, level);
      selectCode(viewId, code, level, render);
      return;
    }
  }
  var upper = code.toUpperCase();
  for (var j = 0; j < 3; j++) {
    var lvl = ['naf5', 'naf4', 'naf2'][j];
    if (data['by_' + lvl][upper]) {
      setLevel(viewId, lvl);
      selectCode(viewId, upper, lvl, render);
      return;
    }
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async function() {
  // Load all 3 datasets in parallel
  await Promise.all([
    loadDataset('at'),
    loadDataset('mp'),
    loadDataset('trajet'),
  ]);

  // Init nav (pass render for theme toggle re-render)
  initNav(render);

  // Attach drawer button listeners
  attachDrawerListeners();

  // Setup search for each view
  setupSearch('at', render);
  setupSearch('mp', render);
  setupSearch('trajet', render);

  // Setup comparison toggles
  setupCompToggle('at');
  setupCompToggle('mp');
  setupCompToggle('trajet');

  // Render national default state for each view
  ['at', 'mp', 'trajet'].forEach(function(viewId) {
    renderNationalState(viewId, getData, getStore, VIEW_CONFIG[viewId], setLevel, selectCode, render);
  });

  // Click outside closes drawers
  document.addEventListener('click', function(e) {
    var insDrawer = el('insightsDrawer');
    var shareDrawer = el('shareDrawer');
    if (insDrawer.classList.contains('open') && !insDrawer.contains(e.target) && !e.target.closest('.action-btn')) {
      toggleInsights();
    }
    if (shareDrawer.classList.contains('open') && !shareDrawer.contains(e.target) && !e.target.closest('.action-btn')) {
      toggleShare();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (el('insightsDrawer').classList.contains('open')) { toggleInsights(); return; }
      if (el('shareDrawer').classList.contains('open')) { toggleShare(); return; }
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      var searchInput = viewEl(state.activeView, 'searchInput');
      if (document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // Hash routing
  window.addEventListener('hashchange', loadFromHash);
  loadFromHash();

  // Init Lucide icons
  lucide.createIcons();
});

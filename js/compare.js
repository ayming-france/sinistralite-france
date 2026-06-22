// ── Mon entreprise : benchmark sectoriel + coût social estimé (AT) ──
// L'entreprise renseigne son secteur, son effectif et ses AT avec arrêt ;
// on la situe face à son secteur et à la moyenne nationale, puis on estime
// le coût social de ses accidents via le barème officiel des coûts moyens AT/MP.

import { state } from './state.js';
import { getData, getStore } from './data.js';
import { el, normalize } from './utils.js';
import { estimateCoutSocial, BAREME_YEAR, BAREME_SOURCE } from './cost-model.js';

// Palette des secteurs comparés (réutilisée par la comparaison inline + l'app).
export var SECTOR_COLORS = ['#e8710a', '#12b5cb', '#e52592', '#1e8e3e'];

var DOMAIN = 'at';
var LEVELS = ['naf5', 'naf4', 'naf2'];

function vs() { return state.views.compare; }

// ── Formatage ──
function frNum(n) { return n.toLocaleString('fr-FR'); }
function fmt1(n) { return (n == null || isNaN(n)) ? '—' : n.toFixed(1).replace('.', ','); }
function pct(x) { return Math.round(x * 100) + ' %'; }
function fmtEur(n) {
  n = Math.round(n);
  if (n >= 1000000) return frNum(Math.round(n / 100000) / 10) + ' M€';
  if (n >= 10000) return frNum(Math.round(n / 1000)) + ' k€';
  return frNum(n) + ' €';
}

// ── Résolution du secteur (tous niveaux du domaine AT) ──
function resolveEntry(code) {
  for (var i = 0; i < LEVELS.length; i++) {
    var store = getStore(DOMAIN, LEVELS[i]);
    if (store && store[code]) return { entry: store[code], level: LEVELS[i] };
  }
  return null;
}

function buildIndex() {
  var data = getData(DOMAIN);
  if (!data) return [];
  if (data.naf_index) return data.naf_index;
  return []
    .concat(Object.entries(data.by_naf2).map(function(p) { return { code: p[0], libelle: p[1].libelle, level: 'naf2' }; }))
    .concat(Object.entries(data.by_naf4).map(function(p) { return { code: p[0], libelle: p[1].libelle, level: 'naf4' }; }))
    .concat(Object.entries(data.by_naf5).map(function(p) { return { code: p[0], libelle: p[1].libelle, level: 'naf5' }; }));
}

// ── Actions ──
function selectSector(code) {
  var res = resolveEntry(code);
  if (!res) return;
  var v = vs();
  v.sector = code;
  v.sectorLevel = res.level;
  v.sectorLib = res.entry.libelle || '';
  renderBench();
}

// ── Rendu principal ──
function renderBench() {
  var data = getData(DOMAIN);
  var box = el('bench-results');
  if (!data || !box) return;
  var v = vs();

  renderSectorChip();

  var sectorRes = v.sector ? resolveEntry(v.sector) : null;
  var eff = v.effectif, acc = v.accidents;
  var ready = sectorRes && eff > 0 && acc != null && acc >= 0;

  if (!ready) {
    box.innerHTML = '<div class="bench-empty">' +
      (sectorRes
        ? 'Renseignez votre effectif et vos accidents du travail avec arrêt pour situer votre entreprise.'
        : 'Choisissez votre secteur, puis renseignez votre effectif et vos accidents du travail avec arrêt.') +
      '</div>';
    return;
  }

  var entry = sectorRes.entry;
  var s = entry.stats;
  var nat = data.meta.national;
  var coIF = (acc / eff) * 1000;

  box.innerHTML = renderPosition(coIF, s.indice_frequence, nat.indice_frequence, entry) +
                  renderCost(v, entry, s, eff, acc);

  var chk = el('bench-indirectChk');
  if (chk) chk.addEventListener('change', function() {
    v.indirect = this.checked ? 4 : 0;
    renderBench();
  });
}

// ── Carte « Ma position » ──
function renderPosition(coIF, secIF, natIF, entry) {
  var ratio = secIF > 0 ? coIF / secIF : null;
  var verdict, vcls;
  if (ratio == null) { verdict = 'Secteur sans indice de référence.'; vcls = 'neutral'; }
  else if (ratio > 1.05) { verdict = 'Votre fréquence d\'accidents est <strong>' + pct(ratio - 1) + ' au-dessus</strong> de votre secteur.'; vcls = 'above'; }
  else if (ratio < 0.95) { verdict = 'Votre fréquence d\'accidents est <strong>' + pct(1 - ratio) + ' en dessous</strong> de votre secteur.'; vcls = 'below'; }
  else { verdict = 'Votre fréquence d\'accidents est <strong>proche de la moyenne</strong> de votre secteur.'; vcls = 'neutral'; }

  var secSub = (vs().sector || '') + ' · ' + (entry.libelle || '');

  return '<section class="bench-card">' +
    '<h3>Ma position — indice de fréquence</h3>' +
    '<p class="bench-sub">Nombre d\'accidents du travail avec arrêt pour 1 000 salariés.</p>' +
    '<div class="bench-pos-grid">' +
      posCell('Mon entreprise', coIF, 'accent', null) +
      posCell('Mon secteur', secIF, 'sector', secSub) +
      posCell('Moyenne nationale', natIF, 'nat', null) +
    '</div>' +
    '<div class="bench-verdict ' + vcls + '">' + verdict + '</div>' +
  '</section>';
}

function posCell(label, value, cls, sub) {
  return '<div class="bench-pos-cell ' + cls + '">' +
    '<div class="bench-pos-label">' + label + '</div>' +
    (sub ? '<div class="bench-pos-sublib">' + sub + '</div>' : '') +
    '<div class="bench-pos-val">' + fmt1(value) + '</div>' +
  '</div>';
}

// ── Carte « Coût social estimé » ──
function renderCost(v, entry, s, eff, acc) {
  var mult = v.indirect || 0;
  var deces = v.deces != null ? v.deces : undefined;
  var est = estimateCoutSocial(v.sector, s, { accidents: acc, deces: deces }, mult);
  if (!est) return '';

  // Coût attendu si l'entreprise était à la moyenne de son secteur.
  var expectedAcc = (s.indice_frequence || 0) * eff / 1000;
  var estExp = estimateCoutSocial(v.sector, s, { accidents: expectedAcc }, mult);
  var headline = mult ? est.total : est.direct;
  var diffHTML = '';
  if (estExp) {
    var expHead = mult ? estExp.total : estExp.direct;
    var diff = headline - expHead;
    if (diff > headline * 0.02) diffHTML = '<div class="bench-gap above">≈ <strong>' + fmtEur(diff) + '/an</strong> de surcoût lié à votre sur-sinistralité, par rapport à la moyenne de votre secteur.</div>';
    else if (diff < -headline * 0.02) diffHTML = '<div class="bench-gap below">≈ <strong>' + fmtEur(-diff) + '/an</strong> de moins que la moyenne de votre secteur.</div>';
    else diffHTML = '<div class="bench-gap neutral">Proche du coût attendu pour la moyenne de votre secteur.</div>';
  }

  return '<section class="bench-card bench-cost">' +
    '<h3>Coût social estimé de vos accidents</h3>' +
    '<p class="bench-sub">Estimation via le barème des coûts moyens AT/MP ' + BAREME_YEAR +
      ' (CTN ' + est.ctn + ' — ' + est.ctnLabel + ').</p>' +
    '<div class="bench-cost-main">' +
      '<span class="bench-cost-big">' + fmtEur(headline) + '</span>' +
      '<span class="bench-cost-unit">par an<br>' + (mult ? 'coûts directs + indirects estimés' : 'coûts directs') + '</span>' +
    '</div>' +
    diffHTML +
    '<div class="bench-cost-breakdown">' +
      breakdownRow('Arrêts de travail (' + Math.round(est.itCount) + ')', est.itCost) +
      breakdownRow('Incapacités permanentes (' + fmt1(est.ipCount) + ')', est.ipCost) +
      breakdownRow('Décès / cas graves (' + fmt1(est.deathCount) + ')', est.deathCost) +
    '</div>' +
    '<label class="bench-indirect"><input type="checkbox" id="bench-indirectChk"' + (mult ? ' checked' : '') + '>' +
      ' Inclure les coûts indirects estimés (×4 : désorganisation, remplacement, retards…)</label>' +
    '<p class="bench-disclaimer">Estimation indicative. ' + BAREME_SOURCE +
      ' Profil de gravité dérivé de votre secteur. Le coût réel dépend de chaque sinistre et des règles de tarification (numéro de risque).</p>' +
  '</section>';
}

function breakdownRow(label, value) {
  return '<div class="bench-bd-row"><span class="bench-bd-label">' + label + '</span>' +
    '<span class="bench-bd-val">' + fmtEur(value) + '</span></div>';
}

// ── Pastille du secteur sélectionné ──
function renderSectorChip() {
  var wrap = el('bench-sectorChip');
  if (!wrap) return;
  var v = vs();
  if (!v.sector) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<span class="bench-chip">' +
    '<span class="bench-chip-code">' + v.sector + '</span>' +
    '<span class="bench-chip-lib">' + (v.sectorLib || '') + '</span>' +
    '<button class="bench-chip-x" id="bench-sectorClear" aria-label="Changer de secteur">&times;</button>' +
  '</span>';
  var clr = el('bench-sectorClear');
  if (clr) clr.addEventListener('click', function() {
    var s = vs(); s.sector = null; s.sectorLevel = null; s.sectorLib = null;
    var inp = el('bench-sectorInput'); if (inp) inp.value = '';
    renderBench();
  });
}

// ── Autocomplete secteur (sélection unique) ──
function setupSectorInput() {
  var input = el('bench-sectorInput');
  var acBox = el('bench-autocomplete');
  if (!input || !acBox) return;

  function closeAc() { acBox.classList.remove('open'); vs().acIndex = -1; }

  function show(query) {
    var index = buildIndex();
    var matches;
    var raw = (query || '').trim();
    if (!raw) {
      matches = index.filter(function(e) { return e.level === 'naf2'; }).slice(0, 25);
    } else {
      var q = normalize(query);
      var qUp = raw.toUpperCase();
      var isCode = /^[0-9]/.test(raw);
      matches = index.filter(function(e) {
        if (isCode) return e.code.toUpperCase().startsWith(qUp);
        return normalize(e.code).includes(q) || normalize(e.libelle).includes(q);
      }).sort(function(a, b) {
        if (a.code.length !== b.code.length) return a.code.length - b.code.length;
        return a.code.localeCompare(b.code);
      }).slice(0, 25);
    }
    if (!matches.length) { closeAc(); return; }
    acBox.innerHTML = matches.map(function(m) {
      return '<div class="ac-item" data-code="' + m.code + '">' +
        '<span class="code">' + m.code + '</span>' +
        '<span class="libelle">' + m.libelle + '</span>' +
        '<span class="level-tag">' + m.level.toUpperCase() + '</span>' +
        '</div>';
    }).join('');
    acBox.querySelectorAll('.ac-item').forEach(function(item) {
      item.addEventListener('click', function() {
        selectSector(this.dataset.code);
        input.value = '';
        closeAc();
      });
    });
    vs().acIndex = -1;
    acBox.classList.add('open');
  }

  var debounce;
  input.addEventListener('input', function() {
    clearTimeout(debounce);
    debounce = setTimeout(function() { show(input.value); }, 120);
  });
  input.addEventListener('focus', function() { show(this.value); });
  input.addEventListener('keydown', function(e) {
    var items = acBox.querySelectorAll('.ac-item');
    var v = vs();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      v.acIndex = Math.min(v.acIndex + 1, items.length - 1);
      items.forEach(function(it, i) { it.classList.toggle('active', i === v.acIndex); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      v.acIndex = Math.max(v.acIndex - 1, 0);
      items.forEach(function(it, i) { it.classList.toggle('active', i === v.acIndex); });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length) items[v.acIndex >= 0 ? v.acIndex : 0].click();
    } else if (e.key === 'Escape') {
      closeAc();
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#view-compare .bench-search')) closeAc();
  });
}

// ── Champs entreprise ──
function setupCompanyInputs() {
  var map = { 'bench-effectif': 'effectif', 'bench-accidents': 'accidents', 'bench-deces': 'deces' };
  Object.keys(map).forEach(function(id) {
    var inp = el(id);
    if (!inp) return;
    inp.addEventListener('input', function() {
      var n = parseFloat(this.value);
      vs()[map[id]] = isNaN(n) ? null : n;
      renderBench();
    });
  });
  var reset = el('bench-reset');
  if (reset) reset.addEventListener('click', function() {
    var v = vs();
    v.effectif = null; v.accidents = null; v.deces = null; v.indirect = 0;
    v.sector = null; v.sectorLevel = null; v.sectorLib = null;
    ['bench-effectif', 'bench-accidents', 'bench-deces', 'bench-sectorInput'].forEach(function(id) {
      var e = el(id); if (e) e.value = '';
    });
    renderBench();
  });
}

// ── Init ──
export function initCompare() {
  setupSectorInput();
  setupCompanyInputs();

  document.querySelectorAll('.nav-item[data-view="compare"]').forEach(function(item) {
    item.addEventListener('click', function() { renderBench(); });
  });
  window.addEventListener('hashchange', function() {
    if (window.location.hash.replace('#', '').trim() === 'compare') renderBench();
  });
  if (window.location.hash.replace('#', '').trim() === 'compare') renderBench();
}

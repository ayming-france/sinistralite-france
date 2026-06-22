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
var LVL_RANK = { naf5: 0, naf4: 1, naf2: 2 };   // pour classer les résultats : NAF5 d'abord
// Risques positionnés dans le benchmark (le coût social reste sur l'AT).
var POS_DOMAINS = [
  { id: 'at', label: 'Accidents du travail', field: 'accidents' },
  { id: 'mp', label: 'Maladies professionnelles', field: 'mp' },
  { id: 'trajet', label: 'Accidents de trajet', field: 'trajet' }
];

function vs() { return state.views.compare; }

// ── Formatage ──
function frNum(n) { return n.toLocaleString('fr-FR'); }
function fmt0(n) { return (n == null || isNaN(n)) ? '—' : Math.round(n).toLocaleString('fr-FR'); }
function fmt1(n) { return (n == null || isNaN(n)) ? '—' : n.toFixed(1).replace('.', ','); }
function pct(x) { return Math.round(x * 100) + ' %'; }
function fmtEur(n) {
  n = Math.round(n);
  if (n >= 1000000) return frNum(Math.round(n / 100000) / 10) + ' M€';
  if (n >= 10000) return frNum(Math.round(n / 1000)) + ' k€';
  return frNum(n) + ' €';
}

// ── Résolution du secteur (tous niveaux du domaine AT) ──
function resolveEntry(code, domain) {
  domain = domain || DOMAIN;
  for (var i = 0; i < LEVELS.length; i++) {
    var store = getStore(domain, LEVELS[i]);
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
  applyOtherVisibility();

  var sectorRes = v.sector ? resolveEntry(v.sector) : null;
  var eff = v.effectif, acc = v.accidents;
  var ready = sectorRes && eff > 0 && acc != null && acc >= 0;

  if (!ready) {
    box.innerHTML = renderSamplePreview(!!sectorRes);
    return;
  }

  var entry = sectorRes.entry;
  var s = entry.stats;

  box.innerHTML = renderPositions(v, eff) +
                  renderCost(v, entry, s, eff, acc);

  var chk = el('bench-indirectChk');
  if (chk) chk.addEventListener('change', function() {
    v.indirect = this.checked ? 4 : 0;
    renderBench();
  });
}

// ── État initial : aperçu grisé de ce que l'outil va produire ──
function renderSamplePreview(hasSector) {
  var hint = hasSector
    ? 'Renseignez votre <strong>effectif</strong> et vos <strong>AT avec arrêt</strong> pour voir votre position et le coût estimé.'
    : 'Choisissez votre <strong>secteur</strong>, puis renseignez votre effectif et vos AT avec arrêt.';
  var ghost =
    '<section class="bench-card bench-ghost" aria-hidden="true">' +
      '<h3>Ma position — indice de fréquence</h3>' +
      '<p class="bench-sub">Vos sinistres ramenés à 1 000 salariés, comparés à votre secteur et à la moyenne nationale.</p>' +
      '<div class="bench-pos-tablewrap"><table class="bench-pos-table"><thead><tr>' +
        '<th>Risque</th><th>Mon entreprise</th><th>Mon secteur</th><th>National</th><th>vs secteur</th>' +
      '</tr></thead><tbody>' +
        '<tr><td class="bench-pos-risk">Accidents du travail</td>' +
          '<td class="num accent"><div class="bench-co"><span class="bench-co-if">22,5</span><span class="bench-co-cap">votre indice de fréquence</span></div></td>' +
          '<td class="num">76,5</td><td class="num">23,9</td><td><span class="bench-badge below">−71%</span></td></tr>' +
      '</tbody></table></div>' +
    '</section>';
  return '<div class="bench-sample"><div class="bench-sample-hint"><span>' + hint + '</span></div>' + ghost + '</div>';
}

// ── Carte « Ma position » (AT + MP + Trajet) ──
function companyIF(count, eff) {
  return (count != null && count >= 0 && eff > 0) ? (count / eff) * 1000 : null;
}

function renderPositions(v, eff) {
  // Verdict principal : sur l'AT (risque renseigné par défaut).
  var headline = '';
  var atRes = resolveEntry(v.sector, 'at');
  var atSec = atRes ? atRes.entry.stats.indice_frequence : null;
  var atCo = companyIF(v.accidents, eff);
  if (atCo != null && atSec > 0) {
    var r = atCo / atSec;
    var cls = r > 1.05 ? 'above' : r < 0.95 ? 'below' : 'neutral';
    var txt = r > 1.05 ? 'Votre fréquence d\'accidents du travail est <strong>' + pct(r - 1) + ' au-dessus</strong> de votre secteur.'
            : r < 0.95 ? 'Votre fréquence d\'accidents du travail est <strong>' + pct(1 - r) + ' en dessous</strong> de votre secteur.'
            : 'Votre fréquence d\'accidents du travail est <strong>proche de la moyenne</strong> de votre secteur.';
    headline = '<div class="bench-verdict ' + cls + '">' + txt + '</div>';
  }

  // MP / Trajet n'apparaissent que si l'utilisateur les a ajoutés (indépendamment).
  var rows = POS_DOMAINS.filter(function(d) {
    return d.id === 'at' || (d.id === 'mp' && v.showMp) || (d.id === 'trajet' && v.showTrajet);
  }).map(function(d) {
    var data = getData(d.id);
    var res = resolveEntry(v.sector, d.id);
    var secIF = res ? res.entry.stats.indice_frequence : null;
    var natIF = (data && data.meta.national) ? data.meta.national.indice_frequence : null;
    var count = v[d.field];
    var coIF = companyIF(count, eff);
    var badge = '<span class="bench-badge muted">—</span>';
    if (coIF != null && secIF > 0) {
      var rr = coIF / secIF;
      var bcls = rr > 1.05 ? 'above' : rr < 0.95 ? 'below' : 'neutral';
      badge = '<span class="bench-badge ' + bcls + '">' + (rr >= 1 ? '+' : '−') + Math.round(Math.abs(rr - 1) * 100) + '%</span>';
    }
    // Cellule "Mon entreprise" : l'indice de fréquence, libellé clair (pas la formule brute).
    var coCell = (coIF != null)
      ? '<div class="bench-co"><span class="bench-co-if">' + fmt1(coIF) + '</span>' +
          '<span class="bench-co-cap">votre indice de fréquence</span></div>'
      : '<span class="bench-co-empty">—</span>';
    return '<tr>' +
      '<td class="bench-pos-risk">' + d.label + '</td>' +
      '<td class="num accent">' + coCell + '</td>' +
      '<td class="num">' + fmt1(secIF) + '</td>' +
      '<td class="num">' + fmt1(natIF) + '</td>' +
      '<td>' + badge + '</td>' +
    '</tr>';
  }).join('');

  return '<section class="bench-card">' +
    '<h3>Ma position — indice de fréquence</h3>' +
    '<p class="bench-sub">L\'indice de fréquence ramène vos sinistres à 1 000 salariés (nombre ÷ effectif × 1 000), pour pouvoir comparer à votre secteur et à la moyenne nationale, quelle que soit la taille.</p>' +
    headline +
    '<div class="bench-pos-tablewrap"><table class="bench-pos-table"><thead><tr>' +
      '<th>Risque</th><th>Mon entreprise</th><th>Mon secteur</th><th>National</th><th>vs secteur</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
  '</section>';
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

// ── Ajout indépendant des risques MP / Trajet ──
function toggleRisk(key, on, label) {
  var field = el('bench-' + key + 'Field');
  var btn = el('bench-add' + key.charAt(0).toUpperCase() + key.slice(1));
  if (field) field.style.display = on ? '' : 'none';
  if (btn) {
    btn.classList.toggle('active', on);
    btn.textContent = (on ? '✓ ' : '+ ') + label;
  }
}
function applyOtherVisibility() {
  var v = vs();
  toggleRisk('mp', v.showMp, 'Maladies professionnelles');
  toggleRisk('trajet', v.showTrajet, 'Accidents de trajet');
  toggleRisk('deces', v.showDeces, 'Décès');
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
    var raw = (query || '').trim();
    if (!raw) {
      // Pas de liste de divisions par défaut : on invite à taper, NAF5 = le plus précis.
      acBox.innerHTML = '<div class="ac-hint">Tapez un métier ou un code NAF. Le niveau le plus précis (NAF5) donne l\'estimation la plus juste.</div>';
      acBox.classList.add('open');
      return;
    }
    var q = normalize(query);
    var qUp = raw.toUpperCase();
    var isCode = /^[0-9]/.test(raw);
    var matches = index.filter(function(e) {
      if (isCode) return e.code.toUpperCase().startsWith(qUp);
      return normalize(e.code).includes(q) || normalize(e.libelle).includes(q);
    }).sort(function(a, b) {
      var ra = LVL_RANK[a.level], rb = LVL_RANK[b.level];   // NAF5 en tête
      if (ra !== rb) return ra - rb;
      return a.code.localeCompare(b.code);
    }).slice(0, 30);
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
  var map = { 'bench-effectif': 'effectif', 'bench-accidents': 'accidents', 'bench-mp': 'mp', 'bench-trajet': 'trajet', 'bench-deces': 'deces' };
  Object.keys(map).forEach(function(id) {
    var inp = el(id);
    if (!inp) return;
    inp.addEventListener('input', function() {
      // Compteurs entiers : on retire les séparateurs de milliers (espace, point, virgule)
      // pour éviter que "2 000" / "2,000" soit lu comme 2.
      var raw = (this.value || '').replace(/[^\d]/g, '');
      vs()[map[id]] = raw === '' ? null : parseInt(raw, 10);
      renderBench();
    });
  });
  var addMp = el('bench-addMp');
  if (addMp) addMp.addEventListener('click', function() {
    var v = vs(); v.showMp = !v.showMp;
    if (!v.showMp) { v.mp = null; var i = el('bench-mp'); if (i) i.value = ''; }
    renderBench();
    if (v.showMp) { var f = el('bench-mp'); if (f) f.focus(); }
  });
  var addTrajet = el('bench-addTrajet');
  if (addTrajet) addTrajet.addEventListener('click', function() {
    var v = vs(); v.showTrajet = !v.showTrajet;
    if (!v.showTrajet) { v.trajet = null; var i = el('bench-trajet'); if (i) i.value = ''; }
    renderBench();
    if (v.showTrajet) { var f = el('bench-trajet'); if (f) f.focus(); }
  });
  var addDeces = el('bench-addDeces');
  if (addDeces) addDeces.addEventListener('click', function() {
    var v = vs(); v.showDeces = !v.showDeces;
    if (!v.showDeces) { v.deces = null; var i = el('bench-deces'); if (i) i.value = ''; }
    renderBench();
    if (v.showDeces) { var f = el('bench-deces'); if (f) f.focus(); }
  });

  var reset = el('bench-reset');
  if (reset) reset.addEventListener('click', function() {
    var v = vs();
    v.effectif = null; v.accidents = null; v.mp = null; v.trajet = null; v.deces = null; v.indirect = 0;
    v.sector = null; v.sectorLevel = null; v.sectorLib = null; v.showMp = false; v.showTrajet = false; v.showDeces = false;
    ['bench-effectif', 'bench-accidents', 'bench-mp', 'bench-trajet', 'bench-deces', 'bench-sectorInput'].forEach(function(id) {
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

// ── Comparer les secteurs (domain-agnostic) ──

import { state, VIEW_CONFIG } from './state.js';
import { getData, getStore } from './data.js';
import { el, fmt, themeColor, normalize } from './utils.js';

var MAX_CODES = 4;
var LEVELS = ['naf5', 'naf4', 'naf2'];
// Couleurs distinctes par secteur (max 4)
var SECTOR_COLORS = ['#6366f1', '#e5534b', '#3fb950', '#e0a458'];

function vs() { return state.views.compare; }

// Résout une entrée NAF dans le domaine actif, quel que soit son niveau.
function resolveEntry(domain, code) {
  for (var i = 0; i < LEVELS.length; i++) {
    var store = getStore(domain, LEVELS[i]);
    if (store && store[code]) return { entry: store[code], level: LEVELS[i] };
  }
  return null;
}

// ── Index de recherche (nom -> code) sur naf5 + naf4 + naf2 du domaine actif ──
function buildIndex(domain) {
  var data = getData(domain);
  if (!data) return [];
  if (data.naf_index) return data.naf_index;
  return []
    .concat(Object.entries(data.by_naf2).map(function(p) { return { code: p[0], libelle: p[1].libelle, level: 'naf2' }; }))
    .concat(Object.entries(data.by_naf4).map(function(p) { return { code: p[0], libelle: p[1].libelle, level: 'naf4' }; }))
    .concat(Object.entries(data.by_naf5).map(function(p) { return { code: p[0], libelle: p[1].libelle, level: 'naf5' }; }));
}

// ── Actions ──
function addSector(code) {
  var v = vs();
  if (v.codes.indexOf(code) !== -1) return;
  if (v.codes.length >= MAX_CODES) return;
  v.codes.push(code);
  renderCompare();
}

function removeSector(code) {
  var v = vs();
  v.codes = v.codes.filter(function(c) { return c !== code; });
  renderCompare();
}

function setDomain(domain) {
  var v = vs();
  v.domain = domain;
  // Ne garder que les codes qui existent dans le nouveau domaine
  v.codes = v.codes.filter(function(c) { return !!resolveEntry(domain, c); });
  // Mettre à jour l'état actif des pills
  var toggle = el('compare-domainToggle');
  if (toggle) toggle.querySelectorAll('button').forEach(function(b) {
    b.classList.toggle('active', b.dataset.domain === domain);
  });
  renderCompare();
}

// ── Ratio "x nationale" en format FR (ex. "1,8x") ──
function ratioStr(value, base) {
  if (!base || base === 0 || value == null) return '—';
  return (value / base).toFixed(1).replace('.', ',') + 'x';
}

// ── Rendu ──
function renderCompare() {
  var v = vs();
  var domain = v.domain;
  var data = getData(domain);
  if (!data) return;
  var cfg = VIEW_CONFIG[domain];
  var nat = data.meta.national;

  renderChips();

  var tableWrap = el('compare-table');
  var evoCard = document.querySelector('.compare-evo-card');

  if (!v.codes.length) {
    if (tableWrap) tableWrap.innerHTML =
      '<div class="compare-empty">Ajoutez des secteurs à comparer (recherchez un métier ci-dessus).</div>';
    if (evoCard) evoCard.style.display = 'none';
    if (v.evoChart) { v.evoChart.destroy(); v.evoChart = null; }
    return;
  }
  if (evoCard) evoCard.style.display = '';

  // Lignes des secteurs sélectionnés
  var rows = v.codes.map(function(code) {
    var res = resolveEntry(domain, code);
    if (!res) return '';
    var s = res.entry.stats;
    return '<tr>' +
      '<td class="cmp-sector"><span class="cmp-code">' + code + '</span>' +
      '<span class="cmp-lib">' + res.entry.libelle + '</span></td>' +
      '<td class="cmp-num">' + fmt(s.indice_frequence) + '</td>' +
      '<td class="cmp-num">' + ratioStr(s.indice_frequence, nat.indice_frequence) + '</td>' +
      '<td class="cmp-num">' + fmt(s.taux_gravite) + '</td>' +
      '<td class="cmp-num">' + fmt(s.deces) + '</td>' +
      '<td class="cmp-num">' + fmt(s.nb_salaries) + '</td>' +
      '</tr>';
  }).join('');

  // Ligne de référence : moyenne nationale
  var baseRow = '<tr class="cmp-baseline">' +
    '<td class="cmp-sector"><span class="cmp-code">FR</span>' +
    '<span class="cmp-lib">Moyenne nationale</span></td>' +
    '<td class="cmp-num">' + fmt(nat.indice_frequence) + '</td>' +
    '<td class="cmp-num">—</td>' +
    '<td class="cmp-num">' + fmt(nat.taux_gravite) + '</td>' +
    '<td class="cmp-num">' + fmt(nat.deces) + '</td>' +
    '<td class="cmp-num">' + fmt(nat.nb_salaries) + '</td>' +
    '</tr>';

  if (tableWrap) {
    tableWrap.innerHTML = '<table class="compare-table">' +
      '<thead><tr>' +
      '<th>Secteur</th><th>Indice de fréquence</th><th>x nationale</th>' +
      '<th>Taux de gravité</th><th>Décès</th><th>Salariés</th>' +
      '</tr></thead><tbody>' + rows + baseRow + '</tbody></table>';
  }

  renderEvoChart(domain, data, cfg, nat);
}

function renderChips() {
  var v = vs();
  var wrap = el('compare-chips');
  if (!wrap) return;
  if (!v.codes.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = v.codes.map(function(code, idx) {
    var res = resolveEntry(v.domain, code);
    var lib = res ? res.entry.libelle : '';
    var color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
    return '<span class="compare-chip" data-code="' + code + '">' +
      '<span class="chip-dot" style="background:' + color + '"></span>' +
      '<span class="chip-code">' + code + '</span>' +
      '<span class="chip-lib">' + lib + '</span>' +
      '<button class="chip-remove" data-code="' + code + '" aria-label="Retirer ' + code + '">&times;</button>' +
      '</span>';
  }).join('');
  wrap.querySelectorAll('.chip-remove').forEach(function(btn) {
    btn.addEventListener('click', function() { removeSector(this.dataset.code); });
  });
}

function renderEvoChart(domain, data, cfg, nat) {
  var v = vs();
  if (v.evoChart) { v.evoChart.destroy(); v.evoChart = null; }
  var years = data.meta.years;
  var canvas = el('compare-evoChart');
  if (!canvas || !years || years.length < 2) return;

  var natYearly = nat.yearly || {};
  var datasets = v.codes.map(function(code, idx) {
    var res = resolveEntry(domain, code);
    if (!res || !res.entry.yearly) return null;
    var yearly = res.entry.yearly;
    var color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
    return {
      label: code,
      data: years.map(function(yr) { return yearly[yr] ? yearly[yr].indice_frequence : null; }),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false,
      tension: 0.3,
      spanGaps: true,
    };
  }).filter(Boolean);

  // Ligne nationale en pointillés
  datasets.push({
    label: 'Moyenne nationale',
    data: years.map(function(yr) { return natYearly[yr] ? natYearly[yr].indice_frequence : null; }),
    borderColor: '#64748b',
    backgroundColor: '#64748b',
    borderWidth: 2,
    borderDash: [6, 3],
    pointRadius: 3,
    fill: false,
    tension: 0.3,
    spanGaps: true,
  });

  v.evoChart = new Chart(canvas, {
    type: 'line',
    data: { labels: years, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 12, color: themeColor('--text-secondary'), font: { size: 11, family: "'Lato', sans-serif" } } },
        datalabels: { display: false },
        tooltip: {
          backgroundColor: themeColor('--chart-tooltip-bg'), borderColor: themeColor('--border'), borderWidth: 1,
          titleColor: themeColor('--text'), bodyColor: themeColor('--text-secondary'),
          titleFont: { family: "'JetBrains Mono', monospace", size: 11 }, bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          callbacks: { label: function(ctx) { return ' ' + ctx.dataset.label + ' : ' + (ctx.parsed.y == null ? 'n/a' : ctx.parsed.y.toFixed(1)); } }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: "'JetBrains Mono', monospace", size: 12, weight: '600' }, color: themeColor('--chart-label') } },
        y: { beginAtZero: true, grid: { color: themeColor('--chart-grid') }, ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 }, color: themeColor('--text-dim') } }
      }
    }
  });
}

// ── Autocomplete d'ajout de secteur ──
function setupAddInput() {
  var input = el('compare-addInput');
  var acBox = el('compare-autocomplete');
  if (!input || !acBox) return;

  function closeAc() { acBox.classList.remove('open'); vs().acIndex = -1; }

  function show(query) {
    var domain = vs().domain;
    var index = buildIndex(domain);
    var matches;
    if (!query || !query.trim()) {
      matches = index.filter(function(e) { return e.level === 'naf2'; }).slice(0, 25);
    } else {
      var q = normalize(query);
      var qUp = query.trim().toUpperCase();
      var isCode = /^[0-9]/.test(query.trim());
      matches = index.filter(function(e) {
        if (isCode) return e.code.toUpperCase().startsWith(qUp);
        return normalize(e.code).includes(q) || normalize(e.libelle).includes(q);
      }).sort(function(a, b) {
        if (a.code.length !== b.code.length) return a.code.length - b.code.length;
        return a.code.localeCompare(b.code);
      }).slice(0, 25);
    }
    // Exclure les codes déjà sélectionnés
    var selected = vs().codes;
    matches = matches.filter(function(m) { return selected.indexOf(m.code) === -1; });

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
        addSector(this.dataset.code);
        input.value = '';
        closeAc();
        input.focus();
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
    if (!e.target.closest('#view-compare .compare-search')) closeAc();
  });
}

// ── Init ──
export function initCompare() {
  // Pills de domaine
  var toggle = el('compare-domainToggle');
  if (toggle) toggle.querySelectorAll('button').forEach(function(btn) {
    btn.addEventListener('click', function() { setDomain(this.dataset.domain); });
  });

  setupAddInput();

  // Rendu quand la vue devient active (clic nav + hashchange + au chargement)
  document.querySelectorAll('.nav-item[data-view="compare"]').forEach(function(item) {
    item.addEventListener('click', function() { renderCompare(); });
  });
  window.addEventListener('hashchange', function() {
    if (window.location.hash.replace('#', '').trim() === 'compare') renderCompare();
  });
  if (window.location.hash.replace('#', '').trim() === 'compare') renderCompare();
}

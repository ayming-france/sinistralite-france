// ── Comparaison inline de secteurs (NAF5 uniquement) ──
// Permet, depuis la fiche d'un secteur NAF5, d'ajouter jusqu'à 4 autres
// secteurs NAF5 superposés dans les graphiques clés de la vue courante.

import { state } from './state.js';
import { getStore } from './data.js';
import { viewEl, normalize } from './utils.js';
import { SECTOR_COLORS } from './compare.js';

var MAX_COMPARE = 4;
var renderFn = null;

// Index NAF5 (code -> libellé) par domaine, construit à la demande.
var naf5IndexCache = {};
function buildNaf5Index(viewId) {
  if (naf5IndexCache[viewId]) return naf5IndexCache[viewId];
  var store = getStore(viewId, 'naf5');
  var index = Object.keys(store)
    .map(function(code) { return { code: code, libelle: store[code].libelle }; })
    .sort(function(a, b) { return a.code.localeCompare(b.code); });
  naf5IndexCache[viewId] = index;
  return index;
}

// ── Actions ──
export function addCompareCode(viewId, code) {
  var vs = state.views[viewId];
  if (!vs.code || code === vs.code) return;
  if (vs.compareCodes.indexOf(code) !== -1) return;
  if (vs.compareCodes.length >= MAX_COMPARE) return;
  if (!getStore(viewId, 'naf5')[code]) return;
  vs.compareCodes.push(code);
  rerun(viewId);
}

export function removeCompareCode(viewId, code) {
  var vs = state.views[viewId];
  vs.compareCodes = vs.compareCodes.filter(function(c) { return c !== code; });
  rerun(viewId);
}

function rerun(viewId) {
  var vs = state.views[viewId];
  if (vs.code && renderFn) renderFn(viewId, vs.code, vs.level);
}

// ── Chips amovibles ──
export function renderChips(viewId) {
  var vs = state.views[viewId];
  var wrap = viewEl(viewId, 'cmpChips');
  if (!wrap) return;
  var naf5 = getStore(viewId, 'naf5');
  wrap.innerHTML = vs.compareCodes.map(function(code, idx) {
    var entry = naf5[code];
    var lib = entry ? entry.libelle : '';
    var color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
    return '<span class="compare-chip" data-code="' + code + '">' +
      '<span class="chip-dot" style="background:' + color + '"></span>' +
      '<span class="chip-code">' + code + '</span>' +
      '<span class="chip-lib">' + lib + '</span>' +
      '<button class="chip-remove" data-code="' + code + '" aria-label="Retirer ' + code + '">&times;</button>' +
      '</span>';
  }).join('');
  wrap.querySelectorAll('.chip-remove').forEach(function(btn) {
    btn.addEventListener('click', function() { removeCompareCode(viewId, this.dataset.code); });
  });
}

// ── Affichage / masquage de la barre de comparaison ──
export function renderInline(viewId) {
  var bar = viewEl(viewId, 'cmpBar');
  if (bar) bar.style.display = '';
  renderChips(viewId);
}

export function hideInlineBar(viewId) {
  var bar = viewEl(viewId, 'cmpBar');
  if (bar) bar.style.display = 'none';
}

// ── Autocomplete d'ajout (NAF5 uniquement) ──
function setupInput(viewId) {
  var input = viewEl(viewId, 'cmpAddInput');
  var acBox = viewEl(viewId, 'cmpAutocomplete');
  if (!input || !acBox) return;
  var vs = state.views[viewId];
  var acIndex = -1;

  function closeAc() { acBox.classList.remove('open'); acIndex = -1; }

  function show(query) {
    if (vs.compareCodes.length >= MAX_COMPARE) {
      acBox.innerHTML = '<div class="ac-item ac-item-info">Maximum ' + MAX_COMPARE + ' secteurs comparés.</div>';
      acBox.classList.add('open');
      return;
    }
    var index = buildNaf5Index(viewId);
    var current = vs.code;
    var selected = vs.compareCodes;
    var raw = (query || '').trim();
    var matches;
    if (!raw) {
      matches = index.slice(0, 25);
    } else {
      var q = normalize(query);
      var qUp = raw.toUpperCase();
      var isCode = /^[0-9]/.test(raw);
      matches = index.filter(function(e) {
        if (isCode) return e.code.toUpperCase().startsWith(qUp);
        return normalize(e.code).includes(q) || normalize(e.libelle).includes(q);
      }).slice(0, 25);
    }
    matches = matches.filter(function(m) {
      return m.code !== current && selected.indexOf(m.code) === -1;
    });
    if (!matches.length) { closeAc(); return; }
    acBox.innerHTML = matches.map(function(m) {
      return '<div class="ac-item" data-code="' + m.code + '">' +
        '<span class="code">' + m.code + '</span>' +
        '<span class="libelle">' + m.libelle + '</span>' +
        '<span class="level-tag">NAF5</span>' +
        '</div>';
    }).join('');
    acBox.querySelectorAll('.ac-item').forEach(function(item) {
      item.addEventListener('click', function() {
        addCompareCode(viewId, this.dataset.code);
        input.value = '';
        closeAc();
        input.focus();
      });
    });
    acIndex = -1;
    acBox.classList.add('open');
  }

  var debounce;
  input.addEventListener('input', function() {
    clearTimeout(debounce);
    debounce = setTimeout(function() { show(input.value); }, 120);
  });
  input.addEventListener('focus', function() { show(this.value); });
  input.addEventListener('keydown', function(e) {
    var items = acBox.querySelectorAll('.ac-item[data-code]');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      acIndex = Math.min(acIndex + 1, items.length - 1);
      items.forEach(function(it, i) { it.classList.toggle('active', i === acIndex); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      acIndex = Math.max(acIndex - 1, 0);
      items.forEach(function(it, i) { it.classList.toggle('active', i === acIndex); });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length) items[acIndex >= 0 ? acIndex : 0].click();
    } else if (e.key === 'Escape') {
      closeAc();
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#' + viewId + '-cmpBar')) closeAc();
  });
}

// ── Init (une seule fois) ──
export function initInlineCompare(fn) {
  renderFn = fn;
  ['at', 'mp', 'trajet'].forEach(setupInput);
}

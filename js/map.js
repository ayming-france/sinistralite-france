/**
 * map.js — Phase 8: Coloration choroplèthe
 * Charge les données régionales et colorie les 16 caisses métropolitaines.
 */

const CAISSE_IDS = [
  'alsace-moselle', 'aquitaine', 'auvergne', 'bourgogne-franche-comte',
  'bretagne', 'centre-ouest', 'centre-val-de-loire', 'cramif',
  'languedoc-roussillon', 'midi-pyrenees', 'nord-est', 'nord-picardie',
  'normandie', 'pays-de-la-loire', 'rhone-alpes', 'sud-est'
];

const METRO_IDS = CAISSE_IDS;

let regionalData = null;

const MIN_COLOR = '#deebf7';
const MAX_COLOR = '#08519c';
const DEFAULT_YEAR = '2023';

/**
 * Interpole linéairement entre deux couleurs hex.
 * @param {string} minColor - couleur hex minimale (ex: '#deebf7')
 * @param {string} maxColor - couleur hex maximale (ex: '#08519c')
 * @param {number} t - facteur d'interpolation, entre 0 et 1
 * @returns {string} couleur rgb interpolée
 */
function interpolateColor(minColor, maxColor, t) {
  const clamp = Math.min(1, Math.max(0, t));

  const parseHex = (hex) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  };

  const [r1, g1, b1] = parseHex(minColor);
  const [r2, g2, b2] = parseHex(maxColor);

  const r = Math.round(r1 + (r2 - r1) * clamp);
  const g = Math.round(g1 + (g2 - g1) * clamp);
  const b = Math.round(b1 + (b2 - b1) * clamp);

  return `rgb(${r},${g},${b})`;
}

/**
 * Génère la légende avec 5 paliers de couleur.
 * @param {string} legendElId - ID de l'élément conteneur de la légende
 * @param {number} minVal - valeur minimale
 * @param {number} maxVal - valeur maximale
 * @param {string} minColor - couleur hex minimale
 * @param {string} maxColor - couleur hex maximale
 */
function renderLegende(legendElId, minVal, maxVal, minColor, maxColor) {
  const el = document.getElementById(legendElId);
  if (!el) return;

  const steps = [0, 0.25, 0.5, 0.75, 1.0];
  const swatches = steps.map(t => {
    const color = interpolateColor(minColor, maxColor, t);
    const val = Math.round(minVal + (maxVal - minVal) * t);
    return `<span class="legend-swatch" style="background:${color}" title="${val.toLocaleString('fr-FR')}"></span>`;
  }).join('');

  el.innerHTML = `<span class="legend-min">${minVal.toLocaleString('fr-FR')}</span><div class="legend-swatches">${swatches}</div><span class="legend-max">${maxVal.toLocaleString('fr-FR')}</span>`;
}

/**
 * Colorie la carte SVG avec un dégradé de couleur proportionnel aux données.
 * @param {string} viewType - 'at' ou 'trajet'
 * @param {string} year - année des données (ex: '2023')
 * @param {object} data - données régionales (regional-data.json)
 */
export function colorierCarte(viewType, year, data) {
  const svgId = viewType === 'at' ? 'france-map-at' : 'france-map-trajet';
  const legendId = viewType === 'at' ? 'at-mapLegend' : 'trajet-mapLegend';
  const metric = viewType === 'at' ? 'at' : 'trajet';

  const svg = document.getElementById(svgId);
  if (!svg || !data) return;

  const caisses = data.caisses || [];

  const metroVals = METRO_IDS.map(id => {
    const caisse = caisses.find(c => c.id === id);
    if (!caisse) return null;
    const val = caisse[metric] && caisse[metric][year];
    return val != null ? { id, val } : null;
  }).filter(Boolean);

  if (metroVals.length === 0) return;

  const values = metroVals.map(c => c.val);
  const min = Math.min(...values);
  const max = Math.max(...values);

  metroVals.forEach(({ id, val }) => {
    const el = svg.querySelector(`[data-caisse="${id}"]`);
    if (!el) return;

    const t = min === max ? 0 : (val - min) / (max - min);
    el.style.fill = interpolateColor(MIN_COLOR, MAX_COLOR, t);
  });

  renderLegende(legendId, min, max, MIN_COLOR, MAX_COLOR);
}

/** État du tri par vue */
const sortState = { at: 'desc', trajet: 'desc' };

/** Retourne l'année active pour une vue depuis les pill buttons. */
function getActiveYear(viewType) {
  const container = document.getElementById(viewType + '-yearSelect');
  if (!container) return DEFAULT_YEAR;
  const active = container.querySelector('.year-pill.active');
  return active ? active.dataset.year : DEFAULT_YEAR;
}

/**
 * Affiche le classement des caisses pour la vue et l'année données.
 * @param {string} viewType - 'at' ou 'trajet'
 * @param {string} year - année des données (ex: '2023')
 */
function renderRanking(viewType, year) {
  const listEl = document.getElementById(viewType + '-rankingList');
  if (!listEl || !regionalData) return;

  const caisses = regionalData.caisses || [];
  const metric = viewType === 'at' ? 'at' : 'trajet';

  const metroVals = METRO_IDS.map(id => {
    const caisse = caisses.find(c => c.id === id);
    if (!caisse) return null;
    const val = caisse[metric] && caisse[metric][year];
    return val != null ? { id, name: caisse.name || id, val } : null;
  }).filter(Boolean);

  const values = metroVals.map(c => c.val);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (sortState[viewType] === 'desc') {
    metroVals.sort((a, b) => b.val - a.val);
  } else {
    metroVals.sort((a, b) => a.val - b.val);
  }

  listEl.innerHTML = metroVals.map((c, i) => {
    const t = min === max ? 0 : (c.val - min) / (max - min);
    const color = interpolateColor(MIN_COLOR, MAX_COLOR, t);
    const pct = Math.max(8, Math.round(t * 100));
    return `<li class="ranking-item" data-caisse="${c.id}"><span class="ranking-fill" style="background:${color};width:${pct}%"></span><span class="ranking-pos">${i + 1}</span><span class="ranking-name">${c.name}</span><span class="ranking-val">${c.val.toLocaleString('fr-FR')}</span></li>`;
  }).join('');
}

/**
 * Configure le bouton de tri pour inverser l'ordre du classement.
 * @param {string} viewType - 'at' ou 'trajet'
 */
function setupSortButton(viewType) {
  const btn = document.getElementById(viewType + '-sortBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    sortState[viewType] = sortState[viewType] === 'desc' ? 'asc' : 'desc';
    btn.innerHTML = sortState[viewType] === 'desc' ? '\u25BC' : '\u25B2';
    renderRanking(viewType, getActiveYear(viewType));
  });
}

/**
 * Configure le sélecteur d'année pour mettre à jour la carte, la légende et le classement.
 * @param {string} viewType - 'at' ou 'trajet'
 */
function setupYearSelector(viewType) {
  const container = document.getElementById(viewType + '-yearSelect');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const pill = e.target.closest('.year-pill');
    if (!pill) return;
    container.querySelector('.year-pill.active')?.classList.remove('active');
    pill.classList.add('active');
    updateMap(viewType, pill.dataset.year);
  });
}

/**
 * Met à jour la carte, la légende et le classement pour la vue et l'année données.
 * @param {string} viewType - 'at' ou 'trajet'
 * @param {string} year - année des données (ex: '2023')
 */
function updateMap(viewType, year) {
  colorierCarte(viewType, year, regionalData);
  renderRanking(viewType, year);
}

/**
 * Configure le tooltip de survol pour une carte SVG.
 * Désactivé sur les appareils tactiles (reporté à la Phase 9).
 * @param {string} svgId - ID de l'élément SVG
 * @param {string} viewType - 'at' ou 'trajet'
 */
function setupTooltip(svgId, viewType) {
  if (navigator.maxTouchPoints > 0) return;

  const svg = document.getElementById(svgId);
  const tooltip = document.getElementById('mapTooltip');
  if (!svg || !tooltip) return;

  const metricLabel = viewType === 'at' ? 'Accidents du travail' : 'Accidents de trajet';

  svg.addEventListener('mousemove', (e) => {
    const g = e.target.closest('[data-caisse]');
    if (!g) {
      tooltip.style.display = 'none';
      return;
    }

    const caisseId = g.dataset.caisse;
    const caisses = regionalData ? regionalData.caisses || [] : [];
    const caisse = caisses.find(c => c.id === caisseId);
    if (!caisse) {
      tooltip.style.display = 'none';
      return;
    }

    const year = getActiveYear(viewType);
    const metric = viewType === 'at' ? 'at' : 'trajet';
    const val = caisse[metric] && caisse[metric][year];

    if (val == null) {
      tooltip.style.display = 'none';
      return;
    }

    const name = caisse.name || caisseId;
    tooltip.innerHTML = `<span class="tooltip-name">${name}</span><span class="tooltip-val">${metricLabel} : ${val.toLocaleString('fr-FR')} (${year})</span>`;
    tooltip.style.display = 'block';

    let left = e.clientX + 12;
    let top = e.clientY + 12;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    if (left + tw > window.innerWidth - 8) left = e.clientX - tw - 12;
    if (top + th > window.innerHeight - 8) top = e.clientY - th - 12;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  });

  svg.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
}

/**
 * Lie les survols entre carte SVG et panneau de classement.
 * Hover sur la carte met en avant la ligne du classement (et inversement).
 * Les autres éléments sont atténués via la classe .map-dim sur le conteneur SVG.
 */
function setupLinkedHighlight(svgId, viewType) {
  const svg = document.getElementById(svgId);
  const rankingList = document.getElementById(viewType + '-rankingList');
  if (!svg || !rankingList) return;

  function highlight(caisseId) {
    svg.classList.add('map-dim');
    const g = svg.querySelector(`[data-caisse="${caisseId}"]`);
    if (g) g.classList.add('map-active');
    const li = rankingList.querySelector(`[data-caisse="${caisseId}"]`);
    if (li) li.classList.add('ranking-active');
  }

  function clear() {
    svg.classList.remove('map-dim');
    svg.querySelectorAll('.map-active').forEach(el => el.classList.remove('map-active'));
    rankingList.querySelectorAll('.ranking-active').forEach(el => el.classList.remove('ranking-active'));
  }

  svg.addEventListener('mouseover', (e) => {
    const g = e.target.closest('[data-caisse]');
    if (!g) { clear(); return; }
    clear();
    highlight(g.dataset.caisse);
  });
  svg.addEventListener('mouseleave', clear);

  rankingList.addEventListener('mouseover', (e) => {
    const li = e.target.closest('[data-caisse]');
    if (!li) { clear(); return; }
    clear();
    highlight(li.dataset.caisse);
  });
  rankingList.addEventListener('mouseleave', clear);
}

/**
 * Vérifie que chaque caisse ID a au moins un élément [data-caisse] dans le DOM.
 */
function verifierStructureSVG() {
  let ok = 0;
  const manquants = [];

  CAISSE_IDS.forEach(id => {
    const els = document.querySelectorAll(`[data-caisse="${id}"]`);
    if (els.length > 0) {
      ok++;
    } else {
      manquants.push(id);
    }
  });

  if (manquants.length === 0) {
    console.log(`[map.js] SVG Phase 7: ${ok}/16 caisses présentes dans le DOM.`);
  } else {
    console.warn('[map.js] Caisses manquantes dans le SVG:', manquants);
  }
}

/**
 * Charge les données régionales depuis le fichier JSON.
 */
async function loadRegionalData() {
  const res = await fetch('data/regional-data.json');
  regionalData = await res.json();
}

document.addEventListener('DOMContentLoaded', async () => {
  verifierStructureSVG();
  await loadRegionalData();
  colorierCarte('at', DEFAULT_YEAR, regionalData);
  colorierCarte('trajet', DEFAULT_YEAR, regionalData);
  renderRanking('at', DEFAULT_YEAR);
  renderRanking('trajet', DEFAULT_YEAR);
  setupTooltip('france-map-at', 'at');
  setupTooltip('france-map-trajet', 'trajet');
  setupYearSelector('at');
  setupYearSelector('trajet');
  setupSortButton('at');
  setupSortButton('trajet');
  setupLinkedHighlight('france-map-at', 'at');
  setupLinkedHighlight('france-map-trajet', 'trajet');
});

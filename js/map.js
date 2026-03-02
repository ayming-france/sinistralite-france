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
});

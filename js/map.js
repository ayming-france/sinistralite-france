/**
 * map.js — Phase 8: Coloration choroplèthe (stub Phase 7)
 * Vérifie la présence des 16 groupes data-caisse au démarrage.
 */

const CAISSE_IDS = [
  'alsace-moselle', 'aquitaine', 'auvergne', 'bourgogne-franche-comte',
  'bretagne', 'centre-ouest', 'centre-val-de-loire', 'cramif',
  'languedoc-roussillon', 'midi-pyrenees', 'nord-est', 'nord-picardie',
  'normandie', 'pays-de-la-loire', 'rhone-alpes', 'sud-est'
];

/**
 * Vérifie que chaque caisse ID a au moins un élément [data-caisse] dans le DOM.
 * Utilisé en Phase 7 pour confirmer la structure SVG.
 * En Phase 8, cette fonction sera étendue pour appliquer la coloration.
 */
function verifierStructureSVG() {
  let ok = 0;
  let manquants = [];

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

// Placeholder Phase 8: sera rempli avec la logique de coloration
export function colorierCarte(_viewType, _year, _data) {
  // TODO Phase 8: appliquer fill sur chaque [data-caisse] selon les données régionales
}

document.addEventListener('DOMContentLoaded', verifierStructureSVG);

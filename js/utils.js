// ── Helpers ──

export function fmt(n) {
  if (n === undefined || n === null) return '-';
  return n.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ');
}

export function fmtCompact(n) {
  if (n === undefined || n === null) return { text: '-', compact: false };
  if (n >= 1000000) return { text: (n / 1000000).toFixed(1).replace('.', ',').replace(/,0$/, '') + 'M', compact: true };
  if (n >= 1000) return { text: (n / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '') + 'K', compact: true };
  return { text: fmt(n), compact: false };
}

export var KPI_HELP = {
  'AT en 1er règlement': 'Accidents du travail ayant donné lieu à un premier règlement (indemnisation) par la CPAM.',
  'MP en 1er règlement': 'Maladies professionnelles ayant donné lieu à un premier règlement (indemnisation) par la CPAM.',
  'Accidents de trajet': 'Accidents survenus pendant le trajet domicile-travail ou travail-restaurant.',
  'Indice de fréquence': 'Nombre d\'accidents avec arrêt pour 1 000 salariés. Permet de comparer des secteurs de tailles différentes.',
  'Journées perdues': 'Total des journées d\'incapacité temporaire (arrêts de travail) imputées au secteur.',
  'Incapacités permanentes': 'Nouvelles incapacités permanentes (IP) reconnues dans l\'année. Mesure la gravité des séquelles.',
  'Salariés': 'Nombre de salariés couverts par le régime général dans ce secteur.',
  'Décès': '',
};

export function badgeHTML(secteur, national, invert) {
  if (!national || national === 0) return '';
  var pct = ((secteur - national) / national * 100);
  var sign = pct >= 0 ? '+' : '';
  var cls = pct > 5 ? 'up' : pct < -5 ? 'down' : 'neutral';
  if (invert) cls = cls === 'up' ? 'down' : cls === 'down' ? 'up' : 'neutral';
  return '<span class="badge ' + cls + '">' + sign + pct.toFixed(0) + '% vs national</span>';
}

export function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export var CAUSE_COLORS = [
  '#7c6ef0','#4e9af5','#3fb950','#e8bc6a',
  '#e5534b','#d94fa0','#5bc0be','#f0883e'
];

// ── DOM helpers ──
export function el(id) { return document.getElementById(id); }
export function viewEl(viewId, suffix) { return el(viewId + '-' + suffix); }

export function themeColor(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

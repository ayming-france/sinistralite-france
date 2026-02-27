// ── Insights ──

import { fmt, el, viewEl } from './utils.js';
import { state } from './state.js';
import { getData, getStore } from './data.js';

var FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(drawer) {
  var focusable = Array.from(drawer.querySelectorAll(FOCUSABLE));
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  drawer._trapHandler = function(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  drawer.addEventListener('keydown', drawer._trapHandler);
}

export function releaseFocus(drawer) {
  if (drawer._trapHandler) drawer.removeEventListener('keydown', drawer._trapHandler);
}

export function renderInsights(viewId, s, nat, causes, cfg, yearly) {
  var insights = [];

  var ifRatio = nat.indice_frequence > 0 ? s.indice_frequence / nat.indice_frequence : 0;
  if (ifRatio >= 3) {
    insights.push({ level: 'danger', text: 'Indice de fréquence ' + ifRatio.toFixed(1) + 'x la moyenne nationale' });
  } else if (ifRatio >= 2) {
    insights.push({ level: 'danger', text: 'IF ' + ifRatio.toFixed(1) + 'x au-dessus de la moyenne nationale' });
  } else if (ifRatio >= 1.3) {
    insights.push({ level: 'warn', text: 'IF ' + Math.round((ifRatio - 1) * 100) + '% au-dessus de la moyenne nationale' });
  } else if (ifRatio <= 0.5 && ifRatio > 0) {
    insights.push({ level: 'info', text: 'IF 2x en dessous de la moyenne nationale' });
  }

  var tgRatio = (s.taux_gravite && nat.taux_gravite > 0) ? s.taux_gravite / nat.taux_gravite : 0;
  if (tgRatio >= 2) {
    insights.push({ level: 'danger', text: 'Gravité ' + tgRatio.toFixed(1) + 'x la moyenne nationale' });
  } else if (tgRatio >= 1.3) {
    insights.push({ level: 'warn', text: 'Gravité ' + Math.round((tgRatio - 1) * 100) + '% au-dessus de la moyenne' });
  }

  var eventCount = s[cfg.eventKey] || 0;
  var ipRate = eventCount > 0 ? (s.nouvelles_ip / eventCount * 100) : 0;
  if (ipRate >= 5) {
    insights.push({ level: 'danger', text: ipRate.toFixed(1) + '% mènent à une incapacité permanente' });
  } else if (ipRate >= 3) {
    insights.push({ level: 'warn', text: ipRate.toFixed(1) + '% mènent à une incapacité permanente' });
  }

  if (s.deces > 0) {
    insights.push({ level: 'danger', text: s.deces + ' décès enregistré' + (s.deces > 1 ? 's' : '') + ' en 2023' });
  }

  var sorted = causes ? Object.entries(causes).filter(function(pair) { return pair[1] > 0; }).sort(function(a, b) { return b[1] - a[1]; }) : [];
  if (sorted.length > 0 && sorted[0][1] >= 35) {
    insights.push({ level: 'warn', text: sorted[0][0] + ' = ' + sorted[0][1].toFixed(0) + '% des cas' });
  }

  if (eventCount >= 10000) {
    insights.push({ level: 'info', text: fmt(eventCount) + ' cas, secteur à fort volume' });
  }

  // MP-specific: high IP rate with severe taux
  if (viewId === 'mp' && s.ip_taux_sup_10 > 0) {
    var severeRate = eventCount > 0 ? (s.ip_taux_sup_10 / eventCount * 100) : 0;
    if (severeRate >= 10) {
      insights.push({ level: 'danger', text: severeRate.toFixed(0) + '% des MP avec taux IP >= 10%' });
    }
  }

  // Evolution insights
  var dataYears = getData(viewId).meta.years;
  var firstYr = dataYears ? dataYears[0] : null;
  var lastYr = dataYears ? dataYears[dataYears.length - 1] : null;
  if (yearly && firstYr && lastYr && yearly[firstYr] && yearly[lastYr]) {
    var y21 = yearly[firstYr], y23 = yearly[lastYr];
    if (y21.indice_frequence > 0) {
      var ifDelta = ((y23.indice_frequence - y21.indice_frequence) / y21.indice_frequence * 100);
      if (ifDelta <= -15) {
        insights.push({ level: 'info', text: 'IF en baisse de ' + Math.abs(ifDelta).toFixed(0) + '% depuis ' + firstYr });
      } else if (ifDelta >= 15) {
        insights.push({ level: 'warn', text: 'IF en hausse de ' + ifDelta.toFixed(0) + '% depuis ' + firstYr });
      }
    }
    if (y21.taux_gravite && y21.taux_gravite > 0) {
      var tgDelta = ((y23.taux_gravite - y21.taux_gravite) / y21.taux_gravite * 100);
      if (tgDelta >= 20) {
        insights.push({ level: 'danger', text: 'Gravité en hausse de ' + tgDelta.toFixed(0) + '% depuis ' + firstYr });
      }
    }
  }

  // Highlight insights button
  var badgeId = viewId === 'at' ? 'insightsBadge' : viewId + '-insightsBadge';
  var btnId = viewId === 'at' ? 'insightsBtn' : viewId + '-insightsBtn';
  var insBtn = el(btnId);
  var badge = el(badgeId);
  insBtn.classList.remove('has-insights');
  badge.classList.remove('visible');
  if (insights.length > 0) {
    badge.textContent = insights.length;
    badge.classList.add('visible');
    void insBtn.offsetWidth;
    insBtn.classList.add('has-insights');
  }

  // Update shared drawer
  var vs = state.views[viewId];
  var store = getStore(viewId, vs.level);
  var entry = store[vs.code];
  if (entry) {
    el('drawerSub').textContent = vs.code + ' // ' + entry.libelle;
  }

  var body = el('drawerBody');
  var icons = { danger: '\u26A0', warn: '\u25C9', info: '\u2139' };
  if (insights.length === 0) {
    body.innerHTML = '<div class="insights-drawer-empty">Aucun insight pour ce secteur.</div>';
  } else {
    body.innerHTML = insights.map(function(i) {
      return '<div class="insight ' + i.level + '"><span class="insight-icon">' + icons[i.level] + '</span>' + i.text + '</div>';
    }).join('');
  }
}

function setAllBtns(suffix, cls, val) {
  ['', 'mp-', 'trajet-'].forEach(function(p) {
    var b = el(p + suffix);
    if (b) {
      b.classList.toggle(cls, val);
      b.setAttribute('aria-expanded', val ? 'true' : 'false');
    }
  });
}

export function toggleInsights() {
  var shareDrawer = el('shareDrawer');
  if (shareDrawer.classList.contains('open')) {
    shareDrawer.classList.remove('open');
    setAllBtns('shareBtn', 'active', false);
    releaseFocus(shareDrawer);
  }
  var drawer = el('insightsDrawer');
  var isOpen = drawer.classList.toggle('open');
  setAllBtns('insightsBtn', 'active', isOpen);
  if (isOpen) {
    trapFocus(drawer);
    var closeBtn = drawer.querySelector('.close-btn');
    if (closeBtn) closeBtn.focus();
  } else {
    releaseFocus(drawer);
    var prefix = state.activeView === 'at' ? '' : state.activeView + '-';
    var trigger = el(prefix + 'insightsBtn');
    if (trigger) trigger.focus();
  }
}

export function toggleShare() {
  var insightsDrawer = el('insightsDrawer');
  if (insightsDrawer.classList.contains('open')) {
    insightsDrawer.classList.remove('open');
    setAllBtns('insightsBtn', 'active', false);
    releaseFocus(insightsDrawer);
  }
  var drawer = el('shareDrawer');
  var isOpen = drawer.classList.toggle('open');
  setAllBtns('shareBtn', 'active', isOpen);
  if (isOpen) {
    trapFocus(drawer);
    var closeBtn = drawer.querySelector('.close-btn');
    if (closeBtn) closeBtn.focus();
  } else {
    releaseFocus(drawer);
    var prefix = state.activeView === 'at' ? '' : state.activeView + '-';
    var trigger = el(prefix + 'shareBtn');
    if (trigger) trigger.focus();
  }
}

export function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(function() {
    var labels = document.querySelectorAll('#shareDrawer .share-option:first-child .share-option-label');
    labels.forEach(function(label) {
      var original = label.textContent;
      label.textContent = 'Copié !';
      setTimeout(function() { label.textContent = original; }, 2000);
    });
  });
}

export function downloadCSV(viewId) {
  var vs = state.views[viewId];
  if (!vs || !vs.code) return;

  var store = getStore(viewId, vs.level);
  var entry = store[vs.code];
  if (!entry) return;

  var code = vs.code;
  var eventLabels = {
    at: 'AT en 1er règlement',
    mp: 'MP en 1er règlement',
    trajet: 'Accidents de trajet'
  };
  var eventKeys = {
    at: 'at_1er_reglement',
    mp: 'mp_1er_reglement',
    trajet: 'trajet_count'
  };
  var viewCodes = { at: 'AT', mp: 'MP', trajet: 'Trajet' };
  var viewNames = { at: 'Accidents du Travail', mp: 'Maladies Professionnelles', trajet: 'Accidents de Trajet' };
  var eventLabel = eventLabels[viewId];
  var eventKey = eventKeys[viewId];
  var levels = ['naf2', 'naf4', 'naf5'];
  var levelLabels = { naf2: 'NAF 2', naf4: 'NAF 4', naf5: 'NAF 5' };

  var headers = [
    'Type',
    'Niveau',
    'Code NAF',
    'Secteur',
    'Indice de fréquence',
    'Taux de gravité',
    eventLabel,
    'Incapacités permanentes',
    'Décès',
    'Jours perdus',
    'Salariés'
  ].join(';');

  function makeRow(level, c, e) {
    var s = e.stats;
    return [
      viewNames[viewId],
      levelLabels[level],
      c,
      '"' + (e.libelle || '').replace(/"/g, '""') + '"',
      s.indice_frequence != null ? s.indice_frequence : '',
      s.taux_gravite != null ? s.taux_gravite : '',
      s[eventKey] != null ? s[eventKey] : '',
      s.nouvelles_ip != null ? s.nouvelles_ip : '',
      s.deces != null ? s.deces : '',
      s.journees_it != null ? s.journees_it : '',
      s.nb_salaries != null ? s.nb_salaries : ''
    ].join(';');
  }

  var rows = [];
  // Selected sector row first
  rows.push(makeRow(vs.level, code, entry));

  // Children from finer levels
  var startIdx = levels.indexOf(vs.level);
  for (var i = startIdx + 1; i < levels.length; i++) {
    var childStore = getStore(viewId, levels[i]);
    if (!childStore) continue;
    var keys = Object.keys(childStore).sort();
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].indexOf(code) === 0 && keys[j] !== code) {
        rows.push(makeRow(levels[i], keys[j], childStore[keys[j]]));
      }
    }
  }

  var csv = '\uFEFF' + headers + '\r\n' + rows.join('\r\n') + '\r\n';
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'sinistralite-' + viewCodes[viewId] + '-' + code + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

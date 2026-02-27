// ── Chart rendering ──

import { fmt, themeColor, CAUSE_COLORS, el, viewEl } from './utils.js';
import { state, VIEW_CONFIG } from './state.js';
import { getData, getStore } from './data.js';
import { selectCode } from './search.js';

// ── Causes chart ──
export function renderCausesChart(viewId, causes) {
  var sorted = Object.entries(causes)
    .filter(function(pair) { return pair[1] > 0; })
    .sort(function(a, b) { return b[1] - a[1]; });

  var chartData;
  // AT has 12 cause columns: cap at 6 + Autres. MP has few categories: show all.
  if (viewId === 'at' && sorted.length > 6) {
    var top = sorted.slice(0, 6);
    var rest = sorted.slice(6).reduce(function(sum, pair) { return sum + pair[1]; }, 0);
    chartData = top.concat([['Autres', rest]]);
  } else {
    chartData = sorted;
  }

  if (chartData.length === 0) {
    viewEl(viewId, 'causesWrap').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:320px;color:var(--text-dim)">Aucune donnée de cause</div>';
    return;
  }

  var labels = chartData.map(function(pair) { return pair[0]; });
  var values = chartData.map(function(pair) { return pair[1]; });

  var vs = state.views[viewId];
  if (vs.causesChart) vs.causesChart.destroy();

  // Ensure canvas exists
  var wrap = viewEl(viewId, 'causesWrap');
  if (!wrap.querySelector('canvas')) {
    wrap.innerHTML = '<canvas id="' + viewId + '-causesChart"></canvas>';
  }
  wrap.style.height = '320px';

  vs.causesChart = new Chart(viewEl(viewId, 'causesChart'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: CAUSE_COLORS.slice(0, values.length),
        borderColor: themeColor('--bg-elevated'),
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'left',
          align: 'center',
          labels: {
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 11, family: "'DM Sans', sans-serif" },
            color: '#8b949e',
            generateLabels: function(chart) {
              var d = chart.data;
              return d.labels.map(function(label, i) {
                return {
                  text: label,
                  fillStyle: d.datasets[0].backgroundColor[i],
                  fontColor: themeColor('--text-secondary'),
                  strokeStyle: 'transparent',
                  pointStyle: 'circle',
                  index: i,
                  hidden: !chart.getDataVisibility(i),
                };
              });
            }
          }
        },
        tooltip: {
          backgroundColor: themeColor('--chart-tooltip-bg'),
          borderColor: themeColor('--border'),
          borderWidth: 1,
          titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          titleColor: themeColor('--text'),
          bodyColor: themeColor('--text-secondary'),
          callbacks: { label: function(ctx) { return ' ' + ctx.label + ': ' + ctx.parsed.toFixed(1) + '%'; } }
        },
        datalabels: {
          color: '#fff',
          font: { size: 12, weight: '600', family: "'DM Sans', sans-serif" },
          formatter: function(value) {
            return value >= 3 ? Math.round(value) + '%' : '';
          },
          anchor: 'center',
          align: 'center',
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// ── Funnel chart ──
export function renderFunnelChart(viewId, s, cfg) {
  var items = cfg.funnelItems(s);
  var maxVal = items[items.length - 1].value || 1;
  var wrap = viewEl(viewId, 'funnelWrap');
  var n = items.length;

  // Build bars with conversion rates between them
  var html = '';
  for (var i = 0; i < n; i++) {
    var d = items[i];
    var pct = Math.round(((i + 1) / n) * 100);
    var ofTotal = (d.value / maxVal * 100).toFixed(1);
    html += '<div class="funnel-bar" style="width:' + pct + '%;background:' + d.color + '" data-idx="' + i + '" data-pct="' + ofTotal + '">' +
      '<span class="funnel-bar-label">' + d.label + '</span>' +
      '<span class="funnel-bar-value">' + fmt(d.value) + '</span>' +
      '</div>';
    // Insert conversion rate between consecutive tiers
    if (i < n - 1) {
      var nextVal = items[i + 1].value || 0;
      var rate = nextVal > 0 ? (d.value / nextVal * 100).toFixed(1) : '0.0';
      html += '<div class="funnel-rate">' + rate + '% donnent lieu à ' + d.label.toLowerCase() + '</div>';
    }
  }

  var tipId = viewId + '-funnelTip';
  wrap.style.position = 'relative';
  wrap.innerHTML = '<div class="funnel">' + html + '</div><div class="funnel-tooltip" id="' + tipId + '"></div>';

  var tip = el(tipId);
  var eventLabel = VIEW_CONFIG[viewId].eventLabel;
  wrap.querySelectorAll('.funnel-bar').forEach(function(bar) {
    var i = +bar.dataset.idx;
    var pctText = i === items.length - 1 ? '100% des ' + eventLabel : bar.dataset.pct + '% des ' + eventLabel;
    bar.addEventListener('mouseenter', function() {
      tip.innerHTML = pctText;
      tip.classList.add('visible');
    });
    bar.addEventListener('mousemove', function(e) {
      var rect = wrap.getBoundingClientRect();
      tip.style.left = (e.clientX - rect.left + 12) + 'px';
      tip.style.top = (e.clientY - rect.top - 32) + 'px';
    });
    bar.addEventListener('mouseleave', function() { tip.classList.remove('visible'); });
  });
}

// ── Position strip ──
export function renderPositionStrip(viewId, code, level, ifValue, renderFn) {
  var store = getStore(viewId, level);
  var data = getData(viewId);
  var allIF = Object.entries(store)
    .map(function(pair) { return { code: pair[0], libelle: pair[1].libelle, if_val: pair[1].stats.indice_frequence }; })
    .filter(function(d) { return d.if_val > 0; })
    .sort(function(a, b) { return a.if_val - b.if_val; });

  if (allIF.length === 0) return;
  var maxIF = allIF[allIF.length - 1].if_val;
  var levelLabel = level === 'naf5' ? 'NAF' : level === 'naf4' ? 'NAF4' : 'NAF2';
  viewEl(viewId, 'posTitle').textContent =
    'Positionnement IF // ' + allIF.length + ' codes ' + levelLabel;

  var strip = viewEl(viewId, 'posStrip');
  var tipId = viewId + '-posTip';
  var html = '<div class="pos-track"></div><div class="pos-tip" id="' + tipId + '"></div>';

  allIF.forEach(function(d, i) {
    var x = (d.if_val / maxIF * 96) + 2;
    var isCurrent = d.code === code;
    html += '<div class="pos-dot' + (isCurrent ? ' current' : '') + '" style="left:' + x + '%" data-idx="' + i + '"></div>';
    if (isCurrent) {
      html += '<div class="pos-marker-label" style="left:' + x + '%">IF ' + ifValue.toFixed(1) + '</div>';
    }
  });

  var natIF = data.meta.national.indice_frequence;
  var natX = (natIF / maxIF * 96) + 2;
  html += '<div class="pos-national" style="left:' + natX + '%"></div>';
  html += '<div class="pos-national-label" style="left:' + natX + '%">Moy. ' + natIF.toFixed(1) + '</div>';

  var minIF = allIF[0].if_val;
  html += '<div class="pos-axis" style="left:2%">' + minIF.toFixed(0) + '</div>';
  html += '<div class="pos-axis pos-end">' + maxIF.toFixed(0) + '</div>';

  strip.innerHTML = html;

  var tip = el(tipId);
  strip.querySelectorAll('.pos-dot:not(.current)').forEach(function(dot) {
    var d = allIF[+dot.dataset.idx];
    dot.addEventListener('mouseenter', function() {
      var short = d.libelle.length > 30 ? d.libelle.substring(0, 30) + '...' : d.libelle;
      tip.textContent = d.code + '  ' + short + '  IF ' + d.if_val.toFixed(1);
      tip.style.left = dot.style.left;
      tip.classList.add('visible');
    });
    dot.addEventListener('mouseleave', function() { tip.classList.remove('visible'); });
    dot.addEventListener('click', function() {
      tip.classList.remove('visible');
      selectCode(viewId, d.code, level, renderFn);
    });
  });
}

// ── Comparison chart ──
export function renderComparisonChart(viewId, code, level, renderFn) {
  var data = getData(viewId);
  var items = [];
  var naf5Store = getStore(viewId, 'naf5');
  var clickLevel = level;

  if (level === 'naf5') {
    var naf2 = code.substring(0, 2);
    items = Object.entries(naf5Store)
      .filter(function(pair) { return pair[0].substring(0, 2) === naf2; })
      .map(function(pair) { return { code: pair[0], libelle: pair[1].libelle, if_val: pair[1].stats.indice_frequence }; });
    viewEl(viewId, 'compTitle').textContent = 'Comparaison // division ' + naf2;
  } else if (level === 'naf4') {
    items = Object.entries(naf5Store)
      .filter(function(pair) { return pair[0].substring(0, 4) === code; })
      .map(function(pair) { return { code: pair[0], libelle: pair[1].libelle, if_val: pair[1].stats.indice_frequence }; });
    clickLevel = 'naf5';
    viewEl(viewId, 'compTitle').textContent = 'Comparaison // sous-classes ' + code;
  } else {
    var naf2Store = getStore(viewId, 'naf2');
    items = Object.entries(naf2Store)
      .map(function(pair) { return { code: pair[0], libelle: pair[1].libelle, if_val: pair[1].stats.indice_frequence }; });
    viewEl(viewId, 'compTitle').textContent = 'Comparaison // toutes divisions';
  }

  items.sort(function(a, b) { return b.if_val - a.if_val; });

  var labels = items.map(function(s) { return s.code; });
  var values = items.map(function(s) { return s.if_val; });
  var allAccent = (level === 'naf4');
  var inactiveColor = themeColor('--border');
  var inactiveBorder = themeColor('--border-light');
  var accentColor = themeColor('--accent');
  var colors = items.map(function(s) { return (allAccent || s.code === code) ? accentColor : inactiveColor; });
  var borderColors = items.map(function(s) { return (allAccent || s.code === code) ? accentColor : inactiveBorder; });

  var canvas = viewEl(viewId, 'compChart');
  canvas.style.cursor = 'pointer';

  var vs = state.views[viewId];
  if (vs.compChart) vs.compChart.destroy();
  vs.compChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: { topLeft: 2, topRight: 2 },
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: function(evt, elements) {
        if (elements.length > 0) {
          var idx = elements[0].index;
          var target = items[idx];
          if (target && target.code !== code) {
            selectCode(viewId, target.code, clickLevel, renderFn);
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeColor('--chart-tooltip-bg'),
          borderColor: themeColor('--border'),
          borderWidth: 1,
          titleColor: themeColor('--text'),
          bodyColor: themeColor('--text-secondary'),
          titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          callbacks: {
            title: function(ctx) {
              var i = ctx[0].dataIndex;
              return items[i].code + '  ' + items[i].libelle;
            },
            label: function(ctx) { return ' IF: ' + ctx.parsed.y.toFixed(1); }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 } },
          grid: { color: themeColor('--chart-grid') }
        },
        x: {
          grid: { display: false },
          title: {
            display: true,
            text: 'Indice de fréquence',
            font: { family: "'JetBrains Mono', monospace", size: 10, weight: '500' },
            color: themeColor('--text-dim')
          },
          ticks: {
            font: { family: "'JetBrains Mono', monospace", size: 9 },
            maxRotation: 90,
            minRotation: 45
          }
        }
      }
    }
  });
  viewEl(viewId, 'compWrap').style.height = '320px';

  // Render companion table
  var cfg = VIEW_CONFIG[viewId];
  var eventKey = cfg.eventKey;
  var tableRows = items.map(function(item, idx) {
    var store = getStore(viewId, clickLevel === 'naf5' ? 'naf5' : level);
    var entry = store[item.code];
    var events = entry ? (entry.stats[eventKey] || 0) : 0;
    var isActive = item.code === code ? ' class="active-row"' : '';
    return '<tr' + isActive + ' data-code="' + item.code + '" data-level="' + clickLevel + '">' +
      '<td class="rank">' + (idx + 1) + '</td>' +
      '<td class="code">' + item.code + '</td>' +
      '<td>' + item.libelle + '</td>' +
      '<td class="if-val">' + item.if_val.toFixed(1) + '</td>' +
      '<td>' + fmt(events) + '</td>' +
      '</tr>';
  }).join('');
  var tableWrap = viewEl(viewId, 'compTable');
  tableWrap.innerHTML = '<table class="comp-table"><thead><tr>' +
    '<th>#</th><th>Code</th><th>Libellé</th><th>IF</th><th>' + cfg.eventLabel + '</th>' +
    '</tr></thead><tbody>' + tableRows + '</tbody></table>';
  tableWrap.querySelectorAll('tr[data-code]').forEach(function(row) {
    row.addEventListener('click', function() {
      var c = this.dataset.code;
      var l = this.dataset.level;
      if (c !== code) selectCode(viewId, c, l, renderFn);
    });
  });
}

export function setupCompToggle(viewId) {
  var toggle = viewEl(viewId, 'compToggle');
  if (!toggle) return;
  toggle.querySelectorAll('button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      toggle.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var mode = btn.dataset.mode;
      var chartWrap = viewEl(viewId, 'compWrap');
      var tableWrap = viewEl(viewId, 'compTable');
      if (mode === 'table') {
        chartWrap.style.display = 'none';
        tableWrap.classList.add('visible');
      } else {
        chartWrap.style.display = '';
        tableWrap.classList.remove('visible');
      }
    });
  });
}

// ── Evolution charts ──
export function renderEvolutionCharts(viewId, entry, level) {
  var data = getData(viewId);
  var years = data.meta.years;
  var sec = viewEl(viewId, 'evoSection');
  if (!years || years.length < 2 || !entry.yearly) {
    sec.style.display = 'none';
    return;
  }
  sec.style.display = '';
  var vs = state.views[viewId];
  vs.evoCharts.forEach(function(c) { c.destroy(); });
  vs.evoCharts = [];

  var cfg = VIEW_CONFIG[viewId];
  var eventKey = cfg.eventKey;
  var eventLabel = cfg.eventLabel;
  var natYearly = data.meta.national.yearly;

  // Prepare data arrays
  var sectorEvents = [], sectorIF = [], sectorTG = [];
  var natIF = [], natTG = [];
  years.forEach(function(yr) {
    var y = entry.yearly[yr];
    var n = natYearly[yr];
    sectorEvents.push(y ? y.events : null);
    sectorIF.push(y ? y.indice_frequence : null);
    sectorTG.push(y ? y.taux_gravite : null);
    natIF.push(n ? n.indice_frequence : null);
    natTG.push(n ? n.taux_gravite : null);
  });

  // Common chart options
  var baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'var(--sans)' }, color: themeColor('--text-secondary'), padding: 12 } },
      tooltip: { backgroundColor: themeColor('--chart-tooltip-bg'), borderColor: themeColor('--border'), borderWidth: 1, titleColor: themeColor('--text'), bodyColor: themeColor('--text-secondary'), titleFont: { family: 'var(--sans)', size: 12 }, bodyFont: { family: 'var(--mono)', size: 12 }, cornerRadius: 6, padding: 10 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'var(--mono)', size: 12, weight: '600' }, color: themeColor('--chart-label') } },
      y: { beginAtZero: true, grid: { color: themeColor('--chart-grid') }, ticks: { font: { family: 'var(--mono)', size: 11 }, color: themeColor('--text-dim') } },
    },
  };

  function deltaPlugin(vals) {
    return {
      id: 'deltaLabel',
      afterDraw: function(chart) {
        if (!vals || vals.length < 2) return;
        var first = vals[0], last = vals[vals.length - 1];
        if (first == null || last == null || first === 0) return;
        var pct = ((last - first) / first * 100).toFixed(1);
        var sign = pct > 0 ? '+' : '';
        var color = pct > 0 ? '#ef4444' : pct < 0 ? '#22c55e' : '#64748b';
        var ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 12px var(--mono)';
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.fillText(sign + pct + '%', chart.chartArea.right, chart.chartArea.top - 6);
        ctx.restore();
      }
    };
  }

  // Generate gradient colors for N bars
  function barColors(r, g, b, n) {
    var bgs = [], borders = [];
    for (var i = 0; i < n; i++) {
      var a = 0.3 + (i / Math.max(n - 1, 1)) * 0.5;
      bgs.push('rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(2) + ')');
      borders.push('rgba(' + r + ',' + g + ',' + b + ',1)');
    }
    return { bg: bgs, border: borders };
  }
  var nYears = years.length;
  var evColors = barColors(99, 102, 241, nYears);
  var ifColors = barColors(234, 179, 8, nYears);

  // 1. Events chart (line with fill)
  var evCanvas = viewEl(viewId, 'evoEvents');
  vs.evoCharts.push(new Chart(evCanvas, {
    type: 'line',
    data: { labels: years, datasets: [{
      label: eventLabel, data: sectorEvents,
      borderColor: '#6366f1', borderWidth: 2,
      pointRadius: 5, pointBackgroundColor: '#6366f1', pointHoverRadius: 7,
      fill: true, backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.3,
    }] },
    options: Object.assign({}, baseOpts, {
      plugins: Object.assign({}, baseOpts.plugins, {
        title: { display: true, text: eventLabel, font: { family: 'var(--sans)', size: 13, weight: '500' }, color: '#cbd5e1', padding: { bottom: 8 } },
      }),
    }),
  }));

  // 2. IF chart (sector line + national dashed line) - skip for views without IF canvas
  var ifCanvas = viewEl(viewId, 'evoIF');
  if (ifCanvas) {
    vs.evoCharts.push(new Chart(ifCanvas, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'Secteur', data: sectorIF,
            borderColor: '#eab308', borderWidth: 2,
            pointRadius: 5, pointBackgroundColor: '#eab308', pointHoverRadius: 7,
            fill: true, backgroundColor: 'rgba(234,179,8,0.1)', tension: 0.3,
          },
          {
            label: 'National', data: natIF,
            borderColor: '#64748b', borderWidth: 2, borderDash: [6, 3],
            pointRadius: 4, pointBackgroundColor: '#64748b',
            fill: false, tension: 0.3,
          }
        ]
      },
      options: Object.assign({}, baseOpts, {
        plugins: Object.assign({}, baseOpts.plugins, {
          title: { display: true, text: 'Indice de Fréquence', font: { family: 'var(--sans)', size: 13, weight: '500' }, color: '#cbd5e1', padding: { bottom: 8 } },
        }),
      }),
    }));
  }
}

// ── Demographics charts (AT only) ──
export function renderDemographics(viewId, entry) {
  var section = viewEl(viewId, 'demoSection');
  if (!section) return;

  var demo = entry.demographics;
  var vs = state.views[viewId];

  // Destroy previous charts
  if (vs.demoCharts) vs.demoCharts.forEach(function(c) { c.destroy(); });
  vs.demoCharts = [];

  if (!demo || !demo.sex || (!demo.sex.masculin && !demo.sex.feminin)) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  // Ensure canvases exist
  var sexWrap = section.querySelector('#' + viewId + '-demoSex').parentElement;
  var ageWrap = section.querySelector('#' + viewId + '-demoAge').parentElement;
  sexWrap.innerHTML = '<canvas id="' + viewId + '-demoSex"></canvas>';
  ageWrap.innerHTML = '<canvas id="' + viewId + '-demoAge"></canvas>';

  var sexCanvas = el(viewId + '-demoSex');
  var ageCanvas = el(viewId + '-demoAge');

  // 1. Sex donut
  var sexLabels = ['Masculin', 'Féminin'];
  var sexValues = [demo.sex.masculin || 0, demo.sex.feminin || 0];
  var sexTotal = sexValues[0] + sexValues[1];

  vs.demoCharts.push(new Chart(sexCanvas, {
    type: 'doughnut',
    data: {
      labels: sexLabels,
      datasets: [{
        data: sexValues,
        backgroundColor: ['#4e9af5', '#e5534b'],
        borderColor: themeColor('--bg-elevated'),
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '50%',
      plugins: {
        title: { display: true, text: 'Répartition par sexe', font: { family: 'var(--sans)', size: 13, weight: '500' }, color: themeColor('--text-secondary'), padding: { bottom: 8 } },
        legend: {
          position: 'bottom',
          labels: {
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 11, family: "'DM Sans', sans-serif" },
            color: themeColor('--text'),
            generateLabels: function(chart) {
              var d = chart.data;
              return d.labels.map(function(label, i) {
                return {
                  text: label,
                  fillStyle: d.datasets[0].backgroundColor[i],
                  fontColor: themeColor('--text'),
                  strokeStyle: 'transparent',
                  pointStyle: 'circle',
                  hidden: false,
                  index: i,
                };
              });
            }
          }
        },
        datalabels: {
          color: '#fff',
          font: { size: 14, weight: '600', family: "'DM Sans', sans-serif" },
          formatter: function(value) {
            var pct = sexTotal > 0 ? (value / sexTotal * 100).toFixed(0) : 0;
            return pct + '%';
          },
          display: function(ctx) {
            return ctx.dataset.data[ctx.dataIndex] > 0;
          }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var pct = sexTotal > 0 ? (ctx.raw / sexTotal * 100).toFixed(1) : 0;
              return ' ' + fmt(ctx.raw) + ' (' + pct + '%)';
            }
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  }));

  // 2. Age bar chart (horizontal)
  var ageGroups = ['<20', '20-24', '25-29', '30-34', '35-39', '40-49', '50-59', '60-64', '65+'];
  var ageLabels = ['< 20 ans', '20-24 ans', '25-29 ans', '30-34 ans', '35-39 ans', '40-49 ans', '50-59 ans', '60-64 ans', '65+ ans'];
  var ageValues = ageGroups.map(function(g) { return (demo.age && demo.age[g]) || 0; });
  var ageColors = ['rgba(99,102,241,0.3)', 'rgba(99,102,241,0.38)', 'rgba(99,102,241,0.46)', 'rgba(99,102,241,0.54)', 'rgba(99,102,241,0.62)', 'rgba(99,102,241,0.7)', 'rgba(99,102,241,0.78)', 'rgba(99,102,241,0.86)', 'rgba(99,102,241,0.94)'];

  vs.demoCharts.push(new Chart(ageCanvas, {
    type: 'bar',
    data: {
      labels: ageLabels,
      datasets: [{
        data: ageValues,
        backgroundColor: ageColors,
        borderColor: ageColors.map(function() { return 'rgba(99,102,241,1)'; }),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        title: { display: true, text: 'Répartition par âge', font: { family: 'var(--sans)', size: 13, weight: '500' }, color: themeColor('--text-secondary'), padding: { bottom: 8 } },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var total = ageValues.reduce(function(s, v) { return s + v; }, 0);
              var pct = total > 0 ? (ctx.raw / total * 100).toFixed(1) : 0;
              return ' ' + fmt(ctx.raw) + ' AT (' + pct + '%)';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: themeColor('--chart-grid') },
          ticks: { font: { size: 11, family: "'JetBrains Mono', monospace" }, color: themeColor('--chart-label') }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11, family: "'DM Sans', sans-serif" }, color: themeColor('--chart-label') }
        }
      }
    }
  }));
}

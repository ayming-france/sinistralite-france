// ── State ──

export var state = {
  activeView: 'at',
  views: {
    at: { code: null, level: 'naf2', causesChart: null, compChart: null, evoCharts: [], demoCharts: [], acIndex: -1 },
    mp: { code: null, level: 'naf2', causesChart: null, compChart: null, evoCharts: [], demoCharts: [], acIndex: -1 },
    trajet: { code: null, level: 'naf2', causesChart: null, compChart: null, evoCharts: [], demoCharts: [], acIndex: -1 },
  }
};

// ── View config ──

export var VIEW_CONFIG = {
  at: {
    title: 'Accidents du Travail par Secteur',
    subtitle: 'Statistiques de sinistralité par code NAF. 729 secteurs, 19,3M salariés.',
    eventKey: 'at_1er_reglement',
    eventLabel: 'AT en 1er règlement',
    secondaryKey: 'at_4j_arret',
    ifDenominator: 'at_4j_arret',
    sourceLabel: 'Ameli, Risque AT par CTN x NAF 2023',
    sourceUrl: 'https://assurance-maladie.ameli.fr/etudes-et-donnees/risque-at-ctn-x-naf-serie-annuelle',
    causesTitle: 'Causes d\'accidents',
    funnelItems: function(s) {
      return [
        { label: 'Décès',                    value: s.deces || 0,             color: '#c74a43' },
        { label: 'Incapacités permanentes', value: s.nouvelles_ip || 0,      color: '#f09a2e' },
        { label: 'AT avec arrêt 4j+',       value: s.at_4j_arret || 0,      color: '#4e8ac5' },
        { label: 'AT en 1er règlement',     value: s.at_1er_reglement || 0,  color: '#6a5ec8' },
      ];
    },
  },
  mp: {
    title: 'Maladies Professionnelles par Secteur',
    subtitle: 'Statistiques de maladies professionnelles par code NAF. 729 secteurs.',
    eventKey: 'mp_1er_reglement',
    eventLabel: 'MP en 1er règlement',
    secondaryKey: 'mp_1er_reglement',
    ifDenominator: 'mp_1er_reglement',
    sourceLabel: 'Ameli, Risque MP par CTN x NAF 2023',
    sourceUrl: 'https://assurance-maladie.ameli.fr/etudes-et-donnees/risque-mp-ctn-x-naf-serie-annuelle',
    causesTitle: 'Types de maladies',
    funnelItems: function(s) {
      return [
        { label: 'Décès',                    value: s.deces || 0,             color: '#c74a43' },
        { label: 'Incapacités permanentes', value: s.nouvelles_ip || 0,      color: '#f09a2e' },
        { label: 'MP en 1er règlement',     value: s.mp_1er_reglement || 0,  color: '#6a5ec8' },
      ];
    },
  },
  trajet: {
    title: 'Accidents de Trajet par Secteur',
    subtitle: 'Statistiques d\'accidents de trajet par code NAF. 629 secteurs.',
    eventKey: 'trajet_count',
    eventLabel: 'Accidents de trajet',
    secondaryKey: 'trajet_count',
    ifDenominator: 'trajet_count',
    sourceLabel: 'Ameli, Fiches NAF 2023 (PDF)',
    sourceUrl: 'https://assurance-maladie.ameli.fr/etudes-et-donnees/sinistralite-at-mp-par-code-naf',
    causesTitle: null,
    funnelItems: function(s) {
      return [
        { label: 'Décès',                    value: s.deces || 0,             color: '#e5534b' },
        { label: 'Incapacités permanentes', value: s.nouvelles_ip || 0,      color: '#f09a2e' },
        { label: 'Acc. trajet en 1er règlement', value: s.trajet_count || 0, color: '#7c6ef0' },
      ];
    },
  },
};

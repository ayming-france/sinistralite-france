// ── Modèle de coût social AT/MP ──
// Estime le coût social des accidents du travail à partir du barème officiel
// des « coûts moyens » de la branche AT/MP (par CTN et catégorie de gravité).
// Source : Arrêté du 27 décembre 2023 (tarification 2024). Le barème est indexé
// par CTN (et non par code NAF) ; on rattache donc chaque NAF à son CTN.
// NB : approximation NAF2 → CTN (l'imputation officielle se fait au numéro de risque).

export var BAREME_YEAR = 2024;
export var BAREME_SOURCE = 'Barème des coûts moyens AT/MP 2024 (arrêté du 27 décembre 2023).';

export var CTN_LABELS = {
  A: 'Métallurgie',
  B: 'Bâtiment et travaux publics',
  C: 'Transports, eau, gaz, électricité, communication',
  D: 'Services, commerces et industries de l\'alimentation',
  E: 'Industries de la chimie, du caoutchouc, de la plasturgie',
  F: 'Bois, ameublement, papier-carton, textile, cuirs et peaux, pierres et terres à feu',
  G: 'Commerce non alimentaire',
  H: 'Activités de services I (banque, assurance, conseil, administration)',
  I: 'Activités de services II et travail temporaire (santé, social, nettoyage, intérim)'
};

// Barème 2024 : coûts moyens (€) par CTN.
// it1..it6 = incapacité temporaire par durée d'arrêt :
//   it1 ≤3 j · it2 4-15 j · it3 16-45 j · it4 46-90 j · it5 91-150 j · it6 >150 j
// ip1..ip4 = incapacité permanente :
//   ip1 <10% · ip2 10-19% · ip3 20-39% · ip4 ≥40% ou décès
var BAREME = {
  A: { it1: 287, it2: 522, it3: 1758, it4: 4770, it5: 8924, it6: 40783, ip1: 2226, ip2: 65734, ip3: 133102, ip4: 676026 },
  // BTP : les IP ≥10% sont fusionnées par sous-activité dans le barème métropole.
  // On retient la variante par tranche (Alsace-Moselle) pour garder un gradient de
  // gravité cohérent avec les autres CTN (estimation v1).
  B: { it1: 288, it2: 488, it3: 1597, it4: 4367, it5: 8210, it6: 38740, ip1: 2317, ip2: 63037, ip3: 119707, ip4: 541156 },
  C: { it1: 225, it2: 540, it3: 1714, it4: 4525, it5: 8555, it6: 35963, ip1: 2248, ip2: 64153, ip3: 123543, ip4: 549962 },
  D: { it1: 305, it2: 440, it3: 1414, it4: 3876, it5: 7222, it6: 32497, ip1: 2253, ip2: 55550, ip3: 108472, ip4: 460652 },
  E: { it1: 386, it2: 556, it3: 1787, it4: 5030, it5: 9369, it6: 40793, ip1: 2239, ip2: 65434, ip3: 137062, ip4: 728203 },
  F: { it1: 375, it2: 506, it3: 1677, it4: 4302, it5: 8143, it6: 36752, ip1: 2256, ip2: 60861, ip3: 117806, ip4: 618356 },
  G: { it1: 230, it2: 481, it3: 1539, it4: 4246, it5: 7817, it6: 35127, ip1: 2224, ip2: 60935, ip3: 125210, ip4: 567087 },
  H: { it1: 169, it2: 411, it3: 1318, it4: 3805, it5: 7281, it6: 37082, ip1: 2160, ip2: 61960, ip3: 131740, ip4: 579607 },
  I: { it1: 161, it2: 376, it3: 1249, it4: 3427, it5: 6408, it6: 29196, ip1: 2206, ip2: 51844, ip3: 102984, ip4: 429443 }
};

// Rattachement NAF → CTN issu du document officiel CNAM « Part de chacun des 9 CTN
// dans le code NAF (année 2019) » (étude 2020-226) : pour chaque NAF, le CTN MAJORITAIRE
// en effectifs salariés, tel que déterminé par l'Assurance Maladie (et non recalculé).
// 6 codes NAF récents absents du doc 2019 retombent sur un calcul 2023 équivalent.
// Chargé depuis data/naf-ctn.json ; { naf5: {code: 'A'..'I'}, naf2: {...} }.
var CTN_MAP = null;
export async function loadCtnMap() {
  try {
    var resp = await fetch('./data/naf-ctn.json');
    if (resp.ok) CTN_MAP = await resp.json();
  } catch (e) { /* on retombe sur l'approximation NAF2 ci-dessous */ }
}

// Approximation NAF2 → CTN (repli si le jeu officiel n'est pas chargé).
var NAF2_CTN = {
  '01': 'D', '02': 'D', '03': 'D',
  '05': 'F', '06': 'E', '07': 'F', '08': 'F', '09': 'F',
  '10': 'D', '11': 'D', '12': 'D',
  '13': 'F', '14': 'F', '15': 'F', '16': 'F', '17': 'F',
  '18': 'C',
  '19': 'E', '20': 'E', '21': 'E', '22': 'E',
  '23': 'F',
  '24': 'A', '25': 'A', '26': 'A', '27': 'A', '28': 'A', '29': 'A', '30': 'A',
  '31': 'F', '32': 'F', '33': 'A',
  '35': 'C', '36': 'C', '37': 'C', '38': 'C', '39': 'C',
  '41': 'B', '42': 'B', '43': 'B',
  '45': 'G', '46': 'G', '47': 'G',
  '49': 'C', '50': 'C', '51': 'C', '52': 'C', '53': 'C',
  '55': 'D', '56': 'D',
  '58': 'C', '59': 'C', '60': 'C',
  '61': 'H', '62': 'H', '63': 'H',
  '64': 'H', '65': 'H', '66': 'H', '68': 'H',
  '69': 'H', '70': 'H', '71': 'H', '72': 'H', '73': 'H', '74': 'H', '75': 'H',
  '77': 'I', '78': 'I', '79': 'I', '80': 'I', '81': 'I', '82': 'I',
  '84': 'H', '85': 'H',
  '86': 'I', '87': 'I', '88': 'I',
  '90': 'I', '91': 'I', '92': 'I', '93': 'I',
  '94': 'I', '95': 'I', '96': 'I', '97': 'I', '98': 'I', '99': 'H'
};
var DEFAULT_CTN = 'G';

export function ctnForNaf(code) {
  code = code || '';
  var naf2 = code.substring(0, 2);
  // 1) jeu officiel : NAF5 exact, sinon majoritaire du NAF2
  if (CTN_MAP) {
    if (code.length >= 5 && CTN_MAP.naf5 && CTN_MAP.naf5[code]) return CTN_MAP.naf5[code];
    if (CTN_MAP.naf2 && CTN_MAP.naf2[naf2]) return CTN_MAP.naf2[naf2];
  }
  // 2) repli : approximation NAF2
  return NAF2_CTN[naf2] || DEFAULT_CTN;
}

// Coût IT selon la durée moyenne d'arrêt (en jours).
function itCostForDays(b, days) {
  if (days <= 3) return b.it1;
  if (days <= 15) return b.it2;
  if (days <= 45) return b.it3;
  if (days <= 90) return b.it4;
  if (days <= 150) return b.it5;
  return b.it6;
}

// Estime le coût social des AT d'une entreprise.
// naf          : code NAF du secteur de l'entreprise (pour le rattachement CTN)
// sectorStats  : stats du secteur { at_4j_arret, at_1er_reglement, journees_it, nouvelles_ip, deces }
// company      : { accidents, ip?, deces? }  (ip/deces optionnels → estimés via le secteur)
// indirectMult : multiplicateur des coûts indirects (0 = directs seuls ; 4 = ratio Heinrich)
// Retourne null si le CTN n'a pas de barème (B/F tant que non renseignés).
export function estimateCoutSocial(naf, sectorStats, company, indirectMult) {
  var ctn = ctnForNaf(naf);
  var b = BAREME[ctn];
  if (!b || !company || !(company.accidents > 0)) return null;

  var A = company.accidents;
  var sAt = sectorStats.at_4j_arret || sectorStats.at_1er_reglement || 0;
  // Profil de gravité dérivé du secteur (durée moyenne, taux d'IP, taux de décès).
  var avgDays = sAt > 0 && sectorStats.journees_it ? (sectorStats.journees_it / sAt) : 30;
  var ipRate = sAt > 0 ? (sectorStats.nouvelles_ip || 0) / sAt : 0;
  var deathRate = sAt > 0 ? (sectorStats.deces || 0) / sAt : 0;

  var P = company.ip != null ? company.ip : A * ipRate;
  var D = company.deces != null ? company.deces : A * deathRate;
  var itCount = Math.max(A - P - D, 0);

  var itCost = itCount * itCostForDays(b, avgDays);
  var ipCost = P * b.ip1;     // hypothèse prudente : la plupart des IP sont mineures (<10%)
  var deathCost = D * b.ip4;  // IP graves / décès = catégorie la plus coûteuse
  var direct = itCost + ipCost + deathCost;
  var mult = indirectMult || 0;

  return {
    ctn: ctn, ctnLabel: CTN_LABELS[ctn], hasBareme: true,
    avgDays: avgDays, ipCount: P, deathCount: D, itCount: itCount,
    itCost: itCost, ipCost: ipCost, deathCost: deathCost,
    direct: direct, indirect: direct * mult, total: direct * (1 + mult)
  };
}

// Vrai si le secteur dispose d'un barème de coûts (sinon B/F non encore renseignés).
export function hasBareme(naf) {
  return !!BAREME[ctnForNaf(naf)];
}

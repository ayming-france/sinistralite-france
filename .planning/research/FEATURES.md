# Feature Research

**Domain:** Tableau de bord open data / statistiques de sinistralité publiques (France)
**Researched:** 2026-02-27
**Confidence:** MEDIUM (WebSearch verified against official sources for accessibility; dashboard UX patterns from multiple credible sources; sinistralité-specific from ameli.fr direct inspection)

---

## Contexte de départ

Le tableau de bord existe déjà avec un ensemble de fonctionnalités solides :
- Navigation 3 vues (AT/MP/Trajet), recherche NAF avec autocomplétion, KPI cards, 6 types de graphiques, drawer insights, drawer partage, thème sombre/clair, deep linking par hash, responsive de base, raccourcis clavier.

Ce document identifie ce qui **manque** pour atteindre un niveau "polished public dashboard" en 2026.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| États de chargement (loading states) | Tout tableau de bord moderne en a. Sans skeleton ou spinner, l'écran blanc ressemble à un bug. | LOW | La migration vers les données live (datagouv MCP) rend cela obligatoire. Actuellement absent. |
| Messages d'erreur sur fetch raté | Les données live peuvent échouer. Sans feedback, l'utilisateur ne sait pas si c'est un bug ou s'il doit attendre. | LOW | Actuellement `fetch()` sans `.catch()` ni `response.ok` check. Silence total en cas d'erreur. |
| Accessibilité clavier complète | Standard attendu de tout site public. Les boutons de la nav rail et les dots de position strip ne sont pas accessibles au clavier. | MEDIUM | Obligatoire pour RGAA 4.1 (loi française). Fines jusqu'à 50 000 EUR par service non conforme. |
| Attributs ARIA sur les composants interactifs | Les lecteurs d'écran ne peuvent pas interpréter le dropdown de recherche (pas de `role="listbox"`), les drawers (pas de `role="dialog"`), les onglets (pas de `role="tablist"`). | MEDIUM | Un seul `aria-label` existe dans tout `index.html`. C'est insuffisant pour RGAA/WCAG AA. |
| Alternative textuelle pour les graphiques | Les canvases Chart.js n'ont aucune description. Les utilisateurs avec lecteur d'écran ne voient rien. | MEDIUM | RGAA 4 exige un alternative content dans `<canvas>` ou un lien adjacent. |
| Lien "skip to content" | Obligatoire pour que les utilisateurs au clavier puissent sauter la navigation fixe. | LOW | Actuellement absent. La barre de nav fixe + nav rail force le tabbing de toute la nav à chaque page. |
| Contraste des couleurs conforme WCAG AA | Plusieurs éléments (`--text-dim`, `.pos-axis`, `.ac-count`, `.naf-badge`) sous le seuil 4.5:1 pour petit texte. | LOW | Correction de variables CSS existantes. Vérification avec un outil de contrast check. |
| Navigation mobile alternative | La nav rail disparait à 768px mais aucune alternative n'est proposée. L'utilisateur mobile ne peut plus changer de vue (AT/MP/Trajet). | MEDIUM | Les drawers occupent déjà la pleine largeur en mobile. Un bottom tab bar ou un menu hamburger est attendu. |
| Déclaration d'accessibilité | Obligatoire pour tout service public numérique français sous RGAA 4.1 et la loi 2005-102 amendée. | LOW | Document HTML statique avec le taux de conformité, contact, et procédure de signalement. |
| Mention de la source des données | Toute réutilisation de données data.gouv.fr doit mentionner la source (Licence Ouverte v2.0). Les utilisateurs s'attendent à voir d'où viennent les chiffres. | LOW | Un footer ou une section "À propos" avec lien vers le dataset source suffit. |
| Export des données affichées | Les utilisateurs analystes veulent manipuler les données hors du dashboard (Excel, consultants Ayming). Attendu sur tout dashboard de données publiques. | MEDIUM | CSV du secteur affiché. Pas besoin d'export complet. Déclenché par un bouton par vue. |
| Favicon et métadonnées Open Graph | Un onglet sans favicon ressemble à un site inachevé. Lors du partage sur LinkedIn/Slack, une preview correcte est attendue. | LOW | Favicon SVG suffit. OG tags pour title, description, image dans `<head>`. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Comparaison multi-secteurs | Permettre à l'utilisateur de sélectionner 2-3 codes NAF et de les comparer côte à côte. Les consultants Ayming font cette analyse manuellement. | HIGH | Nécessite un state de sélection multiple + refonte partielle des KPI cards. |
| Évolution pluriannuelle interactive | Les graphiques d'évolution existent, mais sans interactivité (hover, zoom, toggle d'indicateur). Rendre les courbes explorables différencie du PDF CNAM. | MEDIUM | Chart.js supporte le hover natif. Ajouter toggle des indicateurs (IF seul, TG seul, les deux). |
| Permalink avec état complet | Le deep linking actuel supporte vue + code NAF. Ajouter l'onglet de données (année, indicateur sélectionné) dans le hash pour des liens vraiment partageables. | LOW | Extension du hash existant. `#at/3511/2023/tg` par exemple. |
| Données live via datagouv MCP | Contrairement au PDF CNAM et aux fichiers Excel statiques, des données toujours à jour sont un vrai différenciateur. Les 9,2 MB de JSON statique disparaissent. | HIGH | Dépend du Cloudflare Worker comme proxy MCP. Bloquer sur ce chantier. |
| Mode impression structuré | Les styles d'impression existent déjà et sont bien implémentés. En faire une feature visible ("Imprimer le rapport sectoriel") valorise ce travail invisible. | LOW | Juste exposer l'action dans le drawer partage de façon plus proéminente. |
| Indicateur de fiabilité des données | Pour les petits secteurs (faible nombre de salariés), les indicateurs statistiques sont peu fiables. Signaler quand l'effectif < seuil de confiance protège contre les mauvaises interprétations. | MEDIUM | Les données CNAM incluent les effectifs. Logique de seuil à définir (ex: < 1000 salariés). |
| Mode "consultant" | Afficher des ratios supplémentaires pertinents pour les consultants Ayming : coût estimé des AT, potentiel de réduction. Ces données sont calculables depuis l'IF et les effectifs. | MEDIUM | Valeur forte pour l'audience principale (Ayming), sans nuire à l'usage public. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Authentification utilisateur | "Sauvegarder mes secteurs favoris", "tableau de bord personnalisé". Semble valorisant. | Ajoute serveur, sessions, RGPD, CNIL, maintenance. Pour un dashboard de données publiques anonymes, la valeur ne justifie pas la complexité. | Deep links partageables + localStorage pour les préférences légères (thème déjà fait). |
| Chargement de toutes les données au démarrage | Simple à implémenter, tout est disponible immédiatement. | 9,2 MB en eager load crée un écran blanc sur connexion lente. Mauvais Core Web Vitals. | Chargement à la demande par vue (lazy load) : charger at-data.json seulement quand la vue AT est sélectionnée. |
| Streaming de données en temps réel | "Des données en direct". | Les données CNAM sont publiées une fois par an. Le streaming n'apporte rien ici, mais complexifierait l'architecture. | Afficher clairement l'année des données et la date de dernière mise à jour. |
| Export PDF généré côté serveur | "Rapport PDF professionnel". | Nécessite un serveur, latence, maintenance. Le dashboard est hébergé statiquement. | Les styles d'impression existants + window.print() couvrent 90% du besoin. |
| Internationalisation (anglais, etc.) | "Accessible à une audience internationale". | Les données sont françaises, la terminologie (sinistralité, IF, TG, CNAM) est intraduisible sans recontextualisation. Doublerait le contenu pour un gain marginal. | Conserver le français. Ajouter un disclaimer "Données françaises / French data" dans les métadonnées. |
| PWA / mode offline | Dashboards modernes utilisent des service workers. | Les données changent annuellement. Le cache serait obsolète 99% du temps. Ajoute complexité sans bénéfice réel pour ce cas d'usage. | Pin des assets statiques (CSS/JS) avec versioning. Pas de cache des données. |

---

## Feature Dependencies

```
[Loading states]
    └──required by──> [Données live via MCP]
                          └──required by──> [Cloudflare Worker proxy]

[Accessibilité clavier complète]
    └──enables──> [Déclaration d'accessibilité crédible]

[Alternative textuelle graphiques]
    └──part of──> [Accessibilité clavier complète]
                      └──part of──> [Conformité RGAA]

[Export CSV]
    └──enhanced by──> [Permalink avec état complet]
    (l'utilisateur peut exporter exactement ce qu'il voit)

[Navigation mobile alternative]
    └──independent of──> [Accessibilité clavier]
    (deux axes orthogonaux : mobile UX vs assistive tech)

[Données live MCP]
    └──conflicts with──> [Chargement eager de toutes les vues]
    (avec live queries, charger les 3 vues simultanément coûte cher en latence)
```

### Dependency Notes

- **Loading states required by données live :** Sans skeleton UI, la latence des requêtes MCP rend le dashboard inutilisable. Les loading states doivent précéder la migration live.
- **Accessibilité clavier enables déclaration RGAA :** La déclaration d'accessibilité requiert un taux de conformité. Sans corrections, ce taux serait trop bas pour être publié honorablement.
- **Données live conflicts avec eager load :** L'architecture actuelle (3 fichiers JSON en parallel) doit être remplacée par un lazy load par vue pour que les requêtes MCP restent performantes.

---

## MVP Definition (pour ce milestone "polish + live data")

### Launch With (v1 de ce milestone)

Ce milestone part d'un dashboard existant. Le MVP ici est : "dashboard fonctionnel avec données live, qualité production, accessible."

- [ ] Messages d'erreur et états de chargement sur fetch
- [ ] Accents français corrigés (12 occurrences identifiées)
- [ ] Favicon + Open Graph tags
- [ ] localStorage key unifiée entre dashboard et landing
- [ ] Police DM Sans remplacée par Lato dans Chart.js
- [ ] Navigation mobile alternative (bottom tab bar ou hamburger)
- [ ] Lien "skip to content"
- [ ] ARIA sur les composants interactifs critiques (nav, search dropdown, drawers)
- [ ] Alternative textuelle sur les graphiques Chart.js
- [ ] Mention de la source des données (footer ou section À propos)

### Add After Validation (v1.x)

- [ ] Export CSV du secteur courant
- [ ] Déclaration d'accessibilité publiée
- [ ] Contrastes corrigés (variables CSS)
- [ ] Données live via datagouv MCP + Cloudflare Worker proxy
- [ ] Lazy loading par vue (charger at-data.json seulement quand vue AT active)
- [ ] Indicateur de fiabilité pour petits secteurs

### Future Consideration (v2+)

- [ ] Comparaison multi-secteurs (haute complexité, refonte partielle)
- [ ] Mode "consultant" avec ratios coûts calculés
- [ ] Permalink avec état étendu (année + indicateur dans le hash)
- [ ] Évolution pluriannuelle interactive (toggle d'indicateurs)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Loading states + error handling | HIGH | LOW | P1 |
| Navigation mobile alternative | HIGH | MEDIUM | P1 |
| ARIA sur composants critiques | HIGH | MEDIUM | P1 |
| Lien skip-to-content | HIGH | LOW | P1 |
| Favicon + OG tags | MEDIUM | LOW | P1 |
| Mention source données | HIGH | LOW | P1 |
| Accents français corrigés | MEDIUM | LOW | P1 |
| Alternative textuelle graphiques | HIGH | MEDIUM | P1 |
| localStorage key unifiée | LOW | LOW | P1 |
| Export CSV | HIGH | MEDIUM | P2 |
| Déclaration d'accessibilité | MEDIUM | LOW | P2 |
| Contrastes couleurs | MEDIUM | LOW | P2 |
| Données live MCP | HIGH | HIGH | P2 |
| Lazy loading par vue | MEDIUM | MEDIUM | P2 |
| Indicateur fiabilité petits secteurs | MEDIUM | MEDIUM | P3 |
| Comparaison multi-secteurs | HIGH | HIGH | P3 |
| Mode consultant | HIGH | HIGH | P3 |
| Permalink état étendu | LOW | LOW | P3 |

**Priority key:**
- P1 : Must have pour ce milestone (polish)
- P2 : Should have, ajouter après P1 stabilisé
- P3 : Future consideration, hors scope de ce milestone

---

## Competitor Feature Analysis

| Feature | CNAM Ameli (existant) | Notre approche |
|---------|----------------------|----------------|
| Navigation par secteur | Par CTN (9 grands secteurs) | Par code NAF (4 niveaux de précision) |
| Format de livraison | PDF téléchargeable par année | Dashboard interactif en ligne |
| Interactivité | Aucune | Graphiques, filtres, comparaisons |
| Mobile | Non applicable (PDF) | Responsive (en cours d'amélioration) |
| Export | PDF uniquement | PDF (print) + CSV à ajouter |
| Données live | Non (documents annuels statiques) | Cible : live via datagouv MCP |
| Partage | Réseaux sociaux (lien page) | Deep link vers le secteur exact |
| Accessibilité | Non évaluée | En cours de mise en conformité RGAA |

La comparaison directe montre que le dashboard apporte déjà une valeur différenciante forte (interactivité, granularité NAF, deep linking). Le manque principal est la qualité "production" (accessibilité, robustesse, mobile).

---

## Sources

- [CNAM Sinistralité par secteur d'activité (CTN)](https://www.assurance-maladie.ameli.fr/etudes-et-donnees/sinistralite-atmp-secteur-activite-ctn) - inspecté directement (MEDIUM confidence)
- [RGAA 4.1.2 - Référentiel général d'amélioration de l'accessibilité](https://accessibilite.numerique.gouv.fr/) - officiel (HIGH confidence)
- [RGAA Compliance Guide 2025 - DigitalA11Y](https://www.digitala11y.com/rgaa-compliance-the-complete-guide-to-french-digital-accessibility-2025-edition/) - MEDIUM confidence
- [France's Digital Accessibility Laws - Level Access](https://www.levelaccess.com/wp-content/uploads/2025/02/France-Digital-Accessibility-Laws.pdf) - MEDIUM confidence, pénalités jusqu'à 50 000 EUR confirmées
- [Dashboard UX Patterns - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) - MEDIUM confidence, loading/empty states, export CSV, accessibilité
- [Dashboard Design Principles - UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/) - MEDIUM confidence
- [PWA 2025 - HTTP Archive Web Almanac](https://almanac.httparchive.org/en/2025/pwa) - HIGH confidence, justifie rejet du PWA/offline pour ce cas d'usage
- [Loi accessibilité numérique 2025 - Evaluo](https://evaluo.eu/loi-accessibilite-numerique-2025-conformite/) - MEDIUM confidence

---

*Feature research for: Sinistralité France dashboard (milestone "polish + live data")*
*Researched: 2026-02-27*

# Phase 3: Accessibilité - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Rendre le dashboard utilisable par les lecteurs d'écran et la navigation clavier. Couvre les ARIA labels sur tous les éléments interactifs, les annonces de drawers, et le skip link. Ne couvre pas l'ajout de nouvelles fonctionnalités ni la refonte visuelle.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

L'utilisateur n'a pas de préférences sur l'accessibilité et fait confiance aux bonnes pratiques. Claude a carte blanche sur toutes les décisions ci-dessous.

**ARIA labels:**
- Labels en français, cohérents avec le texte visible de l'interface
- Labels descriptifs incluant le contexte quand pertinent (ex: "Rechercher un secteur par code NAF ou mot-clé" plutôt que "Rechercher")
- Les éléments dynamiques incluent l'état dans leur label (ex: aria-expanded, aria-selected)

**Drawer focus management:**
- Focus trap dans les drawers ouverts (Insights, Share)
- Focus initial sur le premier élément interactif du drawer à l'ouverture
- Retour du focus sur le bouton déclencheur à la fermeture
- aria-expanded sur les boutons déclencheurs, aria-live="polite" pour les annonces de contenu

**Skip link:**
- Un seul lien "Aller au contenu" comme premier élément focusable
- Visuellement masqué par défaut, visible au focus clavier
- Cible : le conteneur principal du dashboard (zone KPI)

**Focus indicators:**
- Outline visible sur tous les éléments focusables (respecter le thème clair/sombre)
- Focus visible uniquement au clavier (:focus-visible), pas au clic
- Contraste suffisant selon WCAG 2.1 AA

</decisions>

<specifics>
## Specific Ideas

No specific requirements. Open to standard WCAG 2.1 AA practices applied to the existing dashboard structure.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>

---

*Phase: 03-accessibilit*
*Context gathered: 2026-02-28*

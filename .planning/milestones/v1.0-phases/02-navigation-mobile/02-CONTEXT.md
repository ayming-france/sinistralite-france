# Phase 2: Navigation mobile - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Remplacer le nav rail qui disparaît sous 768px par une navigation mobile permettant de basculer entre les vues AT, MP et Trajet. Le nav rail desktop reste inchangé.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

L'utilisateur a donné carte blanche sur toutes les décisions d'implémentation. Les choix suivants reflètent les meilleures pratiques pour ce type d'interface.

**Pattern de navigation : bottom tab bar**
- Barre fixe en bas de l'écran avec 3 onglets (AT, MP, Trajet)
- Chaque onglet reprend l'icône Lucide correspondante (hard-hat, thermometer, car) et un label court
- Le bottom bar est le pattern standard pour 3 vues de même niveau (iOS tab bar, Material bottom nav). Un hamburger cacherait les options derrière un tap inutile pour seulement 3 items.

**Indicateur de vue active**
- L'onglet actif est mis en avant par la couleur accent du thème et un indicateur visuel (fond ou bordure supérieure)
- Pas d'animation complexe lors du changement de vue. Transition simple (couleur) pour rester cohérent avec le style existant.

**Breakpoint**
- Le breakpoint existant à 768px est conservé
- En dessous de 768px : le nav rail est masqué (`width: 0` existant), le bottom bar apparaît
- Au dessus de 768px : le nav rail est affiché, le bottom bar est masqué
- Pas de zone grise intermédiaire. Un seul breakpoint, un seul switch.

**"Vue d'ensemble" sur mobile**
- L'item désactivé "Vue d'ensemble (bientôt)" est masqué sur mobile
- 3 items actifs sur un bottom bar = lisibilité optimale. Ajouter un 4e item désactivé gaspille de l'espace sur petit écran.
- Il réapparaîtra quand la fonctionnalité sera prête.

</decisions>

<specifics>
## Specific Ideas

No specific requirements. Open to standard approaches. Le dashboard utilise déjà Lucide icons et un design system cohérent (accents, thème clair/sombre, Lato). Le bottom bar doit s'intégrer dans ce langage visuel existant.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>

---

*Phase: 02-navigation-mobile*
*Context gathered: 2026-02-27*

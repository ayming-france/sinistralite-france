# Phase 3: Accessibilité - Research

**Researched:** 2026-02-28
**Domain:** Web Accessibility (ARIA, WCAG 2.1 AA, keyboard navigation, focus management)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Claude's Discretion

Toutes les décisions techniques (implémentation, valeurs CSS, ordre de tabulation, textes des labels).

### Deferred Ideas (OUT OF SCOPE)

Aucune idée différée. Discussion restée dans le périmètre de la phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| A11Y-01 | Chaque bouton, input et lien interactif a un aria-label descriptif lisible par un screen reader | Audit complet des éléments interactifs effectué — liste exhaustive en section Architecture Patterns |
| A11Y-02 | L'ouverture et la fermeture des drawers (Insights, Share) est annoncée par aria-live ou aria-expanded | Pattern aria-expanded + aria-live="polite" documenté — toggleInsights/toggleShare à modifier |
| A11Y-03 | Un lien "Aller au contenu" est le premier élément focusable sur la page et fonctionne au clavier | Pattern skip link standard documenté — aucun markup existant, à insérer avant le top-nav |
</phase_requirements>

## Summary

La phase 3 est une phase de retrofitting ARIA sur un dashboard vanilla JS existant. L'audit du code révèle que le dashboard a très peu d'accessibilité en place : seul le bouton de thème a un `aria-label`, les boutons de la bottom nav mobile ont des `aria-label`, mais la nav rail, les inputs de recherche, les boutons de niveaux NAF, les boutons de partage/insights, les boutons de toggle de graphique, et les boutons de fermeture des drawers n'ont rien. Aucun skip link, aucune gestion du focus sur les drawers, aucun `aria-live`, aucune règle CSS `:focus-visible` globale.

Les trois requirements (A11Y-01, 02, 03) sont indépendants et peuvent être traités en séquence. A11Y-01 est la plus volumineuse (multiples éléments dans 3 vues répétées). A11Y-02 nécessite de modifier `toggleInsights` et `toggleShare` dans `js/insights.js` et d'ajouter un `role="dialog"` sur les drawers. A11Y-03 est triviale (un `<a>` + quelques lignes CSS).

**Primary recommendation:** Implémenter les trois requirements dans un seul plan (03-01). Commencer par le skip link (A11Y-03, 5 min), puis les aria-labels statiques en HTML (A11Y-01, 20 min), puis la gestion du focus des drawers (A11Y-02, 20 min), puis les règles CSS `:focus-visible` (A11Y-01 complément, 10 min).

## Standard Stack

### Core

| Technologie | Version | Objet | Pourquoi standard |
|-------------|---------|-------|-------------------|
| HTML natif ARIA | WAI-ARIA 1.2 | Attributs aria-label, aria-expanded, aria-live, role | Natif, pas de dépendance, support universel |
| CSS :focus-visible | CSS Selectors Level 4 | Outline clavier sans outline souris | Support global depuis 2022 (Chrome 86+, FF 85+, Safari 15.4+) |
| JS focus management | Vanilla JS | focus(), querySelectorAll, tabIndex | Aucune lib nécessaire pour ce cas |

### Supporting

| Outil | Version | Objet | Quand utiliser |
|-------|---------|-------|----------------|
| focus-trap (lib) | 7.x | Focus trap robuste | Si la gestion manuelle devient complexe — éviter ici, natif suffit |
| axe DevTools (test) | extension | Audit ARIA automatique | Vérification post-implémentation |

### Alternatives Considered

| Au lieu de | On pourrait | Arbitrage |
|------------|-------------|-----------|
| Vanilla focus trap | focus-trap lib | Lib trop lourde pour 2 drawers simples. Vanilla suffit avec tabbable selectors |
| aria-live="polite" | aria-live="assertive" | "polite" recommandé pour les changements non-urgents (ouverture drawer) |

## Architecture Patterns

### Inventaire exhaustif des éléments à labelliser (A11Y-01)

**Dans index.html (statiques — modifier directement le HTML):**

| Élément | ID/sélecteur | aria-label à ajouter |
|---------|-------------|----------------------|
| Lien logo top-nav | `.top-nav-logo` | "Retourner à l'accueil Sinistralité France" |
| Nav rail btn AT | `.nav-item[data-view="at"]` | "Accidents du Travail" |
| Nav rail btn MP | `.nav-item[data-view="mp"]` | "Maladies Professionnelles" |
| Nav rail btn Trajet | `.nav-item[data-view="trajet"]` | "Accidents de Trajet" |
| Nav rail btn Overview | `.nav-item[data-view="overview"]` | "Vue d'ensemble (bientôt disponible)" |
| Input AT | `#at-searchInput` | "Rechercher un secteur par code NAF ou mot-clé" |
| Input MP | `#mp-searchInput` | "Rechercher un secteur par code NAF ou mot-clé" |
| Input Trajet | `#trajet-searchInput` | "Rechercher un secteur par code NAF ou mot-clé" |
| Btn Insights AT | `#insightsBtn` | "Afficher les insights" |
| Btn Insights MP | `#mp-insightsBtn` | "Afficher les insights" |
| Btn Insights Trajet | `#trajet-insightsBtn` | "Afficher les insights" |
| Btn Share AT | `#shareBtn` | "Partager" |
| Btn Share MP | `#mp-shareBtn` | "Partager" |
| Btn Share Trajet | `#trajet-shareBtn` | "Partager" |
| Close Insights | `#insightsCloseBtn` | "Fermer les insights" |
| Close Share | `#shareCloseBtn` | "Fermer le partage" |
| Btn copier lien | `#copyLinkBtn` | (text visible suffisant, pas besoin) |
| Btn PDF | `#downloadPDFBtn` | (text visible suffisant, pas besoin) |
| Btn retry | `#retryBtn` | (text visible suffisant, pas besoin) |

**Boutons de niveau NAF (générés dynamiquement en HTML statique):**

| Élément | Sélecteur | aria-label |
|---------|-----------|------------|
| Btn NAF2 AT | `#at-levelTabs button[data-level="naf2"]` | "Niveau NAF 2" |
| Btn NAF4 AT | `#at-levelTabs button[data-level="naf4"]` | "Niveau NAF 4" |
| Btn NAF AT | `#at-levelTabs button[data-level="naf5"]` | "Niveau NAF 5 (complet)" |
| (idem MP et Trajet) | | |

**Boutons comp-toggle (générés en HTML statique):**

| Élément | Sélecteur | aria-label |
|---------|-----------|------------|
| Btn graphique AT | `#at-compToggle button[data-mode="chart"]` | "Afficher en graphique" |
| Btn tableau AT | `#at-compToggle button[data-mode="table"]` | "Afficher en tableau" |
| (idem MP et Trajet) | | |

**Éléments déjà labellisés (ne pas toucher):**
- `#themeToggle` — a déjà `aria-label="Changer le thème"`
- Bottom nav buttons — ont déjà `aria-label`

**Drawers (ajouter role + aria-modal):**

```html
<!-- insightsDrawer -->
<div class="insights-drawer" id="insightsDrawer" role="dialog" aria-modal="true" aria-label="Insights">

<!-- shareDrawer -->
<div class="share-drawer" id="shareDrawer" role="dialog" aria-modal="true" aria-label="Partager">
```

### Pattern 1: Skip Link (A11Y-03)

**Insérer comme premier enfant de `<body>`, avant le top-nav:**

```html
<a href="#main-content" class="skip-link">Aller au contenu principal</a>
```

**Ajouter `id="main-content"` sur le `.container`:**

```html
<div class="container" id="main-content">
```

**CSS dans `styles/base.css`:**

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 0.5rem 1rem;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  z-index: 9999;
  border-radius: 0 0 4px 0;
  text-decoration: none;
}
.skip-link:focus {
  top: 0;
}
```

### Pattern 2: aria-expanded sur les boutons déclencheurs (A11Y-02)

Les 6 boutons (insightsBtn, mp-insightsBtn, trajet-insightsBtn, shareBtn, mp-shareBtn, trajet-shareBtn) doivent avoir `aria-expanded="false"` en HTML initial, puis `toggleInsights` et `toggleShare` doivent mettre à jour l'attribut.

**Dans index.html (ajout initial):**
```html
<button class="action-btn" id="insightsBtn" aria-expanded="false" aria-label="Afficher les insights">
```

**Dans `js/insights.js`, modifier `setAllBtns` pour synchroniser aria-expanded:**

```js
function setAllBtns(suffix, cls, val) {
  ['', 'mp-', 'trajet-'].forEach(function(p) {
    var b = el(p + suffix);
    if (b) {
      b.classList.toggle(cls, val);
      b.setAttribute('aria-expanded', val ? 'true' : 'false');
    }
  });
}
```

### Pattern 3: Focus management des drawers (A11Y-02)

Modifier `toggleInsights` et `toggleShare` pour:
1. A l'ouverture: mettre le focus sur `close-btn` du drawer
2. A la fermeture: retourner le focus sur le bouton déclencheur actif (bouton de la vue courante)
3. Trap clavier: écouter Tab/Shift+Tab dans le drawer pour cycler entre les focusables internes

**Sélecteurs focusables dans un drawer:**
```js
var FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
```

**Trap focus helper:**
```js
function trapFocus(drawer) {
  var focusable = Array.from(drawer.querySelectorAll(FOCUSABLE));
  var first = focusable[0], last = focusable[focusable.length - 1];
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

function releaseFocus(drawer) {
  if (drawer._trapHandler) drawer.removeEventListener('keydown', drawer._trapHandler);
}
```

**Dans toggleInsights, après classList.toggle:**
```js
if (isOpen) {
  trapFocus(drawer);
  drawer.querySelector('.close-btn').focus();
} else {
  releaseFocus(drawer);
  // Retourner le focus au bouton déclencheur de la vue courante
  var viewPrefix = state.activeView === 'at' ? '' : state.activeView + '-';
  var trigger = el(viewPrefix + 'insightsBtn');
  if (trigger) trigger.focus();
}
```

### Pattern 4: aria-live pour les annonces (A11Y-02)

Ajouter une région `aria-live="polite"` dans le drawer pour annoncer le changement de contenu. Le `drawerSub` ou `drawerBody` peut recevoir `aria-live="polite"` directement.

```html
<div class="insights-drawer-body" id="drawerBody" aria-live="polite">
```

Cela annonce automatiquement le contenu quand il est mis à jour via `innerHTML`.

### Pattern 5: CSS :focus-visible global (A11Y-01)

**Dans `styles/base.css`, ajouter après les règles existantes:**

```css
/* Focus visible clavier uniquement */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Supprimer outline au clic (déjà géré par :focus-visible, mais pour les anciens navigateurs) */
:focus:not(:focus-visible) {
  outline: none;
}
```

Le thème sombre utilise déjà `--accent` via CSS custom properties, donc cette règle s'adapte automatiquement.

### Anti-Patterns to Avoid

- **Ne pas utiliser `aria-label` sur des éléments qui ont déjà un texte visible suffisant** (retry button, copy link button) — le texte visible est l'accessible name, pas besoin de doublonner.
- **Ne pas ajouter `tabindex="0"` aux divs** pour les rendre focusables — préférer des `<button>` natifs (déjà le cas dans ce dashboard).
- **Ne pas utiliser `aria-hidden="true"` sur les icônes Lucide qui ont déjà un aria-label sur le parent** — les icônes dans les buttons avec aria-label sont déjà masquées par le label du parent.
- **Ne pas utiliser `role="button"` sur des `<button>`** — redondant.
- **Ne pas oublier de synchroniser aria-expanded** quand le drawer est fermé par clic extérieur (handler dans `app.js` ligne 188-192).

## Don't Hand-Roll

| Problème | Ne pas construire | Utiliser plutôt | Pourquoi |
|----------|-------------------|-----------------|----------|
| Focus trap complexe | Gestionnaire d'événements custom global | Helper local `trapFocus/releaseFocus` | 2 drawers simples, pas besoin de lib |
| Annonces screen reader | polyfill aria-live | Attribut natif aria-live="polite" | Support universel depuis 2017 |

**Key insight:** Pour 2 drawers simples sans sous-menus imbriqués, le focus trap vanilla est préférable à une lib externe. Le projet est no-build, donc toute lib devrait être chargée via CDN — coût disproportionné.

## Common Pitfalls

### Pitfall 1: Oublier le clic extérieur pour aria-expanded

**What goes wrong:** `toggleInsights`/`toggleShare` sont appelés depuis l'handler de clic extérieur dans `app.js` (lignes 188-192), mais ces appels passent par la même fonction `toggleShare/toggleInsights`. Si la synchronisation `aria-expanded` est dans `setAllBtns`, elle sera bien exécutée. Mais le retour du focus ne sera pas déclenché car `isOpen` sera `false` lors de la fermeture par clic extérieur.

**How to avoid:** Dans `toggleInsights`/`toggleShare`, toujours vérifier `isOpen` et gérer le focus dans les deux branches (ouverture ET fermeture), quelle que soit l'origine de l'appel.

**Warning signs:** Screen reader annonce ouverture mais pas fermeture.

### Pitfall 2: Focus trap bloque la touche Escape

**What goes wrong:** L'app.js (ligne 199-200) gère déjà la touche Escape pour fermer les drawers. Le focus trap écoute Tab/Shift+Tab mais pas Escape — pas de conflit. Attention toutefois à ne pas ajouter un listener Escape dupliqué dans le trap.

**How to avoid:** Le trap ne gère que Tab. Escape est délégué au handler existant dans app.js.

### Pitfall 3: aria-live="polite" sur drawerBody avec innerHTML

**What goes wrong:** Certains screen readers n'annoncent pas le contenu si le noeud aria-live est vidé puis rempli trop rapidement. L'utilisation de `innerHTML =` en une seule opération est correcte.

**How to avoid:** Ne pas vider puis remplir en deux étapes séparées avec un timeout entre les deux.

### Pitfall 4: tabindex sur le drawer lui-même

**What goes wrong:** Ajouter `tabindex="-1"` au drawer pour pouvoir le focuser programmatiquement. Pas nécessaire ici car le focus va directement sur `.close-btn` (un vrai button).

**How to avoid:** Ne pas ajouter `tabindex` sur les divs drawers.

## Code Examples

### Skip link complet

```html
<!-- Première ligne de <body> -->
<a href="#main-content" class="skip-link">Aller au contenu principal</a>

<!-- Sur .container -->
<div class="container" id="main-content" tabindex="-1">
```

Note: `tabindex="-1"` sur `#main-content` permet au focus programmatique de fonctionner dans tous les navigateurs (certains ne scrollent pas vers un élément non-focusable).

```css
/* styles/base.css */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 0.5rem 1rem;
  background: var(--accent, #4e8ac5);
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
  z-index: 9999;
  border-radius: 0 0 4px 0;
  text-decoration: none;
  transition: top 0.1s;
}
.skip-link:focus {
  top: 0;
}
```

### toggleInsights avec focus management complet

```js
export function toggleInsights() {
  var shareDrawer = el('shareDrawer');
  if (shareDrawer.classList.contains('open')) {
    shareDrawer.classList.remove('open');
    setAllBtns('shareBtn', 'active', false);
    // aria-expanded géré dans setAllBtns
    releaseFocus(shareDrawer);
  }
  var drawer = el('insightsDrawer');
  var isOpen = drawer.classList.toggle('open');
  setAllBtns('insightsBtn', 'active', isOpen);
  if (isOpen) {
    trapFocus(drawer);
    drawer.querySelector('.close-btn').focus();
  } else {
    releaseFocus(drawer);
    var prefix = state.activeView === 'at' ? '' : state.activeView + '-';
    var trigger = el(prefix + 'insightsBtn');
    if (trigger) trigger.focus();
  }
}
```

## State of the Art

| Ancienne approche | Approche actuelle | Impact |
|-------------------|-------------------|--------|
| `outline: none` global | `:focus-visible` sélectif | Outline clavier sans impacter l'UX souris |
| `aria-label` dupliqué sur enfants | `aria-label` sur le parent button | Screen readers lisent le label du button, ignorent le contenu interne |
| `role="presentation"` sur icônes | `aria-hidden="true"` sur les icônes dans les buttons labellisés | Plus explicite |

**Note sur Lucide icons:** Les icônes Lucide sont rendues comme `<i data-lucide="...">` puis transformées en SVG par la lib. Le SVG généré n'a pas de `aria-hidden` automatique. Pour les buttons avec `aria-label`, le screen reader utilise le label du button et ignore le SVG interne — comportement correct. Pour les icônes standalone sans parent labellisé, ajouter `aria-hidden="true"` sur l'élément `<i>` avant que Lucide le remplace (ou utiliser `createIcons` avec un hook — complexe). Dans ce dashboard, toutes les icônes sont dans des buttons labellisés, donc pas de problème.

## Open Questions

1. **Lucide SVG et aria-hidden post-render**
   - What we know: Lucide `createIcons()` remplace les `<i>` par des `<svg>`. Les SVG générés peuvent ou non hériter des attributs de l'`<i>` original.
   - What's unclear: Est-ce que `aria-hidden="true"` sur `<i data-lucide="...">` est propagé au SVG généré par Lucide ?
   - Recommendation: Tester manuellement post-render. Si non propagé, utiliser CSS `pointer-events: none` + `user-select: none` sur les SVGs — mais aria-hidden est géré par le label du parent button, donc le risque est faible.

2. **Focus visible dans le thème sombre**
   - What we know: `--accent` est `#4e8ac5` (bleu). En thème sombre, le fond est sombre.
   - What's unclear: Le contraste `#4e8ac5` sur fond sombre est-il WCAG AA pour le focus indicator ?
   - Recommendation: Utiliser `outline: 2px solid var(--accent)` + `outline-offset: 2px`. Si besoin, doubler avec une ombre blanche pour le thème sombre: `box-shadow: 0 0 0 4px rgba(255,255,255,0.3)`.

## Sources

### Primary (HIGH confidence)

- MDN Web Docs — aria-expanded: https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/Attributes/aria-expanded
- MDN Web Docs — aria-live: https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
- MDN Web Docs — :focus-visible: https://developer.mozilla.org/fr/docs/Web/CSS/:focus-visible
- WAI-ARIA Authoring Practices 1.2 — Dialog (Modal): https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- WAI-ARIA 1.2 — aria-modal: https://www.w3.org/TR/wai-aria-1.2/#aria-modal

### Secondary (MEDIUM confidence)

- Audit direct du code source `index.html` et `js/insights.js` — inventaire des éléments interactifs

### Tertiary (LOW confidence)

- Aucune.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — HTML natif, pas de lib externe, specs W3C stables
- Architecture: HIGH — basé sur audit direct du code source
- Pitfalls: HIGH — patterns connus WCAG, vérifiés contre le code existant

**Research date:** 2026-02-28
**Valid until:** 2026-08-28 (specs ARIA stables, pas de changement prévu)

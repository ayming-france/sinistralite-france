# Phase 1: Branding et robustesse - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Corriger l'affichage des accents français, mettre en place la marque "Sinistralité France" (titre, logo, favicon), ajouter des états de chargement et d'erreur, et nettoyer le code mort (CSS, polices, localStorage). Le dashboard est déjà fonctionnel. Aucune nouvelle fonctionnalité.

</domain>

<decisions>
## Implementation Decisions

### Loading states
- Skeleton loaders (not spinners) while data fetches
- Per-section skeletons: each KPI card and chart gets its own skeleton placeholder
- Sections that load first appear immediately, others keep their skeleton
- Pulse/shimmer animation on skeleton shapes (not static gray)
- Skeleton colors adapt to current dark/light theme

### Favicon and brand visuals
- Inline SVG favicon: abstract chart icon (stylized bar chart or trend line)
- Favicon color: use the dashboard's existing primary accent color
- Nav logo: small version of the chart favicon icon next to the text "Sinistralité France"
- Same SVG icon reused in nav (scaled up) and browser tab (scaled down). One source, two sizes.

### Claude's Discretion
- Error states: design of error messages and retry button (user did not discuss this area)
- Exact skeleton shapes and dimensions per section
- Favicon SVG path details
- Dead CSS identification and cleanup approach
- localStorage key naming convention

</decisions>

<specifics>
## Specific Ideas

No specific requirements. Open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>

---

*Phase: 01-branding-et-robustesse*
*Context gathered: 2026-02-27*

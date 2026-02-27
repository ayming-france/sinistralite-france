# Phase 4: Export CSV - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Permettre le téléchargement CSV des données KPI du secteur actuellement affiché dans le dashboard. Chaque vue (AT, MP, Trajet) exporte ses propres données depuis le Share drawer. Ne couvre pas l'export multi-secteurs, l'export PDF, ni l'ajout de nouveaux formats.

</domain>

<decisions>
## Implementation Decisions

### Button placement
- Remplacer le bouton PDF cassé dans le Share drawer par le bouton CSV
- Label : "Télécharger CSV" avec une icône de téléchargement
- Un bouton par vue (AT, MP, Trajet) dans le Share drawer de chaque vue
- Même position que l'ancien bouton PDF (sous l'option de partage de lien)

### CSV content scope
- Colonnes : Code NAF, Secteur, Indice de fréquence, Taux de gravité, Événements, Incapacités permanentes, Décès, Jours perdus, Salariés
- Headers en français, correspondant aux libellés du dashboard
- Exporter uniquement le niveau NAF actuellement sélectionné (pas tous les niveaux)
- Exporter uniquement le secteur actuellement affiché (une seule ligne de données)
- Encodage UTF-8 BOM pour compatibilité Excel avec accents français

### File naming
- Format : `sinistralite-{vue}-{code-NAF}.csv`
- Vue en codes courts : AT, MP, Trajet
- Exemple : `sinistralite-AT-62.01Z.csv`
- Pas de date dans le nom de fichier

### No-data behavior
- Bouton CSV désactivé (grisé, non cliquable) tant qu'aucun secteur n'est sélectionné
- Téléchargement silencieux au clic (pas de toast ni de notification)
- Le navigateur gère le téléchargement de manière standard

### Claude's Discretion
- Mécanisme technique de génération du CSV (Blob, data URI, etc.)
- Style exact du bouton désactivé
- Séparateur CSV (point-virgule recommandé pour compatibilité Excel FR)

</decisions>

<specifics>
## Specific Ideas

- Le bouton PDF actuel ne fonctionne pas. Le remplacer entièrement par CSV, ne pas garder les deux.
- Les données sont déjà en mémoire côté client. Pas besoin d'appel serveur pour l'export.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>

---

*Phase: 04-export-csv*
*Context gathered: 2026-02-28*

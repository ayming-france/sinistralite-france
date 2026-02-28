# Phase 5: Pipeline de données - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Pipeline Python autonome dans `data/pipeline/` qui télécharge les sources ameli.fr (Excel + PDF) et génère les fichiers JSON consommés par le dashboard. Le pipeline existe déjà dans le projet BPO (`~/.claude/bpo/data/`) et doit être copié, adapté et nettoyé pour ce projet.

</domain>

<decisions>
## Implementation Decisions

### Source et adaptation
- Copier `refresh_data.py` et `parse_pdf.py` depuis `~/.claude/bpo/data/`
- Adapter les chemins pour que la sortie aille dans `data/` (at-data.json, mp-data.json, trajet-data.json)
- Nettoyer le code pendant la copie : simplifier, retirer la logique spécifique au projet BPO, améliorer les messages d'erreur

### Structure cible
- Scripts dans `data/pipeline/`
- requirements.txt pour les dépendances Python
- README expliquant les prérequis, la commande à lancer, la fréquence de mise à jour

### Claude's Discretion
- Niveau de nettoyage et simplification du code
- Organisation interne des scripts (découpage en fonctions, modules)
- Format et verbosité des logs pendant l'exécution
- Gestion des erreurs (retry, fail fast, messages)
- Version Python minimale à documenter

</decisions>

<specifics>
## Specific Ideas

- Les fichiers JSON actuels dans `data/` sont des copies identiques de ceux du projet BPO
- Le pipeline BPO fait 1550 lignes au total (refresh_data.py: 1157, parse_pdf.py: 393)
- Opportunité de simplifier en retirant ce qui est propre au projet BPO

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>

---

*Phase: 05-pipeline-de-donn-es*
*Context gathered: 2026-02-28*

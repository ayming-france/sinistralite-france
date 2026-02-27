# Datagouv - Applications données ouvertes

Apps and dashboards built on live French open data via the datagouv MCP server.

## MCP Server

Public instance: `https://mcp.data.gouv.fr/mcp`
Configured in `~/.claude/.mcp.json` as `datagouv`.

### Available Tools
- `search_datasets` - recherche par mots-clés
- `get_dataset_info` - métadonnées complètes d'un dataset
- `list_dataset_resources` - fichiers d'un dataset
- `get_resource_info` - métadonnées d'une ressource
- `query_resource_data` - requête tabulaire (CSV/XLSX, API)
- `download_and_parse_resource` - téléchargement et parsing (gros fichiers)
- `search_dataservices` - recherche d'APIs tierces
- `get_dataservice_info` - détails d'un dataservice
- `get_dataservice_openapi_spec` - spécification OpenAPI
- `get_metrics` - visites/téléchargements mensuels

## Domains

### SIRENE (répertoire des entreprises)
- Registre national des entreprises et établissements
- Codes NAF, SIRET, raison sociale, adresse, effectifs

### Ameli (données de santé)
- Statistiques de santé publique
- Données de l'Assurance Maladie

### BPO (accidents du travail / maladies professionnelles)
- Upgrade potentiel du projet BPO existant (`~/.claude/bpo/`)
- Remplacement des fichiers Excel statiques par des requêtes live

## Architecture

- Single-page HTML apps (same pattern as BPO dashboard)
- No build step, vanilla JS + CSS
- Live data queries via datagouv MCP tools
- Deploy to GitHub Pages via `xXencarvXx`

## Rules

- Follow all rules from global CLAUDE.md (accents, no em dash, no co-authored-by)
- French UI text with proper accents
- Data queries should handle pagination and rate limits gracefully

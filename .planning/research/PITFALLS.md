# Pitfalls Research

**Domain:** Open data dashboard — migration statique vers API live (sinistralité AT/MP/Trajet)
**Researched:** 2026-02-27
**Confidence:** MEDIUM (sources officielles + forum utilisateurs + docs Cloudflare vérifiées)

---

## Critical Pitfalls

### Pitfall 1: API tabulaire couplée au fichier source — rupture silencieuse

**What goes wrong:**
La CNAM publie ses données sous forme de fichiers Excel/CSV sur data.gouv.fr. L'API tabulaire est générée automatiquement depuis ces fichiers. Si le producteur renomme une colonne, supprime le fichier, ou change le format, l'API change immédiatement — sans versionning, sans préavis, sans dépréciation.

**Why it happens:**
Le modèle data.gouv.fr est "fichier en premier" : l'API n'est qu'une projection du fichier. L'équipe datagouv l'a documenté explicitement dans le GitHub issue #1861 : "Cette API est générée automatiquement depuis le fichier. Si le fichier est modifié, l'API sera mise à jour et sa structure pourrait changer."

**How to avoid:**
- Ne jamais hardcoder les noms de colonnes sans tests de validation. Toujours vérifier que les colonnes attendues existent dans la réponse avant de rendre les données.
- Ajouter une couche d'adaptation entre l'API et le rendu : `normalizeATRow(rawRow)` qui mappe les noms de colonnes API vers les noms internes du dashboard.
- Enregistrer le `resource_id` exact (pas seulement le dataset_id) et surveiller les changements de métadonnées via `get_resource_info`.

**Warning signs:**
- Une requête `query_resource_data` retourne 0 résultats alors qu'elle en retournait avant.
- Les KPI affichent `NaN` ou `undefined` sans erreur explicite dans la console.
- Le `last_modified` d'une ressource change de manière inattendue dans `get_resource_info`.

**Phase to address:**
Phase "Migration vers API live" — avant toute mise en production. Mettre en place la couche de normalisation dès les premières requêtes live.

---

### Pitfall 2: Cloudflare Worker gratuit — limite CPU de 10 ms par requête

**What goes wrong:**
Le plan gratuit de Cloudflare Workers limite le CPU à **10 ms par requête** (vs 30 s sur le plan payant). Un Worker qui fait du parsing JSON, de la transformation de données, ou plusieurs fetch() en séquence peut dépasser cette limite et retourner une erreur 1102. Le proxying vers l'API MCP datagouv implique des opérations de marshalling qui consomment du CPU.

**Why it happens:**
Les 10 ms sont du temps CPU pur, pas du wall-clock. Les await fetch() ne comptent pas, mais la sérialisation/désérialisation JSON, la construction d'en-têtes, et toute transformation de payload comptent. Le MCP utilisant un protocole JSON-RPC, chaque message est parsé et recomposé.

**How to avoid:**
- Garder le Worker aussi thin que possible : forward de requêtes sans transformation de payload côté Worker.
- Passer au plan payant Workers ($5/mois) dès que le Worker fait plus que du simple proxy, car 10 ms est trop court pour du JSON-RPC.
- Alternativement, appeler l'API tabulaire REST directement depuis le navigateur (elle supporte CORS) et éviter complètement le Worker pour les requêtes de données simples. Réserver le Worker pour les cas où une clé API serait nécessaire.

**Warning signs:**
- Erreur 1102 "Worker exceeded CPU time limit" dans la console réseau.
- Les requêtes fonctionnent en développement local mais échouent en production sur Cloudflare.
- Latence inexplicablement élevée avec coupures aléatoires.

**Phase to address:**
Phase "Cloudflare Worker / proxy MCP" — tester dès le début avec le plan gratuit pour valider si le budget CPU est suffisant, ou planifier le passage au plan payant.

---

### Pitfall 3: Encodage UTF-8 / ISO-8859-1 dans l'API tabulaire datagouv

**What goes wrong:**
L'API tabulaire data.gouv.fr a des problèmes documentés et non résolus d'encodage : certains fichiers CSV UTF-8 sont re-encodés comme ISO-8859-1 par le système de détection automatique (`csv-detective`). Les caractères accentués français (é, è, ê, à, ç, etc.) et les noms de secteurs NAF apparaissent corrompus dans les réponses JSON.

**Why it happens:**
Le moteur de détection d'encodage fonctionne par heuristique sur un échantillon du fichier. Des fichiers avec contenu mixte ou sans marqueur BOM peuvent être mal classés. Bug confirmé sur le forum datagouv en février 2026, toujours ouvert.

**How to avoid:**
- Tester immédiatement que les libellés NAF (ex: "Activités des ménages", "Hébergement et restauration") s'affichent correctement depuis l'API live — avant de retirer les données statiques.
- En fallback : utiliser `download_and_parse_resource` plutôt que `query_resource_data` si l'encodage est corrompu — ce chemin contourne l'API tabulaire et parse directement le fichier source.
- Avoir un test de fumée automatique : requêter un enregistrement avec un accent connu et valider le résultat.

**Warning signs:**
- Libellés NAF avec `?` ou `Ã©` à la place des accents.
- Les libellés de catégories dans les graphiques affichent des caractères de remplacement.
- Les résultats de recherche autocomplete montrent des noms de secteurs corrompus.

**Phase to address:**
Phase "Migration vers API live" — valider l'encodage sur les vraies données CNAM avant de décommissionner les fichiers JSON statiques.

---

### Pitfall 4: Suppression des JSON statiques avant validation complète de l'API live

**What goes wrong:**
Le reflex naturel lors d'une migration est de supprimer les anciennes données dès que les nouvelles fonctionnent "en apparence". Si les 9,2 Mo de JSON sont retirés avant que tous les cas limites (code NAF rare, données manquantes, filtre par année) soient validés sur l'API live, le dashboard régresse et il n'y a plus de filet de sécurité.

**Why it happens:**
La migration "fonctionne" pour les 10-20 codes NAF testés manuellement mais pas pour les 700+ codes existants. Les cas limites (secteurs sans données AT, années manquantes, codes NAF obsolètes) ne se manifestent qu'à l'usage réel.

**How to avoid:**
- Implémenter une stratégie "coexistence" : le dashboard peut fonctionner en mode statique (JSON) ou live (API), sélectionnable par flag.
- Ne retirer les JSON statiques qu'après un run de validation sur un échantillon représentatif (minimum 50 codes NAF couvrant toutes les divisions).
- Conserver les JSON statiques en archive après suppression du code, au moins pendant une release.

**Warning signs:**
- Certains codes NAF retournent 0 résultats depuis l'API alors que les JSON avaient des données.
- Les graphiques d'évolution pluriannuelle n'ont des données que pour les années récentes.
- Des KPI affichent `—` (valeur manquante) sur des secteurs qui avaient des données en statique.

**Phase to address:**
Phase "Migration vers API live" — la validation exhaustive doit précéder la dépréciation des JSON.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `innerHTML` avec concaténation de strings | Rendu rapide, code simple | XSS latent si une source de données externe est introduite, rebuild complet à chaque changement d'état | Acceptable avec des données 100% contrôlées (pas de saisie utilisateur dans le DOM) |
| `var` partout en ES5 | Cohérence interne avec le code existant | Incompatibilité si du code ES6 est mixé, pas d'erreurs de block scope visibles | Acceptable si aucun code ES6 n'est introduit dans les mêmes fichiers |
| Pas de tests | Livraison rapide | Toute modification de `data.js` ou `charts.js` peut casser silencieusement des vues entières | Jamais acceptable lors d'une migration de source de données |
| `lucide@latest` non épinglé | Toujours la dernière version des icônes | Une breaking change Lucide casse le système d'icônes sans avertissement | Jamais acceptable en production |
| Chargement de tous les datasets au démarrage | Simplicité d'implémentation | 9,2 Mo au chargement, blank screen sur connexions lentes | Acceptable en statique, inacceptable avec API live (latence cumulée) |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| API tabulaire datagouv | Appeler `query_resource_data` sans vérifier que la ressource existe et est tabulaire | Appeler d'abord `get_resource_info` et valider `format` et `schema` avant de requêter |
| API tabulaire datagouv | Supposer une pagination illimitée — l'API plafonne à 50 lignes par page | Toujours lire `total` dans la réponse et paginer si nécessaire |
| MCP datagouv public | Supposer que le MCP server public est disponible 24/7 sans fallback | Le serveur est en beta. Prévoir un fallback sur les JSON statiques en cas d'indisponibilité |
| Cloudflare Worker comme proxy MCP | Transporter des sessions SSE longues via le Worker gratuit | SSE est supporté mais la connexion persistante peut consommer des ressources non prises en compte dans le plan gratuit |
| GitHub Pages (déploiement) | Pousser vers `xXencarvXx` au lieu de `ayming-france` pour le déploiement public | Déployer vers `ayming-france/sinistralite-france`, utiliser `xXencarvXx/datagouv` uniquement pour le backup |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Charger les 3 datasets en parallèle dès le démarrage | Blanc écran de 2-10 s sur connexion mobile, pas de feedback utilisateur | Charger uniquement le dataset de la vue active (AT en premier), charger MP/Trajet à la demande | Immédiatement sur connexion 3G |
| Pagination non gérée pour l'API tabulaire (max 50 lignes) | Seuls les 50 premiers secteurs sont récupérés, les comparaisons sont faussées | Implémenter la pagination complète ou utiliser les endpoints de streaming CSV | Dès que le dataset dépasse 50 secteurs NAF |
| Reconstruire tous les charts à chaque changement de vue | Pic de CPU visible, animation saccadée | Détruire/recréer uniquement le chart qui change, pas tous | Visible à partir de 6 charts simultanés |
| `getComputedStyle()` appelé à chaque invocation de `themeColor()` | Micro-lag lors du rendu de charts avec beaucoup de points | Mettre en cache le résultat de `getComputedStyle` par cycle de rendu | Visible à partir de ~200 appels par render |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `navigator.clipboard.writeText()` sans `.catch()` | Echec silencieux sur HTTP ou si la permission clipboard est refusée — l'utilisateur croit que le lien a été copié | Ajouter `.catch()` et afficher un message d'erreur explicite |
| Pas de Content Security Policy | Chargement de scripts malveillants depuis CDN compromis (jsdelivr, unpkg) | Ajouter une meta CSP ou un header Cloudflare Worker avec les hashes ou domaines whitélistés |
| `lucide@latest` non épinglé sur CDN unpkg | Un acteur malveillant compromettant unpkg peut injecter du code | Épingler à une version spécifique : `lucide@0.x.y` |
| `innerHTML` avec données de recherche | XSS si des données API contiennent du HTML — faible risque aujourd'hui, risque réel si la source évolue | Sanitizer avec `DOMPurify` ou remplacer `innerHTML` par `textContent` pour les libellés |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Pas d'état de chargement lors du fetch API live | L'utilisateur voit un dashboard vide ou des données de la requête précédente sans savoir si une requête est en cours | Afficher un spinner ou un skeleton UI pendant le fetch, désactiver les contrôles pendant le chargement |
| Pas de message d'erreur si le fetch échoue | L'utilisateur pense que le secteur n'a pas de données alors que l'API est indisponible | Distinguer "pas de données" (message neutre) de "erreur réseau" (message avec option de retry) |
| Données CNAM publiées annuellement sans indication de fraîcheur | L'utilisateur ne sait pas si les données sont de 2023 ou 2024 | Afficher l'année de référence des données dans le titre de chaque vue ou dans les KPI |
| Navigation mobile supprimée (nav rail cachée sous 768px) sans alternative | L'utilisateur mobile ne peut pas passer de AT à MP à Trajet | Remplacer la nav rail par un sélecteur de vue en bas de page ou par des onglets horizontaux sur mobile |

---

## "Looks Done But Isn't" Checklist

- [ ] **Migration API live :** Les données semblent correctes pour les 5 codes NAF testés. Vérifier avec des codes de divisions différentes, des secteurs sans décès, et des codes de classe sur 5 caractères.
- [ ] **Encodage :** Les libellés s'affichent bien en local. Vérifier que les accents sont corrects dans la réponse JSON brute de l'API tabulaire (pas après le rendu côté navigateur).
- [ ] **Cloudflare Worker :** Le Worker répond en local avec `wrangler dev`. Tester en production sur l'URL workers.dev pour valider le CPU budget.
- [ ] **Gestion d'erreur :** Le code `try/catch` est en place. Vérifier que le message d'erreur s'affiche réellement si le réseau est coupé (utiliser le throttling dans les DevTools).
- [ ] **Fallback statique :** Le flag de mode statique est implémenté. Vérifier que l'activation du flag restaure exactement le comportement précédent sans régression.
- [ ] **Accents dans les labels :** Les 12 occurrences d'accents manquants dans le code source ont été corrigées. Vérifier dans le rendu navigateur, pas seulement dans le code.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Colonnes API renommées par CNAM | MEDIUM | Mettre à jour la couche de normalisation (`normalizeATRow`), redéployer, valider. Pas de refactoring majeur si la couche d'adaptation est en place. |
| Cloudflare Worker CPU limit atteinte | LOW | Passer au plan Workers Paid ($5/mois) ou simplifier le Worker pour qu'il ne fasse que du forwarding sans transformation. |
| Encodage corrompu depuis l'API tabulaire | MEDIUM | Basculer vers `download_and_parse_resource` pour le dataset concerné. Implique un changement dans la couche de fetch mais pas dans le reste du dashboard. |
| JSON statiques supprimés avant validation complète | HIGH | Restaurer depuis git, réimplémenter le flag de mode statique, reprendre la validation. Coût élevé en temps. |
| Régression après polish CSS/JS | LOW | Git revert sur le fichier concerné. Coût faible si les commits sont atomiques par fichier/feature. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Rupture silencieuse de schéma API | Phase "Migration API live" — couche normalisation | Requête de test sur 10 codes NAF variés retourne les mêmes KPI que les JSON statiques |
| CPU limit Cloudflare Worker (10 ms) | Phase "Proxy Cloudflare Worker" — test dès le départ | Aucune erreur 1102 en production sur l'URL workers.dev |
| Encodage UTF-8 corrompu | Phase "Migration API live" — test de fumée encodage | Les libellés NAF avec accents (é, è, ê, à, ç) sont corrects dans la réponse JSON brute |
| Suppression prématurée des JSON | Phase "Migration API live" — validation exhaustive avant décommissionnement | Run de validation sur 50+ codes NAF sans aucun `undefined` ou KPI manquant |
| Pas d'état de chargement | Phase "Polish et qualité" — error handling + loading states | Le spinner apparaît sur connexion throttled à 3G, le message d'erreur sur coupure réseau |
| `lucide@latest` non épinglé | Phase "Polish et qualité" — corrections de dette technique | Le numéro de version est fixe dans `index.html` |
| Navigation mobile cassée | Phase "Polish et qualité" — responsive | Sur viewport 375px, les 3 vues AT/MP/Trajet sont accessibles |

---

## Sources

- [datagouv/data.gouv.fr issue #1861 — limites API tabulaire](https://github.com/datagouv/data.gouv.fr/issues/1861) — MEDIUM confidence (doc officielle GitHub)
- [datagouv/api-tabular — dépôt officiel](https://github.com/datagouv/api-tabular) — MEDIUM confidence (pagination 50 lignes, agrégations désactivées par défaut)
- [datagouv/datagouv-mcp — dépôt officiel](https://github.com/datagouv/datagouv-mcp) — HIGH confidence (Streamable HTTP uniquement, tailles limites CSV 100 Mo / XLSX 12,5 Mo)
- [Forum data.gouv.fr — bug encodage tabular-api](https://forum.data.gouv.fr/t/erreur-de-gestion-de-lencodage-dans-tabular-api-data-gouv-fr-et-explore-data-gouv-fr/338) — HIGH confidence (problème documenté, non résolu en février 2026)
- [Cloudflare Workers Limits — docs officielles](https://developers.cloudflare.com/workers/platform/limits/) — HIGH confidence (10 ms CPU gratuit, 100 000 req/jour, 50 subrequests)
- [Smashing Magazine — UX strategies for real-time dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/) — MEDIUM confidence (pratiques UX pour indicateurs de fraîcheur)
- `.planning/codebase/QUALITY.md` — HIGH confidence (analyse directe du code source)

---

*Pitfalls research for: dashboard sinistralité France — migration statique vers API live*
*Researched: 2026-02-27*

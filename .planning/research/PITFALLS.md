# Pitfalls Research

**Domain:** SVG choropleth map + PDF table parsing — ajout à un dashboard vanilla JS existant (sinistralité France v1.1)
**Researched:** 2026-02-28
**Confidence:** HIGH (sources officielles pdfplumber, MDN, Datawrapper, sources communautaires vérifiées)

---

## Critical Pitfalls

### Pitfall 1: Caisse-to-region mapping — correspondance non bijective

**What goes wrong:**
Le dashboard suppose que "21 caisses" = 21 régions SVG distinctes. En réalité, le territoire métropolitain est couvert par 16 caisses (15 CARSAT + 1 CRAMIF), pas 21. De plus, la région administrative Auvergne-Rhône-Alpes est couverte par deux caisses distinctes (CARSAT Auvergne et CARSAT Rhône-Alpes), ce qui signifie qu'une seule région SVG devrait afficher les données agrégées de deux caisses. Les territoires DOM-TOM (Guadeloupe, Martinique, Réunion, Guyane, Mayotte) utilisent des CGSS plutôt que des CARSAT et n'apparaissent pas sur la carte métropolitaine standard.

**Why it happens:**
Le rapport annuel Ameli liste les caisses par leur nom propre (ex: "Carsat Auvergne", "Carsat Rhône-Alpes"), pas par région administrative. Le découpage CARSAT précède les fusions de régions de 2016 et ne s'y aligne pas. Un développeur qui crée la table de mapping en se basant uniquement sur les noms des caisses sans connaître ce contexte crée une table incomplète ou incorrecte.

**How to avoid:**
- Construire la table de mapping à la main et la vérifier caisse par caisse avant de l'intégrer au pipeline.
- Pour Auvergne-Rhône-Alpes : afficher la somme des deux caisses dans le tooltip, pas une seule. Colorer la région selon la valeur agrégée.
- Pour les DOM-TOM : les exclure de la carte SVG métropolitaine ou les représenter comme incrustations séparées si les données existent. Ne pas mapper des CGSS sur des régions métropolitaines.
- Table de référence canonique :

| Caisse (nom rapport Ameli) | Région administrative SVG |
|---|---|
| CRAMIF | Île-de-France |
| Carsat Normandie | Normandie |
| Carsat Nord-Picardie | Hauts-de-France |
| Carsat Nord-Est | Grand Est |
| Carsat Alsace-Moselle | Grand Est (partiel — à fusionner avec Nord-Est si données séparées) |
| Carsat Bourgogne-Franche-Comté | Bourgogne-Franche-Comté |
| Carsat Centre-Val de Loire | Centre-Val de Loire |
| Carsat Bretagne | Bretagne |
| Carsat Pays de la Loire | Pays de la Loire |
| Carsat Aquitaine | Nouvelle-Aquitaine (partiel) |
| Carsat Centre-Ouest | Nouvelle-Aquitaine (partiel) |
| Carsat Midi-Pyrénées | Occitanie (partiel) |
| Carsat Languedoc-Roussillon | Occitanie (partiel) |
| Carsat Auvergne | Auvergne-Rhône-Alpes (partiel — agréger) |
| Carsat Rhône-Alpes | Auvergne-Rhône-Alpes (partiel — agréger) |
| Carsat Sud-Est | Provence-Alpes-Côte d'Azur + Corse |

**Warning signs:**
- La table de mapping a exactement 13 entrées (une par région admin) : il manque des caisses.
- Auvergne-Rhône-Alpes n'a qu'une seule valeur sans agrégation : vérifier si les deux caisses sont fusionnées.
- Une région SVG reste grise (no data) alors que les données de caisse existent.

**Phase to address:**
Phase "Pipeline PDF — extraction régionale" : créer et valider la table de mapping avant d'écrire le JSON de sortie. La valider visuellement sur la carte dès la phase "Rendu SVG".

---

### Pitfall 2: PDF table extraction — noms de caisses multi-lignes et accents

**What goes wrong:**
pdfplumber découpe les cellules de tableau selon les lignes graphiques du PDF. Si un nom de caisse est long (ex: "Carsat Bourgogne-Franche-Comté") il peut être extrait sur deux lignes séparées, avec le retour à la ligne au milieu du nom. Le parser récupère alors deux fragments de chaîne au lieu d'un nom complet, et le matching avec la table de mapping échoue silencieusement.

**Why it happens:**
pdfplumber extrait le texte cellule par cellule. Les sauts de ligne internes aux cellules sont préservés dans `extract_tables()` comme `\n` dans la chaîne. Si le pipeline utilise `split('\n')[0]` ou un strip simple, la deuxième ligne est perdue. En plus, les noms de caisses contiennent des accents français (`é`, `ô`, `è`) : si l'extraction échoue sur l'encodage, le matching est encore plus fragile.

**How to avoid:**
- Après `extract_tables()`, normaliser chaque cellule de nom de caisse avec `' '.join(cell.split())` pour fusionner tous les espaces blancs (y compris les `\n`).
- Construire la table de mapping avec les noms normalisés (espace simple, pas de newline).
- Tester spécifiquement sur la ligne "Bourgogne-Franche-Comté" et "Île-de-France" (trait d'union dans le préfixe) pour valider.
- Utiliser `str.strip()` + normalisation unicode (`unicodedata.normalize('NFC', s)`) avant toute comparaison de chaîne.

**Warning signs:**
- Le parser retourne un nom de caisse tronqué ("Bourgogne-" ou "Franche-Comté" seul).
- Un code de matching retourne `None` pour une caisse qui devrait exister.
- Le nombre de lignes extraites est inférieur au nombre attendu de caisses (ex: 20 lignes au lieu de 21 parce qu'une ligne est scindée).

**Phase to address:**
Phase "Pipeline PDF — extraction régionale" : ajouter un test de sanity check qui vérifie que le nombre de caisses extraites == nombre attendu et que chaque nom est dans la table de mapping.

---

### Pitfall 3: SVG responsive — hardcoded width/height bloque le redimensionnement

**What goes wrong:**
La carte SVG est intégrée dans le HTML avec des attributs `width="800" height="600"` fixes. Sur mobile, la carte déborde du conteneur ou est réduite uniformément en ignorant le ratio d'affichage. Sur desktop large, la carte reste petite. Les tooltips positionnés en `position: absolute` par rapport au SVG débordent hors de leur conteneur parent si `overflow: hidden` est actif sur le dashboard.

**Why it happens:**
Le réflexe naturel est de copier la carte SVG avec ses dimensions originales depuis le fichier source. Sans `viewBox` défini et sans `width="100%" height="auto"` en CSS, l'SVG ne scale pas. Le dashboard existant utilise `overflow: hidden` sur plusieurs conteneurs pour gérer les drawers, ce qui peut clipper les tooltips HTML positionnés en absolu.

**How to avoid:**
- Supprimer `width` et `height` des attributs SVG inline. Les remplacer par `viewBox="0 0 [w] [h]"` seul.
- Appliquer en CSS : `svg { width: 100%; height: auto; display: block; }`.
- Pour les tooltips : utiliser un `<div>` HTML positionné en `position: fixed` (pas `absolute`) avec coordonnées converties via `getBoundingClientRect()` + `window.scrollY`. `position: fixed` ignore `overflow: hidden` des parents.
- Tester sur viewport 375px (iPhone SE) et 1440px (desktop) dès la première intégration.

**Warning signs:**
- La carte est identique en taille sur mobile et desktop.
- Un tooltip est partiellement invisible sous un bord du conteneur.
- La carte affiche une bande vide à droite ou en bas (preserveAspectRatio par défaut = `xMidYMid meet`).

**Phase to address:**
Phase "Rendu SVG — intégration dashboard" : poser le responsive et les tooltips en priorité avant la logique de coloration.

---

### Pitfall 4: Echelle de couleurs faussée par un outlier régional

**What goes wrong:**
L'interpolation linéaire min-max colore la région avec le plus haut taux AT en couleur maximale et toutes les autres en teintes très claires. Si une région (ex: Île-de-France qui concentre un grand nombre de salariés, ou une région industrielle lourde) a un taux AT nettement supérieur, toutes les autres régions semblent identiques (gris clair uniforme), rendant la carte inutile comme outil de comparaison.

**Why it happens:**
Avec 16-21 régions seulement, la méthode quantile (qui neutralise les outliers) ne peut pas créer assez de classes significatives. La méthode linéaire est choisie par défaut pour sa simplicité mais est très sensible aux valeurs extrêmes.

**How to avoid:**
- Utiliser une échelle en percentile ou un clamping : calculer le 95e percentile des valeurs, utiliser ce plafond comme maximum de l'échelle de couleur plutôt que le vrai maximum.
- Ou utiliser une échelle logarithmique si les valeurs s'étendent sur plus d'un ordre de grandeur.
- Afficher la valeur exacte dans le tooltip pour compenser la perte de précision du clamping.
- Ajouter une légende avec les bornes de l'échelle (min, valeur médiane, max clampé).

**Warning signs:**
- Toutes les régions sauf une ont une couleur similaire.
- La palette a l'air correcte sur les données de test mais semble "plate" sur les vraies données du rapport.
- L'écart entre le maximum et la médiane est supérieur à 3x.

**Phase to address:**
Phase "Rendu SVG — choropleth et légende" : calculer la distribution des valeurs avant de choisir la méthode d'interpolation. Décider de l'approche (linéaire, clamped, log) sur la base des vraies données extraites du PDF.

---

### Pitfall 5: Accessibilité couleur — palette rouge/orange sur choropleth AT

**What goes wrong:**
L'intuition naturelle pour représenter la "dangerosité" AT est une palette rouge/orange (rouge = zone à risque). Cette palette est partiellement illisible pour les personnes avec deutéranopie ou protanopie (7-8% des hommes). La différence entre rouge moyen et orange clair est imperceptible en mode daltonien. De plus, une palette à teinte unique rouge viole les contrastes WCAG si les labels de régions SVG sont dessinés en blanc sur fond rouge foncé.

**Why it happens:**
Le choix "rouge = danger" est sémantiquement cohérent mais cartographiquement problématique. La palette n'est pas testée en simulation daltonienne avant intégration.

**How to avoid:**
- Préférer une palette séquentielle jaune-vert-bleu (YlGnBu de ColorBrewer) ou orange-rouge désaturé (OrRd). YlGnBu est accessible aux trois types de daltonisme les plus fréquents.
- Simuler la palette en mode Deuteranopia dans les Chrome DevTools (Rendering > Emulate vision deficiencies) avant de valider.
- Ne pas encoder l'information seulement par la couleur : ajouter la valeur numérique dans le tooltip et dans une légende lisible.
- Vérifier le contraste texte/fond sur les régions colorées avec le Colour Contrast Analyser (cible WCAG AA = 4.5:1).

**Warning signs:**
- La palette utilise du rouge pur (#ff0000) comme couleur maximale.
- Aucun test en mode daltonien n'a été effectué.
- Les labels de noms de région dans le SVG ne sont pas différenciés de la couleur de fond.

**Phase to address:**
Phase "Rendu SVG — choropleth et légende" : choisir la palette définitive et la tester en simulation daltonienne avant d'implémenter la logique de coloration.

---

### Pitfall 6: Interaction touch mobile — hover inexistant, tap cible trop petite

**What goes wrong:**
Les événements `mouseover`/`mouseenter` sur les `<path>` SVG n'existent pas sur mobile. Un utilisateur mobile qui tapote sur une région ne voit pas le tooltip apparaître. De plus, les régions petites (Alsace, Île-de-France, Corse) ont des surfaces de tap inférieures à 44x44px recommandés par les guidelines iOS/Android, rendant le tap précis difficile.

**Why it happens:**
Le développement est fait sur desktop avec souris. Les événements `mouseover` fonctionnent parfaitement. Les tests mobiles sont faits en émulation DevTools, pas sur vrai appareil, et les événements `touch` ne sont pas testés.

**How to avoid:**
- Écouter `pointerover`/`pointerout` (unifiés mouse + touch) plutôt que `mouseover`/`mouseout`.
- Sur touch : le `pointerover` se déclenche au tap, mais `pointerout` ne se déclenche pas automatiquement. Écouter aussi `click` sur le `<path>` pour toggle le tooltip sur mobile.
- Afficher un panneau d'information fixe en bas de carte sur mobile (pas de tooltip flottant) : un `<div>` qui affiche les stats de la région sélectionnée. Évite entièrement le problème des petites cibles.
- Ajouter `touch-action: none` sur le SVG pour éviter le scroll parasite lors d'un tap sur une petite région.

**Warning signs:**
- Le code utilise `addEventListener('mouseover', ...)` sans équivalent touch.
- Sur un vrai appareil iOS/Android, tapoter une région ne déclenche rien.
- Les régions Corse ou Île-de-France sont impossibles à sélectionner précisément au doigt.

**Phase to address:**
Phase "Rendu SVG — intégration dashboard" : implémenter les événements touch dès la première itération, pas comme amélioration ultérieure.

---

### Pitfall 7: Intégration SVG dans le DOM existant — conflits de z-index et de CSS

**What goes wrong:**
Le dashboard existant a plusieurs couches de `z-index` pour les drawers, tooltips Chart.js, et l'overlay. L'SVG inline injecté dans le DOM peut hériter de styles globaux non prévus : `path { fill: none }` dans les styles existants (utilisé pour Chart.js) peut colorer toutes les régions en transparent. Les IDs des éléments SVG peuvent entrer en conflit avec les IDs du dashboard si le fichier SVG source contient des `id` génériques.

**Why it happens:**
Les styles CSS globaux du dashboard s'appliquent aux éléments SVG inline. Le CSS Chart.js ou les styles de reset peuvent avoir des règles larges (ex: `path`, `circle`, `line`) qui ciblent les éléments du SVG cartographique de façon non intentionnelle.

**How to avoid:**
- Encapsuler tous les styles du SVG dans un sélecteur parent spécifique : `.map-container svg path { ... }`. Ne jamais utiliser `path { fill: ... }` au niveau global.
- Vérifier dans les DevTools si les `<path>` du SVG cartographique sont affectés par des règles CSS existantes (inspecter "Inherited Styles" dans le panneau Styles).
- Renommer les `id` dans le SVG source pour qu'ils aient un préfixe unique : `id="map-reg-idf"` plutôt que `id="idf"`.
- Placer le tooltip HTML dans un `<div>` frère du SVG (pas enfant) avec `position: fixed` pour qu'il ne soit pas affecté par `overflow: hidden` du conteneur de la carte.

**Warning signs:**
- Les régions SVG apparaissent toutes transparentes ou noires au premier rendu.
- Un tooltip est clippé par le bord du conteneur de la carte.
- Les `id` du SVG entrent en collision avec des `getElementById` du dashboard existant (erreurs silencieuses en JS).

**Phase to address:**
Phase "Rendu SVG — intégration dashboard" : inspecter les conflits CSS dès l'injection de l'SVG, avant d'implémenter la logique de coloration.

---

### Pitfall 8: Lignes de tableau fusionnées (merged cells) dans le rapport Ameli

**What goes wrong:**
Les tableaux du rapport annuel Ameli (Tableau 9 p.24, Tableau 17 p.37) contiennent une ligne "Total" ou des sous-totaux avec des cellules fusionnées horizontalement. pdfplumber représente une cellule fusionnée comme une cellule avec `None` dans les colonnes qui n'ont pas de texte propre. Si le parser itère directement sur toutes les lignes sans filtrer les `None`, il produit des lignes à valeur nulle ou décale les valeurs dans les mauvaises colonnes.

**Why it happens:**
pdfplumber's `extract_tables()` retourne une liste de listes : chaque cellule vide issue d'une fusion contient `None`. Les lignes de total ont souvent un label sur toute la largeur (cellule fusionnée) suivi de valeurs numériques. Le parser les traite comme des lignes de données ordinaires.

**How to avoid:**
- Filtrer explicitement les lignes `None` : `[row for row in table if any(cell is not None for cell in row)]`.
- Détecter les lignes de total par leur label ("Total", "Ensemble", "France métropolitaine") et les exclure ou les traiter séparément.
- Logger les lignes non reconnues plutôt que de les ignorer silencieusement, pour faciliter le débogage.
- Utiliser `table_settings` pour ajuster `snap_tolerance` si les colonnes numériques sont mal alignées.

**Warning signs:**
- Le nombre de lignes extraites est supérieur au nombre de caisses attendu (lignes de total non filtrées).
- Certaines valeurs numériques semblent décalées d'une colonne (toujours à droite de leur vraie position).
- Des valeurs `None` apparaissent dans les colonnes numériques pour des caisses qui devraient avoir des données.

**Phase to address:**
Phase "Pipeline PDF — extraction régionale" : tester l'extraction sur le vrai PDF avant de coder la logique métier.

---

### Pitfall 9: DOM-TOM rows — présence variable selon les années du rapport

**What goes wrong:**
Les données DOM-TOM (Guadeloupe, Martinique, Réunion, Guyane, parfois Mayotte) apparaissent dans certaines éditions du rapport Ameli et pas dans d'autres, ou dans des tableaux annexes séparés plutôt qu'intégrées au Tableau 9. Un parser qui suppose une structure fixe du tableau échoue silencieusement quand ces lignes sont absentes d'une année ou présentes en plus dans une autre.

**Why it happens:**
Le format du rapport Ameli varie légèrement d'une année à l'autre. Les données DOM-TOM sont souvent en note de bas de tableau ou dans une section séparée. Un parser codé sur l'édition 2024 peut ne pas fonctionner sur l'édition 2023 ou 2025.

**How to avoid:**
- Parser les données DOM-TOM séparément de la boucle principale des caisses métropolitaines.
- Rendre le parser tolérant à l'absence de ces lignes : si "Guadeloupe" n'est pas trouvé, ne pas échouer, juste laisser `null` dans le JSON.
- Tester le parser sur deux éditions différentes du rapport (ex: 2023 et 2024) pour détecter les variations de structure.
- Documenter explicitement quelle page et quel tableau est ciblé pour chaque édition.

**Warning signs:**
- Le parser fonctionne sur l'édition 2024 mais échoue sur 2023.
- Les DOM-TOM ont des valeurs `0` au lieu de `null` (données manquantes masquées comme zéro).
- Le total extrait ne correspond pas au total "France entière" du rapport.

**Phase to address:**
Phase "Pipeline PDF — extraction régionale" : tester sur les PDF 2023 et 2024 simultanément.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoder la table caisse-to-region dans le script Python | Rapide à implémenter | Doit être mis à jour manuellement si Ameli change les noms de caisses dans un futur rapport | Acceptable — données annuelles stables, documentation dans un commentaire |
| SVG cartographique en inline complet dans index.html | Pas de fetch HTTP supplémentaire | Alourdit index.html de plusieurs Ko, rend le HTML difficile à lire | Acceptable si la carte SVG est compressée et inférieure à 80 Ko |
| Pas de cache du JSON régional en mémoire | Code plus simple | Si la carte est rechargée plusieurs fois (thème toggle), le JSON est relu | Jamais acceptable — les données régionales doivent être cachées au démarrage avec les autres datasets |
| Tooltip positionné avec `getBoundingClientRect()` sans debounce | Fonctionne correctement | Sur scroll ou resize rapide, le tooltip peut se désynchroniser | Acceptable en l'état (repositionnement au mousemove suffit) |
| Échelle de couleur linéaire sans clamping | Simple à coder | Rendu inutilisable si un outlier existe | Jamais acceptable sans avoir d'abord visualisé la distribution des vraies données |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SVG inline dans le dashboard | Appliquer `fill` aux `<path>` SVG via JavaScript sans namespace CSS | Utiliser `.style.fill` en JS ou des classes CSS préfixées par `.map-container` pour éviter les conflits avec Chart.js |
| pdfplumber + tableau annuel Ameli | Appeler `extract_tables()` sans settings et supposer que les colonnes sont alignées | Inspecter d'abord avec `page.debug_tablefinder(settings)` pour valider que les cellules sont bien délimitées |
| JSON régional + data.js existant | Charger le JSON régional depuis un 4e fichier sans modifier data.js | Ajouter `regional` comme 4e dataset dans `loadDataset()` pour profiter du cache existant |
| Tooltips HTML sur SVG | Utiliser `position: absolute` pour le tooltip et `overflow: hidden` sur le parent | Utiliser `position: fixed` avec coordonnées calculées depuis `getBoundingClientRect()` pour que le tooltip ne soit jamais clippé |
| Coloration des régions SVG | Utiliser `document.getElementById(regionId)` sans vérifier l'existence | Les IDs SVG peuvent différer entre les sources de SVG. Toujours vérifier et logger les regions non trouvées |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recolorer toutes les régions SVG à chaque changement de métrique | Micro-lag visible lors du changement AT/Trajet | Pré-calculer les couleurs pour les deux métriques au chargement, stocker dans un Map, appliquer en batch | Visible immédiatement sur les interactions de sélection de métrique |
| Charger le JSON régional (4e dataset) en parallèle dès le boot | Légère augmentation du temps de chargement initial | Acceptable si le fichier JSON est petit (< 50 Ko pour 21 caisses x 5 ans) | Peu de risque à cette échelle |
| Re-parsage du SVG DOM pour trouver les path régionaux à chaque render | Ralentissement si appelé fréquemment | Construire un Map `{ regionId -> SVGPathElement }` une seule fois au chargement | Visible si la carte est rendue plus de 5 fois par seconde |
| Pas de `will-change: fill` sur les paths SVG animés | Chaque transition de couleur provoque un repaint complet | Ajouter `transition: fill 0.3s ease` en CSS (le navigateur optimise automatiquement) | Visible sur les animations d'entrée si elles animent toutes les régions simultanément |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Pas d'état "aucune région sélectionnée" défini | L'utilisateur ne sait pas comment interagir avec la carte au premier chargement | Afficher une instruction courte sous la carte ("Cliquez sur une région pour voir les statistiques") |
| Tooltip qui disparaît avant que l'utilisateur ait fini de lire | Frustrant sur mobile ou sur les régions petites | Sur mobile : afficher les stats dans un panneau fixe, pas dans un tooltip ephémère |
| Carte sans titre ni source | L'utilisateur ne sait pas ce que la couleur représente | Ajouter un titre ("Fréquence AT par caisse régionale") et une légende avec la source et l'année |
| Pas d'indication visuelle de la région survolée/sélectionnée | L'utilisateur ne sait pas quelle région est active | Ajouter `stroke` et `stroke-width` augmentés sur le `<path>` survolé/sélectionné |
| Vue "Carte" accessible depuis l'onglet MP mais données MP absentes par région | L'utilisateur s'attend à voir une carte MP similaire | Masquer ou désactiver le bouton de vue carte sur l'onglet MP, ou afficher un message explicatif |

---

## "Looks Done But Isn't" Checklist

- [ ] **Mapping caisse-to-region :** Toutes les 16 caisses métropolitaines sont mappées. Auvergne-Rhône-Alpes agrège deux caisses. Vérifier que le JSON régional a bien une clé par région administrative (13 max), pas une clé par caisse.
- [ ] **Extraction PDF :** Tester sur le vrai rapport PDF Ameli (pas un PDF de substitution). Vérifier que le nombre de caisses extraites == nombre attendu avec une assertion dans le script.
- [ ] **SVG responsive :** Ouvrir la carte sur un viewport 375px et 1440px. La carte doit occuper toute la largeur disponible sur mobile et ne pas déborder.
- [ ] **Tooltips sur mobile :** Tester sur un vrai appareil (ou DevTools avec Device Mode + Throttling). Les tooltips doivent apparaître au tap, pas seulement au hover.
- [ ] **Palette accessible :** Simuler la carte en mode Deuteranopia dans Chrome DevTools > Rendering > Emulate vision deficiencies. Les différences de régions doivent rester visibles.
- [ ] **Conflits CSS :** Inspecter les `<path>` SVG dans les DevTools. Vérifier qu'aucune règle CSS existante (`path { fill: none }` ou similaire) n'affecte les régions cartographiques.
- [ ] **Vue MP sans données régionales :** La vue MP du dashboard ne propose pas de carte (données régionales non disponibles dans le rapport). Vérifier que le bouton de carte est masqué ou qu'un message l'explique.
- [ ] **Données DOM-TOM :** Le JSON régional indique explicitement `null` (pas `0`) pour les caisses DOM-TOM absentes de la carte SVG métropolitaine.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Table caisse-to-region incorrecte | MEDIUM | Corriger la table dans le script Python, ré-exécuter le pipeline, re-générer le JSON régional, redéployer. |
| Noms de caisses mal extraits (multi-lignes) | LOW | Ajouter la normalisation `' '.join(cell.split())` dans le parser. Ré-exécuter sur le PDF. |
| SVG non responsive sur mobile | LOW | Supprimer `width`/`height` du SVG, ajouter CSS `width: 100%; height: auto`. Correction en 10 minutes. |
| Palette illisible en daltonisme | LOW | Remplacer le tableau de couleurs par une palette ColorBrewer validée. Aucun impact sur la logique de données. |
| Tooltips cassés sur mobile | MEDIUM | Remplacer le tooltip flottant par un panneau d'information fixe. Implique un refactoring de l'interaction mais pas des données. |
| Conflits CSS avec le dashboard existant | MEDIUM | Préfixer toutes les règles SVG avec `.map-container`. Peut nécessiter de passer en revue les styles existants. |
| Merged cells non filtrées dans le parser | LOW | Ajouter le filtre `None` dans la boucle d'extraction. Ré-exécuter le pipeline. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Caisse-to-region non bijective | Phase "Pipeline PDF" — table de mapping avant tout code | Assertion Python : `len(mapping) == 16` et les 13 clés de régions admin sont présentes |
| Noms de caisses multi-lignes | Phase "Pipeline PDF" — normalisation des cellules | `' '.join(cell.split())` appliqué, test sur "Bourgogne-Franche-Comté" |
| Merged cells / lignes de total | Phase "Pipeline PDF" — filtrage des lignes None | Aucune valeur None dans les colonnes numériques du JSON de sortie |
| DOM-TOM variables selon édition | Phase "Pipeline PDF" — test multi-édition | Parser testé sur PDF 2023 et 2024 sans échec |
| SVG non responsive | Phase "Rendu SVG" — responsive day one | Carte correcte sur 375px et 1440px avant d'implémenter la coloration |
| Conflits CSS avec dashboard existant | Phase "Rendu SVG" — inspection DevTools | Aucune règle CSS existante n'affecte les `<path>` cartographiques |
| Outlier faussant l'échelle | Phase "Choropleth et légende" — après avoir les vraies données | Distribution des valeurs examinée, méthode d'interpolation choisie sur cette base |
| Palette inaccessible | Phase "Choropleth et légende" — test daltonien | Simulation Deuteranopia Chrome DevTools : différences de régions visibles |
| Hover inexistant sur mobile | Phase "Intégration dashboard" — events touch | Test sur vrai appareil : tap sur région → stats affichées |
| IDs SVG en conflit | Phase "Intégration dashboard" — injection SVG | `document.querySelectorAll('[id]')` dans la console : aucun doublon d'ID |

---

## Sources

- [CHSCT Audiovisuel — Liste des CARSAT et DREETS](https://chsctaudiovisuel.org/liste-des-carsat-et-direccte/) — MEDIUM confidence (liste des caisses par région vérifiée)
- [ESSPACE — Organisation territoriale CARSAT](https://esspace.fr/carsat-organisation-territoriale-regions-3/) — MEDIUM confidence (structure territoriale)
- [pdfplumber GitHub — Getting None values when extracting tables](https://github.com/jsvine/pdfplumber/discussions/719) — HIGH confidence (comportement documenté)
- [pdfplumber GitHub — Extract table row split across pages](https://github.com/jsvine/pdfplumber/discussions/768) — HIGH confidence (split rows connu)
- [Datawrapper Academy — What to consider when creating choropleth maps](https://academy.datawrapper.de/article/134-what-to-consider-when-creating-choropleth-maps) — HIGH confidence (meilleures pratiques cartographiques)
- [Datawrapper Blog — How to choose a color palette for choropleth maps](https://www.datawrapper.de/blog/how-to-choose-a-color-palette-for-choropleth-maps) — HIGH confidence (palettes ColorBrewer, accessibilité daltonisme)
- [Smashing Magazine — SVG Interaction with Pointer Events](https://www.smashingmagazine.com/2018/05/svg-interaction-pointer-events-property/) — HIGH confidence (pointer-events sur SVG)
- [CSS-Tricks — 6 Common SVG Fails](https://css-tricks.com/6-common-svg-fails-and-how-to-fix-them/) — HIGH confidence (conflits CSS SVG)
- [Mathisonian — Easy responsive SVGs with ViewBox](https://mathisonian.com/writing/easy-responsive-svgs-with-viewbox) — HIGH confidence (viewBox et responsive)
- [BrightCoding — pdfplumber precision PDF table extraction](https://www.blog.brightcoding.dev/2025/09/29/pdfplumber-the-ultimate-python-library-for-precision-pdf-table-and-text-extraction-with-visual-debugging/) — MEDIUM confidence (merged cells, multi-line rows)
- `.planning/codebase/ARCHITECTURE.md` — HIGH confidence (analyse directe du code existant)

---

*Pitfalls research for: SVG choropleth map + PDF table parsing — ajout à dashboard vanilla JS sinistralité France*
*Researched: 2026-02-28*

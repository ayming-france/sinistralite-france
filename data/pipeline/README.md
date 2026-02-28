# Pipeline de données
## Sinistralité France

Pipeline Python qui télécharge les données ameli.fr et génère les fichiers JSON consommés par le dashboard.

---

## Prérequis

- **Python 3.10+**
- Installer les dépendances :
  ```bash
  pip install -r requirements.txt
  ```
- **Facultatif :** fiches PDF par code NAF téléchargées manuellement depuis ameli.fr (nécessaires uniquement pour les données démographiques sexe/âge). Sans ces PDFs, le pipeline génère quand même les fichiers JSON avec les données AT/MP/Trajet.

---

## Lancer une mise à jour

Depuis le dossier `data/pipeline/` :

```bash
cd data/pipeline/
```

**Sans données démographiques (Excel uniquement) :**
```bash
python refresh_data.py
```

**Avec données démographiques (Excel + PDFs NAF) :**
```bash
python refresh_data.py --pdf-dir /chemin/vers/les/pdfs
```

Les fichiers JSON sont écrits dans `data/` (dossier parent de `pipeline/`).

---

## Fichiers produits

| Fichier | Contenu |
|---------|---------|
| `at-data.json` | Accidents du travail par secteur (NAF5, NAF4, NAF2) : taux de fréquence, taux de gravité, nombre de sinistres, journées perdues |
| `mp-data.json` | Maladies professionnelles par secteur : nouvelles maladies reconnues, taux pour 1 000 salariés |
| `trajet-data.json` | Accidents de trajet par secteur : sinistres en 1er règlement, nouvelles IP, décès |

---

## Fréquence de mise à jour

Les données ameli.fr sont publiées **annuellement** (dernière édition disponible : 2023).

Relancer le pipeline à chaque nouvelle publication des statistiques sur ameli.fr.

---

## Sources de données

### Fichiers Excel (téléchargés automatiquement)

- **AT (accidents du travail) 2023 :**
  `https://assurance-maladie.ameli.fr/sites/default/files/2023-stat-nationales-at-ctn-naf.xlsx`
- **AT 2021 (causes de risques) :**
  `https://assurance-maladie.ameli.fr/sites/default/files/2021-stat-nationales-at-ctn-naf.xlsx`
- **MP (maladies professionnelles) :**
  `https://assurance-maladie.ameli.fr/sites/default/files/stat-nationales-mp.xlsx`
- **Trajet :**
  `https://assurance-maladie.ameli.fr/sites/default/files/stat-nationales-trajet.xlsx`

### Fiches PDF par NAF (téléchargement manuel)

Disponibles sur ameli.fr dans la section "Statistiques par secteur d'activité".
Les fichiers doivent être nommés `NAF_XXXXX.pdf` (avec le code NAF5 complet).

---

## Parsing PDF seul

Pour parser uniquement les fiches PDF sans relancer tout le pipeline :

```bash
python parse_pdf.py --pdf-dir /chemin/vers/les/pdfs
```

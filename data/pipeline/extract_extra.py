#!/usr/bin/env python3
"""Extract the remaining fiche dimensions the main pipeline drops or never reads.

REUSED (via parse_pdf.parse_one_pdf), already reliable:
  sex, age, siege_lesions, activite_physique, modalite_blessure
NEW positional parsers (page 0 is multi-column; line text interleaves, so we parse
by word coordinates):
  mp_diseases  - "Principales maladies professionnelles" (code, libellé, nb, %, nb_prev)
  statut       - "Répartition des AT suivant le statut" (CDI / CDD / Intérimaire / ...)

Output: data/extra-dimensions.json keyed by NAF5.
"""
import pdfplumber, re, json, glob, os
import parse_pdf

PDF_DIR = "/Users/encarv/Desktop/Etude-BPO/pdfs_2024"
OUT = "/Users/encarv/projects/sinistralite/data/extra-dimensions.json"
CODE_RE = re.compile(r"^\d{3}[A-Z]$")
NUM_RE = re.compile(r"^[\d ]+$")
STATUTS = ["statut non connu", "CDI", "CDD", "Intérimaire", "Apprenti / élève",
           "Apprenti", "Intérim"]


def num(s):
    return int(s.replace(" ", "")) if s and s.replace(" ", "").isdigit() else None


def rows_by_y(words, tol=3.0):
    """Group words into visual rows by y-center."""
    ws = sorted(words, key=lambda w: ((w["top"] + w["bottom"]) / 2, w["x0"]))
    rows, cur, y = [], [], None
    for w in ws:
        yc = (w["top"] + w["bottom"]) / 2
        if y is None or abs(yc - y) <= tol:
            cur.append(w); y = yc if y is None else y
        else:
            rows.append(cur); cur = [w]; y = yc
    if cur:
        rows.append(cur)
    return rows


def parse_mp_diseases(page):
    """Right-column MP table. Anchor on the 'Code tableau ... Nb MP % Nb' header,
    then read rows: <code> <libellé...> <nb> <pct>% <nb_prev>."""
    words = page.extract_words()
    # header 'Code tableau ...' sits upper-right; anchor on the 'Code' token (leftmost col)
    code_hdr = [w for w in words if w["text"] == "Code" and w["x0"] > 300
                and any(x["text"] == "tableau" and abs(x["top"] - w["top"]) < 3 for x in words)]
    if not code_hdr:
        return []
    h = min(code_hdr, key=lambda w: w["top"])
    top_y, x_left = h["top"], h["x0"] - 5
    region = [w for w in words if w["x0"] > x_left and (w["top"] + w["bottom"]) / 2 > top_y + 5]
    out = []
    for row in rows_by_y(region):
        row = sorted(row, key=lambda w: w["x0"])
        toks = [w["text"] for w in row]
        # code row
        if toks and CODE_RE.match(toks[0]):
            code = toks[0]
            # find pct token
            pct_i = next((i for i, t in enumerate(toks) if re.fullmatch(r"\d+%", t)), None)
            if pct_i is None:
                continue
            pct = int(toks[pct_i].rstrip("%"))
            # nb = numeric tokens just before pct (may be space-split like '1 517')
            j = pct_i - 1
            nb_toks = []
            while j >= 1 and toks[j].isdigit():
                nb_toks.insert(0, toks[j]); j -= 1
            nb = num("".join(nb_toks))
            libelle = " ".join(toks[1:j + 1])
            prev_toks = [t for t in toks[pct_i + 1:] if t.isdigit()]
            nb_prev = num("".join(prev_toks)) if prev_toks else None
            out.append({"code": code, "libelle": libelle.strip(), "nb": nb,
                        "pct": pct, "nb_prev": nb_prev})
        elif toks[:2] == ["Autres", "MP"]:
            pct_i = next((i for i, t in enumerate(toks) if re.fullmatch(r"\d+%", t)), None)
            if pct_i is not None:
                nb = num("".join(t for t in toks[2:pct_i] if t.isdigit()))
                prev = [t for t in toks[pct_i + 1:] if t.isdigit()]
                out.append({"code": "AUTRES", "libelle": "Autres MP", "nb": nb,
                            "pct": int(toks[pct_i].rstrip("%")),
                            "nb_prev": num("".join(prev)) if prev else None})
    return out


def parse_statut(page):
    """AT by employment status. Each statut label has its % to its immediate left,
    in the statut sub-chart (right of the sex/age charts). Pick the nearest % token
    on the same row, to the left of the label, within ~40pt."""
    words = page.extract_words()
    # locate the heading to bound the y-region
    head = [w for w in words if w["text"] == "statut" and any(
        ww["text"] == "suivant" and abs(ww["top"] - w["top"]) < 3 for ww in words)]
    out = {}
    for label in ["statut non connu", "CDI", "CDD", "Intérimaire", "Apprenti / élève"]:
        parts = label.split()
        # find the row containing the (first token of the) label on the right side
        cand = [w for w in words if w["text"] == parts[-1] and w["x0"] > 430]
        for w in cand:
            yc = (w["top"] + w["bottom"]) / 2
            same = [x for x in words if abs((x["top"] + x["bottom"]) / 2 - yc) < 3
                    and re.fullmatch(r"\d+%", x["text"]) and x["x1"] <= w["x0"]
                    and w["x0"] - x["x1"] < 45]
            if same:
                nearest = max(same, key=lambda x: x["x1"])
                out[label] = int(nearest["text"].rstrip("%"))
                break
    return out


def parse_one(path):
    base = parse_pdf.parse_one_pdf(path) or {}
    with pdfplumber.open(path) as p:
        page = p.pages[0]
        mp = parse_mp_diseases(page)
    # NOTE: statut (AT by contract type) is NOT extracted here. Its % labels sit far
    # from their category labels and tangle with the sex/age charts; it needs a
    # vector-bar approach like extract_size.py. Deferred.
    return {
        "sex": base.get("sex") or {},
        "age": base.get("age") or {},
        "siege_lesions": base.get("siege_lesions") or {},
        "activite_physique": base.get("activite_physique") or {},
        "modalite_blessure": base.get("modalite_blessure") or {},
        "mp_diseases": mp,
    }


def main(test=None):
    files = sorted(glob.glob(os.path.join(PDF_DIR, "NAF_*.pdf")))
    if test:
        files = [f for f in files if os.path.basename(f)[4:-4] in test]
    res, cov = {}, {k: 0 for k in
                    ["sex", "age", "siege_lesions", "activite_physique",
                     "modalite_blessure", "mp_diseases"]}
    for f in files:
        naf = os.path.basename(f)[4:-4]
        try:
            r = parse_one(f)
        except Exception as e:
            if test:
                print(naf, "ERR", e)
            continue
        for k in cov:
            if r.get(k):
                cov[k] += 1
        res[naf] = r
        if test:
            print(f"\n=== {naf}")
            print("  mp_diseases:", r["mp_diseases"])
            print("  siege_lesions:", dict(list(r["siege_lesions"].items())[:4]))
    if not test:
        json.dump(res, open(OUT, "w"), ensure_ascii=False, indent=2)
    n = max(len(res), 1)
    print(f"\nsectors: {len(res)}")
    for k, v in cov.items():
        print(f"  {k}: {v} ({100*v/n:.0f}%)")
    if not test:
        print("output:", OUT)


if __name__ == "__main__":
    import sys
    main(test=sys.argv[1:] or None)

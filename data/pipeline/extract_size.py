#!/usr/bin/env python3
"""Extract the 'Répartition des AT et des effectifs salariés par taille d'établissement'
chart from Ameli NAF fiches by reading VECTOR geometry (not OCR).

Per NAF5, 6 establishment-size bands:
  ["- de 10","10 à 19","20 à 49","50 à 99","100 à 199","+ de 200"]
Two bar series per band:
  - GREEN  (0.8,1.0,0.8)   = part des accidents du travail (%)
  - PURPLE (0.502,0,0.502) = part des salariés (%)
The IF line is NOT read; it is derivable as IF_band = (part_acc/part_sal) * sector_IF.

Axes auto-scale per sector, so calibration is read from each chart's own % ticks.
Validation: green bars and purple bars should each sum to ~100% per sector.
"""
import pdfplumber, re, json, glob, os
from collections import Counter

PDF_DIR = "/Users/encarv/Desktop/Etude-BPO/pdfs_2024"
OUT = "/Users/encarv/projects/sinistralite/data/size-data.json"
BANDS = ["- de 10", "10 à 19", "20 à 49", "50 à 99", "100 à 199", "+ de 200"]
GREEN = (0.8, 1.0, 0.8)
PURPLE = (0.502, 0.0, 0.502)


def close(c, t, tol=0.04):
    if c is None or isinstance(c, (int, float)):
        return False
    try:
        return len(c) == 3 and all(abs(a - b) < tol for a, b in zip(c, t))
    except TypeError:
        return False


def colored_bars(page):
    out = {"green": {}, "purple": {}}
    for r in page.rects:
        if r["height"] < 0.5:
            continue
        col = r.get("non_stroking_color")
        key = "green" if close(col, GREEN) else "purple" if close(col, PURPLE) else None
        if not key:
            continue
        k = round(r["x0"])
        if k not in out[key] or r["height"] > out[key][k]["height"]:
            out[key][k] = r
    return list(out["green"].values()), list(out["purple"].values())


def baseline_of(bars):
    bottoms = [round(b["top"] + b["height"]) for b in bars]
    return Counter(bottoms).most_common(1)[0][0] if bottoms else None


def pct_scale(page, baseline):
    ticks = []
    for w in page.extract_words():
        if re.fullmatch(r"\d+%", w["text"]):
            yc = (w["top"] + w["bottom"]) / 2
            ticks.append((yc, w["x0"], float(w["text"].rstrip("%"))))
    zeros = [t for t in ticks if t[2] == 0 and abs(t[0] - baseline) <= 4]
    if not zeros:
        return None
    x0 = zeros[0][1]
    col = [t for t in ticks if abs(t[1] - x0) <= 6]
    if len(col) < 2:
        return None
    col.sort(key=lambda t: -t[2])
    ytop, _, ptop = col[0]
    scale = ptop / (baseline - ytop) if baseline - ytop else None
    return (scale, x0) if scale else None


FIXED_CENTERS = [348.0, 380.0, 412.0, 444.0, 477.0, 509.0]


def band_centers(page, baseline):
    """6 band-slot x-centers, anchored on the x-axis labels.
    Each band label ('X à Y salariés') places the word 'salariés' at its center."""
    xs = []
    for w in page.extract_words():
        yc = (w["top"] + w["bottom"]) / 2
        if w["text"] == "salariés" and baseline < yc < baseline + 28 and 300 < w["x0"] < 545:
            xs.append((w["x0"] + w["x1"]) / 2)
    xs = sorted(xs)
    return xs if len(xs) == 6 else FIXED_CENTERS


def parse_one(path):
    with pdfplumber.open(path) as p:
        page = p.pages[0]
        g, pu = colored_bars(page)
        baseline = baseline_of(g + pu)
        if baseline is None:
            return None
        sc = pct_scale(page, baseline)
        if sc is None:
            return None
        scale, left_x = sc
        keep_g = [b for b in g if abs((b["top"] + b["height"]) - baseline) <= 3]
        keep_p = [b for b in pu if abs((b["top"] + b["height"]) - baseline) <= 3]
        if not (keep_g or keep_p):
            return None
        centers = band_centers(page, baseline)

        def nearest(xc):
            return min(range(6), key=lambda i: abs(xc - centers[i]))

        acc_by = [0.0] * 6
        sal_by = [0.0] * 6
        for b in keep_g:
            i = nearest((b["x0"] + b["x1"]) / 2)
            acc_by[i] = max(acc_by[i], b["height"] * scale)
        for b in keep_p:
            i = nearest((b["x0"] + b["x1"]) / 2)
            sal_by[i] = max(sal_by[i], b["height"] * scale)
        out = [{"label": BANDS[i], "part_accidents": round(acc_by[i], 1),
                "part_salaries": round(sal_by[i], 1)} for i in range(6)]
        return {
            "bands": out,
            "_g": round(sum(r["part_accidents"] for r in out), 1),
            "_p": round(sum(r["part_salaries"] for r in out), 1),
            "_n": sum(1 for r in out if r["part_accidents"] or r["part_salaries"]),
        }


def main(test=None):
    files = sorted(glob.glob(os.path.join(PDF_DIR, "NAF_*.pdf")))
    if test:
        files = [f for f in files if os.path.basename(f)[4:-4] in test]
    result, gp, pp, fail = {}, 0, 0, 0
    for f in files:
        naf = os.path.basename(f)[4:-4]
        try:
            r = parse_one(f)
        except Exception:
            r = None
        if not r:
            fail += 1
            continue
        if abs(r["_g"] - 100) <= 5:
            gp += 1
        if abs(r["_p"] - 100) <= 5:
            pp += 1
        if test:
            print(f"{naf}: green_sum={r['_g']} purple_sum={r['_p']} nbands={r['_n']}")
            for b in r["bands"]:
                print(f"   {b['label']:<11} acc={b['part_accidents']:<6} sal={b['part_salaries']}")
        result[naf] = {"bands": r["bands"]}
    if not test:
        json.dump(result, open(OUT, "w"), ensure_ascii=False, indent=2)
    n = max(len(result), 1)
    print(f"\nextracted: {len(result)}/{len(files)} (fail={fail})")
    print(f"green sum~100 (+-5): {gp}/{n} ({100*gp/n:.1f}%)")
    print(f"purple sum~100 (+-5): {pp}/{n} ({100*pp/n:.1f}%)")
    if not test:
        print(f"output: {OUT}")


if __name__ == "__main__":
    import sys
    main(test=sys.argv[1:] or None)

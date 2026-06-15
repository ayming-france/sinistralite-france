#!/usr/bin/env python3
"""
extract_size_chart.py

Extract the "Répartition des accidents du travail et des effectifs salariés par
taille d'établissement" chart from Ameli NAF fiche PDFs by parsing the underlying
VECTOR GEOMETRY (rects, curves, glyph positions) with pdfplumber. No OCR, no pixels.

The chart is a grouped bar + line chart by establishment size, 6 bands left-to-right:
    ["- de 10", "10 à 19", "20 à 49", "50 à 99", "100 à 199", "+ de 200"]

Three series:
    - GREEN bars  (fill (0.8, 1.0, 0.8))    = "part des accidents du travail" (%)
    - PURPLE bars (fill (0.502, 0.0, 0.502)) = "part des salariés" (%)
    - RED line    (markers fill (0.753, 0.0, 0.0)) = IF (indice de fréquence),
                  read on a SEPARATE right axis.

CRITICAL: axes auto-scale per sector. We read each chart's own tick labels to
calibrate (no hardcoded scale). The chart sits on page 0, in the lower-right
quadrant. We constrain everything to the chart's top band (~680-792) and to the
known axis x-columns so we never mix in the other charts on the page (territory
choropleth, evolution charts) which carry their own % axes.

Geometry verified on NAF_4120A.pdf (page size 595.2 x 841.68, pdfplumber 'top'
grows downward):
    - left  % axis tick glyphs:  x0 ~ 310-328, text matches r'^\\d+%$'
    - right IF axis tick glyphs: x0 ~ 524-545, text matches r'^\\d+,0$'
    - both span top ~ 682 (high) to ~ 771 (baseline / 0)
    - bars: rects with the exact fills above, bottom on the 0%-baseline,
      x within the plot (~336-545); each bar is drawn twice -> dedupe.
    - IF markers: tiny curves (~2.7pt square) fill (0.753, 0.0, 0.0),
      one per band, also drawn twice -> dedupe.

Output: data/size-data.json keyed by NAF5.
"""

import os
import re
import glob
import json
import math
from collections import defaultdict

import pdfplumber

# ---------------------------------------------------------------------------
# Constants (chart layout on page 0; stable across the 729 fiches)
# ---------------------------------------------------------------------------

PDF_DIR = "/Users/encarv/Desktop/Etude-BPO/pdfs_2024"
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "size-data.json")

BAND_LABELS = ["- de 10", "10 à 19", "20 à 49", "50 à 99", "100 à 199", "+ de 200"]
N_BANDS = 6

# Vertical band of the size chart (pdfplumber 'top' coordinate, grows downward)
CHART_TOP_MIN = 678.0
CHART_TOP_MAX = 792.0

# Axis tick glyph x-columns
PCT_AXIS_X = (308.0, 329.0)   # left % axis labels
IF_AXIS_X = (523.0, 546.0)    # right IF axis labels

# Plot horizontal extent (between left and right axes) for bars/markers
PLOT_X_MIN = 332.0
PLOT_X_MAX = 522.0

# Target fills (sRGB 0-1)
GREEN = (0.8, 1.0, 0.8)
PURPLE = (0.502, 0.0, 0.502)
RED_MARKER = (0.753, 0.0, 0.0)
COLOR_TOL = 0.03

# IF marker geometry
MARKER_MAX_SIDE = 5.0   # markers are ~2.7pt squares; reject the long polyline

# How close a bar's bottom must be to the fitted baseline to count
BASELINE_TOL = 4.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _norm_color(c):
    """Normalise a pdfplumber color to an (r,g,b) tuple in 0-1, or None."""
    if c is None:
        return None
    if isinstance(c, (int, float)):
        v = float(c)
        return (v, v, v)
    try:
        if len(c) == 1:
            v = float(c[0])
            return (v, v, v)
        if len(c) == 3:
            return tuple(float(x) for x in c)
        if len(c) == 4:
            # CMYK -> RGB
            cc, m, y, k = (float(x) for x in c)
            return (
                (1 - cc) * (1 - k),
                (1 - m) * (1 - k),
                (1 - y) * (1 - k),
            )
    except (TypeError, ValueError):
        return None
    return None


def _color_is(c, target, tol=COLOR_TOL):
    n = _norm_color(c)
    if n is None or len(n) != 3:
        return False
    return all(abs(a - b) <= tol for a, b in zip(n, target))


def _linfit(pairs):
    """Least-squares fit y = a*x + b for list of (x, y). Returns (a, b)."""
    n = len(pairs)
    sx = sum(x for x, _ in pairs)
    sy = sum(y for _, y in pairs)
    sxx = sum(x * x for x, _ in pairs)
    sxy = sum(x * y for x, _ in pairs)
    denom = n * sxx - sx * sx
    if abs(denom) < 1e-9:
        return None
    a = (n * sxy - sx * sy) / denom
    b = (sy - a * sx) / n
    return a, b


def _read_axis_ticks(page, pattern, x_range):
    """Reconstruct axis tick labels by grouping glyphs into text rows.

    Each tick label ('70%', '10,0', ...) is drawn as separate single-char glyphs
    sharing the same 'top'. We group chars in the axis x-column by rounded 'top',
    join left-to-right, and match the expected pattern.

    Returns list of (y_center_top, value) sorted by y.
    """
    xlo, xhi = x_range
    rows = defaultdict(list)
    for ch in page.chars:
        if xlo <= ch["x0"] <= xhi and CHART_TOP_MIN <= ch["top"] <= CHART_TOP_MAX:
            rows[round(ch["top"])].append((ch["x0"], ch["text"]))
    ticks = []
    for top_key, frags in rows.items():
        text = "".join(t for _, t in sorted(frags))
        m = pattern.match(text)
        if m:
            value = float(m.group(1).replace(",", "."))
            # y center of the row: average top of the glyphs
            ys = [c.get("top", top_key) for c in page.chars
                  if round(c["top"]) == top_key and xlo <= c["x0"] <= xhi]
            ys = []
            for ch in page.chars:
                if round(ch["top"]) == top_key and xlo <= ch["x0"] <= xhi:
                    ys.append((ch["top"] + ch["bottom"]) / 2.0)
            yc = sum(ys) / len(ys) if ys else float(top_key)
            ticks.append((yc, value))
    ticks.sort(key=lambda t: t[0])
    return ticks


def _cluster_to_bands(items):
    """Cluster items (each a dict with 'xc') into 6 band columns left-to-right.

    Returns a list of 6 lists (some possibly empty) ordered left-to-right.
    Uses simple sorted-gap splitting; robust because the 6 columns are well
    separated (~32pt apart) and within-column x is near-identical.
    """
    if not items:
        return [[] for _ in range(N_BANDS)]
    items = sorted(items, key=lambda d: d["xc"])
    xs = [d["xc"] for d in items]
    # Build clusters by splitting on gaps larger than half the typical spacing.
    span = xs[-1] - xs[0]
    min_gap = max(8.0, span / (N_BANDS * 2)) if span > 0 else 8.0
    clusters = [[items[0]]]
    for prev, cur in zip(items, items[1:]):
        if cur["xc"] - prev["xc"] > min_gap:
            clusters.append([cur])
        else:
            clusters[-1].append(cur)
    return clusters


def _assign_bands(items, n_expected=N_BANDS):
    """Map clustered items to the 6 ordered bands.

    If we get exactly 6 clusters, map 1:1. Otherwise, assign each item to the
    nearest of 6 evenly-inferred column centers spanning the observed x-range.
    Returns dict band_index -> representative item (max-height / first).
    """
    clusters = _cluster_to_bands(items)
    result = {}
    if len(clusters) == n_expected:
        for i, cl in enumerate(clusters):
            result[i] = cl
        return result
    # Fallback: infer 6 column centers from the full plot x-range and snap.
    if not items:
        return result
    xs = sorted(d["xc"] for d in items)
    x0, x1 = xs[0], xs[-1]
    if x1 - x0 < 1:
        # all in one column; cannot resolve -> dump in band 0
        result[0] = items
        return result
    centers = [x0 + (x1 - x0) * i / (n_expected - 1) for i in range(n_expected)]
    buckets = defaultdict(list)
    for it in items:
        bi = min(range(n_expected), key=lambda i: abs(it["xc"] - centers[i]))
        buckets[bi].append(it)
    return dict(buckets)


# ---------------------------------------------------------------------------
# Core extraction
# ---------------------------------------------------------------------------

def parse_one(pdf_path):
    """Parse the size chart from one PDF. Returns a dict:

        {
          "bands": [
            {"label": "- de 10", "part_accidents": N|None,
             "part_salaries": N|None, "if": N|None},
            ... 6 entries ...
          ],
          "_diag": {... calibration / pass info ...}
        }
    """
    pct_pat = re.compile(r"^(\d+)%$")
    if_pat = re.compile(r"^(\d+),0$")

    bands = [
        {"label": lab, "part_accidents": None, "part_salaries": None, "if": None}
        for lab in BAND_LABELS
    ]
    diag = {"pct_ticks": 0, "if_ticks": 0, "green_sum": None,
            "purple_sum": None, "error": None}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            page = pdf.pages[0]

            # --- 1. Calibrate the % (left) axis -------------------------------
            pct_ticks = _read_axis_ticks(page, pct_pat, PCT_AXIS_X)
            diag["pct_ticks"] = len(pct_ticks)
            pct_fit = _linfit(pct_ticks) if len(pct_ticks) >= 2 else None
            # pct_fit maps y_center -> percent. baseline_y is where percent == 0.
            if pct_fit:
                pa, pb = pct_fit
                # %-per-point of bar height = |slope| (percent change per top unit)
                pct_per_pt = abs(pa)
                # baseline y where percent == 0
                baseline_y = (0 - pb) / pa if abs(pa) > 1e-9 else None
            else:
                pct_per_pt = None
                baseline_y = None

            # --- 2. Calibrate the IF (right) axis -----------------------------
            if_ticks = _read_axis_ticks(page, if_pat, IF_AXIS_X)
            diag["if_ticks"] = len(if_ticks)
            if_fit = _linfit(if_ticks) if len(if_ticks) >= 2 else None  # y -> IF

            # --- 3. Collect bars ----------------------------------------------
            # baseline for bars: use fitted baseline_y if available, else the
            # most common bar bottom.
            green_raw, purple_raw = [], []
            for r in page.rects:
                x0 = r["x0"]
                if not (PLOT_X_MIN <= x0 <= PLOT_X_MAX):
                    continue
                if not (CHART_TOP_MIN <= r["top"] <= CHART_TOP_MAX):
                    continue
                fc = r.get("non_stroking_color")
                if _color_is(fc, GREEN):
                    green_raw.append(r)
                elif _color_is(fc, PURPLE):
                    purple_raw.append(r)

            # Determine baseline from bar bottoms if axis fit missing.
            all_bottoms = [r["bottom"] for r in green_raw + purple_raw]
            if baseline_y is None and all_bottoms:
                baseline_y = max(all_bottoms)  # bars grow up from 0-line

            def _bars_to_items(raws):
                # keep bars whose bottom is at the baseline; dedupe by rounded x0
                # keeping max height.
                by_x = {}
                for r in raws:
                    if baseline_y is not None and abs(r["bottom"] - baseline_y) > BASELINE_TOL:
                        continue
                    key = round(r["x0"], 1)
                    h = r["height"]
                    if key not in by_x or h > by_x[key]["h"]:
                        by_x[key] = {"xc": (r["x0"] + r["x1"]) / 2.0, "h": h}
                return list(by_x.values())

            green_items = _bars_to_items(green_raw)
            purple_items = _bars_to_items(purple_raw)

            def _fill_series(items, field):
                if pct_per_pt is None:
                    return
                band_map = _assign_bands(items)
                for bi, cl in band_map.items():
                    if bi >= N_BANDS or not cl:
                        continue
                    h = max(d["h"] for d in cl)
                    bands[bi][field] = round(h * pct_per_pt, 1)

            _fill_series(green_items, "part_accidents")
            _fill_series(purple_items, "part_salaries")

            # --- 4. Collect IF markers ----------------------------------------
            marker_items = []
            seen = set()
            for cv in page.curves:
                if not (PLOT_X_MIN <= cv["x0"] <= PLOT_X_MAX):
                    continue
                if not (CHART_TOP_MIN <= cv["top"] <= CHART_TOP_MAX):
                    continue
                # reject the connecting polyline (wide); keep small markers
                if cv["width"] > MARKER_MAX_SIDE or cv["height"] > MARKER_MAX_SIDE:
                    continue
                fc = cv.get("non_stroking_color")
                sc = cv.get("stroking_color")
                if not (_color_is(fc, RED_MARKER, 0.06) or _color_is(sc, RED_MARKER, 0.06)):
                    continue
                xc = (cv["x0"] + cv["x1"]) / 2.0
                yc = (cv["top"] + cv["bottom"]) / 2.0
                key = (round(xc, 0), round(yc, 0))
                if key in seen:
                    continue
                seen.add(key)
                marker_items.append({"xc": xc, "yc": yc})

            if if_fit and marker_items:
                ia, ib = if_fit
                band_map = _assign_bands(marker_items)
                for bi, cl in band_map.items():
                    if bi >= N_BANDS or not cl:
                        continue
                    # one marker per band; if several, take the one nearest the
                    # column center (use median y)
                    ys = sorted(d["yc"] for d in cl)
                    yc = ys[len(ys) // 2]
                    bands[bi]["if"] = round(ia * yc + ib, 1)

            # --- 5. Diagnostics ----------------------------------------------
            gvals = [b["part_accidents"] for b in bands if b["part_accidents"] is not None]
            pvals = [b["part_salaries"] for b in bands if b["part_salaries"] is not None]
            diag["green_sum"] = round(sum(gvals), 1) if gvals else None
            diag["purple_sum"] = round(sum(pvals), 1) if pvals else None

    except Exception as exc:  # noqa: BLE001
        diag["error"] = f"{type(exc).__name__}: {exc}"

    return {"bands": bands, "_diag": diag}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _naf_from_path(path):
    base = os.path.basename(path)
    m = re.match(r"NAF_([0-9A-Z]+)\.pdf$", base)
    return m.group(1) if m else None


def main():
    paths = sorted(glob.glob(os.path.join(PDF_DIR, "NAF_*.pdf")))
    results = {}
    diags = {}
    for path in paths:
        naf = _naf_from_path(path)
        if not naf:
            continue
        parsed = parse_one(path)
        diag = parsed.pop("_diag")
        results[naf] = parsed
        diags[naf] = diag

    out_path = os.path.abspath(OUT_PATH)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=2)

    # ---- Validation report ----
    total = len(results)

    def sum_ok(val):
        return val is not None and abs(val - 100.0) <= 5.0

    green_ok = sum(1 for d in diags.values() if sum_ok(d["green_sum"]))
    purple_ok = sum(1 for d in diags.values() if sum_ok(d["purple_sum"]))
    errors = {n: d["error"] for n, d in diags.items() if d["error"]}
    no_pct = [n for n, d in diags.items() if d["pct_ticks"] < 2]
    no_if = [n for n, d in diags.items() if d["if_ticks"] < 2]

    print(f"Total sectors extracted: {total}")
    print(f"GREEN sum-to-100 (±5):  {green_ok}/{total} = {green_ok/total*100:.1f}%")
    print(f"PURPLE sum-to-100 (±5): {purple_ok}/{total} = {purple_ok/total*100:.1f}%")
    print(f"Sectors with <2 % ticks (no calibration): {len(no_pct)}")
    print(f"Sectors with <2 IF ticks: {len(no_if)}")
    if errors:
        print(f"Sectors with errors: {len(errors)}")
        for n, e in list(errors.items())[:10]:
            print(f"   {n}: {e}")

    # worst green/purple offenders
    def worst(field):
        rows = [(n, d[field]) for n, d in diags.items()
                if d[field] is not None and not sum_ok(d[field])]
        rows.sort(key=lambda r: abs(r[1] - 100))
        return rows[-10:]

    gw = worst("green_sum")
    if gw:
        print("\nWorst GREEN sums:", [(n, v) for n, v in gw])
    pw = worst("purple_sum")
    if pw:
        print("Worst PURPLE sums:", [(n, v) for n, v in pw])

    # ---- Print sample extractions ----
    for naf in ["4120A", "0111Z", "1071A", "8610Z"]:
        if naf in results:
            print(f"\n=== NAF {naf} (green_sum={diags[naf]['green_sum']}, "
                  f"purple_sum={diags[naf]['purple_sum']}) ===")
            for b in results[naf]["bands"]:
                print(f"  {b['label']:>10}  acc={b['part_accidents']}  "
                      f"sal={b['part_salaries']}  if={b['if']}")

    print(f"\nOutput written to: {out_path}")
    return results, diags


if __name__ == "__main__":
    main()

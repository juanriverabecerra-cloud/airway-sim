#!/usr/bin/env python3
"""
Standalone regression check (no pytest dependency — this repo has no Python test
infrastructure; vitest is the only test runner, see package.json). Run directly:

    python3 src/knowledge/extractor/test_vector_crop_collision.py

Catches the 2026-06 bug where two distinct figure captions on the same page (an ECG
strip and an unrelated lead-placement diagram) resolved to byte-identical crops because
the embedded-image matching independently let each caption claim its "nearest" image
without checking whether another caption had already claimed it. Asserts against the
real Chapter 36 source PDF, since that's the fixture that originally exposed the bug.
"""
import hashlib
import json
import os
import subprocess
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PDF_PATH = os.path.join(REPO_ROOT, 'src', 'airway_ingest', 'source_material',
                         'Millers_Anaesthesia_9th_Edition_Chapter_36.pdf')
PARSER_PATH = os.path.join(os.path.dirname(__file__), 'local_parser.py')


def md5_of(path):
    with open(path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def main():
    if not os.path.exists(PDF_PATH):
        print(f"SKIP: fixture PDF not found at {PDF_PATH}")
        return 0

    result = subprocess.run(
        [sys.executable, PARSER_PATH, PDF_PATH],
        capture_output=True, text=True, timeout=180
    )
    if result.returncode != 0:
        print(f"FAIL: local_parser.py exited {result.returncode}: {result.stderr}")
        return 1

    data = json.loads(result.stdout)
    vde = data.get('visual_data_engines', [])
    by_id = {v['id']: v for v in vde}

    failures = []

    fig1 = by_id.get('FIG_36_1')
    fig2 = by_id.get('FIG_36_2')
    if not fig1 or not fig2:
        failures.append(f"Expected FIG_36_1 and FIG_36_2 in output, got ids: {sorted(by_id)[:10]}...")
    else:
        path1, path2 = fig1.get('image_path'), fig2.get('image_path')
        if not (path1 and os.path.exists(path1) and path2 and os.path.exists(path2)):
            failures.append(f"Missing cropped image file(s): {path1}, {path2}")
        elif md5_of(path1) == md5_of(path2):
            failures.append(
                "FIG_36_1 and FIG_36_2 cropped to byte-identical images — the "
                "caption-to-image greedy assignment regressed (see local_parser.py's "
                "all_candidate_pairs/assigned_image_for_caption logic)."
            )

    # Global check: no two figures anywhere in this chapter should share a crop —
    # a stronger, page-agnostic version of the same invariant.
    hashes = {}
    for v in vde:
        p = v.get('image_path')
        if p and os.path.exists(p):
            h = md5_of(p)
            hashes.setdefault(h, []).append(v['id'])
    dup_groups = {h: ids for h, ids in hashes.items() if len(ids) > 1}
    if dup_groups:
        failures.append(f"Duplicate-image groups found across Chapter 36: {dup_groups}")

    if failures:
        print("FAIL:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(f"PASS: {len(vde)} figures extracted, FIG_36_1/FIG_36_2 distinct, no duplicate-image groups.")
    return 0


if __name__ == '__main__':
    sys.exit(main())

# Ingestion Report — what the rebuilt parser found per chapter

Generated against 72 chapter file(s) in `src/parsed texts/`.

Every row was previously 0 tables / 0 figures before the parser fix (the old pipeline
extracted plain text only) — so every nonzero number below is genuinely new structured
data this chapter did not have before. Review `git diff -- "src/parsed texts/<file>.json"`
for the full content; this table is the index for deciding which chapters to look at first.

| Chapter | Tables | Figures | …w/ real arrow geometry | …w/ pixel-estimated relationships | …no relationships | Total edges | Warnings |
|---|---|---|---|---|---|---|---|
| 9 | 0 | 5 | 0 | 2 | 3 | 148 | 1 |
| 10 | 8 | 13 | 0 | 1 | 12 | 14 | 3 |
| 11 | 3 | 22 | 0 | 0 | 22 | 0 | 8 |
| 12 | 0 | 11 | 0 | 1 | 10 | 176 | 4 |
| 13 | 4 | 27 | 0 | 8 | 19 | 102 | 9 |
| 14 | 3 | 19 | 2 | 0 | 17 | 2 | 3 |
| 15 | 2 | 6 | 0 | 2 | 4 | 36 | 1 |
| 16 | 5 | 7 | 0 | 1 | 6 | 24 | 2 |
| 17 | 6 | 23 | 0 | 8 | 15 | 4228 | 7 |
| 18 | 4 | 39 | 0 | 0 | 39 | 0 | 7 |
| 19 | 0 | 12 | 0 | 3 | 9 | 90 | 5 |
| 20 | 7 | 21 | 0 | 0 | 21 | 0 | 7 |
| 21 | 3 | 25 | 0 | 1 | 24 | 140 | 12 |
| 22 | 11 | 60 | 0 | 7 | 53 | 294 | 7 |
| 23 | 11 | 23 | 3 | 0 | 20 | 5 | 7 |
| 24 | 13 | 31 | 1 | 4 | 26 | 97 | 17 |
| 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 26 | 7 | 34 | 3 | 1 | 30 | 5 | 10 |
| 27 | 13 | 15 | 0 | 0 | 15 | 0 | 6 |
| 28 | 9 | 24 | 1 | 2 | 21 | 5 | 8 |
| 29 | 10 | 9 | 0 | 1 | 8 | 4 | 2 |
| 30 | 14 | 7 | 0 | 0 | 7 | 0 | 3 |
| 31 | 19 | 8 | 0 | 0 | 8 | 0 | 3 |
| 32 | 13 | 7 | 0 | 0 | 7 | 0 | 4 |
| 33 | 1 | 2 | 0 | 1 | 1 | 12 | 0 |
| 34 | 3 | 23 | 0 | 1 | 22 | 62 | 2 |
| 35 | 0 | 5 | 0 | 0 | 5 | 0 | 2 |
| 36 | 13 | 51 | 0 | 4 | 47 | 120 | 6 |
| 37 | 4 | 32 | 0 | 18 | 14 | 3378 | 1 |
| 38 | 5 | 4 | 0 | 0 | 4 | 0 | 3 |
| 39 | 6 | 25 | 0 | 0 | 25 | 0 | 4 |
| 40 | 1 | 12 | 0 | 1 | 11 | 60 | 3 |
| 41 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| 42 | 1 | 5 | 0 | 0 | 5 | 0 | 1 |
| 43 | 2 | 20 | 0 | 3 | 17 | 142 | 6 |
| 44 | 1 | 33 | 0 | 10 | 23 | 132 | 1 |
| 45 | 7 | 11 | 0 | 5 | 6 | 282 | 2 |
| 46 | 3 | 39 | 1 | 23 | 15 | 995 | 2 |
| 47 | 12 | 6 | 0 | 0 | 6 | 0 | 2 |
| 48 | 4 | 11 | 0 | 0 | 11 | 0 | 4 |
| 49 | 17 | 13 | 0 | 1 | 12 | 16 | 6 |
| 50 | 5 | 5 | 0 | 2 | 3 | 46 | 1 |
| 51 | 1 | 3 | 0 | 0 | 3 | 0 | 0 |
| 53 | 13 | 58 | 0 | 13 | 45 | 1988 | 6 |
| 54 | 19 | 60 | 1 | 14 | 45 | 2353 | 6 |
| 55 | 0 | 8 | 0 | 0 | 8 | 0 | 4 |
| 56 | 7 | 20 | 1 | 12 | 7 | 1872 | 4 |
| 57 | 8 | 22 | 0 | 7 | 15 | 448 | 4 |
| 58 | 5 | 4 | 0 | 0 | 4 | 0 | 0 |
| 59 | 11 | 5 | 0 | 1 | 4 | 6 | 1 |
| 60 | 3 | 12 | 2 | 0 | 10 | 12 | 3 |
| 61 | 3 | 4 | 0 | 2 | 2 | 758 | 0 |
| 62 | 3 | 5 | 0 | 2 | 3 | 210 | 1 |
| 63 | 7 | 13 | 1 | 2 | 10 | 311 | 2 |
| 64 | 8 | 11 | 0 | 2 | 9 | 42 | 2 |
| 65 | 3 | 5 | 0 | 0 | 5 | 0 | 0 |
| 66 | 5 | 14 | 2 | 1 | 11 | 23 | 3 |
| 69 | 2 | 3 | 0 | 0 | 3 | 0 | 0 |
| 70 | 1 | 15 | 0 | 5 | 10 | 98 | 3 |
| 71 | 1 | 13 | 0 | 10 | 3 | 482 | 0 |
| 76 | 7 | 62 | 0 | 46 | 16 | 2080 | 1 |
| 77 | 8 | 16 | 0 | 3 | 13 | 14 | 6 |
| 78 | 13 | 16 | 1 | 4 | 11 | 121 | 3 |
| 79 | 11 | 8 | 0 | 0 | 8 | 0 | 1 |
| 80 | 5 | 3 | 0 | 0 | 3 | 0 | 0 |
| 81 | 7 | 2 | 0 | 0 | 2 | 0 | 1 |
| 82 | 3 | 3 | 0 | 0 | 3 | 0 | 0 |
| 83 | 3 | 2 | 0 | 1 | 1 | 6 | 0 |
| 84 | 9 | 8 | 0 | 1 | 7 | 12 | 2 |
| 85 | 4 | 10 | 0 | 4 | 6 | 30 | 3 |
| 86 | 0 | 13 | 0 | 5 | 8 | 2240 | 7 |
| 87 | 2 | 5 | 0 | 2 | 3 | 138 | 0 |

**Totals: 422 tables, 1168 figures, 247 warnings across 72 chapters.**

Suggested review order: chapters with the highest table/figure counts and zero warnings
are the highest-confidence new content. Chapters with many warnings are where dense
chemical-structure or illustration figures caused relationship tracing to be skipped —
worth a manual look if that chapter is pharmacology/receptor-heavy.
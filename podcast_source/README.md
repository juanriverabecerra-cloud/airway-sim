# Podcast Source

Clean, podcast-ready Markdown extracted from the simulator's already-parsed chapters.
Each file here is a single chapter you can paste straight into an AI to generate a podcast.

Nothing here re-parses a PDF — it reuses the parse output the ingestion pipeline already
produced in `src/parsed texts/`, so builds are instant and need no API keys.

## Retrieve / build a chapter

```bash
npm run podcast -- list            # which chapters can I build?
npm run podcast -- 13              # Miller's Ch.13  -> millers_chapter_13.md
npm run podcast -- millers 13      # same, explicit book
npm run podcast -- jaffe 7         # Jaffe Ch.7      -> jaffe_chapter_7.md
npm run podcast -- millers all     # every Miller's chapter
npm run podcast -- all             # every chapter of every book
```

The command prints the exact file it wrote. "Retrieving" a chapter = opening that file
(e.g. `podcast_source/millers_chapter_13.md`). [`INDEX.md`](INDEX.md) is an auto-maintained
list of everything built so far.

## Flags

| Flag | Effect |
| --- | --- |
| `--force` | rebuild even if the `.md` is newer than its source JSON |
| `--no-tables` | drop the figure data-table appendix (keeps a caption list) |
| `--show-source` | print the real book/edition in the visible title (default: comment only) |
| `--out <dir>` | write somewhere other than `podcast_source/` |

## What's in each file

1. A **Production Brief** — editable instructions for the podcast-generating AI (format,
   length, do/don't). Edit it before pasting, or leave the defaults.
2. **Chapter Content** — the chapter prose, with detected section headings, cleaned of
   page headers, form-feeds, and mangled list-marker glyphs.
3. **Reference Figures & Data Tables** — figure captions plus any machine-read data tables,
   for concrete numbers and examples.

## Notes & limitations

- Text comes from PDF extraction, so expect some residual noise: syllable-break hyphens at
  line ends (`pul-\nmonary`) and occasional garbled equation glyphs (`˙VA/˙Q`). An LLM reads
  through these fine — they're intentionally left rather than risk mangling real compound
  terms like `ventilation-perfusion`.
- A few chapters were scanned image-only PDFs and extracted no text; those build to a short
  stub that says so (they need OCR re-ingestion first).
- By default the source book/edition is **not** printed in the visible title — only in an
  HTML comment — matching the repo's no-book-branding rule. Use `--show-source` if you want
  it visible in a personal, non-shipping export.

Generated files (`*_chapter_*.md`, `INDEX.md`) are git-ignored; this README is tracked.
The builder itself is [`scripts/build_podcast_md.mjs`](../scripts/build_podcast_md.mjs).

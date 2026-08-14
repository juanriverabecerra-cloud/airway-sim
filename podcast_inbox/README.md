# Podcast Inbox — drop PDFs here

Put a chapter PDF in this folder and run one command:

```bash
npm run podcastify
```

It chains everything automatically for each PDF:

```
(split if multi-chapter)  ->  ingest (parse to JSON)  ->  build podcast markdown
```

…and the finished file lands in [`../podcast_source/`](../podcast_source/) (e.g.
`millers_chapter_52.md`), ready to paste into a podcast-generating AI. Processed PDFs are
moved to `podcast_inbox/done/` so re-running won't reprocess them.

Preview first without changing anything:

```bash
npm run podcastify -- --dry-run
```

## Two cases

**1. A single-chapter PDF — zero extra input.**
Name it per the convention and just drop it:

- `Millers_Anaesthesia_9th_Edition_Chapter_52.pdf`
- `Jaffe_AMSP_6th_Edition_Chapter_12.pdf`

**2. A multi-chapter PDF — add a tiny recipe.**
Drop the PDF plus a sibling text file `<same-name>.recipe.txt` telling it where the
chapters break (page numbers are 1-based, inclusive):

```
# my_book.recipe.txt   (next to my_book.pdf)
book = jaffe
3 = 138-186
4 = 187-264
```

Not sure of the page numbers? Find them first:

```bash
npm run split-pdf -- podcast_inbox/my_book.pdf --list --scan jaffe
```

`book =` may be `millers` or `jaffe` (the books the podcast builder knows). For any other
book, use `prefix = Your_Book_Prefix_Chapter_` instead — the chapter number and `.pdf` are
appended to it.

## Notes

- The figure-vision phase is **off** by default (it's slow and API-billed, and the podcast
  build doesn't use it). Add `--vision` to `npm run podcastify` if you want it.
- Ingesting also updates the simulator's knowledge database (`medical_truth.db` /
  `precomputed_index.json`) — expected, since it's the same pipeline the app uses.
- Dropped PDFs are git-ignored; this README is tracked.

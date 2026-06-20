import fs from 'fs';
import path from 'path';

const parsedTextsDir = path.resolve(import.meta.dirname, '../src/parsed texts');
const files = fs.readdirSync(parsedTextsDir).filter(f => f.endsWith('.json'));

function chapterNumber(filename) {
  const m = filename.match(/Chapter_(\d+)/i);
  return m ? parseInt(m[1], 10) : 9999;
}

const rows = [];

for (const file of files.sort((a, b) => chapterNumber(a) - chapterNumber(b))) {
  const full = path.join(parsedTextsDir, file);
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(full, 'utf-8'));
  } catch {
    rows.push({ file, error: 'Failed to parse JSON' });
    continue;
  }

  const engines = doc.visual_data_engines || [];
  const tables = engines.filter(e => e.id?.startsWith('TBL_'));
  const figures = engines.filter(e => !e.id?.startsWith('TBL_'));
  const vectorVerifiedFigures = figures.filter(f =>
    (f.details?.source_target_vectors || []).some(v => v.status === 'vector_geometry_verified')
  );
  const pixelVerifiedFigures = figures.filter(f =>
    (f.details?.source_target_vectors || []).some(v => v.status === 'locally_verified')
  );
  const plainFigures = figures.length - vectorVerifiedFigures.length - pixelVerifiedFigures.length;
  const totalEdges = figures.reduce((sum, f) => sum + (f.details?.source_target_vectors || []).length, 0);
  const warnings = doc.parse_metadata?.warnings || [];

  rows.push({
    file,
    chapter: chapterNumber(file),
    totalChars: doc.parse_metadata?.total_characters_extracted ?? 0,
    pages: doc.fragments?.length ?? 0,
    tables: tables.length,
    figures: figures.length,
    vectorVerifiedFigures: vectorVerifiedFigures.length,
    pixelVerifiedFigures: pixelVerifiedFigures.length,
    plainFigures,
    totalEdges,
    warnings: warnings.length
  });
}

const lines = [];
lines.push('# Ingestion Report — what the rebuilt parser found per chapter');
lines.push('');
lines.push(`Generated against ${rows.length} chapter file(s) in \`src/parsed texts/\`.`);
lines.push('');
lines.push('Every row was previously 0 tables / 0 figures before the parser fix (the old pipeline');
lines.push('extracted plain text only) — so every nonzero number below is genuinely new structured');
lines.push('data this chapter did not have before. Review `git diff -- "src/parsed texts/<file>.json"`');
lines.push('for the full content; this table is the index for deciding which chapters to look at first.');
lines.push('');
lines.push('| Chapter | Tables | Figures | …w/ real arrow geometry | …w/ pixel-estimated relationships | …no relationships | Total edges | Warnings |');
lines.push('|---|---|---|---|---|---|---|---|');

for (const r of rows) {
  if (r.error) {
    lines.push(`| ${r.file} | ERROR: ${r.error} | | | | | | |`);
    continue;
  }
  lines.push(
    `| ${r.chapter} | ${r.tables} | ${r.figures} | ${r.vectorVerifiedFigures} | ${r.pixelVerifiedFigures} | ${r.plainFigures} | ${r.totalEdges} | ${r.warnings} |`
  );
}

lines.push('');
const totalTables = rows.reduce((s, r) => s + (r.tables || 0), 0);
const totalFigures = rows.reduce((s, r) => s + (r.figures || 0), 0);
const totalWarnings = rows.reduce((s, r) => s + (r.warnings || 0), 0);
lines.push(`**Totals: ${totalTables} tables, ${totalFigures} figures, ${totalWarnings} warnings across ${rows.length} chapters.**`);
lines.push('');
lines.push('Suggested review order: chapters with the highest table/figure counts and zero warnings');
lines.push('are the highest-confidence new content. Chapters with many warnings are where dense');
lines.push('chemical-structure or illustration figures caused relationship tracing to be skipped —');
lines.push('worth a manual look if that chapter is pharmacology/receptor-heavy.');

const outPath = path.resolve(import.meta.dirname, '../ingestion_report.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
console.log(`Wrote report to ${outPath}`);
console.log(`Totals: ${totalTables} tables, ${totalFigures} figures, ${totalWarnings} warnings.`);

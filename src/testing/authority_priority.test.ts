import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClientDbBridge } from '../knowledge/ClientDbBridge.ts';
import { parseTextbookMetadata, getPriorityRank } from '../knowledge/utils/priority_resolver.ts';
import { KnowledgeStore } from '../knowledge/store.ts';

describe('Textbook Ingestion Authority Priority Hierarchy Tests', () => {
  
  beforeEach(async () => {
    // Ensure the DB bridge is initialized (Node loads sql.js memory database)
    await ClientDbBridge.init();
    await KnowledgeStore.init();
    
    // Clear out any old state before each test
    const db = KnowledgeStore.getDb();
    db.run('DELETE FROM textbook_prose');
    db.run('DELETE FROM physiological_matrices');
  });

  afterEach(() => {
    // Clear state
    const db = KnowledgeStore.getDb();
    db.run('DELETE FROM textbook_prose');
    db.run('DELETE FROM physiological_matrices');
  });

  it('should parse textbook metadata and edition numbers correctly', () => {
    const meta1 = parseTextbookMetadata("Millers_Anaesthesia_9th_Edition_9_10.pdf");
    expect(meta1.isMiller).toBe(true);
    expect(meta1.edition).toBe(9);
    expect(meta1.title).toContain("Millers_Anaesthesia");

    const meta2 = parseTextbookMetadata("Barash_Clinical_Anesthesia_8th_Edition.pdf");
    expect(meta2.isMiller).toBe(false);
    expect(meta2.edition).toBe(8);
  });

  it('should calculate priority rank correctly (Millers = 1000 + ed, others = 100 + ed)', () => {
    expect(getPriorityRank("Millers_Anaesthesia_9th_Edition_9_10.pdf")).toBe(1009);
    expect(getPriorityRank("Millers_Anaesthesia_8th_Edition.pdf")).toBe(1008);
    expect(getPriorityRank("Barash_Clinical_Anesthesia_8th_Edition.pdf")).toBe(108);
    expect(getPriorityRank("Morgan_Mikhail_Clinical_Anesthesiology_6th_Edition.pdf")).toBe(106);
  });

  it('should preserve all versions of data, set is_authoritative = 1 on the highest rank, and keep others at 0', async () => {
    // Ingest the same clinical topic from three different textbooks with different priorities
    
    // 1. Ingest from Barash 8th Edition (priority_rank = 108)
    KnowledgeStore.insertProse(
      "PROSE_BARASH_01",
      "MyocordinHemodynamics",
      "Barash statement: Myocordin is safe.",
      "Barash_Clinical_Anesthesia_8th_Edition.pdf",
      8,
      108
    );

    // 2. Ingest from Miller 8th Edition (priority_rank = 1008)
    KnowledgeStore.insertProse(
      "PROSE_MILLER_8_01",
      "MyocordinHemodynamics",
      "Miller 8th statement: Myocordin causes minor bradycardia.",
      "Millers_Anaesthesia_8th_Edition.pdf",
      8,
      1008
    );

    // 3. Ingest from Miller 9th Edition (priority_rank = 1009 - highest)
    KnowledgeStore.insertProse(
      "PROSE_MILLER_9_01",
      "MyocordinHemodynamics",
      "Miller 9th statement: Myocordin causes severe muscarinic bradycardia.",
      "Millers_Anaesthesia_9th_Edition_9_10.pdf",
      9,
      1009
    );

    // Run authority recalculations
    KnowledgeStore.recalculateAuthority();

    // Re-sync ClientDbBridge caches synchronously inside Vitest/Node
    // ClientDbBridge has a private syncNodeCaches, which we can trigger by calling its getter methods
    const allProse = ClientDbBridge.getAllProse();
    const authoritativeProse = ClientDbBridge.getAuthoritativeProse();

    // Assertions:
    // A. All three records must be preserved in the database (provenance preservation)
    expect(allProse.length).toBe(3);

    // B. The record from Miller 9th Edition must be flagged as authoritative (is_authoritative = 1)
    const authoritative = authoritativeProse.find(p => p.section_heading === "MyocordinHemodynamics");
    expect(authoritative).toBeDefined();
    expect(authoritative!.id).toBe("PROSE_MILLER_9_01");
    expect(authoritative!.body_text).toContain("Miller 9th statement");
    expect(authoritative!.is_authoritative).toBe(1);

    // C. The non-authoritative rows must be inspectable (is_authoritative = 0)
    const barashRecord = allProse.find(p => p.id === "PROSE_BARASH_01");
    expect(barashRecord).toBeDefined();
    expect(barashRecord!.is_authoritative).toBe(0);
    expect(barashRecord!.body_text).toContain("Barash statement");

    const miller8Record = allProse.find(p => p.id === "PROSE_MILLER_8_01");
    expect(miller8Record).toBeDefined();
    expect(miller8Record!.is_authoritative).toBe(0);
    expect(miller8Record!.body_text).toContain("Miller 8th statement");
  });
});

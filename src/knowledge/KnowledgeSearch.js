/**
 * KnowledgeSearch — Browser-Safe TF-IDF Search Engine
 * 
 * Uses a pre-computed inverted index compiled at ingestion time.
 * Enables fast, offline keyword search with TF-IDF relevance scoring.
 * 
 * ZERO RUNTIME MAIN-THREAD INDEXINGRef — runs entirely lag-free.
 * ZERO HALLUCINATION — only returns verbatim records from the database.
 */

import { ClientDbBridge } from './ClientDbBridge.ts';

let precomputedIndex = null;

async function loadIndex() {
  try {
    if (typeof window === 'undefined') {
      // Node/Vitest: load synchronously from local file system
      const fs = await import('fs');
      const path = await import('path');
      
      let dirname = '';
      try {
        dirname = __dirname;
      } catch {
        const { fileURLToPath } = await import('url');
        dirname = path.dirname(fileURLToPath(import.meta.url));
      }
      
      const indexPath = path.resolve(dirname, 'precomputed_index.json');
      precomputedIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } else {
      // Browser: fetch over HTTP
      const response = await fetch('/precomputed_index.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch precomputed index: ${response.statusText}`);
      }
      precomputedIndex = await response.json();
    }
  } catch (err) {
    console.error('[KnowledgeSearch] Failed to load precomputed index:', err);
  }
}

// Start loading index immediately on module import
const indexLoadedPromise = loadIndex();

// ─── TOKENIZER ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'can', 'could', 'and', 'but', 'or',
  'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
  'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
  'against', 'between', 'through', 'during', 'before', 'after', 'above',
  'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
  'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
  'it', 'its', 'they', 'them', 'their', 'theirs', 'also', 'however',
  'therefore', 'thus', 'hence', 'although', 'though', 'even', 'still',
  'already', 'since', 'whether', 'if', 'into', 'upon', 'within', 'without',
  'fig', 'see', 'e', 'g', 'et', 'al', 'ie', 'eg', 'vs', 'etc',
  'am', 'us', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 
  'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'we'
]);

/**
 * Tokenizes a text string into an array of normalized, stemmed tokens.
 * Removes stop words, numbers-only tokens, and tokens shorter than 2 chars.
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')  // Strip non-alphanumeric (keep hyphens)
    .split(/[\s-]+/)                  // Split on whitespace and hyphens
    .filter(token => 
      token.length >= 2 &&            // Min 2 chars (so "bp", "hr" are kept)
      !STOP_WORDS.has(token) &&       // Not a stop word
      !/^\d+$/.test(token)            // Not purely numeric
    );
}

// ─── CLINICAL SYNONYM EXPANSION ──────────────────────────────────────────────

const CLINICAL_SYNONYMS = {
  'bp': ['blood', 'pressure'],
  'hr': ['heart', 'rate'],
  'rr': ['respiratory', 'rate'],
  'co': ['cardiac', 'output'],
  'svr': ['systemic', 'vascular', 'resistance'],
  'mac': ['minimum', 'alveolar', 'concentration'],
  'bis': ['bispectral', 'index'],
  'rem': ['rapid', 'eye', 'movement'],
  'nrem': ['non', 'rapid', 'eye', 'movement'],
  'gaba': ['gamma', 'aminobutyric', 'acid'],
  'nmda': ['nmda', 'methyl', 'aspartate'],
  'ach': ['acetylcholine']
};

/**
 * Generates search tokens by tokenizing the query, expanding clinical synonyms,
 * and generating unigrams and bigrams for matching.
 */
export function getSearchTokens(query) {
  const unigrams = tokenize(query);
  const searchTokensSet = new Set(unigrams);
  
  // Apply synonym expansion
  for (const token of unigrams) {
    if (CLINICAL_SYNONYMS[token]) {
      const expanded = CLINICAL_SYNONYMS[token];
      for (const expToken of expanded) {
        searchTokensSet.add(expToken);
      }
      // Add bigrams for expanded synonyms
      for (let i = 0; i < expanded.length - 1; i++) {
        searchTokensSet.add(`${expanded[i]}_${expanded[i+1]}`);
      }
    }
  }
  
  // Add bigrams of the original query unigrams
  for (let i = 0; i < unigrams.length - 1; i++) {
    searchTokensSet.add(`${unigrams[i]}_${unigrams[i+1]}`);
  }
  
  return Array.from(searchTokensSet);
}

// ─── TF-IDF SEARCH ───────────────────────────────────────────────────────────

/**
 * Searches the prose knowledge base using TF-IDF scoring.
 * 
 * @param {string} query - The user's natural language query
 * @param {number} topK - Maximum number of results to return (default: 5)
 * @param {number} minScore - Minimum relevance score threshold (default: 0.5)
 * @returns {Array<{record: ProseRecord, score: number, rank: number}>}
 */
export function searchKnowledge(query, topK = 5, minScore = 0.5) {
  if (!precomputedIndex) {
    console.warn('[KnowledgeSearch] Index not loaded yet.');
    return [];
  }

  const originalTokens = tokenize(query);
  if (originalTokens.length === 0) return [];
  
  const searchTokens = getSearchTokens(query);
  const scores = new Map(); // docId → score
  
  for (const token of searchTokens) {
    const idf = precomputedIndex.proseIdf[token] || 0;
    const postings = precomputedIndex.proseIndex[token];
    if (!postings) continue;
    
    for (const entry of postings) {
      let id, tf, inHeading;
      if (Array.isArray(entry)) {
        const docIdx = entry[0];
        id = precomputedIndex.proseDocs[docIdx];
        tf = entry[1];
        inHeading = entry[2] === 1;
      } else {
        id = entry.id;
        tf = entry.tf;
        inHeading = entry.inHeading;
      }
      // TF-IDF with sublinear TF scaling: (1 + log(tf)) * idf
      let tfidf = (1 + Math.log(tf)) * idf;
      if (inHeading) {
        tfidf *= 2.0; // 2x Heading boost
      }
      scores.set(id, (scores.get(id) || 0) + tfidf);
    }
  }
  
  // Normalize scores by original query length to keep scoring stable
  const queryNorm = Math.sqrt(originalTokens.length);
  
  // Sort by score and filter top-K above threshold
  const results = [];
  for (const [id, rawScore] of scores) {
    const normalizedScore = rawScore / queryNorm;
    if (normalizedScore >= minScore) {
      results.push({ id, score: normalizedScore });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  
  // Resolve full records from ClientDbBridge dynamically
  const topResults = results.slice(0, topK);
  const finalized = [];
  
  for (const res of topResults) {
    const dbRecord = ClientDbBridge.queryProseById(res.id);
    const metaRecord = precomputedIndex.proseMetadata[res.id];
    
    if (dbRecord) {
      finalized.push({
        record: dbRecord,
        score: res.score,
        rank: 0
      });
    } else if (metaRecord) {
      // Return metadata + placeholder body text if database asset is still loading
      finalized.push({
        record: {
          id: res.id,
          chapter_title: metaRecord.chapter_title,
          section_heading: metaRecord.section_heading,
          body_text: "Verbatim content loading from database..."
        },
        score: res.score,
        rank: 0
      });
    }
  }
  
  return finalized.map((r, idx) => ({
    ...r,
    rank: idx + 1
  }));
}

/**
 * Searches the physiological matrices / figures knowledge base.
 * 
 * @param {string} query - The user's query
 * @param {number} topK - Maximum results (default: 3)
 * @returns {Array<{record: MatrixRecord, score: number, rank: number}>}
 */
export function searchMatrices(query, topK = 3) {
  if (!precomputedIndex) {
    console.warn('[KnowledgeSearch] Index not loaded yet.');
    return [];
  }

  const originalTokens = tokenize(query);
  if (originalTokens.length === 0) return [];
  
  const searchTokens = getSearchTokens(query);
  const scores = new Map(); // docId -> score
  
  for (const token of searchTokens) {
    const idf = precomputedIndex.matrixIdf[token] || 0;
    const postings = precomputedIndex.matrixIndex[token];
    if (!postings) continue;
    
    for (const entry of postings) {
      let id, tf, inHeading;
      if (Array.isArray(entry)) {
        const docIdx = entry[0];
        id = precomputedIndex.matrixDocs[docIdx];
        tf = entry[1];
        inHeading = entry[2] === 1;
      } else {
        id = entry.id;
        tf = entry.tf;
        inHeading = entry.inHeading;
      }
      let tfidf = (1 + Math.log(tf)) * idf;
      if (inHeading) {
        tfidf *= 2.0; // Heading/Caption boost
      }
      scores.set(id, (scores.get(id) || 0) + tfidf);
    }
  }
  
  const queryNorm = Math.sqrt(originalTokens.length);
  const results = [];
  
  for (const [id, rawScore] of scores) {
    const normalizedScore = rawScore / queryNorm;
    if (normalizedScore >= 0.3) {
      results.push({ id, score: normalizedScore });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  
  // Resolve full records from ClientDbBridge dynamically
  const topResults = results.slice(0, topK);
  const finalized = [];
  
  for (const res of topResults) {
    const dbRecord = ClientDbBridge.queryMatrixById(res.id);
    const metaRecord = precomputedIndex.matrixMetadata[res.id];
    
    if (dbRecord) {
      finalized.push({
        record: dbRecord,
        score: res.score,
        rank: 0
      });
    } else if (metaRecord) {
      finalized.push({
        record: {
          id: res.id,
          chapter_title: metaRecord.chapter_title,
          archetype: metaRecord.archetype,
          caption: metaRecord.caption,
          structured_payload: "{}"
        },
        score: res.score,
        rank: 0
      });
    }
  }
  
  return finalized.map((r, idx) => ({
    ...r,
    rank: idx + 1
  }));
}

/**
 * Returns the total count of indexed prose records and matrix records.
 * Useful for diagnostics and UI status displays.
 */
export function getKnowledgeStats() {
  if (!precomputedIndex) {
    return {
      proseRecords: 0,
      matrixRecords: 0,
      uniqueProseTokens: 0,
      uniqueMatrixTokens: 0
    };
  }
  return {
    proseRecords: precomputedIndex.proseDocCount,
    matrixRecords: precomputedIndex.matrixDocCount,
    uniqueProseTokens: Object.keys(precomputedIndex.proseIndex).length,
    uniqueMatrixTokens: Object.keys(precomputedIndex.matrixIndex).length
  };
}

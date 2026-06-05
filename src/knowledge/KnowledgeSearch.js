/**
 * KnowledgeSearch — Browser-Safe TF-IDF Search Engine
 * 
 * Builds an inverted index over the medical_truth_snapshot at import time.
 * Enables fast, offline keyword search with TF-IDF relevance scoring.
 * 
 * ZERO EXTERNAL DEPENDENCIES — runs entirely in the browser.
 * ZERO HALLUCINATION — only returns verbatim records from the ingested knowledge base.
 */

import { textbookProse, physiologicalMatrices } from './medical_truth_snapshot.ts';

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
  'fig', 'see', 'e', 'g', 'et', 'al', 'ie', 'eg', 'vs', 'etc'
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
      token.length >= 3 &&            // Min 3 chars
      !STOP_WORDS.has(token) &&       // Not a stop word
      !/^\d+$/.test(token)            // Not purely numeric
    );
}

// ─── INVERTED INDEX ──────────────────────────────────────────────────────────

/**
 * Inverted index entry: maps token → array of { docIdx, tf }
 * where tf = term frequency in that document
 */
const proseIndex = new Map();   // token → [{ docIdx, tf }]
const matrixIndex = new Map();  // token → [{ docIdx, tf }]

// Document frequency counts (for IDF calculation)
const proseDocCount = textbookProse.length;
const matrixDocCount = physiologicalMatrices.length;

// Pre-computed document token arrays (for TF lookup)
const proseTokenCounts = [];    // docIdx → Map<token, count>
const matrixTokenCounts = [];

/**
 * Builds the inverted index for a given corpus.
 */
function buildIndex(corpus, textExtractor, index, tokenCountsArray) {
  for (let docIdx = 0; docIdx < corpus.length; docIdx++) {
    const text = textExtractor(corpus[docIdx]);
    const tokens = tokenize(text);
    
    // Count term frequencies for this document
    const tfMap = new Map();
    for (const token of tokens) {
      tfMap.set(token, (tfMap.get(token) || 0) + 1);
    }
    tokenCountsArray.push(tfMap);
    
    // Add to inverted index
    for (const [token, count] of tfMap) {
      if (!index.has(token)) {
        index.set(token, []);
      }
      index.get(token).push({ docIdx, tf: count });
    }
  }
}

// Build prose index (combine heading + body for richer matching)
buildIndex(
  textbookProse,
  (record) => `${record.section_heading} ${record.body_text}`,
  proseIndex,
  proseTokenCounts
);

// Build matrix index (combine caption + archetype + payload text)
buildIndex(
  physiologicalMatrices,
  (record) => `${record.caption} ${record.archetype} ${record.structured_payload}`,
  matrixIndex,
  matrixTokenCounts
);

// ─── TF-IDF SEARCH ───────────────────────────────────────────────────────────

/**
 * Computes IDF (Inverse Document Frequency) for a token.
 * IDF = log(N / (1 + df)) where df = number of documents containing the token
 */
function computeIDF(token, index, totalDocs) {
  const postings = index.get(token);
  if (!postings) return 0;
  const df = postings.length;
  return Math.log((totalDocs + 1) / (1 + df));
}

/**
 * Searches the prose knowledge base using TF-IDF scoring.
 * 
 * @param {string} query - The user's natural language query
 * @param {number} topK - Maximum number of results to return (default: 5)
 * @param {number} minScore - Minimum relevance score threshold (default: 0.5)
 * @returns {Array<{record: ProseRecord, score: number, rank: number}>}
 */
export function searchKnowledge(query, topK = 5, minScore = 0.5) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  
  // Score each document
  const scores = new Map(); // docIdx → score
  
  for (const token of queryTokens) {
    const idf = computeIDF(token, proseIndex, proseDocCount);
    const postings = proseIndex.get(token);
    if (!postings) continue;
    
    for (const { docIdx, tf } of postings) {
      // TF-IDF with sublinear TF scaling: (1 + log(tf)) * idf
      const tfidf = (1 + Math.log(tf)) * idf;
      scores.set(docIdx, (scores.get(docIdx) || 0) + tfidf);
    }
  }
  
  // Normalize scores by query length to prevent long queries from inflating scores
  const queryNorm = Math.sqrt(queryTokens.length);
  
  // Sort by score and return top-K above threshold
  const results = [];
  for (const [docIdx, rawScore] of scores) {
    const normalizedScore = rawScore / queryNorm;
    if (normalizedScore >= minScore) {
      results.push({
        record: textbookProse[docIdx],
        score: normalizedScore,
        rank: 0
      });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, topK).map((r, idx) => ({
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
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  
  const scores = new Map();
  
  for (const token of queryTokens) {
    const idf = computeIDF(token, matrixIndex, matrixDocCount);
    const postings = matrixIndex.get(token);
    if (!postings) continue;
    
    for (const { docIdx, tf } of postings) {
      const tfidf = (1 + Math.log(tf)) * idf;
      scores.set(docIdx, (scores.get(docIdx) || 0) + tfidf);
    }
  }
  
  const queryNorm = Math.sqrt(queryTokens.length);
  const results = [];
  
  for (const [docIdx, rawScore] of scores) {
    const normalizedScore = rawScore / queryNorm;
    if (normalizedScore >= 0.3) {
      results.push({
        record: physiologicalMatrices[docIdx],
        score: normalizedScore,
        rank: 0
      });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, topK).map((r, idx) => ({
    ...r,
    rank: idx + 1
  }));
}

/**
 * Returns the total count of indexed prose records and matrix records.
 * Useful for diagnostics and UI status displays.
 */
export function getKnowledgeStats() {
  return {
    proseRecords: textbookProse.length,
    matrixRecords: physiologicalMatrices.length,
    uniqueProseTokens: proseIndex.size,
    uniqueMatrixTokens: matrixIndex.size
  };
}

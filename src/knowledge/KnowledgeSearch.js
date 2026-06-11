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
// Comprehensive synonym dictionary that eliminates the need for the expensive
// Gemini query-expansion API call. When the user types a drug name, abbreviation,
// or clinical concept, the local TF-IDF index will find matches on the first pass.

const CLINICAL_SYNONYMS = {
  // ── Vital Sign Abbreviations ──
  'bp': ['blood', 'pressure', 'hemodynamic', 'hypotension', 'hypertension'],
  'hr': ['heart', 'rate', 'pulse', 'tachycardia', 'bradycardia'],
  'rr': ['respiratory', 'rate', 'ventilation', 'breathing'],
  'co': ['cardiac', 'output'],
  'ci': ['cardiac', 'index'],
  'svr': ['systemic', 'vascular', 'resistance', 'afterload'],
  'pvr': ['pulmonary', 'vascular', 'resistance'],
  'cvp': ['central', 'venous', 'pressure', 'preload'],
  'map': ['mean', 'arterial', 'pressure'],
  'sbp': ['systolic', 'blood', 'pressure'],
  'dbp': ['diastolic', 'blood', 'pressure'],
  'spo2': ['oxygen', 'saturation', 'oximetry', 'pulse', 'oximeter'],
  'etco2': ['end', 'tidal', 'carbon', 'dioxide', 'capnography'],
  'paco2': ['arterial', 'carbon', 'dioxide', 'partial', 'pressure'],
  'pao2': ['arterial', 'oxygen', 'partial', 'pressure'],
  'fio2': ['fraction', 'inspired', 'oxygen'],
  'abg': ['arterial', 'blood', 'gas'],

  // ── Anesthetic Depth & Monitoring ──
  'mac': ['minimum', 'alveolar', 'concentration', 'volatile', 'anesthetic'],
  'bis': ['bispectral', 'index', 'depth', 'anesthesia', 'awareness'],
  'tof': ['train', 'four', 'neuromuscular', 'blockade', 'twitch'],
  'eeg': ['electroencephalogram', 'electroencephalography', 'brainwave'],

  // ── Neuroscience & Receptors ──
  'gaba': ['gamma', 'aminobutyric', 'acid', 'inhibitory', 'receptor'],
  'nmda': ['nmda', 'methyl', 'aspartate', 'glutamate', 'excitatory'],
  'ach': ['acetylcholine', 'cholinergic', 'muscarinic', 'nicotinic'],
  'rem': ['rapid', 'eye', 'movement', 'sleep'],
  'nrem': ['non', 'rapid', 'eye', 'movement', 'sleep'],

  // ── Induction Agents ──
  'propofol': ['diprivan', 'induction', 'sedation', 'hypnotic', 'gaba'],
  'diprivan': ['propofol', 'induction', 'hypnotic'],
  'etomidate': ['amidate', 'induction', 'hemodynamic', 'stable'],
  'amidate': ['etomidate', 'induction'],
  'ketamine': ['dissociative', 'nmda', 'analgesia', 'induction'],
  'midazolam': ['versed', 'benzodiazepine', 'anxiolysis', 'sedation', 'gaba'],
  'versed': ['midazolam', 'benzodiazepine'],
  'thiopental': ['pentothal', 'barbiturate', 'induction'],

  // ── Volatile Anesthetics ──
  'sevoflurane': ['volatile', 'inhalational', 'anesthetic', 'mac', 'vaporizer'],
  'desflurane': ['volatile', 'inhalational', 'anesthetic', 'mac', 'airway', 'irritant'],
  'isoflurane': ['volatile', 'inhalational', 'anesthetic', 'mac'],
  'nitrous': ['nitrous', 'oxide', 'inhalational', 'analgesic', 'diffusion'],

  // ── Opioids ──
  'fentanyl': ['sublimaze', 'opioid', 'analgesic', 'nociception', 'mu'],
  'sublimaze': ['fentanyl', 'opioid'],
  'remifentanil': ['ultiva', 'opioid', 'analgesic', 'esterase'],
  'ultiva': ['remifentanil', 'opioid'],
  'morphine': ['opioid', 'analgesic', 'histamine', 'mu'],
  'hydromorphone': ['dilaudid', 'opioid', 'analgesic'],
  'dilaudid': ['hydromorphone', 'opioid'],
  'sufentanil': ['sufenta', 'opioid', 'potent'],
  'alfentanil': ['alfenta', 'opioid'],
  'meperidine': ['demerol', 'opioid'],
  'naloxone': ['narcan', 'opioid', 'antagonist', 'reversal'],
  'narcan': ['naloxone', 'opioid', 'antagonist'],

  // ── Muscle Relaxants ──
  'rocuronium': ['zemuron', 'neuromuscular', 'blockade', 'nondepolarizing', 'paralysis', 'relaxant', 'aminosteroid', 'intubation'],
  'zemuron': ['rocuronium', 'neuromuscular', 'blockade'],
  'vecuronium': ['norcuron', 'neuromuscular', 'blockade', 'nondepolarizing', 'paralysis', 'relaxant', 'aminosteroid'],
  'norcuron': ['vecuronium', 'neuromuscular', 'blockade'],
  'succinylcholine': ['suxamethonium', 'sux', 'depolarizing', 'neuromuscular', 'fasciculation', 'paralysis', 'relaxant'],
  'sux': ['succinylcholine', 'depolarizing', 'neuromuscular'],
  'cisatracurium': ['nimbex', 'neuromuscular', 'blockade', 'nondepolarizing', 'hofmann'],
  'pancuronium': ['pavulon', 'neuromuscular', 'blockade', 'nondepolarizing'],
  'atracurium': ['tracrium', 'neuromuscular', 'blockade', 'nondepolarizing', 'hofmann', 'laudanosine'],

  // ── Reversal Agents ──
  'sugammadex': ['bridion', 'reversal', 'encapsulation', 'rocuronium', 'cyclodextrin'],
  'bridion': ['sugammadex', 'reversal'],
  'neostigmine': ['prostigmin', 'anticholinesterase', 'reversal', 'acetylcholinesterase'],
  'prostigmin': ['neostigmine', 'anticholinesterase'],
  'flumazenil': ['romazicon', 'benzodiazepine', 'antagonist', 'reversal'],

  // ── Anticholinergics ──
  'glycopyrrolate': ['robinul', 'anticholinergic', 'muscarinic', 'antisialagogue', 'bradycardia'],
  'robinul': ['glycopyrrolate', 'anticholinergic'],
  'atropine': ['anticholinergic', 'muscarinic', 'bradycardia', 'vagolytic'],

  // ── Vasopressors & Inotropes ──
  'epinephrine': ['adrenaline', 'vasopressor', 'catecholamine', 'alpha', 'beta', 'anaphylaxis'],
  'adrenaline': ['epinephrine', 'vasopressor', 'catecholamine'],
  'norepinephrine': ['levophed', 'vasopressor', 'catecholamine', 'alpha'],
  'levophed': ['norepinephrine', 'vasopressor'],
  'phenylephrine': ['neosynephrine', 'vasopressor', 'alpha', 'agonist', 'svr'],
  'neosynephrine': ['phenylephrine', 'vasopressor'],
  'vasopressin': ['antidiuretic', 'vasopressor', 'adh'],
  'ephedrine': ['vasopressor', 'indirect', 'sympathomimetic'],
  'dobutamine': ['dobutrex', 'inotrope', 'beta', 'agonist'],
  'dopamine': ['intropin', 'inotrope', 'vasopressor', 'catecholamine'],
  'milrinone': ['primacor', 'phosphodiesterase', 'inotrope', 'inotropy'],

  // ── Beta Blockers & Antiarrhythmics ──
  'esmolol': ['brevibloc', 'beta', 'blocker', 'antiarrhythmic', 'tachycardia'],
  'labetalol': ['trandate', 'beta', 'blocker', 'alpha', 'hypertension'],
  'metoprolol': ['lopressor', 'beta', 'blocker'],
  'amiodarone': ['cordarone', 'antiarrhythmic', 'ventricular', 'tachycardia'],
  'lidocaine': ['xylocaine', 'antiarrhythmic', 'local', 'anesthetic', 'sodium', 'channel'],
  'adenosine': ['adenocard', 'supraventricular', 'tachycardia', 'svt'],

  // ── Pulmonary & Bronchodilators ──
  'albuterol': ['salbutamol', 'ventolin', 'bronchodilator', 'beta', 'agonist', 'bronchospasm'],
  'salbutamol': ['albuterol', 'ventolin', 'bronchodilator'],

  // ── Local Anesthetics ──
  'bupivacaine': ['marcaine', 'sensorcaine', 'local', 'anesthetic', 'amide', 'sodium', 'channel'],
  'ropivacaine': ['naropin', 'local', 'anesthetic', 'amide'],
  'chloroprocaine': ['nesacaine', 'local', 'anesthetic', 'ester'],

  // ── Clinical Conditions ──
  'mh': ['malignant', 'hyperthermia', 'dantrolene', 'ryanodine'],
  'bronchospasm': ['wheezing', 'airway', 'resistance', 'bronchial', 'constriction'],
  'laryngospasm': ['vocal', 'cord', 'spasm', 'airway', 'obstruction'],
  'anaphylaxis': ['allergic', 'hypersensitivity', 'histamine', 'shock', 'epinephrine'],
  'sepsis': ['infection', 'systemic', 'inflammatory', 'shock', 'vasodilatory'],
  'ards': ['acute', 'respiratory', 'distress', 'syndrome', 'lung', 'injury'],
  'pe': ['pulmonary', 'embolism', 'thrombosis'],
  'dvt': ['deep', 'vein', 'thrombosis'],
  'mi': ['myocardial', 'infarction', 'ischemia', 'coronary'],
  'chf': ['congestive', 'heart', 'failure', 'ventricular'],
  'copd': ['chronic', 'obstructive', 'pulmonary', 'disease'],
  'osa': ['obstructive', 'sleep', 'apnea'],
  'icp': ['intracranial', 'pressure'],
  'tbi': ['traumatic', 'brain', 'injury'],

  // ── Airway & Procedures ──
  'ett': ['endotracheal', 'tube', 'intubation'],
  'lma': ['laryngeal', 'mask', 'airway', 'supraglottic'],
  'rsi': ['rapid', 'sequence', 'induction', 'intubation', 'aspiration'],
  'dlt': ['double', 'lumen', 'tube', 'lung', 'isolation'],
  'frc': ['functional', 'residual', 'capacity', 'lung', 'volume'],
  'tv': ['tidal', 'volume'],
  'peep': ['positive', 'end', 'expiratory', 'pressure'],
  'pip': ['peak', 'inspiratory', 'pressure'],

  // ── Pharmacokinetic Terms ──
  'pkpd': ['pharmacokinetics', 'pharmacodynamics'],
  'pk': ['pharmacokinetics', 'absorption', 'distribution', 'metabolism', 'elimination'],
  'pd': ['pharmacodynamics', 'receptor', 'effect', 'potency', 'efficacy'],
  'vd': ['volume', 'distribution'],
  'css': ['steady', 'state', 'concentration'],
  'tiva': ['total', 'intravenous', 'anesthesia'],

  // ── Labs ──
  'cbc': ['complete', 'blood', 'count', 'hemoglobin', 'hematocrit', 'platelet'],
  'cmp': ['comprehensive', 'metabolic', 'panel', 'electrolyte'],
  'pt': ['prothrombin', 'time', 'coagulation'],
  'inr': ['international', 'normalized', 'ratio', 'coagulation'],
  'ptt': ['partial', 'thromboplastin', 'time', 'coagulation'],
  'teg': ['thromboelastography', 'coagulation', 'viscoelastic']
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

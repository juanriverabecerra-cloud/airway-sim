/* eslint-disable react-hooks/refs */
import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, ChevronRight, ChevronDown, ChevronUp, X, 
  HelpCircle, Shield, Award, Clock, ArrowRight, BookOpen, Shuffle, Target, Sparkles
} from 'lucide-react';
import { parseAndRenderText } from '../../engine/ClinicalActions';
import { getAttendingResponse, resetConversationHistory, verifyResponseGrounding } from '../../engine/ClinicalAiChat';
import { getKnowledgeStats, searchKnowledge, searchMatrices } from '../../knowledge/KnowledgeSearch';
import { boardQuestions } from '../../knowledge/BoardQuestions';

function parsePartialQuestions(jsonStr) {
  const arrayStartIdx = jsonStr.indexOf('"questions":');
  if (arrayStartIdx === -1) return [];
  
  const startBracketIdx = jsonStr.indexOf('[', arrayStartIdx);
  if (startBracketIdx === -1) return [];
  
  const questions = [];
  let braceCount = 0;
  let objectStartIdx = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startBracketIdx + 1; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) {
      continue;
    }
    
    if (char === '{') {
      if (braceCount === 0) {
        objectStartIdx = i;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && objectStartIdx !== -1) {
        const objectStr = jsonStr.substring(objectStartIdx, i + 1);
        try {
          const parsedObj = JSON.parse(objectStr);
          if (parsedObj.vignette && parsedObj.options && Array.isArray(parsedObj.options) && parsedObj.options.length >= 4) {
            questions.push(parsedObj);
          }
        } catch (err) {
          // ignore parsing error for incomplete objects
        }
      }
    }
  }
  
  return questions;
}

/**
 * Extracts a clean chapter label from the raw PDF filename stored in chapter_title.
 * e.g. "Millers_Anaesthesia_9th_Edition_Chapter_31.pdf" → "Ch.31"
 */
function extractChapterLabel(chapterTitle) {
  if (!chapterTitle || typeof chapterTitle !== 'string') return 'Ch.?';
  const match = chapterTitle.match(/Chapter_(\d+)/i);
  return match ? `Ch.${match[1]}` : 'Ch.?';
}

/**
 * Gemini API routing layer.
 * - In production (Netlify): routes through /.netlify/functions/gemini-proxy
 *   so the API key stays server-side and is never exposed in the browser bundle.
 * - In development (localhost): calls the Gemini API directly using the local .env key.
 */
const IS_PRODUCTION = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

/**
 * Extracts details from Netlify proxy/Gemini API error responses.
 */
async function handleFetchError(response) {
  let errorMsg = `HTTP ${response.status} ${response.statusText}`;
  try {
    const errJson = await response.json();
    if (errJson && errJson.details) {
      try {
        const detailObj = JSON.parse(errJson.details);
        if (detailObj.error?.message) {
          errorMsg = detailObj.error.message;
        } else {
          errorMsg = errJson.details;
        }
      } catch {
        errorMsg = errJson.details;
      }
    } else if (errJson && errJson.error) {
      errorMsg = errJson.error;
    }
  } catch (e) {
    // Body is not JSON or couldn't be parsed
  }
  return new Error(errorMsg);
}

function geminiApiFetch({ streaming = false, apiKey = '', model = 'gemini-3.5-flash', body }) {
  if (IS_PRODUCTION) {
    // Production: proxy through Netlify function redirect
    return fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streaming, model, ...body })
    });
  } else {
    // Development: direct API call with local .env key
    const endpoint = streaming
      ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
      : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
}

async function queryGeminiAI(query, sources, apiKey, onChunk) {
  // Truncate source body text to cap input tokens — full pages are wasteful
  const MAX_SOURCE_CHARS = 2000;
  const sourcesText = sources.map((src, idx) => {
    const chapterLabel = extractChapterLabel(src.record.chapter_title);
    const bodyText = src.record.body_text || '';
    const truncatedBody = bodyText.length > MAX_SOURCE_CHARS
      ? bodyText.slice(0, MAX_SOURCE_CHARS) + ' [… truncated]'
      : bodyText;
    return `[Source ${idx + 1}] Section: ${src.record.section_heading || 'General'}\nChapter: Miller's Anesthesia 9th Ed. ${chapterLabel}\nText: ${truncatedBody}`;
  }).join('\n\n');

  const systemInstruction = `You are a knowledge-grounded Senior Anesthesiology Attending teaching residents in the OR.
Your goal is to provide a two-fold answer to the user's question, grounded strictly in the provided verified textbook sources:
First, a high-yield clinical summary covering all 5 categories.
Second, a highly comprehensive, detailed, and clinically all-encompassing teaching consult.

You MUST structure your entire response using the exact dividers "=== CLINICAL SUMMARY ===" and "=== DETAILED CONSULTATION ===" as follows:

=== CLINICAL SUMMARY ===
Provide a concise, high-yield clinical summary of the answer. Address all 5 clinical categories briefly using this exact bullet list format:
- 🧬 **Mechanism**: [1-2 sentences summarizing mechanism/receptors]
- 💊 **Dosing**: [1-2 sentences summarizing dosing/onset/duration]
- 🫁 **Physiology**: [1-2 sentences summarizing physiological effects/indications]
- ⚠️ **Adverse**: [1-2 sentences summarizing adverse effects/warnings]
- 📖 **Pearls**: [1-2 sentences summarizing clinical pearls]

=== DETAILED CONSULTATION ===
Provide a highly detailed, comprehensive, and exhaustive clinical teaching consult, as if you are a senior attending teaching in detail in the OR. Organize this detailed section under these 5 structured markdown category headings (address and output ALL of them):
### 🧬 Mechanism & Receptor Pharmacology
[Detailed, exhaustive explanation of mechanisms, receptors, and pathways]

### 💊 Clinical Dosing & Pharmacokinetics
[Detailed dosing guidelines, onset, duration, and kinetics]

### 🫁 Physiological Effects & Clinical Indications
[Detailed physiological effects on organ systems and clinical indications]

### ⚠️ Adverse Effects, Warnings & Contraindications
[Detailed adverse effects, warnings, and contraindications]

### 📖 Clinical Pearls & General Notes
[Detailed clinical pearls and teaching points]

STRICT GROUNDING & DEPTH RULES:
1. Your response must be directly based on the provided textbook sources.
2. In the DETAILED CONSULTATION, make the explanations as thorough and complete as possible.
3. If a specific section lacks direct information in the retrieved sources, use your expert clinical logic to extrapolate safe, textbook-aligned principles that apply to the topic, while noting the relationship to the cited facts.
4. Insert inline citations to the sources in the DETAILED CONSULTATION using the superscript format: <sup>[X]</sup> where X is the source number (e.g. <sup>[1]</sup> or <sup>[2]</sup>). Place these citations immediately after the facts you cite!
5. Do NOT include a separate bibliography or dump the raw text of the sources at the bottom.
6. Mimic the tone of a medically rigorous, highly knowledgeable, and helpful anesthesia professor. Avoid conversational fluff.

FORMATTING & ORGANIZATION RULES:
- Use clean Markdown tables (| Header | Header |) ONLY when comparing multiple drugs or when the sources explicitly present structured tabular data. Do NOT output empty tables, tables with no content rows, or single-column tables.
- For biological or clinical pathways, use text-based flowcharts with arrows (e.g., "Drug -> Receptor Activation -> Signal Transduction").
- Separate different points using clean bullet points (- ) with an empty line between bullets to make them highly readable.
- Output the response ONCE. Do NOT duplicate the answer, write duplicate sections, or output long strings of dashes/dividers.
- Do NOT output JSON, code blocks, or structured schemas. Respond ONLY in standard readable markdown.`;

  const prompt = `Textbook Sources:\n${sourcesText}\n\nUser Question: ${query}`;

  const response = await geminiApiFetch({
    streaming: true,
    apiKey,
    body: {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      system_instruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16384
      }
    }
  });

  if (!response.ok) {
    throw await handleFetchError(response);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr);
          // Check for API-level errors inside the SSE stream (quota, blocked, safety, etc.)
          if (parsed.error) {
            console.error('[Gemini SSE] API error in stream:', parsed.error.message || JSON.stringify(parsed.error));
            continue;
          }
          const candidate = parsed.candidates?.[0];
          if (candidate?.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
            console.warn(`[Gemini SSE] Non-standard finish reason: ${candidate.finishReason}`);
          }
          const chunkText = candidate?.content?.parts?.[0]?.text || '';
          if (chunkText) {
            fullText += chunkText;
            if (onChunk) {
              onChunk(fullText);
            }
          }
        } catch (err) {
          // Only warn for actual parse failures, not for SSE keepalive/control lines
          if (jsonStr && jsonStr !== '[DONE]') {
            console.warn('[Gemini SSE] JSON parse warning:', err.message, 'Raw:', jsonStr.slice(0, 200));
          }
        }
      }
    }
  }

  if (buffer.trim().startsWith('data: ')) {
    try {
      const jsonStr = buffer.trim().slice(6).trim();
      const parsed = JSON.parse(jsonStr);
      const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (chunkText) {
        fullText += chunkText;
        if (onChunk) {
          onChunk(fullText);
        }
      }
    } catch {}
  }

  return fullText;
}

async function expandQueryClinicalKeywords(query, apiKey) {
  try {
    const systemInstruction = `You are a clinical query parser for an anesthesia textbook search index.
Analyze the user's question and extract 3 to 5 key clinical terms, pharmacological agents, or physiological concepts.
Focus on standard singular root nouns (e.g. convert 'bronchospasming' to 'bronchospasm', 'intubated' to 'intubation').
Respond ONLY with a JSON array of strings, for example: ["bronchospasm", "ventilation", "albuterol"].
Do not include any explanation, introductory text, markdown formatting outside the JSON, or markdown code blocks.`;

    const response = await geminiApiFetch({
      streaming: false,
      apiKey,
      body: {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `User Question: ${query}`
              }
            ]
          }
        ],
        system_instruction: {
          parts: [
            {
              text: systemInstruction
            }
          ]
        },
        generationConfig: {
          temperature: 0.0,
          responseMimeType: 'application/json'
        }
      }
    });

    if (!response.ok) {
      const err = await handleFetchError(response);
      console.warn(`Query expansion failed: ${err.message}`);
      return [query];
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [query];

    // Strip potential markdown fence wrappers if any (just in case model ignored instruction)
    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    const keywords = JSON.parse(cleanText);
    if (Array.isArray(keywords) && keywords.length > 0) {
      return keywords;
    }
  } catch (err) {
    console.error('Failed to expand clinical query keywords:', err);
  }
  return [query];
}

function extractSources(text) {
  const sources = [];
  const blocks = text.split(/\n---\n/);
  
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('**Source')) continue;
    
    const headerRegex = /\*\*Source\s+(\d+)\*\*\s+—\s+\*([^*]+)\*\s*\n📄\s+\*\[([^\]]+)\]\*\s*\|\s*Relevance:\s*([^\n(]+)\(([^)]+)\)/i;
    const match = headerRegex.exec(trimmed);
    if (match) {
      const rank = match[1];
      const title = match[2].trim();
      const file = match[3].trim();
      const relevance = match[4].trim();
      const score = match[5].trim();
      
      const headerEndIdx = trimmed.indexOf(match[0]) + match[0].length;
      let body = trimmed.slice(headerEndIdx).trim();
      
      if (body.startsWith('*Verbatim passage referenced')) {
        body = '';
      }
      
      sources.push({
        rank,
        title,
        file,
        relevance,
        score,
        body
      });
    }
  }
  return sources;
}

export default function AttendingPanel({
  vitals,
  patient,
  activeMeds,
  surgicalPhase,
  time,
  logs,
  attendingMode,
  setAttendingMode,
  primaryGuidance,
  fullAudit,
  activeAlertsCount,
  formatTime,
  generateClinicalHint,
  onActionClick,
  nearFutureForecast // Recieved from App.jsx
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [activeTab, setActiveTab] = useState('advisor'); // 'advisor' or 'chat' or 'study'
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const conversationHistoryRef = useRef([]);
  const [expandedSources, setExpandedSources] = useState({});
  // In production, the proxy handles the API key so we always have access
  const [apiKey] = useState(() => IS_PRODUCTION ? 'PROXY' : (localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || ''));

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('attending_sidebar_width');
    return saved ? parseInt(saved, 10) : 384;
  });
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(sidebarWidth);

  useEffect(() => {
    widthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    
    const handleMouseMove = (moveEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('attending_sidebar_width', widthRef.current.toString());
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleSources = (msgId) => {
    setExpandedSources(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const kbStats = getKnowledgeStats();

  // Board Exam Quiz State
  const [activeQuizQuestionIdx, setActiveQuizQuestionIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  const [showQuizExplanation, setShowQuizExplanation] = useState(false);
  const [quizReferenceContext, setQuizReferenceContext] = useState([]);
  const [quizStats, setQuizStats] = useState({ completed: 0, correct: 0, streak: 0 });
  const [quizFilter, setQuizFilter] = useState('ALL');

  // Board Study Inline Ask Attending State
  const [studyInput, setStudyInput] = useState('');
  const [studyChatHistory, setStudyChatHistory] = useState([]); // [{id, sender, text, timestamp}]
  const [isStudyTyping, setIsStudyTyping] = useState(false);
  const [studyExpandedDetails, setStudyExpandedDetails] = useState({}); // {msgId: bool}
  const studyEndRef = useRef(null);

  // Pimp Me Section State
  const [showPimpSection, setShowPimpSection] = useState(false);
  const [pimpTopicInput, setPimpTopicInput] = useState('');
  const [isGeneratingPimp, setIsGeneratingPimp] = useState(false);
  const [isPimpLoading, setIsPimpLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [activeGeneratedIdx, setActiveGeneratedIdx] = useState(0);
  const generatedQuestion = generatedQuestions[activeGeneratedIdx] || null;
  const [generatedSelectedIdx, setGeneratedSelectedIdx] = useState(null);
  const [showGeneratedExplanation, setShowGeneratedExplanation] = useState(false);
  const [showReferences, setShowReferences] = useState(false);

  const toggleStudyDetail = (msgId) => setStudyExpandedDetails(prev => ({ ...prev, [msgId]: !prev[msgId] }));

  const filteredQuestions = boardQuestions.filter(q => 
    quizFilter === 'ALL' || q.category.toUpperCase() === quizFilter.toUpperCase()
  );
  const currentQuestion = filteredQuestions[activeQuizQuestionIdx % filteredQuestions.length] || null;

  // Background reference retrieval and state resets when active question changes
  useEffect(() => {
    if (generatedQuestion) {
      if (generatedQuestion.reference) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuizReferenceContext([{
          record: {
            chapter_title: generatedQuestion.reference.chapter || 'Miller Anesthesia',
            section_heading: generatedQuestion.reference.section || 'General Reference',
            body_text: generatedQuestion.reference.text || ''
          },
          score: 3.0,
          rank: 1
        }]);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuizReferenceContext([]);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGeneratedSelectedIdx(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowGeneratedExplanation(false);
    } else if (currentQuestion) {
      if (currentQuestion.searchQuery) {
        const results = searchKnowledge(currentQuestion.searchQuery, 10, 0.2);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuizReferenceContext(results);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQuizReferenceContext([]);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedOptionIdx(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowQuizExplanation(false);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuizReferenceContext([]);
    }
  }, [currentQuestion, generatedQuestion]);

  // Initialize and reset chat messages on patient name changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChatMessages([
      {
        id: 'welcome',
        sender: 'attending',
        text: `Hello! Ask me any free-form questions regarding the current patient, the active procedure, or real-time clinical advice. I will review the live physiological state to guide you.`,
        timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
      }
    ]);
    resetConversationHistory();
    conversationHistoryRef.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.name]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  const handleActionClick = (actionKey) => {
    if (actionKey.startsWith('audit ')) {
      setActiveTab('chat');
      const userMessage = {
        id: `user-${chatMessages.length}`,
        sender: 'user',
        text: actionKey.toUpperCase(),
        timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
      };
      setChatMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      setTimeout(() => {
        const attendingReply = getAttendingResponse(actionKey, {
          vitals,
          patient,
          activeMeds,
          surgicalPhase,
          time,
          logs
        }, conversationHistoryRef.current);
        setChatMessages(prev => {
          const responseMessage = {
            id: `attending-${prev.length}`,
            sender: 'attending',
            text: attendingReply,
            timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
          };
          return [...prev, responseMessage];
        });
        setIsTyping(false);
      }, 600);
    } else {
      if (onActionClick) onActionClick(actionKey);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const userMessage = {
      id: `user-${chatMessages.length}`,
      sender: 'user',
      text: userInput,
      timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
    };

    const currentInput = userInput;
    setUserInput('');
    setIsTyping(true);

    // Append user message immediately
    setChatMessages(prev => [...prev, userMessage]);

    let localReply = '';
    try {
      // 1. Run local decision trees first
      localReply = getAttendingResponse(currentInput, {
        vitals,
        patient,
        activeMeds,
        surgicalPhase,
        time,
        logs
      }, conversationHistoryRef.current);
      
      // Check if response is a state-based decision branch (NOT a textbook search or limitation)
      // IMPORTANT: If the user is asking an educational/knowledge question ("how does X work",
      // "explain X", "what is X", etc.), always route to the KB + Gemini pipeline for a
      // comprehensive textbook-grounded answer, even if the local decision tree matched.
      const educationalPattern = /\b(how\s+(does|do|is|are|did|would|should|can|could)|explain|what\s+(is|are|does|causes?)|why\s+(does|do|is|are|would)|mechanism|pharmacology|pharmacokinetics|pharmacodynamics|teach\s+me|tell\s+me\s+about|describe|work[s]?\b)/i;
      const isEducationalQuery = educationalPattern.test(currentInput);
      const isStateBased = !localReply.includes('### 📖 Attending Knowledge Base') && 
                           !localReply.includes('Knowledge Limitation') &&
                           !isEducationalQuery;
                           
      if (isStateBased) {
        setIsTyping(false);
        setChatMessages(prev => {
          const responseMessage = {
            id: `attending-${prev.length}`,
            sender: 'attending',
            text: localReply,
            timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
          };
          return [...prev, responseMessage];
        });
      } else if (apiKey) {
        // 2. AI Synthesis Mode: Retrieve sources and query Gemini
        try {
          // Run a fast local search first using the raw user query
          let kbResults = searchKnowledge(currentInput, 5, 0.12);

          // Bypass query expansion if we already have at least 1 high-quality textbook record
          // (the expanded synonym dictionary makes the first-pass search much more effective)
          if (kbResults.length < 1) {
            // Check if query expansion is needed (bypass for simple 1-2 word queries)
            const queryWords = currentInput.trim().split(/\s+/).filter(Boolean);
            const needsExpansion = queryWords.length > 2 || 
                                   currentInput.toLowerCase().includes('how') || 
                                   currentInput.toLowerCase().includes('why') || 
                                   currentInput.toLowerCase().includes('what') || 
                                   currentInput.toLowerCase().includes('should') ||
                                   currentInput.toLowerCase().includes('explain');

            if (needsExpansion) {
              console.log(`[QueryExpansion] Direct search yielded ${kbResults.length} results. Running query expansion...`);
              const expandedKeywords = await expandQueryClinicalKeywords(currentInput, apiKey);
              const searchQuery = expandedKeywords.join(' ');
              console.log(`[QueryExpansion] Standardized search keywords: "${searchQuery}"`);

              const expandedResults = searchKnowledge(searchQuery, 5, 0.12);
              if (expandedResults.length > 0) {
                kbResults = expandedResults;
              } else {
                console.log('[QueryExpansion] Expanded search yielded 0 results. Keeping original query results.');
              }
            } else {
              console.log(`[QueryExpansion] Simple query detected. Bypassing expansion pass.`);
            }
          } else {
            console.log(`[QueryExpansion] Direct search yielded ${kbResults.length} high-quality results. Bypassing expansion pass.`);
          }

          if (kbResults.length > 0) {
            const attendingMessageId = `attending-${chatMessages.length + 1}`;
            
            // Turn off spinner and append streaming message placeholder
            setIsTyping(false);
            setChatMessages(prev => [
              ...prev,
              {
                id: attendingMessageId,
                sender: 'attending',
                text: `### 📖 Attending Knowledge Base Consultation\n\nFormulating clinical advice…`,
                timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`,
                isStreaming: true
              }
            ]);

            let lastText = '';
            const streamText = await queryGeminiAI(currentInput, kbResults, apiKey, (fullStreamText) => {
              lastText = fullStreamText;

              // During streaming: only show the Clinical Summary portion.
              // The Detailed Consultation stays hidden until streaming is fully complete.
              let displayDuringStream = fullStreamText;
              const summaryDelim = '=== CLINICAL SUMMARY ===';
              const detailDelim = '=== DETAILED CONSULTATION ===';
              
              if (fullStreamText.includes(summaryDelim)) {
                const afterSummary = fullStreamText.split(summaryDelim)[1] || '';
                if (fullStreamText.includes(detailDelim)) {
                  // Summary is complete — show only summary part during stream
                  const summaryOnly = afterSummary.split(detailDelim)[0].trim();
                  displayDuringStream = `${summaryDelim}\n${summaryOnly}\n\n_⏳ Generating comprehensive detailed consult…_`;
                } else {
                  // Summary is still streaming in
                  displayDuringStream = `${summaryDelim}\n${afterSummary}`;
                }
              }

              setChatMessages(prev => {
                return prev.map(msg => {
                  if (msg.id === attendingMessageId) {
                    return {
                      ...msg,
                      text: `### 📖 Attending Knowledge Base Consultation\n\n${displayDuringStream}`
                    };
                  }
                  return msg;
                });
              });
            });

            // Final message formulation (append sources block)
            let attendingReply = `### 📖 Attending Knowledge Base Consultation\n\n`;

            // FALLBACK: If Gemini returned empty (API error, quota, timeout),
            // build a local synthesis directly from the textbook sources.
            if (!lastText.trim()) {
              console.warn('[Attending] Gemini returned empty response. Building local KB fallback.');
              let fallback = '> ⚡ *Direct textbook synthesis (AI synthesis unavailable)*\n\n';
              for (const result of kbResults.slice(0, 5)) {
                const { record, score } = result;
                const chLabel = extractChapterLabel(record.chapter_title);
                fallback += `**${record.section_heading || 'General'}** *(Miller\'s ${chLabel}, relevance: ${score.toFixed(1)})*\n\n`;
                const bodySnippet = (record.body_text || '').slice(0, 1500);
                fallback += `${bodySnippet}\n\n---\n\n`;
              }
              lastText = fallback;
            }

            attendingReply += lastText.trim() + `\n\n`;
            
            // Append standard formatted sources block for collapsible citations UI
            for (const result of kbResults) {
              const { record, score, rank } = result;
              const confidenceLabel = score > 2.0 ? '🟢 HIGH' : score > 1.0 ? '🟡 MODERATE' : '🟠 PARTIAL';
              const chapterLabel = extractChapterLabel(record.chapter_title);
              const citation = ` [Miller ${chapterLabel}: ${record.section_heading || 'Untitled Section'}]`;
              const citedBody = record.body_text + citation;

              attendingReply += `---\n`;
              attendingReply += `**Source ${rank}** — *${record.section_heading || 'Untitled Section'}*\n`;
              attendingReply += `📄 *[${record.chapter_title}]* | Relevance: ${confidenceLabel} (${score.toFixed(2)})\n\n`;
              
              if (rank <= 5) {
                attendingReply += `${citedBody}\n\n`;
              } else {
                attendingReply += `*Verbatim passage referenced in the synthesis above.*\n\n`;
              }
            }
            
            const matrixResults = searchMatrices ? searchMatrices(currentInput, 3) : [];
            if (matrixResults && matrixResults.length > 0) {
              attendingReply += `---\n`;
              attendingReply += `**📊 Related Figures & Data:**\n\n`;
              for (const mr of matrixResults) {
                attendingReply += `- **${mr.record.caption}** [${mr.record.archetype || 'Figure'}]\n`;
              }
              attendingReply += `\n`;
            }

            setChatMessages(prev => {
              return prev.map(msg => {
                if (msg.id === attendingMessageId) {
                  return {
                    ...msg,
                    text: attendingReply,
                    isStreaming: false
                  };
                }
                return msg;
              });
            });

          } else {
            setIsTyping(false);
            setChatMessages(prev => {
              const responseMessage = {
                id: `attending-${prev.length}`,
                sender: 'attending',
                text: localReply,
                timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
              };
              return [...prev, responseMessage];
            });
          }
        } catch (err) {
          console.error('Gemini synthesis failed:', err);
          setIsTyping(false);
          setChatMessages(prev => {
            const responseMessage = {
              id: `attending-${prev.length}`,
              sender: 'attending',
              text: localReply + `\n\n💡 *Tip: Gemini synthesis failed (${err.message}). Check your API Key or connection.*`,
              timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
            };
            return [...prev, responseMessage];
          });
        }
      } else {
        setIsTyping(false);
        setChatMessages(prev => {
          const responseMessage = {
            id: `attending-${prev.length}`,
            sender: 'attending',
            text: localReply + `\n\n💡 *Tip: To enable high-fidelity AI-synthesized responses instead of keyword matching, enter a Gemini API Key using the link at the top of the chat panel.*`,
            timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`
          };
          return [...prev, responseMessage];
        });
      }
    } catch (err) {
      console.error(err);
      setIsTyping(false);
    }
  };

  // Spirometric FRC and oxygen buffer calculations to prevent ReferenceError crash
  const frc_L = patient?.lungVolumes?.frc_L || 2.4;
  const frcO2Percent = frc_L > 0 ? ((patient?.oxygenBuffer || 0) / frc_L) * 100 : 21;

  // Sync primary guidance to message history when it changes to prevent duplicates
  useEffect(() => {
    if (primaryGuidance) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessageHistory(prev => {
        // Prevent appending the exact same message back-to-back
        if (prev.length > 0 && prev[prev.length - 1].text === primaryGuidance.text) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `msg-${prev.length}`,
            timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`,
            stepName: primaryGuidance.title,
            text: primaryGuidance.text,
            priority: primaryGuidance.priority,
            suggestion: primaryGuidance.suggestion
          }
        ];
      });
    }
  }, [primaryGuidance, time, formatTime]);

  const handleCallAttending = () => {
    setShowAuditModal(true);
    if (generateClinicalHint) {
      generateClinicalHint();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/40 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
          badge: 'bg-red-500/20 text-red-400 border-red-500/40',
          text: 'text-red-200',
          icon: '🚨'
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-950/40 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)]',
          badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          text: 'text-yellow-200',
          icon: '⚠️'
        };
      case 'SUGGESTION':
        return {
          bg: 'bg-emerald-950/30 border-emerald-600/50 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          text: 'text-emerald-200',
          icon: '💡'
        };
      case 'TEACHING':
        return {
          bg: 'bg-indigo-950/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]',
          badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          text: 'text-indigo-200',
          icon: '📚'
        };
      default:
        return {
          bg: 'bg-slate-900/60 border-slate-700/60 shadow-md',
          badge: 'bg-slate-800 text-slate-400 border-slate-700/50',
          text: 'text-slate-200',
          icon: 'ℹ️'
        };
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-6 z-40 bg-gradient-to-r from-amber-600 to-yellow-600 border border-amber-400/50 text-white p-3 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 hover:from-amber-500 hover:to-yellow-505 transition-all flex items-center gap-2 group"
        >
          <MessageSquare size={20} className="text-amber-100 group-hover:text-white" />
          <span className="text-xs font-bold font-mono uppercase tracking-wider">Attending Consult</span>
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-amber-955">
              {activeAlertsCount}
            </span>
          )}
        </button>
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] z-40 glass-panel glass-amber text-white font-mono flex flex-col shadow-2xl backdrop-blur-md border-y-0 border-r-0 rounded-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: window.innerWidth < 768 ? '100%' : `${sidebarWidth}px`,
          maxWidth: '95vw',
          transition: isResizing ? 'none' : 'transform 0.35s ease'
        }}
      >
        {/* Resize Handle */}
        {isOpen && window.innerWidth >= 768 && (
          <div 
            onMouseDown={handleMouseDown}
            className="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize hover:bg-amber-500/30 active:bg-amber-500 transition-colors z-50 flex items-center justify-center group"
            title="Drag to resize sidebar"
          >
            <div className="w-[2px] h-8 bg-white/20 rounded-full group-hover:bg-white/45 group-active:bg-amber-305 transition-colors"></div>
          </div>
        )}
        {/* Unified Sidebar Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={18} />
            <h3 className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-1.5 font-mono">
              Attending Consult
              {activeAlertsCount > 0 && (
                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] px-1.5 py-0.5 rounded font-extrabold animate-pulse">
                  {activeAlertsCount} ALERTS
                </span>
              )}
            </h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/5 bg-slate-950/40 shrink-0">
          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'advisor'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            📢 Advisor
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            💬 Direct Chat
          </button>
          <button
            onClick={() => setActiveTab('study')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'study'
                ? 'border-amber-500 text-amber-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            📚 Board Study
          </button>
        </div>


        {activeTab === 'advisor' ? (
          <>
            {/* Mode Selector Controls */}
            <div className="p-4 border-b border-white/5 flex flex-col gap-3 bg-slate-950/20 shrink-0">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Attending Mode</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-white/5">
                {['silent', 'observing', 'teaching'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAttendingMode(mode)}
                    className={`py-1.5 text-[10px] font-black uppercase rounded transition-all ${
                      attendingMode === mode 
                        ? 'bg-amber-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/60'
                    }`}
                  >
                    {mode === 'silent' ? '🔇 Silent' : mode === 'observing' ? '👀 Observe' : '📚 Teach'}
                  </button>
                ))}
              </div>

              {/* Quick Guidance Info Text */}
              <p className="text-[10px] text-slate-400 leading-relaxed italic bg-slate-900/40 p-2.5 rounded border border-slate-850">
                {attendingMode === 'silent' && "🔇 Attending is silent. Click 'Call Attending' below at any point for detailed clinical consultations."}
                {attendingMode === 'observing' && "👀 Attending monitors passively and speaks up on critical physiological changes or medication hazards."}
                {attendingMode === 'teaching' && "📚 Full step-by-step guidance. The Attending explains clinical rationales and suggests specific drug dosings."}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {primaryGuidance ? (
                <div className={`p-4 rounded-xl border flex flex-col gap-3 transition-all animate-in fade-in duration-300 ${getPriorityColor(primaryGuidance.priority).bg}`}>
                  <div className="flex justify-between items-center border-b border-slate-800/30 pb-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getPriorityColor(primaryGuidance.priority).badge}`}>
                       {getPriorityColor(primaryGuidance.priority).icon} {primaryGuidance.priority}
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1">
                      <Clock size={10} /> {formatTime ? formatTime(time) : `${Math.floor(time / 60)}m`}
                    </span>
                  </div>
                  
                  <h4 className="font-extrabold text-xs text-white leading-tight uppercase font-mono">
                    {primaryGuidance.title}
                  </h4>
                  
                  <div className="text-[11px] leading-relaxed text-slate-200 bg-slate-950/30 p-3 rounded border border-slate-900/40 font-mono font-medium whitespace-pre-wrap max-w-full break-words">
                    {parseAndRenderText(primaryGuidance.text, handleActionClick)}
                  </div>
 
                  {primaryGuidance.suggestion && (
                    <div className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-900/80 mt-1">
                      <ArrowRight size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] font-bold text-amber-300 leading-snug whitespace-pre-wrap max-w-full break-words">
                        {parseAndRenderText(primaryGuidance.suggestion, handleActionClick)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 animate-in fade-in duration-300">
                  <Shield size={36} className="text-slate-600 mb-2.5 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Physiology Stable</span>
                  <span className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-normal font-mono">
                    {attendingMode === 'silent' 
                      ? "Attending is in Silent mode. Click 'Call Attending' for advice." 
                      : "No active warnings. Attending is observing patient vital trends."}
                  </span>
                </div>
              )}
              
              {/* Premium Attending Foresight (Near-Future Predictive Forecasting Card) */}
              {attendingMode !== 'silent' && nearFutureForecast && (
                <div className="glass-panel glass-amber p-4 border border-amber-500/35 rounded-xl bg-amber-950/20 shadow-md flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5 font-mono">
                    🔮 Attending Foresight
                  </span>
                  <div className="text-[10.5px] leading-relaxed text-amber-105 font-mono italic font-medium bg-slate-950/45 p-3 rounded-lg border border-amber-900/40 whitespace-pre-wrap max-w-full break-words">
                    {parseAndRenderText(nearFutureForecast, handleActionClick)}
                  </div>
                </div>
              )}
 
              {/* Call Attending Call-to-Action Button */}
              <button
                onClick={handleCallAttending}
                className="w-full py-3 glass-button glass-button-amber active:scale-98 text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 font-mono"
              >
                <HelpCircle size={15} />
                CALL ATTENDING CONSULT
              </button>
            </div>
 
            {/* Message Log History Panel - Hides in Silent Mode, Enlarged and Conditional for Observe & Teach */}
            {(attendingMode === 'observing' || attendingMode === 'teaching') && (
              <div className="border-t border-white/5 bg-slate-950/60 h-52 flex flex-col shrink-0 transition-all duration-300">
                <div className="px-4 py-2.5 border-b border-white/5 bg-slate-950/90 flex justify-between items-center shrink-0">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 font-mono">
                    <BookOpen size={12} className="text-amber-500" />
                    Attending Guidance Log
                  </span>
                  <span className="text-[9px] text-slate-450 bg-slate-800/80 px-1.5 py-0.5 rounded font-bold border border-slate-700/50">{messageHistory.length} ENTRIES</span>
                </div>
   
                <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 custom-scrollbar text-[11px] font-mono">
                  {messageHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 italic font-medium">No historical log entries. Attending is monitoring...</div>
                  ) : (
                    messageHistory.slice().reverse().map((msg) => {
                      const priorityStyles = getPriorityColor(msg.priority);
                      return (
                        <div key={msg.id} className="border-b border-slate-850/70 pb-3 flex flex-col gap-1.5 last:border-b-0 animate-in fade-in slide-in-from-bottom-2 duration-250">
                          <div className="flex justify-between items-center text-[10px] mb-0.5 font-bold">
                            <span className={`uppercase tracking-wide px-1 rounded border text-[9px] ${priorityStyles.badge}`}>
                              {priorityStyles.icon} {msg.priority}
                            </span>
                            <span className="text-slate-500 flex items-center gap-1 text-[9px]"><Clock size={9} /> {msg.timestamp}</span>
                          </div>
                          <div className="text-slate-200 leading-relaxed font-medium bg-slate-950/20 p-2.5 rounded border border-slate-900/60 whitespace-pre-wrap max-w-full break-words">
                            {parseAndRenderText(msg.text, handleActionClick)}
                          </div>
                          {msg.suggestion && (
                            <div className="text-[10px] text-amber-305 font-bold pl-1 flex items-center gap-1.5">
                              <ArrowRight size={10} className="text-amber-400" />
                              <span>{parseAndRenderText(msg.suggestion, handleActionClick)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'chat' ? (
          /* Direct Chat View */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20">
            {/* KB Status Bar */}
            <div className="px-4 py-2 border-b border-white/5 bg-slate-950/45 text-[9px] text-slate-450 flex justify-between items-center shrink-0">
              <span className="flex items-center gap-1 font-bold text-amber-500">
                📚 Knowledge Base Active
              </span>
              <span className="text-slate-500 font-bold">
                {kbStats.proseRecords} records | {kbStats.uniqueProseTokens} terms
              </span>
            </div>
            

            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                
                // Classify response type
                const isKbResponse = !isUser && msg.text.includes('### 📖 Attending Knowledge Base');
                const isRefusal = !isUser && msg.text.includes('Knowledge Limitation');
                const isRecall = !isUser && (msg.text.includes('Conversation Memory Recall') || msg.text.includes('[Memory Recall]'));
                
                // Get display name & header styles
                let senderLabel = 'You';
                let labelColor = 'text-slate-500';
                let cardClass = 'bg-amber-900/40 border border-amber-500/30 text-amber-100 rounded-tr-none shadow-[0_2px_8px_rgba(245,158,11,0.1)]';
                
                let isGrounded = false;
                if (!isUser) {
                  isGrounded = verifyResponseGrounding(msg.text, { vitals, patient });
                  
                  if (isKbResponse) {
                    senderLabel = '📖 Attending Knowledge Base';
                    labelColor = 'text-blue-400';
                    cardClass = 'bg-blue-950/40 border border-blue-500/30 text-blue-100 rounded-tl-none shadow-[0_2px_8px_rgba(59,130,246,0.1)]';
                  } else if (isRefusal) {
                    senderLabel = '⚠️ Attending Limitation';
                    labelColor = 'text-amber-500';
                    cardClass = 'bg-amber-955/20 border border-amber-500/20 text-amber-200 rounded-tl-none shadow-md';
                  } else if (isRecall) {
                    senderLabel = '🕰️ Memory Recall';
                    labelColor = 'text-purple-400';
                    cardClass = 'bg-purple-950/30 border border-purple-500/20 text-purple-200 rounded-tl-none shadow-md';
                  } else {
                    senderLabel = '🏥 Senior Attending';
                    labelColor = 'text-emerald-400';
                    cardClass = 'bg-slate-900/80 border border-white/5 text-slate-205 rounded-tl-none shadow-md';
                  }
                }
                
                // Extract sources if it's a KB response
                let sources = [];
                if (isKbResponse) {
                  sources = extractSources(msg.text);
                }
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <span className={`text-[9px] font-extrabold uppercase mb-1 flex items-center gap-1 ${labelColor}`}>
                      {senderLabel} • {msg.timestamp}
                      {isGrounded && (
                        <span className="bg-emerald-500/20 text-emerald-450 border border-emerald-500/30 text-[8px] px-1 py-0.5 rounded font-black tracking-wider shadow-sm flex items-center gap-0.5 ml-1">
                          🛡️ Grounded
                        </span>
                      )}
                    </span>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed font-mono whitespace-pre-wrap max-w-full break-words ${cardClass}`}>
                      {isUser ? (
                        msg.text
                      ) : (
                        (() => {
                          let displayText = msg.text;
                          if (isKbResponse) {
                            const idx = msg.text.indexOf('\n---\n**Source');
                            if (idx !== -1) {
                              displayText = msg.text.slice(0, idx);
                            }
                          }
                          
                          const hasTwoFold = displayText.includes('=== CLINICAL SUMMARY ===') && 
                                             displayText.includes('=== DETAILED CONSULTATION ===');
                                             
                          if (hasTwoFold) {
                            const summaryStart = displayText.indexOf('=== CLINICAL SUMMARY ===') + '=== CLINICAL SUMMARY ==='.length;
                            const detailedIdx = displayText.indexOf('=== DETAILED CONSULTATION ===');
                            const summaryPart = displayText.slice(summaryStart, detailedIdx).trim();
                            const detailedPart = displayText.slice(detailedIdx + '=== DETAILED CONSULTATION ==='.length).trim();
                            
                            const isExpanded = !!expandedSources[`msg-detail-${msg.id}`];
                            
                            return (
                              <div className="flex flex-col gap-2">
                                <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 mb-1 flex items-center gap-1.5 border-b border-amber-500/20 pb-1 select-none">
                                  <span>📋 Quick Snapshot Summary</span>
                                </div>
                                <div className="leading-relaxed">
                                  {parseAndRenderText(summaryPart, handleActionClick)}
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => toggleSources(`msg-detail-${msg.id}`)}
                                  className="mt-2 py-1.5 px-3 bg-slate-950 border border-slate-800 text-[9px] font-black uppercase text-amber-400 rounded-lg hover:bg-slate-900 hover:border-amber-500/35 active:scale-98 transition-all flex items-center gap-1 justify-center self-start select-none shadow-sm cursor-pointer"
                                >
                                  {isExpanded ? '📖 Collapse Detailed Consult' : '🔍 Expand Full Detailed Consult'}
                                </button>
                                
                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 mb-2 flex items-center gap-1.5 border-b border-blue-500/20 pb-1 select-none">
                                      <span>🧠 Comprehensive Teaching Consult</span>
                                    </div>
                                    <div className="leading-relaxed">
                                      {parseAndRenderText(detailedPart, handleActionClick)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          return parseAndRenderText(displayText, handleActionClick);
                        })()
                      )}
                      
                      {isKbResponse && sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-blue-500/20 text-[10px] shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold transition focus:outline-none cursor-pointer"
                          >
                            <BookOpen size={10} />
                            {expandedSources[msg.id] ? 'Hide Source Citations' : `Show Source Citations (${sources.length})`}
                          </button>
                          
                          {expandedSources[msg.id] && (
                            <div className="mt-2 pl-2 border-l border-blue-500/30 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                              {sources.map((src, sIdx) => {
                                const isHigh = src.relevance.includes('HIGH');
                                const isMod = src.relevance.includes('MODERATE');
                                const badgeColor = isHigh 
                                  ? 'bg-emerald-500/20 text-emerald-450 border-emerald-500/30' 
                                  : isMod 
                                  ? 'bg-yellow-500/20 text-yellow-450 border-yellow-500/30' 
                                  : 'bg-orange-500/20 text-orange-450 border-orange-500/30';
                                  
                                return (
                                  <div key={sIdx} className="bg-slate-950/40 p-2.5 rounded border border-blue-500/10 flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center mb-0.5">
                                      <span className="font-extrabold text-blue-300 text-[9.5px]">Source {src.rank}: {src.title}</span>
                                      <span className={`px-1 rounded border text-[8px] font-bold shrink-0 ${badgeColor}`}>
                                        {src.relevance} ({src.score})
                                      </span>
                                    </div>
                                    <div className="text-slate-450 font-semibold text-[8.5px]">File: {src.file}</div>
                                    {src.body && (
                                      <p className="text-slate-300 bg-slate-950/50 p-2 rounded border border-white/5 text-[9px] leading-relaxed italic mt-1 font-medium whitespace-pre-wrap select-text">
                                        {parseAndRenderText(src.body, handleActionClick)}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase mb-1 font-mono">
                    Attending • Thinking
                  </span>
                  <div className="bg-slate-900/60 border border-slate-800/40 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm text-[10px] text-slate-400 italic">
                    <span className="animate-pulse">Attending is formulating clinical advice...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
 
            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-slate-950/60 flex gap-2 shrink-0">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask Attending (e.g. 'why is BP low?')..."
                className="flex-1 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-205 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={isTyping || !userInput.trim()}
                className="px-3 py-2 glass-button glass-button-amber disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center active:scale-95 shadow-lg shadow-amber-950/20"
              >
                <ChevronRight size={16} />
              </button>
            </form>
          </div>
        ) : (
          /* Board Study View */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar text-[11px]">

              {/* ═══════ Collapsible "Pimp Me" Section ═══════ */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPimpSection(prev => !prev)}
                  className="w-full flex justify-between items-center bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-indigo-300 hover:border-indigo-400/50 hover:text-indigo-200 transition-all cursor-pointer group shadow-lg shadow-indigo-950/20"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400 group-hover:text-indigo-300 transition" />
                    🎯 Pimp Me — Board Questions
                    <span className="text-[8px] font-semibold bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-400">
                      {quizStats.completed > 0 ? `${quizStats.correct}/${quizStats.completed}` : 'START'}
                    </span>
                  </span>
                  {showPimpSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showPimpSection && (
                  <div className="mt-2 flex flex-col gap-3 bg-slate-900/40 border border-indigo-500/15 rounded-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Pimp Mode Controls */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedQuestions([]);
                            setActiveGeneratedIdx(0);
                            setGeneratedSelectedIdx(null);
                            setShowGeneratedExplanation(false);
                            setActiveQuizQuestionIdx(Math.floor(Math.random() * filteredQuestions.length));
                          }}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-[10px] rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Shuffle size={12} /> PIMP ME RANDOMLY
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const topic = pimpTopicInput.trim();
                            if (!topic || !apiKey || isGeneratingPimp) return;
                            setIsGeneratingPimp(true);
                            setIsPimpLoading(true);
                            setGeneratedQuestions([]);
                            setActiveGeneratedIdx(0);
                            setGeneratedSelectedIdx(null);
                            setShowGeneratedExplanation(false);
                            try {
                              let kbResults = searchKnowledge(topic, 15, 0.10);
                              if (kbResults.length < 3) {
                                const expanded = await expandQueryClinicalKeywords(topic, apiKey);
                                const expandedResults = searchKnowledge(expanded.join(' '), 15, 0.10);
                                if (expandedResults.length > 0) kbResults = expandedResults;
                              }
                              if (kbResults.length === 0) {
                                setGeneratedQuestions([{ error: `No textbook content found for "${topic}". Try a different term.` }]);
                                setIsGeneratingPimp(false);
                                setIsPimpLoading(false);
                                return;
                              }
                              const sourcesText = kbResults.slice(0, 12).map((src, idx) =>
                                `[Source ${idx + 1}] Chapter: ${src.record.chapter_title}\nSection: ${src.record.section_heading || 'General'}\nText: ${src.record.body_text}`
                              ).join('\n\n');
                              
                              const response = await geminiApiFetch({
                                streaming: true,
                                apiKey,
                                body: {
                                  contents: [{ role: 'user', parts: [{ text: `Topic: ${topic}\n\nTextbook Sources:\n${sourcesText}` }] }],
                                  system_instruction: { parts: [{ text: `You are a board-exam question writer for anesthesiology residents. Generate exactly 10 high-yield multiple-choice questions based STRICTLY on the provided textbook sources about the specified topic. Each question must test a different clinical fact or concept present in the sources.

Respond ONLY with a single JSON object containing a "questions" array (no markdown, no code blocks, no explanation) in this exact format:
{
  "questions": [
    {
      "vignette": "Clinical vignette or stem question",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIdx": 0,
      "explanation": "Detailed explanation of the correct answer",
      "category": "topic category",
      "reference": {
        "chapter": "Miller Chapter Title or Number (e.g. Miller Ch.9 or Miller Chapter 10)",
        "section": "Section Heading (e.g. Ketamine Pharmacology)",
        "text": "Exact short verbatim passage from the sources that supports the correct answer"
      }
    }
  ]
}

Rules:
- Generate exactly 10 questions.
- The vignette must be a realistic clinical scenario or direct knowledge question.
- Exactly 4 options labeled A) through D).
- correctIdx is 0-based (0=A, 1=B, 2=C, 3=D).
- The explanation must be thorough and educational.
- The reference object must link directly back to the textbook source that contains the answer.
- Base everything strictly on the provided textbook sources.` }] },
                                  generationConfig: { temperature: 0.4 }
                                }
                              });

                              if (!response.ok) {
                                throw await handleFetchError(response);
                              }

                              const reader = response.body.getReader();
                              const decoder = new TextDecoder();
                              let buffer = '';
                              let fullText = '';
                              let hasFirstQuestion = false;

                              while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                buffer += decoder.decode(value, { stream: true });
                                const lines = buffer.split('\n');
                                buffer = lines.pop() || '';

                                for (const line of lines) {
                                  const trimmed = line.trim();
                                  if (trimmed.startsWith('data: ')) {
                                    const jsonStr = trimmed.slice(6).trim();
                                    if (!jsonStr) continue;
                                    try {
                                      const parsed = JSON.parse(jsonStr);
                                      const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                      if (chunkText) {
                                        fullText += chunkText;
                                        const questions = parsePartialQuestions(fullText);
                                        if (questions.length > 0) {
                                          setGeneratedQuestions(questions);
                                          if (!hasFirstQuestion) {
                                            hasFirstQuestion = true;
                                            setIsGeneratingPimp(false);
                                          }
                                        }
                                      }
                                    } catch (err) {
                                      console.warn('JSON chunk parse error:', err);
                                    }
                                  }
                                }
                              }

                              if (buffer.trim().startsWith('data: ')) {
                                try {
                                  const jsonStr = buffer.trim().slice(6).trim();
                                  const parsed = JSON.parse(jsonStr);
                                  const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                  if (chunkText) {
                                    fullText += chunkText;
                                  }
                                } catch {}
                              }

                              const finalQuestions = parsePartialQuestions(fullText);
                              if (finalQuestions.length > 0) {
                                setGeneratedQuestions(finalQuestions);
                              } else {
                                try {
                                  let cleanText = fullText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                                  const parsed = JSON.parse(cleanText);
                                  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                                    setGeneratedQuestions(parsed.questions);
                                  } else if (parsed && parsed.vignette) {
                                    setGeneratedQuestions([parsed]);
                                  }
                                } catch (err) {
                                  if (!hasFirstQuestion) {
                                    throw new Error('Could not parse any generated questions from the AI stream.');
                                  }
                                }
                              }

                            } catch (err) {
                              console.error('Pimp question generation failed:', err);
                              setGeneratedQuestions([{ error: `Failed to generate questions: ${err.message}` }]);
                              setActiveGeneratedIdx(0);
                            } finally {
                              setIsGeneratingPimp(false);
                              setIsPimpLoading(false);
                            }
                          }}
                          disabled={!pimpTopicInput.trim() || isGeneratingPimp || !apiKey}
                          className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-98 text-white font-bold text-[10px] rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Target size={12} /> PIMP ME ON…
                        </button>
                      </div>
                      <input
                        type="text"
                        value={pimpTopicInput}
                        onChange={(e) => setPimpTopicInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.closest('div').querySelector('button:last-of-type')?.click(); }}
                        placeholder="Enter topic (e.g. 'ketamine', 'intubation', 'MAC')…"
                        className="w-full bg-slate-950/80 border border-slate-700/60 rounded-lg px-3 py-2 text-[10px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/20 transition-all font-mono"
                        disabled={isGeneratingPimp}
                      />
                    </div>

                    {/* Quiz Stats Bar */}
                    <div className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-white/5 text-[9px] text-slate-400">
                      <div>Done: <strong className="text-slate-200">{quizStats.completed}</strong></div>
                      <div>Correct: <strong className="text-emerald-400">{quizStats.correct}</strong></div>
                      <div>Accuracy: <strong className="text-amber-400">{quizStats.completed > 0 ? Math.round((quizStats.correct / quizStats.completed) * 100) : 0}%</strong></div>
                      <div>Streak: <strong className="text-indigo-400">{quizStats.streak} 🔥</strong></div>
                    </div>

                    {/* Quiz Filters (for pre-built questions only) */}
                    {!generatedQuestion && (
                      <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-white/5 text-[9px]">
                        {['ALL', 'PHYSIOLOGY', 'PHARMACOLOGY'].map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => { setQuizFilter(f); setActiveQuizQuestionIdx(0); }}
                            className={`flex-1 py-1 font-bold rounded transition-all cursor-pointer ${quizFilter === f ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Loading Indicator */}
                    {isGeneratingPimp && (
                      <div className="flex items-center justify-center py-6 gap-2 text-purple-400 text-[10px] font-bold">
                        <Sparkles size={14} className="animate-spin" />
                        Generating question on &ldquo;{pimpTopicInput}&rdquo;…
                      </div>
                    )}

                    {/* AI-Generated Question Display */}
                    {generatedQuestion && !isGeneratingPimp && (
                      generatedQuestion.error ? (
                        <div className="text-center py-4 text-red-400 text-[10px] italic bg-red-950/20 border border-red-500/20 rounded-lg p-3">
                          {generatedQuestion.error}
                        </div>
                      ) : (
                        <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-200">
                          <div className="flex justify-between items-center text-[9px] font-bold text-purple-400 border-b border-slate-800 pb-1.5">
                            <span className="flex items-center gap-1"><Sparkles size={10} /> AI-GENERATED: {(generatedQuestion.category || pimpTopicInput).toUpperCase()}</span>
                            <span className="text-slate-500 flex items-center gap-1">
                              Q {activeGeneratedIdx + 1} / {isPimpLoading ? 10 : generatedQuestions.length}
                              {isPimpLoading && (
                                <span className="text-purple-400 font-bold animate-pulse text-[8px] flex items-center gap-0.5 ml-1">
                                  <Sparkles size={8} className="animate-spin" />
                                  (STREAMING…)
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="font-bold leading-relaxed text-slate-100 bg-slate-950/20 p-2.5 rounded border border-slate-900/30 text-[10.5px]">
                            {generatedQuestion.vignette}
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {generatedQuestion.options.map((opt, oIdx) => {
                              let optStyle = 'border-slate-850 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/50 text-slate-300';
                              if (showGeneratedExplanation) {
                                if (oIdx === generatedQuestion.correctIdx) optStyle = 'border-emerald-500 bg-emerald-950/30 text-emerald-200 font-bold';
                                else if (generatedSelectedIdx === oIdx) optStyle = 'border-red-500 bg-red-950/30 text-red-200';
                              } else if (generatedSelectedIdx === oIdx) {
                                optStyle = 'border-purple-500 bg-purple-955/30 text-purple-200';
                              }
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => { if (!showGeneratedExplanation) setGeneratedSelectedIdx(oIdx); }}
                                  disabled={showGeneratedExplanation}
                                  className={`w-full text-left p-2 rounded-lg border text-[10px] leading-snug transition-all flex items-start gap-2 cursor-pointer ${optStyle}`}
                                >
                                  <span className="font-bold shrink-0">{opt.slice(0, 2)}</span>
                                  <span>{opt.slice(3)}</span>
                                </button>
                              );
                            })}
                          </div>
                          {!showGeneratedExplanation ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (generatedSelectedIdx === null) return;
                                const isCorrect = generatedSelectedIdx === generatedQuestion.correctIdx;
                                setQuizStats(prev => ({ completed: prev.completed + 1, correct: prev.correct + (isCorrect ? 1 : 0), streak: isCorrect ? prev.streak + 1 : 0 }));
                                setShowGeneratedExplanation(true);
                              }}
                              disabled={generatedSelectedIdx === null}
                              className="w-full py-2 bg-purple-600 disabled:opacity-50 hover:bg-purple-500 active:scale-98 text-white font-bold rounded-lg transition-all shadow-md font-mono text-[10px] cursor-pointer"
                            >
                              SUBMIT ANSWER
                            </button>
                          ) : (
                            <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                              <div className={`p-2.5 rounded-lg border text-[10px] leading-relaxed ${generatedSelectedIdx === generatedQuestion.correctIdx ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' : 'bg-red-950/20 border-red-500/40 text-red-200'}`}>
                                <span className="font-bold block mb-1">{generatedSelectedIdx === generatedQuestion.correctIdx ? '🎉 CORRECT' : '❌ INCORRECT'}</span>
                                {generatedQuestion.explanation}
                              </div>
                              {activeGeneratedIdx < generatedQuestions.length - 1 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveGeneratedIdx(prev => prev + 1);
                                    setGeneratedSelectedIdx(null);
                                    setShowGeneratedExplanation(false);
                                  }}
                                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 active:scale-98 text-white font-bold rounded-lg transition-all shadow-md font-mono text-[10px] cursor-pointer"
                                >
                                  NEXT QUESTION
                                </button>
                              ) : isPimpLoading ? (
                                <div className="flex items-center justify-center gap-1.5 text-purple-400 text-[10px] font-bold py-2 border border-purple-500/20 rounded-lg bg-slate-900/60 select-none">
                                  <Sparkles size={12} className="animate-spin" />
                                  Generating subsequent questions… ({generatedQuestions.length} ready)
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGeneratedQuestions([]);
                                    setActiveGeneratedIdx(0);
                                    setGeneratedSelectedIdx(null);
                                    setShowGeneratedExplanation(false);
                                  }}
                                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-bold rounded-lg transition-all shadow-md font-mono text-[10px] cursor-pointer"
                                >
                                  GENERATE ANOTHER 10
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )}

                    {/* Pre-built Question (when no generated question is active) */}
                    {!generatedQuestion && !isGeneratingPimp && currentQuestion && (
                      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center text-[9px] font-bold text-amber-500 border-b border-slate-800 pb-1.5">
                          <span>TOPIC: {currentQuestion.category.toUpperCase()}</span>
                          <span>Q {activeQuizQuestionIdx + 1} / {filteredQuestions.length}</span>
                        </div>
                        <p className="font-bold leading-relaxed text-slate-100 bg-slate-950/20 p-2.5 rounded border border-slate-900/30 text-[10.5px]">
                          {currentQuestion.vignette}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {currentQuestion.options.map((opt, oIdx) => {
                            let optStyle = 'border-slate-850 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-950/50 text-slate-300';
                            if (showQuizExplanation) {
                              if (oIdx === currentQuestion.correctIdx) optStyle = 'border-emerald-500 bg-emerald-950/30 text-emerald-200 font-bold';
                              else if (selectedOptionIdx === oIdx) optStyle = 'border-red-500 bg-red-950/30 text-red-200';
                            } else if (selectedOptionIdx === oIdx) {
                              optStyle = 'border-amber-500 bg-amber-955/30 text-amber-200';
                            }
                            return (
                              <button key={oIdx} type="button" onClick={() => { if (!showQuizExplanation) setSelectedOptionIdx(oIdx); }} disabled={showQuizExplanation}
                                className={`w-full text-left p-2 rounded-lg border text-[10px] leading-snug transition-all flex items-start gap-2 cursor-pointer ${optStyle}`}>
                                <span className="font-bold shrink-0">{opt.slice(0, 2)}</span>
                                <span>{opt.slice(3)}</span>
                              </button>
                            );
                          })}
                        </div>
                        {!showQuizExplanation ? (
                          <button type="button" onClick={() => {
                            if (selectedOptionIdx === null) return;
                            const isCorrect = selectedOptionIdx === currentQuestion.correctIdx;
                            setQuizStats(prev => ({ completed: prev.completed + 1, correct: prev.correct + (isCorrect ? 1 : 0), streak: isCorrect ? prev.streak + 1 : 0 }));
                            setShowQuizExplanation(true);
                          }} disabled={selectedOptionIdx === null}
                            className="w-full py-2 bg-amber-600 disabled:opacity-50 hover:bg-amber-500 active:scale-98 text-white font-bold rounded-lg transition-all shadow-md font-mono text-[10px] cursor-pointer">
                            SUBMIT ANSWER
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                            <div className={`p-2.5 rounded-lg border text-[10px] leading-relaxed ${selectedOptionIdx === currentQuestion.correctIdx ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' : 'bg-red-950/20 border-red-500/40 text-red-200'}`}>
                              <span className="font-bold block mb-1">{selectedOptionIdx === currentQuestion.correctIdx ? '🎉 CORRECT' : '❌ INCORRECT'}</span>
                              {currentQuestion.explanation}
                            </div>
                            <button type="button" onClick={() => setActiveQuizQuestionIdx(prev => prev + 1)}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white font-bold rounded-lg transition-all shadow-md font-mono text-[10px] cursor-pointer">
                              NEXT QUESTION
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {!generatedQuestion && !isGeneratingPimp && !currentQuestion && (
                      <div className="text-center py-4 text-slate-500 italic text-[10px]">No pre-built questions for this filter.</div>
                    )}

                    {/* Collapsible Textbook Reference Passages */}
                    {quizReferenceContext.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowReferences(prev => !prev)}
                          className="flex items-center justify-between w-full text-[9px] font-black uppercase text-blue-400 tracking-wider hover:text-blue-300 transition cursor-pointer py-1"
                        >
                          <span className="flex items-center gap-1">📚 Textbook References ({quizReferenceContext.length})</span>
                          {showReferences ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {showReferences && (
                          <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1 animate-in fade-in duration-200">
                            {quizReferenceContext.map((res, rIdx) => {
                              const { record, score } = res;
                              const chapterLabel = extractChapterLabel(record.chapter_title);
                              const chapterDisplay = record.chapter_title.startsWith('Miller') ? record.chapter_title : `Miller's Anesthesia ${chapterLabel}`;
                              return (
                                <details key={rIdx} className="bg-slate-950/45 border border-slate-900 rounded-lg p-2 text-[9px] text-slate-300 group">
                                  <summary className="font-bold text-blue-400 hover:text-blue-300 transition cursor-pointer select-none flex justify-between items-center">
                                    <span className="truncate max-w-[180px]">{record.section_heading}</span>
                                    <span className="text-slate-500 text-[8px] font-semibold border border-slate-900 px-1 rounded uppercase shrink-0">{chapterDisplay} ({score.toFixed(1)})</span>
                                  </summary>
                                  <p className="mt-1.5 text-slate-400 leading-relaxed pl-1.5 border-l border-blue-500/20 font-sans font-normal text-[8.5px]">{record.body_text}</p>
                                </details>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══════ Study Chat History ═══════ */}
              {studyChatHistory.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}>
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase mb-0.5 font-mono">
                      {isUser ? 'You' : 'Attending'} • {msg.timestamp}
                    </span>
                    <div className={`${
                      isUser
                        ? 'bg-indigo-900/40 border-indigo-500/30 rounded-2xl rounded-tr-none text-slate-100'
                        : 'bg-slate-900/60 border-slate-800/40 rounded-2xl rounded-tl-none text-slate-200'
                    } border px-3.5 py-2.5 shadow-sm text-[10.5px] leading-relaxed max-w-full break-words whitespace-pre-wrap`}>
                      {isUser ? (
                        msg.text
                      ) : (() => {
                        const text = msg.text;
                        const summaryDelim = '=== CLINICAL SUMMARY ===';
                        const detailDelim = '=== DETAILED CONSULTATION ===';
                        const hasTwoFold = text.includes(summaryDelim) && text.includes(detailDelim);

                        if (hasTwoFold) {
                          const afterSummary = text.split(summaryDelim)[1] || '';
                          const summaryPart = afterSummary.split(detailDelim)[0].trim();
                          const detailedPart = (text.split(detailDelim)[1] || '').trim();
                          const isExpanded = !!studyExpandedDetails[msg.id];

                          return (
                            <div className="flex flex-col gap-2">
                              <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 mb-0.5 flex items-center gap-1 border-b border-amber-500/20 pb-1 select-none">
                                📋 Quick Snapshot
                              </div>
                              <div>{parseAndRenderText(summaryPart, handleActionClick)}</div>
                              <button
                                type="button"
                                onClick={() => toggleStudyDetail(msg.id)}
                                className="mt-1 py-1 px-2.5 bg-slate-950 border border-slate-800 text-[9px] font-black uppercase text-amber-400 rounded-lg hover:bg-slate-900 hover:border-amber-500/35 active:scale-98 transition-all flex items-center gap-1 self-start cursor-pointer"
                              >
                                {isExpanded ? '📖 Collapse Detail' : '🔍 Expand Full Consult'}
                              </button>
                              {isExpanded && (
                                <div className="mt-2 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400 mb-1.5 flex items-center gap-1 border-b border-blue-500/20 pb-1 select-none">
                                    🧠 Comprehensive Teaching Consult
                                  </div>
                                  <div>{parseAndRenderText(detailedPart, handleActionClick)}</div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return parseAndRenderText(text, handleActionClick);
                      })()}
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isStudyTyping && (
                <div className="flex flex-col items-start animate-in fade-in duration-200">
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase mb-0.5 font-mono">Attending • Thinking</span>
                  <div className="bg-slate-900/60 border border-slate-800/40 rounded-2xl rounded-tl-none px-3.5 py-2.5 shadow-sm text-[10px] text-slate-400 italic">
                    <span className="animate-pulse">Attending is formulating a clinical answer…</span>
                  </div>
                </div>
              )}

              <div ref={studyEndRef} />
            </div>
            
            {/* Board Study Ask Attending Input Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const q = studyInput.trim();
              if (!q || isStudyTyping) return;
              
              const userMsg = { id: `study-user-${Date.now()}`, sender: 'user', text: q, timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m` };
              setStudyChatHistory(prev => [...prev, userMsg]);
              setStudyInput('');
              setIsStudyTyping(true);
              setTimeout(() => studyEndRef.current?.scrollIntoView?.({ behavior: 'smooth' }), 50);

              let localReply = '';
              try {
                localReply = getAttendingResponse(q, {
                  vitals, patient, activeMeds, surgicalPhase, time, logs
                }, conversationHistoryRef.current);

                const educationalPattern = /\b(how\s+(does|do|is|are|did|would|should|can|could)|explain|what\s+(is|are|does|causes?)|why\s+(does|do|is|are|would)|mechanism|pharmacology|pharmacokinetics|pharmacodynamics|teach\s+me|tell\s+me\s+about|describe|work[s]?\b)/i;
                const isEducationalQuery = educationalPattern.test(q);
                const isStateBased = !localReply.includes('### 📖 Attending Knowledge Base') && !localReply.includes('Knowledge Limitation') && !isEducationalQuery;

                if (isStateBased) {
                  setIsStudyTyping(false);
                  setStudyChatHistory(prev => [
                    ...prev,
                    { id: `study-att-${Date.now()}`, sender: 'attending', text: localReply, timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m` }
                  ]);
                } else if (apiKey) {
                  // Run a fast local search first using the raw user query
                  let kbResults = searchKnowledge(q, 5, 0.12);
                  if (kbResults.length < 1) {
                    const queryWords = q.split(/\s+/).filter(Boolean);
                    const needsExpansion = queryWords.length > 2 || /how|why|what|should|explain/i.test(q);
                    if (needsExpansion) {
                      const expandedKeywords = await expandQueryClinicalKeywords(q, apiKey);
                      const expandedResults = searchKnowledge(expandedKeywords.join(' '), 5, 0.12);
                      if (expandedResults.length > 0) kbResults = expandedResults;
                    }
                  }

                  if (kbResults.length > 0) {
                    const attendingMsgId = `study-att-${Date.now()}`;
                    setIsStudyTyping(false);
                    setStudyChatHistory(prev => [
                      ...prev,
                      { id: attendingMsgId, sender: 'attending', text: 'Formulating clinical answer…', timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m` }
                    ]);

                    let lastText = '';
                    await queryGeminiAI(q, kbResults, apiKey, (fullStreamText) => {
                      lastText = fullStreamText;

                      // During streaming: only show the Clinical Summary portion
                      let displayDuringStream = fullStreamText;
                      const summaryDelim = '=== CLINICAL SUMMARY ===';
                      const detailDelim = '=== DETAILED CONSULTATION ===';
                      
                      if (fullStreamText.includes(summaryDelim)) {
                        const afterSummary = fullStreamText.split(summaryDelim)[1] || '';
                        if (fullStreamText.includes(detailDelim)) {
                          const summaryOnly = afterSummary.split(detailDelim)[0].trim();
                          displayDuringStream = `${summaryDelim}\n${summaryOnly}\n\n_⏳ Generating comprehensive detailed consult…_`;
                        } else {
                          displayDuringStream = `${summaryDelim}\n${afterSummary}`;
                        }
                      }

                      setStudyChatHistory(prev => {
                        return prev.map(msg => {
                          if (msg.id === attendingMsgId) {
                            return { ...msg, text: displayDuringStream };
                          }
                          return msg;
                        });
                      });
                      setTimeout(() => studyEndRef.current?.scrollIntoView?.({ behavior: 'smooth' }), 50);
                    });

                    // Final text update
                    let attendingReply = `### 📖 Attending Knowledge Base Consultation\n\n`;

                    // FALLBACK: If Gemini returned empty, build local KB synthesis
                    if (!lastText.trim()) {
                      console.warn('[Study] Gemini returned empty response. Building local KB fallback.');
                      let fallback = '> ⚡ *Direct textbook synthesis (AI synthesis unavailable)*\n\n';
                      for (const result of kbResults.slice(0, 5)) {
                        const { record, score } = result;
                        const chLabel = extractChapterLabel(record.chapter_title);
                        fallback += `**${record.section_heading || 'General'}** *(Miller\'s ${chLabel}, relevance: ${score.toFixed(1)})*\n\n`;
                        const bodySnippet = (record.body_text || '').slice(0, 1500);
                        fallback += `${bodySnippet}\n\n---\n\n`;
                      }
                      lastText = fallback;
                    }

                    attendingReply += lastText.trim() + `\n\n`;
                    
                    for (const result of kbResults) {
                      const { record, score, rank } = result;
                      const confidenceLabel = score > 2.0 ? '🟢 HIGH' : score > 1.0 ? '🟡 MODERATE' : '🟠 PARTIAL';
                      const chapterLabel = extractChapterLabel(record.chapter_title);
                      const citation = ` [Miller ${chapterLabel}: ${record.section_heading || 'Untitled Section'}]`;
                      const citedBody = record.body_text + citation;

                      attendingReply += `---\n`;
                      attendingReply += `**Source ${rank}** — *${record.section_heading || 'Untitled Section'}*\n`;
                      attendingReply += `📄 *[${record.chapter_title}]* | Relevance: ${confidenceLabel} (${score.toFixed(2)})\n\n`;
                      
                      if (rank <= 5) {
                        attendingReply += `${citedBody}\n\n`;
                      } else {
                        attendingReply += `*Verbatim passage referenced in the synthesis above.*\n\n`;
                      }
                    }
                    
                    const matrixResults = searchMatrices ? searchMatrices(q, 3) : [];
                    if (matrixResults && matrixResults.length > 0) {
                      attendingReply += `---\n`;
                      attendingReply += `**📊 Related Figures & Data:**\n\n`;
                      for (const mr of matrixResults) {
                        attendingReply += `- **${mr.record.caption}** [${mr.record.archetype || 'Figure'}]\n`;
                      }
                      attendingReply += `\n`;
                    }

                    setStudyChatHistory(prev => {
                      return prev.map(msg => {
                        if (msg.id === attendingMsgId) {
                          return { ...msg, text: attendingReply };
                        }
                        return msg;
                      });
                    });

                  } else {
                    setIsStudyTyping(false);
                    setStudyChatHistory(prev => [
                      ...prev,
                      { id: `study-att-${Date.now()}`, sender: 'attending', text: localReply, timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m` }
                    ]);
                  }
                } else {
                  setIsStudyTyping(false);
                  setStudyChatHistory(prev => [
                    ...prev,
                    { id: `study-att-${Date.now()}`, sender: 'attending', text: localReply, timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m` }
                  ]);
                }
              } catch (err) {
                console.error('Board study Gemini synthesis failed:', err);
                setIsStudyTyping(false);
                setStudyChatHistory(prev => [
                  ...prev,
                  { id: `study-att-${Date.now()}`, sender: 'attending', text: localReply + `\n\n💡 *Tip: Gemini synthesis failed (${err.message}).*`, timestamp: formatTime ? formatTime(time) : `${Math.floor(time / 60)}m` }
                ]);
              } finally {
                setTimeout(() => studyEndRef.current?.scrollIntoView?.({ behavior: 'smooth' }), 100);
              }
            }} className="p-3 border-t border-white/5 bg-slate-950/60 flex gap-2 shrink-0">
              <input
                type="text"
                value={studyInput}
                onChange={(e) => setStudyInput(e.target.value)}
                placeholder="Ask Attending anything (e.g. 'explain MAC')…"
                className="flex-1 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-205 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono"
                disabled={isStudyTyping}
              />
              <button
                type="submit"
                disabled={isStudyTyping || !studyInput.trim()}
                className="px-3 py-2 glass-button glass-button-amber disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center active:scale-95 shadow-lg shadow-amber-950/20"
              >
                <ChevronRight size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
 
      {/* Comprehensive Audit Consult Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-mono">
          <div className="glass-panel glass-amber rounded-2xl p-6 md:p-8 max-w-2xl shadow-[0_0_30px_rgba(245,158,11,0.15)] w-full max-h-[85vh] overflow-y-auto flex flex-col gap-4 custom-scrollbar text-white">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <Award className="text-amber-400" size={24} />
                <div>
                  <h2 className="text-lg font-black tracking-wide text-slate-100 uppercase font-mono">Attending Consult Audit</h2>
                  <p className="text-[10px] text-amber-400 mt-0.5 font-mono">Physiological diagnostic audit & pharmacological review</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>
 
            {/* Quick Patient Snapshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-[10px] text-slate-400">
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Patient Class</span>
                <span className="font-bold text-slate-200 text-xs">{patient?.name || 'Custom Subject'} (ASA {patient?.asaStatus || 'I'})</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Spirometric FRC</span>
                <span className="font-bold text-amber-400 text-xs">{(patient?.lungVolumes?.frc_L || 2.4).toFixed(2)} L</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Oxygen Buffer</span>
                <span className="font-bold text-emerald-400 text-xs">{(patient?.oxygenBuffer || 0.5).toFixed(2)} L O2 ({Math.round(frcO2Percent)}%)</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Ischemic Damage</span>
                <span className="font-bold text-yellow-500 text-xs">{Math.round(patient?.ischemicDamage || 0)} / {patient?.arrestThreshold || 1200}</span>
              </div>
            </div>
 
            {/* Detailed Clinical Findings */}
            <div className="flex flex-col gap-3 my-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1 flex items-center gap-1.5">
                <BookOpen size={14} className="text-amber-400" /> Active Diagnostic Findings
              </h3>
              
              {fullAudit && fullAudit.length > 0 ? (
                fullAudit.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border text-[11px] leading-relaxed flex flex-col gap-2 ${
                      item.priority === 'CRITICAL' 
                        ? 'bg-red-950/30 border-red-500/40 text-red-200' 
                        : item.priority === 'WARNING' 
                        ? 'bg-yellow-950/20 border-yellow-500/40 text-yellow-200' 
                        : item.priority === 'SUGGESTION'
                        ? 'bg-emerald-950/20 border-emerald-600/30 text-emerald-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between shrink-0">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                        item.priority === 'CRITICAL' 
                          ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                          : item.priority === 'WARNING' 
                          ? 'bg-yellow-500/20 border-yellow-500/20 text-yellow-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{parseAndRenderText(item.message, handleActionClick)}</div>
                    {item.action && (
                      <div className="flex items-center gap-1.5 mt-1 border-t border-slate-800/40 pt-1.5 text-amber-300 font-bold text-[10px]">
                        <ArrowRight size={12} className="text-amber-400" />
                        <span>Recommended Action: {parseAndRenderText(item.action, handleActionClick)}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-xs italic text-center py-4">No significant cardiopulmonary or surgical hazards detected. Patient is stable under current anesthetic maintenance.</p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800 mt-2">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs rounded-lg transition"
              >
                Return to Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

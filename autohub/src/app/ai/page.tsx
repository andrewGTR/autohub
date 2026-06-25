"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import Link from "next/link";
import PageNavbar from "../../components/PageNavbar";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// ══════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════

interface BuyerProfile {
  budget: string;
  priority: string;
  usage: string;
  fuel_pref: string;
  body_pref: string;
  location: string;
  currency: string;
  questions_asked: number;
}

interface DamageArea {
  component: string;
  severity: string;
  description: string;
  repair_cost_min: number;
  repair_cost_max: number;
  is_internal: boolean;
}

interface InternalRisk {
  component: string;
  likelihood: string;
  reason: string;
  repair_cost_min: number;
  repair_cost_max: number;
}

interface DamageReport {
  safe_to_drive: boolean;
  overall_severity: string;
  damage_areas: DamageArea[];
  internal_risks: InternalRisk[];
  total_cost_min: number;
  total_cost_max: number;
  priority_actions: string[];
  message: string;
}

interface Message {
  id: number | string;
  role: "user" | "bot";
  type: "text" | "typing" | "upload-zone" | "result-card" | "chips" | "image"
      | "damage-card" | "options" | "intent-picker" | "system-note" | "clarify";
  content?: string;
  imageSrc?: string;
  chips?: string[];
  resultData?: any;
  resultStatus?: string;
  resultScore?: number;
  damageData?: DamageReport;
  options?: string[];
  intentActions?: { label: string; prompt: string; isDamage?: boolean; danger?: boolean }[];
  isRtl?: boolean;
  isStreaming?: boolean;
  time: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  carCtx?: { brand?: string; model?: string; generation?: string; color?: string } | null;
  buyerMode?: boolean;
  buyerProfile?: BuyerProfile;
}

// ══════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════

const API_BASE = "/api/ai";

const ARABIC_RE = /[\u0600-\u06FF]/;
const detectLang = (text: string): 'ar' | 'en' => ARABIC_RE.test(text) ? 'ar' : 'en';
const isArabic = (text: string): boolean => ARABIC_RE.test(text);

// Intent detection regex patterns from the report
const BUY_RE = /\b(want to buy|looking for a car|need a car|buy a car|help me (choose|find|pick)|recommend|suggest|which car|what car should|car for me|best car for)\b/i;
const BUY_AR_RE = /(?:عايز|عاوز|محتاج|ابغى|ابي|أبغى|أبي)\s*(?:اشتري|أشتري|سيارة|عربية|car)/i;
const BUY_AR_RE2 = /(?:شراء سيارة|انصحني بسيارة|ترشحلي|ترشح لي|تنصحني|رشحلي|رشح لي)/i;
const COMPARE_RE = /\b(compare|vs|versus|difference between|better)\b/i;
const COMPARE_AR_RE = /(?:قارن|مقارنة|الفرق بين|ايهما|أيهما)/i;

const SEVERITY_EMOJI: Record<string, string> = {
  minor: '', moderate: '', severe: '', critical: ''
};

const LIKELIHOOD_EMOJI: Record<string, string> = {
  likely: '', possible: '', unlikely: ''
};

const CAR_INTENTS = [
  { emoji: '', label: 'Identify this car', prompt: 'Identify this car — what is the brand, model, year and generation?' },
  { emoji: '', label: 'Full specs', prompt: 'Give me the full specs of this car — engine, power, dimensions and fuel type.' },
  { emoji: '', label: 'Is it worth buying?', prompt: 'Is this car worth buying? Give me reliability, value and what to check.' },
  { emoji: '', label: 'Common problems', prompt: 'What are the common problems and known issues with this car?' },
  { emoji: '', label: 'Price & market value', prompt: 'What is the current market value and price range for this car?' },
  { emoji: '', label: 'Maintenance tips', prompt: 'What are the maintenance tips, service intervals and running costs for this car?' },
];

const DAMAGE_INTENTS = [
  { emoji: '', label: 'Full damage report', prompt: '__DAMAGE_FULL__', isDamage: true },
  { emoji: '', label: 'Is it safe to drive?', prompt: 'Focus only on whether this car is safe to drive.', isDamage: true, danger: true },
  { emoji: '', label: 'Repair cost estimate', prompt: 'Focus on repair cost estimation for all visible damage.', isDamage: true },
  { emoji: '', label: 'Hidden & internal', prompt: 'Focus on hidden and internal damage that might not be visible.', isDamage: true },
  { emoji: '', label: 'Should I buy this?', prompt: 'Assess whether this car is worth buying given the damage.', isDamage: true },
  { emoji: '', label: 'Quick summary', prompt: 'Give a brief 2-3 sentence summary of the key damage only.', isDamage: true },
];

const DEFAULT_BUYER_PROFILE: BuyerProfile = {
  budget: '', priority: '', usage: '', fuel_pref: '', body_pref: '',
  location: '', currency: 'USD', questions_asked: 0,
};

const cleanMarkdown = (text: string) => {
  if (!text) return "";
  let clean = text.replace(/\|\s*[\r\n]+\s*[\r\n]+\s*\|/g, '|\n|');
  clean = clean.replace(/([^\n])\n\|/g, '$1\n\n|');
  return clean;
};

// ══════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════

export default function AiPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pendingImageB64, setPendingImageB64] = useState<string | null>(null);
  const [pendingImageType, setPendingImageType] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userLang, setUserLang] = useState<'ar' | 'en'>('en');
  const [userLocation, setUserLocation] = useState('');
  const [inputDir, setInputDir] = useState<'ltr' | 'rtl'>('ltr');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("autohub_token") : null;

  /** User-scoped key for the localStorage chat fallback.  Returns null for guests. */
  const chatStorageKey = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("autohub_user");
      const parsed = stored ? JSON.parse(stored) : null;
      const uid: string | undefined = parsed?.id;
      return uid ? `turboBotSessions_${uid}` : null;
    } catch {
      return null;
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Check login status on mount and when the window regains focus
  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(!!getToken());
    checkAuth();
    window.addEventListener("focus", checkAuth);
    return () => window.removeEventListener("focus", checkAuth);
  }, []);

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const initMsgs: Message[] = [
    {
      id: "init-1",
      role: "bot",
      type: "text",
      content: `Hi! I'm <strong>Turbo Bot</strong> — your AI car expert.<br><br>Upload a car photo and I'll identify the make, model, generation, and full specs. Or just ask me anything about a car!`,
      time: now(),
    },
    {
      id: "init-2",
      role: "bot",
      type: "upload-zone",
      time: now(),
    },
    {
      id: "init-3",
      role: "bot",
      type: "chips",
      chips: ["What are the pros of the Alfa Romeo 156?", "Tell me about the BMW E90", "Compare Giulietta vs 147"],
      time: now(),
    }
  ];

  // Fetch conversations whenever auth status changes.
  useEffect(() => {
    if (!isLoggedIn) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    setSessions([]);
    setActiveSessionId(null);

    const fetchConversations = async () => {
      try {
        const res = await fetch(`${API_BASE}/conversations`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          const list = data?.data ?? data;
          if (Array.isArray(list) && list.length > 0) {
            setSessions(list);
            setActiveSessionId(list[0].id);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch remote conversations, falling back to local state.", err);
      }

      const key = chatStorageKey();
      if (key) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
            return;
          }
        } catch { /* ignore */ }
      }
      startNewChat();
    };

    fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Sync to user-scoped localStorage as a fallback backup
  useEffect(() => {
    const key = chatStorageKey();
    if (!key || sessions.length === 0) return;
    try {
      localStorage.setItem(key, JSON.stringify(sessions));
    } catch { /* quota exceeded — ignore */ }
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeMessages = activeSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, isTyping, activeSessionId]);

  const updateActiveSessionMessages = useCallback((updater: (prevMsgs: Message[]) => Message[], titleToSet?: string) => {
    setSessions(prev => {
      if (!activeSessionId) return prev;
      
      const sessionIndex = prev.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prev;
      
      const newSessions = [...prev];
      const session = newSessions[sessionIndex];
      
      newSessions[sessionIndex] = {
        ...session,
        messages: updater(session.messages),
        updatedAt: Date.now(),
        title: titleToSet || session.title
      };
      
      return newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, [activeSessionId]);

  const updateActiveSession = useCallback((updater: (s: ChatSession) => ChatSession) => {
    setSessions(prev => {
      if (!activeSessionId) return prev;
      const idx = prev.findIndex(s => s.id === activeSessionId);
      if (idx === -1) return prev;
      const newSessions = [...prev];
      newSessions[idx] = updater(newSessions[idx]);
      return newSessions;
    });
  }, [activeSessionId]);

  const startNewChat = async () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId, title: "New Chat", messages: initMsgs, updatedAt: Date.now(),
      carCtx: null, buyerMode: false, buyerProfile: { ...DEFAULT_BUYER_PROFILE },
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);

    try {
      await fetch(`${API_BASE}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ title: "New Chat" })
      });
    } catch (e) {
      console.warn("Failed to sync new chat to remote API", e);
    }
  };

  const switchSession = async (id: string) => {
    setActiveSessionId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);

    try {
      const res = await fetch(`${API_BASE}/conversations/${id}/messages`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const remoteMessages = await res.json();
        if (remoteMessages && remoteMessages.length > 0) {
          setSessions(prev => {
            const idx = prev.findIndex(s => s.id === id);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], messages: remoteMessages };
            return updated;
          });
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote messages for session", id);
    }
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (id === activeSessionId) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          startNewChat();
        }
      }
      return filtered;
    });

    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    } catch (e) {
      console.warn("Failed to delete session on remote API", e);
    }
  };

  // ══════════════════════════════════════════
  // BUILDERS
  // ══════════════════════════════════════════

  const buildCompareTable = (cars: any[], summary: string) => {
    if (!cars?.length) return '';
    const fields = [
      { key: 'price_range', label: 'Price Range' },
      { key: 'engine', label: 'Engine' },
      { key: 'fuel', label: 'Fuel' },
      { key: 'reliability', label: 'Reliability' },
      { key: 'pros', label: 'Pros', cls: 'compare-pros' },
      { key: 'cons', label: 'Cons', cls: 'compare-cons' },
      { key: 'verdict', label: 'Best for', rowCls: 'compare-verdict-row' },
    ];
    
    const thead = `<tr><th class="compare-row-label"></th>${cars.map(c => `<th class="compare-car-col">${c.name || '?'}</th>`).join('')}</tr>`;
    
    const tbody = fields.map(f => {
      const cells = cars.map(c => `<td class="compare-cell ${f.cls || ''}">${String(c[f.key] || '—').replace(/•/g, '\n<br>•')}</td>`).join('');
      return `<tr class="${f.rowCls || ''}"><td class="compare-field-label">${f.label}</td>${cells}</tr>`;
    }).join('');
    
    return `<div class="compare-wrap">
      <div class="compare-scroll"><table class="compare-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>
      ${summary ? `<div class="compare-summary">${summary}</div>` : ''}
    </div>`;
  };

  // ══════════════════════════════════════════
  // INTENT PICKER
  // ══════════════════════════════════════════

  const handleIntentPickerClick = (prompt: string, isDamage: boolean) => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;

    // Find the stored pending image from the last image message
    const lastImageMsg = [...session.messages].reverse().find(m => m.type === "image");
    const imgSrc = lastImageMsg?.imageSrc;

    if (!imgSrc) return;

    // Extract b64 from data URI
    const b64 = imgSrc.split(',')[1];
    const mimeMatch = imgSrc.match(/data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    if (isDamage && prompt === '__DAMAGE_FULL__') {
      handleDamageAnalysis(b64, mime, '');
    } else if (isDamage) {
      handleDamageAnalysis(b64, mime, prompt);
    } else if (prompt.startsWith('Identify this car')) {
      // Use the analyze-image endpoint (image-only path) which returns
      // structured data (brand, model, confidence, etc.) for the result card
      triggerSend('', b64, mime);
    } else {
      triggerSend(prompt, b64, mime);
    }
  };

  // ══════════════════════════════════════════
  // DAMAGE ANALYSIS
  // ══════════════════════════════════════════

  const handleDamageAnalysis = async (b64: string, imgType: string, description: string) => {
    setIsTyping(true);

    try {
      const res = await fetch(`data:${imgType};base64,${b64}`);
      const blob = await res.blob();
      const form = new FormData();
      form.append('image', blob, 'damage.jpg');
      form.append('description', description || '');
      form.append('conversationId', activeSessionId || '');

      const resp = await fetch(`/api/ai/damage`, { method: 'POST', headers: getAuthHeaders(), body: form });
      const result = await resp.json();
      console.log('=== DAMAGE API RAW RESPONSE ===', JSON.stringify(result, null, 2));
      setIsTyping(false);

      if (!resp.ok || result.success === false) {
        const errMsg = handleApiError(resp.status, result.message || 'Failed to analyze damage.');
        updateActiveSessionMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", type: "text", content: errMsg, time: now() }]);
        return;
      }

      const data: DamageReport = result.data?.report || result.data || result;

      // If there's a narrative message, show it first
      if (data.message) {
        updateActiveSessionMessages(prev => [...prev,
          { id: Date.now().toString(), role: "bot", type: "text", content: data.message, isRtl: isArabic(data.message), time: now() },
          { id: (Date.now() + 1).toString(), role: "bot", type: "damage-card", damageData: data, time: now() },
        ]);
      } else {
        updateActiveSessionMessages(prev => [...prev,
          { id: Date.now().toString(), role: "bot", type: "damage-card", damageData: data, time: now() },
        ]);
      }
    } catch (e: any) {
      setIsTyping(false);
      updateActiveSessionMessages(prev => [...prev, {
        id: Date.now().toString(), role: "bot", type: "text",
        content: `Could not reach the damage analysis server.<br><small style="color:#aaa">${e.message}</small>`,
        time: now()
      }]);
    }
  };

  // ══════════════════════════════════════════
  // CHAT HANDLERS
  // ══════════════════════════════════════════

  const handleChipClick = (text: string) => {
    setInput(text);
    setTimeout(() => {
      triggerSend(text, pendingImageB64, pendingImageType);
    }, 0);
  };

  const handleOptionClick = (text: string) => {
    setInput('');
    triggerSend(text, null, null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      
      // Add the image message
      updateActiveSessionMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "user",
        type: "image",
        imageSrc: src,
        time: now()
      }]);

      // Show intent picker instead of auto-sending
      const ts = Date.now() + 1;
      updateActiveSessionMessages(prev => [...prev,
        {
          id: `${ts}-note`,
          role: "bot",
          type: "system-note",
          content: "What would you like me to do with this image?",
          time: now()
        },
        {
          id: `${ts}-picker-car`,
          role: "bot",
          type: "intent-picker",
          intentActions: CAR_INTENTS.map(i => ({ label: i.label, prompt: i.prompt })),
          content: "Car Analysis",
          time: now()
        },
        {
          id: `${ts}-picker-damage`,
          role: "bot",
          type: "intent-picker",
          intentActions: DAMAGE_INTENTS.map(i => ({
            label: i.label,
            prompt: i.prompt,
            isDamage: true,
            danger: i.danger,
          })),
          content: "Damage Assessment",
          time: now()
        }
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApiError = (status: number, fallbackMsg: string) => {
    if (status === 401 || status === 403) {
      return `Your session has expired. Please <a href="/login" style="color:#3a3aff;font-weight:600">log in again</a> to continue chatting.`;
    }
    return fallbackMsg;
  };

  // ══════════════════════════════════════════
  // SSE STREAMING
  // ══════════════════════════════════════════

  const tryStreamChat = async (text: string, session: ChatSession): Promise<boolean> => {
    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const history = session.messages
        .filter(m => m.type === 'text' && m.content)
        .slice(-14)
        .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content || '' }));

      const body = {
        question: text,
        message: text,
        conversationId: activeSessionId,
        history,
        car_context: session.carCtx || {},
        user_location: userLocation,
        user_lang: userLang,
        buyer_mode: session.buyerMode || false,
        buyer_profile: session.buyerProfile || DEFAULT_BUYER_PROFILE,
      };

      const resp = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) return false;

      const reader = resp.body?.getReader();
      if (!reader) return false;

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      const streamMsgId = `stream-${Date.now()}`;
      let isStreamingActive = true;

      // Add initial streaming message
      updateActiveSessionMessages(prev => [...prev, {
        id: streamMsgId,
        role: "bot",
        type: "text",
        content: '',
        isStreaming: true,
        isRtl: isArabic(text),
        time: now()
      }]);

      while (isStreamingActive) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.done) {
              isStreamingActive = false;
              // Handle non-chat intents from stream
              const intent = event.intent;
              const answer = event.answer || event.reply || accumulatedText;
              const finalRtl = isArabic(answer);

              if (intent === 'compare' && event.compare_data?.length >= 2) {
                const tableHtml = buildCompareTable(event.compare_data, answer);
                updateActiveSessionMessages(prev =>
                  prev.map(m => m.id === streamMsgId
                    ? { ...m, content: tableHtml, isStreaming: false, isRtl: finalRtl }
                    : m)
                );
              } else if (intent === 'clarify') {
                updateActiveSessionMessages(prev => {
                  const filtered = prev.filter(m => m.id !== streamMsgId);
                  return [...filtered,
                    { id: streamMsgId, role: "bot" as const, type: "clarify" as const, content: answer, isRtl: finalRtl, time: now() },
                    ...(event.options?.length ? [{
                      id: `${streamMsgId}-opts`, role: "bot" as const, type: "options" as const,
                      options: event.options, time: now()
                    }] : [])
                  ];
                });
              } else if (intent === 'buyer' || intent === 'recommend') {
                updateActiveSessionMessages(prev => {
                  const filtered = prev.filter(m => m.id !== streamMsgId);
                  const msgs: Message[] = [
                    { id: streamMsgId, role: "bot", type: "text", content: answer, isRtl: finalRtl, isStreaming: false, time: now() },
                  ];
                  if (event.options?.length) {
                    msgs.push({ id: `${streamMsgId}-opts`, role: "bot", type: "options", options: event.options, time: now() });
                  }
                  if (event.recommendations?.length) {
                    msgs.push({ id: `${streamMsgId}-chips`, role: "bot", type: "chips", chips: event.recommendations, time: now() });
                  }
                  // Update buyer state
                  if (event.buyer_mode !== undefined) {
                    updateActiveSession(s => ({ ...s, buyerMode: event.buyer_mode, buyerProfile: event.buyer_profile || s.buyerProfile }));
                  }
                  return [...filtered, ...msgs];
                });
              } else {
                // Normal chat done
                updateActiveSessionMessages(prev =>
                  prev.map(m => m.id === streamMsgId
                    ? { ...m, content: answer || accumulatedText, isStreaming: false, isRtl: finalRtl }
                    : m)
                );
              }

              // Add follow-up chips
              setTimeout(() => {
                updateActiveSessionMessages(prev => [...prev, {
                  id: `${streamMsgId}-chips`,
                  role: "bot", type: "chips",
                  chips: ["Tell me more", "What about reliability?", "Compare with similar cars"],
                  time: now()
                }]);
              }, 100);

              break;
            }

            if (event.token) {
              accumulatedText += event.token;
              const displayText = accumulatedText;
              updateActiveSessionMessages(prev =>
                prev.map(m => m.id === streamMsgId
                  ? { ...m, content: displayText }
                  : m)
              );
            }
          } catch { /* skip malformed events */ }
        }
      }

      setIsTyping(false);
      return true;
    } catch (e: any) {
      if (e.name === 'AbortError') return true;
      console.warn('Streaming failed, falling back to /chat', e);
      // Remove partial streaming message
      updateActiveSessionMessages(prev => prev.filter(m => !(m as any).isStreaming));
      return false;
    } finally {
      streamAbortRef.current = null;
    }
  };

  // ══════════════════════════════════════════
  // MAIN SEND
  // ══════════════════════════════════════════

  const triggerSend = async (text: string, b64: string | null, imgType: string | null) => {
    const hasImage = !!b64;
    if (!text && !hasImage) return;

    const currentSession = sessions.find(s => s.id === activeSessionId);
    const isFirstUserMessage = currentSession?.title === "New Chat";
    const newTitle = isFirstUserMessage && text ? (text.length > 25 ? text.substring(0, 25) + "..." : text) : undefined;
    const titleToSet = newTitle || (isFirstUserMessage && hasImage ? "Image Search" : undefined);

    // Detect language
    if (text) {
      const lang = detectLang(text);
      setUserLang(lang);
    }

    if (text) {
      const msgIsRtl = isArabic(text);
      updateActiveSessionMessages(prev => [...prev, {
        id: Date.now().toString(), role: "user", type: "text", content: text, isRtl: msgIsRtl, time: now()
      }], titleToSet);
    }

    setInput("");
    setIsTyping(true);

    try {
      if (hasImage && !text) {
        // IMAGE ONLY — this path is used by intent picker clicks
        const res = await fetch(`data:${imgType};base64,${b64}`);
        const blob = await res.blob();
        const form = new FormData();
        form.append('image', blob, 'car.jpg');
        form.append('conversationId', activeSessionId || '');

        const resp = await fetch(`/api/ai/analyze-image`, { method: 'POST', headers: getAuthHeaders(), body: form });
        const result = await resp.json();
        console.log('=== ANALYZE-IMAGE API RAW RESPONSE ===', JSON.stringify(result, null, 2));
        setIsTyping(false);

        if (!resp.ok || result.success === false) {
          const errMsg = handleApiError(resp.status, result.message || 'Failed to analyze image.');
          updateActiveSessionMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", type: "text", content: errMsg, time: now() }]);
          return;
        }

        const data = result.data || result;
        const details = data.analysis || data.details || {};
        if (details.yearRange && !details.year) details.year = details.yearRange;
        if (details.bodyType && !details.body) details.body = details.bodyType;
        const score = details.confidence || data.fusion_score || data.clip_score || 0;
        const msgText = details.description || data.message || data.reply || data.answer || 'Here is what I found:';

        // Save car context
        if (details.brand || details.model) {
          updateActiveSession(s => ({
            ...s,
            carCtx: { brand: details.brand, model: details.model, generation: details.generation, color: details.color }
          }));
        }

        updateActiveSessionMessages(prev => [
          ...prev,
          { id: Date.now().toString(), role: "bot", type: "text", content: msgText, isRtl: isArabic(msgText), time: now() },
          { id: (Date.now() + 1).toString(), role: "bot", type: "result-card", resultData: details, resultStatus: data.status, resultScore: score, time: now() },
          { id: (Date.now() + 2).toString(), role: "bot", type: "chips", chips: ["Tell me more about the engine", "What's the reliability like?", "Compare with similar cars", "What's the price range?"], time: now() }
        ]);

      } else if (hasImage && text) {
        // IMAGE + TEXT (from intent picker)
        const res = await fetch(`data:${imgType};base64,${b64}`);
        const blob = await res.blob();
        const form = new FormData();
        form.append('image', blob, 'car.jpg');
        form.append('message', text);
        form.append('conversationId', activeSessionId || '');

        const resp = await fetch(`/api/ai/chat-with-image`, { method: 'POST', headers: getAuthHeaders(), body: form });
        const result = await resp.json();
        setIsTyping(false);

        if (!resp.ok || result.success === false) {
          const errMsg = handleApiError(resp.status, result.message || 'Sorry, I could not get an answer.');
          updateActiveSessionMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", type: "text", content: errMsg, time: now() }]);
          return;
        }

        const data = result.data || result;
        let msgText = data.reply || data.answer || data.message || 'Sorry, I could not get an answer.';
        msgText = cleanMarkdown(msgText);

        // If identify was part of this and we got details, save context
        const details = data.analysis || data.details;
        if (details?.brand || details?.model) {
          updateActiveSession(s => ({
            ...s,
            carCtx: { brand: details.brand, model: details.model, generation: details.generation, color: details.color }
          }));
        }

        const resultMsgs: Message[] = [
          { id: Date.now().toString(), role: "bot", type: "text", content: msgText, isRtl: isArabic(msgText), time: now() },
        ];

        // If there's a result card from identification
        if (details && (details.brand || details.model)) {
          if (details.yearRange && !details.year) details.year = details.yearRange;
          if (details.bodyType && !details.body) details.body = details.bodyType;
          const score = details.confidence || data.fusion_score || data.clip_score || 0;
          resultMsgs.push({
            id: (Date.now() + 1).toString(), role: "bot", type: "result-card",
            resultData: details, resultStatus: data.status, resultScore: score, time: now()
          });
        }

        resultMsgs.push({
          id: (Date.now() + 2).toString(), role: "bot", type: "chips",
          chips: ["Tell me more", "What about reliability?", "Compare with similar cars"], time: now()
        });

        updateActiveSessionMessages(prev => [...prev, ...resultMsgs]);

      } else {
        // TEXT ONLY — try streaming first, fallback to regular
        const sessionSnap = sessions.find(s => s.id === activeSessionId);
        if (sessionSnap) {
          const streamed = await tryStreamChat(text, sessionSnap);
          if (streamed) return;
        }

        // Fallback: regular /chat
        const history = (sessionSnap?.messages || [])
          .filter(m => m.type === 'text' && m.content)
          .slice(-14)
          .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content || '' }));

        const chatBody: any = {
          question: text,
          message: text,
          conversationId: activeSessionId,
          history,
          car_context: sessionSnap?.carCtx || {},
          user_location: userLocation,
          user_lang: userLang,
          buyer_mode: sessionSnap?.buyerMode || false,
          buyer_profile: sessionSnap?.buyerProfile || DEFAULT_BUYER_PROFILE,
        };

        const resp = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(chatBody)
        });
        const result = await resp.json();
        setIsTyping(false);

        if (!resp.ok || result.success === false) {
          const errMsg = handleApiError(resp.status, result.message || 'Sorry, I could not get an answer.');
          updateActiveSessionMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", type: "text", content: errMsg, time: now() }]);
          return;
        }

        const data = result.data || result;
        let msgText = data.reply || data.answer || data.message || 'Sorry, I could not get an answer.';
        const intent = result.intent || data.intent;
        msgText = cleanMarkdown(msgText);
        const msgRtl = isArabic(msgText);
        
        const newMsgs: Message[] = [];

        if (intent === 'compare' && (result.compare_data?.length >= 2 || data.compare_data?.length >= 2)) {
          const tableHtml = buildCompareTable(result.compare_data || data.compare_data, msgText);
          newMsgs.push({ id: Date.now().toString(), role: "bot", type: "text", content: tableHtml, isRtl: msgRtl, time: now() });
        } else if (intent === 'clarify') {
          newMsgs.push({ id: Date.now().toString(), role: "bot", type: "clarify", content: msgText, isRtl: msgRtl, time: now() });
          const opts = result.options || data.options;
          if (opts?.length) {
            newMsgs.push({ id: (Date.now() + 1).toString(), role: "bot", type: "options", options: opts, time: now() });
          }
        } else if (intent === 'buyer' || intent === 'recommend') {
          newMsgs.push({ id: Date.now().toString(), role: "bot", type: "text", content: msgText, isRtl: msgRtl, time: now() });
          const opts = result.options || data.options;
          if (opts?.length) {
            newMsgs.push({ id: (Date.now() + 1).toString(), role: "bot", type: "options", options: opts, time: now() });
          }
          const recs = result.recommendations || data.recommendations;
          if (recs?.length) {
            newMsgs.push({ id: (Date.now() + 2).toString(), role: "bot", type: "chips", chips: recs, time: now() });
          }
          // Update buyer state
          if (result.buyer_mode !== undefined || data.buyer_mode !== undefined) {
            updateActiveSession(s => ({
              ...s,
              buyerMode: result.buyer_mode ?? data.buyer_mode ?? s.buyerMode,
              buyerProfile: result.buyer_profile || data.buyer_profile || s.buyerProfile,
            }));
          }
          if (result.user_location || data.user_location) {
            setUserLocation(result.user_location || data.user_location);
          }
        } else {
          // Normal chat
          newMsgs.push({ id: Date.now().toString(), role: "bot", type: "text", content: msgText, isRtl: msgRtl, time: now() });
          newMsgs.push({ id: (Date.now() + 1).toString(), role: "bot", type: "chips", chips: ["Tell me more", "What about reliability?", "Compare with similar cars"], time: now() });
        }

        // Echo back user_lang / user_location if returned
        if (result.user_lang || data.user_lang) setUserLang(result.user_lang || data.user_lang);
        if (result.user_location || data.user_location) setUserLocation(result.user_location || data.user_location);

        updateActiveSessionMessages(prev => [...prev, ...newMsgs]);
      }
    } catch (e: any) {
      setIsTyping(false);
      updateActiveSessionMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        type: "text",
        content: `Could not reach the Turbo Bot server.<br><small style="color:#aaa">${e.message}</small>`,
        time: now()
      }]);
    }

    setPendingImageB64(null);
    setPendingImageType(null);
  };

  const handleSend = () => {
    triggerSend(input.trim(), pendingImageB64, pendingImageType);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle input direction for Arabic
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.length > 0) {
      setInputDir(isArabic(val) ? 'rtl' : 'ltr');
    } else {
      setInputDir('ltr');
    }
  };

  // ── Auth gate ───────────────────────────────────────────────
  if (isLoggedIn === null) {
    return (
      <main>
        <PageNavbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", background: "var(--surface)" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="ai-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main>
        <PageNavbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", background: "var(--surface)", padding: "20px" }}>
          <div style={{ background: "var(--card)", borderRadius: "20px", padding: "48px 40px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", border: "1px solid var(--border)" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3a3aff" strokeWidth="1.8">
                <path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h1l2-4h12l2 4h1a2 2 0 012 2v4a2 2 0 01-2 2h-2"/>
                <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
                <path d="M7.5 17.5h9"/>
              </svg>
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#1a1a1a", margin: "0 0 10px" }}>Welcome to Turbo Bot</h2>
            <p style={{ fontSize: "14px", color: "#888", lineHeight: "1.6", margin: "0 0 28px" }}>
              Your AI car expert. Identify any car from a photo, get specs, compare models, and ask anything about cars — all powered by AI.
            </p>
            <p style={{ fontSize: "13px", color: "#aaa", margin: "0 0 24px" }}>
              Please log in to start chatting.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link href="/login" style={{ display: "inline-block", padding: "12px 28px", background: "var(--primary)", color: "var(--background)", borderRadius: "10px", fontWeight: "600", fontSize: "14px", textDecoration: "none", transition: "background 0.2s" }}>
                Log In
              </Link>
              <Link href="/signup" style={{ display: "inline-block", padding: "12px 28px", background: "#f0f0f0", color: "#1a1a1a", borderRadius: "10px", fontWeight: "600", fontSize: "14px", textDecoration: "none" }}>
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }
  // ── End auth gate ────────────────────────────────────────────

  return (
    <main>
      <PageNavbar />

      <div className="ai-wrapper">
        <div className={`ai-sidebar-overlay ${isSidebarOpen ? "open" : ""}`} onClick={() => setIsSidebarOpen(false)}></div>
        
        <div className={`ai-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <button className="ai-new-chat-btn" onClick={startNewChat}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Chat
          </button>
          
          <div className="ai-history-list">
            <h3 className="ai-history-title">Recent Chats</h3>
            {sessions.length === 0 ? (
              <div style={{ padding: "0 14px", color: "#888", fontSize: "13px" }}>No recent chats.</div>
            ) : (
              sessions.map(session => (
                <div 
                  key={session.id} 
                  className={`ai-history-item ${session.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => switchSession(session.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chat-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span className="chat-title">{session.title}</span>
                  <button className="chat-delete-btn" onClick={(e) => deleteSession(e, session.id)} title="Delete chat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ai-app">
          <div className="ai-header">
            <button className="ai-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="ai-page-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3a3aff" strokeWidth="1.8">
                <path d="M5 17H3a2 2 0 01-2-2v-4a2 2 0 012-2h1l2-4h12l2 4h1a2 2 0 012 2v4a2 2 0 01-2 2h-2"/>
                <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
                <path d="M7.5 17.5h9"/>
              </svg>
            </div>
            <div>
              <h1>Turbo Bot — AI Car Identifier</h1>
              <p>Upload a photo or ask anything about a car</p>
            </div>
          </div>

          <div className="ai-messages">
            {activeMessages.map(msg => (
              <div key={msg.id} className={`ai-msg ${msg.role}`}>
                
                {/* TEXT */}
                {msg.type === "text" && (
                  <>
                    <div className="ai-bubble" dir={msg.isRtl ? "rtl" : undefined}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          table: ({node, className, ...props}) => {
                            return (
                              <div className="compare-wrap">
                                <div className="compare-scroll">
                                  <table className={`compare-table ${className || ''}`} {...props} />
                                </div>
                              </div>
                            );
                          },
                          thead: ({node, className, ...props}) => <thead className={className} {...props} />,
                          tr: ({node, className, ...props}) => <tr className={className} {...props} />,
                          th: ({node, className, ...props}) => <th className={className} {...props} />,
                          td: ({node, className, ...props}) => <td className={className} {...props} />
                        }}
                      >
                        {cleanMarkdown(msg.content || "")}
                      </ReactMarkdown>
                      {msg.isStreaming && <span className="ai-cursor">▋</span>}
                    </div>
                    <span className="ai-msg-time">{msg.time}</span>
                  </>
                )}

                {/* CLARIFY */}
                {msg.type === "clarify" && (
                  <>
                    <div className="ai-bubble clarify" dir={msg.isRtl ? "rtl" : undefined}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {cleanMarkdown(msg.content || "")}
                      </ReactMarkdown>
                    </div>
                    <span className="ai-msg-time">{msg.time}</span>
                  </>
                )}

                {/* IMAGE */}
                {msg.type === "image" && (
                  <>
                    <div className="ai-bubble" style={{ padding: "8px" }}>
                      <img loading="lazy" src={msg.imageSrc} style={{ maxWidth: "220px", borderRadius: "10px", display: "block" }} alt="Car" />
                    </div>
                    <span className="ai-msg-time">{msg.time}</span>
                  </>
                )}

                {/* UPLOAD ZONE */}
                {msg.type === "upload-zone" && (
                  <div className="ai-bubble" style={{ padding: "8px" }}>
                    <div className="ai-upload-zone" onClick={() => fileInputRef.current?.click()}>
                      <div className="up-icon"></div>
                      <p>Click to upload a car photo</p>
                      <p style={{ fontSize: "11px", marginTop: "4px", color: "#aaa" }}>JPG, PNG, WEBP — max 20 MB</p>
                    </div>
                  </div>
                )}

                {/* CHIPS */}
                {msg.type === "chips" && msg.chips && (
                  <div className="ai-bubble" style={{ padding: "10px 14px" }}>
                    <div className="chip-row">
                      {msg.chips.map((c, i) => (
                        <button key={i} className="ai-chip" onClick={() => handleChipClick(c)}>{c}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* OPTIONS (Buyer Advisor A/B/C/D) */}
                {msg.type === "options" && msg.options && (
                  <div className="ai-bubble" style={{ padding: "10px 14px" }}>
                    <div className="ai-options-grid">
                      {msg.options.map((opt, i) => (
                        <button key={i} className="ai-option-btn" onClick={() => handleOptionClick(opt)}>
                          <span className="ai-option-letter">{String.fromCharCode(65 + i)}</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* INTENT PICKER */}
                {msg.type === "intent-picker" && msg.intentActions && (
                  <div className="ai-bubble" style={{ padding: "12px 14px" }}>
                    <div className="intent-picker-label">{msg.content}</div>
                    <div className="intent-picker-grid">
                      {msg.intentActions.map((action, i) => (
                        <button
                          key={i}
                          className={`intent-picker-btn ${action.danger ? 'danger' : ''}`}
                          onClick={() => handleIntentPickerClick(action.prompt, !!action.isDamage)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SYSTEM NOTE */}
                {msg.type === "system-note" && (
                  <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                    <div className="ai-system-note">{msg.content}</div>
                  </div>
                )}

                {/* RESULT CARD */}
                {msg.type === "result-card" && msg.resultData && (
                  <>
                    <div className="ai-bubble" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                      <div className="result-card-v2">
                        {/* Status badge */}
                        <div className="rc-badge-row">
                          {msg.resultStatus === 'unknown' ? <span className="rc-badge rc-badge-web">Web Match</span> : 
                           msg.resultStatus === 'uncertain' ? <span className="rc-badge rc-badge-uncertain">Possible Match</span> : 
                           <span className="rc-badge rc-badge-identified">Identified</span>}
                        </div>

                        {/* Car name */}
                        <h3 className="rc-car-name">{msg.resultData.brand || '?'} {msg.resultData.model || '?'}</h3>

                        {/* Confidence bar */}
                        <div className="rc-confidence-track">
                          <div
                            className={`rc-confidence-fill ${(msg.resultScore || 0) >= 0.88 ? 'rc-conf-high' : (msg.resultScore || 0) >= 0.75 ? 'rc-conf-med' : 'rc-conf-low'}`}
                            style={{ width: `${Math.round((msg.resultScore || 0) * 100)}%` }}
                          />
                        </div>
                        <p className="rc-confidence-label">Confidence: {Math.round((msg.resultScore || 0) * 100)}%</p>

                        {/* Spec rows */}
                        <div className="rc-specs">
                          {msg.resultData.generation && msg.resultData.generation !== '---' && (
                            <div className="rc-spec-row"><span className="rc-spec-key">Generation</span><span className="rc-spec-val">{msg.resultData.generation}</span></div>
                          )}
                          {msg.resultData.year && msg.resultData.year !== '---' && (
                            <div className="rc-spec-row"><span className="rc-spec-key">Year Range</span><span className="rc-spec-val">{msg.resultData.year}</span></div>
                          )}
                          {msg.resultData.engine && msg.resultData.engine !== '---' && (
                            <div className="rc-spec-row"><span className="rc-spec-key">Engine / Power</span><span className="rc-spec-val">{msg.resultData.engine}</span></div>
                          )}
                          {msg.resultData.body && msg.resultData.body !== '---' && (
                            <div className="rc-spec-row"><span className="rc-spec-key">Body / Fuel</span><span className="rc-spec-val">{msg.resultData.body}</span></div>
                          )}
                          {msg.resultData.color && (
                            <div className="rc-spec-row"><span className="rc-spec-key">Color</span><span className="rc-spec-val">{msg.resultData.color}</span></div>
                          )}
                        </div>

                        {/* Pros / Cons */}
                        <div className="rc-pros-cons">
                          <div className="rc-pc pros">
                            <span className="rc-pc-label pros-label">PROS</span>
                            <span className="rc-pc-text">{msg.resultData.pros && msg.resultData.pros !== '---' && msg.resultData.pros !== 'Not_Available' ? msg.resultData.pros : 'Not available yet'}</span>
                          </div>
                          <div className="rc-pc cons">
                            <span className="rc-pc-label cons-label">CONS</span>
                            <span className="rc-pc-text">{msg.resultData.cons && msg.resultData.cons !== '---' && msg.resultData.cons !== 'Not_Available' ? msg.resultData.cons : 'Not available yet'}</span>
                          </div>
                        </div>

                        {/* Find on AutoHub */}
                        {(msg.resultData.brand || msg.resultData.model) && (
                          <a
                            href={`/search?q=${encodeURIComponent(`${msg.resultData.brand || ''} ${msg.resultData.model || ''}`.trim())}`}
                            className="rc-find-btn"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            Find on AutoHub
                          </a>
                        )}
                      </div>
                    </div>
                    <span className="ai-msg-time">{msg.time}</span>
                  </>
                )}

                {/* DAMAGE CARD */}
                {msg.type === "damage-card" && msg.damageData && (
                  <>
                    <div className="ai-bubble" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px' }}>
                      <div className="damage-card">
                        {/* Severity banner */}
                        <div className={`damage-severity-banner ${msg.damageData.overall_severity}`}>
                          {msg.damageData.overall_severity?.toUpperCase()} DAMAGE
                        </div>

                        {/* Do not drive warning */}
                        {!msg.damageData.safe_to_drive && (
                          <div className="damage-badge damage-danger">
                            DO NOT DRIVE — Safety risk detected
                          </div>
                        )}

                        <div className="damage-body">
                          {/* Damage areas */}
                          {msg.damageData.damage_areas?.length > 0 && (
                            <>
                              <div className="damage-section-title">Visible Damage</div>
                              {msg.damageData.damage_areas.map((area, i) => (
                                <div key={i} className="damage-area-item">
                                  <div className="damage-area-info">
                                    <div className="damage-area-name">
                                      <span className={`damage-severity-badge ${area.severity}`}>{area.severity}</span>
                                      {area.component}
                                    </div>
                                    <div className="damage-area-desc">{area.description}</div>
                                  </div>
                                  <div className="damage-area-cost">${area.repair_cost_min?.toLocaleString()} – ${area.repair_cost_max?.toLocaleString()}</div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Internal risks */}
                          {msg.damageData.internal_risks?.length > 0 && (
                            <>
                              <div className="damage-section-title">Suspected Internal Damage</div>
                              {msg.damageData.internal_risks.map((risk, i) => (
                                <div key={i} className="damage-internal-item">
                                  <div className="damage-area-info">
                                    <div className="damage-area-name">
                                      <span className={`damage-likelihood-badge ${risk.likelihood}`}>
                                        {risk.likelihood}
                                      </span>
                                      {risk.component}
                                    </div>
                                    <div className="damage-area-desc">{risk.reason}</div>
                                  </div>
                                  <div className="damage-area-cost">${risk.repair_cost_min?.toLocaleString()} – ${risk.repair_cost_max?.toLocaleString()}</div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Total cost */}
                          <div className="damage-cost-range">
                            <div>
                              <div className="damage-cost-label">Estimated Total Cost</div>
                            </div>
                            <div className="damage-cost-value">
                              ${msg.damageData.total_cost_min?.toLocaleString()} – ${msg.damageData.total_cost_max?.toLocaleString()}
                            </div>
                          </div>

                          {/* Priority actions */}
                          {msg.damageData.priority_actions?.length > 0 && (
                            <>
                              <div className="damage-section-title">Priority Actions</div>
                              <ul className="damage-priority-list">
                                {msg.damageData.priority_actions.map((action, i) => (
                                  <li key={i}>
                                    <span className="damage-priority-num">{i + 1}</span>
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {/* Disclaimer */}
                          <div className="damage-disclaimer">
                            Internal damage estimates are based on mechanical inference — always get a professional workshop inspection.
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="ai-msg-time">{msg.time}</span>
                  </>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="ai-msg bot" id="typing-indicator">
                <div className="ai-bubble">
                  <div className="ai-typing">
                    <div className="ai-dot"></div>
                    <div className="ai-dot"></div>
                    <div className="ai-dot"></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-input-row">
            <div className="ai-input-inner">
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
              <button className="ai-img-btn" title="Upload car image" onClick={() => fileInputRef.current?.click()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              </button>
              <textarea
                className="ai-user-input"
                placeholder="Ask about a car or upload an image..."
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKey}
                dir={inputDir}
              ></textarea>
              <button className="ai-send-btn" onClick={handleSend} title="Send" disabled={isTyping || (!input.trim() && !pendingImageB64)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

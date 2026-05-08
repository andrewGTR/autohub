"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import PageNavbar from "../../components/PageNavbar";

interface Message {
  id: number | string;
  role: "user" | "bot";
  type: "text" | "typing" | "upload-zone" | "result-card" | "chips" | "image";
  content?: string;
  imageSrc?: string;
  chips?: string[];
  resultData?: any;
  resultStatus?: string;
  resultScore?: number;
  time: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const API_BASE = "https://graduation-project-autohub-production.up.railway.app/api/ai";

export default function AiPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pendingImageB64, setPendingImageB64] = useState<string | null>(null);
  const [pendingImageType, setPendingImageType] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  // isLoggedIn is used as the key dependency so that switching
  // accounts (which toggles isLoggedIn false → true) forces a
  // full reset of the sessions state.
  useEffect(() => {
    if (!isLoggedIn) {
      // Immediately clear any in-memory sessions when logged out
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    // Reset to empty before fetching so previous user's chats
    // are never briefly visible while the request is in-flight
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

      // Fallback to user-scoped localStorage only
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
    if (!key || sessions.length === 0) return; // never write for guests
    try {
      localStorage.setItem(key, JSON.stringify(sessions));
    } catch { /* quota exceeded — ignore */ }
  }, [sessions]);

  const activeMessages = sessions.find(s => s.id === activeSessionId)?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, isTyping, activeSessionId]);

  const updateActiveSessionMessages = (updater: (prevMsgs: Message[]) => Message[], titleToSet?: string) => {
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
  };

  const startNewChat = async () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = { id: newId, title: "New Chat", messages: initMsgs, updatedAt: Date.now() };
    
    // Optimistic UI update
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
    
    // Optimistic delete
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

  const handleChipClick = (text: string) => {
    setInput(text);
    setTimeout(() => {
      triggerSend(text, pendingImageB64, pendingImageType);
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const b64 = src.split(',')[1];
      
      updateActiveSessionMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "user",
        type: "image",
        imageSrc: src,
        time: now()
      }]);
      
      triggerSend("", b64, file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApiError = (status: number, fallbackMsg: string) => {
    if (status === 401 || status === 403) {
      return `🔒 Your session has expired. Please <a href="/login" style="color:#3a3aff;font-weight:600">log in again</a> to continue chatting.`;
    }
    return fallbackMsg;
  };

  const triggerSend = async (text: string, b64: string | null, imgType: string | null) => {
    const hasImage = !!b64;
    if (!text && !hasImage) return;

    const currentSession = sessions.find(s => s.id === activeSessionId);
    const isFirstUserMessage = currentSession?.title === "New Chat";
    const newTitle = isFirstUserMessage && text ? (text.length > 25 ? text.substring(0, 25) + "..." : text) : undefined;
    const titleToSet = newTitle || (isFirstUserMessage && hasImage ? "Image Search" : undefined);

    if (text) {
      updateActiveSessionMessages(prev => [...prev, { id: Date.now().toString(), role: "user", type: "text", content: text, time: now() }], titleToSet);
    }

    setInput("");
    setIsTyping(true);

    try {
      if (hasImage && !text) {
        // IMAGE ONLY
        const res = await fetch(`data:${imgType};base64,${b64}`);
        const blob = await res.blob();
        const form = new FormData();
        form.append('image', blob, 'car.jpg');
        form.append('conversationId', activeSessionId || '');

        const resp = await fetch(`${API_BASE}/analyze-image`, { method: 'POST', headers: getAuthHeaders(), body: form });
        const result = await resp.json();
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

        updateActiveSessionMessages(prev => [
          ...prev,
          { id: Date.now().toString(), role: "bot", type: "text", content: msgText, time: now() },
          { id: (Date.now() + 1).toString(), role: "bot", type: "result-card", resultData: details, resultStatus: data.status, resultScore: score, time: now() },
          { id: (Date.now() + 2).toString(), role: "bot", type: "chips", chips: ["Tell me more about the engine", "What's the reliability like?", "Compare with similar cars", "What's the price range?"], time: now() }
        ]);

      } else if (hasImage && text) {
        // IMAGE + TEXT
        const res = await fetch(`data:${imgType};base64,${b64}`);
        const blob = await res.blob();
        const form = new FormData();
        form.append('image', blob, 'car.jpg');
        form.append('message', text);
        form.append('conversationId', activeSessionId || '');

        const resp = await fetch(`${API_BASE}/chat-with-image`, { method: 'POST', headers: getAuthHeaders(), body: form });
        const result = await resp.json();
        setIsTyping(false);

        if (!resp.ok || result.success === false) {
          const errMsg = handleApiError(resp.status, result.message || 'Sorry, I could not get an answer.');
          updateActiveSessionMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", type: "text", content: errMsg, time: now() }]);
          return;
        }

        const data = result.data || result;
        const msgText = data.reply || data.answer || data.message || 'Sorry, I could not get an answer.';
        updateActiveSessionMessages(prev => [
          ...prev,
          { id: Date.now().toString(), role: "bot", type: "text", content: msgText, time: now() },
          { id: (Date.now() + 1).toString(), role: "bot", type: "chips", chips: ["Tell me more", "What about reliability?", "Compare with similar cars"], time: now() }
        ]);

      } else {
        // TEXT ONLY
        const resp = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ question: text, message: text, conversationId: activeSessionId })
        });
        const result = await resp.json();
        setIsTyping(false);

        if (!resp.ok || result.success === false) {
          const errMsg = handleApiError(resp.status, result.message || 'Sorry, I could not get an answer.');
          updateActiveSessionMessages(prev => [...prev, { id: Date.now().toString(), role: "bot", type: "text", content: errMsg, time: now() }]);
          return;
        }

        const data = result.data || result;
        const msgText = data.reply || data.answer || data.message || 'Sorry, I could not get an answer.';
        updateActiveSessionMessages(prev => [
          ...prev,
          { id: Date.now().toString(), role: "bot", type: "text", content: msgText, time: now() },
          { id: (Date.now() + 1).toString(), role: "bot", type: "chips", chips: ["Tell me more", "What about reliability?", "Compare with similar cars"], time: now() }
        ]);
      }
    } catch (e: any) {
      setIsTyping(false);
      updateActiveSessionMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        type: "text",
        content: `⚠️ Could not reach the Turbo Bot server.<br><small style="color:#aaa">${e.message}</small>`,
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

  // ── Auth gate ───────────────────────────────────────────────
  if (isLoggedIn === null) {
    // Still checking — show a minimal skeleton
    return (
      <main>
        <PageNavbar />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", background: "#f8f9fa" }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", background: "#f8f9fa", padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "48px 40px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", border: "1px solid #ebebeb" }}>
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
              🔒 Please log in to start chatting.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link href="/login" style={{ display: "inline-block", padding: "12px 28px", background: "#3a3aff", color: "#fff", borderRadius: "10px", fontWeight: "600", fontSize: "14px", textDecoration: "none", transition: "background 0.2s" }}>
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
            <div className="ai-icon">
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
                
                {msg.type === "text" && (
                  <>
                    <div className="ai-bubble" dangerouslySetInnerHTML={{ __html: msg.content || "" }} />
                    <span className="ai-msg-time">{msg.time}</span>
                  </>
                )}

                {msg.type === "image" && (
                  <>
                    <div className="ai-bubble" style={{ padding: "8px" }}>
                      <img src={msg.imageSrc} style={{ maxWidth: "220px", borderRadius: "10px", display: "block" }} alt="Car" />
                    </div>
                    <span className="ai-msg-time">{msg.time}</span>
                  </>
                )}

                {msg.type === "upload-zone" && (
                  <div className="ai-bubble" style={{ padding: "8px" }}>
                    <div className="ai-upload-zone" onClick={() => fileInputRef.current?.click()}>
                      <div className="up-icon">📷</div>
                      <p>Click to upload a car photo</p>
                      <p style={{ fontSize: "11px", marginTop: "4px", color: "#aaa" }}>JPG, PNG, WEBP — max 20 MB</p>
                    </div>
                  </div>
                )}

                {msg.type === "chips" && msg.chips && (
                  <div className="ai-bubble" style={{ padding: "10px 14px" }}>
                    <div className="chip-row">
                      {msg.chips.map((c, i) => (
                        <button key={i} className="ai-chip" onClick={() => handleChipClick(c)}>{c}</button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.type === "result-card" && msg.resultData && (
                  <>
                    <div className="ai-bubble">
                      <div className="result-card">
                        {msg.resultStatus === 'unknown' ? <span className="badge badge-web">Web match</span> : 
                         msg.resultStatus === 'uncertain' ? <span className="badge badge-uncertain">Possible match</span> : 
                         <span className="badge badge-found">Database match</span>}
                        
                        <h3>{msg.resultData.brand || '?'} {msg.resultData.model || '?'}</h3>
                        
                        <div className="confidence-bar">
                          <div className={`confidence-fill ${msg.resultScore && msg.resultScore >= 0.88 ? 'conf-high' : msg.resultScore && msg.resultScore >= 0.75 ? 'conf-medium' : 'conf-low'}`} style={{ width: `${Math.round((msg.resultScore || 0) * 100)}%` }}></div>
                        </div>
                        <p style={{ fontSize: "11px", color: "#aaa", margin: "4px 0 8px 0" }}>Confidence: {Math.round((msg.resultScore || 0) * 100)}%</p>

                        {msg.resultData.generation && msg.resultData.generation !== '---' && (
                          <div className="spec-row"><span className="spec-label">Generation</span><span className="spec-val">{msg.resultData.generation}</span></div>
                        )}
                        {msg.resultData.year && msg.resultData.year !== '---' && (
                          <div className="spec-row"><span className="spec-label">Year range</span><span className="spec-val">{msg.resultData.year}</span></div>
                        )}
                        {msg.resultData.engine && msg.resultData.engine !== '---' && (
                          <div className="spec-row"><span className="spec-label">Engine / Power</span><span className="spec-val">{msg.resultData.engine}</span></div>
                        )}
                        {msg.resultData.body && msg.resultData.body !== '---' && (
                          <div className="spec-row"><span className="spec-label">Body / Fuel</span><span className="spec-val">{msg.resultData.body}</span></div>
                        )}
                        {msg.resultData.color && (
                          <div className="spec-row"><span className="spec-label">Color</span><span className="spec-val">{msg.resultData.color}</span></div>
                        )}

                        <div className="pros-cons">
                          <div className="pc-box pros">
                            <strong>Pros</strong>
                            {msg.resultData.pros && msg.resultData.pros !== '---' && msg.resultData.pros !== 'Not_Available' ? msg.resultData.pros : 'Not available in database yet'}
                          </div>
                          <div className="pc-box cons">
                            <strong>Cons</strong>
                            {msg.resultData.cons && msg.resultData.cons !== '---' && msg.resultData.cons !== 'Not_Available' ? msg.resultData.cons : 'Not available in database yet'}
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
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

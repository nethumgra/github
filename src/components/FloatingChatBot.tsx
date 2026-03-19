"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, RotateCcw } from "lucide-react";
import { WELCOME_MESSAGES, QUICK_SUGGESTIONS } from "../lib/chatbot-instructions";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

type Language = "english" | "sinhala" | "tamil";

interface ChatProduct {
  id: string;
  name: string;
  discountedPrice?: number;
  originalPrice?: number;
  price?: number;
  images?: string[];
  stock?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  time: string;
  products?: ChatProduct[];
}

function now() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

async function searchProductsLocally(keywords: string): Promise<ChatProduct[]> {
  try {
    // 1. OrderBy එක දැනට අයින් කරන්න (Index ප්‍රශ්න මගහරින්න)
    const snap = await getDocs(collection(db, "products"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    // 2. Keywords පිරිසිදු කරගමු (උදා: bottles -> bottle)
    const lowerKeyword = keywords.toLowerCase();
    const stem = lowerKeyword.replace(/s$/, ""); // අගට s තියෙනවා නම් අයින් කරනවා
    const terms = [lowerKeyword, stem].filter(Boolean);

    const results = all
      .filter((p: any) => {
        if (p.stock === 0) return false; // Stock නැති ඒවා එපා
        
        const name = (p.name || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        const mainCat = (p.mainCategory || "").toLowerCase();
        const description = (p.description || "").toLowerCase(); // විස්තරයත් බලමු
        const text = `${name} ${cat} ${mainCat} ${description}`;

        // ඕනෑම පදයක් ගැලපෙනවාද බලනවා
        return terms.some(t => text.includes(t));
      })
      .slice(0, 4); // උපරිම items 4ක්

    return results;
  } catch (err) {
    console.error("[Chat] Product search error:", err);
    return [];
  }
}
// ── Product cards component ──────────────────────────────────────────────────
function ProductCards({ products, language }: { products: ChatProduct[]; language: Language | null }) {
  if (!products.length) return null;
  const buyLabel  = language === "sinhala" ? "දැන් ගන්න" : language === "tamil" ? "இப்போது வாங்கு" : "Buy Now";

  return (
    <div className="flex items-end gap-2 mt-1 mb-2">
      <div className="w-8 shrink-0" />
      <div className="grid grid-cols-2 gap-2 w-full max-w-[85%]">
        {products.map(p => {
          const price      = p.discountedPrice || p.price || 0;
          const original   = p.originalPrice;
          const hasDiscount = original && p.discountedPrice && original > p.discountedPrice;
          const pct        = hasDiscount ? Math.round(((original! - p.discountedPrice!) / original!) * 100) : 0;
          const img        = (p as any).images?.[0] || "/placeholder.jpg";

          return (
            <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 flex flex-col">
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <img src={img} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                {hasDiscount && (
                  <span className="absolute top-1.5 left-1.5 bg-[#111111] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">
                    -{pct}%
                  </span>
                )}
              </div>
              <div className="p-2 flex flex-col gap-1.5 flex-1">
                <p className="text-[10px] font-black text-gray-800 uppercase leading-tight line-clamp-2">{p.name}</p>
                <div>
                  <p className="text-[12px] font-black text-[#111111]">Rs.{price.toLocaleString()}</p>
                  {hasDiscount && (
                    <p className="text-[9px] text-gray-400 line-through font-bold">Rs.{original!.toLocaleString()}</p>
                  )}
                </div>
                <a
                  href={`/product/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto text-center bg-[#111111] text-white text-[9px] font-black py-1.5 rounded-xl hover:bg-[#a8243f] transition-colors active:scale-95 block"
                >
                  {buyLabel} 🛍️
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Doodle background ────────────────────────────────────────────────────────
const DoodleBg = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="doodle" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M20 18 C20 14 14 10 10 14 C6 10 0 14 0 18 C0 24 10 30 10 30 C10 30 20 24 20 18Z" fill="none" stroke="#111111" strokeWidth="1.2" transform="translate(30,10) scale(0.7)"/>
        <polygon points="60,5 62,11 68,11 63,15 65,21 60,17 55,21 57,15 52,11 58,11" fill="none" stroke="#111111" strokeWidth="1" transform="translate(-10,40) scale(0.6)"/>
        <circle cx="15" cy="60" r="3" fill="none" stroke="#111111" strokeWidth="1"/>
        <circle cx="15" cy="54" r="2.5" fill="none" stroke="#111111" strokeWidth="1"/>
        <circle cx="15" cy="66" r="2.5" fill="none" stroke="#111111" strokeWidth="1"/>
        <circle cx="9" cy="60" r="2.5" fill="none" stroke="#111111" strokeWidth="1"/>
        <circle cx="21" cy="60" r="2.5" fill="none" stroke="#111111" strokeWidth="1"/>
        <line x1="65" y1="55" x2="65" y2="65" stroke="#111111" strokeWidth="1"/>
        <line x1="60" y1="60" x2="70" y2="60" stroke="#111111" strokeWidth="1"/>
        <line x1="62" y1="57" x2="68" y2="63" stroke="#111111" strokeWidth="1"/>
        <line x1="68" y1="57" x2="62" y2="63" stroke="#111111" strokeWidth="1"/>
        <circle cx="40" cy="40" r="1.5" fill="#111111"/>
        <circle cx="5" cy="35" r="1" fill="#111111"/>
        <circle cx="75" cy="20" r="1" fill="#111111"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#doodle)"/>
  </svg>
);

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs font-black shadow-md shrink-0">L</div>
    <div className="bg-white rounded-[1.2rem] rounded-bl-sm px-4 py-3 shadow-sm">
      <div className="flex gap-1.5 items-center h-4">
        {[0,1,2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i*0.15}s`, animationDuration:"0.8s" }}/>
        ))}
      </div>
    </div>
  </div>
);

const LANG_OPTIONS = [
  { key: "english" as Language, emoji: "🇬🇧", label: "English"  },
  { key: "sinhala" as Language, emoji: "🇱🇰", label: "සිංහල"    },
  { key: "tamil"   as Language, emoji: "🇱🇰", label: "தமிழ்"    },
];

const GREETING_MSG = "Hi! I'm Lumi 💖 Lovzmart's shopping assistant!\n\nPlease select your language to continue 👇";

// ── Main component ────────────────────────────────────────────────────────────
export default function FloatingChatBot() {
  const [open, setOpen]         = useState(false);
  const [language, setLanguage] = useState<Language | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const [pulse, setPulse]       = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: GREETING_MSG, time: now() }]);
    }
    if (open && language) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: WELCOME_MESSAGES[lang], time: now() },
    ]);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const reset = () => {
    setLanguage(null);
    setMessages([{ role: "assistant", content: GREETING_MSG, time: now() }]);
    setInput("");
  };

const sendMessage = async (text?: string) => {
  const msgText = (text ?? input).trim();
  if (!msgText || loading || !language) return;

  const userMsg: Message = { role: "user", content: msgText, time: now() };
  setMessages(prev => [...prev, userMsg]);
  setInput("");
  setLoading(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), 
        language 
      }),
    });
    
    const data = await res.json();
    const reply = data.reply || "සමාවෙන්න, මට ඒක තේරුම් ගැනීමට අපහසුයි. 😅";

    setMessages(prev => [...prev, { role: "assistant", content: reply, time: now() }]);
    if (!open) setUnread(u => u + 1);
  } catch {
    setMessages(prev => [...prev, { role: "assistant", content: "Connection issue 😔", time: now() }]);
  } finally {
    setLoading(false);
  }
};

  const suggestions    = language ? QUICK_SUGGESTIONS[language] : [];
  const showSuggestions = language && messages.length === 2 && !loading;

  return (
    <>
      {/* Chat window */}
      <div className={`fixed bottom-[12rem] right-4 md:bottom-24 md:right-6 z-[9999] w-[calc(100vw-2rem)] max-w-[370px] transition-all duration-500 origin-bottom-right ${
        open ? "scale-100 opacity-100 pointer-events-auto" : "scale-75 opacity-0 pointer-events-none"
      }`}>
        <div className="rounded-[2rem] overflow-hidden shadow-2xl  border border-gray-100 flex flex-col" style={{ height: "540px" }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-[#111111] to-[#e8476a] px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-inner backdrop-blur-sm">💖</div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white"/>
              </div>
              <div>
                <p className="text-white font-black text-sm tracking-wide">Lumi</p>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"/>
                  {language === "sinhala" ? "සිංහල" : language === "tamil" ? "தமிழ்" : "Lovzmart AI"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={reset} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all" title="Change language">
                <RotateCcw size={14}/>
              </button>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all">
                <X size={16}/>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto relative" style={{ background: "#fdf0f3" }}>
            <DoodleBg />
            <div className="relative z-10 p-4 flex flex-col gap-1">
              <div className="flex justify-center my-2">
                <span className="bg-gray-100/80 backdrop-blur-sm text-gray-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Today</span>
              </div>

              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} mb-1`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs font-black shadow-md shrink-0 mb-1">L</div>
                    )}
                    <div className={`flex flex-col gap-0.5 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-2.5 text-[13px] font-medium leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#111111] text-white rounded-[1.2rem] rounded-br-sm"
                          : "bg-white text-gray-800 rounded-[1.2rem] rounded-bl-sm"
                      }`}>{msg.content}</div>
                      <span className="text-[9px] text-gray-400 font-bold px-1">{msg.time}</span>
                    </div>
                  </div>
                  {/* Product cards below assistant message */}
                  {msg.role === "assistant" && msg.products && msg.products.length > 0 && (
                    <ProductCards products={msg.products} language={language} />
                  )}
                </div>
              ))}

              {/* Language buttons */}
              {!language && messages.length > 0 && (
                <div className="flex items-end gap-2 mb-1">
                  <div className="w-8 h-8 shrink-0"/>
                  <div className="flex flex-col gap-2 max-w-[78%]">
                    {LANG_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => handleLanguageSelect(opt.key)}
                        className="flex items-center gap-3 bg-white border-2 border-gray-100 hover:border-[#111111] hover:shadow-lg hover: text-gray-700 hover:text-[#111111] font-bold text-[12px] px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-150 active:scale-95">
                        <span className="text-base">{opt.emoji}</span>{opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick suggestion chips */}
              {showSuggestions && (
                <div className="flex items-end gap-2 mb-1">
                  <div className="w-8 h-8 shrink-0"/>
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className="bg-white border border-gray-100 hover:border-[#111111] hover:bg-gray-50 text-gray-700 hover:text-[#111111] text-[11px] font-bold px-4 py-2 rounded-full shadow-sm transition-all duration-150 active:scale-95 text-left">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && <TypingIndicator />}
              <div ref={bottomRef}/>
            </div>
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={
                !language              ? "👆 Select a language first..." :
                language === "sinhala" ? "ලියන්න..." :
                language === "tamil"   ? "தட்டச்சு செய்யுங்கள்..." :
                "Type a message..."
              }
              disabled={loading || !language}
              className="flex-1 bg-gray-50 rounded-2xl px-4 py-2.5 text-sm font-medium outline-none border border-gray-100 focus:border-gray-200 transition-all placeholder:text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading || !language}
              className="w-10 h-10 bg-[#111111] rounded-full flex items-center justify-center text-white transition-all hover:bg-[#a8243f] active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-md ">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Floating button */}
          {/* ── FLOATING BUTTON ── */}
   <button
  onClick={() => setOpen(o => !o)}
  className="fixed bottom-[11rem] right-4 md:bottom-31 md:right-6 z-[9998] w-14 h-14 rounded-full shadow-xl /50 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center"
  style={{
    background: "linear-gradient(135deg, #111111 0%, #e8476a 100%)",
  }}
  aria-label="Open chat"
>
        {pulse && <span className="absolute inset-0 rounded-full bg-gray-400 animate-ping opacity-30"/>}
        <div className={`transition-all duration-300 ${open ? "rotate-90 scale-75" : "rotate-0 scale-100"}`}>
          {open ? <X size={22} className="text-white"/> : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.477 2 2 6.277 2 11.5C2 13.323 2.54 15.02 3.47 16.44L2.05 21.95L7.74 20.56C9.07 21.17 10.49 21.5 12 21.5C17.523 21.5 22 17.223 22 12C22 6.777 17.523 2 12 2Z" fill="white" fillOpacity="0.9"/>
              <path d="M7.5 10H16.5M7.5 14H13" stroke="#111111" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
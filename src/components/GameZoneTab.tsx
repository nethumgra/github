"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import {
  doc, updateDoc, increment, collection, addDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import {
  Gamepad2, Trophy, Gift, Coins, Flame, ChevronRight,
  X, Check, RotateCcw, Send, Crown, Star, Lock,
  Sparkles, Heart, Calendar, Target,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Prize {
  id: string; name: string; value: string;
  type: 'points' | 'physical'; pointsCost: number;
  emoji: string; stock?: number; color: string;
}
interface LeaderUser { id: string; email: string; points: number; gamesPlayed?: number; }

// ─────────────────────────────────────────────
// FLOATING DECORATIONS (background kawaii dots)
// ─────────────────────────────────────────────
const FloatingDeco = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3rem]">
    {['🌸','✨','🎀','💕','⭐','🌷','💖','🌸'].map((e, i) => (
      <motion.span key={i} className="absolute text-lg select-none opacity-20"
        style={{ left: `${10 + i * 12}%`, top: `${5 + (i % 3) * 30}%` }}
        animate={{ y: [0, -12, 0], rotate: [0, i % 2 === 0 ? 15 : -15, 0] }}
        transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}>
        {e}
      </motion.span>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// SCRATCH CARD
// ─────────────────────────────────────────────
const ScratchCard = ({ onWin, used }: { onWin: (pts: number) => void; used: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prize] = useState(() => {
    const pool = [50, 0, 100, 0, 200, 0, 50, 500, 0, 0];
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const initCanvas = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, c.width, c.height);
    g.addColorStop(0, '#fda4af'); g.addColorStop(1, '#c12a52');
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(Math.random() * c.width, Math.random() * c.height, Math.random() * 5 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Scratch Here! ✨', c.width / 2, c.height / 2 - 8);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Drag your finger to reveal', c.width / 2, c.height / 2 + 14);
  }, []);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, c: HTMLCanvasElement) => {
    const r = c.getBoundingClientRect();
    if ('touches' in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top };
  };

  const scratch = (e: React.MouseEvent | React.TouchEvent) => {
    if (revealed || used) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, c);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 26, 0, Math.PI * 2); ctx.fill();
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const transparent = Array.from(data).filter((_, i) => i % 4 === 3 && data[i] === 0).length;
    const pct = (transparent / (data.length / 4)) * 100;
    if (pct > 55 && !revealed) { setRevealed(true); onWin(prize); }
  };

  if (used) return (
    <div className="flex flex-col items-center gap-5 py-10">
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl">😴</motion.div>
      <p className="font-black text-[#c12a52] text-sm uppercase tracking-widest">Come back tomorrow!</p>
      <p className="text-gray-400 text-xs font-bold">One free scratch per day 🌸</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Prize reveal underneath */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-rose-200" style={{ width: 290, height: 150 }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
          {prize > 0 ? (
            <>
              <motion.span animate={revealed ? { scale: [1,1.4,1], rotate: [0,5,-5,0] } : {}} transition={{ duration: 0.6 }}
                className="text-5xl font-black text-[#c12a52]">+{prize}</motion.span>
              <span className="text-xs font-black text-rose-400 uppercase tracking-widest mt-1">Points! 🎉</span>
            </>
          ) : (
            <>
              <span className="text-4xl">😅</span>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">Try Again!</span>
            </>
          )}
        </div>
        <canvas ref={canvasRef} width={290} height={150}
          className="absolute inset-0 cursor-crosshair touch-none rounded-[2.5rem]"
          onMouseDown={(e) => { setIsDrawing(true); scratch(e); }}
          onMouseMove={(e) => isDrawing && scratch(e)}
          onMouseUp={() => setIsDrawing(false)}
          onTouchStart={scratch} onTouchMove={scratch}
        />
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
            className={`px-7 py-3 rounded-full font-black text-sm uppercase tracking-widest shadow-lg ${prize > 0 ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-gray-100 text-gray-500'}`}>
            {prize > 0 ? `🎊 You won ${prize} points!` : '💔 Better luck next time!'}
          </motion.div>
        )}
      </AnimatePresence>
      {!revealed && <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.25em]">Drag to scratch · Free once per day</p>}
    </div>
  );
};

// ─────────────────────────────────────────────
// MEMORY MATCH
// ─────────────────────────────────────────────
const EMOJIS = ['💄', '👜', '💍', '🌸', '👗', '✨', '🎀', '💖'];
const MemoryMatch = ({ onWin, used }: { onWin: (pts: number) => void; used: boolean }) => {
  const mkCards = () => [...EMOJIS, ...EMOJIS]
    .sort(() => Math.random() - 0.5)
    .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));

  const [cards, setCards] = useState(mkCards);
  const [sel, setSel] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [timeLeft, setTimeLeft] = useState(50);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (won || over) return;
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(t); setOver(true); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [won, over]);

  const flip = (id: number) => {
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched || sel.length === 2 || won || over) return;
    const next = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const newSel = [...sel, id];
    setCards(next); setSel(newSel);
    if (newSel.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newSel.map(sid => next.find(c => c.id === sid)!);
      if (a.emoji === b.emoji) {
        const matched = next.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c);
        setCards(matched); setSel([]);
        if (matched.every(c => c.matched)) { setWon(true); onWin(moves < 10 ? 300 : moves < 16 ? 150 : 75); }
      } else {
        setTimeout(() => { setCards(p => p.map(c => newSel.includes(c.id) ? { ...c, flipped: false } : c)); setSel([]); }, 800);
      }
    }
  };

  if (used) return (
    <div className="flex flex-col items-center gap-5 py-10">
      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-6xl">😴</motion.div>
      <p className="font-black text-[#c12a52] text-sm uppercase tracking-widest">Played today!</p>
      <p className="text-gray-400 text-xs font-bold">Come back tomorrow 🌸</p>
    </div>
  );

  if (won) return (
    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-5 py-10">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1 }} className="text-6xl">🏆</motion.div>
      <h3 className="text-2xl font-black text-[#c12a52] uppercase">You Won!</h3>
      <p className="text-gray-500 text-sm font-bold">{moves} moves · {timeLeft}s left</p>
      <motion.div className="text-4xl font-black text-rose-400">+{moves < 10 ? 300 : moves < 16 ? 150 : 75} pts</motion.div>
    </motion.div>
  );

  if (over) return (
    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-5 py-10">
      <div className="text-6xl">⏰</div>
      <h3 className="text-xl font-black text-gray-500 uppercase">Time's Up!</h3>
      <button onClick={() => { setCards(mkCards()); setSel([]); setMoves(0); setWon(false); setOver(false); setTimeLeft(50); }}
        className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-200 hover:bg-[#c12a52] transition-all">
        <RotateCcw size={14} /> Try Again
      </button>
    </motion.div>
  );

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-6 text-xs font-black uppercase">
        <span className="text-gray-400">Moves: <span className="text-[#c12a52]">{moves}</span></span>
        <span className={`font-black ${timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-rose-400'}`}>⏱ {timeLeft}s</span>
        <span className="text-gray-300">Win: +{moves < 10 ? 300 : moves < 16 ? 150 : 75}pts</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5 bg-rose-50/50 rounded-[2.5rem] p-5 border border-rose-100">
        {cards.map(card => (
          <motion.button key={card.id} onClick={() => flip(card.id)} whileTap={{ scale: 0.85 }}
            animate={card.matched ? { scale: [1, 1.15, 1] } : {}}
            className={`w-14 h-14 rounded-2xl text-2xl flex items-center justify-center transition-all duration-300 border-2 shadow-sm
              ${card.matched ? 'bg-green-100 border-green-300 shadow-green-100'
                : card.flipped ? 'bg-white border-rose-300 shadow-rose-100'
                : 'bg-white border-gray-200 hover:border-rose-200 hover:shadow-rose-50 cursor-pointer'}`}>
            {card.flipped || card.matched ? card.emoji : (
              <span className="text-rose-200 text-lg font-black">?</span>
            )}
          </motion.button>
        ))}
      </div>
      <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Match all pairs before time runs out!</p>
    </div>
  );
};

// ─────────────────────────────────────────────
// PRIZE VAULT
// ─────────────────────────────────────────────
const PRIZES: Prize[] = [
  { id: '1', name: 'Lip Gloss Set', value: 'Premium 3pc Collection', type: 'physical', pointsCost: 500, emoji: '💄', color: 'from-pink-50 to-rose-50', stock: 8 },
  { id: '2', name: 'Points Boost', value: '+300 Bonus Points', type: 'points', pointsCost: 200, emoji: '⚡', color: 'from-amber-50 to-yellow-50' },
  { id: '3', name: 'Mystery Gift Box', value: 'Surprise Inside!', type: 'physical', pointsCost: 1000, emoji: '🎁', color: 'from-purple-50 to-pink-50', stock: 5 },
  { id: '4', name: 'Shipping Voucher', value: '3 Free Deliveries', type: 'physical', pointsCost: 350, emoji: '🚚', color: 'from-blue-50 to-cyan-50' },
  { id: '5', name: 'Silver Necklace', value: 'Premium Jewelry', type: 'physical', pointsCost: 2000, emoji: '💎', color: 'from-gray-50 to-slate-50', stock: 3 },
  { id: '6', name: 'Points Jackpot', value: '+1000 Instant Points', type: 'points', pointsCost: 800, emoji: '🏆', color: 'from-amber-50 to-orange-50' },
];

const PrizeVault = ({ userPoints, userId }: { userPoints: number; userId: string }) => {
  const [showForm, setShowForm] = useState<Prize | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [addr, setAddr] = useState({ fullName: '', phone: '', street: '' });

  const claim = async (prize: Prize) => {
    if (userPoints < prize.pointsCost) { toast.error("Not enough points! 💕"); return; }
    if (prize.type === 'physical') { setShowForm(prize); return; }
    setClaiming(prize.id);
    try {
      await updateDoc(doc(db, 'users', userId), { points: increment(-prize.pointsCost) });
      if (prize.type === 'points') {
        const pts = parseInt(prize.value.replace(/\D/g, ''));
        await updateDoc(doc(db, 'users', userId), { points: increment(pts) });
      }
      toast.success(`${prize.name} claimed! 🎉`);
    } catch { toast.error("Oops! Try again 😅"); }
    setClaiming(null);
  };

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showForm) return;
    try {
      await updateDoc(doc(db, 'users', userId), { points: increment(-showForm.pointsCost) });
      await addDoc(collection(db, 'prize_claims'), { userId, prize: showForm.name, ...addr, claimedAt: serverTimestamp() });
      toast.success("Prize on the way! 🎀 We'll deliver it soon~");
      setShowForm(null); setAddr({ fullName: '', phone: '', street: '' });
    } catch { toast.error("Failed! Try again 😢"); }
  };

  return (
    <div className="space-y-5">
      {/* Claim Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl shadow-rose-200 border border-rose-100">
              <div className="text-center mb-6">
                <span className="text-5xl">{showForm.emoji}</span>
                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight mt-3">{showForm.name}</h3>
                <p className="text-xs text-rose-400 font-bold mt-1">Enter delivery details 🌸</p>
              </div>
              <form onSubmit={submitClaim} className="space-y-3">
                {[
                  { ph: 'Full Name', key: 'fullName' },
                  { ph: 'Phone Number', key: 'phone' },
                  { ph: 'Full Address', key: 'street' },
                ].map(f => (
                  <input key={f.key} required placeholder={f.ph}
                    value={addr[f.key as keyof typeof addr]}
                    onChange={e => setAddr({ ...addr, [f.key]: e.target.value })}
                    className="w-full px-5 py-4 bg-rose-50 rounded-2xl text-xs font-bold text-gray-800 outline-none border border-rose-100 focus:border-rose-300 placeholder-rose-200 transition-all"
                  />
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(null)}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase">Cancel</button>
                  <button type="submit"
                    className="flex-1 py-4 bg-[#c12a52] text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-200 flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                    <Send size={12} /> Claim!
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        {PRIZES.map((prize, i) => {
          const canAfford = userPoints >= prize.pointsCost;
          return (
            <motion.div key={prize.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`relative p-5 rounded-[2rem] border-2 bg-gradient-to-br ${prize.color} transition-all
                ${canAfford ? 'border-rose-100 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-100' : 'border-gray-100 opacity-60'}`}>
              <div className="text-3xl mb-3">{prize.emoji}</div>
              <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-tight leading-tight">{prize.name}</h4>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5 mb-4">{prize.value}</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[10px] font-black text-[#c12a52]">
                  <Coins size={9} /> {prize.pointsCost}
                </span>
                <button disabled={!canAfford || claiming === prize.id} onClick={() => claim(prize)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                    ${canAfford ? 'bg-[#c12a52] text-white hover:opacity-80 active:scale-90 shadow-sm shadow-rose-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed flex items-center gap-1'}`}>
                  {claiming === prize.id ? '...' : canAfford ? 'Get!' : <><Lock size={8} /> Lock</>}
                </button>
              </div>
              {prize.stock !== undefined && (
                <span className="absolute top-3 right-3 text-[8px] font-black text-gray-300 uppercase">{prize.stock} left</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// DAILY QUESTS
// ─────────────────────────────────────────────
const DailyQuests = ({ userId, onReward }: { userId: string; onReward: () => void }) => {
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem(`daily_${userId}`);
    if (last && new Date(last).toDateString() === new Date().toDateString()) setClaimed(true);
  }, [userId]);

  const claimDaily = async () => {
    try {
      await updateDoc(doc(db, 'users', userId), { points: increment(75), lastDailyLogin: serverTimestamp() });
      localStorage.setItem(`daily_${userId}`, new Date().toISOString());
      setClaimed(true); onReward();
      toast.success('+75 Daily Login Points! 🌸');
    } catch { toast.error("Couldn't claim. Try again!"); }
  };

  const quests = [
    { emoji: '🛍️', label: 'Place an order', pts: 200, done: false, hint: 'Shop anything' },
    { emoji: '❤️', label: 'Wishlist 3 items', pts: 50, done: true, hint: 'Go to shop' },
    { emoji: '🔗', label: 'Share affiliate link', pts: 100, done: false, hint: 'Affiliate tab' },
    { emoji: '🎡', label: 'Spin the Love Wheel', pts: 25, done: false, hint: 'Press 🎁 button' },
    { emoji: '✍️', label: 'Complete your profile', pts: 30, done: true, hint: 'Profile tab' },
  ];

  return (
    <div className="space-y-5">
      {/* Daily Bonus Card */}
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={`relative overflow-hidden p-6 rounded-[2.5rem] border-2 ${claimed ? 'bg-gray-50 border-gray-100' : 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200'}`}>
        <FloatingDeco />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={16} className={claimed ? 'text-gray-300' : 'text-rose-500'} />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Daily Login Bonus</span>
            </div>
            <h3 className="font-black text-2xl text-gray-900">+75 Points</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{claimed ? '✓ Claimed today!' : 'Free every day! 🌸'}</p>
          </div>
          <motion.button disabled={claimed} onClick={claimDaily}
            whileHover={!claimed ? { scale: 1.05 } : {}} whileTap={!claimed ? { scale: 0.95 } : {}}
            className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all
              ${claimed ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#c12a52] text-white shadow-rose-200 hover:opacity-90'}`}>
            {claimed ? <Check size={18} /> : 'Claim!'}
          </motion.button>
        </div>
      </motion.div>

      {/* Quest List */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.25em] ml-2">Today's Quests</p>
        {quests.map((q, i) => (
          <motion.div key={i} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.06 }}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all
              ${q.done ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100 hover:border-rose-100'}`}>
            <span className="text-2xl w-8 text-center">{q.emoji}</span>
            <div className="flex-1">
              <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight">{q.label}</p>
              <p className="text-[9px] text-gray-400 font-bold mt-0.5">{q.hint}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#c12a52]">+{q.pts}pts</span>
              {q.done
                ? <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center"><Check size={11} className="text-white" /></div>
                : <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center"><ChevronRight size={11} className="text-rose-300" /></div>
              }
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────
const Leaderboard = () => {
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    return onSnapshot(q, snap => setLeaders(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaderUser))));
  }, []);

  const podium = ['🥇', '🥈', '🥉'];
  const podiumColors = [
    'from-amber-50 to-yellow-50 border-amber-200',
    'from-gray-50 to-slate-50 border-gray-200',
    'from-orange-50 to-amber-50 border-orange-200',
  ];

  return (
    <div className="space-y-5">
      {/* Season prize banner */}
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden p-6 rounded-[2.5rem] bg-gradient-to-r from-[#c12a52]/10 via-rose-50 to-pink-50 border-2 border-rose-100">
        <FloatingDeco />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-[#c12a52] uppercase tracking-widest mb-1">🏆 Season 1 Grand Prize</p>
            <h3 className="font-black text-lg text-gray-900">Mystery Gift Box + 5000pts</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Top 3 winners every month 🌸</p>
          </div>
          <span className="text-5xl">🎁</span>
        </div>
        <div className="relative z-10 mt-4 flex items-center gap-3">
          <div className="flex-1 bg-rose-100 rounded-full h-2 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '62%' }} transition={{ duration: 1.5, ease: 'easeOut' }}
              className="bg-gradient-to-r from-[#c12a52] to-rose-400 h-full rounded-full" />
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">18 days left</span>
        </div>
      </motion.div>

      {/* Top 3 podium */}
      {leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {leaders.slice(0, 3).map((u, i) => (
            <motion.div key={u.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-[2rem] border-2 bg-gradient-to-br text-center ${podiumColors[i]}`}>
              <div className="text-2xl mb-2">{podium[i]}</div>
              <p className="font-black text-gray-800 text-[10px] uppercase tracking-tight truncate">{u.email?.split('@')[0]}</p>
              <p className="text-[10px] font-black text-[#c12a52] mt-1">{(u.points || 0).toLocaleString()} pts</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {leaders.map((u, i) => (
          <motion.div key={u.id} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.04 }}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-rose-100 transition-all">
            <span className="w-8 text-center font-black text-gray-300 text-sm">{i < 3 ? podium[i] : `#${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-800 text-xs uppercase truncate">{u.email?.split('@')[0]}</p>
              <p className="text-[9px] text-gray-400 font-bold">{u.gamesPlayed || 0} games played</p>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl">
              <Coins size={9} className="text-[#c12a52]" />
              <span className="font-black text-[#c12a52] text-[10px]">{(u.points || 0).toLocaleString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN GAME ZONE
// ─────────────────────────────────────────────
type GameTab = 'hub' | 'scratch' | 'memory' | 'vault' | 'quests' | 'leaderboard';

export default function GameZoneTab() {
  const { user, userData } = useAuth();
  const [tab, setTab] = useState<GameTab>('hub');
  const [scratchDone, setScratchDone] = useState(false);
  const [memoryDone, setMemoryDone] = useState(false);
  const userPoints = userData?.points || 0;

  useEffect(() => {
    if (!user?.uid) return;
    if (localStorage.getItem(`scratch_${user.uid}_${new Date().toDateString()}`)) setScratchDone(true);
    if (localStorage.getItem(`memory_${user.uid}_${new Date().toDateString()}`)) setMemoryDone(true);
  }, [user]);

  const addPoints = async (pts: number, gameKey: string) => {
    if (!user?.uid || pts === 0) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { points: increment(pts), gamesPlayed: increment(1) });
      if (gameKey === 'scratch') localStorage.setItem(`scratch_${user.uid}_${new Date().toDateString()}`, '1');
      if (gameKey === 'memory') localStorage.setItem(`memory_${user.uid}_${new Date().toDateString()}`, '1');
      toast.success(`+${pts} points! 🎉`, { icon: '✨' });
    } catch { toast.error("Couldn't save points 😢"); }
  };

  // GAME CONFIGS
  const games = [
    { id: 'scratch', emoji: '🃏', label: 'Scratch Card', desc: 'Reveal hidden prizes!', tag: 'Free / day', tagColor: 'text-green-500', done: scratchDone },
    { id: 'memory', emoji: '🧩', label: 'Memory Match', desc: 'Match pairs to win big', tag: 'Free / day', tagColor: 'text-blue-500', done: memoryDone },
    { id: 'vault', emoji: '🎀', label: 'Prize Vault', desc: 'Redeem pts for real gifts', tag: `${userPoints} pts`, tagColor: 'text-[#c12a52]', done: false },
    { id: 'quests', emoji: '⭐', label: 'Daily Quests', desc: 'Tasks & daily bonus pts', tag: 'Daily', tagColor: 'text-amber-500', done: false },
    { id: 'leaderboard', emoji: '👑', label: 'Hall of Fame', desc: 'Top players win prizes!', tag: 'Season', tagColor: 'text-purple-500', done: false },
  ];

  // POINTS BAR
  const PointsBar = () => (
    <motion.div className="flex items-center gap-2 bg-rose-50 border-2 border-rose-100 px-5 py-2.5 rounded-full shadow-sm"
      animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}>
      <Coins size={14} className="text-[#c12a52]" />
      <span className="font-black text-[#c12a52] text-sm">{userPoints.toLocaleString()} PTS</span>
    </motion.div>
  );

  // HUB
  if (tab === 'hub') return (
    <div className="relative space-y-8 pb-10">
      {/* HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#c12a52] via-rose-500 to-pink-400 rounded-[3rem] p-8 text-white text-center shadow-2xl shadow-rose-200">
        <FloatingDeco />
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 space-y-3">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="inline-block text-5xl">🎮</motion.div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none">
            Game Zone
          </h1>
          <p className="text-rose-100 text-xs font-bold uppercase tracking-[0.2em]">
            Play · Earn Points · Win Real Gifts! 🎁
          </p>
          <PointsBar />
        </motion.div>
      </div>

      {/* SEASON PRIZE TEASER */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        onClick={() => setTab('leaderboard')}
        className="cursor-pointer flex items-center justify-between p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-[2rem] border-2 border-amber-200 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100 transition-all group">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Season 1 · 18 days left</p>
            <h3 className="font-black text-gray-900 text-sm">Top 3 win Mystery Gift Box!</h3>
          </div>
        </div>
        <ChevronRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
      </motion.div>

      {/* GAMES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {games.map((game, i) => (
          <motion.button key={game.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
            onClick={() => setTab(game.id as GameTab)}
            whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.97 }}
            className="text-left p-6 bg-white rounded-[2.5rem] border-2 border-gray-100 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-50 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <motion.span className="text-4xl" animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3 + i, repeat: Infinity }}>
                {game.emoji}
              </motion.span>
              <div className="flex items-center gap-1.5">
                {game.done && <span className="text-[9px] font-black text-green-500 uppercase bg-green-50 border border-green-100 px-2 py-1 rounded-full">Done!</span>}
                <span className={`text-[9px] font-black uppercase ${game.tagColor} bg-gray-50 border border-gray-100 px-2 py-1 rounded-full`}>{game.tag}</span>
              </div>
            </div>
            <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">{game.label}</h3>
            <p className="text-[11px] text-gray-400 font-bold mt-1 mb-4">{game.desc}</p>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-1">
                {['🌸','💕','✨'].map((s, j) => <span key={j} className="text-sm opacity-60">{s}</span>)}
              </div>
              <span className="text-[10px] font-black text-gray-300 uppercase flex items-center gap-1 group-hover:text-[#c12a52] transition-colors">
                Play <ChevronRight size={12} />
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  // INNER GAME VIEWS
  const innerViews: Record<string, { title: string; subtitle: string; emoji: string; content: React.ReactNode }> = {
    scratch: {
      title: 'Scratch Card', subtitle: 'Scratch to reveal your prize!', emoji: '🃏',
      content: (
        <ScratchCard used={scratchDone} onWin={(pts) => {
          setScratchDone(true);
          addPoints(pts, 'scratch');
        }} />
      )
    },
    memory: {
      title: 'Memory Match', subtitle: 'Match all pairs before time runs out!', emoji: '🧩',
      content: (
        <MemoryMatch used={memoryDone} onWin={(pts) => {
          setMemoryDone(true);
          addPoints(pts, 'memory');
        }} />
      )
    },
    vault: {
      title: 'Prize Vault', subtitle: 'Redeem your points for real rewards 🎀', emoji: '🎀',
      content: user?.uid
        ? <PrizeVault userPoints={userPoints} userId={user.uid} />
        : <p className="text-center py-10 text-gray-400 font-bold">Please log in first 💕</p>
    },
    quests: {
      title: 'Daily Quests', subtitle: 'Complete tasks · Earn bonus points!', emoji: '⭐',
      content: user?.uid
        ? <DailyQuests userId={user.uid} onReward={() => {}} />
        : <p className="text-center py-10 text-gray-400 font-bold">Please log in first 💕</p>
    },
    leaderboard: {
      title: 'Hall of Fame', subtitle: 'Top 3 players win real prizes every season! 👑', emoji: '👑',
      content: <Leaderboard />
    }
  };

  const view = innerViews[tab];
  if (!view) return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab('hub')}
          className="flex items-center gap-2 bg-rose-50 border-2 border-rose-100 px-5 py-2.5 rounded-2xl font-black text-xs text-[#c12a52] uppercase tracking-widest hover:bg-rose-100 transition-all">
          <ChevronRight size={14} className="rotate-180" /> Back
        </motion.button>
        <motion.div className="flex items-center gap-2 bg-rose-50 border-2 border-rose-100 px-5 py-2.5 rounded-full"
          animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}>   
          <Coins size={13} className="text-[#c12a52]" />
          <span className="font-black text-[#c12a52] text-sm">{userPoints.toLocaleString()} PTS</span>
        </motion.div>
      </div>

      {/* Header */}
      <div className="text-center space-y-2 py-2">
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
          className="text-5xl inline-block">{view.emoji}</motion.div>
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{view.title}</h2>
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{view.subtitle}</p>
      </div>

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {view.content}
      </motion.div>
    </div>
  );
}

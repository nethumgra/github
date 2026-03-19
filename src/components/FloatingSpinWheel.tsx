"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Coins, Crown, MapPin, Send, PartyPopper } from 'lucide-react';
import { useAuth } from "../context/AuthContext"; 
import AuthModal from "./AuthModal"; 
import { db } from "../lib/firebase"; 
import { doc, updateDoc, increment, collection, addDoc, query, orderBy, limit, onSnapshot, getDoc } from "firebase/firestore";
import { toast } from 'react-hot-toast';

const FloatingSpinWheel = () => {
  const { user, userData } = useAuth(); 
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  
  const [prizes, setPrizes] = useState<any[]>([]); // Admin ලා දාන prizes මෙතනට එනවා
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  const [shippingDetails, setShippingDetails] = useState({ fullName: '', idNumber: '', address: '', phone: '' });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Fetch Dynamic Prizes and Leaderboard
  useEffect(() => {
    audioRef.current = new Audio('/sounds/tick.mp3');
    
    // Admin සෙටින්ග්ස් වලින් Prizes ටික ගන්නවා
    const unsubPrizes = onSnapshot(doc(db, "settings", "wheel"), (doc) => {
      if (doc.exists()) {
        setPrizes(doc.data().prizes || []);
      }
    });

    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(3));
    const unsubLeaderboard = onSnapshot(q, (snapshot) => {
      setTopUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubPrizes(); unsubLeaderboard(); };
  }, []);

  const playTick = () => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); } };

  // 2. Chance Logic (Admin ට ඕන විදිහට වැඩ කරනවා)
  const getWeightedPrize = () => {
    const totalChance = prizes.reduce((acc, p) => acc + p.chance, 0);
    let random = Math.random() * totalChance;
    for (const prize of prizes) {
      if (random < prize.chance) return prize;
      random -= prize.chance;
    }
    return prizes[0];
  };

const handleSpinClick = async () => {

    if (!user) { setIsAuthOpen(true); return; }
    if ((userData?.points || 0) < 100) { 
  toast.error("Need 100 Points To Spin!"); 
  return; 
}
    if (isSpinning || prizes.length === 0) return;

    setIsSpinning(true);
    setResult(null);
    setShowWinAnimation(false);

    try {
      const userRef = doc(db, "users", user.uid);
   
      await updateDoc(userRef, { points: increment(-100) });

      const selectedPrize = getWeightedPrize();
      const prizeIndex = prizes.findIndex(p => p.id === selectedPrize.id);
      
      const sectorAngle = 360 / prizes.length;
      
    
      const fullSpins = 360 * 10; 
      const currentRotationInCircle = rotation % 360;
      const targetSectorMiddle = (prizeIndex * sectorAngle) + (sectorAngle / 2);
      
     
      const finalTarget = 360 - targetSectorMiddle;
      const rotationToApply = fullSpins + (finalTarget - currentRotationInCircle);
      
      const finalRotation = rotation + rotationToApply;
      
      setRotation(finalRotation);

    
      const interval = setInterval(playTick, 200);
      
      setTimeout(async () => {
        clearInterval(interval);
        setIsSpinning(false);
        setResult(selectedPrize);

        if (selectedPrize.type !== 'none') {
          if (selectedPrize.type === 'currency') {
          
            await updateDoc(userRef, { points: increment(Number(selectedPrize.value) || 0) });
          }
          setShowWinAnimation(true);
        }
      }, 5000); 
    } catch (e) { 
      setIsSpinning(false); 
      console.error("Spin error:", e);
    }
};

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "prize_claims"), {
        userId: user.uid,
        ...shippingDetails,
        prize: result?.text,
        timestamp: new Date()
      });
    toast.success("Details Received successfully!❤️"); 
  setShowClaimForm(false);
  setIsOpen(false);
} catch (e) { 
  toast.error("An error occurred. Please try again."); 
}
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white w-full max-w-sm rounded-[3rem] p-8 relative flex flex-col items-center shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide text-gray-800">
              
              <button onClick={() => { setIsOpen(false); setShowWinAnimation(false); }} className="absolute top-6 right-6 text-gray-400 z-[110]"><X size={24} /></button>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Love Wheel ❤️</h2>
                <div className="mt-2 inline-flex items-center gap-2 text-amber-600 font-bold text-xs bg-amber-100 px-4 py-1.5 rounded-full">
                  <Coins size={14} /> {userData?.points || 0} PTS
                </div>
              </div>

              {/* Win Animation Overlay */}
              <AnimatePresence>
                {showWinAnimation && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] bg-white rounded-[3rem] p-8 flex flex-col items-center justify-center text-center">
                    <PartyPopper className="text-rose-500 mb-4" size={50} />
                    <img src={result?.img} className="w-20 h-20 object-contain mb-4" alt="" />
                    <h3 className="text-2xl font-black">ජයග්‍රහණයකි!</h3>
                    <p className="text-gray-500 font-bold text-xs mt-2">{result?.text}</p>
                    <button onClick={() => { setShowWinAnimation(false); if(result.type === 'physical') setShowClaimForm(true); }}
                      className="mt-8 w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg">
                      ලබාගන්න
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Claim Form */}
              <AnimatePresence>
                {showClaimForm && (
                  <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="absolute inset-0 z-[105] bg-white rounded-[3rem] p-8 flex flex-col items-center overflow-y-auto scrollbar-hide">
                    <h3 className="text-xl font-black mb-6">Shipping Details</h3>
                    <form className="w-full space-y-3" onSubmit={handleClaimSubmit}>
                      <input required placeholder="Full Name" className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl text-xs font-bold outline-none border-none focus:ring-2 ring-rose-100" onChange={(e) => setShippingDetails({...shippingDetails, fullName: e.target.value})} />
                      <textarea required placeholder="Address" className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl text-xs font-bold outline-none border-none focus:ring-2 ring-rose-100 h-24" onChange={(e) => setShippingDetails({...shippingDetails, address: e.target.value})} />
                      <input required placeholder="Phone" className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl text-xs font-bold outline-none border-none focus:ring-2 ring-rose-100" onChange={(e) => setShippingDetails({...shippingDetails, phone: e.target.value})} />
                      <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2">Submit <Send size={14} /></button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dynamic Wheel UI */}
              <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                {/* Pointer Fixed at Top Center */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                  <div className="w-6 h-8 bg-gray-900 rounded-b-full shadow-lg" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}></div>
                </div>

                <motion.div 
                  animate={{ rotate: rotation }} 
                  transition={{ duration: 5, ease: [0.1, 0, 0.2, 1] }} 
                  className="w-full h-full rounded-full border-[8px] border-gray-100 shadow-2xl overflow-hidden relative"
                  style={{ 
                    background: prizes.length > 0 
                      ? `conic-gradient(${prizes.map((p, i) => `${p.color} ${i * (100 / prizes.length)}% ${(i + 1) * (100 / prizes.length)}%`).join(', ')})` 
                      : '#eee' 
                  }}
                >
                  {prizes.map((prize, i) => (
                    <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" 
                      style={{ transform: `rotate(${i * (360 / prizes.length) + (360 / prizes.length / 2)}deg) translateY(-85px)` }}>
                      {/* Image Fit Optimization */}
                      <div className="w-8 h-8 flex items-center justify-center mb-1">
                        <img src={prize.img} className="max-w-full max-h-full object-contain drop-shadow-md" alt="" />
                      </div>
                      <span className="text-[7px] font-black text-white uppercase text-center w-12 leading-tight drop-shadow-sm">{prize.text}</span>
                    </div>
                  ))}
                </motion.div>

                <button onClick={handleSpinClick} disabled={isSpinning} className="absolute z-30 w-16 h-16 bg-white rounded-full shadow-2xl flex flex-col items-center justify-center border-2 border-gray-50 active:scale-90 transition-all">
                  <span className="font-black text-[10px] text-rose-600 uppercase">{isSpinning ? "❤️" : "SPIN"}</span>
                  {!isSpinning && <span className="text-[7px] font-bold text-gray-400">100P</span>}
                </button>
              </div>

              {/* Leaderboard */}
              <div className="w-full border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown size={14} className="text-amber-500" />
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Players</h3>
                </div>
                <div className="space-y-2">
                  {topUsers.map((u, i) => (
                    <div key={u.id} className="flex justify-between items-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-600 truncate w-32">{u.email?.split('@')[0]}</span>
                      <span className="text-[10px] font-black text-amber-600">{u.points} PTS</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};

export default FloatingSpinWheel;
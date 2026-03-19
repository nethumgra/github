"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

const prizes = [
  { text: '5% OFF', color: '#fb7185' },
  { text: 'FREE SHIPPING', color: '#f59e0b' },
  { text: '10% OFF', color: '#be185d' },
  { text: 'TRY AGAIN', color: '#94a3b8' },
  { text: 'SURPRISE GIFT', color: '#fb7185' },
  { text: '15% OFF', color: '#f59e0b' },
];

const SpinWheel = () => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);

    // අහඹු ලෙස කැරකෙන ප්‍රමාණය තීරණය කිරීම (අවම වට 5ක්)
    const extraDegrees = Math.floor(Math.random() * 360);
    const newRotation = rotation + (360 * 5) + extraDegrees;
    
    setRotation(newRotation);

    // කැරකෙන වෙලාවෙන් පසු ප්‍රතිඵලය පෙන්වීම
    setTimeout(() => {
      setIsSpinning(false);
      const actualDegrees = newRotation % 360;
      const prizeIndex = Math.floor((360 - actualDegrees) / (360 / prizes.length)) % prizes.length;
      setResult(prizes[prizeIndex].text);
    }, 4000); // තත්පර 4ක් කැරකෙනවා
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center text-center overflow-hidden relative">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Spin & Win 🎡</h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Try your luck and get exclusive discounts!</p>
      </div>

      <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center">
        {/* Pointer (ඊතලය) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-6 h-8 bg-rose-brand-dark rounded-b-full shadow-lg" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}></div>
        </div>

        {/* The Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: "easeOut" }}
          className="w-full h-full rounded-full border-8 border-gray-50 shadow-2xl overflow-hidden relative"
          style={{ background: `conic-gradient(${prizes.map((p, i) => `${p.color} ${i * (100 / prizes.length)}% ${(i + 1) * (100 / prizes.length)}%`).join(', ')})` }}
        >
          {prizes.map((prize, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] md:text-xs font-black text-white uppercase tracking-tighter"
              style={{ transform: `rotate(${i * (360 / prizes.length) + (360 / prizes.length / 2)}deg) translateY(-80px) md:translateY(-120px)` }}
            >
              {prize.text}
            </div>
          ))}
        </motion.div>

        {/* Center Button */}
        <button
          onClick={spin}
          disabled={isSpinning}
          className="absolute z-30 w-16 h-16 md:w-20 md:h-20 bg-white rounded-full shadow-2xl flex items-center justify-center border-4 border-gray-50 hover:scale-105 transition-transform active:scale-95 group"
        >
          <span className="text-[10px] font-black uppercase text-rose-brand-dark group-hover:text-rose-brand">
            {isSpinning ? "Wait..." : "SPIN"}
          </span>
        </button>
      </div>

      {/* Result Display */}
      <div className="mt-10 h-12">
        {result && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2 text-rose-brand-dark font-black uppercase tracking-widest bg-rose-brand/5 px-6 py-3 rounded-2xl">
            <Trophy size={18} />
            Congratulations! You won: {result}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SpinWheel;
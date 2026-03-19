"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BannerSlider = ({ banners }: { banners: any[] }) => {
  const [index, setIndex] = useState(0);

  // Auto-slide logic - PC සහ Mobile දෙකටම තත්පර 5කට වරක් slide වේ
  useEffect(() => {
    if (!banners || banners.length === 0) return;
    
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000); 
    
    return () => clearInterval(timer);
  }, [banners.length]);

  // Banners නැතිනම් කිසිවක් පෙන්වන්නේ නැත
  if (!banners || banners.length === 0) return null;

  return (
    <div className="mt-10 md:mt-20 relative w-full aspect-[2/1] md:aspect-[21/9] overflow-hidden rounded-[2rem] md:rounded-[3.5rem] border-2 border-gray-50 shadow-2xl bg-gray-50">
      <AnimatePresence mode="wait">
        <motion.img
          key={banners[index]?.id || index}
          src={banners[index]?.img}
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -80 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>
      
      {/* Navigation Dots (පහළින් තියෙන පොඩි රවුම්) */}
      <div className="absolute bottom-5 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-10">
        {banners.map((_, i) => (
          <button 
            key={i} 
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === index 
                ? "bg-rose-500 w-8 md:w-12 shadow-lg shadow-rose-300" 
                : "bg-white/40 w-2 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* පැති දෙකෙන් එන Gradient Overlay (Optional - Look එක ලස්සන කිරීමට) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
    </div>
  );
};

export default BannerSlider;
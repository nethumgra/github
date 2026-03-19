"use client";

import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { MessageCircle, Paintbrush, ShoppingBag, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface SpecialCategory {
  id: string;
  name: string;
  description: string; // "Chat with us for ___?"
  accentColor: string;
  chatLink: string;
}

interface SpecialProductActionsProps {
  product: any; // Your product object from Firestore
  // For wishlist — pass your existing wishlist add handler
  onAddToWishlist?: () => void;
  isWishlisted?: boolean;
}

/**
 * SpecialProductActions
 *
 * Drop this component onto your product detail page.
 * It checks product.specialCategory:
 *   - If set   → shows Chat banner + "Customize" & "Buy This" buttons (no cart)
 *   - If empty → renders null (your normal Buy Now / Add to Cart remain)
 *
 * Usage:
 *   <SpecialProductActions
 *     product={product}
 *     onAddToWishlist={handleAddToWishlist}
 *     isWishlisted={wishlisted}
 *   />
 */
export default function SpecialProductActions({
  product,
  onAddToWishlist,
  isWishlisted = false,
}: SpecialProductActionsProps) {
  const [specialCat, setSpecialCat] = useState<SpecialCategory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product?.specialCategory) { setSpecialCat(null); return; }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "specialCategories", product.specialCategory),
      (snap) => {
        if (snap.exists()) {
          setSpecialCat({ id: snap.id, ...snap.data() } as SpecialCategory);
        } else {
          setSpecialCat(null);
        }
        setLoading(false);
      },
      () => { setSpecialCat(null); setLoading(false); }
    );
    return () => unsub();
  }, [product?.specialCategory]);

  // Not a special product → render nothing, let normal buttons show
  if (!product?.specialCategory || loading) return null;
  if (!specialCat) return null;

  const accent = specialCat.accentColor || "#c12a52";

  const handleCustomize = () => {
    const msg = encodeURIComponent(
      `Hi! I'm interested in customizing: *${product.name}*\nPlease let me know the options & pricing. 🌸`
    );
    const link = specialCat.chatLink
      ? `${specialCat.chatLink}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(link, "_blank");
  };

  const handleBuyThis = () => {
    const msg = encodeURIComponent(
      `Hi! I want to buy: *${product.name}*\nPrice: Rs. ${product.discountedPrice || product.originalPrice}\nPlease confirm availability. 🛒`
    );
    const link = specialCat.chatLink
      ? `${specialCat.chatLink}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(link, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4 w-full"
    >
      {/* ── Chat Banner ── */}
      <div
        className="relative flex items-center gap-4 rounded-[1.75rem] px-6 py-4 overflow-hidden"
        style={{ backgroundColor: `${accent}14`, border: `1.5px solid ${accent}30` }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
          style={{ backgroundColor: accent }}
        />

        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
          style={{ backgroundColor: accent }}
        >
          <MessageCircle size={18} className="text-white" />
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
            Special Item
          </p>
          <p className="text-sm font-bold text-gray-700 leading-snug">
            Chat with us for{" "}
            <span className="font-black" style={{ color: accent }}>
              {specialCat.description || specialCat.name}
            </span>
            ?
          </p>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Customize */}
        <button
          onClick={handleCustomize}
          className="relative flex items-center justify-center gap-2.5 py-4 px-5 rounded-[1.5rem] font-black text-sm uppercase tracking-wide text-white overflow-hidden group transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 8px 24px ${accent}40`,
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${accent}ee, ${accent})` }} />
          <Paintbrush size={16} className="relative z-10 shrink-0" />
          <span className="relative z-10">Customize</span>
        </button>

        {/* Buy This */}
        <button
          onClick={handleBuyThis}
          className="relative flex items-center justify-center gap-2.5 py-4 px-5 rounded-[1.5rem] font-black text-sm uppercase tracking-wide overflow-hidden group transition-all hover:scale-[1.02] active:scale-95 border-2"
          style={{
            color: accent,
            borderColor: `${accent}50`,
            backgroundColor: `${accent}08`,
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
            style={{ backgroundColor: accent }} />
          <ShoppingBag size={16} className="relative z-10 shrink-0" />
          <span className="relative z-10">Buy This</span>
        </button>
      </div>

      {/* ── Wishlist Only ── */}
      <button
        onClick={onAddToWishlist}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all border-2 ${
          isWishlisted
            ? "bg-rose-50 border-rose-200 text-rose-500"
            : "bg-gray-50 border-gray-100 text-gray-400 hover:border-rose-200 hover:text-rose-400 hover:bg-rose-50/40"
        }`}
      >
        <Heart size={14} className={isWishlisted ? "fill-rose-500 text-rose-500" : ""} />
        {isWishlisted ? "Saved to Wishlist" : "Save to Wishlist"}
      </button>

      {/* ── Note ── */}
      <p className="text-center text-[10px] text-gray-300 font-bold">
        ✨ This is a special item — order via chat for best experience
      </p>
    </motion.div>
  );
}


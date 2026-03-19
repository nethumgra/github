"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShoppingCart, Sparkles } from "lucide-react";
import Link from "next/link";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  deliveryCharge?: number | string; // Type එක string වෙන්නත් පුළුවන් නිසා string දැම්මා
}

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const loadCart = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem("loversmart_cart") || "[]");
    setCartItems(saved);
  }, []);

  useEffect(() => {
    loadCart();

    const handleCartUpdate = () => {
      const saved: CartItem[] = JSON.parse(localStorage.getItem("loversmart_cart") || "[]");
      
      setCartItems((prev) => {
        const newItem = saved.find(
          (s) => !prev.find((p) => p.id === s.id) || 
                 saved.find(s2 => s2.id === s.id && s2.qty > (prev.find(p => p.id === s.id)?.qty || 0))
        );
        if (newItem) setLastAdded(newItem.id);
        return saved;
      });

      setIsOpen(true);
      setTimeout(() => setLastAdded(null), 2000);
    };

    const handleOpenCart = () => setIsOpen(true);

    window.addEventListener("cart-updated", handleCartUpdate);
    window.addEventListener("open-cart", handleOpenCart);
    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
      window.removeEventListener("open-cart", handleOpenCart);
    };
  }, [loadCart]);

  const updateQty = (id: string, delta: number) => {
    setCartItems((prev) => {
      const updated = prev
        .map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item)
        .filter((item) => item.qty > 0);
      localStorage.setItem("loversmart_cart", JSON.stringify(updated));
      window.dispatchEvent(new Event("cart-updated-internal"));
      return updated;
    });
  };

  const removeItem = (id: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("loversmart_cart", JSON.stringify(updated));
      window.dispatchEvent(new Event("cart-updated-internal"));
      return updated;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("loversmart_cart");
    window.dispatchEvent(new Event("cart-updated-internal"));
  };

  // ✅ MATH FIX: ඔක්කොම Number() වලට convert කරනවා string concatenation නොවෙන්න
  const subtotal = cartItems.reduce((sum, i) => sum + (Number(i.price) * i.qty), 0);
const deliveryFee = cartItems.length > 0 
  ? Math.max(...cartItems.map(i => Number(i.deliveryCharge) || 350)) 
  : 0;
  const total = subtotal + deliveryFee;
  const totalQty = cartItems.reduce((sum, i) => sum + i.qty, 0);

  const handleCheckoutNow = () => {
    if (cartItems.length === 0) return;
    const checkoutData = { items: cartItems, subtotal, deliveryFee, total };
    localStorage.setItem('loversmart_checkout', JSON.stringify(checkoutData));
    setIsOpen(false);
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-10 right-4 z-40 bg-gray-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl hover:bg-rose-500 transition-all active:scale-90 group"
      >
        <ShoppingCart size={22} />
        {totalQty > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
            {totalQty > 99 ? "99+" : totalQty}
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-50 flex flex-col shadow-2xl"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between px-6 py-6 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                    <ShoppingBag size={18} className="text-rose-500" />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-sm uppercase tracking-tighter">Your Cart</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{totalQty} items</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900">
                  <X size={18} />
                </button>
              </div>

              {/* ITEMS LIST */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-200"><ShoppingCart size={32} /></div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Cart is empty</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      className="flex gap-4 p-3 rounded-2xl border border-gray-50 relative group hover:border-rose-100 transition-colors"
                      animate={{ backgroundColor: lastAdded === item.id ? ["#fff1f2", "#ffffff"] : "#ffffff" }}
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                        <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-bold text-gray-800 text-[11px] uppercase line-clamp-1">{item.name}</h4>
                          <p className="font-black text-rose-500 text-[13px] mt-0.5">Rs. {Number(item.price).toLocaleString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center bg-gray-50 rounded-lg p-1">
                            <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:text-rose-500 transition-colors"><Minus size={10} /></button>
                            <span className="w-6 text-center text-[11px] font-black">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:text-rose-500 transition-colors"><Plus size={10} /></button>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* FOOTER */}
              {cartItems.length > 0 && (
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>Rs. {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <span>Delivery</span>
                      <span>Rs. {deliveryFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                      <span className="text-[12px] font-black text-gray-900 uppercase">Total Amount</span>
                      <span className="text-lg font-black text-rose-500">Rs. {total.toLocaleString()}</span>
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    onClick={handleCheckoutNow}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-100 active:scale-95"
                  >
                    Checkout Now <ArrowRight size={16} />
                  </Link>
                  <button onClick={clearCart} className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Clear Cart</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
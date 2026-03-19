"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Truck, Landmark, CheckCircle2, Loader2,
  MapPin, ShoppingBag, Phone, Mail, User, Trash2,
  Copy, Check, Shield, Package, Upload, ArrowRight, Sparkles, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from "../../context/AuthContext";

// ─── TypeScript ─────────────────────────────────────────────────────────────
interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  deliveryCharge?: number;
  [key: string]: any;
}
interface OrderData {
  items: CheckoutItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

// ─── Price resolver — handles ALL Firebase field name variations ─────────────
function resolvePrice(item: any): number {
  const raw = item.discountedPrice ?? item.price ?? item.salePrice ?? item.sellingPrice ?? item.amount ?? 0;
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}
function resolveQty(item: any): number {
  const n = Number(item.qty ?? item.quantity ?? 1);
  return isNaN(n) || n < 1 ? 1 : n;
}
function resolveDelivery(item: any): number {
  const n = Number(item.deliveryCharge ?? item.delivery ?? 350);
  return isNaN(n) ? 350 : n;
}
function normaliseItems(raw: any[]): CheckoutItem[] {
  return raw.map(item => ({
    ...item,
    price: resolvePrice(item),
    qty: resolveQty(item),
    deliveryCharge: resolveDelivery(item),
  }));
}
function computeTotals(items: CheckoutItem[]): OrderData {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = items.length > 0 ? Math.max(...items.map(i => i.deliveryCharge ?? 350)) : 0;
  return { items, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { user, userData } = useAuth();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>('cod');
  const [bankSlip, setBankSlip] = useState<File | null>(null);
  const [bankSlipPreview, setBankSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const [adminBankDetails, setAdminBankDetails] = useState({
    accountName: 'LoverSmart', accountNumber: '...', bankName: '...', branch: ''
  });

  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '',
    street: '', city: '', district: '', orderNotes: ''
  });

  // ── Bank details ────────────────────────────────────────────────────────
  useEffect(() => {
    getDoc(doc(db, "settings", "bank_details"))
      .then(s => { if (s.exists()) setAdminBankDetails(s.data() as any); })
      .catch(() => {});
  }, []);

  // ── Load & normalise cart — handles ALL localStorage key shapes ─────────
  useEffect(() => {
    const tryLoad = (key: string): any[] | null => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const arr: any[] = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
        return arr.length > 0 ? arr : null;
      } catch { return null; }
    };

    const rawItems =
      tryLoad('loversmart_checkout') ??
      tryLoad('loversmart_cart') ??
      null;

    if (!rawItems) { router.push('/'); return; }

    const normalised = normaliseItems(rawItems);
    const data = computeTotals(normalised);
    setOrderData(data);
    localStorage.setItem('loversmart_checkout', JSON.stringify(data));
  }, [router]);

  // ── Pre-fill from profile ───────────────────────────────────────────────
  useEffect(() => {
    const a = userData?.shippingAddress;
    setFormData(prev => ({
      ...prev,
      fullName: a?.fullName || prev.fullName,
      phone:    a?.phone    || prev.phone,
      street:   a?.street   || prev.street,
      city:     a?.city     || prev.city,
      district: a?.district || prev.district,
      email:    user?.email || prev.email,
    }));
  }, [userData, user]);

  // ── Delete item ─────────────────────────────────────────────────────────
  const handleDeleteItem = (itemId: string) => {
    if (!orderData) return;
    const remaining = orderData.items.filter(i => i.id !== itemId);
    if (remaining.length === 0) {
      localStorage.removeItem('loversmart_checkout');
      localStorage.removeItem('loversmart_cart');
      window.dispatchEvent(new Event('cart-updated'));
      router.push('/');
      return;
    }
    const next = computeTotals(remaining);
    setOrderData(next);
    localStorage.setItem('loversmart_checkout', JSON.stringify(next));
    localStorage.setItem('loversmart_cart', JSON.stringify(remaining));
    window.dispatchEvent(new Event('cart-updated'));
  };

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setBankSlip(file);
      setBankSlipPreview(URL.createObjectURL(file));
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'bank' && !bankSlip) {
      alert("Please upload your bank transfer slip.");
      return;
    }
    setIsSubmitting(true);
    try {
      // items save කරද්දී productId explicitly add කරනවා
      // item.id = Firestore product doc ID (cart push ekthi save vune)
      // admin orders tab deductStock function ekata productId field one
      const itemsWithProductId = (orderData?.items || []).map(item => ({
        ...item,
        productId: item.productId || item.id, // explicit — deductStock uses this
      }));

      await addDoc(collection(db, "orders"), {
        userId: user?.uid || "guest",
        shippingAddress: { ...formData },
        items: itemsWithProductId,
        payment: { method: paymentMethod, status: 'Pending', slipUploaded: !!bankSlip },
        pricing: {
          subtotal:    orderData?.subtotal    || 0,
          deliveryFee: orderData?.deliveryFee || 0,
          total:       orderData?.total       || 0,
        },
        orderStatus: 'Pending',
        createdAt: serverTimestamp(),
      });
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => {
        localStorage.removeItem('loversmart_checkout');
        localStorage.removeItem('loversmart_cart');
        window.dispatchEvent(new Event('cart-updated'));
        router.push('/');
      }, 3200);
    } catch {
      alert("Order failed. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  if (!orderData) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#faf8f6]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#111111]" size={36} />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const itemCount = orderData.items.reduce((s, i) => s + i.qty, 0);

  return (
    <main className="min-h-screen bg-[#faf8f6] font-sans antialiased text-gray-900 pb-28 lg:pb-12">

      {/* ── Success Overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center text-center p-6"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                <div className="absolute inset-0 bg-green-50 rounded-full animate-ping opacity-30" />
                <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-100">
                  <CheckCircle2 size={60} className="text-green-500" />
                </div>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-3">Order Placed!</h2>
              <p className="text-gray-400 font-semibold text-sm max-w-xs">
                Thank you for shopping with Lovzmart. We'll get your order ready soon! 🎉
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-sm transition-colors group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#111111] rounded-xl flex items-center justify-center shadow-lg ">
              <ShoppingBag size={15} className="text-white" />
            </div>
            <span className="font-black text-sm tracking-[0.15em] uppercase">Checkout</span>
          </div>

          <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <Shield size={11} />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Secure</span>
          </div>
        </div>
      </nav>

      {/* ── Layout ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 mt-8 lg:mt-10">
        <div className="flex flex-col lg:flex-row gap-7 lg:gap-10 items-start">

          {/* ── LEFT: Forms ───────────────────────────────────────────────── */}
          <div className="flex-1 space-y-5 w-full min-w-0">

            {/* ── Shipping ────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Header bar */}
              <div className="px-6 lg:px-8 py-5 border-b border-gray-50 flex items-center gap-4">
                <div className="w-9 h-9 bg-[#111111] rounded-2xl flex items-center justify-center shadow-md ">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight text-gray-900">Shipping Details</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Where should we deliver?</p>
                </div>
              </div>

              <div className="px-6 lg:px-8 py-6">
                <form id="orderForm" onSubmit={handleSubmitOrder} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput icon={<User size={14} />} placeholder="Full Name" required value={formData.fullName}
                    onChange={(e: any) => setFormData({ ...formData, fullName: e.target.value })} />
                  <FieldInput icon={<Phone size={14} />} placeholder="Phone Number" required value={formData.phone}
                    onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} />
                  <div className="sm:col-span-2">
                    <FieldInput icon={<Mail size={14} />} placeholder="Email Address" type="email" required value={formData.email}
                      onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldInput icon={<MapPin size={14} />} placeholder="Street Address" required value={formData.street}
                      onChange={(e: any) => setFormData({ ...formData, street: e.target.value })} />
                  </div>
                  <FieldInput placeholder="City" required value={formData.city}
                    onChange={(e: any) => setFormData({ ...formData, city: e.target.value })} />
                  <FieldInput placeholder="District" required value={formData.district}
                    onChange={(e: any) => setFormData({ ...formData, district: e.target.value })} />
                  <div className="sm:col-span-2">
                    <textarea
                      placeholder="Order notes (optional)..."
                      rows={2}
                      value={formData.orderNotes}
                      onChange={e => setFormData({ ...formData, orderNotes: e.target.value })}
                      className="w-full px-4 py-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 focus:border-[#111111]/40 focus:ring-2 focus:ring-[#111111]/10 outline-none text-sm font-medium text-gray-700 placeholder:text-gray-300 transition-all resize-none"
                    />
                  </div>
                </form>
              </div>
            </motion.div>

            {/* ── Payment ─────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 lg:px-8 py-5 border-b border-gray-50 flex items-center gap-4">
                <div className="w-9 h-9 bg-[#111111] rounded-2xl flex items-center justify-center shadow-md ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight text-gray-900">Payment Method</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Choose how you'd like to pay</p>
                </div>
              </div>

              <div className="px-6 lg:px-8 py-6">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <PaymentOption
                    active={paymentMethod === 'cod'}
                    onClick={() => setPaymentMethod('cod')}
                    icon={<Truck size={22} />}
                    title="Cash on Delivery"
                    desc="Pay at doorstep"
                    badge="Most Popular"
                  />
                  <PaymentOption
                    active={paymentMethod === 'bank'}
                    onClick={() => setPaymentMethod('bank')}
                    icon={<Landmark size={22} />}
                    title="Bank Transfer"
                    desc="Direct transfer"
                  />
                </div>

                {/* COD confirmation */}
                <AnimatePresence>
                  {paymentMethod === 'cod' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Cash on Delivery Selected</p>
                          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Your order will arrive in 3-5 business days. Pay when received.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bank transfer details */}
                <AnimatePresence>
                  {paymentMethod === 'bank' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      {/* Bank card */}
                      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[1.5rem] p-6 text-white relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
                        <div className="absolute -bottom-8 -left-4 w-36 h-36 bg-[#111111]/10 rounded-full" />

                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-5">Bank Transfer Details</p>
                        <div className="space-y-4 relative z-10">
                          <div>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Account Number</p>
                            <div className="flex items-center gap-3">
                              <p className="text-2xl font-mono font-bold tracking-[0.1em]">{adminBankDetails.accountNumber}</p>
                              <button
                                type="button"
                                onClick={() => { navigator.clipboard.writeText(adminBankDetails.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                              >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                            <div>
                              <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Account Name</p>
                              <p className="font-bold text-sm mt-0.5">{adminBankDetails.accountName}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Bank</p>
                              <p className="font-bold text-sm mt-0.5">{adminBankDetails.bankName}</p>
                            </div>
                            {adminBankDetails.branch && (
                              <div>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Branch</p>
                                <p className="font-bold text-sm mt-0.5">{adminBankDetails.branch}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Slip upload */}
                      <label className="relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-200 rounded-[1.5rem] cursor-pointer bg-gray-50 hover:bg-gray-100/70 hover:border-[#111111]/30 transition-all overflow-hidden group">
                        {bankSlipPreview ? (
                          <img src={bankSlipPreview} className="w-full h-full object-cover" alt="Bank slip" />
                        ) : (
                          <div className="text-center">
                            <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#111111]/10 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                              <Upload size={18} className="text-gray-400 group-hover:text-[#111111] transition-colors" />
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Upload Transfer Slip</p>
                            <p className="text-[10px] text-gray-300 font-bold mt-1">JPG, PNG accepted</p>
                          </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

          </div>

          {/* ── RIGHT: Order Summary ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="w-full lg:w-[380px] shrink-0"
          >
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm lg:sticky lg:top-24 overflow-hidden">

              {/* Summary header */}
              <div className="px-6 lg:px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-[#111111]" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-gray-900">Your Items</h2>
                </div>
                <span className="bg-[#111111] text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
              </div>

              {/* Items list */}
              <div className="px-6 lg:px-8 py-5 space-y-4 max-h-[340px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {orderData.items.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex gap-3 group relative"
                    >
                      <div className="relative shrink-0">
                        <div className="w-[68px] h-[68px] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="absolute -top-2 -right-2 bg-[#111111] text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow">
                          {item.qty}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 pr-8">
                        <h4 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2 pr-2">{item.name}</h4>
                        {/* ✅ Price clearly shown */}
                        <p className="text-[15px] font-black text-[#111111] mt-1 leading-none">
                          Rs. {(item.price * item.qty).toLocaleString()}
                        </p>
                        {item.qty > 1 && (
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                            Rs. {item.price.toLocaleString()} × {item.qty}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-xl text-gray-300 hover:text-[#111] hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Totals */}
              <div className="px-6 lg:px-8 py-5 border-t border-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-400">Subtotal</span>
                  <span className="text-sm font-black text-gray-900">Rs. {orderData.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-400">Delivery</span>
                  <span className="text-sm font-black text-gray-900">Rs. {orderData.deliveryFee.toLocaleString()}</span>
                </div>

                <div className="pt-3 border-t border-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Total Pay</span>
                    <span className="text-3xl font-black text-[#111111] tracking-tight leading-none">
                      Rs. {orderData.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust row */}
              <div className="px-6 lg:px-8 pb-3">
                <div className="flex items-center justify-center gap-5 py-3 border-y border-dashed border-gray-100">
                  {[
                    { icon: <Shield size={18} strokeWidth={2} />, label: 'Secure' },
                    { icon: <Truck size={18} strokeWidth={2} />, label: '3-5 Days' },
                    { icon: <RotateCcw size={18} strokeWidth={2} />, label: 'Easy Return' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5">
                      <div style={{ width: "36px", height: "36px", background: "#f5f5f5", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#111" }}>
                        {icon}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 lg:px-8 pb-7 pt-3">
                <button
                  form="orderForm"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#111111] text-white font-black rounded-2xl shadow-xl  hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3 tracking-[0.12em] uppercase text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Place Order Now</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-wider mt-3">
                  By placing order you agree to our terms
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </main>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldInput({ icon, ...props }: any) {
  return (
    <div className="relative group">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#111111] transition-colors pointer-events-none">
          {icon}
        </div>
      )}
      <input
        className={`w-full ${icon ? 'pl-11' : 'px-4'} pr-4 py-3.5 bg-gray-50/80 border border-gray-100 rounded-2xl outline-none focus:border-[#111111]/40 focus:ring-2 focus:ring-[#111111]/10 text-sm font-semibold text-gray-800 placeholder:text-gray-300 transition-all`}
        {...props}
      />
    </div>
  );
}

function PaymentOption({ active, onClick, icon, title, desc, badge }: {
  active: boolean; onClick: () => void;
  icon: React.ReactNode; title: string; desc: string; badge?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all select-none ${
        active
          ? 'border-[#111111] bg-gray-50 shadow-sm '
          : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 left-3 bg-[#111111] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
        active ? 'bg-[#111111] text-white shadow-md ' : 'bg-white text-gray-300 shadow-sm'
      }`}>
        {icon}
      </div>
      <h3 className={`text-[11px] font-black uppercase tracking-tight leading-none mb-1 ${active ? 'text-[#111111]' : 'text-gray-600'}`}>
        {title}
      </h3>
      <p className="text-[10px] text-gray-400 font-bold uppercase">{desc}</p>

      {active && (
        <div className="absolute top-3 right-3 w-4 h-4 bg-[#111111] rounded-full flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}
    </div>
  );
}
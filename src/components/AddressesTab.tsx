"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Edit3, Save, X, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Define the interface to fix "Implicit Any" errors
interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  district: string;
}

const AddressesTab = () => {
  const { user, userData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    district: ""
  });

useEffect(() => {

  if (userData?.shippingAddress && !isEditing) {
    setAddress(userData.shippingAddress);
  }
}, [userData, isEditing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        shippingAddress: address
      });
      
      setIsEditing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
   } catch (error) {
  console.error("Error saving address:", error);
  toast.error("Failed to save address. Please try again."); 
} finally {
  setIsSaving(false);
}
  };

  return (
    <div className="relative">
      {/* SUCCESS TOAST */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 size={18} className="text-green-400" />
            <span className="text-sm font-bold uppercase tracking-wider">Address Saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-10">
        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">My Address</h2>
        <p className="text-gray-400 text-sm font-medium">Primary delivery destination for orders.</p>
      </div>

      <div className="max-w-3xl">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-rose-500/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#c12a52]/20 font-bold text-gray-800"
                  value={address.fullName} onChange={(e) => setAddress({...address, fullName: e.target.value})} placeholder="Receiver's Name" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Phone Number</label>
                <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#c12a52]/20 font-bold text-gray-800"
                  value={address.phone} onChange={(e) => setAddress({...address, phone: e.target.value})} placeholder="07XXXXXXXX" />
              </div>
            </div>

            <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-gray-400 ml-1">Street Address</label>
                <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#c12a52]/20 font-bold text-gray-800"
                  value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} placeholder="House No, Street Name" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#c12a52]/20 font-bold text-gray-800"
                value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} placeholder="City" />
              <input required className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#c12a52]/20 font-bold text-gray-800"
                value={address.district} onChange={(e) => setAddress({...address, district: e.target.value})} placeholder="District" />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button type="submit" disabled={isSaving} className="bg-[#c12a52] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Address
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-100 text-gray-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            {address.street ? (
              <>
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-[#c12a52]">
                    <MapPin size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{address.fullName}</h3>
                    <p className="text-gray-500 font-medium">{address.street}, {address.city}, {address.district}</p>
                    <p className="text-gray-900 font-bold mt-2">{address.phone}</p>
                  </div>
                </div>
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#c12a52] transition-all">
                  <Edit3 size={14} /> Edit
                </button>
              </>
            ) : (
              <div className="text-center w-full py-6">
                <p className="text-gray-400 font-bold mb-4">No address saved.</p>
                <button onClick={() => setIsEditing(true)} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Add Address</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressesTab;
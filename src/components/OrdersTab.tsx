"use client";

import React, { useState, useEffect } from 'react';
import { db } from "../lib/firebase"; 
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { 
  Clock, Package, Loader2, CheckCircle2, Truck, 
  MapPin, Calendar, CreditCard, Banknote, Edit2, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrdersTab = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); 

  // Address edit karana order eke ID eka saha daththa thiyaganna states
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [tempAddress, setTempAddress] = useState({ street: '', city: '', district: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(orderItems);
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Address eka update karana function eka
  const handleUpdateAddress = async (orderId: string) => {
    setIsSaving(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        "shippingAddress.street": tempAddress.street,
        "shippingAddress.city": tempAddress.city,
        "shippingAddress.district": tempAddress.district
      });
      setEditingOrderId(null);
    } catch (error) {
      alert("Address update failed. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusUI = (status: string) => {
    switch (status) {
      case 'Completed':
        return { label: 'Completed', color: 'text-green-600 bg-green-50 border-green-100', icon: <CheckCircle2 size={12} />, barColor: 'bg-green-500' };
      case 'Dispatched':
        return { label: 'On the Way', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Truck size={12} className="animate-bounce" />, barColor: 'bg-blue-500' };
      default:
        return { label: status || 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-100 ring-2 ring-amber-50', icon: <Clock size={12} className="animate-pulse" />, barColor: 'bg-amber-400' };
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-rose-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Syncing History...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-10 px-4 font-sans">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 italic">My Orders</h2>
        <div className="bg-gray-100 px-4 py-1 rounded-full text-[10px] font-black uppercase">{orders.length} Records</div>
      </div>
      
      {orders.length === 0 ? (
        <div className="text-center py-24 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
          <Package className="mx-auto text-gray-200 mb-4" size={60} />
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">No history found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => {
            const statusUI = getStatusUI(order.orderStatus || 'Pending');
            const isPending = !order.orderStatus || order.orderStatus === 'Pending';
            const isEditing = editingOrderId === order.id;

            return (
              <div key={order.id} className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all group">
                <div className={`h-1.5 w-full ${statusUI.barColor}`} />

                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap justify-between items-start gap-6 mb-8">
                    <div className="flex gap-5">
                      <div className="w-16 h-16 rounded-[1.2rem] bg-gray-50 border border-gray-100 overflow-hidden shadow-inner shrink-0">
                        <img src={order.items?.[0]?.image} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Order Ref</p>
                        <h4 className="font-black text-gray-900 text-lg tracking-tighter uppercase italic leading-none">#{order.id.slice(-8).toUpperCase()}</h4>
                        <div className="flex items-center gap-2 mt-2">
                           <Calendar size={12} className="text-gray-300" />
                           <p className="text-[10px] font-black text-gray-400 uppercase">
                              {order.createdAt?.toDate().toLocaleDateString('en-GB')} at {order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 ${statusUI.color}`}>
                          {statusUI.icon} {statusUI.label}
                       </span>
                    </div>
                  </div>

                  {/* SHIPPING ADDRESS SECTION */}
                  <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-50">
                    <div className="flex justify-between items-center mb-4">
                       <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <MapPin size={12} className="text-rose-400" /> Delivery To
                       </h5>
                       {isPending && !isEditing && (
                         <button 
                           onClick={() => {
                             setEditingOrderId(order.id);
                             setTempAddress({ ...order.shippingAddress });
                           }}
                           className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 hover:underline"
                         >
                            <Edit2 size={10} /> Edit Address
                         </button>
                       )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                         <input 
                           className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-rose-400"
                           value={tempAddress.street}
                           onChange={(e) => setTempAddress({...tempAddress, street: e.target.value})}
                           placeholder="Street"
                         />
                         <div className="grid grid-cols-2 gap-3">
                           <input 
                             className="p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-rose-400"
                             value={tempAddress.city}
                             onChange={(e) => setTempAddress({...tempAddress, city: e.target.value})}
                             placeholder="City"
                           />
                           <input 
                             className="p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-rose-400"
                             value={tempAddress.district}
                             onChange={(e) => setTempAddress({...tempAddress, district: e.target.value})}
                             placeholder="District"
                           />
                         </div>
                         <div className="flex gap-2 justify-end pt-2">
                            <button onClick={() => setEditingOrderId(null)} className="p-2 px-4 bg-gray-200 text-gray-600 rounded-xl text-[9px] font-black uppercase flex items-center gap-1"><X size={12} /> Cancel</button>
                            <button onClick={() => handleUpdateAddress(order.id)} disabled={isSaving} className="p-2 px-4 bg-gray-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow-lg shadow-gray-200">{isSaving ? <Loader2 className="animate-spin" size={12}/> : <><Save size={12} /> Save Address</>}</button>
                         </div>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-gray-600 uppercase italic">
                        {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.district}
                      </p>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                    <div>
                       <p className="text-[9px] font-black text-gray-300 uppercase mb-1">Total Payment</p>
                       <p className="text-2xl font-black text-gray-900 tracking-tighter leading-none">Rs. {order.pricing?.total?.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg mr-2">
                          {order.payment?.method === 'cod' ? <Banknote size={12} className="text-emerald-500"/> : <CreditCard size={12} className="text-blue-500"/>}
                          <span className="text-[8px] font-black text-gray-400 uppercase italic">{order.payment?.method}</span>
                       </div>
                       <button className="px-6 py-3 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 transition-all shadow-xl shadow-gray-100">Details</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
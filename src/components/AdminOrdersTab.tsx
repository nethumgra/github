"use client";
import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { 
  collection, query, orderBy, updateDoc, 
  doc, deleteDoc, onSnapshot, getDoc, increment
} from "firebase/firestore";
import { 
  Package, User, Truck, CheckCircle, MapPin, 
  Phone, Edit3, Save, Trash2, Loader2, Eye,
  CreditCard, Banknote, StickyNote, Clock, AlertTriangle, PackageCheck
} from "lucide-react";

export default function AdminOrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [customStatus, setCustomStatus] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Track which orders already had stock deducted (to avoid double-deduct)
  const [stockWarnings, setStockWarnings] = useState<Record<string, string[]>>({});

  // 1. Real-time Fetching
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ─── Stock Deduction ────────────────────────────────────────────────
  // checkout/page.tsx order save: items = [..., { productId: item.id, id: item.id, ... }]
  // productId field explicitly save කරනවා දැන් — deduct reliable
  const deductStock = async (order: any): Promise<{ warnings: string[] }> => {
    const warnings: string[] = [];
    if (!order.items || order.items.length === 0) return { warnings };

    for (const item of order.items) {
      const productId = item.productId || item.product_id || item.productID || item.id || null;
      if (!productId) {
        warnings.push(`"${item.name}" — product ID හොයාගත්තේ නෑ`);
        continue;
      }
      try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) continue;
        
        const currentStock = productSnap.data().stock ?? null;
        if (currentStock === null || currentStock === undefined) continue;

        const qtyToDeduct = item.qty || 1;
        const newStock = currentStock - qtyToDeduct;

        if (newStock <= 0) {
          warnings.push(`"${item.name}" — ${newStock < 0 ? `oversold by ${Math.abs(newStock)}` : 'now out of stock'}`);
        } else if (newStock <= 3) {
          warnings.push(`"${item.name}" — only ${newStock} left!`);
        }

        await updateDoc(productRef, { stock: Math.max(0, newStock) });
      } catch (err) {
        console.error(`Stock deduct error for ${productId}:`, err);
        warnings.push(`"${item.name}" — update error`);
      }
    }
    return { warnings };
  };

  // 2. Update Status Function — with stock deduction on Dispatch/Complete
  const updateStatus = async (orderId: string, newStatus: string, order?: any) => {
    setActionLoading(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderData = order || orders.find(o => o.id === orderId);
      const prevStatus = orderData?.orderStatus || 'Pending';

      // ── Stock Deduction Logic ──
      // Deduct stock when moving to "Dispatched" for the first time.
      // If already dispatched and marking complete, don't deduct again.
      const isPending = prevStatus === 'Pending' || prevStatus === 'New Order' || !prevStatus;
      const shouldDeductStock = 
        (newStatus === 'Dispatched' && isPending) ||
        (newStatus === 'Completed' && isPending); // skip if already dispatched

      if (shouldDeductStock && orderData?.items?.length > 0) {
        const { warnings } = await deductStock(orderData);
        
        if (warnings.length > 0) {
          setStockWarnings(prev => ({ ...prev, [orderId]: warnings }));
          // Show warning toasts
          warnings.forEach(w => toast(`⚠️ Stock Alert: ${w}`, { 
            style: { background: '#fef3c7', color: '#92400e', fontWeight: 'bold' },
            duration: 5000,
          }));
        } else {
          toast.success('📦 Stock updated successfully!');
        }
      }

      await updateDoc(orderRef, { orderStatus: newStatus });
      setEditingStatus(null);

    } catch (error) {
      console.error(error);
      toast.error("Status update failed!");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
        toast.success("Order deleted.");
      } catch (error) {
        toast.error("Failed to delete order."); 
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-32 gap-4">
      <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Syncing Orders...</p>
    </div>
  );

  return (
    <div className="p-6 bg-[#fafafa] min-h-screen font-sans">
      
      {/* Header Section */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Logistics Center 📦</h2>
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">Real-time Order Fulfillment</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white px-6 py-4 rounded-[2rem] border border-gray-100 shadow-sm">
            <span className="text-[9px] font-black text-amber-500 uppercase block tracking-widest">Pending Action</span>
            <span className="text-2xl font-black text-gray-800 leading-none">
              {orders.filter(o => !o.orderStatus || o.orderStatus === 'Pending' || o.orderStatus === 'New Order').length}
            </span>
          </div>
          <div className="bg-rose-500 px-6 py-4 rounded-[2rem] shadow-lg shadow-rose-200">
            <span className="text-[9px] font-black text-white/70 uppercase block tracking-widest">Total Orders</span>
            <span className="text-2xl font-black text-white leading-none">{orders.length}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ordered Items</th>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Shipping Info</th>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Current Status</th>
                <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Fulfillment</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-50">
              {orders.length > 0 ? orders.map((order) => {
                const currentStatus = order.orderStatus || 'Pending';
                const hasStockWarnings = stockWarnings[order.id]?.length > 0;
                
                return (
                  <tr key={order.id} className="hover:bg-rose-50/20 transition-all group">
                    
                    {/* 1. PRODUCT INFO */}
                    <td className="p-8">
                      <div className="flex flex-col gap-3">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 bg-white shrink-0 shadow-sm">
                              <img src={item.image} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div>
                              <p className="font-black text-gray-800 text-[11px] uppercase leading-tight">{item.name}</p>
                              <p className="text-[9px] text-rose-500 font-black mt-0.5">QTY: {item.qty} × Rs.{item.price}</p>
                            </div>
                          </div>
                        ))}
                        <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mt-2">ID: #{order.id.slice(-8).toUpperCase()}</p>

                        {/* ── Stock Warning Panel ── */}
                        {hasStockWarnings && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-1">
                            <p className="text-[9px] font-black text-amber-600 uppercase flex items-center gap-1">
                              <AlertTriangle size={10} /> Stock Alerts
                            </p>
                            {stockWarnings[order.id].map((w, i) => (
                              <p key={i} className="text-[8px] font-bold text-amber-700">{w}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 2. SHIPPING INFO */}
                    <td className="p-8">
                      <div className="space-y-3">
                        <p className="text-xs font-black text-gray-800 uppercase flex items-center gap-2">
                           <User size={14} className="text-gray-300"/> {order.shippingAddress?.fullName}
                        </p>
                        <div className="space-y-1 ml-6">
                          <p className="text-[10px] font-bold text-gray-600 flex items-center gap-2">
                              <Phone size={12} className="text-rose-400"/> {order.shippingAddress?.phone}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase flex items-start gap-2 max-w-[180px]">
                              <MapPin size={12} className="shrink-0 text-gray-300" />
                              <span>{order.shippingAddress?.street}, {order.shippingAddress?.city}</span>
                          </p>
                          {order.shippingAddress?.orderNotes && (
                            <div className="mt-2 bg-amber-50 p-2 rounded-xl border border-amber-100 flex gap-2">
                                <StickyNote size={10} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[8px] text-amber-700 font-bold uppercase leading-tight">{order.shippingAddress.orderNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. CURRENT STATUS */}
                    <td className="p-8 text-center">
                      <div className="flex flex-col items-center gap-4">
                        {editingStatus === order.id ? (
                          <div className="flex items-center gap-1">
                            <input 
                              className="p-2 border rounded-xl text-[9px] font-black uppercase w-28 outline-none border-rose-200"
                              value={customStatus}
                              onChange={(e) => setCustomStatus(e.target.value)}
                            />
                            <button onClick={() => updateStatus(order.id, customStatus, order)} className="p-2 bg-green-500 text-white rounded-xl">
                              <Save size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 ${
                              currentStatus === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
                              currentStatus === 'Dispatched' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              'bg-amber-50 text-amber-600 border-amber-100 ring-2 ring-amber-100/50'
                              }`}>
                                {currentStatus === 'Pending' && <Clock size={10} className="animate-pulse" />}
                                {currentStatus === 'Completed' && <PackageCheck size={10} />}
                                {currentStatus}
                              </span>
                              <button 
                                  onClick={() => { setEditingStatus(order.id); setCustomStatus(currentStatus); }}
                                  className="text-[8px] font-black text-gray-300 hover:text-rose-500 uppercase flex items-center gap-1"
                              >
                                  <Edit3 size={10} /> Change Status
                              </button>
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-50 w-full flex flex-col items-center gap-2">
                           <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-lg">
                              {order.payment?.method === 'cod' ? <Banknote size={12} className="text-emerald-500"/> : <CreditCard size={12} className="text-blue-500"/>}
                              <span className="text-[8px] font-black text-gray-500 uppercase">
                                  {order.payment?.method === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
                              </span>
                           </div>
                           {order.payment?.slipUrl && (
                              <a href={order.payment.slipUrl} target="_blank" className="text-[8px] text-blue-500 font-black uppercase hover:underline">View Slip</a>
                           )}
                        </div>
                      </div>
                    </td>

                    {/* 4. FULFILLMENT ACTIONS */}
                    <td className="p-8">
                      <div className="flex flex-col gap-4 items-end">
                        <div className="flex gap-2">
                          {/* Dispatch — deducts stock (Pending → Dispatched) */}
                          <button 
                            disabled={actionLoading === order.id || currentStatus === 'Dispatched' || currentStatus === 'Completed'}
                            onClick={() => updateStatus(order.id, 'Dispatched', order)} 
                            className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title={currentStatus !== 'Pending' ? 'Already dispatched' : 'Dispatch Order (deducts stock)'}
                          >
                            {actionLoading === order.id ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                          </button>
                          
                          {/* Complete — deducts stock only if still Pending */}
                          <button 
                            disabled={actionLoading === order.id || currentStatus === 'Completed'}
                            onClick={() => updateStatus(order.id, 'Completed', order)} 
                            className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title={currentStatus === 'Completed' ? 'Already completed' : 'Mark as Completed'}
                          >
                            <CheckCircle size={18} />
                          </button>

                          <button 
                            onClick={() => deleteOrder(order.id)} 
                            className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                            title="Delete Order"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-black text-gray-900 tracking-tighter italic">Rs. {order.pricing?.total?.toLocaleString()}</p>
                          {/* Show stock deduction status */}
                          {(currentStatus === 'Dispatched' || currentStatus === 'Completed') && (
                            <p className="text-[8px] font-black text-green-400 uppercase tracking-widest flex items-center justify-end gap-1 mt-1">
                              <PackageCheck size={9} /> Stock Updated
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="p-32 text-center text-gray-300 font-black uppercase tracking-widest">No Orders Yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

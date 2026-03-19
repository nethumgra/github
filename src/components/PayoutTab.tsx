"use client";
import { useState } from 'react';
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Wallet, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function PayoutTab({ earnings, userId }: { earnings: number, userId: string }) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleRequest = async () => {
    const requestAmount = Number(amount);
    if (requestAmount > earnings || requestAmount < 500) {
      alert("Invalid Amount! Minimum Rs. 500 required and cannot exceed balance.");
      return;
    }
    
    setStatus('loading');
    try {
      await addDoc(collection(db, "payout_requests"), {
        userId,
        amount: requestAmount,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-rose-100 shadow-sm max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-rose-100"><Wallet size={28} /></div>
        <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Withdraw Earnings</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Balance: Rs. {earnings}</p>
        </div>
      </div>
      
      {status === 'success' ? (
        <div className="text-center py-6 animate-in zoom-in-95">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
          <h4 className="text-lg font-black uppercase mb-2">Request Sent!</h4>
          <p className="text-xs font-bold text-gray-400 uppercase">We will process your payout within 24-48 hours.</p>
          <button onClick={() => setStatus('idle')} className="mt-8 text-rose-500 font-black text-[10px] uppercase">New Request</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-amber-50 p-4 rounded-2xl flex items-center gap-3 text-amber-700 border border-amber-100">
             <AlertCircle size={18} />
             <p className="text-[10px] font-bold uppercase">Minimum withdrawal amount is Rs. 500</p>
          </div>
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300">Rs.</span>
            <input 
              type="number" 
              placeholder="ENTER AMOUNT" 
              className="w-full pl-14 pr-6 py-5 bg-gray-50 rounded-2xl text-sm font-bold outline-none border border-transparent focus:border-rose-200 uppercase"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button 
            disabled={status === 'loading' || !amount}
            onClick={handleRequest}
            className="w-full py-5 bg-rose-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50"
          >
            {status === 'loading' ? 'Processing...' : 'Request Payout Now'}
          </button>
        </div>
      )}
    </div>
  );
}
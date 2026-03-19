"use client";
import React, { useState, useEffect } from 'react';
import { db } from "../../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Users, DollarSign, Share2, 
  Copy, ExternalLink, Wallet, Store, UserCircle, 
  Building2, UserCheck, Hash, MapPin, Check, Sparkles,
  User, LogOut // Added LogOut icon
} from 'lucide-react';

// Components Imports

import AffiliateCharts from '../../../components/AffiliateCharts'; 
import PayoutTab from '../../../components/PayoutTab'; 
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from 'next/navigation'; // Import router for redirect

const AffiliateDashboard = () => {
  const { user, userData, logout } = useAuth(); // Destructured logout from context
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [copyStatus, setCopyStatus] = useState(false);
  
  const [bankInfo, setBankInfo] = useState({
    holderName: userData?.bankInfo?.holderName || '',
    bankName: userData?.bankInfo?.bankName || '',
    accountNumber: userData?.bankInfo?.accountNumber || '',
    branch: userData?.bankInfo?.branch || ''
  });

  const affiliateLink = `https://loversmart.com?ref=${user?.uid}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleBankUpdate = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { bankInfo });
      alert("Success! Your banking info updated.");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: TrendingUp },
    { id: 'store', label: 'Store', icon: Store },
    { id: 'payout', label: 'Withdraw', icon: Wallet },
    { id: 'profile', label: 'Settings', icon: UserCircle },
  ];

  const renderStats = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Clicks', value: userData?.totalClicks || 0, icon: ExternalLink, color: 'text-[#111]', bg: 'bg-gray-50' },
          { label: 'Referrals', value: userData?.referralCount || 0, icon: Users, color: 'text-[#111]', bg: 'bg-gray-50' },
          { label: 'Conversion', value: `${userData?.totalClicks ? ((userData?.referralCount / userData?.totalClicks) * 100).toFixed(1) : 0}%`, icon: TrendingUp, color: 'text-[#111]', bg: 'bg-gray-50' },
          { label: 'Earnings', value: `Rs. ${userData?.earnings || 0}`, icon: DollarSign, color: 'text-[#111]', bg: 'bg-gray-100/50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-[2.5rem] border border-gray-100/50 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-[#111] to-[#333] rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl ">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <Sparkles size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Share2 size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em]">Affiliate Portal</h3>
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-8 leading-tight max-w-md">Share your link and earn commissions on every sale!</h2>
          <div className="flex flex-col md:flex-row items-center gap-4 bg-white/10 backdrop-blur-lg p-2 rounded-[2rem] border border-white/20">
            <div className="flex-1 px-6 py-3 text-xs font-bold text-gray-200 truncate w-full md:w-auto">
              {affiliateLink}
            </div>
            <button onClick={copyToClipboard} className="w-full md:w-auto bg-white text-[#111] px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-lg active:scale-95">
              {copyStatus ? <Check size={14} className="text-green-500" /> : <Copy size={14} />} 
              {copyStatus ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderProfile = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-50/30 rounded-[3rem] p-8 md:p-10 border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#111] rounded-2xl flex items-center justify-center text-white shadow-lg ">
                <Building2 size={24} />
            </div>
            <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Banking Setup</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Where should we send your money?</p>
            </div>
        </div>
        
        <div className="grid gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative group">
              <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#111] transition-colors" size={18} />
              <input 
                value={bankInfo.holderName}
                onChange={(e) => setBankInfo({...bankInfo, holderName: e.target.value})}
                placeholder="ACCOUNT HOLDER NAME" 
                className="w-full pl-16 pr-8 py-5 bg-white rounded-[1.5rem] text-[11px] font-bold outline-none border border-gray-100 focus:border-gray-200 shadow-sm uppercase" 
              />
            </div>
            <div className="relative group">
              <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#111] transition-colors" size={18} />
              <input 
                value={bankInfo.bankName}
                onChange={(e) => setBankInfo({...bankInfo, bankName: e.target.value})}
                placeholder="BANK NAME" 
                className="w-full pl-16 pr-8 py-5 bg-white rounded-[1.5rem] text-[11px] font-bold outline-none border border-gray-100 focus:border-gray-200 shadow-sm uppercase" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative group">
              <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#111] transition-colors" size={18} />
              <input 
                value={bankInfo.accountNumber}
                onChange={(e) => setBankInfo({...bankInfo, accountNumber: e.target.value})}
                placeholder="ACCOUNT NUMBER" 
                className="w-full pl-16 pr-8 py-5 bg-white rounded-[1.5rem] text-[11px] font-bold outline-none border border-gray-100 focus:border-gray-200 shadow-sm uppercase" 
              />
            </div>
            <div className="relative group">
              <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#111] transition-colors" size={18} />
              <input 
                value={bankInfo.branch}
                onChange={(e) => setBankInfo({...bankInfo, branch: e.target.value})}
                placeholder="BRANCH NAME" 
                className="w-full pl-16 pr-8 py-5 bg-white rounded-[1.5rem] text-[11px] font-bold outline-none border border-gray-100 focus:border-gray-200 shadow-sm uppercase" 
              />
            </div>
          </div>
          <button 
            onClick={handleBankUpdate} 
            className="w-full py-5 bg-[#111] text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] mt-4 shadow-xl  hover:bg-gray-700 active:scale-[0.98] transition-all"
          >
            Save Banking Details
          </button>
        </div>
      </div>
    </div>
  );

  if (userData?.role !== 'affiliate') return <div className="pt-32 text-center text-gray-400 font-black uppercase tracking-widest">Unauthorized Access</div>;

  return (
    <div className="min-h-screen bg-[#fffafa] pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#111] rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Affiliate Active</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                {userData?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#111]">
                    <Wallet size={20} />
                </div>
                <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Available Balance</p>
                    <p className="text-xl font-black text-[#111] leading-none mt-1">Rs. {userData?.earnings || 0}</p>
                </div>
            </div>

            {/* Logout Button */}
            <button 
                onClick={handleLogout}
                className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#111] hover:border-gray-200 transition-all shadow-sm group"
                title="Logout"
            >
                <LogOut size={22} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-12 bg-gray-50/50 p-2 rounded-[2rem] border border-gray-100/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-white text-[#111] shadow-lg  border border-gray-100' 
                : 'text-gray-400 hover:text-[#111]'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Content Area */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {renderStats()}
                <AffiliateCharts />
              </motion.div>
            )}

           

            {activeTab === 'payout' && (
              <motion.div key="payout" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <PayoutTab earnings={userData?.earnings || 0} userId={user?.uid || ''} />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {renderProfile()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default AffiliateDashboard;
"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const ProfileSettingsTab = () => {
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const togglePassword = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Yellow Alert Box */}
      <div className="bg-[#eeb44f] text-white p-4 rounded-xl flex items-center gap-3 mb-8 shadow-sm">
        <div className="bg-white/20 p-1.5 rounded-full">
          <AlertCircle size={20} />
        </div>
        <p className="text-sm font-medium">
          Your account with LoverSmart.com is using a temporary password. We emailed you a link to change your password.
        </p>
      </div>

      <form className="space-y-6">
        {/* 2. Name Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-gray-700">First name <span className="text-[#111]">*</span></label>
            <input type="text" className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 outline-none transition-all bg-gray-50/30" />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-gray-700">Last name <span className="text-[#111]">*</span></label>
            <input type="text" className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 outline-none transition-all bg-gray-50/30" />
          </div>
        </div>

        {/* 3. Display Name */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-gray-700">Display name <span className="text-[#111]">*</span></label>
          <input type="text" defaultValue="janujayasooriya8412" className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 outline-none transition-all bg-gray-50/30" />
          <p className="text-[11px] text-gray-400 italic">This will be how your name will be displayed in the account section and in reviews</p>
        </div>

        {/* 4. Email Address */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-gray-700">Email address <span className="text-[#111]">*</span></label>
          <input type="email" defaultValue="janujayasooriya8412@gmail.com" className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 outline-none transition-all bg-gray-50/30" />
        </div>

        {/* 5. Password Section */}
        <div className="mt-12 pt-4 border-t border-gray-100">
          <div className="relative mb-8">
             <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight bg-white pr-4 inline-block relative z-10">Password change</h3>
             <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-100 -z-0"></div>
          </div>

          <div className="space-y-5 bg-gray-50/30 p-6 rounded-[32px] border border-gray-100">
            {/* Current Password */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700">Current password (leave blank to leave unchanged)</label>
              <div className="relative">
                <input 
                  type={showPasswords.current ? "text" : "password"} 
                  className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 outline-none transition-all" 
                />
                <button type="button" onClick={() => togglePassword('current')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111]">
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700">New password (leave blank to leave unchanged)</label>
              <div className="relative">
                <input 
                  type={showPasswords.new ? "text" : "password"} 
                  className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 outline-none transition-all" 
                />
                <button type="button" onClick={() => togglePassword('new')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111]">
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700">Confirm new password</label>
              <div className="relative">
                <input 
                  type={showPasswords.confirm ? "text" : "password"} 
                  className="w-full px-4 py-3 rounded-full border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-200 outline-none transition-all" 
                />
                <button type="button" onClick={() => togglePassword('confirm')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111]">
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Save Button */}
        <div className="pt-4">
          <button type="submit" className="bg-[#111] hover:bg-gray-700 text-white font-black uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg  transition-all active:scale-95 text-xs">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettingsTab;
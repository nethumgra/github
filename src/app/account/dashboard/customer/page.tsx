"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, ShoppingBag, LogOut, Coins,
  LayoutDashboard, MapPin, Heart,
  Package, ChevronRight, Settings,
  ArrowRight, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from "../../../../context/AuthContext";
import OrdersTab from '../../../../components/OrdersTab';
import ProfileSettingsTab from '../../../../components/ProfileSettingsTab';
import AddressesTab from '../../../../components/AddressesTab';
import WishlistTab from '../../../../components/WishlistTab';

// ─────────────────────────────────────────────
// MENU CONFIG
// ─────────────────────────────────────────────
const menuItems = [
  { id: 'dashboard', label: 'Dashboard', sub: 'Overview', icon: LayoutDashboard, iconBg: 'bg-gray-100', iconColor: 'text-[#111]' },
  { id: 'orders', label: 'My Orders', sub: 'Track deliveries', icon: ShoppingBag, iconBg: 'bg-gray-100', iconColor: 'text-[#111]' },
  { id: 'wishlist', label: 'Wishlist', sub: 'Saved items', icon: Heart, iconBg: 'bg-gray-100', iconColor: 'text-[#111]' },
  { id: 'addresses', label: 'Addresses', sub: 'Delivery locations', icon: MapPin, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
  { id: 'account-details', label: 'Profile Settings', sub: 'Edit info & password', icon: Settings, iconBg: 'bg-gray-100', iconColor: 'text-[#111]' },
];

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
const AccountPage = () => {
  const { user, userData, logout, login, signup, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) await login(email, password);
      else await signup(email, password, 'customer', {});
    } catch (err) {
      console.error("Auth error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!user) return (
    <AuthView
      isLogin={isLogin} setIsLogin={setIsLogin}
      authLoading={authLoading} handleAuth={handleAuth}
      setEmail={setEmail} setPassword={setPassword}
    />
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7]">

      {/* ════════════════════════════════
          PC LAYOUT  (lg and above)
      ════════════════════════════════ */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex gap-8 items-start">

            {/* ── PC SIDEBAR ── */}
            <aside className="w-80 shrink-0 sticky top-6">
              {/* Profile Card */}
              <div className="bg-[#111] rounded-[2.5rem] p-8 mb-4 relative overflow-hidden shadow-2xl ">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg mb-4">
                    <span className="text-2xl font-black text-white">
                      {userData?.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <h2 className="font-black text-white text-xl tracking-tight leading-tight">
                    {userData?.fullName || 'My Account'}
                  </h2>
                  <p className="text-white/60 text-[11px] font-bold mt-1 truncate">{user.email}</p>

                  {/* Points */}
                  <div className="mt-5 bg-white/15 border border-white/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins size={16} className="text-white" />
                      <span className="text-white/80 text-[11px] font-black uppercase tracking-wider">Points</span>
                    </div>
                    <span className="text-white font-black text-xl">{userData?.points || 0}</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                  <Package size={20} className="text-gray-500 mx-auto mb-1" />
                  <p className="font-black text-gray-800 text-lg leading-none">0</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Orders</p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                  <Heart size={20} className="text-gray-500 mx-auto mb-1" />
                  <p className="font-black text-gray-800 text-lg leading-none">0</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Wishlist</p>
                </div>
              </div>

              {/* Nav Menu */}
              <nav className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100">
                {menuItems.map((item, i) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-4 px-5 py-4 transition-all group relative ${
                        isActive
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-50'
                      } ${i < menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      {/* Active bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-1000 rounded-r-full" />
                      )}
                      <div className={`w-9 h-9 ${item.iconBg} rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-105'} transition-transform`}>
                        <Icon size={18} className={item.iconColor} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-[12px] font-black uppercase tracking-tight ${isActive ? 'text-[#111]' : 'text-gray-700'}`}>
                          {item.label}
                        </p>
                        <p className="text-[10px] font-medium text-gray-400">{item.sub}</p>
                      </div>
                      <ChevronRight size={16} className={`${isActive ? 'text-gray-500' : 'text-gray-300 group-hover:text-gray-400'} transition-colors`} />
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full mt-3 flex items-center justify-center gap-2 py-4 bg-white rounded-2xl border border-gray-100 text-gray-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-400 hover:border-red-100 transition-all shadow-sm"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </aside>

            {/* ── PC MAIN CONTENT ── */}
            <main className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
                    {activeTab === 'dashboard' && <PCDashboard user={user} userData={userData} setActiveTab={setActiveTab} />}
                    {activeTab === 'orders' && <div className="p-10"><OrdersTab /></div>}
                    {activeTab === 'addresses' && <div className="p-10"><AddressesTab /></div>}
                    {activeTab === 'account-details' && <div className="p-10"><ProfileSettingsTab /></div>}
                    {activeTab === 'wishlist' && <div className="p-10"><WishlistTab /></div>}
                    
                  </div>
                </motion.div>
              </AnimatePresence>
            </main>

          </div>
        </div>
      </div>

      {/* ════════════════════════════════
          MOBILE LAYOUT  (below lg)
      ════════════════════════════════ */}
      <div className="lg:hidden">
        {/* Hero Header */}
        <div className="bg-[#111] pt-14 pb-24 px-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-xl">
                <span className="text-xl font-black text-white">
                  {userData?.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Welcome back</p>
                <h1 className="text-white font-black text-lg tracking-tight leading-tight">
                  {userData?.fullName || 'My Account'}
                </h1>
                <p className="text-white/50 text-[10px] font-bold truncate max-w-[160px]">{user.email}</p>
              </div>
            </div>
            <div className="bg-white/15 border border-white/20 rounded-2xl px-3 py-2 text-center">
              <Coins size={13} className="text-white mx-auto mb-0.5" />
              <p className="text-white font-black text-[9px] uppercase">Pts</p>
              <p className="text-white font-black text-base leading-none">{userData?.points || 0}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="-mt-14 px-4 pb-28 relative z-10">
          <div className="bg-white rounded-[2.5rem] shadow-2xl  overflow-hidden border border-gray-100/50 mb-4">
            {activeTab === 'dashboard' && <MobileDashboard user={user} userData={userData} setActiveTab={setActiveTab} />}
            {activeTab !== 'dashboard' && (
              <div className="p-6">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 hover:text-[#111] transition-colors"
                >
                  <ChevronRight size={14} className="rotate-180" /> Back
                </button>
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
                    {activeTab === 'orders' && <OrdersTab />}
                    {activeTab === 'addresses' && <AddressesTab />}
                    {activeTab === 'account-details' && <ProfileSettingsTab />}
                    {activeTab === 'wishlist' && <WishlistTab />}
                    
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white rounded-2xl border border-gray-100 text-gray-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-400 transition-all shadow-sm"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Mobile Bottom Tab Bar */}
        <MobileBottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <LogoutModal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => { await logout(); router.push('/'); }} />
    </div>
  );
};

// ─────────────────────────────────────────────
// PC DASHBOARD
// ─────────────────────────────────────────────
const PCDashboard = ({ user, userData, setActiveTab }: any) => (
  <div>
    {/* Banner */}
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-10 py-8 border-b border-gray-200/50">
      <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em] mb-1">Dashboard</p>
      <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
        Hello, {userData?.fullName?.split(' ')[0] || 'there'} 👋
      </h2>
      <p className="text-gray-400 text-sm font-medium mt-1">Here's what's happening with your account</p>
    </div>

    {/* Stats Row */}
    <div className="grid grid-cols-3 gap-6 p-10 pb-0">
      {[
        { icon: Package, label: 'Total Orders', value: '0', color: 'text-[#111]', bg: 'bg-gray-100' },
        { icon: Heart, label: 'Wishlist Items', value: '0', color: 'text-[#111]', bg: 'bg-gray-100' },
        { icon: Coins, label: 'Reward Points', value: userData?.points || '0', color: 'text-[#111]', bg: 'bg-gray-100' },
      ].map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className={`${s.bg} rounded-3xl p-6`}>
            <Icon size={24} className={s.color} />
            <p className="text-3xl font-black text-gray-900 mt-3 leading-none">{s.value}</p>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        );
      })}
    </div>

    {/* Quick Access Grid */}
    <div className="p-10">
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-5">Quick Access</p>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {menuItems.filter(m => m.id !== 'dashboard').map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="group flex items-center gap-4 p-5 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl hover: border border-transparent hover:border-gray-200 transition-all duration-300 text-left"
            >
              <div className={`w-11 h-11 ${item.iconBg} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon size={20} className={item.iconColor} />
              </div>
              <div>
                <p className="text-[12px] font-black text-gray-800 uppercase tracking-tight group-hover:text-[#111] transition-colors">{item.label}</p>
                <p className="text-[10px] text-gray-400 font-medium">{item.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// MOBILE DASHBOARD
// ─────────────────────────────────────────────
const MobileDashboard = ({ user, userData, setActiveTab }: any) => (
  <div>
    {/* Stats strip */}
    <div className="grid grid-cols-3 border-b border-gray-100">
      {[
        { icon: <Package size={18} />, value: '0', label: 'Orders', color: 'text-[#111]' },
        { icon: <Heart size={18} />, value: '0', label: 'Wishlist', color: 'text-[#111]' },
        { icon: <Coins size={18} />, value: userData?.points || '0', label: 'Points', color: 'text-[#111]' },
      ].map((s, i) => (
        <div key={i} className={`flex flex-col items-center py-5 gap-1 ${i < 2 ? 'border-r border-gray-100' : ''}`}>
          <div className={s.color}>{s.icon}</div>
          <span className="text-lg font-black text-gray-800 leading-none">{s.value}</span>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
        </div>
      ))}
    </div>

    {/* Menu rows */}
    <div className="divide-y divide-gray-50">
      {menuItems.filter(m => m.id !== 'dashboard').map(item => {
        const Icon = item.icon;
        return (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-all group active:bg-gray-100/40">
            <div className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
              <Icon size={18} className={item.iconColor} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] font-black text-gray-800 uppercase tracking-tight">{item.label}</p>
              <p className="text-[10px] font-medium text-gray-400">{item.sub}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
          </button>
        );
      })}
    </div>
  </div>
);

// ─────────────────────────────────────────────
// MOBILE BOTTOM TAB BAR
// ─────────────────────────────────────────────
const MobileBottomBar = ({ activeTab, setActiveTab }: any) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'orders', icon: ShoppingBag, label: 'Orders' },
    { id: 'wishlist', icon: Heart, label: 'Wishlist' },
    { id: 'account-details', icon: User, label: 'Profile' },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative active:scale-90 transition-transform">
            {isActive && (
              <motion.div layoutId="mob-tab-dot"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-1 bg-gray-1000 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <Icon size={20} className={isActive ? 'text-[#111]' : 'text-gray-400'} />
            <span className={`text-[9px] font-black uppercase ${isActive ? 'text-[#111]' : 'text-gray-400'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────
// AUTH VIEW
// ─────────────────────────────────────────────
const AuthView = ({ isLogin, setIsLogin, authLoading, handleAuth, setEmail, setPassword }: any) => {
  const [showPass, setShowPass] = useState(false);
  return (
    <div className="min-h-screen bg-[#111] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 pt-20 pb-10">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/30">
            <span className="text-4xl font-black text-white">L</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            {isLogin ? 'Welcome Back!' : 'Join LoverSmart'}
          </h1>
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.2em] mt-2">
            {isLogin ? 'Sign in to your account' : 'Create your account today'}
          </p>
        </div>
      </div>
      <div className="bg-white rounded-t-[3rem] px-6 pt-10 pb-14 shadow-2xl">
        <form onSubmit={handleAuth} className="space-y-4 max-w-sm mx-auto">
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input required type="email" placeholder="Email address"
              className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-gray-300 transition-all placeholder:font-normal"
              onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input required type={showPass ? "text" : "password"} placeholder="Password"
              className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-gray-300 transition-all placeholder:font-normal"
              onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={authLoading}
            className="w-full py-4 bg-[#111] text-white rounded-2xl font-black text-sm uppercase tracking-[0.15em] shadow-xl  hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 mt-2">
            {authLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Please wait...
              </span>
            ) : isLogin ? 'Sign In' : 'Create Account'}
          </button>
          <button type="button" onClick={() => setIsLogin(!isLogin)}
            className="w-full pt-3 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#111] transition-colors flex items-center justify-center gap-2">
            {isLogin ? 'New here? Create account' : 'Already have account? Sign in'}
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// LOADING STATE
// ─────────────────────────────────────────────
const LoadingState = () => (
  <div className="h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-[#111] rounded-full animate-spin" />
      <p className="font-black text-[#111] animate-pulse uppercase tracking-[0.3em] text-[10px]">Loading...</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// LOGOUT MODAL
// ─────────────────────────────────────────────
const LogoutModal = ({ isOpen, onClose, onConfirm }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl mb-2 lg:mb-0">
          <div className="text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <LogOut size={26} className="text-red-400" />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">Sign Out?</h3>
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-8">You'll need to sign in again</p>
            <div className="space-y-3">
              <button onClick={onConfirm}
                className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-95">
                Yes, Sign Out
              </button>
              <button onClick={onClose}
                className="w-full bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default AccountPage;
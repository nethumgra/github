"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Lock, User, Phone, 
  ChevronRight, ArrowLeft, ShieldCheck, 
  UserCircle, Briefcase, CheckCircle2
} from 'lucide-react';
import { useAuth } from "../../context/AuthContext";

const AccountAuthPage = () => {
  const { user, userData, login, signup, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'customer' | 'affiliate'>('customer');
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user && userData) {
      if (userData.role === 'affiliate') {
        router.push('/account/dashboard');
      } else if (userData.role === 'customer') {
        router.push('/account/dashboard/customer'); 
      }
    }
  }, [user, userData, loading, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const extraData = role === 'affiliate' ? { fullName, phone, nic } : { fullName };
        await signup(email, password, role, extraData);
      }
    } catch (err) {
      console.error("Auth error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ width: "44px", height: "44px", border: "4px solid #f0f0f0", borderTop: "4px solid #111", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
        <p style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#bbb" }}>Securing Session...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "6rem 1.5rem 3rem" }}>

      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: "#fff", width: "100%", maxWidth: "420px", borderRadius: "2.5rem", padding: "2.5rem", boxShadow: "0 24px 80px rgba(0,0,0,0.08)", border: "1px solid #ececec", position: "relative", zIndex: 10 }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ width: "60px", height: "60px", background: "#111", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", transform: "rotate(12deg)" }}
          >
            <ShieldCheck style={{ color: "#fff", transform: "rotate(-12deg)" }} size={28} />
          </motion.div>
          <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#111", letterSpacing: "-0.02em", textTransform: "uppercase", margin: "0 0 6px" }}>
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>
            {isLogin ? 'Access your CMB LK portal' : 'Join our growing community today'}
          </p>
        </div>

        {/* Role Switcher */}
        <AnimatePresence>
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: "flex", padding: "5px", background: "#f5f5f5", borderRadius: "18px", marginBottom: "1.5rem", border: "1px solid #ececec" }}
            >
              <button
                onClick={() => setRole('customer')}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "14px", fontSize: "10px", fontWeight: 900, border: "none", cursor: "pointer", transition: "all 0.2s", background: role === 'customer' ? "#111" : "transparent", color: role === 'customer' ? "#fff" : "#aaa" }}
              >
                <UserCircle size={13} /> CUSTOMER
              </button>
              <button
                onClick={() => setRole('affiliate')}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", borderRadius: "14px", fontSize: "10px", fontWeight: 900, border: "none", cursor: "pointer", transition: "all 0.2s", background: role === 'affiliate' ? "#111" : "transparent", color: role === 'affiliate' ? "#fff" : "#aaa" }}
              >
                <Briefcase size={13} /> AFFILIATE
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <AnimatePresence mode='wait'>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem", overflow: "hidden" }}
              >
                <div style={{ position: "relative" }}>
                  <User style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: "#ccc" }} size={16} />
                  <input required placeholder="FULL NAME"
                    style={{ width: "100%", paddingLeft: "3rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", background: "#f5f5f5", borderRadius: "14px", fontSize: "11px", fontWeight: 700, outline: "none", border: "1.5px solid transparent", transition: "border 0.2s", textTransform: "uppercase", boxSizing: "border-box" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#333"}
                    onBlur={e => e.currentTarget.style.borderColor = "transparent"}
                    onChange={(e) => setFullName(e.target.value)} />
                </div>

                {role === 'affiliate' && (
                  <>
                    <div style={{ position: "relative" }}>
                      <Phone style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: "#ccc" }} size={16} />
                      <input required type="tel" placeholder="WHATSAPP NUMBER"
                        style={{ width: "100%", paddingLeft: "3rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", background: "#f5f5f5", borderRadius: "14px", fontSize: "11px", fontWeight: 700, outline: "none", border: "1.5px solid transparent", transition: "border 0.2s", textTransform: "uppercase", boxSizing: "border-box" }}
                        onFocus={e => e.currentTarget.style.borderColor = "#333"}
                        onBlur={e => e.currentTarget.style.borderColor = "transparent"}
                        onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div style={{ position: "relative" }}>
                      <ShieldCheck style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: "#ccc" }} size={16} />
                      <input required placeholder="NIC / ID NUMBER"
                        style={{ width: "100%", paddingLeft: "3rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", background: "#f5f5f5", borderRadius: "14px", fontSize: "11px", fontWeight: 700, outline: "none", border: "1.5px solid transparent", transition: "border 0.2s", textTransform: "uppercase", boxSizing: "border-box" }}
                        onFocus={e => e.currentTarget.style.borderColor = "#333"}
                        onBlur={e => e.currentTarget.style.borderColor = "transparent"}
                        onChange={(e) => setNic(e.target.value)} />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: "relative" }}>
            <Mail style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: "#ccc" }} size={16} />
            <input required type="email" placeholder="EMAIL ADDRESS"
              style={{ width: "100%", paddingLeft: "3rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", background: "#f5f5f5", borderRadius: "14px", fontSize: "11px", fontWeight: 700, outline: "none", border: "1.5px solid transparent", transition: "border 0.2s", textTransform: "uppercase", boxSizing: "border-box" }}
              onFocus={e => e.currentTarget.style.borderColor = "#333"}
              onBlur={e => e.currentTarget.style.borderColor = "transparent"}
              onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div style={{ position: "relative" }}>
            <Lock style={{ position: "absolute", left: "1.25rem", top: "50%", transform: "translateY(-50%)", color: "#ccc" }} size={16} />
            <input required type="password" placeholder="PASSWORD"
              style={{ width: "100%", paddingLeft: "3rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", background: "#f5f5f5", borderRadius: "14px", fontSize: "11px", fontWeight: 700, outline: "none", border: "1.5px solid transparent", transition: "border 0.2s", textTransform: "uppercase", boxSizing: "border-box" }}
              onFocus={e => e.currentTarget.style.borderColor = "#333"}
              onBlur={e => e.currentTarget.style.borderColor = "transparent"}
              onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            style={{ width: "100%", padding: "1.1rem", background: "#111", color: "#fff", borderRadius: "16px", fontWeight: 900, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", border: "none", cursor: authLoading ? "not-allowed" : "pointer", opacity: authLoading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "0.5rem", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", transition: "background 0.2s" }}
            onMouseEnter={e => !authLoading && ((e.currentTarget as HTMLButtonElement).style.background = "#333")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#111")}
          >
            {authLoading ? 'Syncing...' : (
              <>
                {isLogin ? 'Login Now' : `Register as ${role}`}
                <ChevronRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <button
          onClick={() => setIsLogin(!isLogin)}
          style={{ width: "100%", marginTop: "1.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "10px", fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.15em", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#111")}
          onMouseLeave={e => (e.currentTarget.style.color = "#bbb")}
        >
          {isLogin ? (
            <span>New to CMB LK? <span style={{ color: "#111", fontWeight: 900 }}>Create Account</span></span>
          ) : (
            <span>Already a member? <span style={{ color: "#111", fontWeight: 900 }}>Login here</span></span>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default AccountAuthPage;
"use client";
import React, { useState } from 'react';
import { auth, db } from "../lib/firebase"; // Ensure db is exported from your firebase config
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { X, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AuthModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- Login Logic ---
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- Registration Logic ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Initialize User Document in Firestore with 500 Welcome Points
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: email,
          points: 500, // Setting initial points for new users
          hasClaimedWelcome: false, // This triggers the gift animation in the wheel
          createdAt: new Date().toISOString(),
        });
      }
      onClose();
   } catch (err: any) {
  console.error("Auth Error:", err.code);
  const message = err.code === 'auth/user-not-found' ? "User not found." : 
                 err.code === 'auth/wrong-password' ? "Incorrect password." : 
                 err.code === 'auth/email-already-in-use' ? "Email already exists." : 
                 "Authentication failed. Please try again.";
  
  toast.error(message); // alert(message) වෙනුවට
} finally {
  setLoading(false);
}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 relative shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={24} />
        </button>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
            LoverSmart Fashion Hub
          </p>
          {!isLogin && (
            <div className="mt-4 inline-block bg-rose-50 text-rose-500 text-[10px] font-black px-4 py-1 rounded-full uppercase">
              Get 500 Free Points on Signup!
            </div>
          )}
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-gray-400" size={18} />
            <input 
              type="email" 
              placeholder="Email Address" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-rose-brand transition-all text-sm font-medium"
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-gray-400" size={18} />
            <input 
              type="password" 
              placeholder="Password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-rose-brand transition-all text-sm font-medium"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-rose-brand-dark text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-rose-brand/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                {isLogin ? "Login Now" : "Register & Claim Points"} 
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
          {isLogin ? "New to LoverSmart?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="ml-2 text-rose-brand-dark hover:underline"
          >
            {isLogin ? "Create Account" : "Login Here"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from "../lib/firebase"; 
import { onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Signup with Extra Details for Affiliates ---
  const signup = async (email: string, password: string, role: string, extraData?: any) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const userDoc = doc(db, "users", res.user.uid);
      
      // මූලික දත්ත
      let profileData = {
        uid: res.user.uid,
        email: email,
        role: role, // 'customer' හෝ 'affiliate'
        points: 0,
        createdAt: serverTimestamp(),
        ...extraData // Affiliate කෙනෙක් නම් මෙතනට නම, ෆෝන් එක, NIC එක එනවා
      };

      await setDoc(userDoc, profileData);
      return res;
    } catch (error) {
      throw error;
    }
  };

  const login = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = doc(db, "users", currentUser.uid);
        onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) setUserData(docSnap.data());
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
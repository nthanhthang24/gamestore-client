// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const register = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    // Lưu Firestore - không block nếu Firestore chưa tạo
    try {
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName,
        role: 'user',
        balance: 0,
        createdAt: serverTimestamp(),
        avatar: null,
      });
    } catch (e) {
      console.warn('Firestore chưa sẵn sàng:', e.message);
    }

    return userCredential;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    try {
      const userRef = doc(db, 'users', result.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          role: 'user',
          balance: 0,
          createdAt: serverTimestamp(),
          avatar: result.user.photoURL,
        });
      }
    } catch (e) {
      console.warn('Firestore Google login:', e.message);
    }
    return result;
  };

  const logout = () => signOut(auth);

  const fetchUserProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.banned) { await signOut(auth); return; } // kick banned users
        setUserProfile({ ...data, balance: data.balance || 0 });
      }
      else setUserProfile({ uid, balance: 0, role: 'user' });
    } catch (e) {
      console.warn('fetchUserProfile error:', e.message);
      setUserProfile({ uid, balance: 0, role: 'user' });
    }
  };

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      // Cancel previous profile listener
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }
      if (user) {
        // Initial fetch
        await fetchUserProfile(user.uid);
        // Realtime listener for balance changes (B-10)
        const { onSnapshot } = await import('firebase/firestore');
        profileUnsub = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              setUserProfile(prev => ({ ...prev, ...snap.data(), balance: snap.data().balance || 0 }));
            }
          },
          (err) => console.warn('Profile listener error:', err.message)
        );
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const value = { currentUser, userProfile, loading, register, login, loginWithGoogle, logout, fetchUserProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

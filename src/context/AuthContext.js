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
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      displayName,
      role: 'user',
      balance: 0,
      createdAt: serverTimestamp(),
      avatar: null,
    });
    return userCredential;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
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
    return result;
  };

  const logout = () => signOut(auth);

  const fetchUserProfile = async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) setUserProfile(snap.data());
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) await fetchUserProfile(user.uid);
      else setUserProfile(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = { currentUser, userProfile, register, login, loginWithGoogle, logout, fetchUserProfile };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

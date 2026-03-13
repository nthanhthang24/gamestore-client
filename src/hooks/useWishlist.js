// src/hooks/useWishlist.js
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useWishlist = (currentUser) => {
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    if (!currentUser) { setWishlist([]); return; }
    getDoc(doc(db,'wishlists',currentUser.uid)).then(snap => {
      if (snap.exists()) setWishlist(snap.data().items || []);
    }).catch(()=>{});
  }, [currentUser?.uid]);

  const toggle = useCallback(async (accountId) => {
    if (!currentUser) return false;
    const ref = doc(db,'wishlists',currentUser.uid);
    const inList = wishlist.includes(accountId);
    setWishlist(p => inList ? p.filter(x=>x!==accountId) : [...p, accountId]);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { items: inList ? arrayRemove(accountId) : arrayUnion(accountId) });
      } else {
        await setDoc(ref, { items: [accountId], updatedAt: new Date() });
      }
    } catch(e) {
      setWishlist(p => inList ? [...p, accountId] : p.filter(x=>x!==accountId)); // rollback
    }
    return !inList;
  }, [currentUser, wishlist]);

  const isWishlisted = useCallback((id) => wishlist.includes(id), [wishlist]);

  return { wishlist, toggle, isWishlisted };
};

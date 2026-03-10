// src/hooks/useFlashSale.js
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

// Helper: tính countdown
function getCountdown(endDate) {
  if (!endDate) return null;
  const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
  const diff = end - new Date();
  if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, expired: false, total: diff };
}

export const useFlashSale = () => {
  const [activeFlashSale, setActiveFlashSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);

  const fetchFlashSale = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'flashSales'), where('active', '==', true)));
      const now = new Date();
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(fs => {
          const start = fs.startAt?.toDate ? fs.startAt.toDate() : (fs.startAt ? new Date(fs.startAt) : null);
          const end = fs.endAt?.toDate ? fs.endAt.toDate() : (fs.endAt ? new Date(fs.endAt) : null);
          if (start && now < start) return false;
          if (end && now > end) return false;
          return true;
        });
      setActiveFlashSale(active || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFlashSale();
    const interval = setInterval(fetchFlashSale, 60000);
    return () => clearInterval(interval);
  }, [fetchFlashSale]);

  // Realtime countdown ticker
  useEffect(() => {
    if (!activeFlashSale?.endAt) { setCountdown(null); return; }
    const tick = () => {
      const cd = getCountdown(activeFlashSale.endAt);
      setCountdown(cd);
      if (cd?.expired) fetchFlashSale(); // re-fetch khi expire
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [activeFlashSale, fetchFlashSale]);

  const getSalePrice = (originalPrice) => {
    if (!activeFlashSale) return originalPrice;
    const discount = Math.min(Math.max(0, activeFlashSale.discount || 0), 99);
    return Math.round(originalPrice * (1 - discount / 100));
  };

  return { activeFlashSale, loading, getSalePrice, countdown };
};

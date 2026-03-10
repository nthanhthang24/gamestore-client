// src/hooks/useFlashSale.js
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useFlashSale = () => {
  const [activeFlashSale, setActiveFlashSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlashSale = async () => {
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
    };
    fetchFlashSale();
    // Re-check mỗi phút
    const interval = setInterval(fetchFlashSale, 60000);
    return () => clearInterval(interval);
  }, []);

  const getSalePrice = (originalPrice) => {
    if (!activeFlashSale) return originalPrice;
    return Math.round(originalPrice * (1 - activeFlashSale.discount / 100));
  };

  return { activeFlashSale, loading, getSalePrice };
};

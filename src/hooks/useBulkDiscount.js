// src/hooks/useBulkDiscount.js
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useBulkDiscount = () => {
  const [rules, setRules] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'bulkDiscountRules'), where('active', '==', true), orderBy('minQty', 'asc'))
        );
        setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        // Fallback: load without orderBy nếu index chưa tạo, sort client-side
        try {
          const snap2 = await getDocs(query(collection(db, 'bulkDiscountRules'), where('active', '==', true)));
          const sorted = snap2.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.minQty || 0) - (b.minQty || 0));
          setRules(sorted);
        } catch (e2) { console.error('bulkDiscount fallback error:', e2); }
      }
    };
    fetch();
  }, []);

  // Tìm rule phù hợp nhất với số lượng item
  const getApplicableRule = (qty) => {
    // Lấy rule có minQty <= qty, ưu tiên rule có minQty cao nhất (giảm nhiều nhất)
    const applicable = rules.filter(r => qty >= r.minQty);
    if (!applicable.length) return null;
    return applicable.reduce((best, r) => r.minQty > best.minQty ? r : best);
  };

  const getBulkDiscount = (subtotal, qty) => {
    const rule = getApplicableRule(qty);
    if (!rule) return { discount: 0, rule: null };
    const discount = Math.round(subtotal * rule.discountPct / 100);
    return { discount, rule };
  };

  return { rules, getApplicableRule, getBulkDiscount };
};

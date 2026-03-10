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
      } catch (e) { console.error(e); }
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

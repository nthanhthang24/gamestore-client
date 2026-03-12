// src/hooks/useVoucher.js
import { useState } from 'react';
import {
  collection, query, where, getDocs,
  doc, increment, arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/config';

const SESSION_KEY = 'gs_voucher';

const loadVoucherFromSession = () => {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
};

const saveVoucherToSession = (v) => {
  try {
    if (v) sessionStorage.setItem(SESSION_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
};

export const useVoucher = () => {
  const [voucher, _setVoucher]          = useState(() => loadVoucherFromSession());
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);

  const setVoucher = (v) => { _setVoucher(v); saveVoucherToSession(v); };

  const applyVoucher = async (code, orderTotal, userEmail) => {
    if (!code.trim()) { setVoucherError('Nhập mã voucher'); return false; }
    setVoucherLoading(true);
    setVoucherError('');
    setVoucher(null);

    try {
      const snap = await getDocs(query(
        collection(db, 'vouchers'),
        where('code', '==', code.toUpperCase().trim()),
        where('active', '==', true)
      ));
      if (snap.empty) { setVoucherError('Mã voucher không tồn tại hoặc đã bị vô hiệu'); return false; }

      const vData = { id: snap.docs[0].id, ...snap.docs[0].data() };

      // Hết hạn
      if (vData.expiresAt) {
        const exp = vData.expiresAt?.toDate ? vData.expiresAt.toDate() : new Date(vData.expiresAt);
        if (exp < new Date()) { setVoucherError('Mã voucher đã hết hạn'); return false; }
      }
      // Global usage limit
      if (vData.usageLimit > 0 && (vData.usedCount || 0) >= vData.usageLimit) {
        setVoucherError('Mã voucher đã hết lượt sử dụng'); return false;
      }
      // ✅ [B2/M8] Per-user limit — usedBy là array email đã dùng
      const perUser = vData.perUserLimit || 1; // default 1 lần / user
      const usedBy = vData.usedBy || [];
      const timesUsedByMe = usedBy.filter(e => e === userEmail).length;
      if (timesUsedByMe >= perUser) {
        setVoucherError(`Bạn đã dùng mã này ${timesUsedByMe} lần (tối đa ${perUser} lần)`);
        return false;
      }
      // Đơn tối thiểu
      if (vData.minOrder > 0 && orderTotal < vData.minOrder) {
        setVoucherError(`Đơn tối thiểu ${vData.minOrder.toLocaleString('vi-VN')}đ`);
        return false;
      }
      // User cụ thể
      if (vData.targetUserId && vData.targetUserId !== userEmail) {
        setVoucherError('Mã này không áp dụng cho tài khoản của bạn');
        return false;
      }

      setVoucher(vData);
      return true;
    } catch (e) {
      setVoucherError('Lỗi kiểm tra voucher: ' + e.message);
      return false;
    } finally {
      setVoucherLoading(false);
    }
  };

  const calculateDiscount = (voucher, total) => {
    if (!voucher) return 0;
    if (voucher.type === 'fixed') return Math.min(voucher.value, total);
    const pct = (total * voucher.value) / 100;
    return voucher.maxDiscount > 0 ? Math.min(pct, voucher.maxDiscount) : pct;
  };

  // ✅ [B3] Gọi TRONG transaction từ CartPage — không dùng standalone nữa
  const getVoucherUpdatePayload = (userEmail) => ({
    usedCount: increment(1),
    usedBy: arrayUnion(userEmail), // track per-user
  });

  // FIX 2025-M: markVoucherUsed REMOVED — it accepted arbitrary (voucherId, userEmail) params.
  // All voucher marking now happens inside CartPage's runTransaction via getVoucherUpdatePayload.

  const clearVoucher = () => { setVoucher(null); setVoucherError(''); };

  return {
    voucher, voucherError, voucherLoading,
    applyVoucher, calculateDiscount,
    getVoucherUpdatePayload,
    clearVoucher
  };
};

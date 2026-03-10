// src/hooks/useVoucher.js
import { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useVoucher = () => {
  const [voucher, setVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);

  const applyVoucher = async (code, orderTotal, userEmail) => {
    if (!code.trim()) { setVoucherError('Nhập mã voucher'); return false; }
    setVoucherLoading(true);
    setVoucherError('');
    setVoucher(null);

    try {
      const q = query(
        collection(db, 'vouchers'),
        where('code', '==', code.toUpperCase().trim()),
        where('active', '==', true)
      );
      const snap = await getDocs(q);

      if (snap.empty) { setVoucherError('Mã voucher không tồn tại hoặc đã bị vô hiệu'); return false; }

      const vData = { id: snap.docs[0].id, ...snap.docs[0].data() };

      // Kiểm tra hết hạn
      if (vData.expiresAt) {
        const expDate = vData.expiresAt?.toDate ? vData.expiresAt.toDate() : new Date(vData.expiresAt);
        if (expDate < new Date()) { setVoucherError('Mã voucher đã hết hạn'); return false; }
      }

      // Kiểm tra số lần dùng
      if (vData.usedCount >= vData.usageLimit) { setVoucherError('Mã voucher đã hết lượt sử dụng'); return false; }

      // Kiểm tra đơn tối thiểu
      if (vData.minOrder > 0 && orderTotal < vData.minOrder) {
        setVoucherError(`Đơn hàng tối thiểu ${vData.minOrder.toLocaleString('vi-VN')}đ để dùng mã này`);
        return false;
      }

      // Kiểm tra user cụ thể
      if (vData.targetUserId && vData.targetUserId !== userEmail) {
        setVoucherError('Mã voucher này không áp dụng cho tài khoản của bạn');
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

  const markVoucherUsed = async (voucherId) => {
    await updateDoc(doc(db, 'vouchers', voucherId), { usedCount: increment(1) });
  };

  const clearVoucher = () => { setVoucher(null); setVoucherError(''); };

  return { voucher, voucherError, voucherLoading, applyVoucher, calculateDiscount, markVoucherUsed, clearVoucher };
};

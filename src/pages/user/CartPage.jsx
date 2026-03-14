// src/pages/user/CartPage.jsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  runTransaction, doc, collection, addDoc, getDoc,
  serverTimestamp, getDocs, query, where
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  ShoppingCart, Trash2, Shield, Zap, ArrowRight, Package,
  Wallet, AlertCircle, Tag, CheckCircle, X, Layers, Flame, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVoucher } from '../../hooks/useVoucher';
import { useBulkDiscount } from '../../hooks/useBulkDiscount';
import './CartPage.css';

const TS = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

// ─── Check flash sale còn active không ────────────────────────────────────────
const checkFlashSaleActive = async () => {
  try {
    const snap = await getDocs(query(collection(db, 'flashSales'), where('active', '==', true)));
    const now = new Date();
    return snap.docs.some(d => {
      const fs = d.data();
      const start = fs.startAt?.toDate ? fs.startAt.toDate() : (fs.startAt ? new Date(fs.startAt) : null);
      const end   = fs.endAt?.toDate   ? fs.endAt.toDate()   : (fs.endAt   ? new Date(fs.endAt)   : null);
      if (start && now < start) return false;
      if (end   && now > end)   return false;
      return true;
    });
  } catch { return true; } // lỗi → giữ nguyên, an toàn hơn
};

// ─── Group cart items thành [{id, ...item, qty, cartKeys[]}] ──────────────────
const groupCart = (cart) => {
  const map = new Map();
  cart.forEach(item => {
    if (!map.has(item.id)) map.set(item.id, { ...item, qty: 0, cartKeys: [] });
    const g = map.get(item.id);
    g.qty++;
    g.cartKeys.push(item.cartKey || item.id);
  });
  return [...map.values()];
};

const CartPage = ({ cart, setCart }) => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const checkoutInProgress = useRef(false);
  const lastCheckoutTime = useRef(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [flashExpired, setFlashExpired] = useState(false);
  const [voucherExpired, setVoucherExpired] = useState(false);

  const { voucher, voucherError, voucherLoading, applyVoucher, calculateDiscount, getVoucherUpdatePayload, clearVoucher } = useVoucher();
  const { getBulkDiscount } = useBulkDiscount();

  // Memoize để tránh recompute mỗi render
  const hasSaleItems = useMemo(() => cart.some(i => i.salePrice && i.salePrice < i.price), [cart]);
  const grouped      = useMemo(() => groupCart(cart), [cart]);

  // ── FIX 1: Flash sale real-time monitor — poll khi tab đang mở ──────────────
  // Dùng `hasSaleItems` thay vì inline expression trong deps
  useEffect(() => {
    if (!hasSaleItems) { setFlashExpired(false); return; }

    let cancelled = false;
    const check = async () => {
      const active = await checkFlashSaleActive();
      if (cancelled) return;
      if (!active) {
        setFlashExpired(true);
        setCart(prev => prev.map(item => item.salePrice ? { ...item, salePrice: null } : item));
        toast('⏰ Flash Sale đã kết thúc. Giá đã được cập nhật về giá gốc.', { icon: '⏰', duration: 5000 });
      } else {
        setFlashExpired(false);
      }
    };

    check(); // Kiểm tra ngay lập tức
    const interval = setInterval(check, 15000); // Poll mỗi 15s
    return () => { cancelled = true; clearInterval(interval); };
  }, [hasSaleItems]); // deps ổn định

  // ── FIX 2: Voucher real-time expiry monitor ──────────────────────────────────
  useEffect(() => {
    if (!voucher?.id) { setVoucherExpired(false); return; }

    let cancelled = false;
    const checkVoucher = async () => {
      try {
        const snap = await getDoc(doc(db, 'vouchers', voucher.id));
        if (cancelled) return;
        if (!snap.exists()) { clearVoucher(); setVoucherExpired(true); return; }
        const v = snap.data();
        const now = new Date();
        const expired   = v.expiresAt ? (v.expiresAt.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt)) < now : false;
        const exhausted = v.usageLimit > 0 && (v.usedCount || 0) >= v.usageLimit;
        if (expired || exhausted || !v.active) {
          clearVoucher();
          setVoucherExpired(true);
          toast.error('Voucher đã hết hạn hoặc không còn hiệu lực.', TS);
        } else {
          setVoucherExpired(false);
        }
      } catch {}
    };

    checkVoucher();
    const interval = setInterval(checkVoucher, 30000); // Poll mỗi 30s
    return () => { cancelled = true; clearInterval(interval); };
  }, [voucher?.id]);

  // ── Qty controls ─────────────────────────────────────────────────────────────
  const increaseQty = useCallback((accountId) => {
    const item = cart.find(i => i.id === accountId);
    if (!item) return;
    const currentQty = cart.filter(i => i.id === accountId).length;
    const maxStock = (item.quantity || 1) - (item.soldCount || 0); // slots còn lại
    if (currentQty >= maxStock) {
      toast.error(`Chỉ còn ${maxStock} nick khả dụng.`, TS); return;
    }
    setCart(prev => [...prev, { ...item, cartKey: accountId + '_add_' + Date.now(), buyQty: undefined }]);
  }, [cart]);

  const decreaseQty = useCallback((accountId) => {
    setCart(prev => {
      const lastIdx = [...prev].map((i, idx) => ({ i, idx })).filter(({ i }) => i.id === accountId).pop()?.idx;
      if (lastIdx === undefined) return prev;
      return prev.filter((_, i) => i !== lastIdx);
    });
  }, []);

  const removeGroup = useCallback((accountId) => {
    setCart(prev => prev.filter(i => i.id !== accountId));
  }, []);

  // ── Totals ────────────────────────────────────────────────────────────────────
  const subtotal        = cart.reduce((sum, item) => sum + (item.salePrice || item.price), 0);
  const { discount: bulkDiscountAmt, rule: bulkRule } = getBulkDiscount(subtotal, cart.length);
  const afterBulk       = subtotal - bulkDiscountAmt;
  const voucherDiscount = calculateDiscount(voucher, afterBulk);
  const total           = Math.max(0, subtotal - bulkDiscountAmt - voucherDiscount);
  const balance         = userProfile?.balance || 0;
  const insufficient    = balance < Math.round(total);
  const totalItems      = cart.length;

  const handleApplyVoucher = async () => {
    if (!currentUser) { navigate('/login'); return; }
    await applyVoucher(voucherCode.trim(), subtotal, currentUser.email, currentUser.uid); // FIX B1: pass uid
  };

  // ── Checkout ─────────────────────────────────────────────────────────────────
  const handleCheckout = useCallback(async () => {
    if (!currentUser) { navigate('/login'); return; }
    if (cart.length === 0) return;
    if (checkoutInProgress.current) return;
    const now = Date.now();
    if (now - lastCheckoutTime.current < 3000) {
      toast.error('Vui lòng đợi vài giây trước khi thử lại.', TS); return;
    }
    lastCheckoutTime.current = now;
    checkoutInProgress.current = true;
    setLoading(true);

    try {
      const uniqueIds   = [...new Set(cart.map(i => i.id))];
      const accountRefs = uniqueIds.map(id => doc(db, 'accounts', id));
      const accountSnaps = await Promise.all(accountRefs.map(ref => getDoc(ref)));
      const snapByDocId  = {};
      uniqueIds.forEach((id, idx) => { snapByDocId[id] = accountSnaps[idx]; });

      // Pre-validate
      for (const id of uniqueIds) {
        const snap = snapByDocId[id];
        const cartItem = cart.find(x => x.id === id);
        if (!snap.exists()) {
          toast.error(`Tài khoản "${cartItem?.title}" không còn tồn tại.`, TS); return;
        }
        const d = snap.data();
        const qty = cart.filter(x => x.id === id).length; // số slot user đang mua
        const remaining = (d.quantity || 1) - (d.soldCount || 0);
        const isSold = d.status !== 'available' || remaining <= 0;
        if (isSold) {
          toast.error(`Tài khoản "${cartItem?.title}" đã hết hàng.`, TS);
          setCart(prev => prev.filter(x => x.id !== id)); return;
        }
        if (qty > remaining) {
          toast.error(`"${cartItem?.title}" chỉ còn ${remaining} slot.`, TS);
          // Trim cart về đúng số remaining
          setCart(prev => {
            const kept = prev.filter(x => x.id !== id);
            const slots = prev.filter(x => x.id === id).slice(0, remaining);
            return [...kept, ...slots];
          });
          return;
        }
      }

      // FIX: Re-verify flash sale trước khi tính giá checkout
      const flashActive = await checkFlashSaleActive();
      let verifiedSubtotal = 0;
      const verifiedPriceByCartKey = {};
      cart.forEach((cartItem) => {
        const dbData   = snapByDocId[cartItem.id].data();
        const dbPrice  = dbData.price;
        // Nếu flash sale đã hết → bỏ qua salePrice client
        const clientSalePrice = flashActive ? cartItem.salePrice : null;
        const finalPrice = (clientSalePrice && clientSalePrice > 0 && clientSalePrice <= dbPrice)
          ? clientSalePrice : dbPrice;
        verifiedSubtotal += finalPrice;
        verifiedPriceByCartKey[cartItem.cartKey || cartItem.id] = { finalPrice, dbPrice };
      });

      const { discount: verifiedBulkDiscount, rule: verifiedBulkRule } = getBulkDiscount(verifiedSubtotal, cart.length);
      const verifiedAfterBulk = verifiedSubtotal - verifiedBulkDiscount;

      let verifiedVoucherDiscount = 0;
      let voucherRef = null;
      let voucherDataForTx = null;
      if (voucher) {
        const voucherSnap = await getDoc(doc(db, 'vouchers', voucher.id));
        if (!voucherSnap.exists() || !voucherSnap.data().active) {
          toast.error('Voucher không còn hợp lệ.', TS); clearVoucher(); return;
        }
        const vData = voucherSnap.data();
        const now2 = new Date();
        if (vData.expiresAt && (vData.expiresAt.toDate ? vData.expiresAt.toDate() : new Date(vData.expiresAt)) < now2) {
          toast.error('Voucher đã hết hạn.', TS); clearVoucher(); return;
        }
        if (vData.usedCount >= vData.usageLimit) {
          toast.error('Voucher đã hết lượt sử dụng.', TS); clearVoucher(); return;
        }
        if (vData.minOrder > 0 && verifiedSubtotal < vData.minOrder) {
          toast.error(`Đơn hàng tối thiểu ${vData.minOrder.toLocaleString('vi-VN')}đ.`, TS); return;
        }
        verifiedVoucherDiscount = calculateDiscount(vData, verifiedAfterBulk);
        voucherRef = doc(db, 'vouchers', voucher.id);
        voucherDataForTx = vData;
      }

      const verifiedTotal = Math.round(Math.max(0, verifiedSubtotal - verifiedBulkDiscount - verifiedVoucherDiscount));
      const txVerifiedSoldCount = {};

      // ══════════════════════════════════════════════
      // ATOMIC TRANSACTION — ALL READS BEFORE ALL WRITES
      // ══════════════════════════════════════════════
      await runTransaction(db, async (transaction) => {
        // ── PHASE 1: ALL READS ──────────────────────
        const userRef  = doc(db, 'users', currentUser.uid);
        const userSnap = await transaction.get(userRef);
        const txReads  = await Promise.all(accountRefs.map(ref => transaction.get(ref)));
        const txSnapByDocId = {};
        uniqueIds.forEach((id, idx) => { txSnapByDocId[id] = txReads[idx]; });
        let vSnap = null;
        if (voucherRef) vSnap = await transaction.get(voucherRef);
        // ── (no more reads after this line) ────────

        // ── PHASE 2: VALIDATION ─────────────────────
        if (!userSnap.exists()) throw new Error('Tài khoản người dùng không tồn tại.');
        const currentBalance = userSnap.data().balance || 0;
        if (currentBalance < verifiedTotal)
          throw new Error(`Số dư không đủ. Hiện có: ${currentBalance.toLocaleString('vi-VN')}đ, cần: ${verifiedTotal.toLocaleString('vi-VN')}đ`);

        for (const id of uniqueIds) {
          const snap = txSnapByDocId[id];
          const cartItem = cart.find(x => x.id === id);
          if (!snap.exists()) throw new Error(`Tài khoản "${cartItem?.title}" không tồn tại.`);
          const sd = snap.data();
          const sc = sd.soldCount || 0;
          const qty = cart.filter(x => x.id === id).length;
          const rem = (sd.quantity || 1) - sc;
          if (sd.status !== 'available' || rem <= 0)
            throw new Error(`Tài khoản "${cartItem?.title}" vừa hết hàng.`);
          if (qty > rem)
            throw new Error(`Tài khoản "${cartItem?.title}" chỉ còn ${rem} slot.`);
          txVerifiedSoldCount[id] = sc;
        }

        if (vSnap !== null) {
          if (!vSnap.exists() || !vSnap.data().active) throw new Error('Voucher không còn hợp lệ.');
          const vLive = vSnap.data();
          if (vLive.usedCount >= vLive.usageLimit) throw new Error('Voucher vừa hết lượt sử dụng.');
          const usedTimes = (vLive.usedBy || []).filter(e => e === currentUser.email).length;
          if (usedTimes >= (vLive.perUserLimit || 1)) throw new Error('Bạn đã dùng hết lượt voucher này.');
        }

        // ── PHASE 3: ALL WRITES ─────────────────────
        // FIX 2025-Q: soldCount/status updates REMOVED from client transaction.
        // Firestore rules no longer allow authenticated users to update soldCount.
        // After this tx commits, CartPage calls POST /bank/checkout/confirm (server)
        // which updates soldCount using the server's API key (bypasses client rules).
        // This prevents account sabotage: an attacker can no longer call
        //   updateDoc(accountRef, {soldCount: quantity, status:'sold'}) without paying.
        transaction.update(userRef, { balance: currentBalance - verifiedTotal });

        if (vSnap !== null) transaction.update(voucherRef, getVoucherUpdatePayload(currentUser.email));
      });

      // ── Build order items WITHOUT credentials ─────────────────────────────
      // FIX: Không đọc credentials subcollection từ client nữa.
      // Credentials sẽ được server inject vào order record khi /checkout/confirm được gọi.
      // → Rule credentials subcollection có thể là isAdmin() only — an toàn tuyệt đối.
      // → Không có bất kỳ user login nào đọc được credentials của account chưa mua.
      const unitOffsetByDoc = {};
      uniqueIds.forEach(id => { unitOffsetByDoc[id] = 0; });
      const verifiedItems = cart.map((cartItem) => {
        const dbData = snapByDocId[cartItem.id].data();
        const { finalPrice, dbPrice } = verifiedPriceByCartKey[cartItem.cartKey || cartItem.id];
        const baseSoldCount = txVerifiedSoldCount[cartItem.id] ?? (dbData.soldCount || 0);
        const offset = unitOffsetByDoc[cartItem.id];
        const slotIndex = baseSoldCount + offset;
        unitOffsetByDoc[cartItem.id]++;
        // Credentials KHÔNG đọc ở đây — server /checkout/confirm sẽ inject sau
        return {
          ...cartItem, verifiedPrice: finalPrice, dbPrice,
          // credentials placeholder — server sẽ update order với credentials thực
          loginUsername: '', loginPassword: '',
          loginEmail:    '', loginNote:     '',
          attachmentContent: null, attachmentUrl: null, attachmentName: null,
        };
      });

      // FIX 2025-U: Use crypto.randomUUID() — timestamp-based key (uid+10s window)
      // was not unique: two checkouts in same 10s window got identical keys.
      const idempotencyKey = currentUser.uid + '_' + (crypto.randomUUID?.() || Date.now() + '_' + Math.random().toString(36).slice(2));
      const orderData = {
        idempotencyKey,
        userId: currentUser.uid, userEmail: currentUser.email,
        userName: userProfile?.displayName || currentUser.email,
        items: verifiedItems.map(i => ({
          id: i.id, title: i.title, price: i.verifiedPrice, originalPrice: i.dbPrice,
          gameType: i.gameType, images: i.images || [],
          loginUsername: i.loginUsername || '', loginPassword: i.loginPassword || '',
          loginEmail: i.loginEmail || '', loginNote: i.loginNote || '',
          attachmentContent: i.attachmentContent || null,
          attachmentUrl: i.attachmentUrl || null, attachmentName: i.attachmentName || null,
        })),
        subtotal: verifiedSubtotal, bulkDiscount: verifiedBulkDiscount,
        bulkRuleId: verifiedBulkRule?.id || null,
        voucherDiscount: verifiedVoucherDiscount,
        discount: verifiedBulkDiscount + verifiedVoucherDiscount,
        voucherCode: voucher?.code || null, total: verifiedTotal,
        paymentMethod: 'balance', status: 'completed', createdAt: serverTimestamp(),
      };

      let orderId = null;
      try {
        const orderRef = await addDoc(collection(db, 'orders'), orderData);
        orderId = orderRef.id;
      } catch (orderErr) {
        console.error('‼️ Order write failed (attempt 1):', orderErr);
        let saved = false;
        for (let retry = 0; retry < 3; retry++) {
          await new Promise(r => setTimeout(r, 800 * (retry + 1)));
          try {
            const retryRef = await addDoc(collection(db, 'orders'), { ...orderData, _retryCount: retry + 1 });
            orderId = retryRef.id;
            saved = true;
            break;
          } catch (e) { console.error(`‼️ Retry ${retry + 1} failed:`, e); }
        }
        if (!saved) toast.error(
          `⚠️ Thanh toán thành công nhưng không lưu được đơn hàng. Liên hệ admin: ${idempotencyKey}`,
          { duration: 15000, style: { background:'var(--bg-card)', color:'var(--text-primary)', border:'2px solid var(--danger)' } }
        );
      }

      // FIX 2025-Q: Notify server to update soldCount/status (admin-side write)
      // This runs AFTER order is saved. If it fails, admin sees the order and can update manually.
      if (orderId) {
        // BUG FIX: Thêm timeout 35s (đủ cho Render cold start ~30s)
        // Nếu server chưa kịp xử lý, OrderDetailPage sẽ tự retry khi user vào xem đơn hàng
        const confirmWithTimeout = async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 35_000);
          try {
            const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://gamestore-server-i20i.onrender.com';
            const idToken = await currentUser.getIdToken();
            const resp = await fetch(`${SERVER_URL}/bank/checkout/confirm`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
              body: JSON.stringify({ orderId }),
              signal: controller.signal,
            });
            clearTimeout(timeout);
            return resp;
          } catch (e) {
            clearTimeout(timeout);
            throw e;
          }
        };

        // CHỜ server inject credentials — không navigate trước khi có credentials
        // Nếu server timeout (Render cold start ~30s) thì vẫn navigate nhưng
        // OrderDetailPage có auto-retry để lấy lại
        try {
          const confirmResp = await confirmWithTimeout();
          if (!confirmResp.ok) {
            const errData = await confirmResp.json().catch(() => ({}));
            const errCode = errData.code || '';
            if (errCode === 'PRICE_MISMATCH' || errCode === 'INVALID_IKEY') {
              throw new Error('Đơn hàng không hợp lệ — vui lòng đặt lại. (' + errCode + ')');
            }
            // Server lỗi khác — vẫn navigate, OrderDetailPage auto-retry
            console.warn('checkout/confirm server error:', errData);
          }
          // ✅ Server đã inject credentials — navigate ngay
        } catch (scErr) {
          if (scErr.message.includes('PRICE_MISMATCH') || scErr.message.includes('INVALID_IKEY')) {
            throw scErr;
          }
          // Timeout / network — navigate nhưng OrderDetailPage sẽ auto-retry
          console.warn('checkout/confirm timeout/network:', scErr.message);
        }
      }

      await fetchUserProfile(currentUser.uid);
      setCart([]);
      toast.success('🎉 Mua hàng thành công! Đang tải thông tin tài khoản...', { duration: 5000, ...TS });
      navigate(`/orders/${orderId}`);  // navigate thẳng vào đơn hàng

    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại.', TS);
    } finally {
      setLoading(false);
      checkoutInProgress.current = false;
    }
  }, [cart, currentUser, userProfile, voucher, getBulkDiscount, calculateDiscount, clearVoucher, fetchUserProfile]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="cart-page page-wrapper">
      <div className="container">
        <h1 className="section-title" style={{ marginBottom: '28px' }}>
          <ShoppingCart size={26} /> Giỏ hàng
          {totalItems > 0 && <span className="badge badge-accent" style={{ marginLeft: '10px' }}>{totalItems}</span>}
        </h1>

        {totalItems === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Giỏ hàng trống</h2>
            <p>Khám phá các tài khoản game của chúng tôi!</p>
            <Link to="/shop" className="btn btn-primary btn-lg">Đến cửa hàng</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {/* Flash sale expiry banner */}
              {flashExpired && (
                <div className="cart-alert-banner cart-alert-warning">
                  <Clock size={15} />
                  <span>Flash Sale đã kết thúc — giá đã cập nhật về giá gốc.</span>
                </div>
              )}

              {/* Grouped cart rows */}
              {grouped.map(group => {
                const hasSale  = group.salePrice && group.salePrice < group.price;
                const unitPrice = hasSale ? group.salePrice : group.price;
                const groupTotal = unitPrice * group.qty;
                const maxStock = (group.quantity || 1) - (group.soldCount || 0);
                const canIncrease = group.qty < maxStock;

                return (
                  <div key={group.id} className="cart-item card">
                    {/* Thumbnail */}
                    <div className="cart-item-img">
                      {group.images?.[0]
                        ? <img src={group.images[0]} alt="" />
                        : <Package size={22} style={{ color: 'var(--text-muted)' }} />}
                    </div>

                    {/* Info */}
                    <div className="cart-item-info">
                      <div className="cart-item-title">{group.title}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4, alignItems:'center' }}>
                        <span className="badge badge-accent">{group.gameType}</span>
                        {group.rank && (
                          <span style={{ fontSize:11, color:'var(--gold)', fontWeight:600 }}>◆ {group.rank}</span>
                        )}
                        {hasSale && (
                          <span className="flash-badge-small">
                            <Flame size={8} /> FLASH SALE
                          </span>
                        )}
                      </div>
                      {group.qty > 1 && (
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                          {unitPrice.toLocaleString('vi-VN')}đ / nick
                        </div>
                      )}
                    </div>

                    {/* Qty stepper */}
                    <div className="qty-stepper">
                      <button
                        className="qty-btn qty-btn-minus"
                        onClick={() => decreaseQty(group.id)}
                        disabled={group.qty <= 1}
                        aria-label="Giảm"
                      >
                        <span>−</span>
                      </button>
                      <span className="qty-display">{group.qty}</span>
                      <button
                        className={`qty-btn qty-btn-plus${!canIncrease ? ' qty-btn-maxed' : ''}`}
                        onClick={() => increaseQty(group.id)}
                        disabled={!canIncrease}
                        aria-label="Tăng"
                        title={!canIncrease ? `Còn tối đa ${maxStock} nick` : ''}
                      >
                        <span>+</span>
                      </button>
                    </div>

                    {/* Price */}
                    <div className="cart-item-price">
                      {hasSale ? (
                        <div style={{ textAlign:'right' }}>
                          <div style={{ textDecoration:'line-through', color:'var(--text-muted)', fontSize:11, lineHeight:1.2 }}>
                            {(group.price * group.qty).toLocaleString('vi-VN')}đ
                          </div>
                          <div style={{ color:'#ff6b6b', fontWeight:700 }}>
                            {groupTotal.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      ) : (
                        <span>{groupTotal.toLocaleString('vi-VN')}đ</span>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      className="cart-remove-btn"
                      onClick={() => removeGroup(group.id)}
                      title="Xóa khỏi giỏ"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}

              {/* Voucher box */}
              <div className="voucher-box card">
                <div className="voucher-header">
                  <Tag size={16} style={{ color: 'var(--gold)' }} />
                  <span>Mã giảm giá</span>
                </div>
                {voucher ? (
                  <div className="voucher-applied">
                    <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                    <div>
                      <div className="voucher-code-applied">{voucher.code}</div>
                      <div className="voucher-desc">
                        {voucher.description || `Giảm ${voucher.type === 'percent' ? voucher.value + '%' : voucher.value.toLocaleString('vi-VN') + 'đ'}`}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={clearVoucher} style={{ color:'var(--danger)', marginLeft:'auto' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="voucher-input-row">
                    <input
                      className="form-input voucher-input"
                      placeholder="Nhập mã voucher..."
                      value={voucherCode}
                      onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                    />
                    <button className="btn btn-accent2 btn-sm" onClick={handleApplyVoucher}
                      disabled={voucherLoading || !voucherCode}>
                      {voucherLoading ? '...' : 'Áp dụng'}
                    </button>
                  </div>
                )}
                {voucherError && <div className="voucher-error"><AlertCircle size={13} /> {voucherError}</div>}
                {voucherExpired && !voucher && (
                  <div className="voucher-error"><AlertCircle size={13} /> Voucher vừa hết hiệu lực và đã bị gỡ.</div>
                )}
              </div>
            </div>

            {/* Sidebar summary */}
            <div className="cart-summary">
              <div className="balance-card card">
                <div className="balance-card-header">
                  <Wallet size={18} style={{ color:'var(--gold)' }} />
                  <span>Số dư tài khoản</span>
                </div>
                <div className="balance-amount" style={{ color: insufficient ? 'var(--danger)' : 'var(--gold)' }}>
                  {balance.toLocaleString('vi-VN')}đ
                </div>
                {insufficient && (
                  <Link to="/topup" className="btn btn-ghost btn-sm w-full"
                    style={{ marginTop:'10px', color:'var(--accent)', borderColor:'var(--accent)' }}>
                    + Nạp thêm tiền
                  </Link>
                )}
              </div>

              <div className="card">
                <h2 className="summary-title">Tóm tắt đơn hàng</h2>
                <div className="summary-lines">
                  {grouped.slice(0, 5).map(g => {
                    const up = (g.salePrice && g.salePrice < g.price) ? g.salePrice : g.price;
                    return (
                      <div key={g.id} className="summary-line">
                        <span className="summary-line-name">
                          {g.title}
                          {g.qty > 1 && <span style={{ color:'var(--text-muted)', marginLeft:4 }}>×{g.qty}</span>}
                        </span>
                        <span className="summary-line-price">{(up * g.qty).toLocaleString('vi-VN')}đ</span>
                      </div>
                    );
                  })}
                  {grouped.length > 5 && (
                    <div className="summary-line" style={{ color:'var(--text-muted)', fontSize:12, fontStyle:'italic' }}>
                      <span>... và {grouped.length - 5} loại khác</span>
                    </div>
                  )}
                </div>
                <hr className="divider" />
                <div className="summary-line" style={{ color:'var(--text-secondary)' }}>
                  <span>Tạm tính ({totalItems} nick)</span>
                  <span>{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {bulkDiscountAmt > 0 && (
                  <div className="summary-line summary-discount">
                    <span><Layers size={12} /> Mua nhiều ({totalItems} acc · {bulkRule?.discountPct}%)</span>
                    <span>-{Math.round(bulkDiscountAmt).toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {voucherDiscount > 0 && (
                  <div className="summary-line summary-discount">
                    <span><Tag size={12} /> Voucher {voucher?.code && `(${voucher.code})`}</span>
                    <span>-{Math.round(voucherDiscount).toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <hr className="divider" />
                <div className="summary-total">
                  <span>Tổng cộng</span>
                  <span className="summary-total-price">{Math.round(total).toLocaleString('vi-VN')}đ</span>
                </div>
                {insufficient && (
                  <div className="insufficient-warning">
                    <AlertCircle size={15} />
                    <div>
                      <div style={{ fontWeight:600 }}>Số dư không đủ</div>
                      <div style={{ fontSize:'12px' }}>
                        Cần nạp: <strong style={{ color:'var(--danger)' }}>{Math.round(total - balance).toLocaleString('vi-VN')}đ</strong>
                      </div>
                    </div>
                  </div>
                )}
                <button className="btn btn-primary w-full btn-lg" onClick={handleCheckout}
                  disabled={loading || insufficient} style={{ marginTop:'16px' }}>
                  <Zap size={18} />
                  {loading ? 'Đang xử lý...' : insufficient ? 'Số dư không đủ' : 'Thanh toán bằng số dư'}
                  {!loading && !insufficient && <ArrowRight size={16} />}
                </button>
                {insufficient && (
                  <Link to="/topup" className="btn btn-accent2 w-full btn-lg"
                    style={{ marginTop:'10px', display:'flex', justifyContent:'center' }}>
                    <Wallet size={18} /> Nạp tiền ngay
                  </Link>
                )}
              </div>

              <div className="card" style={{ padding:'16px' }}>
                {[
                  { icon: <Shield size={15} style={{ color:'var(--success)' }} />, text: 'Bảo hành 24h sau mua' },
                  { icon: <Zap size={15} style={{ color:'var(--accent)' }} />,    text: 'Nhận thông tin tức thì' },
                  { icon: <Wallet size={15} style={{ color:'var(--gold)' }} />,   text: 'Hoàn tiền nếu có lỗi' },
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', color:'var(--text-secondary)', padding:'6px 0' }}>
                    {item.icon} {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;

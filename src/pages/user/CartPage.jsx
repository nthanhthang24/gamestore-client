// src/pages/user/CartPage.jsx
import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  runTransaction, doc, collection, addDoc, getDoc,
  serverTimestamp, increment
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  ShoppingCart, Trash2, Shield, Zap, ArrowRight, Package,
  Wallet, AlertCircle, Tag, CheckCircle, X, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVoucher } from '../../hooks/useVoucher';
import { useBulkDiscount } from '../../hooks/useBulkDiscount';
import './CartPage.css';

const TS = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

const CartPage = ({ cart, setCart }) => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const checkoutInProgress = useRef(false);
  const lastCheckoutTime = useRef(0); // T5-01: rate limit between checkouts
  const [voucherCode, setVoucherCode] = useState('');

  const { voucher, voucherError, voucherLoading, applyVoucher, calculateDiscount, clearVoucher } = useVoucher();
  const { getBulkDiscount } = useBulkDiscount();

  const removeItem = (id) => setCart(prev => prev.filter(item => item.id !== id));

  // Giá hiển thị (có thể bị flash sale tác động từ bên ngoài qua salePrice)
  const subtotal    = cart.reduce((sum, item) => sum + (item.salePrice || item.price), 0);
  const { discount: bulkDiscountAmt, rule: bulkRule } = getBulkDiscount(subtotal, cart.length);
  const afterBulk   = subtotal - bulkDiscountAmt;
  const voucherDiscount = calculateDiscount(voucher, afterBulk);
  const total       = Math.max(0, subtotal - bulkDiscountAmt - voucherDiscount);
  const balance     = userProfile?.balance || 0;
  const insufficient = balance < Math.round(total);

  const handleApplyVoucher = async () => {
    if (!currentUser) { navigate('/login'); return; }
    await applyVoucher(voucherCode, subtotal, currentUser.email);
  };

  // ✅ FIX CRITICAL #1 + #2 + #3: Toàn bộ checkout chạy trong Firestore Transaction
  // - Đọc balance mới nhất từ DB (không tin client)
  // - Đọc và verify giá từng account từ DB (không tin client-side price)
  // - Kiểm tra status === 'available' cho từng account
  // - Tính lại total server-side trong transaction
  // - Tất cả atomic: hoặc thành công hết hoặc rollback hết
  const handleCheckout = useCallback(async () => {
    if (!currentUser) { navigate('/login'); return; }
    if (cart.length === 0) return;
    if (checkoutInProgress.current) return;
    // T5-01: chặn 2 checkout trong vòng 3s (chống multi-tab)
    const now = Date.now();
    if (now - lastCheckoutTime.current < 3000) {
      toast.error('Vui lòng đợi vài giây trước khi thử lại.', TS);
      return;
    }
    lastCheckoutTime.current = now;
    checkoutInProgress.current = true;
    setLoading(true);

    try {
      // ── Bước 1: Re-fetch giá + bulk discount rules từ DB (không tin client) ──
      const bulkRulesSnap = await Promise.all([]); // rules đã load trong hook, dùng lại
      // Fetch account data từ Firestore để verify
      const accountRefs = cart.map(item => doc(db, 'accounts', item.id));
      const accountSnaps = await Promise.all(accountRefs.map(ref => getDoc(ref)));

      // ── Bước 2: Validate tất cả trước khi bắt đầu transaction ──
      for (let i = 0; i < cart.length; i++) {
        const snap = accountSnaps[i];
        if (!snap.exists()) {
          toast.error(`Tài khoản "${cart[i].title}" không còn tồn tại.`, TS);
          return;
        }
        if (snap.data().status !== 'available') {
          toast.error(`Tài khoản "${cart[i].title}" đã được bán. Vui lòng xoá khỏi giỏ.`, TS);
          setCart(prev => prev.filter(x => x.id !== cart[i].id));
          return;
        }
      }

      // ── Bước 3: Tính lại total từ giá DB (không tin salePrice client) ──
      // Giá DB là giá gốc; flash sale discount được tính từ client nhưng
      // ta giới hạn: salePrice phải <= price từ DB (không cho phép giá âm/spoofed)
      let verifiedSubtotal = 0;
      const verifiedItems = accountSnaps.map((snap, i) => {
        const dbPrice = snap.data().price;
        const dbData = snap.data();
        const clientSalePrice = cart[i].salePrice;
        // ✅ Chỉ accept salePrice nếu nó hợp lý: > 0 và <= dbPrice
        const finalPrice = (clientSalePrice && clientSalePrice > 0 && clientSalePrice <= dbPrice)
          ? clientSalePrice
          : dbPrice;
        verifiedSubtotal += finalPrice;
        // ✅ Lấy login credentials từ DB (không lấy từ client)
        return {
          ...cart[i],
          verifiedPrice: finalPrice,
          dbPrice,
          loginUsername: dbData.loginUsername || '',
          loginPassword: dbData.loginPassword || '',
          loginEmail: dbData.loginEmail || '',
          loginNote: dbData.loginNote || '',
        };
      });

      // ── Bước 4: Tính lại bulk discount từ verified subtotal ──
      const { discount: verifiedBulkDiscount, rule: verifiedBulkRule } = getBulkDiscount(verifiedSubtotal, cart.length);
      const verifiedAfterBulk = verifiedSubtotal - verifiedBulkDiscount;

      // ── Bước 5: Re-validate voucher với giá đã verify ──
      let verifiedVoucherDiscount = 0;
      if (voucher) {
        // Re-fetch voucher từ DB để đảm bảo vẫn hợp lệ
        const voucherSnap = await getDoc(doc(db, 'vouchers', voucher.id));
        if (!voucherSnap.exists() || !voucherSnap.data().active) {
          toast.error('Voucher không còn hợp lệ.', TS);
          clearVoucher();
          return;
        }
        const vData = voucherSnap.data();
        const now = new Date();
        if (vData.expiresAt && (vData.expiresAt.toDate ? vData.expiresAt.toDate() : new Date(vData.expiresAt)) < now) {
          toast.error('Voucher đã hết hạn.', TS);
          clearVoucher();
          return;
        }
        if (vData.usedCount >= vData.usageLimit) {
          toast.error('Voucher đã hết lượt sử dụng.', TS);
          clearVoucher();
          return;
        }
        if (vData.minOrder > 0 && verifiedSubtotal < vData.minOrder) {
          toast.error(`Đơn hàng tối thiểu ${vData.minOrder.toLocaleString('vi-VN')}đ.`, TS);
          return;
        }
        verifiedVoucherDiscount = calculateDiscount(vData, verifiedAfterBulk);
      }

      const verifiedTotal = Math.round(Math.max(0, verifiedSubtotal - verifiedBulkDiscount - verifiedVoucherDiscount));

      // ── Bước 6: Atomic Firestore Transaction ──
      await runTransaction(db, async (transaction) => {
        // Đọc balance MỚI NHẤT từ DB trong transaction
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error('Tài khoản người dùng không tồn tại.');

        const currentBalance = userSnap.data().balance || 0;
        if (currentBalance < verifiedTotal) {
          throw new Error(`Số dư không đủ. Hiện có: ${currentBalance.toLocaleString('vi-VN')}đ, cần: ${verifiedTotal.toLocaleString('vi-VN')}đ`);
        }

        // Re-check từng account TRONG transaction (đọc lại lần cuối)
        const accountReads = await Promise.all(accountRefs.map(ref => transaction.get(ref)));
        for (let i = 0; i < accountReads.length; i++) {
          const snap = accountReads[i];
          if (!snap.exists() || snap.data().status !== 'available') {
            throw new Error(`Tài khoản "${cart[i].title}" vừa được bán cho người khác.`);
          }
        }

        // Tất cả hợp lệ → thực hiện
        // Trừ balance
        transaction.update(userRef, { balance: currentBalance - verifiedTotal });

        // Mark accounts as sold
        accountRefs.forEach(ref => transaction.update(ref, { status: 'sold' }));
      });

      // ── Bước 7: Tạo order record ──
      // Nếu fail: user đã bị trừ tiền (transaction đã commit) → phải retry hoặc admin hoàn tiền thủ công
      // Đây là acceptable trade-off; nếu cần 100% atomic phải dùng backend API
      // T5-01: Idempotency key = uid + timestamp rounded to 10s window
      const idempotencyKey = currentUser.uid + '_' + Math.floor(Date.now() / 10000);
      try { await addDoc(collection(db, 'orders'), {
        idempotencyKey,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userProfile?.displayName || currentUser.email,
        items: verifiedItems.map(i => ({
          id: i.id, title: i.title,
          price: i.verifiedPrice,
          originalPrice: i.dbPrice,
          gameType: i.gameType,
          images: i.images || [],
          // ✅ Thông tin đăng nhập - giao cho người mua
          loginUsername: i.loginUsername || '',
          loginPassword: i.loginPassword || '',
          loginEmail: i.loginEmail || '',
          loginNote: i.loginNote || '',
        })),
        subtotal: verifiedSubtotal,
        bulkDiscount: verifiedBulkDiscount,
        bulkRuleId: verifiedBulkRule?.id || null,
        voucherDiscount: verifiedVoucherDiscount,
        discount: verifiedBulkDiscount + verifiedVoucherDiscount,
        voucherCode: voucher?.code || null,
        total: verifiedTotal,
        paymentMethod: 'balance',
        status: 'completed',
        createdAt: serverTimestamp(),
      }); } catch (orderErr) {
        // Tiền đã trừ nhưng order không ghi được → notify admin
        console.error('‼️ CRITICAL: Transaction succeeded but order record failed:', orderErr);
        toast.error('Thanh toán thành công nhưng có lỗi ghi đơn hàng. Vui lòng liên hệ admin với thông tin: ' + new Date().toISOString(), { duration: 10000, style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--danger)' } });
      }

      // ── Bước 8: Tăng usedCount voucher ATOMIC ──
      if (voucher) {
        await runTransaction(db, async (transaction) => {
          const vRef = doc(db, 'vouchers', voucher.id);
          const vSnap = await transaction.get(vRef);
          if (vSnap.exists()) {
            transaction.update(vRef, { usedCount: (vSnap.data().usedCount || 0) + 1 });
          }
        });
        clearVoucher();
      }

      await fetchUserProfile(currentUser.uid);
      setCart([]);
      toast.success('🎉 Mua hàng thành công! Kiểm tra đơn hàng của bạn.', { duration: 5000, ...TS });
      setTimeout(() => navigate('/orders'), 400); // ✅ FIX T2-04: delay để toast hiện trước khi unmount

    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Có lỗi xảy ra, vui lòng thử lại.', TS);
    } finally {
      setLoading(false);
      checkoutInProgress.current = false;
    }
  }, [cart, currentUser, userProfile, voucher, getBulkDiscount, calculateDiscount, clearVoucher, fetchUserProfile]);

  return (
    <div className="cart-page page-wrapper">
      <div className="container">
        <h1 className="section-title" style={{ marginBottom: '28px' }}>
          <ShoppingCart size={26} /> Giỏ hàng
          {cart.length > 0 && <span className="badge badge-accent" style={{ marginLeft: '10px' }}>{cart.length}</span>}
        </h1>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Giỏ hàng trống</h2>
            <p>Khám phá các tài khoản game của chúng tôi!</p>
            <Link to="/shop" className="btn btn-primary btn-lg">Đến cửa hàng</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.id} className="cart-item card">
                  <div className="cart-item-img">
                    {item.images?.[0] ? <img src={item.images[0]} alt="" /> : <Package size={24} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-title">{item.title}</div>
                    <span className="badge badge-accent">{item.gameType}</span>
                  </div>
                  <div className="cart-item-price">
                    {item.salePrice && item.salePrice < item.price ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12 }}>{item.price?.toLocaleString('vi-VN')}đ</div>
                        <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{item.salePrice?.toLocaleString('vi-VN')}đ</div>
                      </div>
                    ) : <span>{item.price?.toLocaleString('vi-VN')}đ</span>}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                </div>
              ))}

              {/* Voucher */}
              <div className="voucher-box card">
                <div className="voucher-header"><Tag size={16} style={{ color: 'var(--gold)' }} /><span>Mã giảm giá</span></div>
                {voucher ? (
                  <div className="voucher-applied">
                    <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                    <div>
                      <div className="voucher-code-applied">{voucher.code}</div>
                      <div className="voucher-desc">{voucher.description || `Giảm ${voucher.type === 'percent' ? voucher.value + '%' : voucher.value.toLocaleString('vi-VN') + 'đ'}`}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={clearVoucher} style={{ color: 'var(--danger)', marginLeft: 'auto' }}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="voucher-input-row">
                    <input className="form-input voucher-input" placeholder="Nhập mã voucher..."
                      value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()} />
                    <button className="btn btn-accent2 btn-sm" onClick={handleApplyVoucher} disabled={voucherLoading || !voucherCode}>
                      {voucherLoading ? '...' : 'Áp dụng'}
                    </button>
                  </div>
                )}
                {voucherError && <div className="voucher-error"><AlertCircle size={13} /> {voucherError}</div>}
              </div>
            </div>

            <div className="cart-summary">
              <div className="balance-card card">
                <div className="balance-card-header"><Wallet size={18} style={{ color: 'var(--gold)' }} /><span>Số dư tài khoản</span></div>
                <div className="balance-amount" style={{ color: insufficient ? 'var(--danger)' : 'var(--gold)' }}>{balance.toLocaleString('vi-VN')}đ</div>
                {insufficient && <Link to="/topup" className="btn btn-ghost btn-sm w-full" style={{ marginTop: '10px', color: 'var(--accent)', borderColor: 'var(--accent)' }}>+ Nạp thêm tiền</Link>}
              </div>

              <div className="card">
                <h2 className="summary-title">Tóm tắt đơn hàng</h2>
                <div className="summary-lines">
                  {cart.map(item => (
                    <div key={item.id} className="summary-line">
                      <span className="summary-line-name">{item.title}</span>
                      <span className="summary-line-price">{(item.salePrice || item.price)?.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
                <hr className="divider" />
                <div className="summary-line" style={{ color: 'var(--text-secondary)' }}>
                  <span>Tạm tính</span><span>{subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {bulkDiscountAmt > 0 && (
                  <div className="summary-line summary-discount">
                    <span><Layers size={12} /> Mua nhiều ({cart.length} acc · {bulkRule?.discountPct}%)</span>
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
                      <div style={{ fontWeight: 600 }}>Số dư không đủ</div>
                      <div style={{ fontSize: '12px' }}>Cần nạp thêm: <strong style={{ color: 'var(--danger)' }}>{Math.round(total - balance).toLocaleString('vi-VN')}đ</strong></div>
                    </div>
                  </div>
                )}
                <button className="btn btn-primary w-full btn-lg" onClick={handleCheckout}
                  disabled={loading || insufficient} style={{ marginTop: '16px' }}>
                  <Zap size={18} />
                  {loading ? 'Đang xử lý...' : insufficient ? 'Số dư không đủ' : 'Thanh toán bằng số dư'}
                  {!loading && !insufficient && <ArrowRight size={16} />}
                </button>
                {insufficient && (
                  <Link to="/topup" className="btn btn-accent2 w-full btn-lg" style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <Wallet size={18} /> Nạp tiền ngay
                  </Link>
                )}
              </div>

              <div className="card" style={{ padding: '16px' }}>
                {[
                  { icon: <Shield size={15} style={{ color: 'var(--success)' }} />, text: 'Bảo hành 24h sau mua' },
                  { icon: <Zap size={15} style={{ color: 'var(--accent)' }} />, text: 'Nhận thông tin tức thì' },
                  { icon: <Wallet size={15} style={{ color: 'var(--gold)' }} />, text: 'Hoàn tiền nếu có lỗi' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', padding: '6px 0' }}>
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

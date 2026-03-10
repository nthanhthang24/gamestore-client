// src/pages/user/CartPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { addDoc, collection, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ShoppingCart, Trash2, Shield, Zap, ArrowRight, Package, Wallet, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './CartPage.css';

const CartPage = ({ cart, setCart }) => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const removeItem = (id) => setCart(prev => prev.filter(item => item.id !== id));
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const balance = userProfile?.balance || 0;
  const insufficient = balance < total;

  const handleCheckout = async () => {
    if (!currentUser) { navigate('/login'); return; }
    if (cart.length === 0) return;
    if (insufficient) {
      toast.error('Số dư không đủ! Vui lòng nạp thêm tiền.', {
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      });
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { balance: increment(-total) });
      await addDoc(collection(db, 'orders'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userProfile?.displayName || currentUser.email,
        items: cart.map(i => ({ id: i.id, title: i.title, price: i.price, gameType: i.gameType, images: i.images || [] })),
        total,
        paymentMethod: 'balance',
        status: 'completed',
        createdAt: serverTimestamp(),
      });
      await Promise.all(cart.map(item => updateDoc(doc(db, 'accounts', item.id), { status: 'sold' })));
      await fetchUserProfile(currentUser.uid);
      setCart([]);
      toast.success('Mua hàng thành công! Kiểm tra đơn hàng của bạn.', {
        duration: 5000,
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      });
      navigate('/orders');
    } catch (err) {
      toast.error('Có lỗi xảy ra: ' + err.message);
    } finally { setLoading(false); }
  };

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
                  <div className="cart-item-price">{item.price?.toLocaleString('vi-VN')}đ</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="balance-card card">
                <div className="balance-card-header"><Wallet size={18} style={{ color: 'var(--gold)' }} /><span>Số dư tài khoản</span></div>
                <div className="balance-amount" style={{ color: insufficient ? 'var(--danger)' : 'var(--gold)' }}>
                  {balance.toLocaleString('vi-VN')}đ
                </div>
                {insufficient && (
                  <Link to="/topup" className="btn btn-ghost btn-sm w-full" style={{ marginTop: '10px', color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                    + Nạp thêm tiền
                  </Link>
                )}
              </div>

              <div className="card">
                <h2 className="summary-title">Tóm tắt đơn hàng</h2>
                <div className="summary-lines">
                  {cart.map(item => (
                    <div key={item.id} className="summary-line">
                      <span className="summary-line-name">{item.title}</span>
                      <span className="summary-line-price">{item.price?.toLocaleString('vi-VN')}đ</span>
                    </div>
                  ))}
                </div>
                <hr className="divider" />
                <div className="summary-total">
                  <span>Tổng cộng</span>
                  <span className="summary-total-price">{total.toLocaleString('vi-VN')}đ</span>
                </div>

                {insufficient && (
                  <div className="insufficient-warning">
                    <AlertCircle size={15} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Số dư không đủ</div>
                      <div style={{ fontSize: '12px' }}>Cần nạp thêm: <strong style={{ color: 'var(--danger)' }}>{(total - balance).toLocaleString('vi-VN')}đ</strong></div>
                    </div>
                  </div>
                )}

                <button className="btn btn-primary w-full btn-lg" onClick={handleCheckout} disabled={loading || insufficient} style={{ marginTop: '16px' }}>
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

// src/pages/user/AccountDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Shield, Clock, Eye, Star, ChevronLeft, ChevronRight, Zap, Award, Package, Heart, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFlashSale } from '../../hooks/useFlashSale';
import { useWishlist } from '../../hooks/useWishlist';
import { useSEO } from '../../hooks/useSEO';
import { RatingWidget } from './RatingWidget';
import './AccountDetailPage.css';

const TS = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

const AccountDetailPage = ({ onAddToCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { getSalePrice, isInFlashSale, activeFlashSale, countdown } = useFlashSale();
  const [account, setAccount]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [currentImg, setCurrentImg] = useState(0);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'ratings'
  const [ratingCount, setRatingCount] = useState(null); // updated by RatingWidget via callback
  const { isWishlisted, toggle: toggleWishlist } = useWishlist(currentUser);
  const [buyQty, setBuyQty] = useState(1);
  useSEO(account ? {
    title: account.title,
    description: `${account.gameType} · ${account.rank||''} · ${account.price?.toLocaleString('vi-VN')}đ — GameStore VN`,
    image: account.images?.[0],
  } : {}); // buyer-selected quantity

  useEffect(() => {
    setLoading(true);
    // Realtime listener → soldCount/remaining tự cập nhật khi người khác mua
    const unsub = onSnapshot(doc(db, 'accounts', id), (snap) => {
      if (snap.exists()) {
        setAccount({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    // Tăng views 1 lần khi mount
    updateDoc(doc(db, 'accounts', id), { views: increment(1) }).catch(() => {});
    return () => unsub();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>
  );
  if (!account) return (
    <div className="page-wrapper" style={{ textAlign: 'center', paddingTop: '100px' }}>
      <h2>Không tìm thấy tài khoản</h2>
      <button className="btn btn-primary" onClick={() => navigate('/shop')} style={{ marginTop: '16px' }}>Về cửa hàng</button>
    </div>
  );

  const images     = account.images || [];
  const quantity   = account.quantity   != null ? account.quantity   : 1;
  const soldCount  = account.soldCount  != null ? account.soldCount  : 0;
  const remaining  = quantity - soldCount; // slots còn lại
  const isSold     = account.status === 'sold' || remaining <= 0;

  const salePrice = activeFlashSale ? getSalePrice(account.price, account.gameType) : null;
  const unitPrice = (activeFlashSale && salePrice && salePrice < account.price) ? salePrice : account.price;

  const handleAddToCart = (goToCart = false) => {
    if (!currentUser) { navigate('/login'); return; }
    if (isSold) return;
    const qty = Math.min(buyQty, remaining);
    onAddToCart?.({
      ...account,
      buyQty: qty,
      salePrice: (activeFlashSale && salePrice && salePrice < account.price) ? salePrice : null,
    });
    toast.success(`Đã thêm ${qty} slot vào giỏ!`, TS);
    if (goToCart) navigate('/cart');
  };

  return (
    <div className="account-detail page-wrapper">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <button onClick={() => navigate(-1)} className="breadcrumb-link">← Quay lại</button>
          <span>/</span><span>{account.gameType}</span><span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{account.title}</span>
        </div>

        <div className="detail-layout">
          {/* Images */}
          <div className="detail-images">
            <div className="main-image">
              {images[currentImg]
                ? <img src={images[currentImg]} alt={account.title} />
                : <div className="img-placeholder"><Zap size={48} style={{ color: 'var(--accent)', opacity: 0.3 }} /></div>
              }
              {images.length > 1 && (
                <>
                  <button className="img-nav prev" onClick={() => setCurrentImg(Math.max(0, currentImg - 1))}><ChevronLeft size={20} /></button>
                  <button className="img-nav next" onClick={() => setCurrentImg(Math.min(images.length - 1, currentImg + 1))}><ChevronRight size={20} /></button>
                </>
              )}
              {isSold && <div className="sold-banner">HẾT HÀNG</div>}
            </div>
            {images.length > 1 && (
              <div className="thumb-list">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" className={`thumb ${currentImg === i ? 'active' : ''}`} onClick={() => setCurrentImg(i)} />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="detail-info">
            <div className="detail-badges">
              <span className="badge badge-accent">{account.gameType}</span>
              {account.featured && <span className="badge badge-gold"><Star size={10} /> Nổi bật</span>}
              <span className={`badge ${isSold ? 'badge-danger' : 'badge-success'}`}>
                {isSold ? '● Hết hàng' : '● Còn hàng'}
              </span>
            </div>

            <h1 className="detail-title">{account.title}</h1>

            {account.rank && (
              <div className="detail-rank">
                <Award size={16} /> <span>Rank:</span>
                <strong style={{ color: 'var(--gold)' }}>{account.rank}</strong>
              </div>
            )}

            {account.stats && (
              <div className="detail-stats-grid">
                {Object.entries(account.stats).map(([key, val]) => (
                  <div key={key} className="detail-stat">
                    <span className="ds-val">{val}</span>
                    <span className="ds-key">{key}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Price */}
            <div className="detail-price-block">
              <div className="detail-price">
                {activeFlashSale && salePrice && salePrice < account.price ? (
                  <>
                    <span className="price" style={{ fontSize: '32px', color: 'var(--danger)' }}>
                      {salePrice?.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="price-old" style={{ fontSize: '18px' }}>{account.price?.toLocaleString('vi-VN')}đ</span>
                    <span className="badge badge-danger">🔥 -{activeFlashSale.discount}%</span>
                  {/* ✅ FIX UX-01: Countdown timer on detail page */}
                  {countdown && !countdown.expired && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13,
                      color:'#ff6b35', fontFamily:'monospace', fontWeight:700, marginTop:8,
                      background:'rgba(255,71,87,0.08)', borderRadius:8, padding:'6px 12px',
                      border:'1px solid rgba(255,71,87,0.2)', width:'fit-content' }}>
                      <Clock size={13} />
                      Flash Sale kết thúc sau&nbsp;
                      {String(countdown.h).padStart(2,'0')}:{String(countdown.m).padStart(2,'0')}:{String(countdown.s).padStart(2,'0')}
                    </div>
                  )}
                  </>
                ) : (
                  <>
                    <span className="price" style={{ fontSize: '32px' }}>{account.price?.toLocaleString('vi-VN')}đ</span>
                    {account.originalPrice && (
                      <>
                        <span className="price-old" style={{ fontSize: '18px' }}>{account.originalPrice?.toLocaleString('vi-VN')}đ</span>
                        <span className="badge badge-danger">-{Math.round((1 - account.price / account.originalPrice) * 100)}%</span>
                      </>
                    )}
                  </>
                )}
              </div>

            </div>


            {/* Qty stepper — chỉ hiện khi listing có nhiều slot */}
            {quantity > 1 && !isSold && (
              <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0' }}>
                <span style={{ fontSize:13, color:'var(--text-secondary)', fontWeight:600 }}>Số lượng:</span>
                <div style={{ display:'flex', alignItems:'center', gap:0, border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                  <button
                    onClick={() => setBuyQty(q => Math.max(1, q - 1))}
                    style={{ width:36, height:36, border:'none', background:'var(--bg-card)', color:'var(--text-primary)', fontSize:18, cursor:'pointer' }}
                  >−</button>
                  <span style={{ minWidth:40, textAlign:'center', fontFamily:'Rajdhani', fontSize:18, fontWeight:700, color:'var(--accent)', padding:'0 4px' }}>
                    {buyQty}
                  </span>
                  <button
                    onClick={() => setBuyQty(q => Math.min(remaining, q + 1))}
                    style={{ width:36, height:36, border:'none', background:'var(--bg-card)', color:'var(--text-primary)', fontSize:18, cursor:'pointer' }}
                  >+</button>
                </div>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>còn {remaining} slot</span>
              </div>
            )}

            {/* Actions */}
            <div className="detail-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => handleAddToCart(true)}
                disabled={isSold}
                style={{ flex: 1 }}
              >
                <Zap size={18} />
                {isSold ? 'Hết hàng' : 'Mua ngay'}
              </button>
              <button
                className="btn btn-ghost btn-lg"
                onClick={() => handleAddToCart(false)}
                disabled={isSold}
                title="Thêm vào giỏ"
              >
                <ShoppingCart size={18} />
              </button>
              <button
                className="btn btn-ghost btn-lg"
                onClick={async()=>{ if(!currentUser){navigate('/login');return;} const added=await toggleWishlist(account.id); import('react-hot-toast').then(({default:t})=>t.success(added?'❤️ Đã lưu yêu thích':'Đã bỏ yêu thích')); }}
                title={isWishlisted(account.id)?'Bỏ yêu thích':'Lưu yêu thích'}
                style={{color:isWishlisted(account.id)?'#ff4757':'var(--text-muted)'}}
              >
                <Heart size={18} fill={isWishlisted(account.id)?'#ff4757':'none'}/>
              </button>
            </div>

            {/* Guarantees */}
            <div className="guarantees">
              {[
                { icon: <Shield size={16} style={{ color: 'var(--success)' }} />, text: 'Bảo hành 24h sau mua' },
                { icon: <Zap size={16} style={{ color: 'var(--accent)' }} />, text: 'Nhận thông tin tức thì' },
                { icon: <Clock size={16} style={{ color: 'var(--gold)' }} />, text: 'Hỗ trợ 24/7' },
                { icon: <Eye size={16} style={{ color: 'var(--accent2)' }} />, text: `${account.views || 0} lượt xem` },
                { icon: <Package size={16} style={{ color: isSold ? 'var(--danger)' : 'var(--success)' }} />,
                  text: quantity > 1 ? `Còn ${remaining}/${quantity} slot` : 'Tài khoản đơn' },
              ].map((g, i) => (
                <div key={i} className="guarantee-item">{g.icon}<span>{g.text}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Tabs: Thông tin & Đánh giá ─────────────────── */}
        <div className="detail-tabs-nav">
          <button
            className={`detail-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            📋 Thông tin
          </button>
          <button
            className={`detail-tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ Đánh giá
            {ratingCount !== null && ratingCount > 0 && (
              <span className="detail-tab-badge">{ratingCount}</span>
            )}
          </button>
        </div>

        <div className="detail-tab-panel">
          {activeTab === 'info' && (
            <>
              {account.description ? (
                <div className="detail-description card">
                  <h2 style={{ fontFamily: 'Rajdhani', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Mô tả chi tiết</h2>
                  <div className="description-content" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    {account.description}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chưa có mô tả chi tiết cho tài khoản này.
                </div>
              )}
            </>
          )}

          {activeTab === 'ratings' && (
            <RatingWidget
              accountId={id}
              currentUser={currentUser}
              onCountChange={setRatingCount}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDetailPage;

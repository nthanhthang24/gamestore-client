// src/pages/user/AccountDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { ShoppingCart, Shield, Clock, Eye, Star, ChevronLeft, ChevronRight, Zap, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFlashSale } from '../../hooks/useFlashSale';
import './AccountDetailPage.css';

const AccountDetailPage = ({ onAddToCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { getSalePrice, activeFlashSale } = useFlashSale(); // ✅ FIX: Flash sale trên detail page
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    fetchAccount();
  }, [id]);

  const fetchAccount = async () => {
    try {
      const snap = await getDoc(doc(db, 'accounts', id));
      if (snap.exists()) {
        setAccount({ id: snap.id, ...snap.data() });
        try {
        await updateDoc(doc(db, 'accounts', id), { views: increment(1) });
      } catch (_) { /* Guest không có quyền update - bỏ qua */ }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleBuyNow = () => {
    if (!currentUser) { navigate('/login'); return; }
    // ✅ FIX: Truyền salePrice từ flash sale vào cart
    const salePrice = activeFlashSale ? getSalePrice(account.price) : null;
    onAddToCart?.({ ...account, salePrice: activeFlashSale && salePrice && salePrice < account.price ? salePrice : null });
    navigate('/cart');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!account) return (
    <div className="page-wrapper" style={{ textAlign: 'center', paddingTop: '100px' }}>
      <h2>Không tìm thấy tài khoản</h2>
      <button className="btn btn-primary" onClick={() => navigate('/shop')} style={{ marginTop: '16px' }}>Về cửa hàng</button>
    </div>
  );

  const images = account.images || [];

  return (
    <div className="account-detail page-wrapper">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <button onClick={() => navigate(-1)} className="breadcrumb-link">← Quay lại</button>
          <span>/</span>
          <span>{account.gameType}</span>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{account.title}</span>
        </div>

        <div className="detail-layout">
          {/* Left: Images */}
          <div className="detail-images">
            <div className="main-image">
              {images[currentImg] ? (
                <img src={images[currentImg]} alt={account.title} />
              ) : (
                <div className="img-placeholder"><Zap size={48} style={{ color: 'var(--accent)', opacity: 0.3 }} /></div>
              )}
              {images.length > 1 && (
                <>
                  <button className="img-nav prev" onClick={() => setCurrentImg(Math.max(0, currentImg - 1))}><ChevronLeft size={20} /></button>
                  <button className="img-nav next" onClick={() => setCurrentImg(Math.min(images.length - 1, currentImg + 1))}><ChevronRight size={20} /></button>
                </>
              )}
              {account.status === 'sold' && <div className="sold-banner">ĐÃ BÁN</div>}
            </div>
            {images.length > 1 && (
              <div className="thumb-list">
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" className={`thumb ${currentImg === i ? 'active' : ''}`} onClick={() => setCurrentImg(i)} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="detail-info">
            <div className="detail-badges">
              <span className="badge badge-accent">{account.gameType}</span>
              {account.featured && <span className="badge badge-gold"><Star size={10} /> Nổi bật</span>}
              <span className={`badge ${account.status === 'available' ? 'badge-success' : 'badge-danger'}`}>
                {account.status === 'available' ? '● Còn hàng' : '● Đã bán'}
              </span>
            </div>

            <h1 className="detail-title">{account.title}</h1>

            {account.rank && (
              <div className="detail-rank">
                <Award size={16} /> <span>Rank:</span>
                <strong style={{ color: 'var(--gold)' }}>{account.rank}</strong>
              </div>
            )}

            {/* Stats */}
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

            {/* Price - ✅ FIX: show flash sale price */}
            <div className="detail-price-block">
              <div className="detail-price">
                {activeFlashSale ? (
                  <>
                    <span className="price" style={{ fontSize: '32px', color: 'var(--danger)' }}>
                      {getSalePrice(account.price)?.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="price-old" style={{ fontSize: '18px' }}>{account.price?.toLocaleString('vi-VN')}đ</span>
                    <span className="badge badge-danger">🔥 -{activeFlashSale.discount}%</span>
                  </>
                ) : (
                  <>
                    <span className="price" style={{ fontSize: '32px' }}>{account.price?.toLocaleString('vi-VN')}đ</span>
                    {account.originalPrice && (
                      <span className="price-old" style={{ fontSize: '18px' }}>{account.originalPrice?.toLocaleString('vi-VN')}đ</span>
                    )}
                    {account.originalPrice && (
                      <span className="badge badge-danger">
                        -{Math.round((1 - account.price / account.originalPrice) * 100)}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="detail-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleBuyNow}
                disabled={account.status === 'sold'}
                style={{ flex: 1 }}
              >
                <Zap size={18} /> Mua ngay
              </button>
              <button
                className="btn btn-ghost btn-lg"
                onClick={() => {
                  const salePrice = activeFlashSale ? getSalePrice(account.price) : null;
                  onAddToCart?.({ ...account, salePrice: activeFlashSale && salePrice && salePrice < account.price ? salePrice : null });
                  toast.success('Đã thêm vào giỏ!', { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
                }}
                disabled={account.status === 'sold'}
              >
                <ShoppingCart size={18} />
              </button>
            </div>

            {/* Guarantees */}
            <div className="guarantees">
              <div className="guarantee-item">
                <Shield size={16} style={{ color: 'var(--success)' }} />
                <span>Bảo hành 24h sau mua</span>
              </div>
              <div className="guarantee-item">
                <Zap size={16} style={{ color: 'var(--accent)' }} />
                <span>Nhận thông tin tức thì</span>
              </div>
              <div className="guarantee-item">
                <Clock size={16} style={{ color: 'var(--gold)' }} />
                <span>Hỗ trợ 24/7</span>
              </div>
              <div className="guarantee-item">
                <Eye size={16} style={{ color: 'var(--accent2)' }} />
                <span>{account.views || 0} lượt xem</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {account.description && (
          <div className="detail-description card" style={{ marginTop: '32px' }}>
            <h2 style={{ fontFamily: 'Rajdhani', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Mô tả chi tiết</h2>
            <div className="description-content" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              {account.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDetailPage;

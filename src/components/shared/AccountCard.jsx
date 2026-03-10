// src/components/shared/AccountCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Star, Zap, Flame } from 'lucide-react';
import './AccountCard.css';

const AccountCard = ({ account, onAddToCart }) => {
  // salePrice: từ flash sale (tính bên ngoài và truyền vào)
  // originalPrice: giá gốc do admin set thủ công trên sản phẩm
  const displayPrice = account.salePrice && account.salePrice < account.price
    ? account.salePrice
    : account.price;

  const baseOriginal = account.originalPrice || account.price;
  const showOriginal = displayPrice < baseOriginal;
  const discountPct = showOriginal
    ? Math.round((1 - displayPrice / baseOriginal) * 100)
    : 0;

  const isFlashSale = account.salePrice && account.salePrice < account.price;

  const rankColors = {
    'Đồng': '#cd7f32', 'Bạc': '#c0c0c0', 'Vàng': '#ffd700',
    'Bạch kim': '#e5e4e2', 'Kim cương': '#b9f2ff', 'Cao thủ': '#ff6b35',
    'Thách đấu': '#ff4757', 'Radiant': '#ff4757', 'Immortal': '#cc44ff'
  };

  return (
    <div className={`account-card card-glow card ${isFlashSale ? 'card-flash' : ''}`}>
      {/* Image */}
      <div className="account-card-img">
        {account.images?.[0] ? (
          <img src={account.images[0]} alt={account.title} loading="lazy" />
        ) : (
          <div className="account-card-img-placeholder">
            <Zap size={32} style={{ color: 'var(--accent)', opacity: 0.5 }} />
          </div>
        )}
        {discountPct > 0 && (
          <span className={`discount-badge ${isFlashSale ? 'discount-flash' : ''}`}>
            {isFlashSale && <Flame size={10} />} -{discountPct}%
          </span>
        )}
        {account.featured && !discountPct && <span className="featured-badge"><Star size={10} /> HOT</span>}
        {account.status === 'sold' && <div className="sold-overlay">ĐÃ BÁN</div>}
      </div>

      {/* Content */}
      <div className="account-card-body">
        <div className="account-card-meta">
          <span className="badge badge-accent" style={{ fontSize: '10px' }}>{account.gameType}</span>
          {account.rank && (
            <span className="account-rank" style={{ color: rankColors[account.rank] || 'var(--text-secondary)' }}>
              ◆ {account.rank}
            </span>
          )}
        </div>

        <h3 className="account-card-title">{account.title}</h3>

        {account.stats && (
          <div className="account-stats">
            {Object.entries(account.stats).slice(0, 3).map(([key, val]) => (
              <div key={key} className="stat-item">
                <span className="stat-val">{val}</span>
                <span className="stat-key">{key}</span>
              </div>
            ))}
          </div>
        )}

        {/* Price block */}
        <div className="account-card-price">
          <span className={`price ${isFlashSale ? 'price-sale' : ''}`}>
            {displayPrice?.toLocaleString('vi-VN')}đ
          </span>
          {showOriginal && (
            <span className="price-old">{baseOriginal.toLocaleString('vi-VN')}đ</span>
          )}
        </div>

        <div className="account-card-actions">
          <Link to={`/account/${account.id}`} className="btn btn-ghost btn-sm">
            <Eye size={14} /> Chi tiết
          </Link>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onAddToCart?.(account)}
            disabled={account.status === 'sold'}
          >
            <ShoppingCart size={14} />
            {account.status === 'sold' ? 'Hết' : 'Mua ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountCard;

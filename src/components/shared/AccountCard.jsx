// src/components/shared/AccountCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Star, Shield, Zap } from 'lucide-react';
import './AccountCard.css';

const AccountCard = ({ account, onAddToCart }) => {
  const discount = account.originalPrice
    ? Math.round((1 - account.price / account.originalPrice) * 100)
    : 0;

  const rankColors = {
    'Đồng': '#cd7f32', 'Bạc': '#c0c0c0', 'Vàng': '#ffd700',
    'Bạch kim': '#e5e4e2', 'Kim cương': '#b9f2ff', 'Cao thủ': '#ff6b35',
    'Thách đấu': '#ff4757', 'Radiant': '#ff4757', 'Immortal': '#cc44ff'
  };

  return (
    <div className="account-card card-glow card">
      {/* Image */}
      <div className="account-card-img">
        {account.images?.[0] ? (
          <img src={account.images[0]} alt={account.title} loading="lazy" />
        ) : (
          <div className="account-card-img-placeholder">
            <Zap size={32} style={{ color: 'var(--accent)', opacity: 0.5 }} />
          </div>
        )}
        {discount > 0 && <span className="discount-badge">-{discount}%</span>}
        {account.featured && <span className="featured-badge"><Star size={10} /> HOT</span>}
        {account.status === 'sold' && <div className="sold-overlay">ĐÃ BÁN</div>}
      </div>

      {/* Content */}
      <div className="account-card-body">
        {/* Game type */}
        <div className="account-card-meta">
          <span className="badge badge-accent" style={{ fontSize: '10px' }}>{account.gameType}</span>
          {account.rank && (
            <span className="account-rank" style={{ color: rankColors[account.rank] || 'var(--text-secondary)' }}>
              ◆ {account.rank}
            </span>
          )}
        </div>

        <h3 className="account-card-title">{account.title}</h3>

        {/* Stats row */}
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

        {/* Price */}
        <div className="account-card-price">
          <span className="price">{account.price?.toLocaleString('vi-VN')}đ</span>
          {account.originalPrice && (
            <span className="price-old">{account.originalPrice.toLocaleString('vi-VN')}đ</span>
          )}
        </div>

        {/* Actions */}
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

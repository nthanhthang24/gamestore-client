// src/components/shared/AccountCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Star, Zap, Flame, Package, Heart, Clock } from 'lucide-react';
import './AccountCard.css';

const AccountCard = ({ account, onAddToCart, isWishlisted, onToggleWishlist, flashCountdown, isInCart }) => {
  // flashCountdown prop từ parent (ShopPage/WishlistPage) — tránh N requests
  const displayPrice = account.salePrice && account.salePrice < account.price
    ? account.salePrice : account.price;
  const baseOriginal = account.originalPrice || account.price;
  const showOriginal = displayPrice < baseOriginal;
  const discountPct  = showOriginal ? Math.round((1 - displayPrice / baseOriginal) * 100) : 0;
  const isFlashSale  = account.salePrice && account.salePrice < account.price;
  // Countdown từ activeFlashSale (đã fetch ở useFlashSale singleton)
  const cd = isFlashSale && flashCountdown && !flashCountdown.expired ? flashCountdown : null;

  // 1 item = 1 combo, bán 1 lần duy nhất
  const quantity  = account.quantity  != null ? account.quantity  : 1;
  const quantity  = account.quantity  != null ? account.quantity  : 1;
  const soldCount = account.soldCount != null ? account.soldCount : 0;
  const remaining = quantity - soldCount;
  const isSold    = account.status === 'sold' || remaining <= 0;
  const showQty   = quantity > 1;

  const rankColors = {
    'Đồng': '#cd7f32', 'Bạc': '#c0c0c0', 'Vàng': '#ffd700',
    'Bạch kim': '#e5e4e2', 'Kim cương': '#b9f2ff', 'Cao thủ': '#ff6b35',
    'Thách đấu': '#ff4757', 'Radiant': '#ff4757', 'Immortal': '#cc44ff'
  };

  return (
    <div className={`account-card card-glow card ${isFlashSale ? 'card-flash' : ''}`}>
      {/* Image */}
      <div className="account-card-img">
        {account.images?.[0]
          ? <img src={account.images[0]} alt={account.title} loading="lazy" />
          : <div className="account-card-img-placeholder"><Zap size={32} style={{ color: 'var(--accent)', opacity: 0.5 }} /></div>
        }
        {isFlashSale && (
          <div className="flash-ribbon">
            <Flame size={9} /> FLASH SALE
          </div>
        )}
        {discountPct > 0 && (
          <span className={`discount-badge ${isFlashSale ? 'discount-flash' : ''}`}>
            {isFlashSale && <Flame size={10} />} -{discountPct}%
          </span>
        )}
        {account.featured && !discountPct && <span className="featured-badge"><Star size={10} /> HOT</span>}
        {isSold
          ? <div className="sold-overlay">HẾT HÀNG</div>
          : showQty && <div className="stock-badge"><Package size={10} /> {quantity} accounts</div>
        }
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

        <div className="account-card-price">
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span className={`price ${isFlashSale ? 'price-sale' : ''}`}>
              {displayPrice?.toLocaleString('vi-VN')}đ
            </span>
            {showOriginal && <span className="price-old">{baseOriginal.toLocaleString('vi-VN')}đ</span>}
            {isFlashSale && discountPct > 0 && (
              <span style={{ fontSize:10, background:'rgba(255,71,87,0.15)', color:'#ff4757',
                borderRadius:4, padding:'1px 5px', fontWeight:700, border:'1px solid rgba(255,71,87,0.3)' }}>
                -{(baseOriginal - displayPrice).toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>
          {isFlashSale && cd && (
            <div className="flash-countdown">
              <Clock size={9} />
              Kết thúc sau {String(cd.h).padStart(2,'0')}:{String(cd.m).padStart(2,'0')}:{String(cd.s).padStart(2,'0')}
            </div>
          )}
        </div>

        <div className="account-card-actions">
          <Link to={`/account/${account.id}`} className="btn btn-ghost btn-sm">
            <Eye size={14} /> Chi tiết
          </Link>
          {onToggleWishlist && (
            <button className="btn btn-ghost btn-sm" onClick={()=>onToggleWishlist(account.id)}
              title={isWishlisted?'Bỏ yêu thích':'Thêm yêu thích'}
              style={{color:isWishlisted?'#ff4757':'var(--text-muted)',padding:'0 6px'}}>
              <Heart size={14} fill={isWishlisted?'#ff4757':'none'}/>
            </button>
          )}
          <button
            className={`btn btn-sm ${isSold ? 'btn-ghost' : isInCart ? 'btn-accent2' : 'btn-primary'}`}
            onClick={() => onAddToCart?.(account)}
            disabled={isSold}
            title={isInCart ? 'Đã có trong giỏ — nhấn để thêm thêm' : ''}
          >
            <ShoppingCart size={14} />
            {isSold ? 'Hết hàng' : isInCart ? '✓ Trong giỏ' : 'Mua ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountCard;

// src/pages/user/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AccountCard from '../../components/shared/AccountCard';
import {
  Zap, Shield, Clock, Star, TrendingUp, Users,
  ChevronRight, ArrowRight, Award, Gamepad2, Swords, Trophy
} from 'lucide-react';
import toast from 'react-hot-toast';
import './HomePage.css';
import { useFlashSale } from '../../hooks/useFlashSale';
import { Flame } from 'lucide-react';
import { useGameTypes } from '../../hooks/useGameTypes';

// GAME_TYPES loaded dynamically via useGameTypes hook inside component

const STATS = [
  { icon: <Users size={24} />, value: '10,000+', label: 'Khách hàng', color: 'var(--accent)' },
  { icon: <Trophy size={24} />, value: '50,000+', label: 'Tài khoản đã bán', color: 'var(--gold)' },
  { icon: <Shield size={24} />, value: '99.9%', label: 'Tỷ lệ thành công', color: 'var(--success)' },
  { icon: <Clock size={24} />, value: '24/7', label: 'Hỗ trợ', color: 'var(--accent2)' },
];

const HomePage = ({ onAddToCart, cart = [] }) => {
  const { gameTypes: dynamicGameTypes } = useGameTypes();
  // Thêm "Tất cả" vào đầu với icon Gamepad — memoized để tránh re-render
  const GAME_TYPES = React.useMemo(() => [
    { id: 'all', label: 'Tất cả', icon: <Gamepad2 size={18} />, color: 'var(--accent)' },
    ...dynamicGameTypes.map(g => ({ id: g.name, label: g.name, icon: g.icon, color: g.color })),
  ], [dynamicGameTypes]);
  const [featuredAccounts, setFeaturedAccounts] = useState([]);
  const [newAccounts, setNewAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const { activeFlashSale, getSalePrice, countdown } = useFlashSale();

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'accounts'),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc'),
      limit(8)
    );
    const unsub = onSnapshot(q, (snap) => {
      const accounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeaturedAccounts(accounts.filter(a => a.featured).slice(0, 4));
      setNewAccounts(accounts.slice(0, 8));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchAccounts = () => {}; // no-op: replaced by onSnapshot

  const handleAddToCart = (account) => {
    const salePrice = activeFlashSale ? getSalePrice(account.price) : null;
    onAddToCart?.({ ...account, salePrice: activeFlashSale && salePrice && salePrice < account.price ? salePrice : null });
    toast.success('Đã thêm vào giỏ hàng!', {
      style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
    });
  };

  return (
    <div className="home-page">
      {/* Flash Sale Banner */}
      {activeFlashSale && (
        <div className="flash-sale-banner" style={{ background: `linear-gradient(135deg, ${activeFlashSale.color || '#ff4757'}, ${activeFlashSale.color || '#ff4757'}cc)` }}>
          <div className="container fsb-inner">
            <Flame size={20} className="fsb-icon" />
            <span className="fsb-label">{activeFlashSale.label}</span>
            <span className="fsb-badge">GIẢM {activeFlashSale.discount}%</span>
            {countdown && !countdown.expired && (
              <span className="fsb-ends" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                ⏱ {String(countdown.h).padStart(2,'0')}:{String(countdown.m).padStart(2,'0')}:{String(countdown.s).padStart(2,'0')}
              </span>
            )}
            <Link to="/shop" className="fsb-cta">Mua ngay →</Link>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid" />
        </div>
        <div className="container hero-content">
          <div className="hero-text animate-fadeInUp">
            <div className="hero-badge">
              <Zap size={14} /> Nền tảng mua bán #1 Việt Nam
            </div>
            <h1 className="hero-title">
              Mua Bán Tài Khoản<br />
              <span className="hero-highlight">Game Uy Tín</span>
            </h1>
            <p className="hero-desc">
              Hàng nghìn tài khoản game chất lượng cao. Giao dịch an toàn, 
              bảo hành 100%, hỗ trợ 24/7. Tìm ngay account mơ ước của bạn!
            </p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-primary btn-xl">
                <Gamepad2 size={20} /> Khám phá ngay
              </Link>
              <Link to="/register" className="btn btn-ghost btn-xl">
                Tạo tài khoản <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-mini-stats">
              <div className="mini-stat"><span className="mini-val">10K+</span><span>Khách hàng</span></div>
              <div className="mini-stat-divider" />
              <div className="mini-stat"><span className="mini-val">50K+</span><span>Đã bán</span></div>
              <div className="mini-stat-divider" />
              <div className="mini-stat"><span className="mini-val">100%</span><span>Bảo hành</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-preview">
              <div className="hcp-glow" />
              <div className="hcp-header">
                <span className="badge badge-gold"><Star size={10} /> FEATURED</span>
                <span className="badge badge-success">Available</span>
              </div>
              <div className="hcp-game">🏆 LMHT - Server Vietnam</div>
              <div className="hcp-title">Account Kim Cương Mùa 2024</div>
              <div className="hcp-stats">
                <div className="hcp-stat"><span>Rank</span><strong style={{color:'var(--gold)'}}>Kim Cương II</strong></div>
                <div className="hcp-stat"><span>Số tướng</span><strong>150+</strong></div>
                <div className="hcp-stat"><span>Skin</span><strong>80+</strong></div>
              </div>
              <div className="hcp-price">
                <span className="price">850,000đ</span>
                <button className="btn btn-primary btn-sm"><ShoppingCartIcon /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Type Filter */}
      <section className="gametype-section">
        <div className="container">
          <div className="gametype-scroll">
            {GAME_TYPES.map(type => (
              <button
                key={type.id}
                className={`gametype-btn ${activeType === type.id ? 'active' : ''}`}
                onClick={() => setActiveType(type.id)}
              >
                <span>{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((stat, i) => (
              <div key={i} className="stat-card card">
                <div className="stat-icon" style={{ color: stat.color, background: `${stat.color}15` }}>
                  {stat.icon}
                </div>
                <div>
                  <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Accounts */}
      {featuredAccounts.length > 0 && (
        <section className="accounts-section">
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  <Star size={22} style={{ color: 'var(--gold)' }} /> Tài Khoản Nổi Bật
                </h2>
                <p className="section-subtitle">Những tài khoản hot nhất được nhiều người quan tâm</p>
              </div>
              <Link to="/shop?featured=true" className="btn btn-ghost btn-sm">
                Xem tất cả <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-4" style={{ gap: '20px' }}>
              {(activeType === 'all' ? featuredAccounts : featuredAccounts.filter(a => a.gameType === activeType)).map(acc => {
                const sp = activeFlashSale ? getSalePrice(acc.price, acc.gameType) : null;
                const accWithSale = sp && sp < acc.price ? { ...acc, salePrice: sp } : acc;
                return (
                  <AccountCard key={acc.id}
                    account={accWithSale}
                    onAddToCart={handleAddToCart}
                    flashCountdown={countdown}
                    isInCart={cart.some(c => c.id === acc.id)} />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* New Accounts */}
      <section className="accounts-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">
                <TrendingUp size={22} style={{ color: 'var(--accent)' }} /> Tài Khoản Mới Nhất
              </h2>
              <p className="section-subtitle">Cập nhật liên tục, hàng về mỗi ngày</p>
            </div>
            <Link to="/shop" className="btn btn-ghost btn-sm">
              Xem tất cả <ChevronRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div className="spinner" />
            </div>
          ) : (
            (() => {
              const displayAccounts = activeType === 'all' ? newAccounts : newAccounts.filter(a => a.gameType === activeType);
              return displayAccounts.length > 0 ? (
                <div className="grid grid-4" style={{ gap: '20px' }}>
                  {displayAccounts.map(acc => {
                    const sp = activeFlashSale ? getSalePrice(acc.price, acc.gameType) : null;
                    const accWithSale = sp && sp < acc.price ? { ...acc, salePrice: sp } : acc;
                    return (
                      <AccountCard key={acc.id}
                        account={accWithSale}
                        onAddToCart={handleAddToCart}
                        flashCountdown={countdown}
                        isInCart={cart.some(c => c.id === acc.id)} />
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
                  Chưa có tài khoản <strong>{activeType}</strong> nào. <Link to="/shop" style={{ color:'var(--accent)' }}>Xem tất cả →</Link>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="section-title">Tại Sao Chọn Chúng Tôi?</h2>
            <p className="section-subtitle">Cam kết mang đến trải nghiệm mua bán tốt nhất</p>
          </div>
          <div className="features-grid">
            {[
              { icon: <Shield size={28} />, title: 'Bảo hành 100%', desc: 'Hoàn tiền hoặc đổi account nếu có lỗi trong 24h sau mua', color: 'var(--success)' },
              { icon: <Zap size={28} />, title: 'Giao dịch tức thì', desc: 'Nhận thông tin account ngay sau khi thanh toán thành công', color: 'var(--accent)' },
              { icon: <Award size={28} />, title: 'Chất lượng kiểm định', desc: 'Mỗi account đều được kiểm tra kỹ lưỡng trước khi đăng bán', color: 'var(--gold)' },
              { icon: <Clock size={28} />, title: 'Hỗ trợ 24/7', desc: 'Đội ngũ hỗ trợ luôn sẵn sàng giải quyết mọi vấn đề', color: 'var(--accent2)' },
            ].map((f, i) => (
              <div key={i} className="feature-card card card-glow">
                <div className="feature-icon" style={{ color: f.color, background: `${f.color}15` }}>{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-banner">
            <div className="cta-orb" />
            <div className="cta-text">
              <h2>Sẵn sàng nâng cấp trải nghiệm gaming?</h2>
              <p>Đăng ký ngay hôm nay và nhận ưu đãi đặc biệt cho thành viên mới!</p>
            </div>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-primary btn-lg">Đăng ký miễn phí</Link>
              <Link to="/shop" className="btn btn-ghost btn-lg">Xem cửa hàng</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Inline icon
const ShoppingCartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

export default HomePage;

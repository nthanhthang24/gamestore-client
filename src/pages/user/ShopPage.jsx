// src/pages/user/ShopPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AccountCard from '../../components/shared/AccountCard';
import { Filter, SlidersHorizontal, Search, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import './ShopPage.css';
import { useFlashSale } from '../../hooks/useFlashSale';
import { useGameTypes } from '../../hooks/useGameTypes';
import { Flame } from 'lucide-react';

// GAME_TYPES loaded dynamically from Firestore via useGameTypes hook
const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá: Thấp → Cao' },
  { value: 'price_desc', label: 'Giá: Cao → Thấp' },
  { value: 'popular', label: 'Phổ biến nhất' },
];
const PRICE_RANGES = [
  { label: 'Tất cả', min: 0, max: Infinity },
  { label: 'Dưới 100K', min: 0, max: 100000 },
  { label: '100K - 500K', min: 100000, max: 500000 },
  { label: '500K - 1M', min: 500000, max: 1000000 },
  { label: '1M - 5M', min: 1000000, max: 5000000 },
  { label: 'Trên 5M', min: 5000000, max: Infinity },
];

const ShopPage = ({ onAddToCart }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const { gameTypeNamesWithAll: GAME_TYPES } = useGameTypes();
  const [gameType, setGameType] = useState('Tất cả');
  const [priceRange, setPriceRange] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const { activeFlashSale, getSalePrice } = useFlashSale();

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => { applyFilters(); }, [accounts, searchTerm, gameType, priceRange, sortBy]);

  const fetchAccounts = async () => {
    try {
      const q = query(collection(db, 'accounts'), where('status', '==', 'available'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...accounts];
    if (searchTerm) result = result.filter(a => a.title?.toLowerCase().includes(searchTerm.toLowerCase()) || a.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (gameType !== 'Tất cả') result = result.filter(a => a.gameType === gameType);
    const range = PRICE_RANGES[priceRange];
    result = result.filter(a => a.price >= range.min && a.price <= range.max);
    if (sortBy === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'popular') result.sort((a, b) => (b.views || 0) - (a.views || 0));
    setFiltered(result);
  };

  const handleAddToCart = (account) => {
    const salePrice = activeFlashSale ? getSalePrice(account.price) : null;
    onAddToCart?.({ ...account, salePrice: activeFlashSale && salePrice && salePrice < account.price ? salePrice : null });
    toast.success('Đã thêm vào giỏ hàng!', {
      style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
    });
  };

  const clearFilters = () => {
    setSearchTerm(''); setGameType('Tất cả'); setPriceRange(0); setSortBy('newest');
  };

  const hasActiveFilters = searchTerm || gameType !== 'Tất cả' || priceRange !== 0;

  return (
    <div className="shop-page page-wrapper">
      {activeFlashSale && (
        <div className="flash-sale-banner" style={{ background: `linear-gradient(135deg, ${activeFlashSale.color || '#ff4757'}, ${activeFlashSale.color || '#ff4757'}cc)` }}>
          <div className="container fsb-inner">
            <Flame size={18} className="fsb-icon" />
            <span className="fsb-label">{activeFlashSale.label}</span>
            <span className="fsb-badge">GIẢM {activeFlashSale.discount}%</span>
          </div>
        </div>
      )}
      <div className="container">
        <div className="shop-header">
          <div>
            <h1 className="section-title">Cửa Hàng</h1>
            <p className="section-subtitle">{filtered.length} tài khoản khả dụng</p>
          </div>
          <div className="shop-header-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '8px 14px' }}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div className="shop-layout">
          {/* Sidebar Filter */}
          <aside className={`shop-sidebar ${showFilters ? 'show' : ''}`}>
            <div className="sidebar-section">
              <h3 className="sidebar-title">Tìm kiếm</h3>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Tên account..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Loại game</h3>
              <div className="filter-options">
                {GAME_TYPES.map(type => (
                  <button
                    key={type}
                    className={`filter-opt ${gameType === type ? 'active' : ''}`}
                    onClick={() => setGameType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-title">Khoảng giá</h3>
              <div className="filter-options">
                {PRICE_RANGES.map((range, i) => (
                  <button
                    key={i}
                    className={`filter-opt ${priceRange === i ? 'active' : ''}`}
                    onClick={() => setPriceRange(i)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm w-full" onClick={clearFilters}>
                <X size={14} /> Xóa bộ lọc
              </button>
            )}
          </aside>

          {/* Products */}
          <main className="shop-products">
            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="active-filters">
                {searchTerm && <span className="filter-chip">Tìm: "{searchTerm}" <X size={12} onClick={() => setSearchTerm('')} /></span>}
                {gameType !== 'Tất cả' && <span className="filter-chip">{gameType} <X size={12} onClick={() => setGameType('Tất cả')} /></span>}
                {priceRange !== 0 && <span className="filter-chip">{PRICE_RANGES[priceRange].label} <X size={12} onClick={() => setPriceRange(0)} /></span>}
              </div>
            )}

            {loading ? (
              <div className="loading-grid">
                {[...Array(8)].map((_, i) => <div key={i} className="skeleton-card" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Không tìm thấy kết quả</h3>
                <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                <button className="btn btn-primary" onClick={clearFilters}>Xóa bộ lọc</button>
              </div>
            ) : (
              <div className="grid grid-3" style={{ gap: '20px' }}>
                {filtered.map(acc => (
                  <AccountCard key={acc.id} account={acc} onAddToCart={handleAddToCart} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;

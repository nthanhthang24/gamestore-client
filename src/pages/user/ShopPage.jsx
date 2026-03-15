// src/pages/user/ShopPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, onSnapshot, limit, startAfter } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AccountCard from '../../components/shared/AccountCard';
import { SlidersHorizontal, Search, X, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWishlist } from '../../hooks/useWishlist';
import { useSEO } from '../../hooks/useSEO';
import { useAuth } from '../../context/AuthContext';
import './ShopPage.css';
import { useFlashSale } from '../../hooks/useFlashSale';
import { useGameTypes } from '../../hooks/useGameTypes';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Mới nhất' },
  { value: 'price_asc',  label: 'Giá: Thấp → Cao' },
  { value: 'price_desc', label: 'Giá: Cao → Thấp' },
  { value: 'popular',    label: 'Phổ biến nhất' },
];
const PRICE_RANGES = [
  { label: 'Tất cả',       min: 0,       max: Infinity },
  { label: 'Dưới 100K',   min: 0,       max: 100000 },
  { label: '100K - 500K', min: 100000,  max: 500000 },
  { label: '500K - 1M',   min: 500000,  max: 1000000 },
  { label: '1M - 5M',     min: 1000000, max: 5000000 },
  { label: 'Trên 5M',     min: 5000000, max: Infinity },
];
const PAGE_SIZE = 12;

const ShopPage = ({ onAddToCart, cart = [] }) => {
  const { currentUser } = useAuth();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist(currentUser);
  useSEO({ title: 'Shop — Mua tài khoản game giá rẻ', description: 'Hàng nghìn tài khoản game rank cao giá tốt. LMHT, Liên Quân, Valorant, FIFA...' });
  const handleWishlist = async (id) => {
    if (!currentUser) { import('react-hot-toast').then(({default:t})=>t.error('Đăng nhập để lưu yêu thích')); return; }
    const added = await toggleWishlist(id);
    import('react-hot-toast').then(({default:t})=>t.success(added?'❤️ Đã thêm vào yêu thích':'Đã bỏ yêu thích'));
  };
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [gameType, setGameType]       = useState('Tất cả');
  const [priceRange, setPriceRange]   = useState(0);
  const [sortBy, setSortBy]           = useState('newest');
  const [page, setPage]               = useState(1);

  const { gameTypeNamesWithAll: GAME_TYPES } = useGameTypes();
  const { activeFlashSale, getSalePrice, isInFlashSale, countdown } = useFlashSale();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, gameType, priceRange, sortBy]);

  useEffect(() => { fetchAccounts(); }, []);

  // ✅ [C2] Realtime watcher: cập nhật soldCount/status khi có người mua
  useEffect(() => {
    // Lắng nghe accounts status='sold' → xóa khỏi list
    const unsubSold = onSnapshot(
      query(collection(db, 'accounts'), where('status', '==', 'sold')),
      (snap) => {
        const soldIds = new Set(snap.docs.map(d => d.id));
        if (soldIds.size > 0) {
          setAccounts(prev => prev.filter(a => !soldIds.has(a.id)));
        }
      },
      () => {}
    );
    // Lắng nghe accounts status='available' → cập nhật soldCount realtime
    const unsubAvail = onSnapshot(
      query(collection(db, 'accounts'), where('status', '==', 'available')),
      (snap) => {
        const updates = {};
        snap.docChanges().forEach(change => {
          if (change.type === 'modified') {
            updates[change.doc.id] = change.doc.data();
          }
        });
        if (Object.keys(updates).length > 0) {
          setAccounts(prev => prev.map(a =>
            updates[a.id] ? { ...a, soldCount: updates[a.id].soldCount, quantity: updates[a.id].quantity } : a
          ));
        }
      },
      () => {}
    );
    return () => { unsubSold(); unsubAvail(); };
  }, []);

  // Read gameType from URL param
  useEffect(() => {
    const t = searchParams.get('type');
    if (t) setGameType(t);
  }, [searchParams]);

  const PAGE_LOAD = 48;
  const [lastDoc, setLastDoc] = useState(null);
  const [serverHasMore, setServerHasMore] = useState(false);

  const fetchAccounts = async (reset = true) => {
    if (!reset && !serverHasMore) return;
    if (reset) setLoading(true);
    setFetchError(null);
    try {
      let q = query(
        collection(db, 'accounts'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_LOAD)
      );
      if (!reset && lastDoc) q = query(
        collection(db, 'accounts'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_LOAD),
        startAfter(lastDoc)
      );
      const snap = await getDocs(q);
      const newItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAccounts(prev => reset ? newItems : [...prev, ...newItems]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setServerHasMore(snap.docs.length === PAGE_LOAD);
    } catch (err) {
      console.error(err);
      try {
        const snap2 = await getDocs(query(collection(db, 'accounts'), where('status', '==', 'available'), limit(PAGE_LOAD)));
        const items = snap2.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
        setAccounts(reset ? items : prev => [...prev, ...items]);
        setServerHasMore(snap2.docs.length === PAGE_LOAD);
      } catch {
        setFetchError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Compute filtered + sorted list
  const filtered = (() => {
    let result = [...accounts];
    if (debouncedSearch)
      result = result.filter(a =>
        a.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        a.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    if (gameType !== 'Tất cả') result = result.filter(a => a.gameType === gameType);
    const range = PRICE_RANGES[priceRange];
    result = result.filter(a => {
      const effectivePrice = activeFlashSale ? (getSalePrice(a.price, a.gameType) || a.price) : a.price;
      return effectivePrice >= range.min && effectivePrice <= range.max;
    });
    if (sortBy === 'price_asc')  result.sort((a, b) => {
      const pa = activeFlashSale ? (getSalePrice(a.price, a.gameType) || a.price) : a.price;
      const pb = activeFlashSale ? (getSalePrice(b.price, b.gameType) || b.price) : b.price;
      return pa - pb;
    });
    else if (sortBy === 'price_desc') result.sort((a, b) => {
      const pa = activeFlashSale ? (getSalePrice(a.price, a.gameType) || a.price) : a.price;
      const pb = activeFlashSale ? (getSalePrice(b.price, b.gameType) || b.price) : b.price;
      return pb - pa;
    });
    else if (sortBy === 'popular')    result.sort((a, b) => (b.views || 0) - (a.views || 0));
    return result;
  })();

  const displayedAccounts = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = page * PAGE_SIZE < filtered.length;

  const handleAddToCart = (account) => {
    const salePrice = activeFlashSale ? getSalePrice(account.price, account.gameType) : null;
    onAddToCart?.({ ...account, salePrice: salePrice && salePrice < account.price ? salePrice : null });
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
      {/* Flash Sale Banner */}
      {activeFlashSale && (
        <div className="flash-sale-banner" style={{ background: `linear-gradient(135deg, ${activeFlashSale.color || '#ff4757'}, ${activeFlashSale.color || '#ff4757'}cc)` }}>
          <div className="container fsb-inner">
            <Flame size={18} className="fsb-icon" />
            <span className="fsb-label">{activeFlashSale.label}</span>
            <span className="fsb-badge">GIẢM {activeFlashSale.discount}%</span>
            {countdown && !countdown.expired && (
              <span style={{ fontFamily:'monospace', fontSize:13, color:'rgba(255,255,255,0.9)' }}>
                ⏱ {String(countdown.h).padStart(2,'0')}:{String(countdown.m).padStart(2,'0')}:{String(countdown.s).padStart(2,'0')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="container">
        {/* Header */}
        <div className="shop-header">
          <div>
            <h1 className="section-title">Cửa Hàng</h1>
            <p className="section-subtitle">{filtered.length} tài khoản khả dụng</p>
          </div>
          <div className="shop-header-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>
            <select className="form-select" style={{ width:'auto', padding:'8px 14px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div className="shop-layout">
          {/* Sidebar */}
          <aside className={`shop-sidebar ${showFilters ? 'show' : ''}`}>
            <div className="sidebar-section">
              <h3 className="sidebar-title">Tìm kiếm</h3>
              <div style={{ position:'relative' }}>
                <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft:38 }} placeholder="Tên account..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="sidebar-section">
              <h3 className="sidebar-title">Loại game</h3>
              <div className="filter-options">
                {GAME_TYPES.map(type => (
                  <button key={type} className={`filter-opt ${gameType === type ? 'active' : ''}`} onClick={() => setGameType(type)}>{type}</button>
                ))}
              </div>
            </div>
            <div className="sidebar-section">
              <h3 className="sidebar-title">Khoảng giá</h3>
              <div className="filter-options">
                {PRICE_RANGES.map((r, i) => (
                  <button key={i} className={`filter-opt ${priceRange === i ? 'active' : ''}`} onClick={() => setPriceRange(i)}>{r.label}</button>
                ))}
              </div>
            </div>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" style={{ width:'100%', marginTop:8 }} onClick={clearFilters}>
                <X size={14} /> Xóa bộ lọc
              </button>
            )}
          </aside>

          {/* Main content */}
          <main className="shop-main">
            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="filter-chips">
                {searchTerm && <span className="filter-chip">Tìm: "{searchTerm}" <X size={12} onClick={() => setSearchTerm('')} /></span>}
                {gameType !== 'Tất cả' && <span className="filter-chip">{gameType} <X size={12} onClick={() => setGameType('Tất cả')} /></span>}
                {priceRange !== 0 && <span className="filter-chip">{PRICE_RANGES[priceRange].label} <X size={12} onClick={() => setPriceRange(0)} /></span>}
              </div>
            )}

            {fetchError ? (
              <div className="empty-state">
                <div className="empty-icon">⚠️</div>
                <h3>Không thể tải sản phẩm</h3>
                <p style={{ fontSize:13, color:'var(--text-muted)' }}>{fetchError}</p>
                <button className="btn btn-primary" onClick={fetchAccounts}>Thử lại</button>
              </div>
            ) : loading ? (
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
              <>
                <div className="grid grid-3" style={{ gap:20 }}>
                  {displayedAccounts.map(acc => {
                    // Inject salePrice trước khi render card — user thấy giá sale ngay trên listing
                    const salePrice = activeFlashSale ? getSalePrice(acc.price, acc.gameType) : null;
                    const accWithSale = salePrice && salePrice < acc.price
                      ? { ...acc, salePrice }
                      : acc;
                    return (
                      <AccountCard key={acc.id} account={accWithSale} onAddToCart={handleAddToCart} isWishlisted={isWishlisted(acc.id)} onToggleWishlist={handleWishlist} flashCountdown={countdown} isInCart={cart.some(c => c.id === acc.id)} />
                    );
                  })}
                </div>

                {/* Load more / pagination */}
                <div style={{ textAlign:'center', marginTop:28 }}>
                  {(hasMore || serverHasMore) && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => { if (hasMore) setPage(p => p + 1); else fetchAccounts(false); }}
                      style={{ padding:'10px 32px', borderRadius:24, border:'1px solid var(--border)', marginBottom:10 }}
                    >
                      {hasMore
                        ? `Xem thêm (${filtered.length - page * PAGE_SIZE} sản phẩm) ↓`
                        : `Tải thêm sản phẩm ↓`}
                    </button>
                  )}
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                    Hiển thị {displayedAccounts.length}/{filtered.length} sản phẩm{serverHasMore ? '+' : ''}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;

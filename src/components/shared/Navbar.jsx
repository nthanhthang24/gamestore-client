// src/components/shared/Navbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { Tag, Sword, ShoppingCart, Bell, User, LogOut, Settings, Shield,
  Menu, X, Search, Zap, ChevronDown, Wallet, Heart, Gift,
  Info, CheckCircle, AlertTriangle
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Navbar.css';

const TYPE_COLOR = {
  info: 'var(--accent)', success: 'var(--success)', warning: 'var(--gold)', promo: '#c084fc'
};
const TYPE_ICON = {
  info: <Info size={13}/>, success: <CheckCircle size={13}/>,
  warning: <AlertTriangle size={13}/>, promo: <Zap size={13}/>
};

const Navbar = ({ cartCount = 0 }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { siteName } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openTickets, setOpenTickets] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── NEW: System notifications ──────────────────────────────
  const [sysNotifications, setSysNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const isAdmin = userProfile?.role === 'admin';

  // Realtime: count open tickets for current user
  useEffect(() => {
    // BUG FIX: reset immediately so previous user's ticket count doesn't linger
    setOpenTickets(0);
    if (!currentUser) return;
    const q = query(collection(db,'tickets'), where('userId','==',currentUser.uid), where('status','==','open'));
    const unsub = onSnapshot(q, snap => setOpenTickets(snap.size), ()=>{});
    return () => { unsub(); setOpenTickets(0); };
  }, [currentUser?.uid]);

  // Realtime: system notifications for this user
  useEffect(() => {
    // BUG FIX: clear stale notifications immediately when user changes or logs out
    // Without this, previous user's notifications stay visible until new listener fires
    setSysNotifications([]);

    if (!currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      // Capture uid at subscription time — guard against stale closure
      const uid = currentUser.uid;
      const email = currentUser.email;
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = all.filter(n =>
        n.targetAll ||
        n.targetUserId === uid ||
        n.targetUserId === email
      ).slice(0, 10);
      setSysNotifications(mine);
    }, () => {});
    return () => {
      unsub();
      // Clear on cleanup so switching users never shows stale data
      setSysNotifications([]);
    };
  }, [currentUser?.uid]);

  const isRead = (n) => (n.read || []).includes(currentUser?.uid);
  const unreadCount = sysNotifications.filter(n => !isRead(n)).length;

  const markRead = async (n) => {
    if (!currentUser || isRead(n)) return;
    updateDoc(doc(db, 'notifications', n.id), { read: arrayUnion(currentUser.uid) }).catch(() => {});
  };

  const markAllRead = async () => {
    sysNotifications.filter(n => !isRead(n)).forEach(n =>
      updateDoc(doc(db, 'notifications', n.id), { read: arrayUnion(currentUser.uid) }).catch(() => {})
    );
  };

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  const navLinks = [
    { path: '/', label: 'Trang chủ' },
    { path: '/shop', label: 'Cửa hàng' },
    { path: '/services', label: 'Dịch vụ' },
    { path: '/topup', label: 'Nạp tiền' },
    { path: '/support', label: 'Hỗ trợ' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon"><Zap size={20} /></div>
          <span className="logo-text">{siteName}</span>
        </Link>

        {/* Nav links desktop */}
        <ul className="navbar-links">
          {navLinks.map(link => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          {isAdmin && (
            <li>
              <Link to="/admin" className={`nav-link admin-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
                <Shield size={14} />
                Admin
              </Link>
            </li>
          )}
        </ul>

        {/* Right actions */}
        <div className="navbar-actions">
          {/* Theme toggle */}

          {/* Search */}
          <button className="nav-icon-btn" onClick={() => setSearchOpen(!searchOpen)}>
            <Search size={18} />
          </button>

          {currentUser ? (
            <>
              {/* Cart */}
              <Link to="/cart" className="nav-icon-btn cart-btn">
                <ShoppingCart size={18} />
                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </Link>

              {/* Notification Bell */}
              <div className="user-dropdown" ref={bellRef} style={{position:'relative'}}>
                <button className="nav-icon-btn" onClick={()=>setBellOpen(p=>!p)} style={{position:'relative'}}>
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="cart-badge" style={{background: unreadCount > 0 ? 'var(--accent)' : 'var(--gold)'}}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="dropdown-menu" style={{minWidth:320,right:0,left:'auto',maxHeight:480,overflowY:'auto'}}>
                    <div className="dropdown-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span className="dropdown-name">🔔 Thông báo</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead}
                          style={{fontSize:11,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',padding:0}}>
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                    <div className="dropdown-divider"/>

                    {/* Open tickets alert */}
                    {openTickets > 0 && (
                      <Link to="/support" className="dropdown-item" onClick={()=>setBellOpen(false)}
                        style={{color:'var(--gold)',gap:8}}>
                        <Shield size={14}/> Bạn có {openTickets} ticket hỗ trợ đang mở
                      </Link>
                    )}

                    {/* System notifications */}
                    {sysNotifications.slice(0,5).map(n => {
                      const read = isRead(n);
                      return (
                        <div key={n.id}
                          className="dropdown-item"
                          onClick={() => { markRead(n); setBellOpen(false); navigate('/notifications'); }}
                          style={{
                            flexDirection:'column', alignItems:'flex-start', gap:3, cursor:'pointer',
                            background: read ? 'transparent' : `${TYPE_COLOR[n.type] || 'var(--accent)'}08`,
                            borderLeft: read ? 'none' : `3px solid ${TYPE_COLOR[n.type] || 'var(--accent)'}`,
                            paddingLeft: read ? 16 : 13,
                          }}>
                          <div style={{display:'flex',alignItems:'center',gap:6,width:'100%'}}>
                            <span style={{color: TYPE_COLOR[n.type] || 'var(--accent)', flexShrink:0}}>
                              {TYPE_ICON[n.type] || <Info size={13}/>}
                            </span>
                            <span style={{fontWeight: read ? 500 : 700, fontSize:13, color:'var(--text-primary)', flex:1,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                              {n.title}
                            </span>
                            {!read && <span style={{width:6,height:6,borderRadius:'50%',background:TYPE_COLOR[n.type]||'var(--accent)',flexShrink:0}}/>}
                          </div>
                          <div style={{fontSize:11,color:'var(--text-muted)',paddingLeft:19,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',width:'100%'}}>
                            {n.body}
                          </div>
                        </div>
                      );
                    })}

                    {sysNotifications.length === 0 && (
                      <div style={{padding:'20px 16px',fontSize:13,color:'var(--text-muted)',textAlign:'center'}}>
                        <Bell size={28} style={{opacity:0.2,display:'block',margin:'0 auto 8px'}}/>
                        Không có thông báo mới
                      </div>
                    )}

                    <div className="dropdown-divider"/>
                    <Link to="/notifications" className="dropdown-item" onClick={()=>setBellOpen(false)}
                      style={{fontSize:12,textAlign:'center',justifyContent:'center',color:'var(--accent)'}}>
                      Xem tất cả thông báo →
                    </Link>
                  </div>
                )}
              </div>

              {/* Balance */}
              <div className="nav-balance">
                <Wallet size={14} />
                <span>{(userProfile?.balance || 0).toLocaleString('vi-VN')}đ</span>
              </div>

              {/* User Dropdown */}
              <div className="user-dropdown" ref={dropdownRef}>
                <button className="user-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  {userProfile?.avatar
                    ? <img src={userProfile.avatar} alt="" className="user-avatar-img" />
                    : <div className="user-avatar-placeholder">
                        {(userProfile?.displayName || currentUser.email)[0].toUpperCase()}
                      </div>
                  }
                  <ChevronDown size={14} className={`chevron ${dropdownOpen ? 'open' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <span className="dropdown-name">{userProfile?.displayName || 'Người dùng'}</span>
                      <span className="dropdown-email">{currentUser.email}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <User size={15} /> Hồ sơ của tôi
                    </Link>
                    <Link to="/orders" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <ShoppingCart size={15} /> Đơn hàng
                    </Link>
                    <Link to="/topup" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <Wallet size={15} style={{color:'var(--accent)'}}/> Nạp tiền
                    </Link>
                    <Link to="/wishlist" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <Heart size={15} style={{color:'#ff4757'}}/> Yêu thích
                    </Link>
                    <Link to="/vouchers" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <Tag size={15} /> Voucher của tôi
                    </Link>

                    <Link to="/services" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <Sword size={15} /> Dịch vụ game
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="dropdown-item admin" onClick={() => setDropdownOpen(false)}>
                        <Shield size={15} /> Quản trị
                      </Link>
                    )}
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={15} /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-ghost btn-sm">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="search-bar">
          <div className="container">
            <form onSubmit={handleSearch} className="search-form">
              <Search size={18} className="search-icon" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tài khoản game..."
                className="search-input"
              />
              <button type="submit" className="btn btn-primary btn-sm">Tìm</button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {currentUser && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{userProfile?.displayName || currentUser.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--gold)', fontSize: 13 }}>
                <Wallet size={13} /> {(userProfile?.balance || 0).toLocaleString('vi-VN')}đ
              </div>
            </div>
          )}
          {navLinks.map(link => (
            <Link key={link.path} to={link.path} className="mobile-link" onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          {currentUser && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
              <Link to="/profile" className="mobile-link" onClick={() => setMenuOpen(false)}>👤 Hồ sơ</Link>
              <Link to="/orders" className="mobile-link" onClick={() => setMenuOpen(false)}>📦 Đơn hàng</Link>
              <Link to="/topup" className="mobile-link" onClick={() => setMenuOpen(false)}>💰 Nạp tiền</Link>
              <Link to="/notifications" className="mobile-link" onClick={() => setMenuOpen(false)}>
                🔔 Thông báo{unreadCount > 0 && <span style={{marginLeft:6,background:'var(--accent)',color:'#000',borderRadius:'50%',padding:'1px 6px',fontSize:11,fontWeight:700}}>{unreadCount}</span>}
              </Link>
              <Link to="/wishlist" className="mobile-link" onClick={() => setMenuOpen(false)}>❤️ Yêu thích</Link>
              <Link to="/vouchers" className="mobile-link" onClick={() => setMenuOpen(false)}>🎫 Voucher</Link>
              <button className="mobile-link danger" style={{ width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', color:'var(--danger)' }} onClick={handleLogout}>🚪 Đăng xuất</button>
            </div>
          )}
          {!currentUser && (
            <div className="mobile-auth">
              <Link to="/login" className="btn btn-ghost w-full" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary w-full" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;

// src/components/shared/Navbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Tag, Sword, ShoppingCart, Bell, User, LogOut, Settings, Shield,
  Menu, X, Search, Zap, ChevronDown, Wallet
} from 'lucide-react';
import './Navbar.css';

const Navbar = ({ cartCount = 0 }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
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
          <span className="logo-text">GAME<span className="logo-accent">STORE</span></span>
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

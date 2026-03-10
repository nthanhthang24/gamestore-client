// src/App.js
import React, { useState, useEffect } from 'react';

// ── Wake up Render server khi user mở app ──────────────────────
// Render free tier ngủ sau 15 phút không dùng.
// Ping ngay khi load → server thức trước khi user cần nạp tiền.
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://gamestore-server-i20i.onrender.com';
function useServerWakeup() {
  useEffect(() => {
    // Ping lần đầu ngay khi mở app
    const ping = () => fetch(`${SERVER_URL}/`, { method: 'GET' }).catch(() => {});
    ping();
    // Ping lại mỗi 4 phút để giữ server luôn tỉnh (Render sleep sau 15 phút)
    const interval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/shared/Navbar';
import HomePage from './pages/user/HomePage';
import ShopPage from './pages/user/ShopPage';
import AccountDetailPage from './pages/user/AccountDetailPage';
import CartPage from './pages/user/CartPage';
import TopupPage from './pages/user/TopupPage';
import { LoginPage, RegisterPage } from './pages/user/AuthPages';
import AdminLayout, { AdminOverview } from './pages/admin/AdminDashboard';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminAccountForm from './pages/admin/AdminAccountForm';
import AdminTopups from './pages/admin/AdminTopups';
import AdminVouchers from './pages/admin/AdminVouchers';
import AdminServices from './pages/admin/AdminServices';
import AdminGameTypes from './pages/admin/AdminGameTypes';
import ServicesPage from './pages/user/ServicesPage';
import MyVouchersPage from './pages/user/MyVouchersPage';
import './index.css';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, userProfile, loading } = useAuth();
  // ✅ FIX: Chờ auth + profile load xong mới check — tránh redirect nhầm
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" />
    </div>
  );
  if (!currentUser) return <Navigate to="/login" />;
  // ✅ FIX: Nếu adminOnly nhưng profile chưa load → đợi (đã handle bởi loading above)
  if (adminOnly && userProfile?.role !== 'admin') return <Navigate to="/" />;
  return children;
};

const Footer = () => (
  <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '40px 0', marginTop: '60px' }}>
    <div className="container" style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Rajdhani', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
        GAME<span style={{ color: 'var(--accent)' }}>STORE</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>© 2024 GameStore VN. Nền tảng mua bán tài khoản game uy tín hàng đầu.</p>
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '16px' }}>
        {['Điều khoản', 'Bảo mật', 'Liên hệ', 'FAQ'].map(item => (
          <a key={item} href="#" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>{item}</a>
        ))}
      </div>
    </div>
  </footer>
);

const AdminOrdersPage = () => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, query, orderBy, getDocs }) => {
      import('./firebase/config').then(({ db }) => {
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')))
          .then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
          .catch(err => {
            console.error('Admin orders error:', err);
            // Fallback: load without orderBy if index missing
            getDocs(collection(db, 'orders'))
              .then(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                  .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
                setOrders(data);
              })
              .catch(console.error);
          }).finally(() => setLoading(false));
      });
    });
  }, []);

  return (
    <div>
      <div className="admin-page-header"><h1 className="admin-page-title">Quản lý Đơn hàng</h1></div>
      {loading ? <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" /></div>
      : orders.length === 0 ? <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn hàng</div>
      : (
        <div className="table-wrap card">
          <table className="admin-table">
            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Items</th><th>Tổng tiền</th><th>Giảm giá</th><th>Thời gian</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>#{o.id.slice(-8).toUpperCase()}</td>
                  <td>{o.userEmail}</td>
                  <td>{(o.items||[]).map(i => i.title).join(', ')}</td>
                  <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{o.total?.toLocaleString('vi-VN')}đ</td>
                  <td style={{ color: 'var(--success)' }}>{o.discount > 0 ? `-${o.discount?.toLocaleString('vi-VN')}đ` : '—'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
const AdminUsersPage = () => (
  <div><div className="admin-page-header"><h1 className="admin-page-title">Quản lý Người dùng</h1></div>
  <div className="card"><p style={{ color: 'var(--text-secondary)', padding: '20px' }}>Danh sách người dùng.</p></div></div>
);
const AdminSettingsPage = () => (
  <div><div className="admin-page-header"><h1 className="admin-page-title">Cài đặt</h1></div>
  <div className="card"><p style={{ color: 'var(--text-secondary)', padding: '20px' }}>Cài đặt hệ thống.</p></div></div>
);

const UserOrdersPage = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState(null);

  React.useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    setFetchError(null);
    import('firebase/firestore').then(({ collection, query, where, getDocs }) => {
      import('./firebase/config').then(({ db }) => {
        // Bỏ orderBy để tránh cần composite index — sort ở client-side
        getDocs(query(collection(db, 'orders'),
          where('userId', '==', currentUser.uid)
        )).then(snap => {
          const data = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              // Sort by createdAt desc, handle Firestore Timestamp
              const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
              const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
              return tb - ta;
            });
          setOrders(data);
        }).catch(err => {
          console.error('Orders fetch error:', err);
          setFetchError(err.message);
        }).finally(() => setLoading(false));
      });
    });
  }, [currentUser]);

  return (
    <div className="page-wrapper" style={{ padding: '30px 0 60px' }}>
      <div className="container">
        <h1 className="section-title" style={{ marginBottom: '28px' }}>📦 Đơn hàng của tôi</h1>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" /></div>
        ) : fetchError ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--danger)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h3>Không thể tải đơn hàng</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>{fetchError}</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h2 style={{ marginBottom: '8px' }}>Chưa có đơn hàng nào</h2>
            <p style={{ color: 'var(--text-muted)' }}>Hãy khám phá cửa hàng và mua tài khoản game!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map(order => (
              <div key={order.id} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                      {order.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—'}
                    </span>
                  </div>
                  <span className="badge badge-success">✅ Hoàn thành</span>
                </div>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: item.loginUsername ? '8px' : 0 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.title} <span className="badge badge-accent" style={{ fontSize: '11px' }}>{item.gameType}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{item.price?.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {/* ✅ Thông tin đăng nhập tài khoản game */}
                    {item.loginUsername && (
                      <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '13px' }}>
                        <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 6, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          🔑 Thông tin đăng nhập
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Username:</span><br/><strong style={{ fontFamily: 'monospace' }}>{item.loginUsername}</strong></div>
                          <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Password:</span><br/><strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{item.loginPassword}</strong></div>
                          {item.loginEmail && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Email:</span><br/><strong style={{ fontFamily: 'monospace' }}>{item.loginEmail}</strong></div>}
                          {item.loginNote && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Ghi chú:</span><br/><span style={{ color: 'var(--text-secondary)' }}>{item.loginNote}</span></div>}
                        </div>
                      </div>
                    )}
                    {!item.loginUsername && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Thông tin đăng nhập sẽ được admin liên hệ qua email.
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {order.discount > 0 && `Giảm: -${order.discount?.toLocaleString('vi-VN')}đ`}
                  </span>
                  <span style={{ fontFamily: 'Rajdhani', fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
                    Tổng: {order.total?.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SupportPage = () => (
  <div className="page-wrapper" style={{ padding: '30px 0 60px' }}>
    <div className="container">
      <h1 className="section-title" style={{ marginBottom: '28px' }}>Hỗ trợ khách hàng</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {[
          { icon: '💬', title: 'Live Chat', desc: 'Chat trực tiếp với nhân viên hỗ trợ' },
          { icon: '📧', title: 'Email', desc: 'support@gamestore.vn' },
          { icon: '📱', title: 'Zalo / Facebook', desc: 'Nhắn tin qua mạng xã hội' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>{item.icon}</div>
            <h3 style={{ fontFamily: 'Rajdhani', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{item.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const UserLayout = ({ cart, addToCart, setCart }) => (
  <>
    <Navbar cartCount={cart.length} />
    <Routes>
      <Route path="/" element={<HomePage onAddToCart={addToCart} />} />
      <Route path="/shop" element={<ShopPage onAddToCart={addToCart} />} />
      <Route path="/account/:id" element={<AccountDetailPage onAddToCart={addToCart} />} />
      <Route path="/cart" element={<CartPage cart={cart} setCart={setCart} />} />
      <Route path="/topup" element={<ProtectedRoute><TopupPage /></ProtectedRoute>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/orders" element={<ProtectedRoute><UserOrdersPage /></ProtectedRoute>} />
      <Route path="/vouchers" element={<ProtectedRoute><MyVouchersPage /></ProtectedRoute>} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/services" element={<ServicesPage />} />
    </Routes>
    <Footer />
  </>
);

const AppContent = () => {
  useServerWakeup(); // ✅ Ping server ngay khi app load → tránh delay 50s

  // ✅ FIX: Persist cart trong sessionStorage (tránh mất giỏ hàng khi F5)
  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem('gs_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const setCartPersist = (updater) => {
    setCart(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { sessionStorage.setItem('gs_cart', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const addToCart = (account) =>
    setCartPersist(prev => prev.find(i => i.id === account.id) ? prev : [...prev, account]);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/admin/*" element={
          <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminOverview />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="accounts/new" element={<AdminAccountForm />} />
          <Route path="accounts/edit/:id" element={<AdminAccountForm />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="topups" element={<AdminTopups />} />
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="game-types" element={<AdminGameTypes />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="/*" element={<UserLayout cart={cart} addToCart={addToCart} setCart={setCartPersist} />} />
      </Routes>
    </Router>
  );
};

const App = () => <AuthProvider><AppContent /></AuthProvider>;
export default App;

// src/App.js
import React, { useState } from 'react';
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
import './index.css';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
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

const AdminOrdersPage = () => (
  <div><div className="admin-page-header"><h1 className="admin-page-title">Quản lý Đơn hàng</h1></div>
  <div className="card"><p style={{ color: 'var(--text-secondary)', padding: '20px' }}>Danh sách đơn hàng.</p></div></div>
);
const AdminUsersPage = () => (
  <div><div className="admin-page-header"><h1 className="admin-page-title">Quản lý Người dùng</h1></div>
  <div className="card"><p style={{ color: 'var(--text-secondary)', padding: '20px' }}>Danh sách người dùng.</p></div></div>
);
const AdminSettingsPage = () => (
  <div><div className="admin-page-header"><h1 className="admin-page-title">Cài đặt</h1></div>
  <div className="card"><p style={{ color: 'var(--text-secondary)', padding: '20px' }}>Cài đặt hệ thống.</p></div></div>
);

const UserOrdersPage = () => (
  <div className="page-wrapper" style={{ padding: '30px 0 60px' }}>
    <div className="container">
      <h1 className="section-title" style={{ marginBottom: '28px' }}>Đơn hàng của tôi</h1>
      <div className="card"><p style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>Lịch sử đơn hàng của bạn sẽ hiển thị tại đây.</p></div>
    </div>
  </div>
);

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
      <Route path="/support" element={<SupportPage />} />
    </Routes>
    <Footer />
  </>
);

const AppContent = () => {
  const [cart, setCart] = useState([]);
  const addToCart = (account) =>
    setCart(prev => prev.find(i => i.id === account.id) ? prev : [...prev, account]);

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
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="/*" element={<UserLayout cart={cart} addToCart={addToCart} setCart={setCart} />} />
      </Routes>
    </Router>
  );
};

const App = () => <AuthProvider><AppContent /></AuthProvider>;
export default App;

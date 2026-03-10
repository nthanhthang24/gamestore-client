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
  // ✅ FIX T1-03: Nếu adminOnly nhưng userProfile chưa load xong → đợi, tránh race condition
  if (adminOnly && !userProfile) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );
  if (adminOnly && userProfile?.role !== 'admin') return <Navigate to="/" />;
  return children;
};

const Footer = () => {
  const { Link } = require('react-router-dom');
  return (
  <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', padding: '40px 0', marginTop: '60px' }}>
    <div className="container" style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Rajdhani', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
        GAME<span style={{ color: 'var(--accent)' }}>STORE</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>© {new Date().getFullYear()} GameStore VN. Nền tảng mua bán tài khoản game uy tín hàng đầu.</p>
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '16px' }}>
        <Link to="/support" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>Liên hệ</Link>
        <Link to="/support" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>FAQ</Link>
        <Link to="/terms" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>Điều khoản</Link>
        <Link to="/privacy" style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}>Bảo mật</Link>
      </div>
    </div>
  </footer>
  );
};

const exportOrdersCSV = (orders) => {
  const rows = [
    ['Mã đơn', 'Email', 'Tổng tiền', 'Giảm giá', 'Items', 'Thời gian'],
    ...orders.map(o => [
      o.id, o.userEmail || '',
      o.total || 0, o.discount || 0,
      (o.items || []).map(i => i.title).join(' | '),
      o.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '',
    ])
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState(null);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, query, orderBy, getDocs }) => {
      import('./firebase/config').then(({ db }) => {
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')))
          .then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
          .catch(() => getDocs(collection(db, 'orders'))
            .then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))))
          ).finally(() => setLoading(false));
      });
    });
  }, []);

  const filtered = orders.filter(o => !search || o.userEmail?.includes(search) || o.id.includes(search));
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý Đơn hàng</h1>
          <p className="admin-page-sub">{orders.length} đơn · Doanh thu: <strong style={{ color: 'var(--gold)' }}>{totalRevenue.toLocaleString('vi-VN')}đ</strong></p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => exportOrdersCSV(filtered)} style={{ display:'flex', alignItems:'center', gap:6 }}>
          📊 Xuất CSV
        </button>
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <input className="form-input" placeholder="Tìm theo email hoặc mã đơn..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      : orders.length === 0 ? <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn hàng</div>
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(o => (
            <div key={o.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                    #{o.id.slice(-8).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13 }}>{o.userEmail}</span>
                  <span className="badge badge-success">✅ {o.items?.length || 0} items</span>
                  <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{o.total?.toLocaleString('vi-VN')}đ</span>
                  {o.discount > 0 && <span style={{ fontSize: 12, color: 'var(--success)' }}>-{o.discount?.toLocaleString('vi-VN')}đ</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{expandedId === o.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expandedId === o.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'rgba(0,0,0,0.2)' }}>
                  {(o.items || []).map((item, i) => (
                    <div key={i} style={{ marginBottom: 16, padding: 14, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600 }}>{item.title} <span className="badge badge-accent" style={{ fontSize: 10 }}>{item.gameType}</span></span>
                        <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{item.price?.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, padding: '10px 14px', fontSize: 13 }}>
                        <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 8, fontSize: 11, textTransform: 'uppercase' }}>🔑 Thông tin đăng nhập</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 6, alignItems: 'center' }}>
                          {[
                            ['Username', item.loginUsername],
                            ['Password', item.loginPassword],
                            ...(item.loginEmail ? [['Email', item.loginEmail]] : []),
                          ].map(([lbl, val]) => val ? (
                            <React.Fragment key={lbl}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{lbl}:</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: lbl === 'Password' ? 'var(--accent)' : 'inherit' }}>{val}</span>
                              <button onClick={() => navigator.clipboard.writeText(val)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Copy</button>
                            </React.Fragment>
                          ) : null)}
                        </div>
                        {item.loginNote && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>📝 {item.loginNote}</div>}
                        {item.attachmentUrl && (
                          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>📎 File đính kèm</div>
                            <a
                              href={item.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--accent)', textDecoration:'none', padding:'5px 12px', border:'1px solid rgba(0,212,255,0.3)', borderRadius:6, background:'rgba(0,212,255,0.07)', fontWeight:600 }}
                            >
                              ⬇️ {item.attachmentName || 'Tải file đính kèm'}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const AdminUsersPage = () => {
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [adjustAmount, setAdjustAmount] = React.useState('');
  const [adjustNote, setAdjustNote] = React.useState('');
  const [adjusting, setAdjusting] = React.useState(false);

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs, orderBy, query }) => {
      import('./firebase/config').then(({ db }) => {
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
          .then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
          .catch(err => {
            // fallback no orderBy
            getDocs(collection(db, 'users'))
              .then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
              .catch(console.error);
          })
          .finally(() => setLoading(false));
      });
    });
  }, []);

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) return;
    const amt = parseInt(adjustAmount);
    if (isNaN(amt)) { alert('Số tiền không hợp lệ'); return; }
    setAdjusting(true);
    try {
      await import('firebase/firestore').then(({ doc, runTransaction }) =>
        import('./firebase/config').then(({ db }) =>
          runTransaction(db, async (tx) => {
            const uRef = doc(db, 'users', selectedUser.id);
            const uSnap = await tx.get(uRef);
            if (!uSnap.exists()) throw new Error('User not found');
            const cur = uSnap.data().balance || 0;
            tx.update(uRef, { balance: cur + amt });
          })
        )
      );
      setUsers(us => us.map(u => u.id === selectedUser.id ? { ...u, balance: (u.balance || 0) + amt } : u));
      setSelectedUser(u => ({ ...u, balance: (u.balance || 0) + amt }));
      setAdjustAmount(''); setAdjustNote('');
      import('react-hot-toast').then(({ default: toast }) =>
        toast.success(`${amt >= 0 ? '+' : ''}${amt.toLocaleString('vi-VN')}đ cho ${selectedUser.email}`)
      );
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally { setAdjusting(false); }
  };

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const TS = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý Người dùng</h1>
          <p className="admin-page-sub">{users.length} tài khoản đã đăng ký</p>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <input className="form-input" placeholder="Tìm theo email hoặc tên..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
      </div>

      {selectedUser && (
        <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ marginBottom: 8, color: 'var(--accent)' }}>👤 {selectedUser.displayName || selectedUser.email}</h3>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Email: {selectedUser.email}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Số dư: <strong style={{ color: 'var(--gold)' }}>{(selectedUser.balance || 0).toLocaleString('vi-VN')}đ</strong>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Role: <span className={`badge ${selectedUser.role === 'admin' ? 'badge-danger' : 'badge-success'}`}>{selectedUser.role || 'user'}</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>✕</button>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>💰 Điều chỉnh số dư (admin)</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="number" className="form-input" placeholder="VD: 50000 hoặc -50000"
                value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                style={{ width: 200 }} />
              <input className="form-input" placeholder="Lý do (tuỳ chọn)"
                value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
                style={{ width: 220 }} />
              <button className="btn btn-primary btn-sm" onClick={handleAdjustBalance} disabled={adjusting || !adjustAmount}>
                {adjusting ? '...' : 'Áp dụng'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Nhập số âm để trừ tiền. Thay đổi được thực hiện atomic.</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Người dùng</th><th>Email</th><th>Số dư</th><th>Role</th><th>Ngày đăng ký</th><th>Thao tác</th></tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedUser(u)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#000', flexShrink: 0 }}>
                          {u.avatar ? <img src={u.avatar} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" /> : (u.displayName?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.displayName || '—'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td style={{ fontWeight: 600, color: 'var(--gold)' }}>{(u.balance || 0).toLocaleString('vi-VN')}đ</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-success'}`}>{u.role || 'user'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || '—'}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelectedUser(u); }}>Quản lý</button></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
const AdminSettingsPage = () => {
  const [settings, setSettings] = React.useState({ siteName: 'GameStore VN', supportEmail: 'support@gamestore.vn', maintenanceMode: false, maxCartItems: 20, minTopupAmount: 10000, maxTopupAmount: 50000000 });
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('firebase/firestore').then(({ doc, getDoc }) =>
      import('./firebase/config').then(({ db }) =>
        getDoc(doc(db, 'settings', 'global')).then(snap => {
          if (snap.exists()) setSettings(s => ({ ...s, ...snap.data() }));
        }).catch(console.error).finally(() => setLoading(false))
      )
    );
  }, []);

  const handleSave = async () => {
    try {
      await import('firebase/firestore').then(({ doc, setDoc }) =>
        import('./firebase/config').then(({ db }) =>
          setDoc(doc(db, 'settings', 'global'), settings, { merge: true })
        )
      );
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert('Lỗi lưu settings: ' + e.message); }
  };

  const Row = ({ label, desc, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div><div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>{desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}</div>
      <div>{children}</div>
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">⚙️ Cài đặt hệ thống</h1>
        <button className="btn btn-primary" onClick={handleSave}>{saved ? '✅ Đã lưu!' : '💾 Lưu thay đổi'}</button>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>🏪 Thông tin cửa hàng</h3>
        <Row label="Tên cửa hàng" desc="Hiển thị trong footer và tiêu đề">
          <input className="form-input" value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} style={{ width: 250 }} />
        </Row>
        <Row label="Email hỗ trợ" desc="Hiển thị trong trang Support">
          <input className="form-input" value={settings.supportEmail} onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))} style={{ width: 250 }} />
        </Row>
        <Row label="Chế độ bảo trì" desc="Tạm thời đóng cửa hàng cho user">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings(s => ({ ...s, maintenanceMode: e.target.checked }))} />
            <span style={{ fontSize: 13, color: settings.maintenanceMode ? 'var(--danger)' : 'var(--success)' }}>
              {settings.maintenanceMode ? '🔴 Đang bảo trì' : '🟢 Hoạt động bình thường'}
            </span>
          </label>
        </Row>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>💰 Giới hạn giao dịch</h3>
        <Row label="Giỏ hàng tối đa" desc="Số lượng sản phẩm tối đa trong 1 đơn">
          <input type="number" className="form-input" value={settings.maxCartItems} onChange={e => setSettings(s => ({ ...s, maxCartItems: Number(e.target.value) }))} style={{ width: 120 }} min="1" max="100" />
        </Row>
        <Row label="Nạp tiền tối thiểu" desc="Số tiền tối thiểu mỗi lần nạp">
          <input type="number" className="form-input" value={settings.minTopupAmount} onChange={e => setSettings(s => ({ ...s, minTopupAmount: Number(e.target.value) }))} style={{ width: 180 }} />
        </Row>
        <Row label="Nạp tiền tối đa" desc="Số tiền tối đa mỗi lần nạp">
          <input type="number" className="form-input" value={settings.maxTopupAmount} onChange={e => setSettings(s => ({ ...s, maxTopupAmount: Number(e.target.value) }))} style={{ width: 180 }} />
        </Row>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16, color: 'var(--accent)' }}>📊 Thông tin hệ thống</h3>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
          <div>🔧 Stack: React 18 + Firebase Firestore + Cloudinary</div>
          <div>🚀 Deploy: Vercel (Frontend) + Render (Backend)</div>
          <div>💳 Payment: BIDV via SePay webhook</div>
          <div>⚡ Version: 2.0.0-stable</div>
        </div>
      </div>
    </div>
  );
};

const UserOrdersPage = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState(null);
  const [search, setSearch] = React.useState('');

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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', flexWrap:'wrap', gap:12 }}>
          <h1 className="section-title" style={{ margin:0 }}>📦 Đơn hàng của tôi</h1>
          {orders.length > 0 && (
            <input className="form-input" placeholder="Tìm theo tên game, mã đơn..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 260 }} />
          )}
        </div>
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
            {orders.filter(order => {
              if (!search) return true;
              const q = search.toLowerCase();
              return order.id.toLowerCase().includes(q) ||
                (order.items || []).some(i => i.title?.toLowerCase().includes(q) || i.gameType?.toLowerCase().includes(q));
            }).map(order => (
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
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Username:</span><br/><strong style={{ fontFamily: 'monospace' }}>{item.loginUsername}</strong></div>
                            <button onClick={() => { navigator.clipboard.writeText(item.loginUsername); }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'2px 8px', cursor:'pointer', fontSize:11, color:'var(--text-muted)' }}>Copy</button>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Password:</span><br/><strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{item.loginPassword}</strong></div>
                            <button onClick={() => { navigator.clipboard.writeText(item.loginPassword); }} style={{ background:'none', border:'1px solid var(--border)', borderRadius:4, padding:'2px 8px', cursor:'pointer', fontSize:11, color:'var(--text-muted)' }}>Copy</button>
                          </div>
                          {item.loginEmail && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Email:</span><br/><strong style={{ fontFamily: 'monospace' }}>{item.loginEmail}</strong></div>}
                          {item.loginNote && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Ghi chú:</span><br/><span style={{ color: 'var(--text-secondary)' }}>{item.loginNote}</span></div>}
                          {item.attachmentUrl && (
                            <div style={{ gridColumn: '1/-1', marginTop: 4 }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>File đính kèm:</span><br/>
                              <a href={item.attachmentUrl} target="_blank" rel="noreferrer"
                                style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--accent)', textDecoration:'none', marginTop:4, padding:'3px 10px', border:'1px solid rgba(0,212,255,0.3)', borderRadius:5, background:'rgba(0,212,255,0.07)' }}>
                                ⬇️ {item.attachmentName || 'Tải file'}
                              </a>
                            </div>
                          )}
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
          { icon: '📧', title: 'Email', desc: <a href='mailto:support@gamestore.vn' style={{color:'var(--accent)'}}>support@gamestore.vn</a> },
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


const ProfilePage = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [editing, setEditing] = React.useState(false);
  const [displayName, setDisplayName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (userProfile) setDisplayName(userProfile.displayName || '');
  }, [userProfile]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await import('firebase/firestore').then(({ doc, updateDoc }) =>
        import('./firebase/config').then(({ db }) =>
          updateDoc(doc(db, 'users', currentUser.uid), { displayName: displayName.trim() })
        )
      );
      await fetchUserProfile(currentUser.uid);
      setEditing(false);
      import('react-hot-toast').then(({ default: toast }) => toast.success('Đã cập nhật tên hiển thị!'));
    } catch (e) {
      import('react-hot-toast').then(({ default: toast }) => toast.error('Lỗi: ' + e.message));
    } finally { setSaving(false); }
  };

  const [txHistory, setTxHistory] = React.useState([]);
  const [txLoading, setTxLoading] = React.useState(false);

  React.useEffect(() => {
    if (!currentUser) return;
    setTxLoading(true);
    Promise.all([
      import('firebase/firestore').then(({ collection, query, where, getDocs }) =>
        import('./firebase/config').then(({ db }) =>
          getDocs(query(collection(db, 'topups'), where('userId','==',currentUser.uid)))
            .then(snap => snap.docs.map(d => ({ id: d.id, type: 'topup', ...d.data() })))
            .catch(() => [])
        )
      ),
      import('firebase/firestore').then(({ collection, query, where, getDocs }) =>
        import('./firebase/config').then(({ db }) =>
          getDocs(query(collection(db, 'orders'), where('userId','==',currentUser.uid)))
            .then(snap => snap.docs.map(d => ({ id: d.id, type: 'order', ...d.data() })))
            .catch(() => [])
        )
      )
    ]).then(([topups, orders]) => {
      const all = [...topups, ...orders].sort((a,b) =>
        (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)
      ).slice(0, 20);
      setTxHistory(all);
    }).finally(() => setTxLoading(false));
  }, [currentUser]);

  if (!userProfile) return <div style={{ textAlign:'center', padding:80 }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;

  const avatar = userProfile.avatar;
  const initials = (userProfile.displayName || currentUser?.email || '?')[0].toUpperCase();

  return (
    <div className="page-wrapper" style={{ padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 className="section-title" style={{ marginBottom: 32 }}>👤 Hồ sơ của tôi</h1>

        {/* Avatar + Info */}
        <div className="card" style={{ padding: 32, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#000', flexShrink: 0, overflow: 'hidden' }}>
              {avatar ? <img src={avatar} style={{ width: 80, height: 80, objectFit: 'cover' }} alt="" /> : initials}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Rajdhani' }}>{userProfile.displayName || 'Người dùng'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{currentUser?.email}</div>
              <span className={`badge ${userProfile.role === 'admin' ? 'badge-danger' : 'badge-success'}`} style={{ marginTop: 8, display: 'inline-block' }}>
                {userProfile.role === 'admin' ? '⚡ Admin' : '👤 Thành viên'}
              </span>
            </div>
          </div>

          {/* Tên hiển thị */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tên hiển thị</div>
            {editing ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ flex: 1 }} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Lưu'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setDisplayName(userProfile.displayName || ''); }}>Huỷ</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{userProfile.displayName || '—'}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Sửa</button>
              </div>
            )}
          </div>

          {/* Email - readonly */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{currentUser?.email}</div>
          </div>
        </div>

        {/* Số dư */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Số dư tài khoản</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Rajdhani', color: 'var(--gold)' }}>{(userProfile.balance || 0).toLocaleString('vi-VN')}đ</div>
            </div>
            <a href="/topup" className="btn btn-primary">+ Nạp tiền</a>
          </div>
        </div>

        {/* Quick links */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '📦', label: 'Đơn hàng của tôi', href: '/orders' },
              { icon: '🎫', label: 'Voucher của tôi', href: '/vouchers' },
              { icon: '💰', label: 'Nạp tiền', href: '/topup' },
              { icon: '🎮', label: 'Dịch vụ game', href: '/services' },
            ].map(item => (
              <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, transition: 'border-color 0.2s' }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span> {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>📊 Lịch sử giao dịch</h3>
          {txLoading ? (
            <div style={{ textAlign:'center', padding:24 }}><div className="spinner" style={{ margin:'0 auto' }} /></div>
          ) : txHistory.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--text-muted)', padding:24, fontSize:13 }}>Chưa có giao dịch nào</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {txHistory.map(tx => (
                <div key={tx.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>{tx.type === 'topup' ? '💰' : '🛒'}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>
                        {tx.type === 'topup' ? 'Nạp tiền' : `Mua ${tx.items?.length || 0} tài khoản`}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                        {tx.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, color: tx.type === 'topup' ? 'var(--success)' : 'var(--danger)', fontSize:14 }}>
                      {tx.type === 'topup' ? '+' : '-'}{(tx.type === 'topup' ? tx.amount : tx.total)?.toLocaleString('vi-VN')}đ
                    </div>
                    {tx.type === 'topup' && (
                      <span className={`badge ${tx.status === 'approved' ? 'badge-success' : tx.status === 'pending' ? 'badge-orange' : 'badge-danger'}`} style={{ fontSize:10 }}>
                        {tx.status === 'approved' ? 'Thành công' : tx.status === 'pending' ? 'Chờ xử lý' : 'Từ chối'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/terms" element={<SupportPage />} />
      <Route path="/privacy" element={<SupportPage />} />
    </Routes>
    <Footer />
  </>
);

const AppContent = () => {
  useServerWakeup(); // ✅ Ping server ngay khi app load → tránh delay 50s

  // ✅ FIX: Persist cart trong sessionStorage (tránh mất giỏ hàng khi F5)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('gs_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const setCartPersist = (updater) => {
    setCart(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem('gs_cart', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ✅ FIX T2-02: Validate cart items against Firestore on startup
  React.useEffect(() => {
    if (cart.length === 0) return;
    import('firebase/firestore').then(({ doc, getDoc }) => {
      import('./firebase/config').then(async ({ db }) => {
        const results = await Promise.allSettled(cart.map(item => getDoc(doc(db, 'accounts', item.id))));
        let changed = false;
        const validCart = cart.filter((item, i) => {
          const r = results[i];
          if (r.status === 'fulfilled' && r.value.exists() && r.value.data().status === 'available') return true;
          changed = true; return false;
        });
        if (changed) {
          setCartPersist(validCart);
          import('react-hot-toast').then(({ default: toast }) =>
            toast('Một số sản phẩm trong giỏ đã được bán và đã bị xoá.', { icon: '⚠️', duration: 4000 })
          );
        }
      });
    });
  }, []); // chỉ chạy 1 lần khi app khởi động

  const addToCart = (account) =>
    setCartPersist(prev => {
      if (prev.find(i => i.id === account.id)) return prev;
      if (prev.length >= 20) {
        // toast via window event since we're outside JSX
        import('react-hot-toast').then(({ default: toast }) => toast.error('Giỏ hàng tối đa 20 sản phẩm!'));
        return prev;
      }
      return [...prev, account];
    });

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

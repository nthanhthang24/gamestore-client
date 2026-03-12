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
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
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
import AdminFlashSales from './pages/admin/AdminFlashSales';
import AdminBulkImport from './pages/admin/AdminBulkImport';
import AdminRatings from './pages/admin/AdminRatings';
import WishlistPage from './pages/user/WishlistPage';
import ReferralPage from './pages/user/ReferralPage';
import AdminTickets from './pages/admin/AdminTickets';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminNotifications from './pages/admin/AdminNotifications';
import OrderDetailPage from './pages/user/OrderDetailPage';
import NotificationsPage from './pages/user/NotificationsPage';
import { useWishlist } from './hooks/useWishlist';
import { useSEO } from './hooks/useSEO';
import { logAudit } from './utils/auditLog';
import './index.css';

// ── 404 Page ─────────────────────────────────────────────────
const NotFoundPage = () => {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'60vh', textAlign:'center', gap:16 }}>
      <div style={{ fontSize:80 }}>🎮</div>
      <h1 style={{ fontFamily:'Rajdhani', fontSize:40, fontWeight:700, color:'var(--accent)' }}>404</h1>
      <p style={{ color:'var(--text-muted)', fontSize:16 }}>Trang bạn tìm không tồn tại</p>
      <a href="/" className="btn btn-primary">Về trang chủ</a>
    </div>
  );
};

// ── Error Boundary ────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:'60vh', textAlign:'center', gap:16, padding:20 }}>
        <div style={{ fontSize:60 }}>⚠️</div>
        <h2 style={{ fontFamily:'Rajdhani', color:'var(--danger)' }}>Có lỗi xảy ra</h2>
        <p style={{ color:'var(--text-muted)', fontSize:13, maxWidth:400 }}>
          {this.state.error?.message || 'Lỗi không xác định'}
        </p>
        <button className="btn btn-primary" onClick={() => window.location.href='/'}>Tải lại trang</button>
      </div>
    );
    return this.props.children;
  }
}

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
    setLoading(true);
    let unsub;
    import('firebase/firestore').then(({ collection, query, orderBy, onSnapshot, getDocs }) => {
      import('./firebase/config').then(({ db }) => {
        try {
          unsub = onSnapshot(
            query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
            (snap) => { setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
            () => getDocs(collection(db,'orders'))
              .then(snap => setOrders(snap.docs.map(d=>({id:d.id,...d.data()}))
                .sort((a,b)=>(b.createdAt?.toDate?.()??0)-(a.createdAt?.toDate?.()??0))))
              .finally(() => setLoading(false))
          );
        } catch { setLoading(false); }
      });
    });
    return () => unsub?.();
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
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportOrdersCSV(filtered)} style={{ display:'flex', alignItems:'center', gap:6 }}>📊 Xuất CSV</button>
        </div>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Credentials block — chỉ hiện khi có loginUsername */}
                        {item.loginUsername && (
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
                          </div>
                        )}
                        {/* Attachment download */}
                        {(item.attachmentContent || item.attachmentUrl) && (
                          <div style={{ background: 'rgba(46,213,115,0.07)', border: '1px solid rgba(46,213,115,0.25)', borderRadius: 6, padding: '10px 14px' }}>
                            <div style={{ fontSize: 11, color: '#2ed573', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>📎 File thông tin tài khoản</div>
                            {item.attachmentContent ? (
                              <button onClick={() => { const b=new Blob([item.attachmentContent],{type:'text/plain;charset=utf-8'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=item.attachmentName||'thongtin.txt'; a.click(); URL.revokeObjectURL(u); }}
                                style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, color:'#fff', cursor:'pointer', padding:'8px 16px', borderRadius:6, background:'rgba(46,213,115,0.2)', border:'1px solid rgba(46,213,115,0.4)', fontWeight:600 }}>
                                ⬇️ Tải file: {item.attachmentName || 'thongtin.txt'}
                              </button>
                            ) : (
                              <a href={item.attachmentUrl} target="_blank" rel="noreferrer"
                                style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, color:'#fff', textDecoration:'none', padding:'8px 16px', borderRadius:6, background:'rgba(46,213,115,0.2)', border:'1px solid rgba(46,213,115,0.4)', fontWeight:600 }}>
                                ⬇️ Tải file: {item.attachmentName || 'thongtin.txt'}
                              </a>
                            )}
                          </div>
                        )}
                        {/* Fallback khi không có cả hai */}
                        {!item.loginUsername && !item.attachmentContent && !item.attachmentUrl && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                            Thông tin đăng nhập sẽ được admin liên hệ qua email.
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
    setLoading(true);
    let unsub;
    import('firebase/firestore').then(({ collection, query, orderBy, onSnapshot, getDocs }) => {
      import('./firebase/config').then(({ db }) => {
        try {
          unsub = onSnapshot(
            query(collection(db, 'users'), orderBy('createdAt', 'desc')),
            (snap) => { setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
            () => getDocs(collection(db,'users'))
              .then(snap => setUsers(snap.docs.map(d=>({id:d.id,...d.data()}))))
              .finally(() => setLoading(false))
          );
        } catch { setLoading(false); }
      });
    });
    return () => unsub?.();
  }, []);

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) return;
    const amt = parseInt(adjustAmount);
    if (isNaN(amt)) { import('react-hot-toast').then(({default:t})=>t.error('Số tiền không hợp lệ')); return; }
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
      import('./utils/auditLog').then(({ logAudit }) =>
        logAudit('balance_adjust',{ targetUserId:selectedUser.id, targetEmail:selectedUser.email, amount:amt, note:adjustNote })
      );
      import('react-hot-toast').then(({ default: toast }) =>
        toast.success(`${amt >= 0 ? '+' : ''}${amt.toLocaleString('vi-VN')}đ cho ${selectedUser.email}`)
      );
    } catch (e) {
      import('react-hot-toast').then(({default:t})=>t.error('Lỗi: '+e.message));
    } finally { setAdjusting(false); }
  };

  const handleBanUser = async (u, ban) => {
    // Inline confirm via toast-style notification (admin-only, acceptable)
    try {
      await import('firebase/firestore').then(({ doc, updateDoc, serverTimestamp }) =>
        import('./firebase/config').then(({ db }) =>
          updateDoc(doc(db,'users',u.id), { banned: ban, bannedAt: ban ? serverTimestamp() : null })
        )
      );
      await import('./utils/auditLog').then(({ logAudit }) =>
        logAudit(ban?'user_ban':'user_unban',{ targetUserId:u.id, targetEmail:u.email })
      );
      setUsers(us => us.map(x => x.id===u.id ? {...x, banned:ban} : x));
      if (selectedUser?.id===u.id) setSelectedUser(p=>({...p,banned:ban}));
      import('react-hot-toast').then(({ default: toast }) =>
        toast.success(`${ban?'Đã khoá':'Đã mở khoá'} ${u.email}`)
      );
    } catch(e) { import('react-hot-toast').then(({default:t})=>t.error('Lỗi: '+e.message)); }
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
          <p className="admin-page-sub">{users.length} tài khoản đã đăng ký · 🔴 Realtime</p>
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
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-success'}`}>{u.role || 'user'}</span>
                      {u.banned && <span className="badge" style={{background:'var(--danger)',marginLeft:4,fontSize:9}}>BAN</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || '—'}</td>
                    <td style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelectedUser(u); }}>Quản lý</button>
                      <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();handleBanUser(u,!u.banned);}}
                        style={{color:u.banned?'var(--success)':'var(--danger)',fontSize:11}}>
                        {u.banned?'Mở khoá':'Khoá'}
                      </button>
                    </td>
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
  const [settings, setSettings] = React.useState({ siteName: 'GameStore VN', supportEmail: 'support@gamestore.vn', maintenanceMode: false, maxCartItems: 20, minTopupAmount: 10000, maxTopupAmount: 50000000, referralCommissionPct: 2, referralMinTopup: 50000, referralNewUserBonus: 10000 });
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
      const { doc, setDoc, addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./firebase/config');
      await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
      // FIX T-04: audit log mỗi khi admin đổi settings (bao gồm theme)
      try {
        await addDoc(collection(db, 'auditLogs'), {
          action:    'settings_updated',
          data:      JSON.stringify(settings).slice(0, 500), // cap 500 chars
          createdAt: serverTimestamp(),
        });
      } catch (_) {} // audit log failure không block save
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { import('react-hot-toast').then(({default:t})=>t.error('Lỗi lưu settings: '+e.message)); }
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

      {/* ── Hoa hồng Giới thiệu ─────────────────────────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>🎁 Cấu hình Giới thiệu bạn bè</h3>
        <Row label="Hoa hồng người giới thiệu (%)" desc="% tiền nạp lần đầu trả cho người giới thiệu (ví dụ: 2 = 2%)">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="number" className="form-input" style={{ width:100 }}
              value={settings.referralCommissionPct ?? 2}
              onChange={e => setSettings(s => ({ ...s, referralCommissionPct: Math.min(50, Math.max(0, Number(e.target.value))) }))}
              min="0" max="50" step="0.5" />
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>%</span>
          </div>
        </Row>
        <Row label="Nạp tối thiểu để kích hoạt hoa hồng" desc="Lần nạp đầu phải ≥ mức này mới tính hoa hồng">
          <input type="number" className="form-input" style={{ width:160 }}
            value={settings.referralMinTopup ?? 50000}
            onChange={e => setSettings(s => ({ ...s, referralMinTopup: Math.max(0, Number(e.target.value)) }))}
            min="0" step="1000" />
        </Row>
        <Row label="Thưởng cho người được giới thiệu" desc="Người mới nhận thêm khi đăng ký qua link">
          <input type="number" className="form-input" style={{ width:160 }}
            value={settings.referralNewUserBonus ?? 10000}
            onChange={e => setSettings(s => ({ ...s, referralNewUserBonus: Math.max(0, Number(e.target.value)) }))}
            min="0" step="1000" />
        </Row>
        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:'var(--accent-dim)', fontSize:12, color:'var(--text-secondary)' }}>
          💡 Ví dụ: bạn bè nạp <strong>200.000đ</strong> lần đầu → người giới thiệu nhận{' '}
          <strong style={{ color:'var(--gold)' }}>
            {Math.round((settings.referralCommissionPct ?? 2) / 100 * 200000).toLocaleString('vi-VN')}đ
          </strong> (= {settings.referralCommissionPct ?? 2}%)
        </div>
      </div>

      {/* ── Theme & Màu sắc ─────────────────────────────────── */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>🎨 Theme & Màu sắc</h3>

        {/* Accent color */}
        <Row label="Màu chủ đạo (Accent)" desc="Màu nổi bật chính — nút, link, border focus">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="color"
              value={settings.themeAccent || '#00d4ff'}
              onChange={e => setSettings(s => ({ ...s, themeAccent: e.target.value }))}
              style={{ width:44, height:36, border:'none', borderRadius:8, cursor:'pointer', background:'none', padding:2 }}
            />
            <input className="form-input" style={{ width:100, fontFamily:'monospace', fontSize:13 }}
              value={settings.themeAccent || '#00d4ff'}
              onChange={e => setSettings(s => ({ ...s, themeAccent: e.target.value }))}
              maxLength={7}
            />
          </div>
        </Row>

        {/* Accent2 color */}
        <Row label="Màu phụ (Accent 2)" desc="Màu nút thứ cấp, tag cam">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="color"
              value={settings.themeAccent2 || '#ff6b35'}
              onChange={e => setSettings(s => ({ ...s, themeAccent2: e.target.value }))}
              style={{ width:44, height:36, border:'none', borderRadius:8, cursor:'pointer', background:'none', padding:2 }}
            />
            <input className="form-input" style={{ width:100, fontFamily:'monospace', fontSize:13 }}
              value={settings.themeAccent2 || '#ff6b35'}
              onChange={e => setSettings(s => ({ ...s, themeAccent2: e.target.value }))}
              maxLength={7}
            />
          </div>
        </Row>

        {/* Background primary */}
        <Row label="Nền chính" desc="Màu nền toàn trang">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="color"
              value={settings.themeBgPrimary || '#0a0e1a'}
              onChange={e => setSettings(s => ({ ...s, themeBgPrimary: e.target.value }))}
              style={{ width:44, height:36, border:'none', borderRadius:8, cursor:'pointer', background:'none', padding:2 }}
            />
            <input className="form-input" style={{ width:100, fontFamily:'monospace', fontSize:13 }}
              value={settings.themeBgPrimary || '#0a0e1a'}
              onChange={e => setSettings(s => ({ ...s, themeBgPrimary: e.target.value }))}
              maxLength={7}
            />
          </div>
        </Row>

        {/* Card background */}
        <Row label="Nền card / modal" desc="Màu nền của các thẻ, popup, form">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="color"
              value={settings.themeBgCard || '#131929'}
              onChange={e => setSettings(s => ({ ...s, themeBgCard: e.target.value }))}
              style={{ width:44, height:36, border:'none', borderRadius:8, cursor:'pointer', background:'none', padding:2 }}
            />
            <input className="form-input" style={{ width:100, fontFamily:'monospace', fontSize:13 }}
              value={settings.themeBgCard || '#131929'}
              onChange={e => setSettings(s => ({ ...s, themeBgCard: e.target.value }))}
              maxLength={7}
            />
          </div>
        </Row>

        {/* Gold / Price color */}
        <Row label="Màu giá / vàng" desc="Màu hiển thị giá tiền, số dư">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <input type="color"
              value={settings.themeGold || '#ffd700'}
              onChange={e => setSettings(s => ({ ...s, themeGold: e.target.value }))}
              style={{ width:44, height:36, border:'none', borderRadius:8, cursor:'pointer', background:'none', padding:2 }}
            />
            <input className="form-input" style={{ width:100, fontFamily:'monospace', fontSize:13 }}
              value={settings.themeGold || '#ffd700'}
              onChange={e => setSettings(s => ({ ...s, themeGold: e.target.value }))}
              maxLength={7}
            />
          </div>
        </Row>

        {/* Preset themes */}
        <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
              🎭 Preset Theme
            </div>
            <button
              onClick={() => setSettings(s => ({
                ...s,
                themeAccent:    '#00d4ff',
                themeAccent2:   '#ff6b35',
                themeBgPrimary: '#0a0e1a',
                themeBgCard:    '#131929',
                themeGold:      '#ffd700',
              }))}
              style={{
                padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600,
                border:'1px solid var(--border)', background:'transparent',
                color:'var(--text-muted)', transition:'all .2s', display:'flex', alignItems:'center', gap:6,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--danger)'; e.currentTarget.style.color='var(--danger)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; }}
            >
              ↺ Reset về mặc định
            </button>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { name:'🌊 Cyber Blue', accent:'#00d4ff', accent2:'#ff6b35', bg:'#0a0e1a', card:'#131929', gold:'#ffd700' },
              { name:'💜 Neon Purple', accent:'#a855f7', accent2:'#ec4899', bg:'#0d0a1a', card:'#16102a', gold:'#ffd700' },
              { name:'🟢 Matrix Green', accent:'#00ff88', accent2:'#00cc6a', bg:'#060f0a', card:'#0d1a12', gold:'#88ff00' },
              { name:'🔴 Crimson Dark', accent:'#ff4757', accent2:'#ff6b35', bg:'#0f0a0a', card:'#1a1010', gold:'#ffd700' },
              { name:'☀️ Light Mode', accent:'#2563eb', accent2:'#f59e0b', bg:'#f8fafc', card:'#ffffff', gold:'#d97706' },
            ].map(preset => {
              // ✅ FIX: highlight the active preset
              const isActive =
                (settings.themeAccent    || '#00d4ff').toLowerCase() === preset.accent.toLowerCase() &&
                (settings.themeAccent2   || '#ff6b35').toLowerCase() === preset.accent2.toLowerCase() &&
                (settings.themeBgPrimary || '#0a0e1a').toLowerCase() === preset.bg.toLowerCase();
              return (
                <button key={preset.name}
                  onClick={() => setSettings(s => ({
                    ...s,
                    themeAccent:    preset.accent,
                    themeAccent2:   preset.accent2,
                    themeBgPrimary: preset.bg,
                    themeBgCard:    preset.card,
                    themeGold:      preset.gold,
                  }))}
                  style={{
                    padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
                    border: isActive ? `2px solid ${preset.accent}` : '1px solid var(--border)',
                    background: isActive ? `${preset.accent}22` : 'var(--bg-card)',
                    color: isActive ? preset.accent : 'var(--text-primary)',
                    transition:'all .2s',
                    boxShadow: isActive ? `0 0 10px ${preset.accent}44` : 'none',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <span style={{
                      position:'absolute', top:-6, right:-6, width:14, height:14,
                      background: preset.accent, borderRadius:'50%',
                      fontSize:9, display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#000', fontWeight:900,
                    }}>✓</span>
                  )}
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ FIX 2: Live theme preview */}
        <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--border)' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
            👁 Xem trước
          </div>
          <div style={{
            borderRadius:12, overflow:'hidden', border:'1px solid var(--border)',
            background: settings.themeBgPrimary || '#0a0e1a',
          }}>
            {/* Mini navbar preview */}
            <div style={{ padding:'10px 16px', background: settings.themeBgCard || '#131929',
              borderBottom:`1px solid ${(settings.themeAccent||'#00d4ff')}33`,
              display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontFamily:'Rajdhani', fontWeight:800, fontSize:14,
                color: settings.themeAccent || '#00d4ff' }}>GAME<span style={{color:'#fff'}}>STORE</span></span>
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                {['Shop','Cart','Profile'].map(l => (
                  <span key={l} style={{ fontSize:11, color:'rgba(255,255,255,0.6)', cursor:'default' }}>{l}</span>
                ))}
              </div>
            </div>
            {/* Mini card preview */}
            <div style={{ padding:16, display:'flex', gap:12 }}>
              {[1,2].map(i => (
                <div key={i} style={{ flex:1, borderRadius:8, padding:12,
                  background: settings.themeBgCard || '#131929',
                  border:`1px solid ${(settings.themeAccent||'#00d4ff')}33` }}>
                  <div style={{ width:'100%', height:50, borderRadius:6, marginBottom:10,
                    background:`linear-gradient(135deg, ${(settings.themeAccent||'#00d4ff')}33, ${(settings.themeAccent2||'#ff6b35')}22)` }} />
                  <div style={{ height:8, borderRadius:4, background:'rgba(255,255,255,0.1)', marginBottom:6 }} />
                  <div style={{ height:6, borderRadius:4, background:'rgba(255,255,255,0.06)', marginBottom:10, width:'70%' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color: settings.themeGold||'#ffd700' }}>
                      500,000đ
                    </span>
                    <div style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:700,
                      background: settings.themeAccent||'#00d4ff', color:'#000' }}>Mua</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop:16, padding:'12px 16px', borderRadius:8, background:'var(--accent-dim)', border:'1px solid rgba(0,212,255,0.2)', fontSize:12, color:'var(--text-secondary)' }}>
          💡 Theme áp dụng ngay khi nhấn <strong>Lưu thay đổi</strong> — tất cả user sẽ thấy màu mới khi reload trang.
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
    let unsub;
    import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
      import('./firebase/config').then(({ db }) => {
        unsub = onSnapshot(
          query(collection(db, 'orders'), where('userId', '==', currentUser.uid)),
          (snap) => {
            const data = snap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => {
                const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                return tb - ta;
              });
            setOrders(data);
            setLoading(false);
          },
          (err) => { console.error(err); setFetchError(err.message); setLoading(false); }
        );
      });
    });
    return () => unsub?.();
  }, [currentUser]);

  return (
    <div className="page-wrapper" style={{ padding: '30px 0 60px' }}>
      <div className="container">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', flexWrap:'wrap', gap:12 }}>
          <h1 className="section-title" style={{ margin:0 }}>📦 Đơn hàng của tôi</h1>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            {orders.length > 0 && (
              <input className="form-input" placeholder="Tìm theo tên game, mã đơn..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 220 }} />
            )}
            {orders.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const rows = [['Mã đơn','Ngày','Sản phẩm','Tổng']];
                orders.forEach(o => rows.push([
                  o.id.slice(-8).toUpperCase(),
                  o.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')||'',
                  (o.items||[]).map(i=>i.title).join('; '),
                  o.total?.toLocaleString('vi-VN')+'đ'
                ]));
                const csv = rows.map(r=>r.map(c=>(`"${String(c).replace(/"/g,'""')}"`)).join(',')).join('\n');
                const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href=url; a.download='don-hang-cua-toi.csv'; a.click();
                URL.revokeObjectURL(url);
              }} style={{display:'flex',alignItems:'center',gap:6}}>
                ⬇ Export CSV
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" /></div>
        ) : fetchError ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--danger)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h3>Không thể tải đơn hàng</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>{fetchError}</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => { setLoading(true); setFetchError(null); }}>Thử lại</button>
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
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className="badge badge-success">✅ Hoàn thành</span>
                    <Link to={`/orders/${order.id}`} style={{fontSize:12,color:'var(--accent)',textDecoration:'none'}}>Chi tiết →</Link>
                  </div>
                </div>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: item.loginUsername ? '8px' : 0 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.title} <span className="badge badge-accent" style={{ fontSize: '11px' }}>{item.gameType}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{item.price?.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {/* ✅ Thông tin đăng nhập — chỉ hiện khi có loginUsername */}
                    {item.loginUsername && (
                      <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '13px', marginTop: 6 }}>
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
                        </div>
                      </div>
                    )}
                    {/* ✅ Attachment download */}
                    {(item.attachmentContent || item.attachmentUrl) && (
                      <div style={{ background: 'rgba(46,213,115,0.07)', border: '1px solid rgba(46,213,115,0.25)', borderRadius: 8, padding: '10px 14px', marginTop: 6 }}>
                        <div style={{ fontSize: '11px', color: '#2ed573', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                          📎 File thông tin tài khoản
                        </div>
                        {item.attachmentContent ? (
                          <button onClick={() => { const b=new Blob([item.attachmentContent],{type:'text/plain;charset=utf-8'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=item.attachmentName||'thongtin.txt'; a.click(); URL.revokeObjectURL(u); }}
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#fff', cursor:'pointer', padding:'7px 16px', border:'1px solid rgba(46,213,115,0.4)', borderRadius:6, background:'rgba(46,213,115,0.2)', fontWeight:600 }}>
                            ⬇️ Tải file: {item.attachmentName || 'thongtin.txt'}
                          </button>
                        ) : (
                          <a href={item.attachmentUrl} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#fff', textDecoration:'none', padding:'7px 16px', border:'1px solid rgba(46,213,115,0.4)', borderRadius:6, background:'rgba(46,213,115,0.2)', fontWeight:600 }}>
                            ⬇️ Tải file: {item.attachmentName || 'thongtin.txt'}
                          </a>
                        )}
                      </div>
                    )}
                    {/* Fallback */}
                    {!item.loginUsername && !item.attachmentContent && !item.attachmentUrl && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 6 }}>
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

const SupportPage = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = React.useState({ type: 'warranty', orderId: '', description: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [myTickets, setMyTickets] = React.useState([]);
  const [ticketsLoading, setTicketsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentUser) return;
    setTicketsLoading(true);
    let unsub;
    import('firebase/firestore').then(({ collection, query, where, orderBy, onSnapshot }) =>
      import('./firebase/config').then(({ db }) => {
        unsub = onSnapshot(
          query(collection(db,'tickets'), where('userId','==',currentUser.uid), orderBy('createdAt','desc')),
          (snap) => { setMyTickets(snap.docs.map(d=>({id:d.id,...d.data()}))); setTicketsLoading(false); },
          () => setTicketsLoading(false)
        );
      })
    );
    return () => unsub?.();
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!currentUser) { navigate('/login'); return; }
    if (!form.description.trim()) {
      import('react-hot-toast').then(({default:t}) => t.error('Mô tả vấn đề không được để trống'));
      return;
    }
    setSubmitting(true);
    try {
      await import('firebase/firestore').then(({ collection, addDoc, serverTimestamp }) =>
        import('./firebase/config').then(({ db }) =>
          addDoc(collection(db, 'tickets'), {
            userId:      currentUser.uid,
            userEmail:   currentUser.email,
            userName:    userProfile?.displayName || currentUser.email,
            type:        form.type,
            orderId:     form.orderId.trim() || null,
            description: form.description.trim(),
            status:      'open',
            adminReply:  null,
            createdAt:   serverTimestamp(),
          })
        )
      );
      import('react-hot-toast').then(({default:t}) => t.success('✅ Đã gửi ticket! Chúng tôi sẽ phản hồi sớm.'));
      setForm({ type: 'warranty', orderId: '', description: '' });
    } catch(e) {
      import('react-hot-toast').then(({default:t}) => t.error('Lỗi: ' + e.message));
    } finally { setSubmitting(false); }
  };

  const TICKET_TYPES = [
    { value: 'warranty', label: '🛡️ Bảo hành tài khoản' },
    { value: 'refund',   label: '💰 Hoàn tiền' },
    { value: 'account',  label: '🔑 Vấn đề tài khoản' },
    { value: 'payment',  label: '💳 Vấn đề thanh toán' },
    { value: 'other',    label: '💬 Khác' },
  ];

  const STATUS_COLORS = { open:'var(--gold)', in_progress:'var(--accent)', resolved:'var(--success)', rejected:'var(--danger)' };
  const STATUS_LABELS = { open:'Đang chờ', in_progress:'Đang xử lý', resolved:'Đã giải quyết', rejected:'Từ chối' };

  return (
    <div className="page-wrapper" style={{ padding: '30px 0 80px' }}>
      <div className="container">
        <h1 className="section-title" style={{ marginBottom: '8px' }}>Hỗ trợ khách hàng</h1>
        <p style={{ color:'var(--text-muted)', marginBottom: 28, fontSize:14 }}>
          Gửi ticket và chúng tôi sẽ phản hồi trong vòng 24 giờ.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
          {[
            { icon: '📧', title: 'Email', desc: 'support@gamestore.vn' },
            { icon: '📱', title: 'Zalo', desc: 'Nhắn qua Zalo OA' },
            { icon: '🕐', title: 'Phản hồi', desc: 'Trong vòng 24 giờ' },
          ].map((item, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Ticket form */}
        <div className="card" style={{ padding: 28, marginBottom: 32 }}>
          <h3 style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
            🎫 Tạo ticket hỗ trợ
          </h3>
          {!currentUser ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <p>Đăng nhập để gửi ticket hỗ trợ</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/login')}>Đăng nhập</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Loại vấn đề</label>
                <select className="form-input" value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {TICKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Mã đơn hàng <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(nếu có)</span></label>
                <input className="form-input" placeholder="Ví dụ: ABC12345"
                  value={form.orderId} onChange={e => setForm(p => ({ ...p, orderId: e.target.value }))}/>
              </div>
              <div>
                <label className="form-label">Mô tả vấn đề <span style={{ color:'var(--danger)' }}>*</span></label>
                <textarea className="form-textarea" rows="5"
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}/>
              </div>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
                style={{ alignSelf: 'flex-start', minWidth: 160 }}>
                {submitting ? 'Đang gửi...' : '📤 Gửi ticket'}
              </button>
            </div>
          )}
        </div>

        {/* My tickets */}
        {currentUser && (
          <div>
            <h3 style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              📋 Ticket của tôi
            </h3>
            {ticketsLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}/></div>
            ) : myTickets.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Bạn chưa có ticket nào
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myTickets.map(t => (
                  <div key={t.id} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: t.adminReply ? 12 : 0 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                          #{t.id.slice(-8).toUpperCase()} · {TICKET_TYPES.find(x=>x.value===t.type)?.label || t.type}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {t.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')} · {t.description?.slice(0,80)}{t.description?.length>80?'...':''}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: `${STATUS_COLORS[t.status]}22`, color: STATUS_COLORS[t.status], border: `1px solid ${STATUS_COLORS[t.status]}44` }}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </div>
                    {t.adminReply && (
                      <div style={{ padding: '10px 14px', background: 'rgba(0,212,255,0.06)', borderRadius: 8, fontSize: 13, borderLeft: '3px solid var(--accent)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>💬 Phản hồi từ Admin:</div>
                        {t.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


const TermsPage = () => (
  <div className="page-wrapper" style={{padding:'40px 0 80px'}}>
    <div className="container" style={{maxWidth:760}}>
      <h1 style={{fontFamily:'Rajdhani',fontSize:32,fontWeight:700,marginBottom:8}}>Điều khoản sử dụng</h1>
      <p style={{color:'var(--text-muted)',marginBottom:32}}>Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
      {[
        ['1. Giới thiệu', 'GameStore VN là nền tảng mua bán tài khoản game trực tuyến. Khi sử dụng dịch vụ, bạn đồng ý tuân thủ các điều khoản dưới đây.'],
        ['2. Tài khoản người dùng', 'Bạn có trách nhiệm bảo mật thông tin đăng nhập. GameStore VN không chịu trách nhiệm về việc mất mát do lộ thông tin từ phía người dùng.'],
        ['3. Giao dịch & Thanh toán', 'Tất cả giao dịch được thực hiện qua hệ thống nạp điểm. Mỗi giao dịch mua hàng là không hoàn tác sau khi thông tin tài khoản đã được giao. Bảo hành 24h sau mua trong trường hợp tài khoản lỗi do lỗi của người bán.'],
        ['4. Nội dung & Tài khoản game', 'Chúng tôi không đảm bảo rằng tài khoản game được mua sẽ hoạt động vĩnh viễn do phụ thuộc vào nhà phát hành game. Người mua nên đổi mật khẩu ngay sau khi nhận tài khoản.'],
        ['5. Cấm lạm dụng', 'Nghiêm cấm: gian lận, chargeback giả, tạo nhiều tài khoản để lạm dụng khuyến mãi, sử dụng dịch vụ cho mục đích bất hợp pháp.'],
        ['6. Giới hạn trách nhiệm', 'GameStore VN không chịu trách nhiệm cho bất kỳ thiệt hại gián tiếp nào phát sinh từ việc sử dụng dịch vụ.'],
        ['7. Thay đổi điều khoản', 'Chúng tôi có quyền thay đổi điều khoản bất kỳ lúc nào. Việc tiếp tục sử dụng sau khi thay đổi đồng nghĩa bạn chấp nhận điều khoản mới.'],
        ['8. Liên hệ', 'Mọi thắc mắc về điều khoản, vui lòng liên hệ qua trang Hỗ trợ hoặc email support@gamestore.vn'],
      ].map(([title, content]) => (
        <div key={title} style={{marginBottom:24}}>
          <h3 style={{fontFamily:'Rajdhani',fontSize:18,fontWeight:700,color:'var(--accent)',marginBottom:8}}>{title}</h3>
          <p style={{color:'var(--text-secondary)',lineHeight:1.8,fontSize:14}}>{content}</p>
        </div>
      ))}
    </div>
  </div>
);

const PrivacyPage = () => (
  <div className="page-wrapper" style={{padding:'40px 0 80px'}}>
    <div className="container" style={{maxWidth:760}}>
      <h1 style={{fontFamily:'Rajdhani',fontSize:32,fontWeight:700,marginBottom:8}}>Chính sách Bảo mật</h1>
      <p style={{color:'var(--text-muted)',marginBottom:32}}>Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
      {[
        ['1. Thông tin chúng tôi thu thập', 'Chúng tôi thu thập: địa chỉ email, tên hiển thị, lịch sử giao dịch, địa chỉ IP. Chúng tôi KHÔNG thu thập thông tin thẻ tín dụng (thanh toán qua ngân hàng trực tiếp).'],
        ['2. Mục đích sử dụng', 'Thông tin được dùng để: xác thực danh tính, xử lý giao dịch, gửi thông báo đơn hàng, phòng chống gian lận.'],
        ['3. Bảo vệ dữ liệu', 'Dữ liệu được lưu trữ trên Firebase (Google Cloud) với mã hóa at-rest và in-transit. Chúng tôi không bán dữ liệu cho bên thứ ba.'],
        ['4. Cookie & Tracking', 'Chúng tôi sử dụng localStorage để lưu giỏ hàng và phiên đăng nhập. Không có cookie theo dõi quảng cáo.'],
        ['5. Quyền của bạn', 'Bạn có quyền: yêu cầu xem, sửa, hoặc xóa dữ liệu của mình. Liên hệ support@gamestore.vn để thực hiện yêu cầu.'],
        ['6. Liên hệ', 'Nếu có câu hỏi về chính sách bảo mật, vui lòng liên hệ: support@gamestore.vn'],
      ].map(([title, content]) => (
        <div key={title} style={{marginBottom:24}}>
          <h3 style={{fontFamily:'Rajdhani',fontSize:18,fontWeight:700,color:'var(--accent)',marginBottom:8}}>{title}</h3>
          <p style={{color:'var(--text-secondary)',lineHeight:1.8,fontSize:14}}>{content}</p>
        </div>
      ))}
    </div>
  </div>
);

const ProfilePage = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [editing, setEditing] = React.useState(false);
  const [changingPw, setChangingPw] = React.useState(false);
  const [pwForm, setPwForm] = React.useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = React.useState(false);
  const [displayName, setDisplayName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (userProfile) setDisplayName(userProfile.displayName || '');
  }, [userProfile]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    const cleanName = displayName.trim().replace(/<[^>]*>/g, '').slice(0, 50); // strip HTML, max 50 chars
    if (!cleanName) return;
    setSaving(true);
    try {
      await import('firebase/firestore').then(({ doc, updateDoc }) =>
        import('./firebase/config').then(({ db }) =>
          updateDoc(doc(db, 'users', currentUser.uid), { displayName: cleanName })
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
    let unsubTopups, unsubOrders;
    let topupsData = [], ordersData = [];
    const merge = () => {
      const all = [...topupsData, ...ordersData]
        .sort((a,b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))
        .slice(0, 20);
      setTxHistory(all);
      setTxLoading(false);
    };
    import('firebase/firestore').then(({ collection, query, where, onSnapshot }) =>
      import('./firebase/config').then(({ db }) => {
        unsubTopups = onSnapshot(
          query(collection(db,'topups'), where('userId','==',currentUser.uid)),
          (snap) => { topupsData = snap.docs.map(d=>({id:d.id,type:'topup',...d.data()})); merge(); },
          () => setTxLoading(false)
        );
        unsubOrders = onSnapshot(
          query(collection(db,'orders'), where('userId','==',currentUser.uid)),
          (snap) => { ordersData = snap.docs.map(d=>({id:d.id,type:'order',...d.data()})); merge(); },
          () => setTxLoading(false)
        );
      })
    );
    return () => { unsubTopups?.(); unsubOrders?.(); };
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

          {/* Change Password */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đổi mật khẩu</div>
            {!changingPw ? (
              <button className="btn btn-ghost btn-sm" onClick={() => setChangingPw(true)}>🔒 Đổi mật khẩu</button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="password" className="form-input" placeholder="Mật khẩu hiện tại"
                  value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} autoComplete="current-password"/>
                <input type="password" className="form-input" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                  value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} autoComplete="new-password"/>
                <input type="password" className="form-input" placeholder="Nhập lại mật khẩu mới"
                  value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} autoComplete="new-password"/>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" disabled={pwSaving} onClick={async () => {
                    if (!pwForm.current || !pwForm.next) { import('react-hot-toast').then(({default:t})=>t.error('Điền đầy đủ thông tin')); return; }
                    if (pwForm.next !== pwForm.confirm) { import('react-hot-toast').then(({default:t})=>t.error('Mật khẩu mới không khớp')); return; }
                    if (pwForm.next.length < 6) { import('react-hot-toast').then(({default:t})=>t.error('Mật khẩu tối thiểu 6 ký tự')); return; }
                    setPwSaving(true);
                    try {
                      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
                      const { auth } = await import('./firebase/config');
                      const cred = EmailAuthProvider.credential(currentUser.email, pwForm.current);
                      await reauthenticateWithCredential(currentUser, cred);
                      await updatePassword(currentUser, pwForm.next);
                      import('react-hot-toast').then(({default:t})=>t.success('✅ Đã đổi mật khẩu thành công!'));
                      setChangingPw(false); setPwForm({ current:'', next:'', confirm:'' });
                    } catch(e) {
                      const msg = e.code === 'auth/wrong-password' ? 'Mật khẩu hiện tại không đúng' : e.message;
                      import('react-hot-toast').then(({default:t})=>t.error(msg));
                    } finally { setPwSaving(false); }
                  }}>
                    {pwSaving ? 'Đang lưu...' : 'Xác nhận đổi'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setChangingPw(false); setPwForm({ current:'', next:'', confirm:'' }); }}>Huỷ</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Số dư */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Số dư tài khoản</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Rajdhani', color: 'var(--gold)' }}>{(userProfile.balance || 0).toLocaleString('vi-VN')}đ</div>
            </div>
            <Link to="/topup" className="btn btn-primary">+ Nạp tiền</Link>
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
              <Link key={item.href} to={item.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, transition: 'border-color 0.2s' }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span> {item.label}
              </Link>
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
      <Route path="/" element={<HomePage onAddToCart={addToCart} cart={cart} />} />
      <Route path="/shop" element={<ShopPage onAddToCart={addToCart} cart={cart} />} />
      <Route path="/account/:id" element={<AccountDetailPage onAddToCart={addToCart} />} />
      <Route path="/cart" element={<CartPage cart={cart} setCart={setCart} />} />
      <Route path="/topup" element={<ProtectedRoute><TopupPage /></ProtectedRoute>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/orders" element={<ProtectedRoute><UserOrdersPage /></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
      <Route path="/vouchers" element={<ProtectedRoute><MyVouchersPage /></ProtectedRoute>} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/wishlist" element={<ProtectedRoute><WishlistPage onAddToCart={addToCart} /></ProtectedRoute>} />
      <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <Footer />
  </>
);

const AppContent = () => {
  useServerWakeup(); // ✅ Ping server ngay khi app load → tránh delay 50s
  const { userProfile: _up } = useAuth();

  // ✅ Maintenance mode + settings: đọc từ Firestore settings/global
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [maxCartItems, setMaxCartItems] = useState(100); // default; overridden by settings
  React.useEffect(() => {
    import('firebase/firestore').then(({ doc, onSnapshot }) =>
      import('./firebase/config').then(({ db }) => {
        const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setMaintenance(d.maintenanceMode || false);
            if (d.maxCartItems) setMaxCartItems(d.maxCartItems);

            // ── Apply theme CSS variables dynamically ──────────────────
            // Admin can change brand colors from settings panel — applied globally
            const root = document.documentElement;
            // FIX N-08/N-09: validate strict 6-digit hex, expand 3-char shorthand
            // FIX N-14/T-02: sanitize CSS injection — only allow valid #RRGGBB hex
            const isValidHex = (v) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);
            const expandHex  = (v) => {
              if (!v || typeof v !== 'string') return null;
              const s = v.trim();
              if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;           // already 6-digit
              if (/^#[0-9A-Fa-f]{3}$/.test(s))                      // expand 3→6
                return '#' + s[1]+s[1]+s[2]+s[2]+s[3]+s[3];
              return null; // invalid — reject
            };
            const hexToRgba = (hex, a) => {
              const h = expandHex(hex);
              if (!h) return null;
              const r = parseInt(h.slice(1,3),16);
              const g = parseInt(h.slice(3,5),16);
              const b = parseInt(h.slice(5,7),16);
              return `rgba(${r},${g},${b},${a})`;
            };
            const safeSet = (prop, value) => {
              if (value !== null && value !== undefined) root.style.setProperty(prop, value);
            };
            if (isValidHex(expandHex(d.themeAccent))) {
              const h = expandHex(d.themeAccent);
              safeSet('--accent',      h);
              safeSet('--accent-dim',  hexToRgba(h, 0.15));
              safeSet('--accent-glow', hexToRgba(h, 0.4));
              safeSet('--shadow-glow', `0 0 20px ${hexToRgba(h, 0.2)}`);
            }
            if (isValidHex(expandHex(d.themeAccent2))) {
              const h = expandHex(d.themeAccent2);
              safeSet('--accent2',     h);
              safeSet('--accent2-dim', hexToRgba(h, 0.15));
            }
            if (isValidHex(expandHex(d.themeBgPrimary))) {
              const h = expandHex(d.themeBgPrimary);
              safeSet('--bg-primary',   h);
              safeSet('--bg-secondary', h + 'ee');
            }
            if (isValidHex(expandHex(d.themeBgCard))) {
              const h = expandHex(d.themeBgCard);
              safeSet('--bg-card',      h);
              safeSet('--bg-card-hover',h + 'cc');
            }
            if (isValidHex(expandHex(d.themeGold))) {
              const h = expandHex(d.themeGold);
              safeSet('--gold',     h);
              safeSet('--gold-dim', hexToRgba(h, 0.15));
            }
          }
          setMaintenanceChecked(true);
        }, () => setMaintenanceChecked(true));
        return unsub;
      })
    );
  }, []);
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

  // ✅ [M5] Cross-tab cart sync via localStorage storage event
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'gs_cart' && e.newValue !== null) {
        try {
          const updated = JSON.parse(e.newValue);
          setCart(updated);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ FIX T2-02: Validate cart items against Firestore on startup + window focus
  const validateCart = React.useCallback(() => {
    // Use ref to avoid stale closure — read cart from localStorage directly
    const currentCart = (() => {
      try { return JSON.parse(localStorage.getItem('gs_cart') || '[]'); } catch { return []; }
    })();
    if (currentCart.length === 0) return;

    // ✅ FIX UX-09: Check if flash sale is still active — clear stale salePrice if expired
    import('firebase/firestore').then(({ doc, getDoc, collection, query, where, getDocs }) => {
      import('./firebase/config').then(async ({ db }) => {
        // Check active flash sales
        let activeFlashSaleExists = false;
        try {
          const fsSnap = await getDocs(query(collection(db, 'flashSales'), where('active', '==', true)));
          const now = new Date();
          activeFlashSaleExists = fsSnap.docs.some(d => {
            const fs = d.data();
            const start = fs.startAt?.toDate ? fs.startAt.toDate() : (fs.startAt ? new Date(fs.startAt) : null);
            const end   = fs.endAt?.toDate   ? fs.endAt.toDate()   : (fs.endAt   ? new Date(fs.endAt)   : null);
            if (start && now < start) return false;
            if (end   && now > end)   return false;
            return true;
          });
        } catch (_) {}

        const uniqueIds = [...new Set(currentCart.map(item => item.id))];
        const snapMap = {};
        await Promise.allSettled(uniqueIds.map(id =>
          getDoc(doc(db, 'accounts', id)).then(snap => { snapMap[id] = snap; })
        ));
        let changed = false;
        let salePriceCleared = false;
        const soldCountTracker = {};
        const validCart = currentCart.filter(item => {
          const snap = snapMap[item.id];
          if (!snap || !snap.exists()) { changed = true; return false; }
          const d = snap.data();
          const used = soldCountTracker[item.id] || 0;
          const stockLeft = (d.quantity || 1) - (d.soldCount || 0) - used;
          if (d.status !== 'available' || stockLeft <= 0) { changed = true; return false; }
          soldCountTracker[item.id] = used + 1;
          return true;
        }).map(item => {
          // ✅ Clear stale salePrice if no active flash sale
          if (item.salePrice && !activeFlashSaleExists) {
            salePriceCleared = true;
            return { ...item, salePrice: null };
          }
          return item;
        });
        if (changed) {
          setCartPersist(validCart);
          import('react-hot-toast').then(({ default: toast }) =>
            toast('Một số sản phẩm trong giỏ đã được bán và đã bị xoá.', { icon: '⚠️', duration: 4000 })
          );
        } else if (salePriceCleared) {
          setCartPersist(validCart);
          import('react-hot-toast').then(({ default: toast }) =>
            toast('Flash Sale đã kết thúc. Giá giỏ hàng đã được cập nhật.', { icon: '⏰', duration: 4000 })
          );
        }
      });
    });
  }, []);

  React.useEffect(() => {
    validateCart(); // run on startup
    const onFocus = () => validateCart(); // re-run when user switches back to tab
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [validateCart]);

  const addToCart = (account) =>
    setCartPersist(prev => {
      const qty     = Math.max(1, account.buyQty || 1);
      // How many slots of this account are already in cart
      const already = prev.filter(i => i.id === account.id).length;
      // How many more we can add (limited by stock and dynamic cart cap from settings)
      const maxAdd  = Math.min(qty, (account.quantity || 1) - already, maxCartItems - prev.length);
      if (maxAdd <= 0) {
        import('react-hot-toast').then(({ default: toast }) => {
          if (prev.length >= maxCartItems) toast.error(`Giỏ hàng tối đa ${maxCartItems} sản phẩm!`);
          else toast.error('Đã thêm tối đa số lượng có sẵn!');
        });
        return prev;
      }
      // Create maxAdd separate cart entries, each with a unique cartKey
      const ts = Date.now();
      const newItems = Array.from({ length: maxAdd }, (_, i) => ({
        ...account,
        cartKey: account.id + '_' + ts + '_' + (already + i),
        buyQty: undefined,
      }));
      return [...prev, ...newItems];
    });

  // Maintenance mode gate (allow admins through)
  if (maintenanceChecked && maintenance && _up?.role !== 'admin') {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:'100vh', gap:24, padding:24, textAlign:'center', background:'var(--bg-primary)' }}>
        <div style={{ fontSize:72 }}>🔧</div>
        <h1 style={{ fontFamily:'Rajdhani', fontSize:36, fontWeight:700, color:'var(--accent)' }}>
          Đang bảo trì
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:16, maxWidth:480, lineHeight:1.7 }}>
          GameStore VN đang được nâng cấp để phục vụ bạn tốt hơn.<br/>
          Vui lòng quay lại sau. Xin lỗi vì sự bất tiện này!
        </p>
        <div style={{ fontSize:13, color:'var(--text-muted)', padding:'12px 24px', borderRadius:8,
          border:'1px solid var(--border)', background:'var(--bg-card)' }}>
          📧 Liên hệ: support@gamestore.vn
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
          <Route path="flash-sales" element={<AdminFlashSales />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
          <Route path="bulk-import" element={<AdminBulkImport />} />
          <Route path="ratings" element={<AdminRatings />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>
        <Route path="/*" element={<UserLayout cart={cart} addToCart={addToCart} setCart={setCartPersist} />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
};

const App = () => <AuthProvider><AppContent /></AuthProvider>;
export default App;

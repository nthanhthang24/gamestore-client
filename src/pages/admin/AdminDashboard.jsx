// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Settings,
  TrendingUp, DollarSign, Eye, Plus, ChevronRight,
  Zap, Shield, Menu, X, LogOut, Wallet, Tag, Sword
, Gamepad2} from 'lucide-react';
import './AdminDashboard.css';

const AdminLayout = () => {
  const { userProfile, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingTopups, setPendingTopups] = useState(0);

  useEffect(() => {
    // Count pending topups for badge
    getDocs(query(collection(db, 'topups'), where('status', '==', 'pending')))
      .then(snap => setPendingTopups(snap.size))
      .catch(() => {});
  }, []);

  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Tổng quan', exact: true },
    { path: '/admin/accounts', icon: <Package size={18} />, label: 'Quản lý Account' },
    { path: '/admin/orders', icon: <ShoppingBag size={18} />, label: 'Đơn hàng' },
    { path: '/admin/topups', icon: <Wallet size={18} />, label: 'Nạp tiền', badge: pendingTopups },
    { path: '/admin/vouchers', icon: <Tag size={18} />, label: 'Voucher & Sale' },
    { path: '/admin/services', icon: <Sword size={18} />, label: 'Dịch vụ Game' },
    { path: '/admin/game-types', icon: <Gamepad2 size={18} />, label: 'Loại Game' },
    { path: '/admin/users', icon: <Users size={18} />, label: 'Người dùng' },
    { path: '/admin/settings', icon: <Settings size={18} />, label: 'Cài đặt' },
  ];

  const isActive = (path, exact) => exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link to="/" className="admin-logo">
            <div className="logo-icon"><Zap size={16} /></div>
            <span className="logo-text">GAME<span className="logo-accent">STORE</span></span>
          </Link>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">
            {userProfile?.avatar
              ? <img src={userProfile.avatar} alt="" />
              : userProfile?.displayName?.[0]?.toUpperCase() || 'A'
            }
          </div>
          <div>
            <div className="admin-name">{userProfile?.displayName}</div>
            <div className="admin-role">
              <Shield size={10} /> Administrator
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="nav-label">QUẢN TRỊ</div>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background:'var(--danger)', color:'#fff', fontSize:10, fontWeight:700, borderRadius:10, padding:'1px 6px', minWidth:18, textAlign:'center' }}>
                  {item.badge}
                </span>
              )}
              {isActive(item.path, item.exact) && !item.badge && <ChevronRight size={14} className="nav-arrow" />}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-item">
            <Eye size={18} /> <span>Xem trang web</span>
          </Link>
          <button className="admin-nav-item danger" onClick={logout}>
            <LogOut size={18} /> <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            {navItems.find(n => isActive(n.path, n.exact))?.label || 'Admin'}
          </div>
          <Link to="/admin/accounts/new" className="btn btn-primary btn-sm">
            <Plus size={16} /> Thêm account
          </Link>
        </header>

        {/* Page content */}
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export const AdminOverview = () => {
  const [stats, setStats] = useState({ accounts: 0, orders: 0, users: 0, revenue: 0, sold: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [accs, orders, users] = await Promise.all([
        getDocs(collection(db, 'accounts')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'users')),
      ]);

      const orderData = orders.docs.map(d => ({ id: d.id, ...d.data() }));
      const revenue = orderData.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
      const sold = accs.docs.filter(d => d.data().status === 'sold').length;

      setStats({
        accounts: accs.size, orders: orders.size,
        users: users.size, revenue, sold
      });
      setRecentOrders(orderData.slice(0, 5));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const statCards = [
    { title: 'Tổng Account', value: stats.accounts, icon: <Package size={22} />, color: 'var(--accent)', sub: `${stats.sold} đã bán` },
    { title: 'Đơn hàng', value: stats.orders, icon: <ShoppingBag size={22} />, color: 'var(--gold)', sub: 'tất cả thời gian' },
    { title: 'Người dùng', value: stats.users, icon: <Users size={22} />, color: 'var(--success)', sub: 'đã đăng ký' },
    { title: 'Doanh thu', value: stats.revenue.toLocaleString('vi-VN') + 'đ', icon: <DollarSign size={22} />, color: 'var(--accent2)', sub: 'đã hoàn thành' },
  ];

  return (
    <div className="admin-overview">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Tổng quan</h1>
          <p className="admin-page-sub">Chào mừng trở lại, Admin!</p>
        </div>
        <Link to="/admin/accounts/new" className="btn btn-primary">
          <Plus size={16} /> Thêm account mới
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="overview-stats">
        {statCards.map((stat, i) => (
          <div key={i} className="overview-stat-card card">
            <div className="osc-left">
              <div className="osc-title">{stat.title}</div>
              <div className="osc-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="osc-sub">{stat.sub}</div>
            </div>
            <div className="osc-icon" style={{ color: stat.color, background: `${stat.color}15` }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card" style={{ marginTop: '28px' }}>
        <div className="card-header-row">
          <h2 className="card-section-title">Đơn hàng gần đây</h2>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm">Xem tất cả →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có đơn hàng</div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td><span className="order-id">#{order.id.slice(0, 8)}</span></td>
                    <td>{order.userEmail || 'N/A'}</td>
                    <td>{order.items?.length || 0} sản phẩm</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{order.total?.toLocaleString('vi-VN')}đ</td>
                    <td>
                      <span className={`badge ${order.status === 'completed' ? 'badge-success' : order.status === 'pending' ? 'badge-orange' : 'badge-danger'}`}>
                        {order.status === 'completed' ? 'Hoàn thành' : order.status === 'pending' ? 'Chờ xử lý' : order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue Chart — last 7 days */}
      <RevenueChart />
      <TopSellingWidget />
    </div>
  );
};

// Mini revenue chart component (no external lib needed — pure CSS bars)
const RevenueChart = () => {
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs, query, where, orderBy }) =>
      import('../../firebase/config').then(({ db }) => {
        // Last 7 days
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          d.setHours(0, 0, 0, 0);
          return d;
        });
        getDocs(collection(db, 'orders')).then(snap => {
          const orders = snap.docs.map(d => ({ ...d.data() }));
          const data = days.map(day => {
            const next = new Date(day); next.setDate(next.getDate() + 1);
            const dayOrders = orders.filter(o => {
              const t = o.createdAt?.toDate?.() || (o.createdAt ? new Date(o.createdAt) : null);
              return t && t >= day && t < next;
            });
            const revenue = dayOrders.reduce((s, o) => s + (o.total || 0), 0);
            return {
              label: day.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
              revenue, count: dayOrders.length,
            };
          });
          setChartData(data);
        }).catch(console.error).finally(() => setLoading(false));
      })
    );
  }, []);

  if (loading) return null;
  const maxRev = Math.max(...chartData.map(d => d.revenue), 1);

  return (
    <div className="card" style={{ marginTop: 28, padding: 24 }}>
      <div className="card-header-row" style={{ marginBottom: 24 }}>
        <h2 className="card-section-title">📈 Doanh thu 7 ngày qua</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Tổng: <strong style={{ color: 'var(--gold)' }}>{chartData.reduce((s,d)=>s+d.revenue,0).toLocaleString('vi-VN')}đ</strong>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
        {chartData.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {d.revenue > 0 ? (d.revenue >= 1000000 ? (d.revenue/1000000).toFixed(1)+'M' : (d.revenue/1000).toFixed(0)+'K') : ''}
            </span>
            <div
              title={`${d.label}: ${d.revenue.toLocaleString('vi-VN')}đ (${d.count} đơn)`}
              style={{
                width: '100%', minHeight: 4,
                height: `${Math.max(4, (d.revenue / maxRev) * 100)}%`,
                background: d.revenue > 0
                  ? 'linear-gradient(to top, var(--accent), var(--accent2))'
                  : 'var(--border)',
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.5s ease',
                cursor: 'pointer',
                position: 'relative',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Top-selling accounts widget
const TopSellingWidget = () => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('firebase/firestore').then(({ collection, getDocs }) =>
      import('../../firebase/config').then(({ db }) =>
        getDocs(collection(db, 'orders')).then(snap => {
          const counts = {};
          snap.docs.forEach(d => {
            (d.data().items || []).forEach(item => {
              if (!counts[item.id]) counts[item.id] = { ...item, soldCount: 0 };
              counts[item.id].soldCount++;
            });
          });
          const sorted = Object.values(counts).sort((a,b) => b.soldCount - a.soldCount).slice(0,5);
          setItems(sorted);
        }).catch(console.error).finally(() => setLoading(false))
      )
    );
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 20, padding: 24 }}>
      <h2 className="card-section-title" style={{ marginBottom: 16 }}>🏆 Tài khoản bán chạy nhất</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 8 }}>
            <span style={{ fontFamily: 'Rajdhani', fontWeight: 800, fontSize: 20, color: i === 0 ? 'var(--gold)' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)', minWidth: 28, textAlign: 'center' }}>
              {i + 1}
            </span>
            {item.images?.[0] ? (
              <img src={item.images[0]} style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 4 }} alt="" />
            ) : (
              <div style={{ width: 40, height: 30, background: 'var(--bg-secondary)', borderRadius: 4, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 16 }}>🎮</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <span className="badge badge-accent" style={{ fontSize: 10 }}>{item.gameType}</span>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>{item.soldCount} đơn</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.price?.toLocaleString('vi-VN')}đ</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLayout;

// src/pages/admin/AdminAccounts.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Plus, Edit2, Trash2, Eye, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => {
    let result = accounts;
    if (search) result = result.filter(a => a.title?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    setFiltered(result);
  }, [accounts, search, statusFilter]);

  const fetchAccounts = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'accounts'), orderBy('createdAt', 'desc')));
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa tài khoản này?')) return;
    try {
      await deleteDoc(doc(db, 'accounts', id));
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.success('Đã xóa!', { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
    } catch (err) { toast.error('Lỗi khi xóa'); }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý Account</h1>
          <p className="admin-page-sub">{accounts.length} tài khoản game</p>
        </div>
        <Link to="/admin/accounts/new" className="btn btn-primary">
          <Plus size={16} /> Thêm mới
        </Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" style={{ paddingLeft: '36px' }} placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="available">Còn hàng</option>
            <option value="sold">Đã bán</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Tên tài khoản</th>
                  <th>Game</th>
                  <th>Rank</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th>Lượt xem</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(acc => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{
                        width: '56px', height: '40px', borderRadius: '6px',
                        overflow: 'hidden', background: 'var(--bg-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {acc.images?.[0]
                          ? <img src={acc.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : <span style={{ fontSize: '18px' }}>🎮</span>
                        }
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.title}</div>
                    </td>
                    <td><span className="badge badge-accent">{acc.gameType}</span></td>
                    <td>{acc.rank || '-'}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{acc.price?.toLocaleString('vi-VN')}đ</td>
                    <td>
                      <span className={`badge ${acc.status === 'available' ? 'badge-success' : 'badge-danger'}`}>
                        {acc.status === 'available' ? 'Còn hàng' : 'Đã bán'}
                      </span>
                    </td>
                    <td>{acc.views || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link to={`/account/${acc.id}`} className="btn btn-ghost btn-sm" title="Xem"><Eye size={13} /></Link>
                        <Link to={`/admin/accounts/edit/${acc.id}`} className="btn btn-ghost btn-sm" title="Sửa"><Edit2 size={13} /></Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(acc.id)} title="Xóa"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAccounts;

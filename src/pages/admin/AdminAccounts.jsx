// src/pages/admin/AdminAccounts.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useConfirm } from '../../components/shared/ConfirmModal';
import { collection, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Plus, Edit2, Trash2, Eye, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminAccounts = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [accounts, setAccounts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkPriceMode, setBulkPriceMode] = useState('set'); // set | pct_up | pct_down
  const [bulkPriceSaving, setBulkPriceSaving] = useState(false);

  const location = useLocation();
  useEffect(() => { fetchAccounts(); }, [location.key]);
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
    if (!(await confirm('Xóa tài khoản này? Không thể khôi phục.'))) return;
    try {
      await deleteDoc(doc(db, 'accounts', id));
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.success('Đã xóa!', { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
    } catch (err) { toast.error('Lỗi khi xóa'); }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };

  const handleBulkPriceUpdate = async () => {
    if (!bulkPrice || isNaN(Number(bulkPrice)) || Number(bulkPrice) <= 0) {
      import('react-hot-toast').then(({default:t})=>t.error('Giá không hợp lệ')); return;
    }
    setBulkPriceSaving(true);
    try {
      const val = Number(bulkPrice);
      const ids = [...selected];
      await Promise.all(ids.map(id => {
        return import('firebase/firestore').then(({doc, updateDoc, serverTimestamp}) =>
          import('../../firebase/config').then(({db}) => {
            const acc = accounts.find(a=>a.id===id);
            let newPrice = val;
            if (bulkPriceMode === 'pct_up')   newPrice = Math.round((acc?.price||0) * (1 + val/100));
            if (bulkPriceMode === 'pct_down')  newPrice = Math.round((acc?.price||0) * (1 - val/100));
            return updateDoc(doc(db,'accounts',id), { price: newPrice, updatedAt: serverTimestamp() });
          })
        );
      }));
      import('react-hot-toast').then(({default:t})=>t.success(`Đã cập nhật giá ${ids.length} account`));
      setAccounts(prev => prev.map(a => {
        if (!selected.has(a.id)) return a;
        let np = val;
        if (bulkPriceMode==='pct_up')   np = Math.round((a.price||0)*(1+val/100));
        if (bulkPriceMode==='pct_down') np = Math.round((a.price||0)*(1-val/100));
        return {...a, price: np};
      }));
      setSelected(new Set()); setBulkPriceOpen(false); setBulkPrice('');
    } catch(e) { import('react-hot-toast').then(({default:t})=>t.error('Lỗi: '+e.message)); }
    finally { setBulkPriceSaving(false); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!(await confirm(`Xoá ${selected.size} tài khoản đã chọn? Không thể khôi phục.`))) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => deleteDoc(doc(db, 'accounts', id))));
      setAccounts(prev => prev.filter(a => !selected.has(a.id)));
      setSelected(new Set());
      toast.success(`Đã xoá ${selected.size} tài khoản`, { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
    } catch(e) { toast.error('Lỗi bulk delete: ' + e.message); }
    finally { setBulkDeleting(false); }
  };

  return (
    <div><ConfirmModal/>
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

      {selected.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'rgba(0,212,255,0.06)', border:'1px solid var(--accent)', borderRadius:8, marginBottom:16 }}>
          <span style={{ fontWeight:600, color:'var(--accent)' }}>{selected.size} đã chọn</span>
          <button className="btn btn-sm" style={{ background:'var(--danger)', color:'#fff', padding:'4px 14px' }}
            onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? '⏳ Đang xoá...' : '🗑️ Xoá đã chọn'}
          </button>
          <button className="btn btn-ghost btn-sm" style={{color:'var(--gold)'}}
            onClick={() => setBulkPriceOpen(p=>!p)}>
            💰 Sửa giá hàng loạt
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
        </div>
      )}
      {/* Bulk price panel */}
      {bulkPriceOpen && selected.size > 0 && (
        <div className="card" style={{padding:20,marginBottom:16,border:'1px solid var(--gold)'}}>
          <div style={{fontWeight:700,marginBottom:12,fontSize:14,color:'var(--gold)'}}>
            💰 Sửa giá cho {selected.size} account đã chọn
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <select className="form-select" style={{width:200}} value={bulkPriceMode} onChange={e=>setBulkPriceMode(e.target.value)}>
              <option value="set">Đặt giá cố định</option>
              <option value="pct_up">Tăng %</option>
              <option value="pct_down">Giảm %</option>
            </select>
            <input type="number" className="form-input" style={{width:160}} min="1"
              value={bulkPrice} onChange={e=>setBulkPrice(e.target.value)}
              placeholder={bulkPriceMode==='set'?'Giá mới (đ)':'Phần trăm (%)'}/>
            <button className="btn btn-primary btn-sm" onClick={handleBulkPriceUpdate} disabled={bulkPriceSaving}>
              {bulkPriceSaving?'Đang lưu...':'Cập nhật giá'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setBulkPriceOpen(false)}>Huỷ</button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width:40 }}>
                    <input type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll} />
                  </th>
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
                  <tr key={acc.id} style={{ background: selected.has(acc.id) ? 'rgba(0,212,255,0.04)' : '' }}>
                    <td><input type="checkbox" checked={selected.has(acc.id)} onChange={() => toggleSelect(acc.id)} onClick={e => e.stopPropagation()} /></td>
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

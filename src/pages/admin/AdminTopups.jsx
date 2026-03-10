// src/pages/admin/AdminTopups.jsx
import React, { useState, useEffect } from 'react';
import {
  collection, query, orderBy, getDocs,
  doc, updateDoc, runTransaction, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CheckCircle, XCircle, Clock, Wallet, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminTopups = () => {
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => { fetchTopups(); }, []);

  const fetchTopups = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'topups'), orderBy('createdAt', 'desc')));
      setTopups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleApprove = async (topup) => {
    if (!window.confirm(`Duyệt nạp ${topup.amount?.toLocaleString('vi-VN')}đ cho ${topup.userEmail}?`)) return;
    setProcessing(topup.id);
    try {
      // ✅ FIX: Dùng runTransaction để chống double-approve và đảm bảo atomic
      await runTransaction(db, async (transaction) => {
        const topupRef = doc(db, 'topups', topup.id);
        const topupSnap = await transaction.get(topupRef);
        if (!topupSnap.exists()) throw new Error('Topup không tồn tại');
        // ✅ Chặn duyệt lần 2 nếu đã approved
        if (topupSnap.data().status !== 'pending') {
          throw new Error(`Topup đã ở trạng thái "${topupSnap.data().status}", không thể duyệt lại`);
        }
        const userRef = doc(db, 'users', topup.userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error('User không tồn tại');
        const currentBalance = userSnap.data().balance || 0;
        transaction.update(topupRef, { status: 'approved', approvedAt: new Date() });
        transaction.update(userRef, { balance: currentBalance + topup.amount });
      });
      setTopups(prev => prev.map(t => t.id === topup.id ? { ...t, status: 'approved' } : t));
      toast.success(`Đã duyệt +${topup.amount?.toLocaleString('vi-VN')}đ cho ${topup.userEmail}`, {
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      });
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally { setProcessing(''); }
  };

  const handleReject = async (topup) => {
    const reason = window.prompt('Lý do từ chối (tùy chọn):');
    if (reason === null) return; // cancelled
    setProcessing(topup.id);
    try {
      await updateDoc(doc(db, 'topups', topup.id), {
        status: 'rejected',
        rejectReason: reason || '',
        rejectedAt: serverTimestamp(),
      });
      setTopups(prev => prev.map(t => t.id === topup.id ? { ...t, status: 'rejected' } : t));
      toast.success('Đã từ chối yêu cầu', {
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      });
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally { setProcessing(''); }
  };

  const filtered = topups.filter(t => filter === 'all' ? true : t.status === filter);
  const pendingCount = topups.filter(t => t.status === 'pending').length;
  const totalApproved = topups.filter(t => t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={24} /> Quản lý Nạp tiền
            {pendingCount > 0 && (
              <span className="badge badge-danger" style={{ fontSize: '13px' }}>{pendingCount} chờ duyệt</span>
            )}
          </h1>
          <p className="admin-page-sub">Duyệt yêu cầu nạp tiền từ người dùng</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchTopups}>
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Chờ duyệt', value: pendingCount, color: 'var(--gold)', bg: 'var(--gold-dim)' },
          { label: 'Đã duyệt', value: topups.filter(t => t.status === 'approved').length, color: 'var(--success)', bg: 'var(--success-dim)' },
          { label: 'Tổng đã nạp', value: totalApproved.toLocaleString('vi-VN') + 'đ', color: 'var(--accent)', bg: 'var(--accent-dim)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '18px', borderColor: s.color.replace(')', ', 0.3)').replace('var(', 'rgba(').replace('--gold', '255,215,0').replace('--success', '0,255,136').replace('--accent', '0,212,255') }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            <div style={{ fontFamily: 'Rajdhani', fontSize: '24px', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { key: 'pending', label: '⏳ Chờ duyệt' },
          { key: 'approved', label: '✅ Đã duyệt' },
          { key: 'rejected', label: '❌ Từ chối' },
          { key: 'all', label: 'Tất cả' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn btn-sm ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người dùng</th>
                  <th>Số tiền</th>
                  <th>Nội dung CK / Ref</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(topup => (
                  <tr key={topup.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {topup.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{topup.userName || topup.userEmail}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{topup.userEmail}</div>
                    </td>
                    <td style={{ fontFamily: 'Rajdhani', fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>
                      +{topup.amount?.toLocaleString('vi-VN')}đ
                    </td>
                    <td style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {topup.transferContent || topup.content || topup.note || '—'}
                    </td>
                    <td>
                      {topup.status === 'pending' && <span className="badge badge-gold"><Clock size={11} /> Chờ duyệt</span>}
                      {topup.status === 'approved' && <span className="badge badge-success"><CheckCircle size={11} /> Đã duyệt</span>}
                      {topup.status === 'rejected' && <span className="badge badge-danger"><XCircle size={11} /> Từ chối</span>}
                    </td>
                    <td>
                      {topup.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(topup)}
                            disabled={processing === topup.id}
                          >
                            <CheckCircle size={13} />
                            {processing === topup.id ? '...' : 'Duyệt'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(topup)}
                            disabled={processing === topup.id}
                          >
                            <XCircle size={13} /> Từ chối
                          </button>
                        </div>
                      )}
                      {topup.status !== 'pending' && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {topup.status === 'approved' ? '✓ Đã xử lý' : '✗ Đã từ chối'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {filter === 'pending' ? 'Không có yêu cầu chờ duyệt' : 'Không có dữ liệu'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTopups;

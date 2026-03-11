// src/pages/admin/AdminTopups.jsx
import { useConfirm } from '../../components/shared/ConfirmModal';
import React, { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, where, getDocs,
  doc, updateDoc, runTransaction, serverTimestamp, increment
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CheckCircle, XCircle, Clock, Wallet, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// CSV export helper
const exportCSV = (topups) => {
  const rows = [
    ['Mã giao dịch', 'Email', 'Số tiền', 'Trạng thái', 'Thời gian'],
    ...topups.map(t => [
      t.id,
      t.userEmail || '',
      t.amount || 0,
      t.status || '',
      t.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '',
    ])
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `topups_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

const AdminTopups = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [filter, setFilter] = useState('pending');
  const [rejectModal, setRejectModal] = useState(null); // { topup } | null
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setLoading(true);
    let unsub;
    try {
      unsub = onSnapshot(
        query(collection(db, 'topups'), orderBy('createdAt', 'desc')),
        (snap) => { setTopups(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (err) => { console.error('topups snapshot:', err); setLoading(false); }
      );
    } catch(e) { setLoading(false); }
    return () => unsub?.();
  }, []);

  const fetchTopups = () => {}; // no-op: replaced by onSnapshot

  const REFERRAL_BONUS = 20000; // 20k cho người giới thiệu khi bạn bè nạp lần đầu

  const handleApprove = async (topup) => {
    if (!(await confirm(`Duyệt nạp ${topup.amount?.toLocaleString('vi-VN')}đ cho ${topup.userEmail}?`, 'primary'))) return;
    setProcessing(topup.id);
    try {
      // ✅ Bước 1: Approve + cộng tiền user (atomic transaction)
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
        transaction.update(topupRef, { status: 'approved', approvedAt: serverTimestamp() });
        transaction.update(userRef, { balance: currentBalance + topup.amount });
      });

      setTopups(prev => prev.map(t => t.id === topup.id ? { ...t, status: 'approved' } : t));
      toast.success(`Đã duyệt +${topup.amount?.toLocaleString('vi-VN')}đ cho ${topup.userEmail}`, {
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      });

      // ✅ Bước 2: Kiểm tra referral — chỉ credit lần đầu nạp tiền
      // Chạy sau transaction chính để không block approve nếu lỗi referral
      try {
        const refSnap = await getDocs(
          query(collection(db, 'referrals'),
            where('newUserId', '==', topup.userId),
            where('credited', '==', false)
          )
        );
        if (!refSnap.empty) {
          const refDoc = refSnap.docs[0];
          const refData = refDoc.data();

          // Tìm referrer theo refCode (uid slice đầu 8 ký tự)
          // refCode = referrer's uid.slice(0,8).toUpperCase()
          // → tìm user có uid bắt đầu bằng refCode (lowercase)
          const refCode = refData.refCode?.toLowerCase();
          if (refCode) {
            // Query user bằng uid prefix — dùng getDocs all users là không scalable
            // Lưu referrerId trong referral record khi đăng ký là tốt hơn
            // Hiện tại: nếu referral record có referrerId thì dùng, không thì skip
            const referrerId = refData.referrerId; // có thể undefined nếu record cũ
            if (referrerId) {
              await runTransaction(db, async (tx) => {
                const referralRef = doc(db, 'referrals', refDoc.id);
                const referralSnap = await tx.get(referralRef);
                // Double-check vẫn chưa credited (tránh race condition)
                if (referralSnap.exists() && referralSnap.data().credited === false) {
                  const referrerRef = doc(db, 'users', referrerId);
                  const referrerSnap = await tx.get(referrerRef);
                  if (referrerSnap.exists()) {
                    tx.update(referrerRef, { balance: (referrerSnap.data().balance || 0) + REFERRAL_BONUS });
                  }
                  tx.update(referralRef, { credited: true, creditedAt: serverTimestamp() });
                }
              });
              toast.success(`🎁 Referral: +${REFERRAL_BONUS.toLocaleString('vi-VN')}đ cho người giới thiệu`, {
                style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
                duration: 3000,
              });
            } else {
              // Fallback: mark credited to prevent re-processing, log for manual review
              await updateDoc(doc(db, 'referrals', refDoc.id), {
                credited: true, creditedAt: serverTimestamp(),
                creditNote: 'referrerId missing — manual review needed',
              });
            }
          }
        }
      } catch (refErr) {
        // Referral error does NOT fail the approval — just log
        console.warn('Referral credit error (non-critical):', refErr.message);
      }

    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    } finally { setProcessing(''); }
  };

  const doReject = async (topup, reason) => {
    setRejectModal(null);
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

  const handleReject = (topup) => {
    setRejectReason('');
    setRejectModal(topup);
  };

  const filtered = topups.filter(t => filter === 'all' ? true : t.status === filter);
  const handleExportCSV = () => exportCSV(filtered);
  const pendingCount = topups.filter(t => t.status === 'pending').length;
  const totalApproved = topups.filter(t => t.status === 'approved').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div><ConfirmModal/>
      {/* Reject reason modal */}
      {rejectModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div className="card" style={{width:'100%',maxWidth:440,padding:28,border:'1px solid var(--danger)'}}>
            <h3 style={{fontFamily:'Rajdhani',fontSize:18,fontWeight:700,color:'var(--danger)',marginBottom:8}}>
              ❌ Từ chối yêu cầu nạp tiền
            </h3>
            <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:16}}>
              <strong>{rejectModal.userEmail}</strong> — <span style={{color:'var(--gold)'}}>{rejectModal.amount?.toLocaleString('vi-VN')}đ</span>
            </p>
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Lý do từ chối <span style={{color:'var(--text-muted)',fontWeight:400}}>(tuỳ chọn)</span></label>
              <textarea className="form-textarea" rows="3" value={rejectReason}
                onChange={e=>setRejectReason(e.target.value)}
                placeholder="VD: Nội dung chuyển khoản không đúng, vui lòng liên hệ hỗ trợ..."
                autoFocus/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setRejectModal(null)}>Huỷ</button>
              <button className="btn btn-danger btn-sm" onClick={()=>doReject(rejectModal, rejectReason)}>
                ❌ Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
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
              <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} title="Xuất CSV" style={{ display:'flex', alignItems:'center', gap:6 }}>📊 Xuất CSV</button>
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
      <UnmatchedTopupsPanel />
    </div>
  );
};

export default AdminTopups;

// ── Unmatched Topups Panel (bank transfers with no matching user) ──
export const UnmatchedTopupsPanel = () => {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(null);
  const [email, setEmail]     = useState('');
  const [saving, setSaving]   = useState(false);

  const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const snap = await getDocs(query(collection(db,'unmatchedTopups'), orderBy('createdAt','desc')));
      setItems(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status!=='matched'));
    } catch {
      const snap = await getDocs(collection(db,'unmatchedTopups'));
      setItems(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status!=='matched'));
    } finally { setLoading(false); }
  };

  const handleMatch = async (item) => {
    if (!email.trim()) { toast.error('Nhập email người dùng',TS); return; }
    setSaving(true);
    try {
      // Find user by email
      const usersSnap = await getDocs(query(collection(db,'users'), where('email','==',email.trim())));
      if (usersSnap.empty) { toast.error(`Không tìm thấy user: ${email}`,TS); setSaving(false); return; }
      const userDoc = usersSnap.docs[0];

      await runTransaction(db, async (tx) => {
        const uRef = doc(db,'users',userDoc.id);
        const uSnap = await tx.get(uRef);
        tx.update(uRef,{ balance:(uSnap.data().balance||0)+item.amount });
        tx.update(doc(db,'unmatchedTopups',item.id),{
          status:'matched', matchedUserId:userDoc.id, matchedEmail:email.trim(),
          matchedAt: serverTimestamp(),
        });
        // Create topup record
        tx.set(doc(collection(db,'topups')),{
          userId: userDoc.id, userEmail: email.trim(),
          amount: item.amount, method:'bank_transfer_manual',
          status:'approved', sePayId: item.sePayId,
          content: item.content, gateway: item.gateway,
          createdAt: serverTimestamp(),
        });
      });

      toast.success(`✅ Đã cộng ${item.amount?.toLocaleString('vi-VN')}đ cho ${email}`,{...TS,duration:5000});
      setItems(p=>p.filter(x=>x.id!==item.id));
      setMatching(null); setEmail('');
    } catch(e) { toast.error('Lỗi: '+e.message,TS); }
    finally { setSaving(false); }
  };

  if (loading) return null;
  if (items.length===0) return (
    <div className="card" style={{padding:'16px 20px',marginTop:20,display:'flex',alignItems:'center',gap:10,color:'var(--success)',fontSize:13}}>
      ✅ Không có giao dịch chưa khớp
    </div>
  );

  return (
    <div className="card" style={{marginTop:24,border:'1px solid rgba(240,165,0,0.4)'}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{fontFamily:'Rajdhani',fontSize:16,fontWeight:700,color:'var(--gold)',margin:0}}>
          ⚠️ Giao dịch chưa khớp ({items.length})
        </h3>
        <span style={{fontSize:12,color:'var(--text-muted)'}}>Khách chuyển khoản nhưng nội dung sai → cần match thủ công</span>
      </div>
      {matching && (
        <div style={{padding:'16px 20px',background:'rgba(240,165,0,0.06)',borderBottom:'1px solid var(--border)'}}>
          <div style={{marginBottom:10,fontSize:13,fontWeight:600}}>
            Match giao dịch {matching.amount?.toLocaleString('vi-VN')}đ — "{matching.content}"
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <input className="form-input" placeholder="Email người dùng nhận tiền..." value={email}
              onChange={e=>setEmail(e.target.value)} style={{flex:1,maxWidth:300}}
              onKeyDown={e=>e.key==='Enter'&&handleMatch(matching)}/>
            <button className="btn btn-primary btn-sm" onClick={()=>handleMatch(matching)} disabled={saving}>
              {saving?'Đang xử lý...':'Xác nhận cộng tiền'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setMatching(null);setEmail('');}}>Huỷ</button>
          </div>
        </div>
      )}
      <div style={{padding:'0 20px 16px'}}>
        {items.map(item=>(
          <div key={item.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontWeight:700,color:'var(--gold)'}}>{item.amount?.toLocaleString('vi-VN')}đ</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>
                Nội dung: <code style={{background:'var(--bg-primary)',padding:'1px 6px',borderRadius:4}}>{item.content||'—'}</code>
              </div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                {item.createdAt?.toDate?.()?.toLocaleString('vi-VN')||'—'} · {item.gateway||'Bank'}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{color:'var(--gold)'}} onClick={()=>setMatching(item)}>
              🔗 Match thủ công
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

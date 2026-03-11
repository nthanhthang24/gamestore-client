// src/pages/admin/AdminRatings.jsx
import { useConfirm } from '../../components/shared/ConfirmModal';
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Star, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

const AdminRatings = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | 1 | 2 | 3 | 4 | 5

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'ratings'), orderBy('createdAt', 'desc')),
      (snap) => { setRatings(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    if (!(await confirm('Xóa đánh giá này?'))) return;
    try {
      await deleteDoc(doc(db, 'ratings', id));
      toast.success('Đã xóa đánh giá', TS);
    } catch(e) { toast.error('Lỗi: '+e.message, TS); }
  };

  const displayed = ratings.filter(r => {
    if (filter !== 'all' && r.stars !== Number(filter)) return false;
    if (search && !r.comment?.toLowerCase().includes(search.toLowerCase()) &&
        !r.userEmail?.toLowerCase().includes(search.toLowerCase()) &&
        !r.accountId?.includes(search)) return false;
    return true;
  });

  const avg = ratings.length ? (ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1) : '—';

  return (
    <div><ConfirmModal/>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Star size={20} style={{color:'var(--gold)'}}/> Đánh giá & Nhận xét</h1>
          <p className="admin-page-sub">{ratings.length} đánh giá · Trung bình {avg}⭐</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
        <input className="form-input" placeholder="Tìm email, nội dung..." value={search}
          onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:200,maxWidth:300}}/>
        {['all','5','4','3','2','1'].map(f=>(
          <button key={f} className={`btn btn-sm ${filter===f?'btn-primary':'btn-ghost'}`}
            onClick={()=>setFilter(f)}>
            {f==='all'?'Tất cả':`${f}⭐`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{margin:'0 auto'}}/></div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Chưa có đánh giá nào</div>
      ) : (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Sao</th>
                <th>Nội dung</th>
                <th>Account ID</th>
                <th>Ngày</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{fontWeight:600,fontSize:13}}>{r.displayName}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>{r.userEmail}</div>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:2}}>
                      {[1,2,3,4,5].map(n=>(
                        <Star key={n} size={13} fill={n<=r.stars?'var(--gold)':'none'}
                          stroke={n<=r.stars?'var(--gold)':'var(--border)'}/>
                      ))}
                    </div>
                  </td>
                  <td style={{maxWidth:260,fontSize:13,color:'var(--text-secondary)'}}>{r.comment}</td>
                  <td style={{fontFamily:'monospace',fontSize:11}}>{r.accountId?.slice(-8)}</td>
                  <td style={{fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap'}}>
                    {r.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(r.id)}>
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminRatings;

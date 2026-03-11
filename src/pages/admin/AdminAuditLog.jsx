// src/pages/admin/AdminAuditLog.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { RefreshCw, Search } from 'lucide-react';

const AdminAuditLog = () => {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const PAGE = 50;

  useEffect(() => { load(true); }, []);

  const load = async (reset=false) => {
    setLoading(true);
    try {
      let q = query(collection(db,'auditLogs'), orderBy('createdAt','desc'), limit(PAGE));
      if (!reset && lastDoc) q = query(collection(db,'auditLogs'), orderBy('createdAt','desc'), startAfter(lastDoc), limit(PAGE));
      const snap = await getDocs(q);
      const rows = snap.docs.map(d=>({id:d.id,...d.data()}));
      setLogs(p => reset ? rows : [...p,...rows]);
      setLastDoc(snap.docs[snap.docs.length-1]||null);
      setHasMore(snap.docs.length===PAGE);
    } catch(e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const ACTION_ICON = {
    balance_adjust:'💰', user_ban:'🚫', user_unban:'✅',
    refund:'💸', ticket_resolve:'🎫', flash_sale_create:'⚡',
    account_delete:'🗑️', bulk_delete:'🗑️', topup_approve:'✅', topup_reject:'❌',
  };

  const displayed = search
    ? logs.filter(l => (l.action||'').includes(search) || (l.adminEmail||'').includes(search) || JSON.stringify(l).toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">📋 Audit Log</h1>
          <p className="admin-page-sub">Lịch sử thao tác admin</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={()=>load(true)}><RefreshCw size={14}/> Làm mới</button>
      </div>
      <div className="card" style={{padding:16,marginBottom:20}}>
        <div style={{position:'relative'}}>
          <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)'}}/>
          <input className="form-input" style={{paddingLeft:36}} placeholder="Tìm action, email admin..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      {loading && logs.length===0 ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{margin:'0 auto'}}/></div>
      ) : (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Thời gian</th><th>Hành động</th><th>Admin</th><th>Chi tiết</th></tr></thead>
              <tbody>
                {displayed.map(l=>(
                  <tr key={l.id}>
                    <td style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>
                      {l.createdAt?.toDate?.()?.toLocaleString('vi-VN')||'—'}
                    </td>
                    <td>
                      <span style={{display:'inline-flex',alignItems:'center',gap:6,fontWeight:600,fontSize:13}}>
                        {ACTION_ICON[l.action]||'📝'} {l.action}
                      </span>
                    </td>
                    <td style={{fontSize:12}}>{l.adminEmail||'—'}</td>
                    <td style={{fontSize:12,color:'var(--text-secondary)',maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {Object.entries(l).filter(([k])=>!['id','action','adminEmail','createdAt'].includes(k))
                        .map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join(' · ')}
                    </td>
                  </tr>
                ))}
                {displayed.length===0 && <tr><td colSpan="4" style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div style={{padding:16,textAlign:'center'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>load(false)} disabled={loading}>
                {loading?'Đang tải...':'Tải thêm'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;

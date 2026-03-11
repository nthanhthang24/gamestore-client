// src/pages/admin/AdminTickets.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Shield, MessageSquare, AlertTriangle, CheckCircle, X, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};
const TYPE_ICON = { warranty:<Shield size={14}/>, refund:<AlertTriangle size={14}/>, support:<MessageSquare size={14}/> };
const TYPE_LABEL = { warranty:'Bảo hành', refund:'Hoàn tiền', support:'Hỗ trợ' };
const STATUS_COLOR = { open:'var(--gold)', in_progress:'var(--accent)', resolved:'var(--success)', rejected:'var(--danger)' };
const STATUS_LABEL = { open:'Đang chờ', in_progress:'Đang xử lý', resolved:'Đã giải quyết', rejected:'Từ chối' };

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [action, setAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('open');

  useEffect(() => {
    setLoading(true);
    let unsub;
    try {
      unsub = onSnapshot(
        query(collection(db,'tickets'), orderBy('createdAt','desc')),
        (snap) => { setTickets(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
        (err) => { console.error(err); setLoading(false); }
      );
    } catch(e) { setLoading(false); }
    return () => unsub?.();
  }, []);

  const load = () => {}; // no-op: onSnapshot handles realtime

  const handleAction = async () => {
    if (!action) { toast.error('Chọn hành động',TS); return; }
    setSaving(true);
    try {
      const updates = { status: action, adminReply: reply.trim()||null, updatedAt: serverTimestamp() };

      // If approving refund → also credit user balance
      if (action === 'resolved' && selected.type === 'refund' && selected.total > 0) {
        await runTransaction(db, async (tx) => {
          const uRef = doc(db,'users',selected.userId);
          const uSnap = await tx.get(uRef);
          if (uSnap.exists()) tx.update(uRef,{ balance:(uSnap.data().balance||0)+selected.total });
          tx.update(doc(db,'tickets',selected.id), updates);
        });
        toast.success(`Đã hoàn ${selected.total?.toLocaleString('vi-VN')}đ cho ${selected.userEmail}`,TS);
      } else {
        await updateDoc(doc(db,'tickets',selected.id), updates);
        toast.success('Đã cập nhật ticket',TS);
      }

      setTickets(p=>p.map(t=>t.id===selected.id?{...t,...updates}:t));
      setSelected(null); setReply(''); setAction('');
    } catch(e) { toast.error('Lỗi: '+e.message,TS); }
    finally { setSaving(false); }
  };

  const openCount = tickets.filter(t=>t.status==='open').length;
  const displayed = filter==='all' ? tickets : tickets.filter(t=>t.status===filter);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Shield size={20} style={{color:'var(--success)'}}/> Tickets Hỗ trợ</h1>
          <p className="admin-page-sub">{tickets.length} tickets · <span style={{color:'var(--gold)',fontWeight:700}}>{openCount} đang chờ</span></p>
        </div>
        <div style={{display:'flex',gap:8}}>
          {tickets.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const rows = [['Mã','Loại','Email','Trạng thái','Ngày','Phản hồi']];
              tickets.forEach(t => rows.push([
                t.id.slice(-8).toUpperCase(), t.type||'', t.userEmail||'',
                t.status||'', t.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')||'', t.adminReply||''
              ]));
              const csv = rows.map(r=>r.map(c=>(`"${String(c).replace(/"/g,'""')}"`)).join(',')).join('\n');
              const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
              const url = URL.createObjectURL(blob); const a = document.createElement('a');
              a.href=url; a.download='tickets.csv'; a.click(); URL.revokeObjectURL(url);
            }}><Download size={14}/> Export</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/> Làm mới</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {['open','in_progress','resolved','rejected','all'].map(s=>(
          <button key={s} className={`btn btn-sm ${filter===s?'btn-primary':'btn-ghost'}`}
            onClick={()=>setFilter(s)}>
            {s==='all'?'Tất cả':STATUS_LABEL[s]} {s!=='all'&&`(${tickets.filter(t=>t.status===s).length})`}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="card" style={{padding:24,marginBottom:20,border:'1px solid var(--accent)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                {TYPE_ICON[selected.type]}
                <strong>{TYPE_LABEL[selected.type]}</strong>
                <span style={{fontSize:12,color:STATUS_COLOR[selected.status],fontWeight:600}}>— {STATUS_LABEL[selected.status]}</span>
              </div>
              <div style={{fontSize:13,color:'var(--text-muted)'}}>
                {selected.userEmail} · Đơn #{selected.orderId?.slice(-8).toUpperCase()} · {selected.total?.toLocaleString('vi-VN')}đ
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(null)}><X size={14}/></button>
          </div>
          <div style={{padding:'12px 16px',background:'var(--bg-primary)',borderRadius:8,marginBottom:16,fontSize:13,lineHeight:1.7}}>
            {selected.description}
          </div>
          {selected.items?.length>0 && (
            <div style={{marginBottom:16,fontSize:12,color:'var(--text-muted)'}}>
              Items: {selected.items.join(', ')}
            </div>
          )}
          <div className="form-group" style={{marginBottom:12}}>
            <label className="form-label">Phản hồi cho khách (tuỳ chọn)</label>
            <textarea className="form-textarea" rows="3" value={reply} onChange={e=>setReply(e.target.value)}
              placeholder="Nhập phản hồi sẽ hiển thị cho khách..."/>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
            <select className="form-select" style={{width:200}} value={action} onChange={e=>setAction(e.target.value)}>
              <option value="">— Chọn hành động —</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã giải quyết {selected.type==='refund'?'(+ hoàn tiền)':''}</option>
              <option value="rejected">Từ chối</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleAction} disabled={saving||!action}>
              {saving?'Đang lưu...':'Xác nhận'}
            </button>
          </div>
          {action==='resolved' && selected.type==='refund' && (
            <div style={{marginTop:10,padding:'8px 12px',background:'rgba(46,213,115,0.1)',borderRadius:6,fontSize:12,color:'var(--success)',border:'1px solid rgba(46,213,115,0.3)'}}>
              ✅ Chọn "Đã giải quyết" sẽ <strong>hoàn {selected.total?.toLocaleString('vi-VN')}đ</strong> vào số dư của {selected.userEmail}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{margin:'0 auto'}}/></div>
      ) : displayed.length===0 ? (
        <div className="card" style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>Không có ticket nào</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {displayed.map(t=>(
            <div key={t.id} className="card" style={{padding:'14px 20px',cursor:'pointer',
              border:t.status==='open'?'1px solid rgba(240,165,0,0.4)':'1px solid var(--border)',
              background:t.id===selected?.id?'rgba(0,212,255,0.04)':'var(--bg-card)'}}
              onClick={()=>{ setSelected(t); setReply(t.adminReply||''); setAction(''); }}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <div style={{fontSize:18}}>{t.type==='warranty'?'🛡️':t.type==='refund'?'💰':'💬'}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{TYPE_LABEL[t.type]} — {t.userEmail}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:400}}>
                    {t.description}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontWeight:600,color:STATUS_COLOR[t.status],fontSize:12}}>{STATUS_LABEL[t.status]}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                    {t.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')||'—'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTickets;

// src/pages/admin/AdminFlashSales.jsx
import { useConfirm } from '../../components/shared/ConfirmModal';
import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, getDocs, addDoc, doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Zap, Plus, Trash2, Edit2, Save, X, Flame, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style: { background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};
const toLocal = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
const fromLocal = (s) => s ? Timestamp.fromDate(new Date(s)) : null;

const empty = () => ({
  name:'', discount:10, startAt:'', endAt:'',
  active:true, targetAll:true, targetGameTypes:[],
});

const AdminFlashSales = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [sales, setSales]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(null); // null=hidden, {}=new, {id,...}=edit
  const [saving, setSaving]   = useState(false);
  const [gameTypes, setGameTypes] = useState([]);
  const now = new Date();

  useEffect(() => {
    // Realtime flash sales
    setLoading(true);
    let unsub;
    try {
      unsub = onSnapshot(
        query(collection(db,'flashSales'), orderBy('createdAt','desc')),
        (snap) => { setSales(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
        () => setLoading(false)
      );
    } catch(e) { setLoading(false); }
    // Load game types (one-time, static data)
    getDocs(collection(db,'gameTypes')).then(s => setGameTypes(s.docs.map(d=>d.data().name||d.id)));
    return () => unsub?.();
  }, []);

  const load = () => {}; // no-op: replaced by onSnapshot

  const openNew  = () => setForm(empty());
  const openEdit = (s) => setForm({ ...s, startAt: toLocal(s.startAt), endAt: toLocal(s.endAt) });
  const closeForm = () => setForm(null);

  const handleSave = async () => {
    if (!form.name)     { toast.error('Cần tên chương trình',TS); return; }
    if (!form.discount || form.discount < 1 || form.discount > 99)
      { toast.error('Discount phải từ 1–99%',TS); return; }
    if (!form.startAt || !form.endAt) { toast.error('Cần thời gian bắt đầu và kết thúc',TS); return; }
    if (new Date(form.endAt) <= new Date(form.startAt))
      { toast.error('Thời gian kết thúc phải sau bắt đầu',TS); return; }

    setSaving(true);
    try {
      const payload = {
        name:      form.name,
        discount:  Number(form.discount),
        startAt:   fromLocal(form.startAt),
        endAt:     fromLocal(form.endAt),
        active:    form.active,
        targetAll: form.targetAll,
        targetGameTypes: form.targetAll ? [] : (form.targetGameTypes||[]),
        updatedAt: serverTimestamp(),
      };
      if (form.id) {
        await updateDoc(doc(db,'flashSales',form.id), payload);
        toast.success('Đã cập nhật flash sale!',TS);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db,'flashSales'), payload);
        toast.success('Đã tạo flash sale!',TS);
      }
      closeForm(); // onSnapshot auto-refreshes
    } catch(e) { toast.error('Lỗi: '+e.message,TS); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!(await confirm(`Xoá flash sale "${name}"?`))) return;
    await deleteDoc(doc(db,'flashSales',id));
    toast.success('Đã xoá',TS);
    setSales(p => p.filter(s=>s.id!==id));
  };

  const toggleActive = async (s) => {
    await updateDoc(doc(db,'flashSales',s.id),{ active:!s.active, updatedAt:serverTimestamp() });
    setSales(p=>p.map(x=>x.id===s.id?{...x,active:!x.active}:x));
    toast.success((!s.active?'Đã bật':'Đã tắt')+' flash sale',TS);
  };

  const getStatus = (s) => {
    if (!s.active) return { label:'Tắt', color:'var(--text-muted)' };
    const start = s.startAt?.toDate?.()||new Date(s.startAt);
    const end   = s.endAt?.toDate?.()||new Date(s.endAt);
    if (now < start) return { label:'Sắp diễn ra', color:'var(--gold)' };
    if (now > end)   return { label:'Đã kết thúc', color:'var(--danger)' };
    return { label:'🔥 Đang chạy', color:'#ff4757' };
  };

  return (
    <div><ConfirmModal/>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Zap size={20} style={{color:'var(--gold)'}}/> Flash Sales</h1>
          <p className="admin-page-sub">{sales.length} chương trình · {sales.filter(s=>{ const st=getStatus(s); return st.label.includes('Đang');}).length} đang chạy</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15}/> Tạo Flash Sale</button>
      </div>

      {/* Form */}
      {form && (
        <div className="card" style={{marginBottom:20,border:'1px solid var(--accent)',padding:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontFamily:'Rajdhani',color:'var(--accent)',margin:0,fontSize:17}}>
              <Flame size={16}/> {form.id ? 'Chỉnh sửa' : 'Tạo mới'} Flash Sale
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={closeForm}><X size={14}/></button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Tên chương trình *</label>
              <input className="form-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="VD: Flash Sale Thứ 6 - Giảm 20%"/>
            </div>
            <div className="form-group">
              <label className="form-label">Giảm giá (%) *</label>
              <input type="number" className="form-input" value={form.discount} min="1" max="99"
                onChange={e=>setForm(p=>({...p,discount:e.target.value}))} placeholder="10"/>
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <div style={{display:'flex',alignItems:'center',gap:10,height:40}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:14}}>
                  <input type="checkbox" checked={form.active} onChange={e=>setForm(p=>({...p,active:e.target.checked}))}/>
                  {form.active ? '✅ Đang bật' : '⭕ Đang tắt'}
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Bắt đầu *</label>
              <input type="datetime-local" className="form-input" value={form.startAt}
                onChange={e=>setForm(p=>({...p,startAt:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Kết thúc *</label>
              <input type="datetime-local" className="form-input" value={form.endAt}
                onChange={e=>setForm(p=>({...p,endAt:e.target.value}))}/>
            </div>
            <div className="form-group" style={{gridColumn:'1/-1'}}>
              <label className="form-label">Áp dụng cho</label>
              <div style={{display:'flex',gap:16,marginBottom:8}}>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:14}}>
                  <input type="radio" checked={form.targetAll} onChange={()=>setForm(p=>({...p,targetAll:true}))}/>
                  Tất cả loại game
                </label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:14}}>
                  <input type="radio" checked={!form.targetAll} onChange={()=>setForm(p=>({...p,targetAll:false}))}/>
                  Chọn loại game cụ thể
                </label>
              </div>
              {!form.targetAll && (
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {gameTypes.map(gt => (
                    <label key={gt} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 12px',border:'1px solid var(--border)',borderRadius:8,cursor:'pointer',fontSize:13,
                      background:(form.targetGameTypes||[]).includes(gt)?'rgba(0,212,255,0.15)':'transparent',
                      borderColor:(form.targetGameTypes||[]).includes(gt)?'var(--accent)':'var(--border)'}}>
                      <input type="checkbox"
                        checked={(form.targetGameTypes||[]).includes(gt)}
                        onChange={e=>setForm(p=>({...p,targetGameTypes:e.target.checked?[...(p.targetGameTypes||[]),gt]:(p.targetGameTypes||[]).filter(x=>x!==gt)}))}/>
                      {gt}
                    </label>
                  ))}
                  {gameTypes.length===0 && <span style={{fontSize:12,color:'var(--text-muted)'}}>Chưa có loại game nào</span>}
                </div>
              )}
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
            <button className="btn btn-ghost" onClick={closeForm}>Huỷ</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={14}/> {saving?'Đang lưu...':'Lưu Flash Sale'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{margin:'0 auto'}}/></div>
      ) : sales.length===0 ? (
        <div className="card" style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
          <Zap size={40} style={{opacity:.3,marginBottom:16}}/><br/>Chưa có flash sale nào.<br/>
          <button className="btn btn-primary" style={{marginTop:16}} onClick={openNew}><Plus size={14}/> Tạo đầu tiên</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {sales.map(s => {
            const st = getStatus(s);
            const start = s.startAt?.toDate?.()||new Date(s.startAt||0);
            const end   = s.endAt?.toDate?.()||new Date(s.endAt||0);
            return (
              <div key={s.id} className="card" style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px',flexWrap:'wrap',
                border: st.label.includes('Đang') ? '1px solid rgba(255,71,87,0.4)' : '1px solid var(--border)',
                background: st.label.includes('Đang') ? 'rgba(255,71,87,0.04)' : 'var(--bg-card)'}}>
                <div style={{fontSize:28}}>{st.label.includes('Đang')?'🔥':'⚡'}</div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{fontWeight:700,fontFamily:'Rajdhani',fontSize:16}}>{s.name}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>
                    <Clock size={11} style={{marginRight:4}}/>
                    {start.toLocaleString('vi-VN')} → {end.toLocaleString('vi-VN')}
                  </div>
                  {!s.targetAll && s.targetGameTypes?.length>0 && (
                    <div style={{marginTop:4,display:'flex',flexWrap:'wrap',gap:4}}>
                      {s.targetGameTypes.map(gt=><span key={gt} className="badge badge-accent" style={{fontSize:10}}>{gt}</span>)}
                    </div>
                  )}
                </div>
                <div style={{textAlign:'center',minWidth:80}}>
                  <div style={{fontSize:28,fontWeight:700,fontFamily:'Rajdhani',color:'#ff4757'}}>-{s.discount}%</div>
                  <div style={{fontSize:11,color:st.color,fontWeight:600}}>{st.label}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>toggleActive(s)}
                    style={{color:s.active?'var(--success)':'var(--text-muted)'}}>
                    {s.active?'Tắt':'Bật'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(s)}><Edit2 size={13}/></button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>handleDelete(s.id,s.name)}
                    style={{color:'var(--danger)'}}><Trash2 size={13}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminFlashSales;

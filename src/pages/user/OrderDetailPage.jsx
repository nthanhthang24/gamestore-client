// src/pages/user/OrderDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Shield, Download, Copy, CheckCircle, Clock, AlertTriangle, MessageSquare, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

const copyText = (t) => { navigator.clipboard.writeText(t); toast.success('Đã copy!',TS); };

const OrderDetailPage = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tickets, setTickets]   = useState([]);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ type:'warranty', description:'' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadOrder();
  }, [id, currentUser]);

  const loadOrder = async () => {
    try {
      const snap = await getDoc(doc(db,'orders',id));
      if (!snap.exists() || snap.data().userId !== currentUser.uid) {
        navigate('/orders'); return;
      }
      setOrder({ id:snap.id, ...snap.data() });
      // load tickets for this order, sorted newest first
      const tSnap = await getDocs(query(
        collection(db,'tickets'),
        where('orderId','==',id),
        where('userId','==',currentUser.uid)
      ));
      setTickets(tSnap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
    } catch (err) {
      toast.error('Không thể tải đơn hàng. Vui lòng thử lại.', TS);
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleTicket = async () => {
    if (!ticketForm.description.trim()) { toast.error('Mô tả vấn đề không được trống',TS); return; }
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db,'tickets'),{
        orderId:   id,
        userId:    currentUser.uid,
        userEmail: currentUser.email,
        type:      ticketForm.type,
        description: ticketForm.description.trim(),
        status:    'open',
        items:     order.items?.map(i=>i.title)||[],
        total:     order.total,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTickets(p=>[...p,{ id:ref.id, ...ticketForm, status:'open', createdAt:new Date() }]);
      setShowTicket(false);
      setTicketForm({ type:'warranty', description:'' });
      toast.success('Đã gửi yêu cầu! Admin sẽ xử lý trong 24h.',{...TS,duration:5000});
    } catch(e) { toast.error('Lỗi gửi yêu cầu: '+e.message,TS); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}><div className="spinner"/></div>;
  if (!order)  return null;

  const createdAt = order.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—';
  const hasOpenTicket = tickets.some(t=>t.status==='open');
  // 24h warranty window
  const orderDate = order.createdAt?.toDate?.() || new Date(0);
  const inWarranty = (Date.now() - orderDate.getTime()) < 24*60*60*1000;

  const ticketStatusColor = { open:'var(--gold)', in_progress:'var(--accent)', resolved:'var(--success)', rejected:'var(--danger)' };
  const ticketStatusLabel = { open:'Đang chờ xử lý', in_progress:'Đang xử lý', resolved:'Đã giải quyết', rejected:'Từ chối' };

  return (
    <div className="page-wrapper" style={{padding:'30px 0 80px'}}>
      <div className="container" style={{maxWidth:760}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>navigate('/orders')}><ArrowLeft size={15}/> Đơn hàng</button>
          <h1 style={{fontFamily:'Rajdhani',fontSize:22,fontWeight:700,margin:0,color:'var(--accent)'}}>
            #{id.slice(-8).toUpperCase()}
          </h1>
          <span className="badge badge-success">✅ Hoàn thành</span>
        </div>

        {/* Order meta */}
        <div className="card" style={{padding:20,marginBottom:16,display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:12,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:4}}>Ngày mua</div>
            <div style={{fontWeight:600}}>{createdAt}</div>
          </div>
          <div>
            <div style={{fontSize:12,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:4}}>Tổng tiền</div>
            <div style={{fontWeight:700,fontSize:20,fontFamily:'Rajdhani',color:'var(--gold)'}}>{order.total?.toLocaleString('vi-VN')}đ</div>
          </div>
          <div>
            <div style={{fontSize:12,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:4}}>Bảo hành</div>
            <div style={{fontSize:13,color:inWarranty?'var(--success)':'var(--text-muted)',fontWeight:600}}>
              {inWarranty ? <><Shield size={13}/> Còn trong 24h</> : 'Đã hết bảo hành'}
            </div>
          </div>
          {order.discount > 0 && (
            <div>
              <div style={{fontSize:12,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:4}}>Đã giảm</div>
              <div style={{fontWeight:600,color:'var(--success)'}}>-{order.discount?.toLocaleString('vi-VN')}đ</div>
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
          {(order.items||[]).map((item,i) => (
            <div key={i} className="card" style={{padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{item.title}</div>
                  <span className="badge badge-accent" style={{fontSize:10,marginTop:4,display:'inline-block'}}>{item.gameType}</span>
                </div>
                <div style={{fontWeight:700,color:'var(--gold)',fontFamily:'Rajdhani',fontSize:18}}>{item.price?.toLocaleString('vi-VN')}đ</div>
              </div>

              {/* Credentials */}
              {item.loginUsername && (
                <div style={{background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.2)',borderRadius:8,padding:'12px 16px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div style={{color:'var(--accent)',fontWeight:700,fontSize:11,textTransform:'uppercase'}}>🔑 Thông tin đăng nhập</div>
                    <button onClick={()=>{
                      const parts = [];
                      if (item.loginUsername) parts.push(`Username: ${item.loginUsername}`);
                      if (item.loginPassword) parts.push(`Password: ${item.loginPassword}`);
                      if (item.loginEmail) parts.push(`Email: ${item.loginEmail}`);
                      if (item.loginNote) parts.push(`Ghi chú: ${item.loginNote}`);
                      copyText(parts.join('\n'));
                    }} style={{background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.3)',borderRadius:5,padding:'3px 10px',cursor:'pointer',fontSize:11,color:'var(--accent)',display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
                      <Copy size={11}/> Copy tất cả
                    </button>
                  </div>
                  <div style={{display:'grid',gap:8}}>
                    {[['Username',item.loginUsername],['Password',item.loginPassword],['Email',item.loginEmail],['Ghi chú',item.loginNote]]
                      .filter(([,v])=>v).map(([lbl,val])=>(
                        <div key={lbl} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <div>
                            <div style={{fontSize:11,color:'var(--text-muted)'}}>{lbl}</div>
                            <div style={{fontFamily:'monospace',fontWeight:600,color:lbl==='Password'?'var(--accent)':'inherit',fontSize:14}}>{val}</div>
                          </div>
                          {lbl!=='Ghi chú' && <button onClick={()=>copyText(val)} style={{background:'none',border:'1px solid var(--border)',borderRadius:5,padding:'3px 10px',cursor:'pointer',fontSize:11,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
                            <Copy size={11}/> Copy
                          </button>}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Attachment — new: content stored in Firestore; legacy: attachmentUrl */}
              {(item.attachmentContent || item.attachmentUrl) && (
                <div style={{background:'rgba(46,213,115,0.07)',border:'1px solid rgba(46,213,115,0.25)',borderRadius:8,padding:'12px 16px'}}>
                  <div style={{fontSize:11,color:'#2ed573',fontWeight:700,textTransform:'uppercase',marginBottom:8}}>📎 File thông tin tài khoản</div>
                  {item.attachmentContent ? (
                    // Tạo Blob download từ nội dung lưu trong Firestore
                    <button
                      onClick={() => {
                        const blob = new Blob([item.attachmentContent], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = item.attachmentName || 'thongtin.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#fff',cursor:'pointer',padding:'8px 16px',borderRadius:6,background:'rgba(46,213,115,0.2)',border:'1px solid rgba(46,213,115,0.4)',fontWeight:600}}
                    >
                      <Download size={14}/> Tải file: {item.attachmentName||'thongtin.txt'}
                    </button>
                  ) : (
                    // Legacy: URL từ Cloudinary
                    <a href={item.attachmentUrl} target="_blank" rel="noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#fff',textDecoration:'none',padding:'8px 16px',borderRadius:6,background:'rgba(46,213,115,0.2)',border:'1px solid rgba(46,213,115,0.4)',fontWeight:600}}>
                      <Download size={14}/> Tải file: {item.attachmentName||'thongtin.txt'}
                    </a>
                  )}
                </div>
              )}

              {!item.loginUsername && !item.attachmentContent && !item.attachmentUrl && (
                <div style={{fontSize:12,color:'var(--text-muted)',fontStyle:'italic'}}>Thông tin sẽ được admin liên hệ qua email.</div>
              )}
            </div>
          ))}
        </div>

        {/* Warranty / Refund request */}
        <div className="card" style={{padding:20,marginBottom:16}}>
          <h3 style={{fontFamily:'Rajdhani',fontSize:16,fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <Shield size={16} style={{color:'var(--success)'}}/> Bảo hành & Hỗ trợ
          </h3>

          {tickets.length > 0 && (
            <div style={{marginBottom:16,display:'flex',flexDirection:'column',gap:8}}>
              {tickets.map(t=>(
                <div key={t.id} style={{padding:'10px 14px',background:'var(--bg-primary)',borderRadius:8,border:'1px solid var(--border)',fontSize:13}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontWeight:600}}>{t.type==='warranty'?'🛡️ Bảo hành':t.type==='refund'?'💰 Hoàn tiền':'💬 Hỗ trợ'}</span>
                    <span style={{color:ticketStatusColor[t.status]||'var(--text-muted)',fontSize:12,fontWeight:600}}>
                      {ticketStatusLabel[t.status]||t.status}
                    </span>
                  </div>
                  <div style={{color:'var(--text-secondary)',fontSize:12}}>{t.description}</div>
                  {t.adminReply && (
                    <div style={{marginTop:8,padding:'8px 12px',background:'rgba(0,212,255,0.06)',borderRadius:6,fontSize:12,borderLeft:'2px solid var(--accent)'}}>
                      <strong>Admin:</strong> {t.adminReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!showTicket ? (
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ setShowTicket(true); setTicketForm(p=>({...p,type:'warranty'})); }}
                disabled={!inWarranty || hasOpenTicket}
                title={!inWarranty?'Đã hết 24h bảo hành':hasOpenTicket?'Đã có ticket đang mở':''}>
                <Shield size={13}/> Yêu cầu bảo hành
              </button>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ setShowTicket(true); setTicketForm(p=>({...p,type:'refund'})); }}
                disabled={!inWarranty || hasOpenTicket}>
                <AlertTriangle size={13}/> Yêu cầu hoàn tiền
              </button>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ setShowTicket(true); setTicketForm(p=>({...p,type:'support'})); }}>
                <MessageSquare size={13}/> Liên hệ hỗ trợ
              </button>
              {!inWarranty && tickets.length===0 && (
                <span style={{fontSize:12,color:'var(--text-muted)',alignSelf:'center'}}>Đã hết 24h bảo hành. Vẫn có thể liên hệ hỗ trợ.</span>
              )}
            </div>
          ) : (
            <div>
              <div className="form-group" style={{marginBottom:12}}>
                <label className="form-label">Loại yêu cầu</label>
                <select className="form-select" value={ticketForm.type} onChange={e=>setTicketForm(p=>({...p,type:e.target.value}))}>
                  <option value="warranty">🛡️ Bảo hành (account lỗi)</option>
                  <option value="refund">💰 Hoàn tiền</option>
                  <option value="support">💬 Hỗ trợ khác</option>
                </select>
              </div>
              <div className="form-group" style={{marginBottom:12}}>
                <label className="form-label">Mô tả vấn đề *</label>
                <textarea className="form-textarea" rows="3"
                  value={ticketForm.description} onChange={e=>setTicketForm(p=>({...p,description:e.target.value}))}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."/>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-primary btn-sm" onClick={handleTicket} disabled={submitting}>
                  {submitting?'Đang gửi...':'Gửi yêu cầu'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setShowTicket(false)}>Huỷ</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;

// src/pages/user/OrderDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Shield, Download, Copy, CheckCircle, Clock, AlertTriangle, MessageSquare, Package, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

const copyText = (t) => { navigator.clipboard.writeText(t); toast.success('Đã copy!',TS); };

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://gamestore-server-i20i.onrender.com';

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
  const [retrying, setRetrying] = useState(false);
  // autoRetryCount: số lần đã auto-retry (silent), dùng để backoff
  const autoRetryCount = React.useRef(0);

  useEffect(() => {
    if (!currentUser) return;
    // Realtime listener — tự update khi server inject credentials xong
    const unsub = onSnapshot(doc(db, 'orders', id), (snap) => {
      if (!snap.exists() || snap.data().userId !== currentUser.uid) {
        navigate('/orders'); return;
      }
      setOrder({ id: snap.id, ...snap.data() });
    });
    // Load tickets một lần
    loadTickets();
    return () => unsub();
  }, [id, currentUser]);

  // callConfirm: gọi /checkout/confirm, trả về {ok, alreadyDone, error}
  const callConfirm = async () => {
    const idToken = await currentUser.getIdToken(true); // force refresh token
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40_000);
    try {
      const resp = await fetch(`${SERVER_URL}/bank/checkout/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: id }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        return { ok: true, alreadyDone: data.message === 'already_updated' };
      }
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error || `HTTP ${resp.status}` };
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') return { ok: false, error: 'timeout' };
      return { ok: false, error: 'network' };
    }
  };

  // reloadOrder: đọc lại order từ Firestore
  const reloadOrder = async () => {
    const snap = await getDoc(doc(db, 'orders', id));
    if (snap.exists()) { setOrder({ id: snap.id, ...snap.data() }); return snap.data(); }
    return null;
  };

  // manualRetry: user bấm "Thử lấy lại" — show đầy đủ toast
  const retryCredentialInject = async () => {
    setRetrying(true);
    try {
      // Check Firestore trước
      const orderData = await reloadOrder();
      if (orderData?._credentialsInjected) {
        toast.success('✅ Đã nhận thông tin đăng nhập!', TS);
        return;
      }
      const result = await callConfirm();
      if (result.ok) {
        await reloadOrder();
        toast.success('✅ Đã nhận thông tin đăng nhập!', TS);
      } else if (result.error === 'timeout') {
        toast.error('⚠️ Server đang khởi động (~30s), vui lòng thử lại.', { ...TS, duration: 7000 });
      } else if (result.error === 'network') {
        toast.error('Không có kết nối mạng. Kiểm tra internet rồi thử lại.', TS);
      } else {
        toast.error('Không thể lấy thông tin: ' + result.error, TS);
      }
    } catch (e) {
      toast.error('Lỗi xác thực: ' + e.message, TS);
    } finally {
      setRetrying(false);
    }
  };

  const loadTickets = async () => {
    try {
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
        orderId:     id,
        userId:      currentUser.uid,
        userEmail:   currentUser.email,
        userName:    order.userName || currentUser.email,
        type:        ticketForm.type,
        description: ticketForm.description.trim(),
        status:      'open',
        adminReply:  null,
        items:       order.items?.map(i=>i.title)||[],
        total:       order.total,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      });
      setTickets(p=>[...p,{ id:ref.id, ...ticketForm, status:'open', createdAt:new Date() }]);
      setShowTicket(false);
      setTicketForm({ type:'warranty', description:'' });
      toast.success('Đã gửi yêu cầu! Admin sẽ xử lý trong 24h.',{...TS,duration:5000});
    } catch(e) { toast.error('Lỗi gửi yêu cầu: '+e.message,TS); }
    finally { setSubmitting(false); }
  };

  const [expandedItems, setExpandedItems] = useState({});
  const toggleItem = (i) => setExpandedItems(p => ({ ...p, [i]: !p[i] }));

  // Auto-expand first item if only 1 item
  useEffect(() => {
    if (order && (order.items||[]).length === 1) setExpandedItems({ 0: true });
  }, [order?.id]);

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}>
      <div className="spinner"/>
    </div>
  );
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

        {/* Download all button — show when has credentials (1 item or multiple) */}
        {(order.items||[]).some(i => i.loginUsername || i.attachmentContent || (i.allCredentials?.length > 0)) && (() => {
          const downloadAll = () => {
            const lines = [];
            (order.items||[]).forEach((item, itemIdx) => {
              // allCredentials = tất cả accounts trong combo, fallback về slot đơn lẻ
              const creds = item.allCredentials?.length
                ? item.allCredentials
                : (item.loginUsername || item.attachmentContent ? [item] : []);
              if (!creds.length) return;
              if ((order.items||[]).length > 1) {
                lines.push(`========== Sản phẩm ${itemIdx + 1}: ${item.title} ==========`);
              }
              creds.forEach((c, ci) => {
                if (creds.length > 1) lines.push(`--- Account ${ci + 1}/${creds.length} ---`);
                if (c.loginUsername) lines.push(`Username : ${c.loginUsername}`);
                if (c.loginPassword) lines.push(`Password : ${c.loginPassword}`);
                if (c.loginEmail)    lines.push(`Email    : ${c.loginEmail}`);
                if (c.loginNote)     lines.push(`Ghi chú  : ${c.loginNote}`);
                if (c.attachmentContent) {
                  lines.push(`--- File đính kèm (${c.attachmentName || 'thongtin.txt'}) ---`);
                  lines.push(c.attachmentContent);
                  lines.push('--- Kết thúc file đính kèm ---');
                }
                lines.push('');
              });
            });
            const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `don-hang-${id.slice(-8).toUpperCase()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          };
          return (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,padding:'10px 16px',background:'rgba(0,212,255,0.06)',borderRadius:10,border:'1px solid rgba(0,212,255,0.2)'}}>
              <span style={{fontSize:13,color:'var(--text-secondary)'}}>
                <strong style={{color:'var(--accent)'}}>
                  {(order.items||[]).reduce((sum,i) => sum + (i.allCredentials?.length || (i.loginUsername ? 1 : 0)), 0)} tài khoản
                </strong> trong đơn hàng này
              </span>
              <button onClick={downloadAll}
                style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'#fff',cursor:'pointer',padding:'6px 14px',borderRadius:6,background:'rgba(0,212,255,0.18)',border:'1px solid rgba(0,212,255,0.4)',fontWeight:600,whiteSpace:'nowrap'}}>
                <Download size={13}/> Tải tất cả (.txt)
              </button>
            </div>
          );
        })()}

        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
          {(order.items||[]).map((item,i) => {
            const isExpanded = expandedItems[i] ?? ((order.items||[]).length === 1);
            const copyAll = () => {
              const parts = [];
              if (item.loginUsername) parts.push(`Username: ${item.loginUsername}`);
              if (item.loginPassword) parts.push(`Password: ${item.loginPassword}`);
              if (item.loginEmail)    parts.push(`Email: ${item.loginEmail}`);
              if (item.loginNote)     parts.push(`Ghi chú: ${item.loginNote}`);
              copyText(parts.join('\n'));
            };
            return (
              <div key={i} className="card" style={{padding:0,overflow:'hidden'}}>
                {/* Row header — click to expand */}
                <div onClick={()=>toggleItem(i)}
                  style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',cursor:'pointer',userSelect:'none',
                    background: isExpanded ? 'rgba(0,212,255,0.06)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid rgba(0,212,255,0.15)' : 'none',
                  }}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {(order.items||[]).length > 1 && (
                      <span style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',background:'rgba(255,255,255,0.07)',padding:'2px 7px',borderRadius:4,flexShrink:0,fontFamily:'monospace'}}>
                        #{i+1}
                      </span>
                    )}
                    <div>
                      <div style={{fontWeight:600,fontSize:14}}>{item.title}</div>
                      <span className="badge badge-accent" style={{fontSize:10,marginTop:2,display:'inline-block'}}>{item.gameType}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {item.loginUsername && !isExpanded && (
                      <span style={{fontSize:11,color:'var(--success)',fontFamily:'monospace',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {item.loginUsername}
                      </span>
                    )}
                    <div style={{fontWeight:700,color: item.originalPrice && item.price < item.originalPrice ? '#ff4757' : 'var(--gold)',fontFamily:'Rajdhani',fontSize:15,whiteSpace:'nowrap'}}>
                        {item.price?.toLocaleString('vi-VN')}đ
                        {/* ✅ FIX UX-13: show original price + savings if was on sale */}
                        {item.originalPrice && item.price < item.originalPrice && (
                          <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap',marginTop:2}}>
                            <span style={{textDecoration:'line-through',color:'var(--text-muted)',fontSize:11,fontWeight:400}}>
                              {item.originalPrice?.toLocaleString('vi-VN')}đ
                            </span>
                            <span style={{fontSize:10,background:'rgba(255,71,87,0.15)',color:'#ff4757',
                              borderRadius:3,padding:'1px 4px',fontWeight:700,border:'1px solid rgba(255,71,87,0.3)'}}>
                              🔥 Tiết kiệm {(item.originalPrice - item.price).toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        )}
                      </div>
                    {isExpanded ? <ChevronUp size={14} style={{color:'var(--text-muted)',flexShrink:0}}/> : <ChevronDown size={14} style={{color:'var(--text-muted)',flexShrink:0}}/>}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{padding:'14px 16px'}}>
                    {/* Render từng account trong combo */}
                    {(() => {
                      const creds = item.allCredentials?.length
                        ? item.allCredentials
                        : (item.loginUsername || item.attachmentContent ? [item] : []);
                      if (!creds.length) return null;
                      return creds.map((c, ci) => (
                        <div key={ci} style={{marginBottom: creds.length > 1 ? 10 : 0}}>
                          {creds.length > 1 && (
                            <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:700,marginBottom:6,padding:'4px 8px',background:'rgba(255,255,255,0.04)',borderRadius:4,display:'inline-block'}}>
                              Account {ci + 1} / {creds.length}
                            </div>
                          )}
                          {c.loginUsername && (
                            <div style={{background:'rgba(0,212,255,0.06)',border:'1px solid rgba(0,212,255,0.2)',borderRadius:8,padding:'12px 16px',marginBottom:8}}>
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                                <div style={{color:'var(--accent)',fontWeight:700,fontSize:11,textTransform:'uppercase'}}>🔑 Thông tin đăng nhập</div>
                                <button onClick={()=>{
                                  const parts=[];
                                  if(c.loginUsername) parts.push(`Username: ${c.loginUsername}`);
                                  if(c.loginPassword) parts.push(`Password: ${c.loginPassword}`);
                                  if(c.loginEmail)    parts.push(`Email: ${c.loginEmail}`);
                                  if(c.loginNote)     parts.push(`Ghi chú: ${c.loginNote}`);
                                  copyText(parts.join('\n'));
                                }} style={{background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.3)',borderRadius:5,padding:'3px 10px',cursor:'pointer',fontSize:11,color:'var(--accent)',display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
                                  <Copy size={11}/> Copy
                                </button>
                              </div>
                              <div style={{display:'grid',gap:8}}>
                                {[['Username',c.loginUsername],['Password',c.loginPassword],['Email',c.loginEmail],['Ghi chú',c.loginNote]]
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
                                  ))}
                              </div>
                            </div>
                          )}
                          {(c.attachmentContent || c.attachmentUrl) && (
                            <div style={{background:'rgba(46,213,115,0.07)',border:'1px solid rgba(46,213,115,0.25)',borderRadius:8,padding:'12px 16px',marginBottom:8}}>
                              <div style={{fontSize:11,color:'#2ed573',fontWeight:700,textTransform:'uppercase',marginBottom:8}}>📎 File đính kèm</div>
                              {c.attachmentContent ? (
                                <button onClick={()=>{
                                  const blob = new Blob([c.attachmentContent],{type:'text/plain;charset=utf-8'});
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a'); a.href=url; a.download=c.attachmentName||'thongtin.txt'; a.click();
                                  URL.revokeObjectURL(url);
                                }} style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#fff',cursor:'pointer',padding:'8px 16px',borderRadius:6,background:'rgba(46,213,115,0.2)',border:'1px solid rgba(46,213,115,0.4)',fontWeight:600}}>
                                  <Download size={14}/> Tải: {c.attachmentName||'thongtin.txt'}
                                </button>
                              ) : (
                                <a href={c.attachmentUrl} target="_blank" rel="noreferrer"
                                  style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'#fff',textDecoration:'none',padding:'8px 16px',borderRadius:6,background:'rgba(46,213,115,0.2)',border:'1px solid rgba(46,213,115,0.4)',fontWeight:600}}>
                                  <Download size={14}/> Tải: {c.attachmentName||'thongtin.txt'}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                    {!item.loginUsername && !item.attachmentContent && !item.attachmentUrl && !(item.allCredentials?.length > 0) && (
                      order?._credentialsInjected
                        ? (
                          // Đã inject nhưng slot này không có credentials — slot rỗng
                          <div style={{background:'rgba(100,100,100,0.08)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 16px'}}>
                            <div style={{fontSize:13,color:'var(--text-muted)'}}>
                              ⚠️ Slot này chưa có thông tin đăng nhập. Vui lòng liên hệ hỗ trợ.
                            </div>
                          </div>
                        ) : (
                          // Chưa inject — đang chờ server
                          <div style={{background:'rgba(255,165,0,0.08)',border:'1px solid rgba(255,165,0,0.35)',borderRadius:8,padding:'12px 16px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,color:'var(--gold)',fontWeight:700,fontSize:13,marginBottom:6}}>
                              <Clock size={14}/>
                              {retrying ? 'Đang lấy thông tin...' : 'Đang chờ thông tin đăng nhập...'}
                            </div>
                            <div style={{fontSize:12,color:'var(--text-secondary)',lineHeight:1.6,marginBottom:10}}>
                              {retrying
                                ? 'Server đang xử lý, vui lòng chờ.'
                                : 'Server đang xử lý. Thường mất 5–30 giây. Nếu chờ lâu hơn, bấm "Thử lấy lại".'}
                            </div>
                            <button
                              onClick={retryCredentialInject}
                              disabled={retrying}
                              style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:600,
                                padding:'6px 14px',borderRadius:6,border:'1px solid rgba(255,165,0,0.5)',
                                background:'rgba(255,165,0,0.12)',color:'var(--gold)',cursor:retrying?'not-allowed':'pointer'}}
                            >
                              {retrying
                                ? <><span className="spinner" style={{width:12,height:12,borderWidth:2}}/> Đang lấy...</>
                                : '🔄 Thử lấy lại thông tin'}
                            </button>
                          </div>
                        )
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

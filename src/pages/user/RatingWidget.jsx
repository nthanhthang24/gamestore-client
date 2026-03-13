// src/pages/user/RatingWidget.jsx  — reusable rating widget
import React, { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, onSnapshot,
  serverTimestamp, orderBy, doc, getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

// Star rating input
const StarInput = ({ value, onChange, size=20 }) => (
  <div style={{display:'flex',gap:4}}>
    {[1,2,3,4,5].map(n => (
      <Star key={n} size={size} fill={n<=value?'var(--gold)':'none'}
        stroke={n<=value?'var(--gold)':'var(--text-muted)'}
        style={{cursor:'pointer',transition:'transform .15s'}}
        onClick={()=>onChange(n)}
        onMouseEnter={e=>e.currentTarget.style.transform='scale(1.2)'}
        onMouseLeave={e=>e.currentTarget.style.transform=''}/>
    ))}
  </div>
);

export const RatingWidget = ({ accountId, currentUser, onCountChange }) => {
  const [ratings, setRatings]   = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ stars: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [canRate, setCanRate]   = useState(false);

  // ✅ Realtime ratings via onSnapshot
  useEffect(() => {
    setLoading(true);
    let unsub;
    try {
      unsub = onSnapshot(
        query(collection(db,'ratings'), where('accountId','==',accountId), orderBy('createdAt','desc')),
        (snap) => {
          const list = snap.docs.map(d=>({id:d.id,...d.data()}));
          setRatings(list);
          if (currentUser) setMyRating(list.find(r=>r.userId===currentUser.uid)||null);
          setLoading(false);
          onCountChange?.(list.length); // notify parent for tab badge
        },
        (err) => {
          // Fallback without orderBy if index missing
          getDocs(query(collection(db,'ratings'), where('accountId','==',accountId)))
            .then(snap => {
              const list = snap.docs.map(d=>({id:d.id,...d.data()}))
                .sort((a,b)=>(b.createdAt?.toDate?.()??0)-(a.createdAt?.toDate?.()??0));
              setRatings(list);
              if (currentUser) setMyRating(list.find(r=>r.userId===currentUser.uid)||null);
              onCountChange?.(list.length);
            }).finally(()=>setLoading(false));
        }
      );
    } catch { setLoading(false); }
    return () => unsub?.();
  }, [accountId, currentUser?.uid]);

  const loadRatings = () => {}; // no-op: replaced by onSnapshot

  // ATK-14 FIX: track orderId as proof of purchase — embedded in rating doc
  const [purchaseOrderId, setPurchaseOrderId] = useState(null);

  useEffect(() => {
    // Check if user bought this account (can only rate after purchase)
    if (!currentUser) { setCanRate(false); return; }
    getDocs(query(collection(db,'orders'), where('userId','==',currentUser.uid)))
      .then(snap => {
        const matchingOrder = snap.docs.find(d =>
          (d.data().items||[]).some(i => i.id === accountId)
        );
        setCanRate(!!matchingOrder);
        if (matchingOrder) setPurchaseOrderId(matchingOrder.id);
      }).catch(()=>{});
  }, [accountId, currentUser?.uid]);

  const handleSubmit = async () => {
    if (!form.comment.trim()) { toast.error('Viết nhận xét để gửi đánh giá', TS); return; }
    // FIX ATK-14: verify purchase before submit — not just UI state
    if (!purchaseOrderId) {
      toast.error('Bạn cần mua sản phẩm trước khi đánh giá.', TS);
      return;
    }
    setSubmitting(true);
    try {
      // Re-verify order in Firestore right before writing (defense-in-depth)
      const { getDoc, doc: _doc } = await import('firebase/firestore');
      const orderSnap = await getDoc(_doc(db, 'orders', purchaseOrderId));
      if (!orderSnap.exists() ||
          orderSnap.data().userId !== currentUser.uid ||
          !(orderSnap.data().items||[]).some(i => i.id === accountId)) {
        toast.error('Không thể xác nhận đơn hàng. Vui lòng thử lại.', TS);
        return;
      }
      // FIX V12: Dùng setDoc với composite docId (userId_accountId) thay vì addDoc
      // → Firestore đảm bảo mỗi user chỉ có 1 rating cho mỗi account (unique constraint)
      // → Attacker không thể spam addDoc nhiều lần — setDoc sẽ overwrite doc cũ
      const ratingDocId = `${currentUser.uid}_${accountId}`;
      await setDoc(doc(db, 'ratings', ratingDocId), {
        accountId,
        userId:      currentUser.uid,
        userEmail:   currentUser.email,
        displayName: currentUser.displayName || currentUser.email.split('@')[0],
        stars:       form.stars,
        comment:     form.comment.trim().slice(0, 500),
        orderId:     purchaseOrderId, // proof of purchase
        createdAt:   serverTimestamp(),
      });
      toast.success('✅ Đã gửi đánh giá!', TS);
      setShowForm(false);
      setForm({ stars:5, comment:'' });
      loadRatings();
    } catch(e) { toast.error('Lỗi: '+e.message, TS); }
    finally { setSubmitting(false); }
  };

  const avg = ratings.length
    ? (ratings.reduce((s,r)=>s+r.stars,0)/ratings.length).toFixed(1)
    : null;

  const dist = [5,4,3,2,1].map(s=>({ s, n: ratings.filter(r=>r.stars===s).length }));

  return (
    <div style={{marginTop:32}}>
      <h3 style={{fontFamily:'Rajdhani',fontSize:20,fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
        <Star size={18} fill="var(--gold)" stroke="var(--gold)"/> Đánh giá & Nhận xét
      </h3>

      {/* Summary */}
      {ratings.length > 0 && (
        <div style={{display:'flex',gap:24,marginBottom:24,padding:20,background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)',flexWrap:'wrap'}}>
          <div style={{textAlign:'center',minWidth:80}}>
            <div style={{fontSize:48,fontWeight:800,fontFamily:'Rajdhani',color:'var(--gold)',lineHeight:1}}>{avg}</div>
            <div style={{display:'flex',gap:2,justifyContent:'center',marginTop:4}}>
              {[1,2,3,4,5].map(n=><Star key={n} size={14} fill={n<=Math.round(avg)?'var(--gold)':'none'} stroke={n<=Math.round(avg)?'var(--gold)':'var(--text-muted)'}/>)}
            </div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{ratings.length} đánh giá</div>
          </div>
          <div style={{flex:1,minWidth:160}}>
            {dist.map(({s,n})=>(
              <div key={s} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontSize:12,width:8}}>{s}</span>
                <Star size={11} fill="var(--gold)" stroke="var(--gold)"/>
                <div style={{flex:1,height:6,background:'var(--bg-primary)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',background:'var(--gold)',width:`${ratings.length?n/ratings.length*100:0}%`,borderRadius:4}}/>
                </div>
                <span style={{fontSize:11,color:'var(--text-muted)',width:16,textAlign:'right'}}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write review */}
      {canRate && !myRating && !showForm && (
        <button className="btn btn-ghost btn-sm" style={{marginBottom:20}} onClick={()=>setShowForm(true)}>
          ⭐ Viết đánh giá
        </button>
      )}
      {myRating && (
        <div style={{marginBottom:16,padding:'10px 14px',background:'rgba(0,212,255,0.06)',borderRadius:8,fontSize:13,color:'var(--accent)'}}>
          ✅ Bạn đã đánh giá sản phẩm này ({myRating.stars}⭐)
        </div>
      )}
      {showForm && (
        <div style={{marginBottom:24,padding:20,background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--accent)'}}>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Đánh giá của bạn</div>
            <StarInput value={form.stars} onChange={s=>setForm(p=>({...p,stars:s}))} size={24}/>
          </div>
          <textarea className="form-textarea" rows="3" placeholder="Chia sẻ trải nghiệm của bạn về tài khoản này..."
            value={form.comment} onChange={e=>setForm(p=>({...p,comment:e.target.value}))} style={{marginBottom:12}}/>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting}>
              {submitting?'Đang gửi...':'Gửi đánh giá'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Huỷ</button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {loading ? <div className="spinner"/> : ratings.length === 0 ? (
        <div style={{color:'var(--text-muted)',fontSize:13,textAlign:'center',padding:32}}>
          Chưa có đánh giá nào. {canRate ? 'Hãy là người đầu tiên!' : ''}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {ratings.map(r=>(
            <div key={r.id} style={{padding:'14px 18px',background:'var(--bg-card)',borderRadius:10,border:'1px solid var(--border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <span style={{fontWeight:700,fontSize:14}}>{r.displayName}</span>
                  <div style={{display:'flex',gap:2,marginTop:3}}>
                    {[1,2,3,4,5].map(n=><Star key={n} size={12} fill={n<=r.stars?'var(--gold)':'none'} stroke={n<=r.stars?'var(--gold)':'var(--border)'}/>)}
                  </div>
                </div>
                <span style={{fontSize:11,color:'var(--text-muted)'}}>
                  {r.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')||''}
                </span>
              </div>
              <p style={{margin:0,fontSize:13,color:'var(--text-secondary)',lineHeight:1.6}}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RatingWidget;

// src/pages/user/ReferralPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, getDoc, updateDoc,
  serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useSEO } from '../../hooks/useSEO';
import { Copy, Gift, Users, TrendingUp, Link as LinkIcon, Percent, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

// Defaults — overridden by Firestore settings/global
const DEFAULT_COMMISSION_PCT = 2;
const DEFAULT_MIN_TOPUP      = 50000;
const DEFAULT_NEW_USER_BONUS = 10000;

const ReferralPage = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refCode, setRefCode]     = useState('');
  // ✅ Load referral config từ settings/global
  const [commissionPct, setCommissionPct]   = useState(DEFAULT_COMMISSION_PCT);
  const [minTopup, setMinTopup]             = useState(DEFAULT_MIN_TOPUP);
  const [newUserBonus, setNewUserBonus]     = useState(DEFAULT_NEW_USER_BONUS);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'global')).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.referralCommissionPct != null) setCommissionPct(d.referralCommissionPct);
        if (d.referralMinTopup      != null) setMinTopup(d.referralMinTopup);
        if (d.referralNewUserBonus  != null) setNewUserBonus(d.referralNewUserBonus);
      }
    }).catch(() => {});
  }, []);

  useSEO({ title: 'Giới thiệu bạn bè', description: `Giới thiệu bạn bè nhận ${commissionPct}% hoa hồng` });

  useEffect(() => {
    if (!currentUser) return;
    const code = currentUser.uid.slice(0,8).toUpperCase();
    setRefCode(code);
    setLoading(true);
    let unsub;
    try {
      unsub = onSnapshot(
        query(collection(db,'referrals'), where('refCode','==',code)),
        (snap) => { setReferrals(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
        () => setLoading(false)
      );
    } catch(e) { console.error(e); setLoading(false); }
    return () => unsub?.();
  }, [currentUser?.uid]);

  const refLink = `${window.location.origin}/register?ref=${refCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    toast.success('Đã copy link giới thiệu!', TS);
  };

  const credited = referrals.filter(r=>r.credited).length;
  // ✅ Sum actual commission amounts stored in each referral doc (or estimate from %)
  const totalEarned = referrals
    .filter(r => r.credited)
    .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

  return (
    <div className="page-wrapper" style={{padding:'30px 0 80px'}}>
      <div className="container" style={{maxWidth:720}}>
        <h1 style={{fontFamily:'Rajdhani',fontSize:28,fontWeight:700,marginBottom:6,display:'flex',alignItems:'center',gap:10}}>
          <Gift size={24} style={{color:'var(--gold)'}}/> Giới thiệu bạn bè
        </h1>
        <p style={{color:'var(--text-muted)',marginBottom:28,fontSize:14}}>
          Mỗi bạn bè nạp tiền lần đầu (≥ <strong style={{color:'var(--accent)'}}>{minTopup.toLocaleString('vi-VN')}đ</strong>) →
          bạn nhận <strong style={{color:'var(--gold)'}}>{commissionPct}%</strong> hoa hồng trên số tiền họ nạp
        </p>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
          {[
            { icon:<Users size={20}/>, label:'Đã giới thiệu', value: referrals.length, color:'var(--accent)' },
            { icon:<TrendingUp size={20}/>, label:'Đã xác nhận', value: credited, color:'var(--success)' },
            { icon:<Gift size={20}/>, label:'Tổng thưởng', value: totalEarned.toLocaleString('vi-VN')+'đ', color:'var(--gold)' },
          ].map(s => (
            <div key={s.label} className="card" style={{padding:'18px 20px',textAlign:'center'}}>
              <div style={{color:s.color,marginBottom:8}}>{s.icon}</div>
              <div style={{fontFamily:'Rajdhani',fontSize:22,fontWeight:700,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className="card" style={{padding:20,marginBottom:24}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>
            Link giới thiệu của bạn
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{flex:1,background:'var(--bg-primary)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',
              fontFamily:'monospace',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>
              {refLink}
            </div>
            <button className="btn btn-primary btn-sm" onClick={copyLink} style={{flexShrink:0}}>
              <Copy size={13}/> Copy link
            </button>
          </div>
          <div style={{marginTop:12,padding:'10px 14px',background:'rgba(0,212,255,0.06)',borderRadius:8,fontSize:12,color:'var(--text-secondary)'}}>
            <strong>Mã của bạn:</strong> <code style={{fontFamily:'monospace',fontSize:14,color:'var(--accent)',fontWeight:700}}>{refCode}</code>
            <br/>Bạn bè nhập mã này khi đăng ký sẽ nhận thêm <strong style={{color:'var(--gold)'}}>{newUserBonus.toLocaleString('vi-VN')}đ</strong>
          </div>
        </div>

        {/* How it works */}
        <div className="card" style={{padding:20,marginBottom:24}}>
          <h3 style={{fontFamily:'Rajdhani',fontSize:16,fontWeight:700,marginBottom:16}}>📋 Cách hoạt động</h3>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              ['1', 'Copy link giới thiệu và chia sẻ cho bạn bè'],
              ['2', 'Bạn bè đăng ký tài khoản mới qua link của bạn'],
              ['3', `Bạn bè nạp tiền lần đầu (≥ ${minTopup.toLocaleString('vi-VN')}đ)`],
              ['4', `Bạn nhận ${commissionPct}% hoa hồng · Bạn bè nhận ${newUserBonus.toLocaleString('vi-VN')}đ`],
            ].map(([n, text]) => (
              <div key={n} style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'var(--accent)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{n}</div>
                <div style={{fontSize:13,color:'var(--text-secondary)',paddingTop:3}}>{text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Commission rate info card */}
        <div className="card" style={{padding:'16px 20px',marginBottom:16,display:'flex',gap:16,flexWrap:'wrap',alignItems:'center',
          background:'linear-gradient(135deg,rgba(0,212,255,0.05),rgba(255,215,0,0.05))',
          border:'1px solid rgba(255,215,0,0.2)'}}>
          <div style={{display:'flex',gap:20,flex:1,flexWrap:'wrap'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'Rajdhani',fontSize:28,fontWeight:800,color:'var(--gold)',lineHeight:1}}>{commissionPct}%</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>hoa hồng</div>
            </div>
            <div style={{width:1,background:'var(--border)'}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'Rajdhani',fontSize:22,fontWeight:700,color:'var(--accent)',lineHeight:1}}>{minTopup.toLocaleString('vi-VN')}đ</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>nạp tối thiểu lần đầu</div>
            </div>
            <div style={{width:1,background:'var(--border)'}}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'Rajdhani',fontSize:22,fontWeight:700,color:'var(--success)',lineHeight:1}}>{newUserBonus.toLocaleString('vi-VN')}đ</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>thưởng người mới</div>
            </div>
          </div>
          <div style={{fontSize:12,color:'var(--text-secondary)',maxWidth:220,lineHeight:1.6}}>
            Bạn bè nạp <strong>100.000đ</strong> → bạn nhận{' '}
            <strong style={{color:'var(--gold)'}}>{Math.round(commissionPct/100*100000).toLocaleString('vi-VN')}đ</strong>.
            Nạp <strong>500.000đ</strong> → nhận{' '}
            <strong style={{color:'var(--gold)'}}>{Math.round(commissionPct/100*500000).toLocaleString('vi-VN')}đ</strong>.
          </div>
        </div>

        {/* Referral history */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',fontFamily:'Rajdhani',fontSize:15,fontWeight:700}}>
            Lịch sử giới thiệu
          </div>
          {loading ? (
            <div style={{padding:40,textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
          ) : referrals.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
              Chưa có ai đăng ký qua link của bạn
            </div>
          ) : (
            <table className="admin-table">
              <thead><tr><th>Email</th><th>Ngày đăng ký</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {referrals.map(r=>(
                  <tr key={r.id}>
                    <td style={{fontSize:13}}>{r.newUserEmail||'—'}</td>
                    <td style={{fontSize:12,color:'var(--text-muted)'}}>
                      {r.createdAt?.toDate?.()?.toLocaleDateString('vi-VN')||'—'}
                    </td>
                    <td>
                      {r.credited
                        ? <span style={{color:'var(--success)',fontSize:12,fontWeight:600}}>
                            ✅ +{(r.commissionAmount || 0).toLocaleString('vi-VN')}đ
                            {r.topupAmount && <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:4}}>({commissionPct}% của {r.topupAmount.toLocaleString('vi-VN')}đ)</span>}
                          </span>
                        : <span style={{color:'var(--gold)',fontSize:12}}>⏳ Chờ bạn bè nạp tiền</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;

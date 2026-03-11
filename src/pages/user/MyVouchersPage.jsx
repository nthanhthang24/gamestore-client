// src/pages/user/MyVouchersPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Tag, Copy, Calendar, Percent, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './MyVouchersPage.css';

const TOAST_STYLE = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

const MyVouchersPage = () => {
  const { currentUser } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    // Firestore doesn't support OR queries → subscribe to all active and filter
    let allData = [], privateData = [];
    const process = () => {
      const privateIds = new Set(privateData.map(d => d.id));
      const now = new Date();
      const valid = [...allData].map(d => {
        const isPublic = !d.targetUserId || d.targetUserId === '';
        const isPersonal = d.targetUserId === currentUser.email;
        if (!isPublic && !isPersonal) return null;
        return { ...d, isPersonal };
      }).filter(Boolean).filter(v => {
        if (v.usedCount >= v.usageLimit) return false;
        if (v.expiresAt) {
          const exp = v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt);
          if (exp < now) return false;
        }
        return true;
      });
      setVouchers(valid);
      setLoading(false);
    };
    const unsub1 = onSnapshot(
      query(collection(db,'vouchers'), where('active','==',true)),
      (snap) => { allData = snap.docs.map(d=>({id:d.id,...d.data()})); process(); },
      () => setLoading(false)
    );
    const unsub2 = onSnapshot(
      query(collection(db,'vouchers'), where('active','==',true), where('targetUserId','==',currentUser.email)),
      (snap) => { privateData = snap.docs.map(d=>({id:d.id,...d.data()})); process(); },
      () => {}
    );
    return () => { unsub1(); unsub2(); };
  }, [currentUser]);

  const fetchMyVouchers = () => {}; // no-op: replaced by onSnapshot

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Đã copy mã: ' + code, TOAST_STYLE);
  };

  const isExpired = (v) => {
    if (!v.expiresAt) return false;
    const d = v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt);
    return d < new Date();
  };

  const formatExpiry = (v) => {
    if (!v.expiresAt) return 'Không hạn';
    const d = v.expiresAt?.toDate ? v.expiresAt.toDate() : new Date(v.expiresAt);
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <div className="my-vouchers-page page-wrapper">
      <div className="container">
        <h1 className="section-title" style={{ marginBottom: 28 }}>
          <Tag size={24} /> Voucher của tôi
        </h1>

        {loading ? (
          <div className="mv-loading">Đang tải voucher...</div>
        ) : vouchers.length === 0 ? (
          <div className="mv-empty card">
            <div className="mv-empty-icon">🎟️</div>
            <h3>Bạn chưa có voucher nào</h3>
            <p>Theo dõi các chương trình khuyến mãi để nhận voucher!</p>
          </div>
        ) : (
          <div className="mv-grid">
            {vouchers.map(v => (
              <div key={v.id} className={`mv-item ${isExpired(v) ? 'mv-expired' : ''} ${v.isPersonal ? 'mv-personal' : ''}`}>
                <div className="mv-left">
                  <div className="mv-icon-wrap">
                    <Tag size={22} />
                  </div>
                </div>
                <div className="mv-content">
                  <div className="mv-header-row">
                    <span className="mv-code">{v.code}</span>
                    {v.isPersonal && <span className="mv-personal-badge">🎁 Riêng cho bạn</span>}
                  </div>
                  <div className="mv-value">
                    {v.type === 'percent' ? (
                      <><Percent size={14} /> Giảm {v.value}%{v.maxDiscount > 0 ? ` (tối đa ${v.maxDiscount.toLocaleString('vi-VN')}đ)` : ''}</>
                    ) : (
                      <>Giảm {v.value.toLocaleString('vi-VN')}đ</>
                    )}
                  </div>
                  {v.description && <div className="mv-desc">{v.description}</div>}
                  <div className="mv-footer">
                    {v.minOrder > 0 && <span className="mv-cond"><AlertCircle size={11} /> Đơn tối thiểu {v.minOrder.toLocaleString('vi-VN')}đ</span>}
                    <span className="mv-expiry">
                      {isExpired(v)
                        ? <><AlertCircle size={11} style={{ color: 'var(--danger)' }} /> Hết hạn</>
                        : <><Clock size={11} /> {formatExpiry(v)}</>
                      }
                    </span>
                    <span className="mv-used">{v.usedCount}/{v.usageLimit} lượt</span>
                  </div>
                </div>
                <div className="mv-actions">
                  <button className="mv-copy-btn" onClick={() => copyCode(v.code)}>
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <div className="mv-dash" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVouchersPage;

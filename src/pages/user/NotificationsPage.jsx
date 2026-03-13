// src/pages/user/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, arrayUnion
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Bell, CheckCheck, Info, Zap, CheckCircle, AlertTriangle, ArrowLeft, Ticket, Shield, Package } from 'lucide-react';

const TYPE_CONFIG = {
  info:     { label: 'Thông tin',   color: 'var(--accent)',  bg: 'rgba(0,212,255,0.07)',   icon: <Info size={16}/> },
  success:  { label: 'Tốt lành',   color: 'var(--success)', bg: 'rgba(34,197,94,0.07)',   icon: <CheckCircle size={16}/> },
  warning:  { label: 'Cảnh báo',   color: 'var(--gold)',    bg: 'rgba(234,179,8,0.07)',   icon: <AlertTriangle size={16}/> },
  promo:    { label: 'Khuyến mãi', color: '#c084fc',        bg: 'rgba(192,132,252,0.07)', icon: <Zap size={16}/> },
  ticket:   { label: 'Hỗ trợ',    color: 'var(--gold)',    bg: 'rgba(255,215,0,0.07)',   icon: <Shield size={16}/> },
  service:  { label: 'Dịch vụ',   color: 'var(--accent)',  bg: 'rgba(0,212,255,0.07)',   icon: <Package size={16}/> },
  referral: { label: 'Hoa hồng',  color: 'var(--success)', bg: 'rgba(34,197,94,0.07)',   icon: <CheckCircle size={16}/> },
};

const TS = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

const NotificationsPage = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // BUG FIX: clear stale data immediately when user changes or logs out
    setNotifications([]);
    setLoading(true);

    if (!currentUser) { setLoading(false); return; }

    // Capture uid/email at subscription time to avoid stale closure
    const uid = currentUser.uid;
    const email = currentUser.email;

    const unsub = onSnapshot(
      query(
        collection(db, 'notifications'),
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      ),
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter: targetAll=true OR targetUserId === uid/email
        const mine = all.filter(n =>
          n.targetAll ||
          n.targetUserId === uid ||
          n.targetUserId === email
        );
        setNotifications(mine);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => { unsub(); setNotifications([]); };
  }, [currentUser?.uid]);

  const isRead = (n) => (n.read || []).includes(currentUser?.uid);

  const markRead = async (n) => {
    if (isRead(n)) return;
    try {
      await updateDoc(doc(db, 'notifications', n.id), {
        read: arrayUnion(currentUser.uid)
      });
    } catch (e) { console.warn('markRead error:', e.message); }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !isRead(n));
    await Promise.all(unread.map(n =>
      updateDoc(doc(db, 'notifications', n.id), { read: arrayUnion(currentUser.uid) }).catch(() => {})
    ));
  };

  const unreadCount = notifications.filter(n => !isRead(n)).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', display: 'flex' }}><ArrowLeft size={20}/></Link>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: 'Rajdhani', color: 'var(--text-primary)' }}>
              🔔 Thông báo
            </h1>
            {unreadCount > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {unreadCount} thông báo chưa đọc
              </div>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCheck size={15}/> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Bell size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 16px' }}/>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Không có thông báo nào</div>
          <div style={{ fontSize: 13 }}>Bạn sẽ nhận thông báo khi có cập nhật từ hệ thống</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const read = isRead(n);
            return (
              <div key={n.id} onClick={() => markRead(n)}
                style={{
                  padding: '16px 20px', borderRadius: 12, cursor: 'pointer',
                  background: read ? 'var(--bg-card)' : cfg.bg,
                  border: `1px solid ${read ? 'var(--border)' : cfg.color + '40'}`,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}>
                {/* Unread dot */}
                {!read && (
                  <span style={{
                    position: 'absolute', top: 16, right: 16,
                    width: 8, height: 8, borderRadius: '50%',
                    background: cfg.color, display: 'inline-block'
                  }}/>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: read ? 600 : 800, fontSize: 15,
                      color: read ? 'var(--text-secondary)' : 'var(--text-primary)',
                      marginBottom: 5
                    }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      {n.createdAt?.toDate?.()?.toLocaleString('vi-VN') || ''}
                      {read && <span style={{ marginLeft: 8, color: 'var(--success)' }}>✓ Đã đọc</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

// src/pages/admin/AdminNotifications.jsx
import React, { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Bell, Plus, Trash2, Send, Users, User, Info, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

const TYPE_CONFIG = {
  info:    { label: 'Thông tin',  color: 'var(--accent)',   bg: 'rgba(0,212,255,0.08)',  icon: <Info size={14}/> },
  success: { label: 'Tốt lành',  color: 'var(--success)',  bg: 'rgba(34,197,94,0.08)',  icon: <CheckCircle size={14}/> },
  warning: { label: 'Cảnh báo',  color: 'var(--gold)',     bg: 'rgba(234,179,8,0.08)',  icon: <AlertTriangle size={14}/> },
  promo:   { label: 'Khuyến mãi',color: '#c084fc',         bg: 'rgba(192,132,252,0.08)',icon: <Zap size={14}/> },
};

const EMPTY_FORM = { title: '', body: '', type: 'info', targetAll: true, targetUserId: '' };

const AdminNotifications = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [sending, setSending]             = useState(false);
  const [showForm, setShowForm]           = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), orderBy('createdAt', 'desc')),
      snap => { setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const handleSend = async () => {
    if (!form.title.trim()) { toast.error('Nhập tiêu đề thông báo', TS); return; }
    if (!form.body.trim())  { toast.error('Nhập nội dung thông báo', TS); return; }
    if (!form.targetAll && !form.targetUserId.trim()) { toast.error('Nhập UID hoặc email người nhận', TS); return; }
    setSending(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title:        form.title.trim(),
        body:         form.body.trim(),
        type:         form.type,
        targetAll:    form.targetAll,
        targetUserId: form.targetAll ? null : form.targetUserId.trim(),
        active:       true,
        read:         [],
        createdAt:    serverTimestamp(),
        createdBy:    userProfile?.email || 'admin',
      });
      toast.success('✅ Đã gửi thông báo!', TS);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      toast.error('Lỗi: ' + e.message, TS);
    } finally { setSending(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá thông báo này?')) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Đã xoá', TS);
    } catch (e) { toast.error('Lỗi xoá: ' + e.message, TS); }
  };

  const handleToggleActive = async (n) => {
    try {
      await updateDoc(doc(db, 'notifications', n.id), { active: !n.active });
    } catch (e) { toast.error('Lỗi: ' + e.message, TS); }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">🔔 Thông báo hệ thống</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(p => !p)}>
          <Plus size={16}/> Tạo thông báo mới
        </button>
      </div>

      {/* ── Create Form ── */}
      {showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 20, border: '1px solid var(--accent)', borderRadius: 12 }}>
          <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>📢 Tạo thông báo mới</h3>

          {/* Type selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Loại thông báo</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20,
                    border: `1px solid ${form.type === key ? cfg.color : 'var(--border)'}`,
                    background: form.type === key ? cfg.bg : 'transparent',
                    color: form.type === key ? cfg.color : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 13, fontWeight: form.type === key ? 700 : 400 }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Tiêu đề *</label>
            <input className="form-input" placeholder="Ví dụ: 🎉 Flash Sale cuối tuần!" maxLength={100}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nội dung *</label>
            <textarea className="form-textarea" rows={3} placeholder="Nội dung chi tiết thông báo..."
              value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              style={{ width: '100%', resize: 'vertical' }} maxLength={500} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{form.body.length}/500</div>
          </div>

          {/* Target */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Gửi tới</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" checked={form.targetAll} onChange={() => setForm(f => ({ ...f, targetAll: true, targetUserId: '' }))} />
                <Users size={15}/> Tất cả người dùng
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" checked={!form.targetAll} onChange={() => setForm(f => ({ ...f, targetAll: false }))} />
                <User size={15}/> Người dùng cụ thể
              </label>
            </div>
            {!form.targetAll && (
              <input className="form-input" placeholder="Nhập UID hoặc email người dùng"
                value={form.targetUserId} onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}
                style={{ width: '100%', marginTop: 10 }} />
            )}
          </div>

          {/* Preview */}
          <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 10,
            background: TYPE_CONFIG[form.type]?.bg, border: `1px solid ${TYPE_CONFIG[form.type]?.color}30` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Preview</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ color: TYPE_CONFIG[form.type]?.color, marginTop: 1 }}>{TYPE_CONFIG[form.type]?.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{form.title || 'Tiêu đề thông báo'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{form.body || 'Nội dung thông báo...'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
              <Send size={15}/> {sending ? 'Đang gửi...' : 'Gửi thông báo'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Huỷ</button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <Bell size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }}/>
            Chưa có thông báo nào
          </div>
        ) : (
          <table className="admin-table">
            <thead><tr>
              <th>Thông báo</th>
              <th>Loại</th>
              <th>Gửi tới</th>
              <th>Đã đọc</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th></th>
            </tr></thead>
            <tbody>
              {notifications.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                return (
                  <tr key={n.id} style={{ opacity: n.active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20,
                        background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600, border: `1px solid ${cfg.color}30` }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {n.targetAll
                        ? <span style={{ color: 'var(--accent)' }}><Users size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>Tất cả</span>
                        : <span style={{ color: 'var(--gold)' }}><User size={12} style={{ verticalAlign: 'middle', marginRight: 4 }}/>{n.targetUserId?.slice(0, 12)}...</span>
                      }
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{(n.read || []).length} người</td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!n.active} onChange={() => handleToggleActive(n)} />
                        <span style={{ fontSize: 12, color: n.active ? 'var(--success)' : 'var(--text-muted)' }}>
                          {n.active ? 'Hiển thị' : 'Ẩn'}
                        </span>
                      </label>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {n.createdAt?.toDate?.()?.toLocaleDateString('vi-VN') || '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(n.id)}
                        style={{ color: 'var(--danger)', padding: '4px 8px' }}>
                        <Trash2 size={14}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;

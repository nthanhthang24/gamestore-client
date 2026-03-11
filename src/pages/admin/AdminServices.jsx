// src/pages/admin/AdminServices.jsx
import { useConfirm } from '../../components/shared/ConfirmModal';
import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, onSnapshot, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  Sword, Lock, UserCheck, Zap, Plus, Trash2, ToggleLeft, ToggleRight,
  CheckCircle, ChevronDown, ChevronUp, MessageCircle, Clock,
  Star, Phone, Eye, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminServices.css';

const T = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

const SERVICE_TYPES = [
  { value: 'cay-thue', label: '⚔️ Cày thuê', icon: <Sword size={16} /> },
  { value: 'doi-mat-khau', label: '🔐 Đổi mật khẩu', icon: <Lock size={16} /> },
  { value: 'nhap-thong-tin', label: '👤 Nhập thông tin', icon: <UserCheck size={16} /> },
  { value: 'custom', label: '✨ Dịch vụ khác', icon: <Zap size={16} /> },
];

const PRICE_TYPES = [
  { value: 'fixed', label: 'Giá cố định' },
  { value: 'contact', label: 'Liên hệ báo giá' },
  { value: 'free', label: 'Miễn phí' },
];

const PRESET_COLORS = ['#00d4ff','#ff6b35','#7c3aed','#059669','#d97706','#ff4757','#2563eb','#db2777'];

const STATUS_MAP = {
  pending:    { label: 'Chờ xử lý',   color: 'var(--gold)',    bg: 'rgba(255,200,0,0.1)' },
  processing: { label: 'Đang xử lý',  color: 'var(--accent)',  bg: 'rgba(0,212,255,0.1)' },
  done:       { label: 'Hoàn thành',  color: 'var(--success)', bg: 'rgba(0,200,100,0.1)' },
  cancelled:  { label: 'Đã huỷ',      color: 'var(--danger)',  bg: 'rgba(255,71,87,0.1)'  },
};

// ─── MANAGE SERVICES TAB ─────────────────────────────────────────
const ManageServicesTab = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [featureInput, setFeatureInput] = useState('');
  const [form, setForm] = useState({
    name: '', type: 'cay-thue', description: '',
    priceType: 'contact', price: '', priceUnit: '',
    estimatedTime: '', features: [], color: '#00d4ff',
    featured: false, available: true, order: 99,
  });

  useEffect(() => {
    setLoading(true);
    let unsub;
    try {
      unsub = onSnapshot(
        query(collection(db, 'services'), orderBy('order', 'asc')),
        (snap) => { setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (err) => { console.error(err); setLoading(false); }
      );
    } catch(e) { setLoading(false); }
    return () => unsub?.();
  }, []);

  const fetch = () => {}; // no-op: onSnapshot handles realtime

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', type: 'cay-thue', description: '', priceType: 'contact', price: '', priceUnit: '', estimatedTime: '', features: [], color: '#00d4ff', featured: false, available: true, order: (services.length + 1) });
    setFeatureInput('');
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({ ...s, price: s.price || '', features: s.features || [] });
    setFeatureInput('');
    setShowForm(true);
  };

  const addFeature = () => {
    if (!featureInput.trim()) return;
    setForm(f => ({ ...f, features: [...f.features, featureInput.trim()] }));
    setFeatureInput('');
  };
  const removeFeature = (i) => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nhập tên dịch vụ!', T); return; }
    const data = {
      ...form,
      price: form.priceType === 'fixed' ? Number(form.price) : null,
      order: Number(form.order),
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), data);
        toast.success('Đã cập nhật dịch vụ!', T);
      } else {
        await addDoc(collection(db, 'services'), { ...data, createdAt: serverTimestamp() });
        toast.success('Đã tạo dịch vụ mới!', T);
      }
      setShowForm(false); setEditingId(null); // onSnapshot auto-refreshes
    } catch (e) { toast.error(e.message, T); }
  };

  const toggle = async (id, key, val) => {
    await updateDoc(doc(db, 'services', id), { [key]: !val });
    setServices(s => s.map(x => x.id === id ? { ...x, [key]: !val } : x));
  };

  const remove = async (id) => {
    if (!(await confirm('Xoá dịch vụ này?'))) return;
    await deleteDoc(doc(db, 'services', id));
    setServices(s => s.filter(x => x.id !== id));
    toast.success('Đã xoá', T);
  };

  return (
    <>
      <div className="av-toolbar">
        <button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={15} /> Thêm dịch vụ mới</button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{services.length} dịch vụ</span>
      </div>

      {showForm && (
        <div className="av-form card asvc-form">
          <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>{editingId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}</h3>
          <div className="av-form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Tên dịch vụ *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Cày Rank Thách Đấu" />
            </div>
            <div className="form-group">
              <label className="form-label">Loại dịch vụ</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Thứ tự hiển thị</label>
              <input className="form-input" type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} min="1" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Mô tả</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả ngắn về dịch vụ..." style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Loại giá</label>
              <select className="form-input" value={form.priceType} onChange={e => setForm(f => ({ ...f, priceType: e.target.value }))}>
                {PRICE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {form.priceType === 'fixed' && (
              <>
                <div className="form-group">
                  <label className="form-label">Giá (đ)</label>
                  <input className="form-input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} min="0" placeholder="50000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn vị giá</label>
                  <input className="form-input" value={form.priceUnit} onChange={e => setForm(f => ({ ...f, priceUnit: e.target.value }))} placeholder="lần / tài khoản / tháng" />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Thời gian ước tính</label>
              <input className="form-input" value={form.estimatedTime} onChange={e => setForm(f => ({ ...f, estimatedTime: e.target.value }))} placeholder="VD: 1–3 ngày" />
            </div>
            <div className="form-group">
              <label className="form-label">Màu icon</label>
              <div className="color-picker-row">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 28, height: 28, background: c, borderRadius: 6, border: form.color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none' }} />
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Tính năng nổi bật (mỗi dòng 1 item)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  placeholder="VD: Bảo hành rank 3 ngày" />
                <button className="btn btn-ghost btn-sm" onClick={addFeature}><Plus size={14} /></button>
              </div>
              {form.features.length > 0 && (
                <div className="feature-tags">
                  {form.features.map((f, i) => (
                    <span key={i} className="feature-tag">
                      <CheckCircle size={11} style={{ color: 'var(--success)' }} /> {f}
                      <button onClick={() => removeFeature(i)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                <Star size={14} style={{ color: 'var(--gold)' }} /> HOT (nổi bật)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.checked }))} />
                Đang hoạt động
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave}><CheckCircle size={15} /> {editingId ? 'Cập nhật' : 'Tạo dịch vụ'}</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Huỷ</button>
          </div>
        </div>
      )}

      {loading ? <div className="av-loading">Đang tải...</div> : services.length === 0 ? (
        <div className="av-empty"><div style={{ fontSize: 36, marginBottom: 12 }}>🎮</div><div>Chưa có dịch vụ nào.</div></div>
      ) : (
        <div className="av-list">
          {services.map(s => (
            <div key={s.id} className={`av-item card asvc-item ${!s.available ? 'inactive' : ''}`}>
              <div className="asvc-icon" style={{ background: s.color || 'var(--accent)' }}>
                {SERVICE_TYPES.find(t => t.value === s.type)?.icon || <Zap size={16} />}
              </div>
              <div className="av-item-info">
                <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                  <span className="av-code">{s.name}</span>
                  {s.featured && <Star size={13} style={{ color: 'var(--gold)' }} />}
                </div>
                <span className="av-meta">{SERVICE_TYPES.find(t => t.value === s.type)?.label}</span>
                <span className="av-meta">
                  {s.priceType === 'contact' ? '💬 Liên hệ báo giá' :
                   s.priceType === 'free' ? '🆓 Miễn phí' :
                   `${s.price?.toLocaleString('vi-VN')}đ/${s.priceUnit}`}
                  {s.estimatedTime && ` · ⏱ ${s.estimatedTime}`}
                </span>
              </div>
              <div className="av-item-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} style={{ color: 'var(--accent)', fontSize: 12 }}>✏️ Sửa</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(s.id, 'available', s.available)}>
                  {s.available ? <ToggleRight size={20} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={20} />}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(s.id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ─── SERVICE ORDERS TAB ──────────────────────────────────────────
const ServiceOrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    setLoading(true);
    let unsub;
    try {
      unsub = onSnapshot(
        query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc')),
        (snap) => { setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        (err) => { console.error(err); setLoading(false); }
      );
    } catch(e) { setLoading(false); }
    return () => unsub?.();
  }, []);

  const fetch = () => {}; // no-op: onSnapshot handles realtime

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, 'serviceOrders', id), { status, updatedAt: serverTimestamp() });
    setOrders(o => o.map(x => x.id === id ? { ...x, status } : x));
    toast.success(`Đã cập nhật: ${STATUS_MAP[status].label}`, T);
  };

  const CONTACT_ICONS = { zalo: '💬', facebook: '📘', telegram: '✈️', discord: '🎮' };

  const filtered = filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus);

  return (
    <>
      <div className="av-toolbar" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={fetch}><RefreshCw size={14} /> Làm mới</button>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'pending', 'processing', 'done', 'cancelled'].map(s => (
            <button key={s} className={`filter-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}
              style={{ background: filterStatus === s && s !== 'all' ? STATUS_MAP[s]?.bg : undefined, color: filterStatus === s && s !== 'all' ? STATUS_MAP[s]?.color : undefined }}>
              {s === 'all' ? 'Tất cả' : STATUS_MAP[s].label}
              {s !== 'all' && <span className="filter-count">{orders.filter(o => o.status === s).length}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="av-loading">Đang tải...</div> : filtered.length === 0 ? (
        <div className="av-empty"><div style={{ fontSize: 36, marginBottom: 12 }}>📭</div><div>Không có yêu cầu nào.</div></div>
      ) : (
        <div className="sorder-list">
          {filtered.map(o => {
            const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
            const expanded = expandedId === o.id;
            return (
              <div key={o.id} className="sorder-item card">
                <div className="sorder-header" onClick={() => setExpandedId(expanded ? null : o.id)}>
                  <div className="sorder-info">
                    <span className="sorder-name">{o.serviceName}</span>
                    <span className="sorder-user">{o.userEmail}</span>
                    <span className="sorder-date">{o.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', align: 'center', gap: 10 }}>
                    <span className="sorder-status" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {expanded && (
                  <div className="sorder-detail">
                    <div className="sorder-detail-grid">
                      <div className="sorder-detail-item">
                        <span className="sorder-detail-label">Tài khoản game</span>
                        <span className="sorder-detail-val">{o.gameAccount || '—'}</span>
                      </div>
                      <div className="sorder-detail-item">
                        <span className="sorder-detail-label">Liên hệ</span>
                        <span className="sorder-detail-val">
                          {CONTACT_ICONS[o.contactMethod] || '💬'} {o.contactInfo}
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({o.contactMethod})</span>
                        </span>
                      </div>
                      {o.quantity && o.quantity > 1 && (
                        <div className="sorder-detail-item">
                          <span className="sorder-detail-label">Số lượng</span>
                          <span className="sorder-detail-val">{o.quantity} {o.priceUnit || ''}</span>
                        </div>
                      )}
                      {o.estimatedPrice && (
                        <div className="sorder-detail-item">
                          <span className="sorder-detail-label">Giá ước tính</span>
                          <span className="sorder-detail-val" style={{ color: 'var(--accent)', fontWeight: 700 }}>{o.estimatedPrice.toLocaleString('vi-VN')}đ</span>
                        </div>
                      )}
                      {o.note && (
                        <div className="sorder-detail-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="sorder-detail-label">Ghi chú</span>
                          <span className="sorder-detail-val">{o.note}</span>
                        </div>
                      )}
                    </div>
                    <div className="sorder-actions">
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Cập nhật trạng thái:</span>
                      {['pending', 'processing', 'done', 'cancelled'].map(s => (
                        <button key={s} onClick={() => updateStatus(o.id, s)}
                          className={`btn btn-sm sorder-status-btn ${o.status === s ? 'active' : ''}`}
                          style={{ background: o.status === s ? STATUS_MAP[s].bg : undefined, color: o.status === s ? STATUS_MAP[s].color : undefined, borderColor: o.status === s ? STATUS_MAP[s].color : undefined }}>
                          {STATUS_MAP[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

// ─── MAIN ────────────────────────────────────────────────────────
const AdminServices = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [tab, setTab] = useState('orders');
  return (
    <div className="admin-vouchers">
      <div className="av-header">
        <h1 className="av-title"><Sword size={22} /> Dịch Vụ Game</h1>
        <div className="av-tabs">
          <button className={`av-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}><MessageCircle size={15} /> Yêu cầu dịch vụ</button>
          <button className={`av-tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}><Zap size={15} /> Quản lý dịch vụ</button>
        </div>
      </div>
      {tab === 'orders' && <ServiceOrdersTab />}
      {tab === 'manage' && <ManageServicesTab />}
    </div>
  );
};

export default AdminServices;

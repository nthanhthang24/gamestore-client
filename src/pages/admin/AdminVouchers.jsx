// src/pages/admin/AdminVouchers.jsx
import React, { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, where
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy,
  Zap, Percent, Users, Calendar, CheckCircle, Layers, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminVouchers.css';

const T = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

// ─── VOUCHER TAB ─────────────────────────────────────────────────
const defaultVoucher = {
  code: '', type: 'percent', value: 10, minOrder: 0,
  maxDiscount: 0, usageLimit: 100, expiresAt: '',
  description: '', targetUserId: '', active: true,
};

const VouchersTab = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultVoucher);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(); }, []);
  const fetch = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'vouchers'), orderBy('createdAt', 'desc')));
      setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    setForm(f => ({ ...f, code: 'GAME' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') }));
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Nhập mã voucher', T); return; }
    if (!form.value || form.value <= 0) { toast.error('Nhập giá trị giảm', T); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'vouchers'), {
        ...form, code: form.code.toUpperCase().trim(),
        value: Number(form.value), minOrder: Number(form.minOrder),
        maxDiscount: Number(form.maxDiscount), usageLimit: Number(form.usageLimit),
        usedCount: 0, expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        createdAt: serverTimestamp(),
      });
      toast.success('Tạo voucher thành công!', T);
      setShowForm(false); setForm(defaultVoucher); fetch();
    } catch (e) { toast.error(e.message, T); } finally { setSaving(false); }
  };

  const toggle = async (id, active) => {
    await updateDoc(doc(db, 'vouchers', id), { active: !active });
    setVouchers(v => v.map(x => x.id === id ? { ...x, active: !active } : x));
  };
  const remove = async (id) => {
    if (!window.confirm('Xoá voucher này?')) return;
    await deleteDoc(doc(db, 'vouchers', id));
    setVouchers(v => v.filter(x => x.id !== id));
    toast.success('Đã xoá', T);
  };
  const copy = (code) => { navigator.clipboard.writeText(code); toast.success('Đã copy: ' + code, T); };

  return (
    <>
      <div className="av-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={15} /> Tạo voucher mới</button>
      </div>

      {showForm && (
        <div className="av-form card">
          <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>Tạo Voucher Mới</h3>
          <div className="av-form-grid">
            <div className="form-group">
              <label className="form-label">Mã voucher *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="VD: GAME50OFF" />
                <button className="btn btn-ghost btn-sm" onClick={generateCode}>🎲</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Loại</label>
              <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (đ)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giá trị {form.type === 'percent' ? '(%)' : '(đ)'} *</label>
              <input className="form-input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} min="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Đơn tối thiểu (đ)</label>
              <input className="form-input" type="number" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} min="0" />
            </div>
            {form.type === 'percent' && (
              <div className="form-group">
                <label className="form-label">Giảm tối đa (đ, 0 = không giới hạn)</label>
                <input className="form-input" type="number" value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} min="0" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Số lần dùng tối đa</label>
              <input className="form-input" type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} min="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Hết hạn (để trống = vĩnh viễn)</label>
              <input className="form-input" type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Chỉ cho user (email, để trống = tất cả)</label>
              <input className="form-input" value={form.targetUserId} onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))} placeholder="email@gmail.com" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Mô tả</label>
              <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="VD: Giảm 50% cho đơn hàng đầu tiên" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : <><CheckCircle size={15} /> Tạo</>}</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(defaultVoucher); }}>Huỷ</button>
          </div>
        </div>
      )}

      {loading ? <div className="av-loading">Đang tải...</div> : vouchers.length === 0 ? <div className="av-empty">Chưa có voucher nào.</div> : (
        <div className="av-list">
          {vouchers.map(v => (
            <div key={v.id} className={`av-item card ${!v.active ? 'inactive' : ''}`}>
              <div className="av-item-code">
                <span className="av-code">{v.code}</span>
                <button className="copy-btn" onClick={() => copy(v.code)}><Copy size={13} /></button>
              </div>
              <div className="av-item-info">
                <span className="av-value">{v.type === 'percent' ? <><Percent size={13} /> {v.value}%</> : `-${v.value?.toLocaleString('vi-VN')}đ`}</span>
                {v.minOrder > 0 && <span className="av-meta">Đơn tối thiểu: {v.minOrder?.toLocaleString('vi-VN')}đ</span>}
                {v.maxDiscount > 0 && <span className="av-meta">Tối đa: {v.maxDiscount?.toLocaleString('vi-VN')}đ</span>}
                {v.targetUserId && <span className="av-meta"><Users size={11} /> {v.targetUserId}</span>}
                {v.description && <span className="av-meta">{v.description}</span>}
              </div>
              <div className="av-item-stats">
                <span className="av-used">{v.usedCount || 0}/{v.usageLimit} lượt</span>
                {v.expiresAt && <span className="av-expires"><Calendar size={11} /> {new Date(v.expiresAt?.toDate?.() || v.expiresAt).toLocaleDateString('vi-VN')}</span>}
              </div>
              <div className="av-item-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(v.id, v.active)}>
                  {v.active ? <ToggleRight size={20} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={20} style={{ color: 'var(--text-muted)' }} />}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(v.id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ─── FLASH SALE TAB ───────────────────────────────────────────────
const FlashSaleTab = () => {
  const [flashSales, setFlashSales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', discount: 10, startAt: '', endAt: '', active: true, color: '#ff4757' });

  useEffect(() => { fetch(); }, []);
  const fetch = async () => {
    const snap = await getDocs(collection(db, 'flashSales'));
    setFlashSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleSave = async () => {
    if (!form.label) { toast.error('Nhập tên flash sale', T); return; }
    const disc = Number(form.discount);
    // ✅ FIX: Validate discount range (1-90%) ngay cả khi bypass HTML min/max
    if (!disc || disc < 1 || disc > 90) { toast.error('Flash sale giảm phải từ 1–90%', T); return; }
    if (form.startAt && form.endAt && new Date(form.startAt) >= new Date(form.endAt)) {
      toast.error('Thời gian bắt đầu phải trước thời gian kết thúc!', T); return;
    }
    await addDoc(collection(db, 'flashSales'), {
      ...form, discount: disc,
      startAt: form.startAt ? new Date(form.startAt) : null,
      endAt: form.endAt ? new Date(form.endAt) : null,
      createdAt: serverTimestamp(),
    });
    toast.success('Tạo flash sale!', T);
    setShowForm(false); setForm({ label: '', discount: 10, startAt: '', endAt: '', active: true, color: '#ff4757' }); fetch();
  };
  const toggle = async (id, active) => {
    await updateDoc(doc(db, 'flashSales', id), { active: !active });
    setFlashSales(v => v.map(x => x.id === id ? { ...x, active: !active } : x));
  };
  const remove = async (id) => {
    if (!window.confirm('Xoá flash sale?')) return;
    await deleteDoc(doc(db, 'flashSales', id)); setFlashSales(v => v.filter(x => x.id !== id));
  };

  return (
    <>
      <div className="av-toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={15} /> Tạo Flash Sale</button>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Flash sale hiển thị banner + tự động giảm giá theo % cho tất cả sản phẩm</p>
      </div>
      {showForm && (
        <div className="av-form card">
          <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>Tạo Flash Sale</h3>
          <div className="av-form-grid">
            <div className="form-group">
              <label className="form-label">Tên Flash Sale *</label>
              <input className="form-input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="VD: SALE CUỐI NĂM 🔥" />
            </div>
            <div className="form-group">
              <label className="form-label">Giảm (%)</label>
              <input className="form-input" type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} min="1" max="99" />
            </div>
            <div className="form-group">
              <label className="form-label">Bắt đầu</label>
              <input className="form-input" type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kết thúc</label>
              <input className="form-input" type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Màu banner</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 48, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{form.color}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave}><CheckCircle size={15} /> Tạo</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Huỷ</button>
          </div>
        </div>
      )}
      {flashSales.length === 0 ? <div className="av-empty">Chưa có flash sale nào.</div> : (
        <div className="av-list">
          {flashSales.map(fs => (
            <div key={fs.id} className={`av-item card ${!fs.active ? 'inactive' : ''}`}>
              <div className="av-fs-preview" style={{ background: fs.color || '#ff4757' }}><Zap size={16} /> {fs.discount}% OFF</div>
              <div className="av-item-info">
                <span className="av-code">{fs.label}</span>
                {fs.startAt && <span className="av-meta">Từ: {new Date(fs.startAt?.toDate?.() || fs.startAt).toLocaleString('vi-VN')}</span>}
                {fs.endAt && <span className="av-meta">Đến: {new Date(fs.endAt?.toDate?.() || fs.endAt).toLocaleString('vi-VN')}</span>}
              </div>
              <div className="av-item-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(fs.id, fs.active)}>
                  {fs.active ? <ToggleRight size={20} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={20} style={{ color: 'var(--text-muted)' }} />}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(fs.id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ─── BULK DISCOUNT TAB ────────────────────────────────────────────
const BulkDiscountTab = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ minQty: 2, maxQty: '', discountPct: 5, label: '', active: true });

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'bulkDiscountRules'), orderBy('minQty', 'asc')));
      setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ minQty: 2, maxQty: '', discountPct: 5, label: '', active: true });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({ minQty: r.minQty, maxQty: r.maxQty || '', discountPct: r.discountPct, label: r.label || '', active: r.active });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.minQty || !form.discountPct) { toast.error('Điền đầy đủ thông tin!', T); return; }
    if (Number(form.discountPct) <= 0 || Number(form.discountPct) > 90) { toast.error('Giảm giá phải từ 1–90%', T); return; }
    // ✅ FIX: Validate minQty < maxQty
    if (form.maxQty && Number(form.maxQty) <= Number(form.minQty)) {
      toast.error('Số lượng tối đa phải lớn hơn tối thiểu!', T); return;
    }
    if (Number(form.minQty) < 2) { toast.error('Số lượng tối thiểu phải >= 2', T); return; }
    const data = {
      minQty: Number(form.minQty),
      maxQty: form.maxQty ? Number(form.maxQty) : null,
      discountPct: Number(form.discountPct),
      label: form.label || `Mua ${form.minQty}+ acc giảm ${form.discountPct}%`,
      active: form.active,
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, 'bulkDiscountRules', editingId), data);
        toast.success('Đã cập nhật rule!', T);
      } else {
        await addDoc(collection(db, 'bulkDiscountRules'), { ...data, createdAt: serverTimestamp() });
        toast.success('Đã tạo rule mới!', T);
      }
      setShowForm(false); setEditingId(null); fetchRules();
    } catch (e) { toast.error(e.message, T); }
  };

  const toggle = async (id, active) => {
    await updateDoc(doc(db, 'bulkDiscountRules', id), { active: !active });
    setRules(r => r.map(x => x.id === id ? { ...x, active: !active } : x));
  };

  const remove = async (id) => {
    if (!window.confirm('Xoá rule này?')) return;
    await deleteDoc(doc(db, 'bulkDiscountRules', id));
    setRules(r => r.filter(x => x.id !== id));
    toast.success('Đã xoá', T);
  };

  return (
    <>
      <div className="av-toolbar">
        <button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={15} /> Thêm Rule mới</button>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Tự động giảm giá khi user mua nhiều tài khoản trong một đơn
        </p>
      </div>

      {/* How it works */}
      <div className="bulk-howto card">
        <div className="bulk-howto-title"><Layers size={15} /> Cách hoạt động</div>
        <p>Rule được áp dụng tự động vào giỏ hàng dựa trên <strong>số lượng tài khoản</strong> trong đơn. Rule có <em>minQty cao hơn</em> sẽ được ưu tiên (giảm nhiều nhất). Giảm giá bulk được tính <strong>sau flash sale</strong>, trước voucher code.</p>
      </div>

      {showForm && (
        <div className="av-form card">
          <h3 style={{ marginBottom: 20, color: 'var(--accent)' }}>{editingId ? 'Chỉnh sửa Rule' : 'Thêm Rule Giảm Giá Theo Số Lượng'}</h3>
          <div className="av-form-grid">
            <div className="form-group">
              <label className="form-label">Mua từ (số acc tối thiểu) *</label>
              <input className="form-input" type="number" value={form.minQty} onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))} min="2" placeholder="VD: 2" />
            </div>
            <div className="form-group">
              <label className="form-label">Đến (tối đa, để trống = không giới hạn)</label>
              <input className="form-input" type="number" value={form.maxQty} onChange={e => setForm(f => ({ ...f, maxQty: e.target.value }))} min="2" placeholder="VD: 4 (hoặc để trống)" />
            </div>
            <div className="form-group">
              <label className="form-label">Giảm giá (%) *</label>
              <input className="form-input" type="number" value={form.discountPct} onChange={e => setForm(f => ({ ...f, discountPct: e.target.value }))} min="1" max="90" placeholder="VD: 10" />
            </div>
            <div className="form-group">
              <label className="form-label">Tên hiển thị (tuỳ chọn)</label>
              <input className="form-input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder={`Mua ${form.minQty}+ tài khoản, giảm ${form.discountPct}%`} />
            </div>
          </div>
          <div className="bulk-preview">
            <span>👀 Preview:</span>
            <strong>Mua {form.minQty}{form.maxQty ? `–${form.maxQty}` : '+'} acc → giảm {form.discountPct}%</strong>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave}><CheckCircle size={15} /> {editingId ? 'Cập nhật' : 'Tạo Rule'}</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Huỷ</button>
          </div>
        </div>
      )}

      {loading ? <div className="av-loading">Đang tải...</div> : rules.length === 0 ? (
        <div className="av-empty">
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div>Chưa có rule nào. Nhấn <strong>+ Thêm Rule mới</strong> để bắt đầu!</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Ví dụ: Mua 2+ acc giảm 5%, mua 5+ acc giảm 15%</div>
        </div>
      ) : (
        <div className="bulk-rules-list">
          {/* Visual tier display */}
          <div className="bulk-tiers">
            {rules.map((r, i) => (
              <div key={r.id} className={`bulk-tier ${!r.active ? 'tier-inactive' : ''}`} style={{ '--tier-color': `hsl(${210 + i * 30}, 80%, 60%)` }}>
                <div className="tier-qty">
                  <ShoppingBag size={14} />
                  {r.minQty}{r.maxQty ? `–${r.maxQty}` : '+'} acc
                </div>
                <div className="tier-pct">-{r.discountPct}%</div>
                <div className="tier-label">{r.label}</div>
              </div>
            ))}
          </div>

          {/* Editable list */}
          <div className="av-list" style={{ marginTop: 16 }}>
            {rules.map(r => (
              <div key={r.id} className={`av-item card ${!r.active ? 'inactive' : ''}`}>
                <div className="bulk-rule-range">
                  <span className="bulk-qty-badge">
                    {r.minQty}{r.maxQty ? `–${r.maxQty}` : '+'}<span style={{ fontSize: 10, fontWeight: 400 }}> acc</span>
                  </span>
                </div>
                <div className="av-item-info">
                  <span className="av-value"><Percent size={13} /> Giảm {r.discountPct}%</span>
                  <span className="av-meta">{r.label}</span>
                </div>
                <div className="av-item-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)} style={{ fontSize: 12, color: 'var(--accent)' }}>✏️ Sửa</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(r.id, r.active)}>
                    {r.active ? <ToggleRight size={20} style={{ color: 'var(--success)' }} /> : <ToggleLeft size={20} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(r.id)} style={{ color: 'var(--danger)' }}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────
const AdminVouchers = () => {
  const [tab, setTab] = useState('bulk');
  const tabs = [
    { id: 'bulk', icon: <Layers size={15} />, label: 'Rule Số Lượng' },
    { id: 'vouchers', icon: <Tag size={15} />, label: 'Voucher Code' },
    { id: 'flashsale', icon: <Zap size={15} />, label: 'Flash Sale' },
  ];

  return (
    <div className="admin-vouchers">
      <div className="av-header">
        <h1 className="av-title"><Tag size={22} /> Khuyến Mãi & Giảm Giá</h1>
        <div className="av-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`av-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bulk' && <BulkDiscountTab />}
      {tab === 'vouchers' && <VouchersTab />}
      {tab === 'flashsale' && <FlashSaleTab />}
    </div>
  );
};

export default AdminVouchers;

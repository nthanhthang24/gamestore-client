// src/pages/admin/AdminGameTypes.jsx
import { useConfirm } from '../../components/shared/ConfirmModal';
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Gamepad2, Plus, Pencil, Trash2, Save, X, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const EMOJI_OPTIONS = ['🎮','🏆','🎯','🔥','⚔️','⚡','🌟','💎','🛡️','🗡️','🎪','🚀','🎲','👑','🦁','🐉','🌈','💥','🎭','🏅'];

const AdminGameTypes = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [gameTypes, setGameTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // id đang edit, 'new' nếu thêm mới
  const [form, setForm] = useState({ name: '', icon: '🎮', description: '', color: '#00ff88', active: true });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gameTypes'), snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setGameTypes(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openNew = () => {
    setForm({ name: '', icon: '🎮', description: '', color: '#00ff88', active: true });
    setEditing('new');
  };

  const openEdit = (gt) => {
    setForm({ name: gt.name, icon: gt.icon || '🎮', description: gt.description || '', color: gt.color || '#00ff88', active: gt.active !== false });
    setEditing(gt.id);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên game'); return; }
    try {
      if (editing === 'new') {
        await addDoc(collection(db, 'gameTypes'), {
          ...form,
          name: form.name.trim(),
          order: gameTypes.length,
          createdAt: serverTimestamp(),
        });
        toast.success(`✅ Đã thêm game "${form.name}"`);
      } else {
        await updateDoc(doc(db, 'gameTypes', editing), {
          ...form,
          name: form.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast.success(`✅ Đã cập nhật "${form.name}"`);
      }
      setEditing(null);
    } catch (e) {
      toast.error('Lỗi: ' + e.message);
    }
  };

  const handleDelete = async (gt) => {
    if (!(await confirm(`Xóa game "${gt.name}"? Các tài khoản dùng loại này sẽ không bị ảnh hưởng.`))) return;
    try {
      await deleteDoc(doc(db, 'gameTypes', gt.id));
      toast.success(`Đã xóa "${gt.name}"`);
    } catch (e) {
      toast.error('Lỗi: ' + e.message);
    }
  };

  const toggleActive = async (gt) => {
    await updateDoc(doc(db, 'gameTypes', gt.id), { active: !gt.active });
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, margin: 0 }}>
            <Gamepad2 size={20} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--accent)' }} />
            Quản lý Loại Game
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            Thêm / sửa / xóa các loại game hiển thị trong cửa hàng
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Thêm game
        </button>
      </div>

      {/* Form thêm/sửa */}
      {editing && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--accent)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontFamily: 'Rajdhani', fontSize: 18 }}>
            {editing === 'new' ? '➕ Thêm loại game mới' : '✏️ Chỉnh sửa loại game'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Tên game *</label>
              <input className="form-input" placeholder="VD: Play Together" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả ngắn</label>
              <input className="form-input" placeholder="VD: Game sinh tồn đồ họa anime" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 4 }}>
            <label className="form-label">Icon (chọn emoji)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0' }}>
              {EMOJI_OPTIONS.map(emoji => (
                <button key={emoji} type="button"
                  onClick={() => setForm(f => ({ ...f, icon: emoji }))}
                  style={{
                    fontSize: 22, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                    border: form.icon === emoji ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: form.icon === emoji ? 'rgba(0,255,136,0.1)' : 'var(--bg-secondary)',
                    transition: 'all 0.15s',
                  }}
                >{emoji}</button>
              ))}
              <input type="text" placeholder="Hoặc nhập emoji khác" value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                style={{ width: 130, padding: '6px 10px', borderRadius: 8, border: '2px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 18 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Màu accent</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
                <input className="form-input" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 100 }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Hiển thị:</label>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
            </div>
          </div>

          {/* Preview */}
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{form.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: form.color, fontFamily: 'Rajdhani' }}>{form.name || 'Tên game'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{form.description || 'Mô tả game'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={15} /> Lưu
            </button>
            <button className="btn btn-secondary" onClick={() => setEditing(null)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={15} /> Hủy
            </button>
          </div>
        </div>
      )}

      {/* Danh sách */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
      ) : gameTypes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Chưa có loại game nào. Bấm "Thêm game" để bắt đầu.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gameTypes.map((gt, idx) => (
            <div key={gt.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', opacity: gt.active === false ? 0.5 : 1 }}>
              <GripVertical size={16} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }} />
              <span style={{ fontSize: 26, flexShrink: 0 }}>{gt.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: gt.color || 'var(--accent)', fontFamily: 'Rajdhani' }}>{gt.name}</div>
                {gt.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{gt.description}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: gt.active !== false ? 'rgba(0,255,136,0.15)' : 'rgba(255,71,87,0.15)', color: gt.active !== false ? 'var(--success)' : 'var(--danger)' }}>
                  {gt.active !== false ? 'Hiển thị' : 'Ẩn'}
                </span>
                <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(gt)} title="Bật/tắt">
                  {gt.active !== false ? '👁️' : '🙈'}
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => openEdit(gt)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Pencil size={13} /> Sửa
                </button>
                <button className="btn btn-sm" onClick={() => handleDelete(gt)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,71,87,0.15)', color: 'var(--danger)', border: '1px solid rgba(255,71,87,0.3)' }}>
                  <Trash2 size={13} /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(0,102,255,0.08)', border: '1px solid rgba(0,102,255,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
        💡 Các loại game này sẽ tự động hiển thị trong trang Shop, Trang chủ và form thêm tài khoản. Ẩn game sẽ không hiện trong filter nhưng tài khoản đã có vẫn giữ nguyên.
      </div>
    </div>
  );
};

export default AdminGameTypes;

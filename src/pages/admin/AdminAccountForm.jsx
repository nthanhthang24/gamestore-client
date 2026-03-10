// src/pages/admin/AdminAccountForm.jsx — Sprint 5 Rev2
// Logic: có TXT attachment → ẩn card credentials | không có → hiện credentials
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  collection, addDoc, doc, getDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useGameTypes } from '../../hooks/useGameTypes';
import {
  Plus, X, ImagePlus, Save, ArrowLeft,
  Eye, EyeOff, FileText, Trash2, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminAccountForm.css';

const RANKS = ['','Sắt','Đồng','Bạc','Vàng','Bạch kim','Kim cương','Cao thủ','Thách đấu','Radiant','Immortal'];
const MAX_TXT_BYTES = 50 * 1024; // 50 KB

/* ─────────────────────────────────────────────
   HELPER: Upload raw .txt to Cloudinary
───────────────────────────────────────────── */
async function uploadRawToCloudinary(file) {
  const cn = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const up = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  if (!cn || !up) throw new Error('Chưa cấu hình Cloudinary env vars');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', up);
  fd.append('folder', 'gamestore/attachments');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cn}/raw/upload`,
    { method: 'POST', body: fd }
  );
  if (!res.ok) throw new Error('Upload file thất bại');
  return (await res.json()).secure_url;
}

/* ─────────────────────────────────────────────
   COMPONENT: AttachmentBox
   Sidebar card — upload .txt for buyer to download
   value = { url, name, pendingFile } | null
───────────────────────────────────────────── */
function AttachmentBox({ value, onChange }) {
  const inputRef = useRef();

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.txt')) {
      toast.error('Chỉ chấp nhận file .txt'); return;
    }
    if (f.size > MAX_TXT_BYTES) {
      toast.error('File quá lớn (tối đa 50 KB)'); return;
    }
    onChange({ name: f.name, url: null, pendingFile: f });
  };

  return (
    <div>
      {!value ? (
        <label className="attach-dropzone">
          <input ref={inputRef} type="file" accept=".txt,text/plain" hidden onChange={handlePick} />
          <FileText size={22} style={{ color: 'var(--accent)', opacity: 0.7, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Chọn file .txt đính kèm</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Buyer tải sau khi mua · Tối đa 50 KB
            </div>
          </div>
        </label>
      ) : (
        <div className="attach-item">
          <CheckCircle size={16} style={{ color: '#2ed573', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value.name}
            </div>
            <div style={{ fontSize: 11, marginTop: 2 }}>
              {value.url
                ? <a href={value.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Xem file ↗</a>
                : <span style={{ color: '#f0a500' }}>⏳ Sẽ upload khi nhấn Lưu</span>
              }
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, flexShrink: 0 }}
            title="Xóa file"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN: AdminAccountForm
═══════════════════════════════════════════════ */
const AdminAccountForm = () => {
  const { gameTypeNames: dynamicGameTypes } = useGameTypes();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '', gameType: '', rank: '', price: '', originalPrice: '',
    description: '', status: 'available', featured: false,
    loginUsername: '', loginPassword: '', loginEmail: '', loginNote: '',
  });
  const [gameTypeList, setGameTypeList] = useState([]);
  const [stats, setStats]         = useState([{ key: '', value: '' }]);
  const [images, setImages]       = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  // attachment = { url, name, pendingFile? } | null
  const [attachment, setAttachment] = useState(null);

  // hasAttachment = true  → ẩn credentials card
  // hasAttachment = false → hiện credentials card
  const hasAttachment = !!attachment;

  useEffect(() => {
    setGameTypeList(
      form.gameType && !dynamicGameTypes.includes(form.gameType)
        ? [...dynamicGameTypes, form.gameType]
        : dynamicGameTypes
    );
  }, [dynamicGameTypes, form.gameType]);

  useEffect(() => { if (isEdit) loadAccount(); }, [id]);

  const loadAccount = async () => {
    const snap = await getDoc(doc(db, 'accounts', id));
    if (!snap.exists()) return;
    const d = snap.data();
    setForm({
      title: d.title || '', gameType: d.gameType || '', rank: d.rank || '',
      price: d.price || '', originalPrice: d.originalPrice || '',
      description: d.description || '', status: d.status || 'available',
      featured: d.featured || false,
      loginUsername: d.loginUsername || '', loginPassword: d.loginPassword || '',
      loginEmail: d.loginEmail || '', loginNote: d.loginNote || '',
    });
    setImages(d.images || []);
    if (d.stats) setStats(Object.entries(d.stats).map(([key, value]) => ({ key, value })));
    if (d.attachmentUrl) setAttachment({ url: d.attachmentUrl, name: d.attachmentName || 'file.txt' });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const addStat    = () => setStats(p => [...p, { key: '', value: '' }]);
  const removeStat = (i) => setStats(p => p.filter((_, idx) => idx !== i));
  const statChange = (i, f, v) => { const s = [...stats]; s[i][f] = v; setStats(s); };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + newImages.length + files.length > 5) {
      toast.error('Tối đa 5 ảnh!'); return;
    }
    setNewImages(p => [...p, ...files]);
    setPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };
  const rmExisting = (i) => setImages(p => p.filter((_, idx) => idx !== i));
  const rmNew = (i) => {
    URL.revokeObjectURL(previews[i]);
    setNewImages(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const uploadImages = async () => {
    if (!newImages.length) return [];
    const cn = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const up = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    if (!cn || !up) throw new Error('Chưa cấu hình Cloudinary');
    const urls = [];
    for (const file of newImages) {
      const fd = new FormData();
      fd.append('file', file); fd.append('upload_preset', up); fd.append('folder', 'gamestore/accounts');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cn}/image/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload ảnh thất bại');
      urls.push((await res.json()).secure_url);
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!form.title || !form.price) { toast.error('Điền đầy đủ thông tin!'); return; }
    if (Number(form.price) <= 0)    { toast.error('Giá bán phải > 0!'); return; }

    // Validation: phải có credentials HOẶC attachment — không thể thiếu cả hai
    if (!hasAttachment) {
      if (!form.loginUsername?.trim()) { toast.error('⚠️ Thiếu tên đăng nhập tài khoản game!'); return; }
      if (!form.loginPassword?.trim()) { toast.error('⚠️ Thiếu mật khẩu tài khoản game!'); return; }
    }

    if (form.originalPrice && Number(form.originalPrice) < Number(form.price)) {
      toast.error('Giá gốc phải ≥ giá bán!'); return;
    }

    setLoading(true);
    try {
      setUploading(true);
      const [uploadedImgUrls, resolvedAttachment] = await Promise.all([
        uploadImages(),
        attachment?.pendingFile
          ? uploadRawToCloudinary(attachment.pendingFile).then(url => ({ url, name: attachment.name }))
          : Promise.resolve(attachment?.url ? { url: attachment.url, name: attachment.name } : null),
      ]);
      setUploading(false);

      const statsObj = {};
      stats.filter(s => s.key && s.value).forEach(s => { statsObj[s.key] = s.value; });

      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        images: [...images, ...uploadedImgUrls],
        stats: statsObj,
        attachmentUrl:  resolvedAttachment?.url  || null,
        attachmentName: resolvedAttachment?.name || null,
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, 'accounts', id), payload);
        toast.success('Cập nhật thành công!', {
          style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
        });
      } else {
        payload.createdAt = serverTimestamp();
        payload.views = 0;
        await addDoc(collection(db, 'accounts'), payload);
        toast.success('Thêm account thành công!', {
          style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
        });
      }
      navigate('/admin/accounts');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi: ' + err.message);
    } finally {
      setLoading(false); setUploading(false);
    }
  };

  const btnLabel = uploading
    ? (attachment?.pendingFile ? '⏫ Đang upload file...' : '⏫ Đang upload ảnh...')
    : loading ? 'Đang lưu...'
    : isEdit ? 'Cập nhật' : 'Thêm account';

  return (
    <div>
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/accounts')}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div>
            <h1 className="admin-page-title">{isEdit ? 'Chỉnh sửa Account' : 'Thêm Account Mới'}</h1>
            <p className="admin-page-sub">{isEdit ? 'Cập nhật thông tin' : 'Điền thông tin tài khoản game'}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          <Save size={16} /> {btnLabel}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="account-form-layout">

        {/* ════ LEFT ════ */}
        <div className="form-col-main">

          {/* Basic Info */}
          <div className="card">
            <h2 className="form-section-title">Thông tin cơ bản</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Tên tài khoản *</label>
                <input name="title" value={form.title} onChange={handleChange} className="form-input"
                  placeholder="VD: Nick LMHT Kim Cương II - 150 tướng..." required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Loại game *</label>
                  <select name="gameType" value={form.gameType} onChange={handleChange} className="form-select">
                    {!form.gameType && <option value="">-- Chọn loại game --</option>}
                    {gameTypeList.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rank</label>
                  <select name="rank" value={form.rank} onChange={handleChange} className="form-select">
                    {RANKS.map(r => <option key={r} value={r}>{r || 'Không có rank'}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Giá bán (đ) *</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange}
                    className="form-input" placeholder="500000" required min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá gốc (đ) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span></label>
                  <input type="number" name="originalPrice" value={form.originalPrice} onChange={handleChange}
                    className="form-input" placeholder="800000" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả chi tiết</label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  className="form-textarea" rows="6"
                  placeholder="Mô tả chi tiết về tài khoản, skin nổi bật, lịch sử account..." />
              </div>
            </div>
          </div>

          {/* ── Credentials card — chỉ hiện khi KHÔNG có attachment ── */}
          <div className={`card credentials-card ${hasAttachment ? 'credentials-hidden' : 'credentials-visible'}`}>
            <h2 className="form-section-title" style={{ color: 'var(--accent)' }}>
              🔑 Thông tin đăng nhập tài khoản game
            </h2>
            <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 16, background: 'rgba(255,71,87,0.08)', padding: '8px 12px', borderRadius: 8 }}>
              ⚠️ Đây là thông tin sẽ giao cho người mua sau khi thanh toán. Điền chính xác!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập / Username *</label>
                  <input name="loginUsername" value={form.loginUsername} onChange={handleChange}
                    className="form-input" placeholder="Tên đăng nhập hoặc email game" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu *</label>
                  <div style={{ position: 'relative' }}>
                    <input name="loginPassword" value={form.loginPassword} onChange={handleChange}
                      className="form-input" placeholder="Mật khẩu tài khoản"
                      type={showPass ? 'text' : 'password'} autoComplete="off" style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email liên kết <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(nếu có)</span></label>
                <input name="loginEmail" value={form.loginEmail} onChange={handleChange}
                  className="form-input" placeholder="Email đăng ký tài khoản game" />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú bàn giao <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                <textarea name="loginNote" value={form.loginNote} onChange={handleChange}
                  className="form-textarea" rows="3"
                  placeholder="VD: Mã OTP backup, câu hỏi bí mật, hướng dẫn đổi mật khẩu..." />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="form-section-title">Thống kê nhanh</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addStat}><Plus size={14} /> Thêm</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'center' }}>
                  <input className="form-input" placeholder="Tên chỉ số (VD: Số tướng)" value={s.key} onChange={e => statChange(i, 'key', e.target.value)} />
                  <input className="form-input" placeholder="Giá trị (VD: 150+)" value={s.value} onChange={e => statChange(i, 'value', e.target.value)} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStat(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>VD: Số tướng → 150+, Số skin → 80</p>
          </div>
        </div>

        {/* ════ RIGHT ════ */}
        <div className="form-col-side">

          {/* Images */}
          <div className="card">
            <h2 className="form-section-title">Hình ảnh</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Tối đa 5 ảnh. Ảnh đầu tiên là ảnh đại diện.</p>
            <div className="image-upload-grid">
              {images.map((url, i) => (
                <div key={i} className="image-preview">
                  <img src={url} alt="" />
                  <button type="button" className="img-remove" onClick={() => rmExisting(i)}><X size={12} /></button>
                  {i === 0 && <div className="img-badge">Chính</div>}
                </div>
              ))}
              {previews.map((url, i) => (
                <div key={`n${i}`} className="image-preview">
                  <img src={url} alt="" />
                  <button type="button" className="img-remove" onClick={() => rmNew(i)}><X size={12} /></button>
                  <div className="img-badge new">Mới</div>
                </div>
              ))}
              {images.length + newImages.length < 5 && (
                <label className="image-upload-btn">
                  <ImagePlus size={24} /><span>Thêm ảnh</span>
                  <input type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />
                </label>
              )}
            </div>
          </div>

          {/* ── FILE ATTACHMENT CARD ── */}
          <div className={`card attach-card ${hasAttachment ? 'attach-active' : ''}`}>
            <h2 className="form-section-title">
              <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              File thông tin cho buyer
              <span className="attach-badge-optional">tuỳ chọn</span>
            </h2>

            {/* Hint thay đổi theo trạng thái */}
            {!hasAttachment ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.7 }}>
                Upload file <strong>.txt</strong> chứa thông tin tài khoản — buyer tải sau khi mua.<br />
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  ↑ Nếu upload file, ô "Thông tin đăng nhập" phía trên sẽ tự ẩn.
                </span>
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#2ed573', marginBottom: 14, lineHeight: 1.7, background: 'rgba(46,213,115,0.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(46,213,115,0.2)' }}>
                ✅ File đã được đính kèm. Card "Thông tin đăng nhập" đã ẩn — buyer sẽ nhận thông tin qua file này.
              </p>
            )}

            <AttachmentBox value={attachment} onChange={setAttachment} />
          </div>

          {/* Settings */}
          <div className="card">
            <h2 className="form-section-title">Cài đặt</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select name="status" value={form.status} onChange={handleChange} className="form-select">
                  <option value="available">Còn hàng</option>
                  <option value="sold">Đã bán</option>
                  <option value="hidden">Ẩn</option>
                </select>
              </div>
              <div className="toggle-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Đánh dấu nổi bật</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hiển thị trên trang chủ</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            <Save size={18} /> {btnLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAccountForm;

// src/pages/admin/AdminAccountForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  collection, addDoc, doc, getDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useGameTypes } from '../../hooks/useGameTypes';
import { Plus, X, Upload, ImagePlus, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminAccountForm.css';

// GAME_TYPES loaded dynamically via useGameTypes hook
const RANKS = ['', 'Sắt', 'Đồng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương', 'Cao thủ', 'Thách đấu', 'Radiant', 'Immortal'];

const AdminAccountForm = () => {
  const { gameTypeNames: dynamicGameTypes } = useGameTypes();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '', gameType: '', rank: '', price: '',
    originalPrice: '', description: '', status: 'available', featured: false,
    loginUsername: '', loginPassword: '', loginEmail: '', loginNote: '',
  });
  const [gameTypeList, setGameTypeList] = useState([]);

  // Đảm bảo gameType hiện tại luôn có trong list — dùng useEffect (không dùng useMemo để tránh lỗi thứ tự)
  useEffect(() => {
    if (form.gameType && !dynamicGameTypes.includes(form.gameType)) {
      setGameTypeList([...dynamicGameTypes, form.gameType]);
    } else {
      setGameTypeList(dynamicGameTypes);
    }
  }, [dynamicGameTypes, form.gameType]);

  const GAME_TYPES = gameTypeList;
  const [stats, setStats] = useState([{ key: '', value: '' }]);
  const [images, setImages] = useState([]); // existing URLs
  const [newImages, setNewImages] = useState([]); // File objects
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false); // ✅ FIX T5-02

  useEffect(() => {
    if (isEdit) loadAccount();
  }, [id]);

  const loadAccount = async () => {
    const snap = await getDoc(doc(db, 'accounts', id));
    if (snap.exists()) {
      const data = snap.data();
      setForm({
        title: data.title || '', gameType: data.gameType || '',
        rank: data.rank || '', price: data.price || '',
        originalPrice: data.originalPrice || '', description: data.description || '',
        status: data.status || 'available', featured: data.featured || false,
        loginUsername: data.loginUsername || '', loginPassword: data.loginPassword || '',
        loginEmail: data.loginEmail || '', loginNote: data.loginNote || '',
      });
      setImages(data.images || []);
      if (data.stats) {
        setStats(Object.entries(data.stats).map(([key, value]) => ({ key, value })));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleStatChange = (i, field, val) => {
    const newStats = [...stats];
    newStats[i][field] = val;
    setStats(newStats);
  };

  const addStat = () => setStats(prev => [...prev, { key: '', value: '' }]);
  const removeStat = (i) => setStats(prev => prev.filter((_, idx) => idx !== i));

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + newImages.length + files.length > 5) {
      toast.error('Tối đa 5 ảnh!'); return;
    }
    setNewImages(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const removeNewImage = (i) => {
    URL.revokeObjectURL(previews[i]);
    setNewImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const uploadImages = async () => {
    if (newImages.length === 0) return []; // Không có ảnh mới → bỏ qua
    const CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Chưa cấu hình Cloudinary. Thêm REACT_APP_CLOUDINARY_CLOUD_NAME và REACT_APP_CLOUDINARY_UPLOAD_PRESET vào .env');
    }
    const urls = [];
    for (const file of newImages) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'gamestore/accounts');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload ảnh thất bại');
      const data = await res.json();
      urls.push(data.secure_url);
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.title || !form.price) { toast.error('Điền đầy đủ thông tin!'); return; }
    if (Number(form.price) <= 0) { toast.error('Giá bán phải lớn hơn 0!'); return; }
    // ✅ FIX T3-05: loginUsername/loginPassword bắt buộc
    if (!form.loginUsername?.trim()) { toast.error('⚠️ Thiếu tên đăng nhập tài khoản game! Người mua sẽ không nhận được thông tin.'); return; }
    if (!form.loginPassword?.trim()) { toast.error('⚠️ Thiếu mật khẩu tài khoản game! Người mua sẽ không nhận được thông tin.'); return; }
    // ✅ FIX: originalPrice phải >= price nếu có (giá gốc không thể thấp hơn giá bán)
    if (form.originalPrice && Number(form.originalPrice) < Number(form.price)) {
      toast.error('Giá gốc phải >= giá bán!'); return;
    }

    setLoading(true);
    try {
      setUploading(true);
      const uploadedUrls = await uploadImages();
      setUploading(false);

      const allImages = [...images, ...uploadedUrls];
      const statsObj = {};
      stats.filter(s => s.key && s.value).forEach(s => { statsObj[s.key] = s.value; });

      const data = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        images: allImages,
        stats: statsObj,
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, 'accounts', id), data);
        toast.success('Cập nhật thành công!', { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
      } else {
        data.createdAt = serverTimestamp();
        data.views = 0;
        await addDoc(collection(db, 'accounts'), data);
        toast.success('Thêm account thành công!', { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
      }
      navigate('/admin/accounts');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra: ' + err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/accounts')}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div>
            <h1 className="admin-page-title">{isEdit ? 'Chỉnh sửa Account' : 'Thêm Account Mới'}</h1>
            <p className="admin-page-sub">{isEdit ? 'Cập nhật thông tin' : 'Điền thông tin tài khoản game'}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          <Save size={16} />
          {uploading ? 'Đang upload ảnh...' : loading ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="account-form-layout">
        {/* Left Column */}
        <div className="form-col-main">
          {/* Basic Info */}
          <div className="card">
            <h2 className="form-section-title">Thông tin cơ bản</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tên tài khoản *</label>
                <input name="title" value={form.title} onChange={handleChange} className="form-input" placeholder="VD: Nick LMHT Kim Cương II - 150 tướng..." required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Loại game *</label>
                  <select name="gameType" value={form.gameType} onChange={handleChange} className="form-select">
                    {!form.gameType && <option value="">-- Chọn loại game --</option>}
                    {GAME_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rank</label>
                  <select name="rank" value={form.rank} onChange={handleChange} className="form-select">
                    {RANKS.map(r => <option key={r} value={r}>{r || 'Không có rank'}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Giá bán (đ) *</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange} className="form-input" placeholder="500000" required min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá gốc (đ) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span></label>
                  <input type="number" name="originalPrice" value={form.originalPrice} onChange={handleChange} className="form-input" placeholder="800000" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả chi tiết</label>
                <textarea name="description" value={form.description} onChange={handleChange} className="form-textarea" placeholder="Mô tả chi tiết về tài khoản, bao gồm những skin nổi bật, lịch sử account..." rows="6" />
              </div>
            </div>
          </div>

          {/* Login Credentials - QUAN TRỌNG NHẤT */}
          <div className="card" style={{ border: '1px solid var(--accent)', boxShadow: '0 0 12px rgba(0,212,255,0.1)' }}>
            <h2 className="form-section-title" style={{ color: 'var(--accent)' }}>🔑 Thông tin đăng nhập tài khoản game</h2>
            <p style={{ fontSize: '12px', color: 'var(--danger)', marginBottom: '16px', background: 'rgba(255,71,87,0.08)', padding: '8px 12px', borderRadius: 8 }}>
              ⚠️ Đây là thông tin sẽ được giao cho người mua sau khi thanh toán thành công. Điền chính xác!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập / Username *</label>
                  <input name="loginUsername" value={form.loginUsername} onChange={handleChange} className="form-input"
                    placeholder="Tên đăng nhập game hoặc email" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu *</label>
                  <div style={{ position: 'relative' }}>
                  <input name="loginPassword" value={form.loginPassword} onChange={handleChange} className="form-input"
                    placeholder="Mật khẩu tài khoản" type={showLoginPass ? 'text' : 'password'} autoComplete="off" style={{ paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowLoginPass(p => !p)}
                    style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>
                    {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email liên kết <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(nếu có)</span></label>
                <input name="loginEmail" value={form.loginEmail} onChange={handleChange} className="form-input"
                  placeholder="Email đăng ký tài khoản game" />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú bàn giao <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                <textarea name="loginNote" value={form.loginNote} onChange={handleChange} className="form-textarea"
                  placeholder="VD: Mã OTP backup, câu hỏi bí mật, hướng dẫn đổi mật khẩu..." rows="3" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 className="form-section-title">Thống kê nhanh</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addStat}><Plus size={14} /> Thêm</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.map((stat, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                  <input className="form-input" placeholder="Tên chỉ số (VD: Số tướng)" value={stat.key} onChange={e => handleStatChange(i, 'key', e.target.value)} />
                  <input className="form-input" placeholder="Giá trị (VD: 150+)" value={stat.value} onChange={e => handleStatChange(i, 'value', e.target.value)} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStat(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
              VD: Số tướng → 150+, Số skin → 80, Win rate → 55%
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="form-col-side">
          {/* Images */}
          <div className="card">
            <h2 className="form-section-title">Hình ảnh</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Tối đa 5 ảnh. Ảnh đầu tiên là ảnh đại diện.</p>

            <div className="image-upload-grid">
              {/* Existing images */}
              {images.map((url, i) => (
                <div key={i} className="image-preview">
                  <img src={url} alt="" />
                  <button type="button" className="img-remove" onClick={() => removeExistingImage(i)}><X size={12} /></button>
                  {i === 0 && <div className="img-badge">Chính</div>}
                </div>
              ))}
              {/* New image previews */}
              {previews.map((url, i) => (
                <div key={`new-${i}`} className="image-preview">
                  <img src={url} alt="" />
                  <button type="button" className="img-remove" onClick={() => removeNewImage(i)}><X size={12} /></button>
                  <div className="img-badge new">Mới</div>
                </div>
              ))}
              {/* Upload button */}
              {images.length + newImages.length < 5 && (
                <label className="image-upload-btn">
                  <ImagePlus size={24} />
                  <span>Thêm ảnh</span>
                  <input type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />
                </label>
              )}
            </div>
          </div>

          {/* Status & Settings */}
          <div className="card">
            <h2 className="form-section-title">Cài đặt</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Đánh dấu nổi bật</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hiển thị trên trang chủ</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            <Save size={18} />
            {uploading ? 'Đang upload ảnh...' : loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm account'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAccountForm;

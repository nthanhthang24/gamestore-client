// src/pages/admin/AdminAccountForm.jsx — Sprint 6: Quantity + Multi-credentials
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useGameTypes } from '../../hooks/useGameTypes';
import {
  Plus, X, ImagePlus, Save, ArrowLeft, Eye, EyeOff,
  FileText, Trash2, CheckCircle, Copy, ChevronDown, ChevronUp, ClipboardList, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminAccountForm.css';

const RANKS = ['','Sắt','Đồng','Bạc','Vàng','Bạch kim','Kim cương','Cao thủ','Thách đấu','Radiant','Immortal'];
const MAX_TXT_BYTES = 50 * 1024;

// Đọc file TXT thành text rồi lưu thẳng vào Firestore — tránh vấn đề Cloudinary preset raw
async function readTxtFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Không đọc được file'));
    reader.readAsText(file, 'utf-8');
  });
}

// ── empty credential slot ───────────────────────────
const emptySlot = () => ({
  loginUsername: '', loginPassword: '', loginEmail: '', loginNote: '',
  attachmentContent: null, attachmentName: null, pendingFile: null,
  _showPass: false, _expanded: true,
});

// ── Single credential slot card ─────────────────────
function CredSlot({ slot, idx, total, onChange, onRemove, onDuplicate }) {
  const inputRef = useRef();

  const set = (field, val) => onChange(idx, { ...slot, [field]: val });

  const handleTxt = (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.txt')) { toast.error('Chỉ chấp nhận .txt'); return; }
    if (f.size > MAX_TXT_BYTES) { toast.error('File quá lớn (50KB)'); return; }
    onChange(idx, { ...slot, attachmentName: f.name, attachmentContent: null, pendingFile: f });
  };

  const removeAttach = () => onChange(idx, { ...slot, attachmentContent: null, attachmentName: null, pendingFile: null });

  return (
    <div className={`cred-slot ${slot._expanded ? 'cred-slot-open' : 'cred-slot-closed'}`}>
      {/* Slot header */}
      <div className="cred-slot-header" onClick={() => set('_expanded', !slot._expanded)}>
        <span className="cred-slot-num">Slot {idx + 1}</span>
        {slot.loginUsername && <span className="cred-slot-preview">{slot.loginUsername}</span>}
        {slot.attachmentName && !slot.loginUsername && (
          <span className="cred-slot-preview" style={{ color: '#2ed573' }}>📎 {slot.attachmentName}</span>
        )}
        {!slot.loginUsername && !slot.attachmentName && (
          <span className="cred-slot-empty">Chưa điền</span>
        )}
        <div className="cred-slot-actions" onClick={e => e.stopPropagation()}>
          {total > 1 && <button type="button" title="Nhân đôi slot" onClick={() => onDuplicate(idx)} className="cred-action-btn"><Copy size={13}/></button>}
          {total > 1 && <button type="button" title="Xóa slot" onClick={() => onRemove(idx)} className="cred-action-btn danger"><Trash2 size={13}/></button>}
        </div>
        {slot._expanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)', marginLeft: 4 }}/> : <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: 4 }}/>}
      </div>

      {/* Slot body */}
      {slot._expanded && (
        <div className="cred-slot-body">
          {/* TXT attachment toggle */}
          {!slot.attachmentName ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập *</label>
                  <input value={slot.loginUsername} onChange={e => set('loginUsername', e.target.value)}
                    className="form-input" placeholder="Username hoặc email"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu *</label>
                  <div style={{ position: 'relative' }}>
                    <input value={slot.loginPassword} onChange={e => set('loginPassword', e.target.value)}
                      className="form-input" placeholder="Mật khẩu"
                      type={slot._showPass ? 'text' : 'password'} autoComplete="off" style={{ paddingRight: 36 }}/>
                    <button type="button" onClick={() => set('_showPass', !slot._showPass)}
                      style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>
                      {slot._showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label">Email liên kết <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(nếu có)</span></label>
                <input value={slot.loginEmail} onChange={e => set('loginEmail', e.target.value)}
                  className="form-input" placeholder="Email đăng ký"/>
              </div>
              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label">Ghi chú <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(tuỳ chọn)</span></label>
                <textarea value={slot.loginNote} onChange={e => set('loginNote', e.target.value)}
                  className="form-textarea" rows="2" placeholder="OTP backup, câu hỏi bí mật..."/>
              </div>
              <div style={{ marginTop: 10 }}>
                <label className="attach-dropzone-sm">
                  <input ref={inputRef} type="file" accept=".txt" hidden onChange={handleTxt}/>
                  <FileText size={14} style={{ color:'var(--accent)', opacity:.7 }}/>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Hoặc đính kèm file .txt thay thế</span>
                </label>
              </div>
            </>
          ) : (
            <div className="attach-item" style={{ margin: 0 }}>
              <CheckCircle size={15} style={{ color:'#2ed573', flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {slot.attachmentName}
                </div>
                <div style={{ fontSize:11, marginTop:2 }}>
                  {slot.attachmentContent
                    ? <span style={{ color:'var(--success)' }}>✅ Đã lưu nội dung ({Math.round(slot.attachmentContent.length/1024*10)/10}KB)</span>
                    : slot.pendingFile
                      ? <span style={{ color:'#f0a500' }}>⏳ Sẽ lưu khi submit</span>
                      : <span style={{ color:'var(--text-muted)' }}>📄 {slot.attachmentName}</span>}
                </div>
              </div>
              <button type="button" onClick={removeAttach} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:4 }}>
                <Trash2 size={13}/>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Giới hạn tối đa ─────────────────────────────────
const MAX_QUANTITY = 500;
const WINDOW_SIZE  = 12; // số slots render cùng lúc
const SLOT_HEIGHT  = 52; // chiều cao mỗi slot (collapsed), px

// ── Virtualized credential list ──────────────────────
// Thay vì render toàn bộ N slots (gây lag khi N=100+),
// chỉ render WINDOW_SIZE slots xung quanh viewport hiện tại.
// Slots ngoài viewport = placeholder div giữ chiều cao.
function VirtualCredList({ credentials, onUpdate, onRemove, onDuplicate }) {
  const containerRef = useRef(null);
  const [visibleStart, setVisibleStart] = useState(0);
  const total = credentials.length;

  // Tính range cần render
  const visibleEnd = Math.min(total, visibleStart + WINDOW_SIZE);

  // Scroll handler — cập nhật window khi admin cuộn
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = () => {
      const rect = container.getBoundingClientRect();
      const scrollTop = window.scrollY + Math.max(0, -rect.top);
      const newStart = Math.max(0, Math.floor(scrollTop / SLOT_HEIGHT) - 2);
      setVisibleStart(Math.min(newStart, Math.max(0, total - WINDOW_SIZE)));
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [total]);

  // Khi có slot đang mở (expanded), giữ nó luôn trong range visible
  const expandedIdx = useMemo(
    () => credentials.findIndex(s => s._expanded),
    [credentials]
  );
  const effectiveStart = expandedIdx >= 0 && (expandedIdx < visibleStart || expandedIdx >= visibleEnd)
    ? Math.max(0, expandedIdx - 2)
    : visibleStart;
  const effectiveEnd = Math.min(total, effectiveStart + WINDOW_SIZE);

  // Chiều cao placeholder trước/sau vùng visible
  const topPad    = effectiveStart * SLOT_HEIGHT;
  const bottomPad = Math.max(0, total - effectiveEnd) * SLOT_HEIGHT;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Placeholder trên */}
      {topPad > 0 && (
        <div style={{ height: topPad, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12,
          background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
          ↑ Slot 1–{effectiveStart} (cuộn lên để xem)
        </div>
      )}

      {/* Slots thực sự được render */}
      {credentials.slice(effectiveStart, effectiveEnd).map((slot, i) => {
        const idx = effectiveStart + i;
        return (
          <CredSlot
            key={idx}
            slot={slot}
            idx={idx}
            total={total}
            onChange={onUpdate}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
          />
        );
      })}

      {/* Placeholder dưới */}
      {bottomPad > 0 && (
        <div style={{ height: bottomPad, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12,
          background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
          Slot {effectiveEnd + 1}–{total} (cuộn xuống để xem) ↓
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
const AdminAccountForm = () => {
  const { gameTypeNames: dynamicGameTypes } = useGameTypes();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title:'', gameType:'', rank:'', price:'', originalPrice:'',
    description:'', status:'available', featured:false,
    quantity: 1,
  });
  const [gameTypeList, setGameTypeList] = useState([]);
  const [stats, setStats]       = useState([{ key:'', value:'' }]);
  const [images, setImages]     = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingSoldCount, setExistingSoldCount] = useState(0); // track for edit qty validation

  // credentials = array of slots, length always === form.quantity
  const [credentials, setCredentials] = useState([emptySlot()]);

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
    const qty = d.quantity || 1;
    setForm({
      title: d.title||'', gameType: d.gameType||'', rank: d.rank||'',
      price: d.price||'', originalPrice: d.originalPrice||'',
      description: d.description||'', status: d.status||'available',
      featured: d.featured||false, quantity: qty,
    });
    setImages(d.images||[]);
    if (d.stats) setStats(Object.entries(d.stats).map(([key,value]) => ({ key, value })));

    // Load credentials array
    const creds = d.credentials?.length ? d.credentials : [
      {
        loginUsername: d.loginUsername||'',
        loginPassword: d.loginPassword||'',
        loginEmail: d.loginEmail||'',
        loginNote: d.loginNote||'',
        attachmentContent: d.attachmentContent||null,
        attachmentName: d.attachmentName||null,
      }
    ];
    setCredentials(creds.map(c => ({ ...emptySlot(), ...c, _expanded: false })));
    setExistingSoldCount(d.soldCount || 0);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'quantity') {
      const raw = parseInt(value) || 1;
      const qty = Math.min(MAX_QUANTITY, Math.max(1, raw));
      if (raw > MAX_QUANTITY) {
        toast.error(`Tối đa ${MAX_QUANTITY} slot trên mỗi listing.`, { duration: 3000 });
      }
      setForm(p => ({ ...p, quantity: qty }));
      setCredentials(prev => {
        if (qty > prev.length) {
          // Slot mới: collapsed (_expanded=false) để tránh lag DOM khi thêm nhiều
          return [...prev, ...Array.from({ length: qty - prev.length },
            () => ({ ...emptySlot(), _expanded: false }))];
        } else {
          return prev.slice(0, qty);
        }
      });
    } else {
      setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const updateSlot = (idx, slot) => setCredentials(p => p.map((s, i) => i === idx ? slot : s));
  const removeSlot = (idx) => {
    const next = credentials.filter((_, i) => i !== idx);
    setCredentials(next);
    setForm(p => ({ ...p, quantity: next.length }));
  };
  const duplicateSlot = (idx) => {
    const dup = { ...credentials[idx], _expanded: true, attachmentContent: null, attachmentName: null, pendingFile: null };
    const next = [...credentials.slice(0, idx+1), dup, ...credentials.slice(idx+1)];
    setCredentials(next);
    setForm(p => ({ ...p, quantity: next.length }));
  };
  const addSlot = () => {
    setCredentials(p => [...p, emptySlot()]);
    setForm(p => ({ ...p, quantity: p.quantity + 1 }));
  };

  // ── Bulk paste: mỗi dòng = 1 slot ─────────────────────────────
  // Format hỗ trợ: username|password|email|note  hoặc  username|password  hoặc  tab-separated
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);

  const parseBulkLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    // Support | or tab as separator
    const parts = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split('|');
    return {
      loginUsername: (parts[0] || '').trim(),
      loginPassword: (parts[1] || '').trim(),
      loginEmail:    (parts[2] || '').trim(),
      loginNote:     (parts[3] || '').trim(),
      attachmentContent: null, attachmentName: null, pendingFile: null,
      _showPass: false, _expanded: false,
    };
  };

  const handleBulkChange = (text) => {
    setBulkText(text);
    const lines = text.split('\n').map(parseBulkLine).filter(Boolean);
    setBulkPreview(lines);
  };

  const applyBulk = () => {
    if (!bulkPreview.length) { toast.error('Không có dòng hợp lệ nào'); return; }
    const invalid = bulkPreview.filter(s => !s.loginUsername);
    if (invalid.length) { toast.error(`${invalid.length} dòng thiếu username`); return; }
    // Warn if existing slots would be overwritten
    const existingFilled = credentials.filter(s => s.loginUsername?.trim() || s.attachmentName);
    if (existingFilled.length > 0) {
      const ok = window.confirm(
        `Bạn đang có ${existingFilled.length} slot đã điền thông tin.\nNhập hàng loạt sẽ XÓA toàn bộ và thay bằng ${bulkPreview.length} slot mới.\n\nTiếp tục?`
      );
      if (!ok) return;
    }
    setCredentials(bulkPreview);
    setForm(p => ({ ...p, quantity: bulkPreview.length }));
    setBulkText('');
    setBulkPreview([]);
    setShowBulk(false);
    toast.success('✅ Đã import ' + bulkPreview.length + ' slot!');
  };

  const addStat    = () => setStats(p => [...p, { key:'', value:'' }]);
  const removeStat = (i) => setStats(p => p.filter((_, idx) => idx !== i));
  const statChange = (i, f, v) => { const s=[...stats]; s[i][f]=v; setStats(s); };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + newImages.length + files.length > 5) { toast.error('Tối đa 5 ảnh!'); return; }
    setNewImages(p => [...p, ...files]);
    setPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };
  const rmExisting = (i) => setImages(p => p.filter((_,idx) => idx !== i));
  const rmNew = (i) => {
    URL.revokeObjectURL(previews[i]);
    setNewImages(p => p.filter((_,idx) => idx !== i));
    setPreviews(p => p.filter((_,idx) => idx !== i));
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
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cn}/image/upload`, { method:'POST', body:fd });
      if (!res.ok) throw new Error('Upload ảnh thất bại');
      urls.push((await res.json()).secure_url);
    }
    return urls;
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!form.title || !form.price) { toast.error('Điền đầy đủ thông tin!'); return; }
    if (!form.gameType) { toast.error('Vui lòng chọn loại game!'); return; }
    if (Number(form.price) <= 0)    { toast.error('Giá bán phải > 0!'); return; }
    if (form.originalPrice && Number(form.originalPrice) < Number(form.price))
      { toast.error('Giá gốc phải ≥ giá bán!'); return; }
    // BUG-AAF-1: Prevent reducing quantity below already-sold count
    if (isEdit && credentials.length < existingSoldCount) {
      toast.error(`Không thể giảm số lượng xuống ${credentials.length} — đã bán ${existingSoldCount} slot. Số lượng tối thiểu: ${existingSoldCount}.`);
      return;
    }

    // Validate slots: mỗi slot phải có username HOẶC attachment
    for (let i = 0; i < credentials.length; i++) {
      const s = credentials[i];
      if (!s.loginUsername?.trim() && !s.attachmentName) {
        toast.error(`Slot ${i+1}: cần có tên đăng nhập hoặc file đính kèm`); return;
      }
      if (s.loginUsername?.trim() && !s.loginPassword?.trim()) {
        toast.error(`Slot ${i+1}: thiếu mật khẩu`); return;
      }
    }

    setLoading(true);
    try {
      setUploading(true);
      const uploadedImgUrls = await uploadImages();

      // Đọc TXT files per slot — lưu content vào Firestore thay vì upload Cloudinary
      const resolvedCreds = await Promise.all(credentials.map(async (s) => {
        let attachmentContent = s.attachmentContent || null;
        if (s.pendingFile) attachmentContent = await readTxtFileContent(s.pendingFile);
        return {
          loginUsername:  s.loginUsername  || '',
          loginPassword:  s.loginPassword  || '',
          loginEmail:     s.loginEmail     || '',
          loginNote:      s.loginNote      || '',
          attachmentContent: attachmentContent || null,   // nội dung TXT lưu thẳng vào Firestore
          attachmentName: s.attachmentName || null,
        };
      }));
      setUploading(false);

      const statsObj = {};
      stats.filter(s => s.key && s.value).forEach(s => { statsObj[s.key] = s.value; });

      const qty = resolvedCreds.length;

      // ══════════════════════════════════════════════════════════════
      // FIX 2025-K: CREDENTIALS STORED IN SUBCOLLECTION (admin-only)
      // ══════════════════════════════════════════════════════════════
      // Previously: credentials (loginPassword, loginUsername...) were stored
      // IN the main /accounts/{id} doc which has "allow read: if true".
      // → Any anonymous user could call getDoc('accounts',id) and get all passwords!
      //
      // Fix: Strip ALL sensitive credential fields from the public doc.
      // Store them in /accounts/{id}/credentials/slots (admin-only subcollection).
      // CartPage reads credentials from the order record (written by admin during checkout).
      const publicPayload = {
        ...form,
        price:        Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        images:       [...images, ...uploadedImgUrls],
        stats:        statsObj,
        quantity:     qty,
        soldCount:    isEdit ? undefined : 0,
        updatedAt:    serverTimestamp(),
        // ❌ REMOVED: credentials, loginUsername, loginPassword, loginEmail, loginNote,
        //             attachmentContent, attachmentName — these are now in subcollection only
      };
      if (publicPayload.soldCount === undefined) delete publicPayload.soldCount;

      // Private credentials payload → /accounts/{id}/credentials/slots (admin-only)
      const privatePayload = {
        slots: resolvedCreds.map(s => ({
          loginUsername:     s.loginUsername     || '',
          loginPassword:     s.loginPassword     || '',
          loginEmail:        s.loginEmail        || '',
          loginNote:         s.loginNote         || '',
          attachmentContent: s.attachmentContent || null,
          attachmentName:    s.attachmentName    || null,
        })),
        updatedAt: serverTimestamp(),
      };

      let accountId = id;
      if (isEdit) {
        await updateDoc(doc(db, 'accounts', id), publicPayload);
        // Update credentials subcollection
        await setDoc(doc(db, 'accounts', id, 'credentials', 'slots'), privatePayload);
        toast.success('Cập nhật thành công!', { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' } });
      } else {
        publicPayload.createdAt = serverTimestamp();
        publicPayload.soldCount = 0;
        publicPayload.views = 0;
        const ref = await addDoc(collection(db, 'accounts'), publicPayload);
        accountId = ref.id;
        // Write credentials to subcollection
        await setDoc(doc(db, 'accounts', accountId, 'credentials', 'slots'), privatePayload);
        toast.success('Thêm account thành công!', { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' } });
      }
      navigate('/admin/accounts');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi: ' + err.message);
    } finally { setLoading(false); setUploading(false); }
  };

  const btnLabel = uploading ? '⏫ Đang upload...' : loading ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm account';
  const stockLeft = form.quantity; // on create; on edit computed elsewhere

  return (
    <div>
      <div className="admin-page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/accounts')}>
            <ArrowLeft size={16}/> Quay lại
          </button>
          <div>
            <h1 className="admin-page-title">{isEdit ? 'Chỉnh sửa Account' : 'Thêm Account Mới'}</h1>
            <p className="admin-page-sub">{isEdit ? 'Cập nhật thông tin' : 'Điền thông tin tài khoản game'}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          <Save size={16}/> {btnLabel}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="account-form-layout">
        {/* ════ LEFT ════ */}
        <div className="form-col-main">

          {/* Basic Info */}
          <div className="card">
            <h2 className="form-section-title">Thông tin cơ bản</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="form-group">
                <label className="form-label">Tên tài khoản *</label>
                <input name="title" value={form.title} onChange={handleChange} className="form-input"
                  placeholder="VD: Nick LMHT Kim Cương II - 150 tướng..." required/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
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
                    {RANKS.map(r => <option key={r} value={r}>{r||'Không có rank'}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
                <div className="form-group">
                  <label className="form-label">Giá bán (đ) *</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange}
                    className="form-input" placeholder="500000" required min="0"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Giá gốc (đ) <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(tuỳ chọn)</span></label>
                  <input type="number" name="originalPrice" value={form.originalPrice} onChange={handleChange}
                    className="form-input" placeholder="800000" min="0"/>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Số lượng
                    {form.quantity > 1 && (
                      <span className="qty-badge">{form.quantity} slot</span>
                    )}
                  </label>
                  <input type="number" name="quantity" value={form.quantity} onChange={handleChange}
                    className="form-input" min="1" max={MAX_QUANTITY}/>
                </div>
              </div>
              {form.quantity > 1 && (
                <div className="qty-info-bar">
                  <span>📦 Listing này có <strong>{form.quantity} tài khoản</strong> — mỗi slot sẽ được giao cho 1 buyer riêng.</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Mô tả chi tiết</label>
                <textarea name="description" value={form.description} onChange={handleChange}
                  className="form-textarea" rows="5"
                  placeholder="Mô tả chi tiết về tài khoản, skin nổi bật, lịch sử account..."/>
              </div>
            </div>
          </div>

          {/* ── Credentials (multi-slot) ── */}
          <div className="card" style={{ border:'1px solid var(--accent)', boxShadow:'0 0 12px rgba(0,212,255,0.1)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:16, fontWeight:700, color:'var(--accent)', margin:0 }}>
                🔑 Thông tin đăng nhập tài khoản game
              </h2>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{credentials.length} slot</span>
                <button type="button" className="btn btn-ghost btn-sm"
                  style={{ color: showBulk ? 'var(--accent)' : undefined, borderColor: showBulk ? 'var(--accent)' : undefined }}
                  onClick={() => setShowBulk(p => !p)}>
                  <ClipboardList size={13}/> Nhập hàng loạt
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={addSlot}>
                  <Plus size={13}/> Thêm slot
                </button>
              </div>
            </div>

            {/* ── Bulk paste panel ── */}
            {showBulk && (
              <div style={{ marginBottom:16, padding:16, borderRadius:10, background:'rgba(0,212,255,0.04)', border:'1px solid rgba(0,212,255,0.25)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)', marginBottom:8 }}>
                  📋 Nhập hàng loạt — mỗi dòng 1 tài khoản
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10, lineHeight:1.7 }}>
                  Định dạng: <code style={{ background:'rgba(0,0,0,0.3)', padding:'1px 6px', borderRadius:4, color:'var(--accent)' }}>username|password|email|ghi_chú</code><br/>
                  Email và ghi chú có thể bỏ trống. Ví dụ:<br/>
                  <code style={{ background:'rgba(0,0,0,0.3)', padding:'2px 8px', borderRadius:4, display:'inline-block', marginTop:4, color:'#2ed573' }}>
                    player123|pass456|email@gmail.com<br/>
                    player456|pass789
                  </code>
                </div>
                <textarea
                  className="form-textarea"
                  rows={8}
                  placeholder={"player001|password1|email1@gmail.com\nplayer002|password2\nplayer003|password3|email3@gmail.com|OTP: 123456"}
                  value={bulkText}
                  onChange={e => handleBulkChange(e.target.value)}
                  style={{ fontFamily:'Share Tech Mono, monospace', fontSize:12, width:'100%', resize:'vertical' }}
                />
                {bulkPreview.length > 0 && (
                  <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:'rgba(46,213,115,0.08)', border:'1px solid rgba(46,213,115,0.25)', fontSize:12 }}>
                    <div style={{ color:'var(--success)', fontWeight:700, marginBottom:4 }}>
                      ✅ Preview: {bulkPreview.length} slot hợp lệ
                    </div>
                    <div style={{ color:'var(--text-muted)', maxHeight:80, overflow:'auto' }}>
                      {bulkPreview.slice(0,5).map((s,i) => (
                        <div key={i}>Slot {i+1}: <strong>{s.loginUsername}</strong> / {s.loginPassword ? '••••••' : '⚠️ thiếu pass'} {s.loginEmail ? `/ ${s.loginEmail}` : ''}</div>
                      ))}
                      {bulkPreview.length > 5 && <div style={{ color:'var(--text-muted)' }}>... và {bulkPreview.length - 5} slot nữa</div>}
                    </div>
                  </div>
                )}
                {bulkText && bulkPreview.length === 0 && (
                  <div style={{ marginTop:8, color:'var(--danger)', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                    <AlertCircle size={13}/> Không parse được dòng nào. Kiểm tra lại định dạng.
                  </div>
                )}
                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={applyBulk} disabled={!bulkPreview.length}>
                    <ClipboardList size={13}/> Áp dụng {bulkPreview.length > 0 ? `(${bulkPreview.length} slot)` : ''}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowBulk(false); setBulkText(''); setBulkPreview([]); }}>
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            <p style={{ fontSize:12, color:'var(--danger)', marginBottom:12, background:'rgba(255,71,87,0.08)', padding:'8px 12px', borderRadius:8 }}>
              ⚠️ Mỗi slot = 1 tài khoản thực. Buyer nhận theo thứ tự từ Slot 1. Điền chính xác!
            </p>

            {/* Performance tip khi nhiều slot */}
            {credentials.length > 20 && (
              <div style={{ fontSize:12, color:'#f0a500', background:'rgba(240,165,0,0.08)',
                border:'1px solid rgba(240,165,0,0.25)', borderRadius:8,
                padding:'8px 12px', marginBottom:12, display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ flexShrink:0 }}>⚡</span>
                <span>
                  <strong>{credentials.length} slots</strong> — chỉ hiển thị {WINDOW_SIZE} slot gần nhất để tránh lag.
                  Dùng <strong>Bulk Paste</strong> để điền nhanh. Cuộn để xem các slot còn lại.
                  {credentials.length > 100 && <span style={{ color:'var(--danger)' }}> Với {credentials.length} slots, nên dùng Bulk Paste thay vì điền tay từng slot.</span>}
                </span>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <VirtualCredList
                credentials={credentials}
                onUpdate={updateSlot}
                onRemove={removeSlot}
                onDuplicate={duplicateSlot}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 className="form-section-title">Thống kê nhanh</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addStat}><Plus size={14}/> Thêm</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {stats.map((s,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, alignItems:'center' }}>
                  <input className="form-input" placeholder="Tên chỉ số (VD: Số tướng)" value={s.key} onChange={e=>statChange(i,'key',e.target.value)}/>
                  <input className="form-input" placeholder="Giá trị (VD: 150+)" value={s.value} onChange={e=>statChange(i,'value',e.target.value)}/>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={()=>removeStat(i)}><X size={14}/></button>
                </div>
              ))}
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:10 }}>VD: Số tướng → 150+, Số skin → 80</p>
          </div>
        </div>

        {/* ════ RIGHT ════ */}
        <div className="form-col-side">

          {/* Images */}
          <div className="card">
            <h2 className="form-section-title">Hình ảnh</h2>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>Tối đa 5 ảnh. Ảnh đầu tiên là ảnh đại diện.</p>
            <div className="image-upload-grid">
              {images.map((url,i) => (
                <div key={i} className="image-preview">
                  <img src={url} alt=""/>
                  <button type="button" className="img-remove" onClick={()=>rmExisting(i)}><X size={12}/></button>
                  {i===0 && <div className="img-badge">Chính</div>}
                </div>
              ))}
              {previews.map((url,i) => (
                <div key={`n${i}`} className="image-preview">
                  <img src={url} alt=""/>
                  <button type="button" className="img-remove" onClick={()=>rmNew(i)}><X size={12}/></button>
                  <div className="img-badge new">Mới</div>
                </div>
              ))}
              {images.length + newImages.length < 5 && (
                <label className="image-upload-btn">
                  <ImagePlus size={24}/><span>Thêm ảnh</span>
                  <input type="file" accept="image/*" multiple hidden onChange={handleImageSelect}/>
                </label>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="card">
            <h2 className="form-section-title">Cài đặt</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
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
                  <div style={{ fontSize:13, fontWeight:600 }}>Đánh dấu nổi bật</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>Hiển thị trên trang chủ</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange}/>
                  <span className="toggle-slider"/>
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            <Save size={18}/> {btnLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAccountForm;

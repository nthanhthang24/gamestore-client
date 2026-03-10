// src/pages/user/TopupPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Wallet, CheckCircle, Clock, XCircle, Copy, QrCode, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './TopupPage.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://gamestore-server-i20i.onrender.com';
const AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

const statusConfig = {
  pending:  { label: 'Đang chờ',   badge: 'badge-gold',    icon: <Clock size={13} /> },
  approved: { label: 'Thành công', badge: 'badge-success', icon: <CheckCircle size={13} /> },
  failed:   { label: 'Thất bại',   badge: 'badge-danger',  icon: <XCircle size={13} /> },
};

const TopupPage = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [bankData, setBankData] = useState(null);
  const bankDataRef = useRef(null); // ← ref để closure trong onSnapshot luôn đọc được giá trị mới nhất
  const [copied, setCopied] = useState('');

  // Sync ref mỗi khi bankData thay đổi
  useEffect(() => {
    bankDataRef.current = bankData;
  }, [bankData]);

  // Realtime lịch sử + tự động detect khi được duyệt
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'topups'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const handleSnap = (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(items);

      // Dùng ref thay vì bankData để tránh stale closure
      const current = bankDataRef.current;
      if (current?.topupId) {
        const found = items.find(i => i.id === current.topupId);
        if (found?.status === 'approved') {
          fetchUserProfile(currentUser.uid);
          setBankData(null);
          toast.success(
            `✅ Nạp ${found.amount?.toLocaleString('vi-VN')}đ thành công! Số dư đã cập nhật.`,
            { duration: 6000, style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--success)' } }
          );
        }
      }
    };

    const handleError = (err) => {
      console.error('onSnapshot error:', err.code, err.message);
    };

    const unsub = onSnapshot(q, handleSnap, handleError);
    return () => unsub();
  }, [currentUser]); // ← bỏ bankData?.topupId khỏi deps - listener không cần restart

  // Polling fallback: mỗi 5 giây check topupId hiện tại nếu đang chờ
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = bankDataRef.current;
      if (!current?.topupId || !currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'topups', current.topupId));
        if (snap.exists() && snap.data().status === 'approved') {
          fetchUserProfile(currentUser.uid);
          setBankData(null);
          toast.success(
            `✅ Nạp thành công! Số dư đã cập nhật.`,
            { duration: 6000, style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--success)' } }
          );
        }
      } catch(e) {
        console.warn('Polling error:', e.message);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleCreateQR = async () => {
    if (!currentUser) { navigate('/login'); return; }
    const amt = Number(amount);
    if (!amt || amt < 10000) { toast.error('Số tiền tối thiểu 10,000đ'); return; }
    // ✅ FIX: Giới hạn số lần tạo QR (max 50 triệu/lần nạp)
    if (amt > 50_000_000) { toast.error('Số tiền tối đa mỗi lần nạp là 50,000,000đ'); return; }
    // Rate limit đơn giản: max 3 topup pending cùng lúc (không cần composite index)
    const pendingTopups = await getDocs(query(
      collection(db, 'topups'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'pending')
    ));
    if (pendingTopups.size >= 3) {
      toast.error('Bạn đang có 3 yêu cầu nạp tiền chưa xử lý. Vui lòng chờ các giao dịch hoàn tất.', {
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
      });
      return;
    }

    setLoading(true);
    try {
      const url = `${SERVER_URL}/bank/vietqr?amount=${amt}&userId=${currentUser.uid}&userEmail=${encodeURIComponent(currentUser.email)}`;
      const res = await fetch(url);
      if (!res.ok) {
        // Parse lỗi từ server
        let errMsg = `Lỗi server (HTTP ${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (!data.qrUrl) throw new Error('Server không trả về QR. Vui lòng thử lại.');
      setBankData({ ...data, amount: amt });
    } catch (err) {
      // Network error (server đang ngủ / sai URL)
      const isNetworkErr = err.message === 'Failed to fetch' || err.name === 'TypeError';
      toast.error(
        isNetworkErr
          ? '⚠️ Không kết nối được server. Server có thể đang khởi động (30s), vui lòng thử lại.'
          : err.message,
        { duration: 6000, style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }
      );
      console.error('QR Error:', err.message, 'URL:', SERVER_URL);
    } finally { setLoading(false); }
  };

  return (
    <div className="topup-page page-wrapper">
      <div className="container">

        {/* Header */}
        <div className="topup-header">
          <h1 className="section-title"><Wallet size={26} /> Nạp tiền</h1>
        </div>

        <div className="topup-layout">
          {/* LEFT: Form */}
          <div className="topup-form-col">
            <div className="card topup-step">
              <div className="step-header">
                <div className="step-num bank">1</div>
                <h2 className="step-title">Chọn số tiền muốn nạp</h2>
              </div>

              <div className="quick-amounts">
                {AMOUNTS.map(amt => (
                  <button key={amt} type="button"
                    className={`amount-btn bank ${Number(amount) === amt ? 'active' : ''}`}
                    onClick={() => setAmount(String(amt))}
                  >
                    {amt.toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: '14px' }}>
                <label className="form-label">Hoặc nhập số tiền khác</label>
                <input type="number" className="form-input"
                  placeholder="Tối thiểu 10,000đ"
                  value={amount} onChange={e => setAmount(e.target.value)} min="10000"
                />
              </div>

              <button
                className="btn btn-lg w-full pay-btn bank"
                style={{ marginTop: '18px' }}
                onClick={handleCreateQR}
                disabled={loading || !amount || Number(amount) < 10000}
              >
                {loading
                  ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Đang tạo QR...</>
                  : <><QrCode size={20} /> Tạo mã QR chuyển khoản</>
                }
              </button>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                ⚡ Hỗ trợ tất cả ngân hàng VN · Tự động cộng tiền qua SePay webhook
              </p>
            </div>

            {/* How it works */}
            <div className="card">
              <h3 className="how-title">🏦 Quy trình tự động</h3>
              <div className="process-steps">
                {[
                  'Chọn số tiền → Bấm tạo QR',
                  'Quét QR bằng app ngân hàng bất kỳ',
                  'Chuyển khoản — nội dung đã điền sẵn',
                  'SePay nhận tín hiệu → tự động cộng tiền ✅',
                ].map((s, i) => (
                  <div key={i} className="process-step">
                    <span className="step-dot bank">{i + 1}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="info-box">
                ⚡ Tự động 100% — không cần admin duyệt · Thời gian xử lý 5-30 giây
              </div>
            </div>
          </div>

          {/* RIGHT: Lịch sử */}
          <div className="topup-info-col">
            <div className="card">
              <h3 className="how-title">Lịch sử nạp tiền</h3>
              {history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                  Chưa có giao dịch nào
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {history.map(item => {
                    const cfg = statusConfig[item.status] || statusConfig.pending;
                    return (
                      <div key={item.id} className="history-item">
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent)', fontFamily: 'Rajdhani' }}>
                            +{item.amount?.toLocaleString('vi-VN')}đ
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            🏦 BIDV · {item.createdAt?.toDate?.()?.toLocaleString('vi-VN') || '—'}
                          </div>
                        </div>
                        <span className={`badge ${cfg.badge}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {bankData && (
        <BankModal data={bankData} onClose={() => setBankData(null)} onCopy={handleCopy} copied={copied} />
      )}
    </div>
  );
};

// ── Bank QR Modal ──────────────────────────────────
const BankModal = ({ data, onClose, onCopy, copied }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="payment-modal card">
      <div className="pm-header">
        <div className="pm-logo bank"><Building2 size={20} /> Chuyển khoản ngân hàng</div>
        <button className="pm-close" onClick={onClose}>✕</button>
      </div>

      <div className="pm-amount bank">
        <span>Số tiền cần chuyển</span>
        <strong>{data.amount?.toLocaleString('vi-VN')}đ</strong>
      </div>

      {/* VietQR */}
      <div className="pm-qr" style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <img src={data.qrUrl} alt="VietQR" className="qr-img" style={{ width: 200, height: 200 }} />
        <p style={{ fontSize: '12px', color: '#0066cc', textAlign: 'center', marginTop: '6px', fontWeight: 600 }}>
          Quét bằng app ngân hàng bất kỳ
        </p>
      </div>

      {/* Thông tin TK */}
      {data.method === 'va' && (
        <div style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ✅ <strong>VA riêng</strong> — SePay tự động xác nhận, không cần nhập nội dung chuyển khoản
        </div>
      )}
      {data.method === 'static' && (
        <div style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠️ <strong>Bắt buộc nhập đúng nội dung</strong> chuyển khoản bên dưới để hệ thống nhận dạng
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 16 }}>
        {[
          { label: 'Ngân hàng', value: 'BIDV', key: 'bank' },
          { label: data.method === 'va' ? '🔑 Số TK ảo (VA)' : 'Số tài khoản', value: data.accountNumber, key: 'acc', highlight: data.method === 'va' },
          { label: 'Chủ tài khoản', value: data.accountName, key: 'name' },
          { label: 'Số tiền', value: data.amount?.toLocaleString('vi-VN') + 'đ', key: 'amt' },
          ...(data.method !== 'va' ? [{ label: '⚠️ Nội dung CK', value: data.transferContent, key: 'content', highlight: true }] : []),
          ...(data.expiredAt ? [{ label: '⏱ Hết hạn', value: new Date(data.expiredAt).toLocaleTimeString('vi-VN'), key: 'exp' }] : []),
        ].map(row => (
          <div key={row.key} className={`bank-row ${row.highlight ? 'highlight' : ''}`}>
            <span className="bank-label">{row.label}</span>
            <div className="bank-value-wrap">
              <span className="bank-value" style={row.highlight ? { color: 'var(--accent)', fontFamily: 'Share Tech Mono, monospace' } : {}}>
                {row.value}
              </span>
              <button className="copy-btn" onClick={() => onCopy(row.value, row.key)}>
                {copied === row.key
                  ? <CheckCircle size={13} style={{ color: 'var(--success)' }} />
                  : <Copy size={13} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pm-waiting">
        <div className="waiting-dot" style={{ background: '#0066cc', boxShadow: '0 0 0 0 rgba(0,102,204,0.4)' }} />
        <span>Đang chờ xác nhận từ SePay...</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          {data.method === 'va'
            ? '✅ VA riêng — tự động xác nhận 5-15 giây sau chuyển khoản'
            : '⚠️ Nhớ nhập đúng nội dung CK — tự động cộng 5-30 giây'}
        </span>
      </div>
    </div>
  </div>
);

export default TopupPage;

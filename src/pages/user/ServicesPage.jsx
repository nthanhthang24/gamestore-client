// src/pages/user/ServicesPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp, doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sword, Lock, UserCheck, Zap, ChevronRight, Star,
  Clock, MessageCircle, Shield, CheckCircle, AlertCircle,
  Wallet, X, Send, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import './ServicesPage.css';

const T = { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } };

const SERVICE_ICONS = {
  'cay-thue': <Sword size={28} />,
  'doi-mat-khau': <Lock size={28} />,
  'nhap-thong-tin': <UserCheck size={28} />,
  'custom': <Zap size={28} />,
};

const CONTACT_OPTIONS = [
  { id: 'zalo', label: 'Zalo', icon: '💬' },
  { id: 'facebook', label: 'Facebook Messenger', icon: '📘' },
  { id: 'telegram', label: 'Telegram', icon: '✈️' },
  { id: 'discord', label: 'Discord', icon: '🎮' },
];

const ServiceCard = ({ service, onOrder }) => {
  const icon = SERVICE_ICONS[service.type] || SERVICE_ICONS['custom'];
  return (
    <div className={`svc-card card ${!service.available ? 'svc-unavailable' : ''}`}>
      <div className="svc-card-top">
        <div className="svc-icon-wrap" style={{ background: service.color || 'var(--accent)' }}>
          {icon}
        </div>
        {!service.available && <span className="svc-tag-unavail">Tạm ngừng</span>}
        {service.featured && service.available && <span className="svc-tag-hot"><Star size={10} /> HOT</span>}
      </div>

      <div className="svc-body">
        <h3 className="svc-name">{service.name}</h3>
        <p className="svc-desc">{service.description}</p>

        {service.features?.length > 0 && (
          <ul className="svc-features">
            {service.features.map((f, i) => (
              <li key={i}><CheckCircle size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />{f}</li>
            ))}
          </ul>
        )}

        <div className="svc-footer">
          <div className="svc-price-wrap">
            {service.priceType === 'free' ? (
              <span className="svc-price-free">Miễn phí</span>
            ) : service.priceType === 'contact' ? (
              <span className="svc-price-contact">Liên hệ báo giá</span>
            ) : (
              <span className="svc-price">
                {service.price?.toLocaleString('vi-VN')}đ
                {service.priceUnit && <span className="svc-price-unit">/{service.priceUnit}</span>}
              </span>
            )}
          </div>
          <div className="svc-meta">
            {service.estimatedTime && <span><Clock size={12} /> {service.estimatedTime}</span>}
          </div>
        </div>

        <button
          className="btn btn-primary w-full svc-order-btn"
          onClick={() => onOrder(service)}
          disabled={!service.available}
        >
          {service.available ? <><MessageCircle size={15} /> Đặt dịch vụ</> : 'Tạm ngừng'}
          {service.available && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
};

// Modal đặt dịch vụ
const OrderModal = ({ service, onClose, onSubmit }) => {
  const { currentUser, userProfile } = useAuth();
  const [form, setForm] = useState({
    gameAccount: '',
    contactMethod: 'zalo',
    contactInfo: '',
    note: '',
    quantity: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentUser) { toast.error('Vui lòng đăng nhập!', T); return; }
    if (!form.contactInfo.trim()) { toast.error('Nhập thông tin liên hệ!', T); return; }
    // Validate gameAccount required for cày thuê type
    if (service.type === 'cay-thue' && !form.gameAccount.trim()) {
      toast.error('Vui lòng nhập tên tài khoản game!', T); return;
    }
    setSubmitting(true);
    // ✅ FIX: Enforce quantity là số nguyên dương
    const qty = Math.max(1, Math.floor(Number(form.quantity) || 1));
    await onSubmit({ ...form, quantity: qty });
    setSubmitting(false);
  };

  const totalPrice = service.priceType === 'fixed'
    ? (service.price || 0) * (form.quantity || 1)
    : null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">
            <div className="svc-icon-sm" style={{ background: service.color || 'var(--accent)' }}>
              {SERVICE_ICONS[service.type] || SERVICE_ICONS['custom']}
            </div>
            <div>
              <h3>{service.name}</h3>
              <p>{service.priceType === 'contact' ? 'Admin sẽ xác nhận giá sau' : service.priceType === 'free' ? 'Miễn phí' : `${(service.price || 0).toLocaleString('vi-VN')}đ/${service.priceUnit || 'lần'}`}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="modal-info-box">
            <Info size={14} />
            <span>Sau khi đặt, admin sẽ <strong>liên hệ lại với bạn</strong> qua kênh bạn chọn để xác nhận và tiến hành dịch vụ.</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              Tên tài khoản game
              {service.type === 'cay-thue'
                ? <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>
                : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (nếu cần)</span>
              }
            </label>
            <input className="form-input" value={form.gameAccount}
              onChange={e => setForm(f => ({ ...f, gameAccount: e.target.value }))}
              placeholder="VD: PlayerName#VN1 hoặc SĐT đăng ký game" />
          </div>

          {service.priceType === 'fixed' && service.priceUnit && (
            <div className="form-group">
              <label className="form-label">Số lượng ({service.priceUnit})</label>
              <input className="form-input" type="number" min="1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              {totalPrice > 0 && (
                <div className="price-preview">Tạm tính: <strong style={{ color: 'var(--accent)' }}>{totalPrice.toLocaleString('vi-VN')}đ</strong></div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Liên hệ qua *</label>
            <div className="contact-method-grid">
              {CONTACT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`contact-method-btn ${form.contactMethod === opt.id ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, contactMethod: opt.id }))}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {form.contactMethod === 'zalo' ? 'Số điện thoại Zalo' :
               form.contactMethod === 'facebook' ? 'Link Facebook / Username' :
               form.contactMethod === 'telegram' ? 'Username Telegram (@...)' :
               'Username Discord'} *
            </label>
            <input className="form-input" value={form.contactInfo}
              onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))}
              placeholder={
                form.contactMethod === 'zalo' ? '0912345678' :
                form.contactMethod === 'facebook' ? 'facebook.com/username' :
                form.contactMethod === 'telegram' ? '@username' :
                'username#1234'
              } />
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú thêm <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tuỳ chọn)</span></label>
            <textarea className="form-input" rows={3} value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Mô tả chi tiết yêu cầu của bạn..." style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Huỷ</button>
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
            <Send size={16} /> {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Default services nếu Firestore chưa có data
const DEFAULT_SERVICES = [
  {
    id: 'cay-thue-rank', type: 'cay-thue', name: 'Cày Thuê Rank',
    description: 'Đẩy rank cho tài khoản của bạn với đội ngũ player chuyên nghiệp, tỷ lệ thắng cao.',
    features: ['Rank từ Sắt đến Cao Thủ', 'Bảo hành rank 3 ngày', 'Không share thông tin', 'Báo cáo tiến độ hàng ngày'],
    priceType: 'contact', price: null, priceUnit: null,
    estimatedTime: '1–7 ngày', color: '#ff6b35', featured: true, available: true, order: 1,
  },
  {
    id: 'doi-mat-khau', type: 'doi-mat-khau', name: 'Đổi Mật Khẩu Game',
    description: 'Hỗ trợ đổi mật khẩu tài khoản game nhanh chóng, bảo mật, đảm bảo tuyệt đối.',
    features: ['Xử lý trong 30 phút', 'Hỗ trợ mọi game', 'Cam kết bảo mật', 'Hỗ trợ 24/7'],
    priceType: 'fixed', price: 20000, priceUnit: 'lần',
    estimatedTime: '< 30 phút', color: '#7c3aed', featured: false, available: true, order: 2,
  },
  {
    id: 'nhap-thong-tin', type: 'nhap-thong-tin', name: 'Nhập Thông Tin Ảo',
    description: 'Nhập đầy đủ thông tin xác thực (CMND/CCCD ảo, số điện thoại) cho tài khoản trắng, tăng bảo mật.',
    features: ['CCCD / CMND ảo hợp lệ', 'SĐT xác minh OTP', 'Email backup', 'Hướng dẫn chi tiết'],
    priceType: 'fixed', price: 50000, priceUnit: 'tài khoản',
    estimatedTime: '1–3 giờ', color: '#059669', featured: false, available: true, order: 3,
  },
  {
    id: 'cay-quest', type: 'cay-thue', name: 'Cày Quest / Event',
    description: 'Hoàn thành nhiệm vụ, sự kiện giới hạn thay bạn. Nhận phần thưởng mà không tốn thời gian.',
    features: ['Tất cả quest thường/event', 'Bảo toàn vật phẩm', 'Xử lý nhanh', 'Báo cáo screenshot'],
    priceType: 'contact', price: null, priceUnit: null,
    estimatedTime: '2–24 giờ', color: '#d97706', featured: false, available: true, order: 4,
  },
];


// ─── MAIN PAGE ────────────────────────────────────────────────────
const ServicesPage = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [activeType, setActiveType] = useState('all');

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'services'), orderBy('order', 'asc')));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length === 0) {
        // Seed default services nếu chưa có
        setServices(DEFAULT_SERVICES);
      } else {
        setServices(data);
      }
    } catch (e) {
      setServices(DEFAULT_SERVICES);
    } finally { setLoading(false); }
  };

  const handleOrder = (service) => {
    if (!currentUser) { navigate('/login'); return; }
    setSelectedService(service);
  };

  const handleSubmitOrder = async (formData) => {
    try {
      // ✅ FIX: Rate limiting - kiểm tra có order pending trong 2 phút gần đây không
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentSnap = await getDocs(query(
        collection(db, 'serviceOrders'),
        where('userId', '==', currentUser.uid),
        where('createdAt', '>=', Timestamp.fromDate(twoMinutesAgo))
      ));
      if (recentSnap.size >= 3) {
        toast.error('Bạn đang gửi quá nhiều yêu cầu. Vui lòng đợi 2 phút.', T);
        return;
      }
      const verifiedAmount = selectedService.priceType === 'fixed'
        ? (selectedService.price || 0) * (formData.quantity || 1)
        : (formData.estimatedPrice || 0); // admin quotes variable pricing

      await addDoc(collection(db, 'serviceOrders'), {
        serviceId: selectedService.id || selectedService.type,
        serviceName: selectedService.name,
        serviceType: selectedService.type,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userProfile?.displayName || currentUser.email,
        ...formData,
        amount: verifiedAmount, // verified server-readable amount
        estimatedPrice: verifiedAmount,
        priceType: selectedService.priceType,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      // ✅ FIX: Send confirmation notification to user
      try {
        await addDoc(collection(db, 'notifications'), {
          title: '📋 Yêu cầu dịch vụ đã được gửi',
          body: `Yêu cầu "${selectedService.name}" của bạn đã được tiếp nhận. Admin sẽ liên hệ bạn qua ${formData.contactMethod} sớm nhất có thể.`,
          type: 'service',
          targetAll: false,
          targetUserId: currentUser.uid,
          active: true,
          read: [],
          createdAt: serverTimestamp(),
          createdBy: 'system',
        });
      } catch(_) {} // non-critical
      toast.success('Đã gửi yêu cầu! Admin sẽ liên hệ bạn sớm nhất có thể. 🎮', { duration: 5000, ...T });
      setSelectedService(null);
    } catch (e) {
      toast.error('Lỗi: ' + e.message, T);
    }
  };

  const serviceTypes = ['all', ...new Set(services.map(s => s.type))];
  const filtered = activeType === 'all' ? services : services.filter(s => s.type === activeType);

  const TYPE_LABELS = {
    all: 'Tất cả',
    'cay-thue': '⚔️ Cày thuê',
    'doi-mat-khau': '🔐 Đổi MK',
    'nhap-thong-tin': '👤 Nhập thông tin',
    'custom': '✨ Khác',
  };

  return (
    <div className="services-page page-wrapper">
      <div className="container">
        {/* Hero banner */}
        <div className="svc-hero card">
          <div className="svc-hero-bg" />
          <div className="svc-hero-content">
            <h1 className="svc-hero-title">
              <Zap size={28} style={{ color: 'var(--gold)' }} />
              Dịch Vụ Game
            </h1>
            <p className="svc-hero-desc">Cày thuê rank, đổi mật khẩu, nhập thông tin acc trắng — đội ngũ chuyên nghiệp, bảo mật tuyệt đối</p>
            <div className="svc-hero-badges">
              {[
                { icon: <Shield size={13} />, text: 'Bảo mật 100%' },
                { icon: <Clock size={13} />, text: 'Phản hồi nhanh' },
                { icon: <Star size={13} />, text: 'Uy tín cao' },
              ].map((b, i) => (
                <span key={i} className="svc-hero-badge"><span style={{ color: 'var(--gold)' }}>{b.icon}</span>{b.text}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Type filter */}
        <div className="svc-type-filter">
          {serviceTypes.map(t => (
            <button key={t} className={`svc-type-btn ${activeType === t ? 'active' : ''}`} onClick={() => setActiveType(t)}>
              {TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="svc-loading">Đang tải dịch vụ...</div>
        ) : (
          <div className="svc-grid">
            {filtered.map(svc => (
              <ServiceCard key={svc.id || svc.type} service={svc} onOrder={handleOrder} />
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <div className="svc-cta card">
          <div className="svc-cta-content">
            <MessageCircle size={24} style={{ color: 'var(--accent)' }} />
            <div>
              <h3>Cần dịch vụ khác?</h3>
              <p>Liên hệ trực tiếp với chúng tôi để được tư vấn và báo giá theo yêu cầu</p>
            </div>
          </div>
          <Link to="/support" className="btn btn-primary">Liên hệ ngay</Link>
        </div>
      </div>

      {selectedService && (
        <OrderModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onSubmit={handleSubmitOrder}
        />
      )}
    </div>
  );
};


export default ServicesPage;
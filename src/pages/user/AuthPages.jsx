// src/pages/user/AuthPages.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Zap, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import './AuthPages.css';

export const LoginPage = () => {
  const { login, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  // Nếu đã đăng nhập → redirect về trang chủ
  React.useEffect(() => {
    if (currentUser) navigate('/', { replace: true });
  }, [currentUser, navigate]); // ✅ FIX T1-01
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Đăng nhập thành công!', { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
      navigate('/');
    } catch (err) {
      setError('Email hoặc mật khẩu không đúng');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) { setError('Đăng nhập Google thất bại'); }
  };

  const [forgotEmail, setForgotEmail] = React.useState('');
  const [forgotMode, setForgotMode] = React.useState(false);
  const [forgotSent, setForgotSent] = React.useState(false);
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setError('Nhập email để đặt lại mật khẩu'); return; }
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setError('Email không tồn tại hoặc có lỗi xảy ra');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>
      <div className="auth-card card animate-fadeInUp">
        <div className="auth-logo">
          <div className="logo-icon"><Zap size={20} /></div>
          <span className="logo-text">GAME<span className="logo-accent">STORE</span></span>
        </div>
        <h1 className="auth-title">Đăng nhập</h1>
        <p className="auth-subtitle">Chào mừng bạn quay trở lại!</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button className="google-btn" onClick={handleGoogle} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Đăng nhập với Google
        </button>

        <div className="auth-divider"><span>hoặc</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input type="email" className="form-input" style={{ paddingLeft: '40px' }} placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input type={showPass ? 'text' : 'password'} className="form-input" style={{ paddingLeft: '40px', paddingRight: '40px' }} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {!forgotMode ? (
          <p className="auth-switch" style={{ display:'flex', justifyContent:'space-between' }}>
            <span>Chưa có tài khoản? <Link to="/register" className="auth-link">Đăng ký ngay</Link></span>
            <button type="button" className="auth-link" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:'13px' }} onClick={() => { setForgotMode(true); setError(''); }}>Quên mật khẩu?</button>
          </p>
        ) : (
          <div style={{ marginTop:'16px' }}>
            {forgotSent ? (
              <div style={{ background:'rgba(0,255,136,0.08)', border:'1px solid var(--success)', borderRadius:8, padding:'14px', textAlign:'center', fontSize:'13px', color:'var(--success)' }}>
                ✅ Email đặt lại mật khẩu đã được gửi! Kiểm tra hộp thư của bạn.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Nhập email để nhận link đặt lại mật khẩu:</p>
                <input type="email" className="form-input" placeholder="email@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                <button type="submit" className="btn btn-primary w-full">Gửi link đặt lại mật khẩu</button>
              </form>
            )}
            <button type="button" className="auth-link" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:'13px', marginTop:'10px', display:'block' }} onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}>← Quay lại đăng nhập</button>
          </div>
        )}
      </div>
    </div>
  );
};

export const RegisterPage = () => {
  const { register, currentUser } = useAuth();
  const navigate = useNavigate();

  // Nếu đã đăng nhập → redirect về trang chủ
  React.useEffect(() => {
    if (currentUser) navigate('/', { replace: true });
  }, [currentUser, navigate]); // ✅ FIX T1-01

  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.displayName);
      toast.success('Đăng ký thành công! Chào mừng bạn!', { style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } });
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Email này đã được sử dụng');
      else setError('Đăng ký thất bại, thử lại sau');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>
      <div className="auth-card card animate-fadeInUp">
        <div className="auth-logo">
          <div className="logo-icon"><Zap size={20} /></div>
          <span className="logo-text">GAME<span className="logo-accent">STORE</span></span>
        </div>
        <h1 className="auth-title">Tạo tài khoản</h1>
        <p className="auth-subtitle">Tham gia cộng đồng game thủ!</p>

        {error && <div className="auth-error"><AlertCircle size={16} /> {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Tên hiển thị</label>
            <div className="input-icon-wrap">
              <User size={16} className="input-icon" />
              <input type="text" name="displayName" className="form-input" style={{ paddingLeft: '40px' }} placeholder="Tên của bạn" value={form.displayName} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input type="email" name="email" className="form-input" style={{ paddingLeft: '40px' }} placeholder="email@example.com" value={form.email} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input type={showPass ? 'text' : 'password'} name="password" className="form-input" style={{ paddingLeft: '40px', paddingRight: '40px' }} placeholder="Ít nhất 6 ký tự" value={form.password} onChange={handleChange} required />
              <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input type="password" name="confirm" className="form-input" style={{ paddingLeft: '40px' }} placeholder="Nhập lại mật khẩu" value={form.confirm} onChange={handleChange} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login" className="auth-link">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

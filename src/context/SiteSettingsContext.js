// src/context/SiteSettingsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const LS_KEY = 'gs_site_settings';

// Đọc từ localStorage ngay — không cần đợi Firestore
function loadCached() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

const DEFAULTS = {
  siteName: 'GameStore VN',
  supportEmail: 'support@gamestore.vn',
  minTopupAmount: 10000,
  maxTopupAmount: 50000000,
};

const SiteSettingsContext = createContext(DEFAULTS);

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const SiteSettingsProvider = ({ children }) => {
  // Khởi tạo từ cache → không bao giờ flash tên cũ
  const [settings, setSettings] = useState(() => ({
    ...DEFAULTS,
    ...(loadCached() || {}),
  }));

  useEffect(() => {
    // Apply cached siteName vào title ngay lập tức
    const cached = loadCached();
    if (cached?.siteName) document.title = cached.siteName;

    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const updated = {
        ...DEFAULTS,
        ...(d.siteName       && { siteName:       d.siteName }),
        ...(d.supportEmail   && { supportEmail:   d.supportEmail }),
        ...(d.minTopupAmount && { minTopupAmount: d.minTopupAmount }),
        ...(d.maxTopupAmount && { maxTopupAmount: d.maxTopupAmount }),
      };
      setSettings(updated);
      // Lưu vào localStorage để lần sau load ngay
      try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch (_) {}
      // Cập nhật document.title
      if (d.siteName) document.title = d.siteName;
    }, () => {});

    return () => unsub();
  }, []);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

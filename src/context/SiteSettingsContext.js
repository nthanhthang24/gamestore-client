// src/context/SiteSettingsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const SiteSettingsContext = createContext({
  siteName: 'GameStore VN',
  supportEmail: 'support@gamestore.vn',
  minTopupAmount: 10000,
  maxTopupAmount: 50000000,
});

export const useSiteSettings = () => useContext(SiteSettingsContext);

export const SiteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    siteName: 'GameStore VN',
    supportEmail: 'support@gamestore.vn',
    minTopupAmount: 10000,
    maxTopupAmount: 50000000,
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setSettings(prev => ({
        ...prev,
        ...(d.siteName          && { siteName: d.siteName }),
        ...(d.supportEmail      && { supportEmail: d.supportEmail }),
        ...(d.minTopupAmount    && { minTopupAmount: d.minTopupAmount }),
        ...(d.maxTopupAmount    && { maxTopupAmount: d.maxTopupAmount }),
      }));
    }, () => {});
    return () => unsub();
  }, []);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

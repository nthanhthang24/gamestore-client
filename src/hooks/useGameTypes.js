// src/hooks/useGameTypes.js
// Hook dùng chung để load danh sách loại game từ Firestore
// Fallback về danh sách hardcode nếu Firestore chưa có dữ liệu

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const FALLBACK_GAME_TYPES = [
  { id: 'LMHT',             name: 'LMHT',             icon: '🏆', color: '#C89B3C', active: true },
  { id: 'VALORANT',         name: 'VALORANT',         icon: '🎯', color: '#FF4655', active: true },
  { id: 'Free Fire',        name: 'Free Fire',        icon: '🔥', color: '#FF6B35', active: true },
  { id: 'PUBG',             name: 'PUBG',             icon: '🎮', color: '#F5C518', active: true },
  { id: 'Genshin Impact',   name: 'Genshin Impact',   icon: '⚔️', color: '#9B59B6', active: true },
  { id: 'Liên Quân',        name: 'Liên Quân',        icon: '⚡', color: '#3498DB', active: true },
  { id: 'Mobile Legends',   name: 'Mobile Legends',   icon: '👑', color: '#E74C3C', active: true },
  { id: 'Clash of Clans',   name: 'Clash of Clans',   icon: '🏰', color: '#2ECC71', active: true },
  { id: 'Play Together',    name: 'Play Together',    icon: '🌈', color: '#FF69B4', active: true },
];

export function useGameTypes() {
  const [gameTypes, setGameTypes] = useState(FALLBACK_GAME_TYPES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gameTypes'), snap => {
      if (snap.empty) {
        // Chưa có data trong Firestore → dùng fallback
        setGameTypes(FALLBACK_GAME_TYPES);
      } else {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(g => g.active !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setGameTypes(data.length > 0 ? data : FALLBACK_GAME_TYPES);
      }
      setLoading(false);
    }, () => {
      // Permission error fallback
      setGameTypes(FALLBACK_GAME_TYPES);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Trả về tên dạng array để dùng trong filter/select
  const gameTypeNames = gameTypes.map(g => g.name);
  const gameTypeNamesWithAll = ['Tất cả', ...gameTypeNames];

  return { gameTypes, gameTypeNames, gameTypeNamesWithAll, loading };
}

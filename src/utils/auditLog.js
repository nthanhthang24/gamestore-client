// src/utils/auditLog.js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAuth } from 'firebase/auth';

export const logAudit = async (action, details = {}, adminEmail = '') => {
  try {
    const uid = getAuth().currentUser?.uid || '';
    await addDoc(collection(db,'auditLogs'), {
      action,
      userId: uid, // FIX 2025-T: required by Firestore rule
      ...details,
      adminEmail,
      createdAt: serverTimestamp(),
    });
  } catch(e) {
    console.warn('Audit log failed:', e.message);
  }
};

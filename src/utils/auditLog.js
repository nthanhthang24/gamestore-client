// src/utils/auditLog.js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const logAudit = async (action, details = {}, adminEmail = '') => {
  try {
    await addDoc(collection(db,'auditLogs'), {
      action, ...details, adminEmail,
      createdAt: serverTimestamp(),
    });
  } catch(e) {
    console.warn('Audit log failed:', e.message);
  }
};

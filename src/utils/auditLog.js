// src/utils/auditLog.js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAuth } from 'firebase/auth';

// SECURITY: whitelist allowed detail fields to match Firestore rule constraints
const ALLOWED_DETAIL_KEYS = new Set([
  'targetUserId','targetEmail','amount','note','orderId','gameType','accountId','data'
]);

export const logAudit = async (action, details = {}, adminEmail = '') => {
  try {
    const uid = getAuth().currentUser?.uid || '';
    // Whitelist-filter detail fields + truncate note/action to rule limits
    const safeDetails = {};
    for (const [k, v] of Object.entries(details)) {
      if (ALLOWED_DETAIL_KEYS.has(k)) safeDetails[k] = v;
    }
    if (safeDetails.note && typeof safeDetails.note === 'string') {
      safeDetails.note = safeDetails.note.slice(0, 500);
    }
    const safeAction = (typeof action === 'string' ? action : String(action)).slice(0, 100);
    await addDoc(collection(db,'auditLogs'), {
      action:     safeAction,
      userId:     uid,
      ...safeDetails,
      adminEmail,
      createdAt:  serverTimestamp(),
    });
  } catch(e) {
    console.warn('Audit log failed:', e.message);
  }
};

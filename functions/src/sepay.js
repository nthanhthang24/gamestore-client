// functions/src/sepay.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

const db = admin.firestore();

exports.sepayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const body = req.body;
    console.log('SePay webhook:', JSON.stringify(body));

    // Xác thực API key từ SePay
    const apiKey = process.env.SEPAY_API_KEY;
    if (apiKey) {
      const authHeader = req.headers['authorization'] || '';
      const receivedKey = authHeader.replace('Apikey ', '').trim();
      if (receivedKey !== apiKey) {
        console.error('SePay API key mismatch');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { id: sePayId, gateway, transactionDate, content,
      transferType, transferAmount, referenceCode, error: sePayError } = body;

    // Chỉ xử lý tiền VÀO, không lỗi
    if (transferType !== 'in' || sePayError !== 0) {
      return res.status(200).json({ message: 'Skipped' });
    }
    if (!transferAmount || transferAmount <= 0) {
      return res.status(200).json({ message: 'Invalid amount' });
    }

    // Chống duplicate
    const existing = await db.collection('transactions')
      .where('sePayId', '==', String(sePayId)).limit(1).get();
    if (!existing.empty) return res.status(200).json({ message: 'Already processed' });

    // Tìm user từ nội dung CK
    const parsedUser = await parseContent(content, transferAmount);
    if (!parsedUser) {
      await db.collection('unmatchedTopups').add({
        sePayId: String(sePayId), gateway, content,
        amount: transferAmount, transactionDate, referenceCode,
        status: 'unmatched', createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('Unmatched transfer:', content, transferAmount);
      return res.status(200).json({ message: 'Unmatched' });
    }

    // Cộng balance
    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(parsedUser.userId);
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');
      const prev = userDoc.data().balance || 0;
      const next = prev + transferAmount;

      tx.update(userRef, { balance: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      tx.set(db.collection('topups').doc(), {
        userId: parsedUser.userId, userEmail: parsedUser.userEmail,
        userName: parsedUser.displayName || parsedUser.userEmail,
        amount: transferAmount, method: 'bank_transfer', gateway,
        content, referenceCode, sePayId: String(sePayId),
        transactionDate, status: 'approved', autoApproved: true,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(db.collection('transactions').doc(), {
        userId: parsedUser.userId, userEmail: parsedUser.userEmail,
        type: 'topup', method: 'bank_transfer', gateway,
        amount: transferAmount, balanceBefore: prev, balanceAfter: next,
        sePayId: String(sePayId), referenceCode, content,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Bank +${transferAmount} for ${parsedUser.userEmail}`);
    return res.status(200).json({ message: 'success' });
  } catch (err) {
    console.error('sepayWebhook:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function parseContent(content, amount) {
  if (!content) return null;
  const napMatch = content.match(/NAP\s+([^\s]+)/i);
  if (napMatch) {
    const id = napMatch[1].toLowerCase();
    if (id.includes('@')) {
      const q = await db.collection('users').where('email', '==', id).limit(1).get();
      if (!q.empty) { const d = q.docs[0].data(); return { userId: q.docs[0].id, userEmail: d.email, displayName: d.displayName }; }
    }
    const q = await db.collection('users').orderBy('email').startAt(id).endAt(id + '\uf8ff').limit(3).get();
    if (!q.empty) { const d = q.docs[0].data(); return { userId: q.docs[0].id, userEmail: d.email, displayName: d.displayName }; }
  }
  // Fallback: tìm pending topup khớp amount trong 24h
  const q = await db.collection('topups')
    .where('method', '==', 'bank_transfer').where('status', '==', 'pending')
    .where('amount', '==', amount).orderBy('createdAt', 'desc').limit(1).get();
  if (!q.empty) {
    const td = q.docs[0].data();
    const hrs = (Date.now() - (td.createdAt?.toDate?.()?.getTime() || 0)) / 3600000;
    if (hrs <= 24) return { userId: td.userId, userEmail: td.userEmail, displayName: td.userName };
  }
  return null;
}

exports.generateVietQR = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { amount, userId, userEmail } = req.query;
    const BIN = process.env.BANK_BIN || '970418';
    const ACC = process.env.BANK_ACCOUNT_NUMBER || '1290702118';
    const NAME = process.env.BANK_ACCOUNT_NAME || 'NGUYEN NAM SON';

    const transferContent = `NAP ${(userEmail?.split('@')[0] || userId?.slice(0, 8) || 'USER').toUpperCase()}`;
    const qrUrl = `https://img.vietqr.io/image/${BIN}-${ACC}-compact2.png`
      + `?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(NAME)}`;

    const topupRef = await db.collection('topups').add({
      userId, userEmail, amount: Number(amount),
      method: 'bank_transfer', transferContent, status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      qrUrl, transferContent,
      bankBin: BIN, accountNumber: ACC, accountName: NAME,
      amount: Number(amount), topupId: topupRef.id,
    });
  });
});

# GameStore VN — Mua Bán Tài Khoản Game
## Sprint 4 — Final Release

### Stack
- **Frontend**: React 18 → Vercel
- **Backend**: Express.js → Render.com
- **Auth/DB**: Firebase (Firestore, Auth)
- **Payments**: BIDV via SePay webhook
- **Images**: Cloudinary

### Deploy Frontend (Vercel)
```
cd frontend
npm install
npm run build
```
Env vars:
```
REACT_APP_SERVER_URL=https://gamestore-server-i20i.onrender.com
REACT_APP_CLOUDINARY_CLOUD_NAME=<your_cloud>
REACT_APP_CLOUDINARY_UPLOAD_PRESET=gamestore_upload
```

### Deploy Server (Render.com)
```
cd server
npm install
node index.js
```
Env vars:
```
FIREBASE_PROJECT_ID=gamestore-93186
FIREBASE_API_KEY=AIzaSyC1efvwK3jBRT1rIK30dc6bMXrs7PYiI1E
SERVER_URL=https://gamestore-server-i20i.onrender.com
FRONTEND_URL=https://playtogethermarket.vercel.app
SEPAY_API_KEY=<your_sepay_key>
SEPAY_HMAC_SECRET=<optional_hmac_secret>
BANK_BIN=970418
BANK_ACCOUNT_NUMBER=1290702118
BANK_ACCOUNT_NAME=NGUYEN NAM SON
BANK_VA_NUMBER=<your_va_number>
SKIP_IP_CHECK=true
NODE_ENV=production
```

### Firebase
- Deploy indexes: `firebase deploy --only firestore:indexes`
- Publish rules via Firebase Console

### Features (Sprint 4 Final)
- Full shop với pagination load-more
- Flash sale với countdown realtime
- Checkout với Firestore transaction + idempotency
- Nạp tiền qua VietQR / SePay webhook (HMAC verified)
- Lịch sử giao dịch trong ProfilePage + TopupPage
- Admin: CRUD accounts, orders, vouchers, users, settings
- Admin: Topups approve/reject manual, CSV export
- Admin: Dashboard với revenue chart + top-selling widget
- Admin: Bulk delete accounts, pending badge sidebar
- Mobile responsive toàn bộ pages

# 🚀 HƯỚNG DẪN DEPLOY GAMESTORE VN

## Kiến trúc
```
Client (React) → Vercel
Firebase (Firestore + Auth) → gamestore-93186
Server (Express/Node) → Render.com  ← SePay webhook + VietQR
```

---

## BƯỚC 1 — Deploy Client lên Vercel

### 1.1 Tạo file `.env.local` (development)
```
REACT_APP_SERVER_URL=https://gamestore-server-i20i.onrender.com
REACT_APP_CLOUDINARY_CLOUD_NAME=<cloud_name_của_bạn>
REACT_APP_CLOUDINARY_UPLOAD_PRESET=<preset_name>
```

### 1.2 Build & Deploy lên Vercel
```bash
npm install
npm run build
```
Kéo thả thư mục `build/` vào https://vercel.com → Import Project  
Hoặc dùng Vercel CLI: `vercel deploy --prod`

### 1.3 Environment Variables trên Vercel Dashboard
| Key | Value |
|-----|-------|
| `REACT_APP_SERVER_URL` | `https://gamestore-server-i20i.onrender.com` |
| `REACT_APP_CLOUDINARY_CLOUD_NAME` | Cloud name từ Cloudinary dashboard |
| `REACT_APP_CLOUDINARY_UPLOAD_PRESET` | Upload preset (unsigned) |

> **Lưu ý:** Firebase config được hardcode trong `src/firebase/config.js` — đây là public key, an toàn.

---

## BƯỚC 2 — Deploy Server lên Render.com

### 2.1 Upload `server/` lên GitHub (repo riêng)

### 2.2 Tạo Web Service trên Render
- Runtime: **Node**
- Build Command: `npm install`
- Start Command: `node index.js`
- Instance Type: **Free**

### 2.3 Environment Variables trên Render
| Key | Value | Bắt buộc |
|-----|-------|----------|
| `FIREBASE_PROJECT_ID` | `gamestore-93186` | ✅ |
| `FIREBASE_API_KEY` | `AIzaSyC1efvwK3jBRT1rIK30dc6bMXrs7PYiI1E` | ✅ |
| `FRONTEND_URL` | `https://your-app.vercel.app` | ✅ |
| `SEPAY_API_KEY` | API key từ SePay dashboard | ✅ |
| `BANK_BIN` | `970418` (BIDV) | ✅ |
| `BANK_ACCOUNT_NUMBER` | `1290702118` | ✅ |
| `BANK_ACCOUNT_NAME` | `NGUYEN NAM SON` | ✅ |
| `BANK_VA_NUMBER` | Số VA từ SePay → Ngân hàng → Tài khoản ảo | ⭐ Quan trọng |
| `SKIP_IP_CHECK` | `false` (production) / `true` (test) | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `ALLOW_TEST` | `true` để bật `/bank/test-webhook` (chỉ dùng khi test) | Dev only |
| `PORT` | Render tự set — không cần điền | Auto |

> ⭐ **BANK_VA_NUMBER**: Lấy tại my.sepay.vn → Ngân hàng → Tài khoản ảo → cột "Số VA"  
> Nếu không có VA → webhook KHÔNG hoạt động (SePay chỉ track VA, không track STK gốc)

---

## BƯỚC 3 — Deploy Firebase (Rules + Indexes)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

> **Lưu ý:** Không còn Firebase Functions — SePay webhook chạy trên Render server.

---

## BƯỚC 4 — Cấu hình SePay Webhook

1. Vào https://my.sepay.vn → Tích hợp → Webhook
2. URL: `https://gamestore-server-i20i.onrender.com/bank/webhook`
3. API Key: điền `SEPAY_API_KEY` (cùng giá trị với env var)
4. Bật Active → Lưu

---

## BƯỚC 5 — Set Admin đầu tiên

1. Đăng ký tài khoản tại website
2. Vào Firebase Console → Firestore → `users` → tìm document của bạn
3. Thêm field: `role = "admin"`
4. Reload → thấy nút Admin ✅

---

## LINK QUAN TRỌNG
- 🌐 Website: https://playtogethermarket.vercel.app
- 🔧 Firebase Console: https://console.firebase.google.com/project/gamestore-93186
- 📊 SePay Dashboard: https://my.sepay.vn
- 🖼️ Cloudinary: https://cloudinary.com/console
- 🚀 Render Dashboard: https://dashboard.render.com

# 🎮 GameStore VN - Hướng Dẫn Cài Đặt & Triển Khai

Nền tảng mua bán tài khoản game uy tín, hiện đại, hoàn toàn miễn phí.

---

## 🚀 Stack Công Nghệ (100% Free)

| Thành phần | Công nghệ | Chi phí |
|---|---|---|
| Frontend | React 18 | Free |
| Authentication | Firebase Auth | Free (10K users/tháng) |
| Database | Firebase Firestore | Free (1GB, 50K reads/ngày) |
| Storage ảnh | Firebase Storage | Free (5GB) |
| Hosting | Vercel hoặc Netlify | Free |

---

## 📁 Cấu Trúc Dự Án

```
src/
├── components/
│   └── shared/
│       ├── Navbar.jsx          # Navigation bar
│       └── AccountCard.jsx     # Card sản phẩm
├── context/
│   └── AuthContext.js          # Xác thực người dùng
├── firebase/
│   └── config.js               # Cấu hình Firebase
├── pages/
│   ├── user/
│   │   ├── HomePage.jsx        # Trang chủ
│   │   ├── ShopPage.jsx        # Cửa hàng + bộ lọc
│   │   ├── AccountDetailPage   # Chi tiết sản phẩm
│   │   ├── CartPage.jsx        # Giỏ hàng
│   │   └── AuthPages.jsx       # Login / Register
│   └── admin/
│       ├── AdminDashboard.jsx  # Layout + Overview
│       ├── AdminAccounts.jsx   # Quản lý accounts
│       └── AdminAccountForm    # Thêm/sửa account
└── index.css                   # Global styles
```

---

## ⚙️ Bước 1: Tạo Firebase Project

1. Vào https://console.firebase.google.com
2. Click **"Add project"** → Đặt tên → Tạo project
3. Vào **Project Settings** → **Your apps** → Click biểu tượng `</>`
4. Đặt tên app → **Register app** → Copy config

---

## ⚙️ Bước 2: Cấu hình Firebase

Mở file `src/firebase/config.js` và điền thông tin:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // Từ Firebase Console
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

---

## ⚙️ Bước 3: Bật các dịch vụ Firebase

### Authentication
1. Firebase Console → **Authentication** → **Get started**
2. Bật **Email/Password**
3. Bật **Google** (tùy chọn)

### Firestore Database
1. Firebase Console → **Firestore Database** → **Create database**
2. Chọn **Start in test mode** (sau đổi production rules)
3. Chọn region gần nhất (asia-southeast1 cho VN)

### Storage
1. Firebase Console → **Storage** → **Get started**
2. Start in test mode

---

## ⚙️ Bước 4: Tạo tài khoản Admin

Sau khi đăng ký tài khoản trên web, vào **Firestore Console**:

```
Collection: users
Document: [uid của bạn]
Field: role = "admin"    ← Thêm/sửa field này
```

---

## ⚙️ Bước 5: Cài đặt & Chạy

```bash
# Cài dependencies
npm install

# Chạy development
npm start

# Build production
npm run build
```

---

## 🌐 Bước 6: Deploy lên Vercel (Free)

```bash
# Cài Vercel CLI
npm i -g vercel

# Build
npm run build

# Deploy
vercel --prod
```

**Hoặc dùng Netlify:**
1. Vào https://netlify.com → **Add new site** → **Deploy manually**
2. Kéo thả thư mục `build/` vào

---

## 🔒 Bước 7: Cập nhật Security Rules

Dán nội dung từ `firestore.rules` vào:
Firebase Console → Firestore → **Rules** tab

---

## 📊 Cấu Trúc Firestore

### Collection: `accounts`
```json
{
  "title": "Nick LMHT Kim Cương II",
  "gameType": "LMHT",
  "rank": "Kim Cương",
  "price": 500000,
  "originalPrice": 800000,
  "description": "Mô tả chi tiết...",
  "images": ["url1", "url2"],
  "stats": { "Số tướng": "150+", "Skin": "80" },
  "status": "available",
  "featured": true,
  "views": 0,
  "createdAt": "timestamp"
}
```

### Collection: `users`
```json
{
  "uid": "user_id",
  "email": "user@email.com",
  "displayName": "Nguyễn Văn A",
  "role": "user",          // hoặc "admin"
  "balance": 0,
  "createdAt": "timestamp"
}
```

### Collection: `orders`
```json
{
  "userId": "user_id",
  "userEmail": "user@email.com",
  "items": [{ "id": "acc_id", "title": "...", "price": 500000 }],
  "total": 500000,
  "status": "pending",     // pending, completed, cancelled
  "createdAt": "timestamp"
}
```

---

## 🎨 Tùy Chỉnh

### Đổi tên/logo
- Tìm "GAMESTORE" trong các file và thay bằng tên của bạn

### Thêm loại game
- Mở `ShopPage.jsx` → tìm `GAME_TYPES` array → thêm game mới

### Đổi màu chủ đạo
- Mở `index.css` → sửa `--accent` (màu chính) và `--accent2` (màu phụ)

---

## 💡 Mở Rộng Tính Năng

- **Thanh toán online**: Tích hợp VNPay, Momo qua API
- **Chat realtime**: Firebase Realtime Database
- **Thông báo**: Firebase Cloud Messaging (FCM)
- **Analytics**: Firebase Analytics (free)
- **SEO**: Next.js (thay React)

---

## 📞 Hỗ Trợ

Liên hệ support để được hỗ trợ cài đặt và tùy chỉnh!

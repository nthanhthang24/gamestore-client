# 🚀 HƯỚNG DẪN DEPLOY - ĐỌC CÁI NÀY TRƯỚC

## Thông tin đã được điền sẵn trong project này:
- ✅ BIDV STK: 1290702118 | Tên: NGUYEN NAM SON
- ✅ SePay API Key đã cấu hình
- ✅ MoMo Sandbox keys
- ✅ Firebase project: gamestore-93186

---

## CHỈ CẦN CHẠY 6 LỆNH NÀY THEO THỨ TỰ:

### 1. Cài Firebase CLI (1 lần duy nhất)
```
npm install -g firebase-tools
```

### 2. Đăng nhập Firebase
```
firebase login
```
→ Trình duyệt mở ra → đăng nhập Google account có project gamestore-93186

### 3. Cài thư viện
```
npm install
```

### 4. Cài thư viện Functions
```
cd functions && npm install && cd ..
```

### 5. Set config lên Firebase (copy nguyên lệnh này)
```
firebase functions:config:set sepay.api_key="KGFM0Y3KLBP06BWWNJADDQZILTAMZ7EKTMJ9QHXNRD2UYXUOSEFWJVFHZ5XRGQA8" bank.bin="970418" bank.account_number="1290702118" bank.account_name="NGUYEN NAM SON" momo.partner_code="MOMO" momo.access_key="F8BBA842ECF85" momo.secret_key="K951B6PE1waDMi640xX08PD3vg6EkVlz" app.frontend_url="https://gamestore-93186.web.app" app.functions_url="https://us-central1-gamestore-93186.cloudfunctions.net"
```

### 6. Build và Deploy
```
npm run build && firebase deploy
```

---

## SAU KHI DEPLOY XONG:

### Cấu hình Webhook SePay (QUAN TRỌNG):
1. Vào https://sepay.vn → đăng nhập
2. Tích hợp → Webhook → Thêm mới
3. Điền URL: https://us-central1-gamestore-93186.cloudfunctions.net/sepayWebhook
4. Bật Active → Lưu

### Set tài khoản Admin:
1. Vào https://gamestore-93186.web.app → Đăng ký tài khoản
2. Vào https://console.firebase.google.com → project gamestore-93186
3. Firestore → users → tìm document của bạn
4. Thêm field: role = "admin"
5. Reload trang → thấy nút Admin màu vàng ✅

---

## LINK QUAN TRỌNG:
- 🌐 Website: https://gamestore-93186.web.app
- 🔧 Firebase Console: https://console.firebase.google.com/project/gamestore-93186
- 📊 SePay Dashboard: https://sepay.vn
- 📝 Functions Logs: firebase functions:log


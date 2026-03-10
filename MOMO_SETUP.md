# 🚀 Hướng dẫn Deploy MoMo Payment + Firebase Cloud Functions

---

## BƯỚC 1: Cài Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

---

## BƯỚC 2: Cài dependencies cho Functions

```bash
cd functions
npm install
cd ..
```

---

## BƯỚC 3: Đăng ký MoMo Business (để lấy key thật)

### Sandbox (dùng để test ngay, không cần đăng ký):
Các key sandbox đã được điền sẵn trong `functions/src/index.js`:
- partnerCode: `MOMO`
- accessKey: `F8BBA842ECF85`
- secretKey: `K951B6PE1waDMi640xX08PD3vg6EkVlz`

### Production (khi go-live):
1. Vào https://business.momo.vn → Đăng ký tài khoản doanh nghiệp
2. Vào phần **Tích hợp API** → Lấy partnerCode, accessKey, secretKey
3. Thay endpoint thành: `https://payment.momo.vn/v2/gateway/api/create`

---

## BƯỚC 4: Set config cho Functions

```bash
# Set MoMo keys (thay bằng key thật khi production)
firebase functions:config:set \
  momo.partner_code="MOMO" \
  momo.access_key="F8BBA842ECF85" \
  momo.secret_key="K951B6PE1waDMi640xX08PD3vg6EkVlz" \
  app.frontend_url="https://gamestore-93186.web.app" \
  app.functions_url="https://us-central1-gamestore-93186.cloudfunctions.net"
```

---

## BƯỚC 5: Deploy Functions

```bash
# Deploy chỉ functions
firebase deploy --only functions

# Sau khi deploy xong, lấy URL functions:
# Firebase Console → Functions → tab Dashboard → copy URL
# Ví dụ: https://us-central1-gamestore-93186.cloudfunctions.net
```

---

## BƯỚC 6: Cập nhật FUNCTIONS_URL trong frontend

Tạo file `.env` ở thư mục gốc:

```bash
# .env
REACT_APP_FUNCTIONS_URL=https://us-central1-gamestore-93186.cloudfunctions.net
```

---

## BƯỚC 7: Build và Deploy Frontend

```bash
# Build React app
npm run build

# Deploy lên Firebase Hosting
firebase deploy --only hosting

# Hoặc deploy tất cả cùng lúc
firebase deploy
```

---

## BƯỚC 8: Cập nhật Firestore Rules

Dán nội dung `firestore.rules` vào:
Firebase Console → Firestore → tab **Rules**

---

## BƯỚC 9: Test với Sandbox

Khi dùng sandbox, dùng thông tin test sau để thanh toán:
- **Số điện thoại MoMo test**: `0909090909`  
- **OTP**: `000000`
- **PIN**: `000000`

---

## Kiến trúc hoạt động

```
[User chọn 200,000đ] 
    ↓
[Frontend gọi POST /createMomoPayment]
    ↓
[Cloud Function tạo payment request → Lưu topup(status: pending) → Gọi MoMo API]
    ↓
[MoMo trả về payUrl + QR Code]
    ↓
[Frontend hiện modal QR / nút mở MoMo]
    ↓
[User quét QR / mở app MoMo → Thanh toán]
    ↓
[MoMo gọi IPN webhook → POST /momoIPN]
    ↓
[Cloud Function xác minh chữ ký HMAC SHA256]
    ↓
[Firestore Transaction: 
  - topup.status = 'approved'
  - users.balance += 200000
  - transactions.add(log)]
    ↓
[Firestore onSnapshot → Frontend nhận realtime update]
    ↓
[Toast "Nạp 200,000đ thành công!" + Balance tự động cập nhật]
```

---

## Lưu ý bảo mật quan trọng

- ✅ Chữ ký HMAC SHA256 được verify trước khi cộng tiền
- ✅ Kiểm tra duplicate (idempotent) - cùng 1 orderId không bị xử lý 2 lần
- ✅ Dùng Firestore Transaction để tránh race condition
- ✅ Secret key KHÔNG được hardcode trong frontend (chỉ trong Cloud Functions)
- ✅ Firestore Rules ngăn user tự sửa balance

---

## Troubleshooting

**Functions không nhận được IPN từ MoMo sandbox?**
- Đảm bảo `ipnUrl` là HTTPS và accessible từ internet
- Dùng ngrok để test local: `ngrok http 5001`

**"Invalid signature" trong logs?**
- Kiểm tra secretKey có đúng không
- Đảm bảo các field trong rawSignature đúng thứ tự alphabetical

**Balance không cộng sau khi thanh toán?**
- Kiểm tra Firebase Console → Functions → Logs
- Kiểm tra Firestore Rules có cho phép Cloud Functions update không

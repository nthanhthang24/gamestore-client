# ⚡ Setup SePay + MoMo Song Song

---

## TỔNG QUAN KIẾN TRÚC

```
User bấm nạp tiền
    ↓
Chọn phương thức: [💜 MoMo] hoặc [🏦 Ngân hàng]
    ↓
══════════════════════════════════════════════
MoMo Flow:                Bank Flow:
  ↓                         ↓
Cloud Function            Cloud Function
createMomoPayment         generateVietQR
  ↓                         ↓
Modal: QR MoMo +          Modal: VietQR +
nút mở app                thông tin TK
  ↓                         ↓
User thanh toán           User CK với nội dung
trên app MoMo             "NAP [email prefix]"
  ↓                         ↓
MoMo POST /momoIPN        SePay POST /sepayWebhook
(tự động)                 (tự động, 1-5 giây)
══════════════════════════════════════════════
    ↓
Firestore Transaction: balance += amount
    ↓
onSnapshot realtime → Frontend cập nhật
    ↓
Toast "Nạp thành công! ✅"
```

---

## SETUP SEPAY (5 phút)

### Bước 1: Đăng ký SePay
1. Vào https://sepay.vn → Đăng ký tài khoản
2. Vào **Tài khoản ngân hàng** → Thêm tài khoản ngân hàng của bạn
3. SePay hỗ trợ: Vietcombank, MB Bank, Techcombank, BIDV, VPBank, ACB, TPBank, ...

### Bước 2: Lấy API Key
- Vào **Cài đặt** → **API Key** → Copy

### Bước 3: Điền thông tin tài khoản ngân hàng
- Vào Firebase Console → Functions config:

```bash
firebase functions:config:set \
  sepay.api_key="YOUR_SEPAY_API_KEY" \
  bank.bin="970422" \
  bank.account_number="0123456789" \
  bank.account_name="NGUYEN VAN A"
```

**BIN các ngân hàng phổ biến:**
| Ngân hàng | BIN |
|---|---|
| Vietcombank | 970436 |
| MB Bank | 970422 |
| Techcombank | 970407 |
| BIDV | 970418 |
| VPBank | 970432 |
| ACB | 970416 |
| TPBank | 970423 |
| Agribank | 970405 |

### Bước 4: Cấu hình Webhook trong SePay
- Vào SePay → **Tích hợp** → **Webhook**
- Điền URL: `https://us-central1-gamestore-93186.cloudfunctions.net/sepayWebhook`
- Method: POST
- Bật trạng thái Active

### Bước 5: Deploy Functions
```bash
firebase deploy --only functions
```

---

## SETUP MOMO (đã có sẵn)

```bash
firebase functions:config:set \
  momo.partner_code="MOMO" \
  momo.access_key="F8BBA842ECF85" \
  momo.secret_key="K951B6PE1waDMi640xX08PD3vg6EkVlz" \
  app.frontend_url="https://gamestore-93186.web.app" \
  app.functions_url="https://us-central1-gamestore-93186.cloudfunctions.net"
```

**Sandbox test:** Dùng SĐT `0909090909`, OTP `000000`, PIN `000000`

---

## NỘI DUNG CHUYỂN KHOẢN (quan trọng!)

Khi user chuyển khoản ngân hàng, nội dung phải theo format:

```
NAP [email prefix]
```

Ví dụ: email là `nguyenvana@gmail.com` → nội dung: `NAP nguyenvana`

Hệ thống sẽ tự tìm user theo email prefix. VietQR đã điền sẵn nội dung này, user chỉ cần quét QR là xong.

---

## FIRESTORE COLLECTIONS

### `topups`
```js
{
  userId, userEmail, userName,
  amount: 200000,
  method: 'momo' | 'bank_transfer',
  status: 'pending' | 'approved' | 'failed',
  // MoMo fields:
  orderId, momoTransId, payUrl,
  // Bank fields:
  sePayId, gateway, content, transferContent, referenceCode,
  createdAt, approvedAt
}
```

### `transactions` (audit log)
```js
{
  userId, userEmail, type: 'topup',
  method: 'momo' | 'bank_transfer',
  amount, balanceBefore, balanceAfter,
  createdAt
}
```

### `unmatchedTopups` (CK không khớp user)
```js
{
  sePayId, gateway, content, amount,
  status: 'unmatched',
  createdAt
}
// Admin xử lý thủ công nếu có
```

---

## DEPLOY TẤT CẢ

```bash
# 1. Cài dependencies
cd functions && npm install && cd ..

# 2. Set config
firebase functions:config:set ...

# 3. Build frontend
npm run build

# 4. Deploy
firebase deploy

# 5. Kiểm tra logs
firebase functions:log --only sepayWebhook
firebase functions:log --only momoIPN
```

---

## TROUBLESHOOTING

**SePay không gọi webhook?**
- Kiểm tra URL webhook trong SePay dashboard có đúng không
- Kiểm tra Functions đã deploy thành công chưa: Firebase Console → Functions

**"Unmatched transfer" trong logs?**
- User không điền đúng nội dung chuyển khoản
- Kiểm tra collection `unmatchedTopups` trong Firestore để xử lý thủ công

**MoMo sandbox không có QR thật?**
- Bình thường — sandbox trả về payUrl, không có qrCodeUrl
- Production sẽ có đầy đủ QR

// functions/src/index.js
const admin = require('firebase-admin');
admin.initializeApp();

// MoMo Payment Functions
const momo = require('./momo');
exports.createMomoPayment = momo.createMomoPayment;
exports.momoIPN = momo.momoIPN;
exports.checkPaymentStatus = momo.checkPaymentStatus;
exports.queryMomoStatus = momo.queryMomoStatus;

// Bank Transfer (SePay) Functions
const sepay = require('./sepay');
exports.sepayWebhook = sepay.sepayWebhook;
exports.generateVietQR = sepay.generateVietQR;

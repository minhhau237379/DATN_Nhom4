const Voucher = require("../models/Voucher");

const normalizeVoucherCode = (code) => String(code || "").trim().toUpperCase();

const calculateDiscountAmount = (voucher, subtotal) => {
  const safeSubtotal = Math.max(Number(subtotal || 0), 0);

  if (!voucher || safeSubtotal <= 0) {
    return 0;
  }

  let discount =
    voucher.discountType === "percent"
      ? (safeSubtotal * Number(voucher.discountValue || 0)) / 100
      : Number(voucher.discountValue || 0);

  if (Number(voucher.maxDiscount || 0) > 0) {
    discount = Math.min(discount, Number(voucher.maxDiscount));
  }

  return Math.max(0, Math.min(Math.floor(discount), safeSubtotal));
};

const validateVoucherForOrder = async (code, subtotal, options = {}) => {
  const normalizedCode = normalizeVoucherCode(code);

  if (!normalizedCode) {
    return {
      voucher: null,
      discountAmount: 0,
      voucherSnapshot: null,
    };
  }

  const query = Voucher.findOne({ code: normalizedCode });
  if (options.session) {
    query.session(options.session);
  }

  const voucher = await query;

  if (!voucher) {
    throw new Error("Voucher khong ton tai");
  }

  if (voucher.status !== 1) {
    throw new Error("Voucher da bi tat");
  }

  const now = new Date();
  if (voucher.startDate && voucher.startDate > now) {
    throw new Error("Voucher chua den thoi gian su dung");
  }

  if (voucher.endDate && voucher.endDate < now) {
    throw new Error("Voucher da het han");
  }

  if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
    throw new Error("Voucher da het luot su dung");
  }

  const safeSubtotal = Number(subtotal || 0);
  if (safeSubtotal < Number(voucher.minOrderValue || 0)) {
    throw new Error(
      `Don hang toi thieu ${Number(voucher.minOrderValue || 0).toLocaleString("vi-VN")} VND de dung voucher`,
    );
  }

  const discountAmount = calculateDiscountAmount(voucher, safeSubtotal);

  if (discountAmount <= 0) {
    throw new Error("Voucher khong tao duoc gia tri giam gia");
  }

  return {
    voucher,
    discountAmount,
    voucherSnapshot: {
      voucherId: voucher._id,
      code: voucher.code,
      name: voucher.name || "",
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minOrderValue: voucher.minOrderValue || 0,
      maxDiscount: voucher.maxDiscount || 0,
    },
  };
};

const consumeVoucher = async (voucherId, session) => {
  if (!voucherId) {
    return;
  }

  await Voucher.findByIdAndUpdate(
    voucherId,
    { $inc: { usedCount: 1 } },
    { session },
  );
};

module.exports = {
  normalizeVoucherCode,
  calculateDiscountAmount,
  validateVoucherForOrder,
  consumeVoucher,
};

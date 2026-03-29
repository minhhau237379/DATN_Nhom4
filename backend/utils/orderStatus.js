const ORDER_STATUS = {
  WAITING_CONFIRM: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const PAYMENT_STATUS = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
};

const legacyOrderStatusMap = {
  pending: ORDER_STATUS.WAITING_CONFIRM,
  confirmed: ORDER_STATUS.CONFIRMED,
  processing: ORDER_STATUS.PROCESSING,
  shipping: ORDER_STATUS.SHIPPING,
  completed: ORDER_STATUS.COMPLETED,
  cancelled: ORDER_STATUS.CANCELLED,
  done: ORDER_STATUS.COMPLETED,
  cancel: ORDER_STATUS.CANCELLED,
  "cho_xu_ly": ORDER_STATUS.WAITING_CONFIRM,
  "da_xac_nhan": ORDER_STATUS.CONFIRMED,
  "dang_xu_ly": ORDER_STATUS.PROCESSING,
  "dang_giao_hang": ORDER_STATUS.SHIPPING,
  "hoan_tat": ORDER_STATUS.COMPLETED,
  "da_huy": ORDER_STATUS.CANCELLED,
};

const legacyPaymentStatusMap = {
  pending: PAYMENT_STATUS.UNPAID,
  paid: PAYMENT_STATUS.PAID,
  failed: PAYMENT_STATUS.UNPAID,
  refunded: PAYMENT_STATUS.UNPAID,
  "chua_thanh_toan": PAYMENT_STATUS.UNPAID,
  "da_thanh_toan": PAYMENT_STATUS.PAID,
};

const normalizeOrderStatus = (value) => {
  if (!value) {
    return ORDER_STATUS.WAITING_CONFIRM;
  }

  const raw = String(value).trim();
  return legacyOrderStatusMap[raw] || raw;
};

const normalizePaymentStatus = (value) => {
  if (!value) {
    return PAYMENT_STATUS.UNPAID;
  }

  const raw = String(value).trim();
  return legacyPaymentStatusMap[raw] || raw;
};

const orderStatusLabel = (value) => normalizeOrderStatus(value);
const paymentStatusLabel = (value) => normalizePaymentStatus(value);

const orderStatusValues = Object.values(ORDER_STATUS);
const paymentStatusValues = Object.values(PAYMENT_STATUS);

const orderStatusOptions = [
  ORDER_STATUS.WAITING_CONFIRM,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPING,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
];

const paymentStatusOptions = [
  PAYMENT_STATUS.UNPAID,
  PAYMENT_STATUS.PAID,
];

const orderStatusRank = (value) => {
  const normalized = normalizeOrderStatus(value);

  return orderStatusOptions.indexOf(normalized);
};

const canMoveForward = (current, next) => {
  const currentRank = orderStatusRank(current);
  const nextRank = orderStatusRank(next);

  if (currentRank === -1 || nextRank === -1) {
    return false;
  }

  return nextRank >= currentRank && current !== ORDER_STATUS.CANCELLED;
};

const canCancelOrder = (order) => {
  const orderStatus = normalizeOrderStatus(order?.orderStatus);
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);

  return (
    orderStatus === ORDER_STATUS.WAITING_CONFIRM &&
    paymentStatus === PAYMENT_STATUS.PAID
  );
};

const isFinalOrderStatus = (value) => {
  const normalized = normalizeOrderStatus(value);
  return normalized === ORDER_STATUS.COMPLETED || normalized === ORDER_STATUS.CANCELLED;
};

module.exports = {
  ORDER_STATUS,
  PAYMENT_STATUS,
  orderStatusOptions,
  paymentStatusOptions,
  normalizeOrderStatus,
  normalizePaymentStatus,
  orderStatusLabel,
  paymentStatusLabel,
  canMoveForward,
  canCancelOrder,
  isFinalOrderStatus,
};

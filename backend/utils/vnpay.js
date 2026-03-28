const crypto = require("crypto");

const padNumber = (value) => value.toString().padStart(2, "0");

const formatVnpDate = (date = new Date()) => {
  return (
    date.getFullYear().toString() +
    padNumber(date.getMonth() + 1) +
    padNumber(date.getDate()) +
    padNumber(date.getHours()) +
    padNumber(date.getMinutes()) +
    padNumber(date.getSeconds())
  );
};

const vnpEncode = (value) => {
  return encodeURIComponent(String(value)).replace(/%20/g, "+");
};

const normalizeParams = (input) => {
  return Object.keys(input)
    .filter((key) => input[key] !== undefined && input[key] !== null && input[key] !== "")
    .sort()
    .reduce((result, key) => {
      result[key] = vnpEncode(input[key]);
      return result;
    }, {});
};

const stringifyParams = (params) => {
  return Object.entries(params)
    .map(([key, value]) => `${vnpEncode(key)}=${value}`)
    .join("&");
};

const signParams = (params, secret) => {
  const normalizedParams = normalizeParams(params);
  const signData = stringifyParams(normalizedParams);

  return crypto.createHmac("sha512", secret).update(signData).digest("hex");
};

const buildPaymentUrl = ({ baseUrl, params, secret }) => {
  const normalizedParams = normalizeParams(params);
  const secureHash = signParams(params, secret);
  const queryString = stringifyParams({
    ...normalizedParams,
    vnp_SecureHash: secureHash,
  });

  return `${baseUrl}?${queryString}`;
};

const verifyReturnParams = (query, secret) => {
  const cloned = { ...query };
  const receivedHash = cloned.vnp_SecureHash;

  delete cloned.vnp_SecureHash;
  delete cloned.vnp_SecureHashType;

  if (!receivedHash) {
    return false;
  }

  return signParams(cloned, secret) === receivedHash;
};

module.exports = {
  buildPaymentUrl,
  formatVnpDate,
  verifyReturnParams,
};

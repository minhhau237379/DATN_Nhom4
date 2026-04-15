const backdropStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 1000,
};

const dialogStyle = {
  width: "100%",
  maxWidth: "560px",
  background: "#fff",
  borderRadius: "20px",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.25)",
  overflow: "hidden",
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  padding: "24px 24px 16px",
  borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
};

const bodyStyle = {
  padding: "24px",
};

const titleStyle = {
  margin: "0 0 6px",
  fontSize: "22px",
  lineHeight: 1.25,
  color: "#0f172a",
};

const eyebrowStyle = {
  margin: 0,
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#0f8b8d",
};

const closeStyle = {
  width: "36px",
  height: "36px",
  border: "none",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#334155",
  fontSize: "22px",
  lineHeight: 1,
  cursor: "pointer",
};

const labelStyle = {
  display: "block",
  fontSize: "14px",
  fontWeight: 700,
  color: "#334155",
  marginBottom: "10px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "140px",
  resize: "vertical",
  marginTop: "8px",
  borderRadius: "14px",
  border: "1px solid #dbe4f0",
  padding: "14px 16px",
  outline: "none",
  fontSize: "15px",
  color: "#0f172a",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const actionsStyle = {
  display: "flex",
  gap: "12px",
  justifyContent: "flex-end",
  marginTop: "20px",
};

export default function OrderCancelReasonDialog({
  visible,
  reason,
  error,
  saving = false,
  onReasonChange,
  onConfirm,
  onClose,
}) {
  if (!visible) {
    return null;
  }

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Xác nhận hủy đơn hàng</p>
            <h3 style={titleStyle}>Nhập lý do hủy</h3>
          </div>
          <button type="button" style={closeStyle} onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          <label style={labelStyle}>
            Lý do hủy
            <textarea
              style={textareaStyle}
              rows="5"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Nhập lý do hủy đơn hàng"
            />
          </label>

          {error ? <div className="alert">{error}</div> : null}

          <div style={actionsStyle}>
            <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button className="btn btn-primary" type="button" onClick={onConfirm} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu và gửi mail"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

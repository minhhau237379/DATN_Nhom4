import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import "./OrderDetail.css";

const STATUS_LABEL = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const PAYMENT_LABEL = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
};

// Luồng trạng thái hợp lệ
const FLOW = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipping"],
  shipping: ["completed"],
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders/${id}`);
      setOrder(res.data);
      setDraft({
        orderStatus: res.data.orderStatus,
        paymentStatus: res.data.paymentStatus,
      });
    } catch (err) {
      setMessage("Không tải được đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const isLocked = (status) => {
    return ["completed", "cancelled"].includes(status);
  };

  const isInvalidTransition = (current, next) => {
    if (["completed", "cancelled"].includes(current)) return true;
    if (next === "pending") return true;
    return false;
  };

  const handleUpdate = async () => {
    try {
      if (isLocked(order.orderStatus)) {
        setMessage("Đơn đã hoàn tất hoặc đã hủy, không thể sửa");
        return;
      }

      if (isInvalidTransition(order.orderStatus, draft.orderStatus)) {
        setMessage("Không thể chuyển về trạng thái 'Chờ xử lý'");
        return;
      }

      await api.patch(`/admin/orders/${order._id}/status`, draft);

      setMessage("Cập nhật thành công");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Lỗi cập nhật");
    }
  };

  if (loading) return <p>Đang tải...</p>;
  if (!order) return <p>Không tìm thấy đơn hàng</p>;

  const allowedStatus = FLOW[order.orderStatus] || [];

  return (
    <div className="order-detail">
      <h2>Chi tiết đơn hàng</h2>

      {message && <div className="alert">{message}</div>}

      <div className="order-info">
        <p><strong>Mã đơn:</strong> #{order.orderNumber || order._id.slice(-6)}</p>
        <p><strong>Khách hàng:</strong> {order.user?.username}</p>
        <p><strong>Email:</strong> {order.user?.email}</p>
        <p><strong>Tổng tiền:</strong> {Number(order.totalPrice).toLocaleString("vi-VN")} ₫</p>
      </div>

      <div className="order-status">
        <h3>Trạng thái</h3>

        <p>
          <strong>Thanh toán:</strong>{" "}
          {PAYMENT_LABEL[order.paymentStatus]}
        </p>

        <p>
          <strong>Đơn hàng:</strong>{" "}
          {STATUS_LABEL[order.orderStatus]}
        </p>

        {/* PAYMENT */}
        <div>
          <label>Đổi trạng thái thanh toán:</label>
          <select
            value={draft.paymentStatus || ""}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                paymentStatus: e.target.value,
              }))
            }
            disabled={isLocked(order.orderStatus)}
          >
            {Object.keys(PAYMENT_LABEL).map((key) => (
              <option key={key} value={key}>
                {PAYMENT_LABEL[key]}
              </option>
            ))}
          </select>
        </div>

        {/* ORDER STATUS */}
        <div>
          <label>Đổi trạng thái đơn:</label>
          <select
            value={draft.orderStatus || ""}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                orderStatus: e.target.value,
              }))
            }
            disabled={isLocked(order.orderStatus)}
          >
            {/* chỉ cho chọn trạng thái hợp lệ */}
            {(allowedStatus.length > 0 ? allowedStatus : [order.orderStatus]).map(
              (status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              )
            )}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleUpdate}
          disabled={isLocked(order.orderStatus)}
        >
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
}
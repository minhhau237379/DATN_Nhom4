import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { reloadCurrentPage } from "../utils/adminActions";
import "./OrderDetail.css";

const statusOptions = ["Chờ xác nhận", "Đã xác nhận", "Đang xử lý", "Đang giao hàng", "Hoàn tất", "Đã hủy"];

const getStatusTone = (value) => {
  const map = {
    "Chờ xác nhận": "status-pending",
    "Đã xác nhận": "status-confirmed",
    "Đang xử lý": "status-processing",
    "Đang giao hàng": "status-shipping",
    "Hoàn tất": "status-completed",
    "Đã hủy": "status-cancelled",
  };

  return map[value] || "status-pill-neutral";
};

const getPaymentTone = (value) => {
  const map = {
    "Chưa thanh toán": "status-pending",
    "Đã thanh toán": "status-paid",
  };

  return map[value] || "status-pill-neutral";
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [draft, setDraft] = useState({ orderStatus: "" });
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await api.get(`/admin/orders/${id}`);
    setOrder(res.data.order);
    setDraft({
      orderStatus: res.data.order?.orderStatus || "",
    });
  };

  useEffect(() => {
    load();
  }, [id]);

  const save = async () => {
    try {
      await api.patch(`/admin/orders/${id}/status`, draft);
      setMessage("Cập nhật đơn hàng thành công");
      reloadCurrentPage();
      return;
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể cập nhật đơn hàng");
    }
  };

  const totalItems = useMemo(
    () => order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    [order],
  );

  if (!order) {
    return <div className="panel">Đang tải chi tiết đơn hàng...</div>;
  }

  return (
    <div className="stack page-order-detail">
      <section className="panel panel-hero">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Chi tiết đơn hàng</p>
            <h3>#{order.orderNumber || order._id.slice(-6)}</h3>
            <p className="muted-text">Theo dõi toàn bộ trạng thái đơn, thanh toán và sản phẩm trong đơn.</p>
          </div>
          <Link to="/admin/orders" className="btn btn-secondary">
            Quay lại
          </Link>
        </div>

        {message && <div className="alert">{message}</div>}

        <div className="stats-inline">
          <div className="mini-stat">
            <span>Trạng thái</span>
            <strong>{order.orderStatus}</strong>
          </div>
          <div className="mini-stat">
            <span>Thanh toán</span>
            <strong>{order.paymentStatus}</strong>
          </div>
          <div className="mini-stat">
            <span>Số lượng</span>
            <strong>{totalItems}</strong>
          </div>
          <div className="mini-stat">
            <span>Tổng tiền</span>
            <strong>{Number(order.totalPrice || 0).toLocaleString("vi-VN")} ₫</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Thông tin xử lý</h3>
        </div>

        <div className="detail-grid">
          <div>
            <strong>Khách hàng</strong>
            <p>{order.user?.username || "N/A"}</p>
            <p>{order.user?.email || ""}</p>
          </div>
          <div>
            <strong>Địa chỉ</strong>
            <p>{order.shippingAddress?.fullName}</p>
            <p>{order.shippingAddress?.phone}</p>
            <p>{order.shippingAddress?.address}</p>
            <p>{order.shippingAddress?.city}</p>
          </div>
          <div>
            <strong>Thanh toán</strong>
            <span className={`status-pill ${getPaymentTone(order.paymentStatus)}`}>
              {order.paymentStatus}
            </span>
          </div>
          <div>
            <strong>Trạng thái đơn</strong>
            <span className={`status-pill ${getStatusTone(draft.orderStatus)}`}>
              {draft.orderStatus || order.orderStatus}
            </span>
            <select
              value={draft.orderStatus}
              onChange={(e) => setDraft((prev) => ({ ...prev, orderStatus: e.target.value }))}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={save}>
          Lưu thay đổi
        </button>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Sản phẩm trong đơn</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.product?._id || item.name}-${item.quantity}`}>
                  <td>{item.product?.name || item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.price || 0).toLocaleString("vi-VN")} ₫</td>
                  <td>{Number((item.price || 0) * item.quantity).toLocaleString("vi-VN")} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

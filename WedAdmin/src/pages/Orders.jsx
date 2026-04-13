import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { reloadCurrentPage } from "../utils/adminActions";
import "./Orders.css";

const statusOptions = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang xử lý",
  "Đang giao hàng",
  "Hoàn tất",
  "Đã hủy",
];

const getAllowedStatusOptions = (currentStatus) => {
  const map = {
    "Chờ xác nhận": ["Chờ xác nhận", "Đã xác nhận", "Đã hủy"],
    "Đã xác nhận": ["Đã xác nhận", "Đang xử lý"],
    "Đang xử lý": ["Đang xử lý", "Đang giao hàng"],
    "Đang giao hàng": ["Đang giao hàng", "Hoàn tất"],
    "Hoàn tất": ["Hoàn tất"],
    "Đã hủy": ["Đã hủy"],
  };

  return map[currentStatus] || [currentStatus];
};

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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: "", paymentStatus: "", search: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/orders", { params: filters });
      setOrders(res.data.orders || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateOrder = async (orderId) => {
    const current = drafts[orderId] || {};
    try {
      await api.patch(`/admin/orders/${orderId}/status`, current);
      setMessage("Cập nhật đơn hàng thành công");
      reloadCurrentPage();
      return;
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể cập nhật đơn hàng");
    }
  };

  const setDraft = (orderId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value,
      },
    }));
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter((order) => order.paymentStatus === "Đã thanh toán").length;
    const completed = orders.filter((order) => order.orderStatus === "Hoàn tất").length;
    const cancelled = orders.filter((order) => order.orderStatus === "Đã hủy").length;

    return { total, paid, completed, cancelled };
  }, [orders]);

  return (
    <div className="stack page-orders">
      <section className="panel panel-hero">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quản lý đơn hàng</p>
            <h3>Theo dõi thanh toán và trạng thái xử lý</h3>
          </div>

          <div className="stats-inline">
            <div className="mini-stat">
              <span>Tổng</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="mini-stat">
              <span>Đã thanh toán</span>
              <strong>{stats.paid}</strong>
            </div>
            <div className="mini-stat">
              <span>Hoàn tất</span>
              <strong>{stats.completed}</strong>
            </div>
            <div className="mini-stat">
              <span>Đã hủy</span>
              <strong>{stats.cancelled}</strong>
            </div>
          </div>
        </div>

        {message && <div className="alert">{message}</div>}

        <div className="filter-row">
          <input
            style={{ width: "45%" }}
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Mã đơn..."
          />
          <select
            style={{ width: "50%" }}
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Tất cả trạng thái</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={load}>
            Lá»c
          </button>
        </div>
      </section>

      <section className="panel">
        {loading ? (
          <p>Äang táº£i...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Thanh toán</th>
                  <th>Trạng thái</th>
                  <th>Tổng tiền</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const draft = drafts[order._id] || {
                    orderStatus: order.orderStatus,
                  };

                  return (
                    <tr key={order._id}>
                      <td>
                        <Link to={`/admin/orders/${order._id}`}>
                          #{order.orderNumber || order._id.slice(-6)}
                        </Link>
                      </td>
                      <td>
                        <strong>{order.user?.username || "N/A"}</strong>
                        <div className="muted-text small-text">{order.user?.email || ""}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${getPaymentTone(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${getStatusTone(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td>{Number(order.totalPrice || 0).toLocaleString("vi-VN")} â‚«</td>
                      <td>
                        <div className="actions-inline">
                          <select
                            value={draft.orderStatus || ""}
                            onChange={(e) => setDraft(order._id, "orderStatus", e.target.value)}
                          >
                            {getAllowedStatusOptions(order.orderStatus).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => updateOrder(order._id)}
                          >
                            LÆ°u
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

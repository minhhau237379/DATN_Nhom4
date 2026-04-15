import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { reloadCurrentPage } from "../utils/adminActions";
import OrderCancelReasonDialog from "../components/OrderCancelReasonDialog";
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
    "Chờ xác nhận": ["Chờ xác nhận", "Đã xác nhận", "Đang xử lý", "Đang giao hàng", "Hoàn tất", "Đã hủy"],
    "Đã xác nhận": ["Đã xác nhận", "Đang xử lý", "Đang giao hàng", "Hoàn tất"],
    "Đang xử lý": ["Đang xử lý", "Đang giao hàng", "Hoàn tất"],
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

const CANCELLED_STATUS = "Đã hủy";

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
  const [cancelDialog, setCancelDialog] = useState({
    open: false,
    orderId: "",
    reason: "",
    saving: false,
    error: "",
  });

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

  const updateOrder = async (orderId, cancelReason = "") => {
    const current = drafts[orderId] || {};
    const payload = {
      ...current,
      ...(cancelReason ? { cancelReason } : {}),
    };

    try {
      await api.patch(`/admin/orders/${orderId}/status`, payload);
      setMessage("Cập nhật đơn hàng thành công");
      reloadCurrentPage();
      return true;
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể cập nhật đơn hàng");
      return false;
    }
  };

  const submitOrderUpdate = async (orderId, cancelReason = "") => {
    return updateOrder(orderId, cancelReason);
  };

  const handleSaveClick = (orderId) => {
    const current = drafts[orderId] || {};

    if (current.orderStatus === CANCELLED_STATUS) {
      setCancelDialog({
        open: true,
        orderId,
        reason: "",
        saving: false,
        error: "",
      });
      return;
    }

    submitOrderUpdate(orderId);
  };

  const closeCancelDialog = () => {
    setCancelDialog({
      open: false,
      orderId: "",
      reason: "",
      saving: false,
      error: "",
    });
  };

  const confirmCancelDialog = async () => {
    const reason = cancelDialog.reason.trim();

    if (!reason) {
      setCancelDialog((prev) => ({
        ...prev,
        error: "Vui lòng nhập lý do hủy đơn hàng",
      }));
      return;
    }

    setCancelDialog((prev) => ({ ...prev, saving: true, error: "" }));
    const ok = await submitOrderUpdate(cancelDialog.orderId, reason);

    if (ok) {
      closeCancelDialog();
      return;
    }

    setCancelDialog((prev) => ({ ...prev, saving: false }));
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
            Lọc
          </button>
        </div>
      </section>

      <section className="panel">
        {loading ? (
          <p>Đang tải...</p>
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
                      <td>{Number(order.totalPrice || 0).toLocaleString("vi-VN")} ₫</td>
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
                            onClick={() => handleSaveClick(order._id)}
                          >
                            Lưu
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

      <OrderCancelReasonDialog
        visible={cancelDialog.open}
        reason={cancelDialog.reason}
        error={cancelDialog.error}
        saving={cancelDialog.saving}
        onReasonChange={(reason) =>
          setCancelDialog((prev) => ({
            ...prev,
            reason,
            error: "",
          }))
        }
        onConfirm={confirmCancelDialog}
        onClose={closeCancelDialog}
      />
    </div>
  );
}

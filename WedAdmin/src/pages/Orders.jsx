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
    "Chờ xác nhận": ["Chờ xác nhận", "Đã xác nhận", "Đã hủy"],
    "Đã xác nhận": ["Đã xác nhận", "Đang xử lý", "Đã hủy"],
    "Đang xử lý": ["Đang xử lý", "Đang giao hàng", "Đã hủy"],
    "Đang giao hàng": ["Đang giao hàng", "Hoàn tất", "Đã hủy"],
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
    <div>
      {/* Card Chính */}
      <div className="card card-primary card-outline">
        {/* Card Header - Tiêu đề */}
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-shopping-cart mr-2"></i>
            Quản lý đơn hàng
          </h3>
          <div className="card-tools">
            <button className="btn btn-tool" type="button" onClick={load}>
              <i className="fas fa-sync"></i> Làm mới
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body">
          {/* Thống kê nhanh */}
          <div className="row mb-3">
            <div className="col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-info">
                  <i className="fas fa-list"></i>
                </span>
                <div className="info-box-content">
                  <span className="info-box-text">Tổng đơn hàng</span>
                  <span className="info-box-number">{stats.total}</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-success">
                  <i className="fas fa-money-bill"></i>
                </span>
                <div className="info-box-content">
                  <span className="info-box-text">Đã thanh toán</span>
                  <span className="info-box-number">{stats.paid}</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-primary">
                  <i className="fas fa-check-circle"></i>
                </span>
                <div className="info-box-content">
                  <span className="info-box-text">Hoàn tất</span>
                  <span className="info-box-number">{stats.completed}</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="info-box">
                <span className="info-box-icon bg-danger">
                  <i className="fas fa-times-circle"></i>
                </span>
                <div className="info-box-content">
                  <span className="info-box-text">Đã hủy</span>
                  <span className="info-box-number">{stats.cancelled}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Message Alert */}
          {message && <div className="alert alert-info">{message}</div>}

          {/* Filter Section */}
          <div className="row mb-3 pb-3 border-bottom">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Tìm kiếm mã đơn hàng..."
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-control"
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
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-block" type="button" onClick={load}>
                <i className="fas fa-search mr-1"></i> Lọc
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Đang tải...</span>
              </div>
              <p className="mt-2">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-sm">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: "12%" }}>Mã đơn</th>
                    <th style={{ width: "20%" }}>Khách hàng</th>
                    <th style={{ width: "15%" }}>Thanh toán</th>
                    <th style={{ width: "15%" }}>Trạng thái</th>
                    <th style={{ width: "15%" }}>Tổng tiền</th>
                    <th style={{ width: "23%" }}>Hành động</th>
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
                            <strong>#{order.orderNumber || order._id.slice(-6)}</strong>
                          </Link>
                        </td>
                        <td>
                          <strong>{order.user?.username || "N/A"}</strong>
                          <br />
                          <small className="text-muted">{order.user?.email || ""}</small>
                        </td>
                        <td>
                          <span className={`badge badge-${getPaymentTone(order.paymentStatus).includes("pending") ? "warning" : "success"}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(order.orderStatus)}`}>
                            {order.orderStatus}
                          </span>
                        </td>
                        <td>
                          <strong>{Number(order.totalPrice || 0).toLocaleString("vi-VN")} ₫</strong>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <select
                              className="form-control form-control-sm"
                              style={{ flex: 1 }}
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
                              className="btn btn-primary btn-sm"
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
        </div>
      </div>

      {/* Cancel Dialog */}
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

function getStatusBadgeClass(status) {
  const map = {
    "Chờ xác nhận": "badge-warning",
    "Đã xác nhận": "badge-info",
    "Đang xử lý": "badge-primary",
    "Đang giao hàng": "badge-info",
    "Hoàn tất": "badge-success",
    "Đã hủy": "badge-danger",
  };
  return map[status] || "badge-secondary";
}

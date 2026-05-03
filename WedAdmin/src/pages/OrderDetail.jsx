import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { reloadCurrentPage } from "../utils/adminActions";
import OrderCancelReasonDialog from "../components/OrderCancelReasonDialog";
import "./OrderDetail.css";

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

const CANCELLED_STATUS = "Đã hủy";

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
  const [cancelDialog, setCancelDialog] = useState({
    open: false,
    reason: "",
    saving: false,
    error: "",
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const res = await api.get(`/admin/orders/${id}`);

      if (!isMounted) {
        return;
      }

      setOrder(res.data.order);
      setDraft({
        orderStatus: res.data.order?.orderStatus || "",
      });
    };

    load();

    return () => {
      isMounted = false;
    };
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

  const submitOrderUpdate = async (cancelReason = "") => {
    const payload = {
      ...draft,
      ...(cancelReason ? { cancelReason } : {}),
    };

    try {
      await api.patch(`/admin/orders/${id}/status`, payload);
      setMessage("Cáº­p nháº­t Ä‘Æ¡n hÃ ng thÃ nh cÃ´ng");
      reloadCurrentPage();
      return true;
    } catch (err) {
      setMessage(err.response?.data?.message || "KhÃ´ng thá»ƒ cáº­p nháº­t Ä‘Æ¡n hÃ ng");
      return false;
    }
  };

  const handleSaveClick = () => {
    if (draft.orderStatus === CANCELLED_STATUS) {
      setCancelDialog({
        open: true,
        reason: "",
        saving: false,
        error: "",
      });
      return;
    }

    save();
  };

  const closeCancelDialog = () => {
    setCancelDialog({
      open: false,
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
    const ok = await submitOrderUpdate(reason);

    if (ok) {
      closeCancelDialog();
      return;
    }

    setCancelDialog((prev) => ({ ...prev, saving: false }));
  };

  const totalItems = useMemo(
    () => order?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    [order],
  );

  if (!order) {
    return <div className="panel">Đang tải chi tiết đơn hàng...</div>;
  }

  const allowedStatuses = getAllowedStatusOptions(order.orderStatus);

  return (
    <div className="stack page-order-detail">
      <section className="panel panel-hero card card-outline card-primary">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Chi tiết đơn hàng</p>
            <h3>#{order.orderNumber || order._id.slice(-6)}</h3>
            <p className="muted-text">
              Theo dõi toàn bộ trạng thái đơn, thanh toán và sản phẩm trong đơn.
            </p>
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

      <section className="panel card card-outline card-secondary">
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
              {allowedStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSaveClick}>
          LƯu thay đổi
        </button>
      </section>

      <section className="panel card card-outline card-secondary">
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

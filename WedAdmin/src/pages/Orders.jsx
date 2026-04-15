import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { reloadCurrentPage } from "../utils/adminActions";
import OrderCancelReasonDialog from "../components/OrderCancelReasonDialog";
import "./Orders.css";

const statusOptions = [
  "Chá» xÃ¡c nháº­n",
  "ÄÃ£ xÃ¡c nháº­n",
  "Äang xá»­ lÃ½",
  "Äang giao hÃ ng",
  "HoÃ n táº¥t",
  "ÄÃ£ há»§y",
];

const getAllowedStatusOptions = (currentStatus) => {
  const map = {
    "Chá» xÃ¡c nháº­n": ["Chá» xÃ¡c nháº­n", "ÄÃ£ xÃ¡c nháº­n","Äang xá»­ lÃ½", "Äang giao hÃ ng", "HoÃ n táº¥t", "ÄÃ£ há»§y"],
    "ÄÃ£ xÃ¡c nháº­n": ["ÄÃ£ xÃ¡c nháº­n", "Äang xá»­ lÃ½", "Äang giao hÃ ng", "HoÃ n táº¥t"],
    "Äang xá»­ lÃ½": ["Äang xá»­ lÃ½", "Äang giao hÃ ng","HoÃ n táº¥t"],
    "Äang giao hÃ ng": ["Äang giao hÃ ng", "HoÃ n táº¥t"],
    "HoÃ n táº¥t": ["HoÃ n táº¥t"],
    "ÄÃ£ há»§y": ["ÄÃ£ há»§y"],
  };

  return map[currentStatus] || [currentStatus];
};

const getStatusTone = (value) => {
  const map = {
    "Chá» xÃ¡c nháº­n": "status-pending",
    "ÄÃ£ xÃ¡c nháº­n": "status-confirmed",
    "Äang xá»­ lÃ½": "status-processing",
    "Äang giao hÃ ng": "status-shipping",
    "HoÃ n táº¥t": "status-completed",
    "ÄÃ£ há»§y": "status-cancelled",
  };

  return map[value] || "status-pill-neutral";
};

const CANCELLED_STATUS = "ÄÃ£ há»§y";

const getPaymentTone = (value) => {
  const map = {
    "ChÆ°a thanh toÃ¡n": "status-pending",
    "ÄÃ£ thanh toÃ¡n": "status-paid",
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
      setMessage("Cáº­p nháº­t Ä‘Æ¡n hÃ ng thÃ nh cÃ´ng");
      reloadCurrentPage();
      return true;
    } catch (err) {
      setMessage(err.response?.data?.message || "KhÃ´ng thá»ƒ cáº­p nháº­t Ä‘Æ¡n hÃ ng");
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
        error: "Vui lÃ²ng nháº­p lÃ½ do há»§y Ä‘Æ¡n hÃ ng",
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
    const paid = orders.filter((order) => order.paymentStatus === "ÄÃ£ thanh toÃ¡n").length;
    const completed = orders.filter((order) => order.orderStatus === "HoÃ n táº¥t").length;
    const cancelled = orders.filter((order) => order.orderStatus === "ÄÃ£ há»§y").length;

    return { total, paid, completed, cancelled };
  }, [orders]);

  return (
    <div className="stack page-orders">
      <section className="panel panel-hero">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quáº£n lÃ½ Ä‘Æ¡n hÃ ng</p>
            <h3>Theo dÃµi thanh toÃ¡n vÃ  tráº¡ng thÃ¡i xá»­ lÃ½</h3>
          </div>

          <div className="stats-inline">
            <div className="mini-stat">
              <span>Tá»•ng</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="mini-stat">
              <span>ÄÃ£ thanh toÃ¡n</span>
              <strong>{stats.paid}</strong>
            </div>
            <div className="mini-stat">
              <span>HoÃ n táº¥t</span>
              <strong>{stats.completed}</strong>
            </div>
            <div className="mini-stat">
              <span>ÄÃ£ há»§y</span>
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
            placeholder="MÃ£ Ä‘Æ¡n..."
          />
          <select
            style={{ width: "50%" }}
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
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
                  <th>MÃ£ Ä‘Æ¡n</th>
                  <th>KhÃ¡ch hÃ ng</th>
                  <th>Thanh toÃ¡n</th>
                  <th>Tráº¡ng thÃ¡i</th>
                  <th>Tá»•ng tiá»n</th>
                  <th>HÃ nh Ä‘á»™ng</th>
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
                            onClick={() => handleSaveClick(order._id)}
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

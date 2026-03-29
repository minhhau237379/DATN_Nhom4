import { useEffect,  useState } from "react";
import api from "../services/api";
import "./Users.css";

const statusTone = (value) => (value ? "status-cancelled" : "status-paid");

export default function Users() {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [lockedFilter, setLockedFilter] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users", {
        params: {
          search: search.trim() || undefined,
          locked: lockedFilter,
        },
      });

      const list = res.data.users || [];
      setUsers(list);

      if (list.length) {
        const exists = list.some((user) => user._id === selectedId);
        if (!selectedId || !exists) {
          setSelectedId(list[0]._id);
        }
      } else {
        setSelectedId("");
        setDetail(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (userId) => {
    if (!userId) return;

    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setDetail(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [lockedFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    }
  }, [selectedId]);

  // const selectedUser = useMemo(
  //   () => users.find((user) => user._id === selectedId) || null,
  //   [users, selectedId],
  // );

  const handleSelect = (id) => {
    setSelectedId(id);
    setMessage("");
  };

  const refreshAll = async () => {
    await loadUsers();
    if (selectedId) {
      await loadDetail(selectedId);
    }
  };

  const toggleLock = async (user) => {
    const locked = !user.isLocked;
    const lockReason = locked ? window.prompt("Nhập lý do khóa tài khoản", "") || "" : "";

    try {
      await api.patch(`/admin/users/${user._id}/lock`, {
        isLocked: locked,
        lockReason,
      });
      setMessage(locked ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
      await refreshAll();
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể cập nhật tài khoản");
    }
  };

  return (
    <div className="stack page-users">
      <section className="panel panel-hero">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quản lý tài khoản</p>
            <h3>Người dùng, địa chỉ giao hàng và khóa/mở tài khoản</h3>
            <p className="muted-text">
              Xem thông tin người dùng, địa chỉ đã lưu và kiểm soát truy cập bằng khóa tài khoản mềm.
            </p>
          </div>

          <div className="stats-inline">
            <div className="mini-stat">
              <span>Tổng</span>
              <strong>{users.length}</strong>
            </div>
            <div className="mini-stat">
              <span>Đang khóa</span>
              <strong>{users.filter((item) => item.isLocked).length}</strong>
            </div>
            <div className="mini-stat">
              <span>Đang mở</span>
              <strong>{users.filter((item) => !item.isLocked).length}</strong>
            </div>
          </div>
        </div>

        {message && <div className="alert">{message}</div>}

        <div className="filter-row">
          <input style={{ width: "80%" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, email, SĐT" />
          <select value={lockedFilter} onChange={(e) => setLockedFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="false">Đang mở</option>
            <option value="true">Đang khóa</option>
          </select>
          <button className="btn btn-secondary" type="button" onClick={loadUsers}>
            Tải lại
          </button>
        </div>
      </section>

      <div className="users-grid">
        <section className="panel">
          <div className="panel-header">
            <h3>Danh sách người dùng</h3>
          </div>

          {loading ? (
            <p>Đang tải...</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Email</th>
                    <th>SĐT</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className={selectedId === user._id ? "row-selected" : ""}
                      onClick={() => handleSelect(user._id)}
                    >
                      <td>
                        <strong>{user.username}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.phoneNumber || "-"}</td>
                      <td>
                        <span className={`status-pill ${statusTone(user.isLocked)}`}>
                          {user.isLocked ? "Đã khóa" : "Đang mở"}
                        </span>
                      </td>
                      <td>
                        <div className="actions-inline">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(user._id);
                            }}
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLock(user);
                            }}
                          >
                            {user.isLocked ? "Mở khóa" : "Khóa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel user-detail-panel">
          <div className="panel-header">
            <h3>Chi tiết người dùng</h3>
          </div>

          {detailLoading ? (
            <p>Đang tải chi tiết...</p>
          ) : detail?.user ? (
            <div className="user-detail">
              <div className="user-summary">
                <div>
                  <p className="eyebrow">Thông tin chung</p>
                  <h4>{detail.user.username}</h4>
                </div>
                <span className={`status-pill ${statusTone(detail.user.isLocked)}`}>
                  {detail.user.isLocked ? "Đã khóa" : "Đang mở"}
                </span>
              </div>

              <div className="detail-grid detail-grid-user">
                <div>
                  <strong>Email</strong>
                  <p>{detail.user.email}</p>
                </div>
                <div>
                  <strong>Số điện thoại</strong>
                  <p>{detail.user.phoneNumber || "-"}</p>
                </div>
                <div>
                  <strong>Role</strong>
                  <p>{detail.user.role || "user"}</p>
                </div>
                <div>
                  <strong>Tổng đơn</strong>
                  <p>{detail.stats?.totalOrders || 0}</p>
                </div>
              </div>

              <div className="detail-block">
                <strong>Địa chỉ giao hàng</strong>
                {detail.addresses?.length ? (
                  <div className="address-grid">
                    {detail.addresses.map((address) => (
                      <div key={address._id} className="address-card">
                        <div className="address-card-head">
                          <strong>{address.fullName}</strong>
                          {address.isDefault && <span className="address-default">Mặc định</span>}
                        </div>
                        <p>{address.phone}</p>
                        <p>{address.address}</p>
                        <p>{address.city}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Chưa có địa chỉ nào.</p>
                )}
              </div>

              <div className="detail-block">
                <strong>Đơn hàng gần đây</strong>
                {detail.recentOrders?.length ? (
                  <div className="recent-order-list">
                    {detail.recentOrders.map((order) => (
                      <div key={order._id} className="recent-order-item">
                        <div>
                          <p>#{order.orderNumber || order._id.slice(-6)}</p>
                          <small>{Number(order.totalPrice || 0).toLocaleString("vi-VN")} đ</small>
                        </div>
                        <span className={`status-pill ${order.paymentStatus === "Đã thanh toán" ? "status-paid" : "status-pending"}`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Chưa có đơn hàng.</p>
                )}
              </div>
            </div>
          ) : (
            <p>Chọn một người dùng để xem chi tiết.</p>
          )}
        </section>
      </div>
    </div>
  );
}

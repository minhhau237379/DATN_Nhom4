import { useEffect, useState } from "react";
import api from "../services/api";
import "./Dashboard.css";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from "recharts";

const StatCard = ({ label, value, hint, accent = false }) => (
  <div className={`stat-card ${accent ? "stat-card-accent" : ""}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{hint}</small>
  </div>
);

const getStatusTone = (value) => {
  const map = {
    pending: "status-pending",
    confirmed: "status-confirmed",
    processing: "status-processing",
    paid: "status-paid",
    shipping: "status-shipping",
    completed: "status-completed",
    cancelled: "status-cancelled",
  };
  return map[value] || "status-pill-neutral";
};

const getPaymentTone = (value) => {
  const map = {
    pending: "status-pending",
    paid: "status-paid",
    failed: "status-cancelled",
    refunded: "status-refunded",
  };
  return map[value] || "status-pill-neutral";
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===== CHART STATE =====
  const [revenueData, setRevenueData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [topProductsChart, setTopProductsChart] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/admin/dashboard"); // ✅ FIX

        const data = res.data;

        setStats(data.stats);

        // ===== LINE =====
        setRevenueData(data.revenue || []);

        // ===== PIE =====
        const status = data.status || {};
        setStatusData([
          { name: "Chờ xử lý", value: status.pending || 0 },
          { name: "Hoàn tất", value: status.completed || 0 },
          { name: "Đã hủy", value: status.cancelled || 0 },
        ]);

        // ===== BAR =====
        setTopProductsChart(
          (data.topProducts || []).map((p) => ({
            name: p.name,
            sold: p.quantity,
          }))
        );

      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="panel">Đang tải thống kê...</div>;
  }

  return (
    <div className="stack page-dashboard">
      {/* ===== HEADER ===== */}
      <section className="panel panel-hero dashboard-hero">
        <div>
          <p className="eyebrow">Bảng điều khiển</p>
          <h3>Toàn bộ hoạt động của app user và web admin</h3>
          <p className="muted-text">
            Xem nhanh số lượng dữ liệu, doanh thu, đơn gần đây và sản phẩm bán chạy.
          </p>
        </div>

        <div className="stats-inline">
          <div className="mini-stat">
            <span>Đơn hàng</span>
            <strong>{stats.totalOrders}</strong>
          </div>
          <div className="mini-stat">
            <span>Doanh thu</span>
            <strong>{Number(stats.revenue || 0).toLocaleString("vi-VN")} ₫</strong>
          </div>
        </div>
      </section>

      {/* ===== CARDS ===== */}
      <div className="grid stats-grid">
        <StatCard label="Người dùng" value={stats.totalUsers} hint="Tài khoản khách hàng" />
        <StatCard label="Sản phẩm" value={stats.totalProducts} hint="Tổng sản phẩm" />
        <StatCard label="Sản phẩm hiện" value={stats.activeProducts} hint="Đang hiển thị" />
        <StatCard label="Danh mục" value={stats.totalCategories} hint="Tổng danh mục" />
        <StatCard label="Danh mục hiện" value={stats.activeCategories} hint="Đang hiển thị" />
        <StatCard
          label="Doanh thu"
          value={`${Number(stats.revenue || 0).toLocaleString("vi-VN")} ₫`}
          hint="Từ đơn đã thanh toán"
          accent
        />
      </div>

      {/* ===== TABLE + TOP ===== */}
      <div className="dashboard-duo">
        <section className="panel">
          <div className="panel-header">
            <h3>Đơn hàng gần đây</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th>Tiền</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentOrders || []).map((order) => (
                  <tr key={order._id}>
                    <td>#{order.orderNumber || order._id.slice(-6)}</td>
                    <td>{order.user?.username || "N/A"}</td>
                    <td>
                      <span className={`status-pill ${getStatusTone(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${getPaymentTone(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>{Number(order.totalPrice || 0).toLocaleString("vi-VN")} ₫</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Sản phẩm bán chạy</h3>
          </div>
          <div className="ranking-list">
            {(stats.topProducts || []).map((item, index) => (
              <div className="ranking-item" key={`${item._id}-${index}`}>
                <strong>{index + 1}</strong>
                <div>
                  <p>{item.name || "Sản phẩm đã xóa"}</p>
                  <small>{item.quantity} đã bán</small>
                </div>
                <span>{Number(item.revenue || 0).toLocaleString("vi-VN")} ₫</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ===== CHARTS (THÊM MỚI) ===== */}
      <div className="dashboard-duo">
        {/* LINE */}
        <section className="panel">
          <div className="panel-header">
            <h3>Doanh thu theo thời gian</h3>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* PIE */}
        <section className="panel">
          <div className="panel-header">
            <h3>Trạng thái đơn hàng</h3>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100}>
                  {statusData.map((_, index) => (
                    <Cell key={index} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* BAR */}
      <section className="panel">
        <div className="panel-header">
          <h3>Top sản phẩm (biểu đồ)</h3>
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={topProductsChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
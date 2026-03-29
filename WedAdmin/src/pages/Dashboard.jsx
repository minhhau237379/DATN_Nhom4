import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./Dashboard.css";

const getBackendOrigin = () =>
  (api.defaults.baseURL || "http://localhost:3003/api").replace(/\/api$/, "");

const resolveImageUrl = (value) => {
  if (!value) {
    return `${getBackendOrigin()}/images/no-image.png`;
  }

  if (Array.isArray(value)) {
    return resolveImageUrl(value[0]);
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return `${getBackendOrigin()}/images/no-image.png`;
  }

  if (trimmed.startsWith("http") || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  return `${getBackendOrigin()}${trimmed}`;
};

const StatCard = ({ label, value, hint, accent = false }) => (
  <div className={`stat-card ${accent ? "stat-card-accent" : ""}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{hint}</small>
  </div>
);

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

const sumSeries = (series) =>
  series.reduce((sum, item) => sum + Number(item?.value || 0), 0);

const BarChart = ({ title, series, tone = "chart-blue" }) => {
  const total = sumSeries(series);
  const peak = Math.max(...series.map((item) => Number(item.value || 0)), 1);

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <h3>{title}</h3>
        <p className="muted-text">
          Tổng: <strong>{total}</strong>
        </p>
      </div>

      <div className="bar-chart">
        {series.map((item) => {
          const value = Number(item.value || 0);
          const width = `${Math.max((value / peak) * 100, value ? 8 : 0)}%`;

          return (
            <div className="bar-row" key={item.label}>
              <div className="bar-label">
                <strong>{item.label}</strong>
                <span>{value}</span>
              </div>
              <div className="bar-track">
                <div className={`bar-fill ${tone}`} style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const TrendChart = ({ title, series }) => {
  const width = 620;
  const height = 240;
  const padding = 28;

  const ordersMax = Math.max(...series.map((item) => Number(item.orders || 0)), 1);
  const revenueMax = Math.max(...series.map((item) => Number(item.revenue || 0)), 1);

  const points = series.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1);
    const ordersY = height - padding - (Number(item.orders || 0) / ordersMax) * (height - padding * 2);
    const revenueY =
      height - padding - (Number(item.revenue || 0) / revenueMax) * (height - padding * 2);

    return {
      x,
      ordersY,
      revenueY,
      label: item.label,
      orders: Number(item.orders || 0),
      revenue: Number(item.revenue || 0),
    };
  });

  const ordersPath =
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.ordersY}`)
      .join(" ") || "";
  const revenuePath =
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.revenueY}`)
      .join(" ") || "";

  return (
    <section className="panel chart-panel chart-panel-wide">
      <div className="panel-header">
        <h3>{title}</h3>
        <p className="muted-text">So sánh số đơn và doanh thu 6 tháng gần nhất.</p>
      </div>

      <div className="trend-legend">
        <span><i className="legend-dot legend-orders" /> Số đơn</span>
        <span><i className="legend-dot legend-revenue" /> Doanh thu</span>
      </div>

      <div className="trend-chart">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={title}>
          <defs>
            <linearGradient id="ordersGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d5001c" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d5001c" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {points.map((point) => (
            <g key={point.label}>
              <line
                x1={point.x}
                y1={padding}
                x2={point.x}
                y2={height - padding}
                stroke="#e2e8f0"
                strokeDasharray="4 6"
              />
              <text x={point.x} y={height - 8} textAnchor="middle" className="chart-axis-label">
                {point.label}
              </text>
            </g>
          ))}

          <path
            d={`${ordersPath} L ${points.at(-1)?.x || padding} ${height - padding} L ${points[0]?.x || padding} ${height - padding} Z`}
            fill="url(#ordersGradient)"
          />
          <path
            d={`${revenuePath} L ${points.at(-1)?.x || padding} ${height - padding} L ${points[0]?.x || padding} ${height - padding} Z`}
            fill="url(#revenueGradient)"
          />

          <path d={ordersPath} fill="none" stroke="#0ea5e9" strokeWidth="4" strokeLinejoin="round" />
          <path d={revenuePath} fill="none" stroke="#d5001c" strokeWidth="4" strokeLinejoin="round" />

          {points.map((point) => (
            <g key={`${point.label}-dots`}>
              <circle cx={point.x} cy={point.ordersY} r="5" fill="#0ea5e9" />
              <circle cx={point.x} cy={point.revenueY} r="5" fill="#d5001c" />
              <text x={point.x} y={point.ordersY - 12} textAnchor="middle" className="chart-value-label">
                {point.orders}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/admin/stats/overview");
        setStats(res.data.stats);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const dashboardStats = stats || {};
  const orderStatusBreakdown = dashboardStats.orderStatusBreakdown || [];
  const paymentStatusBreakdown = dashboardStats.paymentStatusBreakdown || [];
  const monthlyOrders = dashboardStats.monthlyOrders || [];

  const topProductSummary = useMemo(
    () => (dashboardStats.topProducts || []).map((item, index) => ({ ...item, rank: index + 1 })),
    [dashboardStats.topProducts],
  );

  if (loading) {
    return <div className="panel">Đang tải thống kê...</div>;
  }

  return (
    <div className="stack page-dashboard">
      <section className="panel panel-hero dashboard-hero">
        <div>
          <p className="eyebrow">Bảng điều khiển</p>
          <h3>Toàn bộ hoạt động của app user và web admin trên cùng backend</h3>
          <p className="muted-text">
            Xem nhanh số lượng dữ liệu, doanh thu, đơn gần đây, xu hướng đơn hàng và sản phẩm bán chạy.
          </p>
        </div>

        <div className="stats-inline">
          <div className="mini-stat">
            <span>Đơn hàng</span>
            <strong>{dashboardStats.totalOrders || 0}</strong>
          </div>
          <div className="mini-stat">
            <span>Doanh thu</span>
            <strong>{Number(dashboardStats.revenue || 0).toLocaleString("vi-VN")} ₫</strong>
          </div>
        </div>
      </section>

      <div className="grid stats-grid">
        <StatCard label="Người dùng" value={dashboardStats.totalUsers || 0} hint="Tài khoản khách hàng" />
        <StatCard label="Sản phẩm" value={dashboardStats.totalProducts || 0} hint="Tổng sản phẩm" />
        <StatCard label="Sản phẩm hiện" value={dashboardStats.activeProducts || 0} hint="Đang hiển thị ngoài shop" />
        <StatCard label="Danh mục" value={dashboardStats.totalCategories || 0} hint="Tổng danh mục" />
        <StatCard label="Danh mục hiện" value={dashboardStats.activeCategories || 0} hint="Đang hiển thị ngoài shop" />
        <StatCard
          label="Doanh thu"
          value={`${Number(dashboardStats.revenue || 0).toLocaleString("vi-VN")} ₫`}
          hint="Từ đơn đã thanh toán"
          accent
        />
      </div>

      <div className="dashboard-charts">
        <BarChart title="Đơn hàng theo trạng thái" series={orderStatusBreakdown} tone="chart-blue" />
        <BarChart title="Thanh toán theo trạng thái" series={paymentStatusBreakdown} tone="chart-red" />
        <TrendChart title="Xu hướng đơn hàng" series={monthlyOrders} />
      </div>

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
                {(dashboardStats.recentOrders || []).map((order) => (
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
            {topProductSummary.map((item) => (
              <div className="ranking-item" key={`${item._id}-${item.rank}`}>
                <strong>{item.rank}</strong>
                <img className="ranking-thumb" src={resolveImageUrl(item.image)} alt={item.name || "Sản phẩm"} />
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
    </div>
  );
}

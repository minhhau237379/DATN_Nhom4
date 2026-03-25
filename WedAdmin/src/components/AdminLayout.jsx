import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminLayout.css";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Sản phẩm" },
  { to: "/admin/categories", label: "Danh mục" },
  { to: "/admin/orders", label: "Đơn hàng" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "null");

  const handleLogout = async () => {
    try {
      await api.post("/admin/auth/logout");
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      navigate("/login");
    }
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">WA</div>
          <div>
            <h1>Wed Admin</h1>
            <p>Unified backend</p>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-chip">
            <span className="dot" />
            {adminUser?.username || "admin"}
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Quản trị hệ thống</p>
            <h2>Quản lý app user và web admin trên cùng backend</h2>
          </div>
          <Link to="/admin/dashboard" className="btn btn-primary">
            Làm mới dashboard
          </Link>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

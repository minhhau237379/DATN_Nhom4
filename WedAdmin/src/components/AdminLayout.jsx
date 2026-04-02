import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { reloadCurrentPage } from "../utils/adminActions";
import "./AdminLayout.css";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Sản phẩm" },
  { to: "/admin/categories", label: "Danh mục" },
  { to: "/admin/users", label: "Người dùng" },
  { to: "/admin/orders", label: "Đơn hàng" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "null");

  useEffect(() => {
    document.title = "HoppyStore88";
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

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
          
          <div>
            <h1>HoppyStore88</h1>
            <p className="muted-text">Quản trị hệ thống</p>
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
            <h2>Quản lý HoppyStore88 trên cùng backend</h2>
          </div>
          <button type="button" className="btn btn-primary" onClick={reloadCurrentPage}>
            Làm mới
          </button>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

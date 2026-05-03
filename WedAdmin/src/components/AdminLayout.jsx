import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminLayout.css";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "fas fa-chart-line" },
  { to: "/admin/products", label: "Sản phẩm", icon: "fas fa-box" },
  { to: "/admin/categories", label: "Danh mục", icon: "fas fa-list" },
  { to: "/admin/users", label: "Người dùng", icon: "fas fa-users" },
  { to: "/admin/orders", label: "Đơn hàng", icon: "fas fa-shopping-cart" },
  { to: "/admin/chat", label: "Chat", icon: "fas fa-comments" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "HoppyStore88";
    document.body.classList.add("hold-transition", "sidebar-mini", "layout-fixed");

    return () => {
      document.body.classList.remove("hold-transition", "sidebar-mini", "layout-fixed");
    };
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
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <div className="navbar-nav ml-auto" />
      </nav>

      {/* Sidebar */}
      <aside className="main-sidebar sidebar-light-primary elevation-4">
        <div className="sidebar">
          {/* Brand/Logo */}
          <div className="brand-link" style={{ textAlign: "center", padding: "15px" }}>
            <h3 style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: "#333" }}>
              🎮 HoppyStore88
            </h3>
            <small style={{ color: "#666" }}>Quản trị hệ thống</small>
          </div>

          {/* Sidebar Menu */}
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
              {navItems.map((item) => (
                <li className="nav-item" key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  >
                    <i className={`${item.icon} nav-icon`}></i>
                    <p>{item.label}</p>
                  </NavLink>
                </li>
              ))}
              <li className="nav-item nav-item-logout">
                <button type="button" className="nav-link logout-link" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt nav-icon"></i>
                  <p>Đăng xuất</p>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content Wrapper */}
      <div className="content-wrapper">
        <section className="content">
          <div className="content-header">
            <div className="container-fluid">
              <div className="row mb-2">
                <div className="col-sm-12">
                  {/* breadcrumb placeholder if needed */}
                </div>
              </div>
            </div>
          </div>

          <div className="content">
            <div className="container-fluid">
              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

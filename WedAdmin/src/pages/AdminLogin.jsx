import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "HoppyStore88 | Admin";
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await api.post("/admin/auth/login", form);
      if (res.data?.success) {
        localStorage.setItem("adminToken", res.data.data.token);
        localStorage.setItem("adminUser", JSON.stringify(res.data.data.user));
        navigate("/admin/dashboard");
      } else {
        setMessage(res.data?.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể kết nối đến backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-hero">
          <p className="eyebrow">HoppyStore88 Admin</p>
          <h1>Đăng nhập quản trị</h1>
          <p>Trang quản trị dùng chung backend với app user, tối ưu cho màn hình lớn và thao tác nhanh.</p>
          
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Tên đăng nhập hoặc email
            <input name="username" value={form.username} onChange={handleChange} placeholder="admin" />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Admin@123"
            />
          </label>

          {message && <div className="alert">{message}</div>}

          <button className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <p className="auth-footnote">
            Dùng tài khoản admin đã bootstrap trong backend hoặc tài khoản bạn tự tạo có role admin.
          </p>
        </form>
      </div>
    </div>
  );
}

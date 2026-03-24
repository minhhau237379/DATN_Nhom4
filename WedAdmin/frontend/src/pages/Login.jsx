import { useState } from "react";
import "../assets/css/login.css";

import api from "../services/api";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const registered = params.get("registered");

  const [message, setMessage] = useState(
    registered === "true"
      ? {
          type: "success",
          text: "Đăng ký thành công! Vui lòng đăng nhập.",
        }
      : null,
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!form.username) {
      setErrors({ username: "Vui lòng nhập tên đăng nhập hoặc email" });
      return;
    }

    if (!form.password) {
      setErrors({ password: "Vui lòng nhập mật khẩu" });
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/login", form);
        console.log(res.data);
      const result = res.data;

      if (result.success) {
        if (result.data?.token) {
          localStorage.setItem("token", result.data.token);
        }

        if (result.data?.user) {
          localStorage.setItem("user", JSON.stringify(result.data.user));
        }

        navigate("/products");
      }
       else {
        setMessage({
          type: "danger",
          text: result.message || "Đăng nhập thất bại",
        });

        if (result.message?.toLowerCase().includes("không tồn tại")) {
          setErrors({ username: "Tên đăng nhập hoặc email không tồn tại" });
        }

        if (result.message?.toLowerCase().includes("mật khẩu")) {
          setErrors({ password: "Mật khẩu không chính xác" });
        }
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: "danger",
        text: "Đã xảy ra lỗi kết nối",
      });
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="header">
          <img src="/images/UI/logo.jpg" className="logo" />

          <h1 className="title">Chào mừng trở lại</h1>

          <p className="subtitle">Đăng nhập vào tài khoản của bạn</p>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập hoặc Email</label>

            <input
              className={`form-control ${errors.username ? "is-invalid" : ""}`}
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Nhập tên đăng nhập hoặc email"
            />

            {errors.username && (
              <div className="error-message show-error">{errors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <img
                  src={
                    showPassword ? "/images/UI/show.jpg" : "/images/UI/hide.jpg"
                  }
                  alt="toggle"
                />
              </button>
            </div>

            {errors.password && (
              <div className="error-message show-error">{errors.password}</div>
            )}

            <div className="forgot-password">
              <Link to="/register">Quên mật khẩu?</Link>
            </div>
          </div>

          <button className="btn-login" disabled={loading}>
            {loading ? <span className="loading"></span> : "Đăng nhập"}
          </button>
        </form>

        <div className="links">
          <Link to="/register">Chưa có tài khoản? Đăng ký</Link>
        </div>
      </div>
    </div>
  );
}

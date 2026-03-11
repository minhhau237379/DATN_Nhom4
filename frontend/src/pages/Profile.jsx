import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/profile.css";
import api from "../services/api";


export default function Profile({ user }) {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

 const logout = async () => {
  try {
    await api.post("/auth/logout");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");

  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="profile-page">
      <div className="container mt-4">

        <div className="text-center">
          <div className="avatar">🧸</div>

          <h6 className="mt-4">
            {user?.username || "Người dùng"}
          </h6>
        </div>

        <div className="card-box">
          <div className="list-group">

            <a href="/profile/info" className="list-item">
              Thông tin cá nhân <span>›</span>
            </a>

            <a href="/change-password" className="list-item">
              Đổi mật khẩu <span>›</span>
            </a>

            <button
              className="list-item logout"
              onClick={() => setShowLogout(true)}
            >
              Đăng xuất <span>›</span>
            </button>

          </div>
        </div>

        <div className="card-box">
          <div className="list-group">

            <a href="/orders" className="list-item">
              Đơn hàng của tôi <span>›</span>
            </a>

            <a href="/payments" className="list-item">
              Lịch sử thanh toán <span>›</span>
            </a>

          </div>
        </div>

      </div>

      {showLogout && (
        <div className="logout-modal">

          <div className="logout-box">

            <p>Bạn có chắc muốn đăng xuất không?</p>

            <div className="logout-actions">

              <button
                className="btn-cancel"
                onClick={() => setShowLogout(false)}
              >
                Hủy
              </button>

              <button
                className="btn-confirm"
                onClick={logout}
              >
                Đăng xuất
              </button>

            </div>

          </div>

        </div>
      )}
      
    </div>
    
  );
}
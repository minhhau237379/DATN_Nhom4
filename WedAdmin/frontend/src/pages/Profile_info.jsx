import { useEffect, useState } from "react";
import "../assets/css/profile_info.css";
import api from "../services/api";
import { Link } from "react-router-dom";


export default function ProfileInfo() {
  const [user, setUser] = useState({});

  useEffect(() => {
    api.get("/profile")
      .then(res => {
        setUser(res.data);
      })
      .catch(err => {
        console.error(err);
      });
  }, []);

  return (
    <div className="profile-container">

      {/* AVATAR */}
      <div className="info-card text-center">
        <div className="avatar">🧸</div>

        <h6 className="username">
          {user.username}
        </h6>

        <small className="email">
          {user.email}
        </small>
      </div>

      {/* INFO */}
      <div className="info-card">

        <div className="info-row">
          <div className="label">Tên đăng nhập</div>
          <div className="value">{user.username}</div>
        </div>

        <div className="info-row">
          <div className="label">Email</div>
          <div className="value">{user.email}</div>
        </div>

        <div className="info-row">
          <div className="label">Số điện thoại</div>
          <div className="value">
            {user.phoneNumber || "Chưa cập nhật"}
          </div>
        </div>

      </div>

      {/* EDIT */}
      <Link to="/profile/edit" className="edit-btn">
        ✏️ Chỉnh sửa thông tin
      </Link>
    
    </div>
  );
}
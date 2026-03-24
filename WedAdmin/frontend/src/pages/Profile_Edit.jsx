import { useEffect, useState } from "react";
import "../assets/css/profile_edit.css";


export default function ProfileEdit() {
  const [user, setUser] = useState({
    username: "",
    email: "",
    phoneNumber: "",
  });

  useEffect(() => {
    fetch("/profile/info")
      .then((res) => res.json())
      .then((data) => setUser(data));
  }, []);

  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/profile/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(user),
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/profile";
    } else {
      alert("Cập nhật thất bại");
    }
  };

  return (
    <div className="profile-edit-page">
      <div className="container">
        <h5 className="title">Chỉnh sửa thông tin</h5>

        <div className="profile-card">
          <div className="avatar-wrapper">
            <div className="avatar">🧸</div>
            <div className="change-avatar">Thay ảnh đại diện</div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Tên người dùng</label>
              <input
                type="text"
                className="form-control"
                name="username"
                value={user.username}
                readOnly
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={user.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Số điện thoại</label>
              <input
                type="text"
                className="form-control"
                name="phoneNumber"
                value={user.phoneNumber || ""}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-save">
              Lưu thay đổi
            </button>

            <a href="/profile" className="btn-cancel">
              Huỷ
            </a>
          </form>
        </div>
      </div>
      
    </div>
  );
}

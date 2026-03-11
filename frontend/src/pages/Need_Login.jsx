import "../assets/css/need_login.css";
import { Link } from "react-router-dom";

export default function NeedLogin() {

  const params = new URLSearchParams(window.location.search);
  const message =
    params.get("message") || "Bạn cần đăng nhập để tiếp tục";

  return (

    <div className="need-login-page">

      <div className="login-box">

        <div className="icon">
          🔒
        </div>

        <div className="message">
          {message}
        </div>

        <Link
          to="/login"
          className="btn btn-login w-100 text-white"
        >
          Đăng nhập ngay
        </Link>

        <Link
          to="/products"
          className="btn btn-outline-secondary btn-back w-100"
        >
          Quay lại trang sản phẩm
        </Link>

      </div>

    </div>

  );

}
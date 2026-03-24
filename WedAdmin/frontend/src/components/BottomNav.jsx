import { Link, useLocation } from "react-router-dom";
import "../assets/css/bottom-nav.css";

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">

      <Link to="/products" className={`nav-item ${location.pathname === "/products" ? "active" : ""}`}>
        <img src="/images/UI/home.png" alt="products" />
        
      </Link>

      <Link to="/favorite" className={`nav-item ${location.pathname === "/favorite" ? "active" : ""}`}>
        <img src="/images/UI/like.png" alt="favorite" />
       
      </Link>

      <Link to="/cart" className={`nav-item ${location.pathname === "/cart" ? "active" : ""}`}>
        <img src="/images/UI/order.png" alt="cart" />
        
      </Link>

      <Link to="/profile" className={`nav-item ${location.pathname === "/profile" ? "active" : ""}`}>
        <img src="/images/UI/profile.png" alt="profile" />
        
      </Link>

    </nav>
  );
}
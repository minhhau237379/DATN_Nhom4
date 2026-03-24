import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";

// pages
import Splash from "./pages/Splash";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import Favorite from "./pages/Favorite";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Profile_Edit from "./pages/Profile_Edit";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Need_Login from "./pages/Need_Login";
import Order from "./pages/Order";
// import Order_Detail from "./pages/Order_Detail";
// import Payment from "./pages/Payment";

// components
import BottomNav from "./components/BottomNav";

function Layout() {

  const location = useLocation();

  const token = localStorage.getItem("token");

  // các trang KHÔNG hiển thị bottom nav
  const hideNavRoutes = ["/", "/login", "/register", "/need-login"];

  // function kiểm tra login
  const requireLogin = (component) => {
    if (!token) {
      return <Navigate to="/need-login" replace />;
    }
    return component;
  };

  return (
    <>
      <Routes>

        {/* Splash  */}
        <Route path="/" element={<Splash />} />

        {/* Product */}
        <Route path="/products" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetail />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/need-login" element={<Need_Login />} />

        {/* Favorite */}
        <Route path="/favorite" element={requireLogin(<Favorite />)} />

        {/* Cart */}
        <Route path="/cart" element={requireLogin(<Cart />)} />

        {/* Profile */}
        <Route path="/profile" element={requireLogin(<Profile />)} />

        <Route path="/profile/edit" element={requireLogin(<Profile_Edit />)} />

        {/* Order */}
        <Route path="/orders" element={requireLogin(<Order />)} />
        {/* <Route path="/order/:id" element={<Order_Detail />} /> */}

        {/* Payment */}
        {/* <Route path="/payment" element={<Payment />} /> */}

      </Routes>

      {/* Bottom Navigation */}
      {!hideNavRoutes.includes(location.pathname) && <BottomNav />}

    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
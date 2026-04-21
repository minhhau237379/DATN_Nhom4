import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import AdminLayout from "./components/AdminLayout";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Users from "./pages/Users";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Chat from "./pages/Chat";

const isAdminLoggedIn = () => Boolean(localStorage.getItem("adminToken"));

function RequireAdmin() {
  return isAdminLoggedIn() ? <Outlet /> : <Navigate to="/login" replace />;
}

function RootRedirect() {
  return <Navigate to={isAdminLoggedIn() ? "/admin/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<AdminLogin />} />

        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/products" element={<Products />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/orders" element={<Orders />} />
            <Route path="/admin/orders/:id" element={<OrderDetail />} />
            <Route path="/admin/chat" element={<Chat />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

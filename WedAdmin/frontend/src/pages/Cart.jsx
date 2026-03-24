import { useState } from "react";
import "../assets/css/cart.css";


export default function Cart({ items = [], total = 0 }) {
  const [cartItems, setCartItems] = useState(items);

  const updateQty = async (productId, change) => {
    await fetch("/cart/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, change }),
    });

    setCartItems((prev) =>
      prev.map((item) =>
        item.product._id === productId
          ? { ...item, quantity: item.quantity + change }
          : item,
      ),
    );
  };

  const deleteItem = async (productId) => {
    await fetch("/cart/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId }),
    });

    window.location.reload();
  };

  const checkout = async () => {
    const body = {
      shippingAddress: {
        fullName: "Test User",
        phone: "0900000000",
        address: "Dak Lak",
        city: "Buon Ma Thuot",
      },
    };

    const res = await fetch("/orders/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.success) {
      alert("🎉 Đặt hàng thành công");
    } else {
      alert("❌ " + data.message);
    }
  };

  if (cartItems.length === 0) {
    return <div className="empty-cart">Giỏ hàng trống 😢</div>;
  }

  return (
    <div className="container">
      <h5 className="cart-title">🛒 Giỏ hàng của bạn</h5>

      {cartItems.map((item) => (
        <div key={item.product._id} className="cart-item">
          <img src={item.product.image} />

          <div className="info">
            <div className="product-name">{item.product.name}</div>

            <div className="price">
              {item.product.price.toLocaleString("vi-VN")}₫
            </div>

            <div className="qty-box">
              <button
                className="qty-btn"
                onClick={() => updateQty(item.product._id, -1)}
              >
                -
              </button>

              <span>{item.quantity}</span>

              <button
                className="qty-btn"
                onClick={() => updateQty(item.product._id, 1)}
              >
                +
              </button>

              <button
                className="delete-btn"
                onClick={() => deleteItem(item.product._id)}
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="checkout-bar">
        <div>
          Tổng tiền:
          <b className="total">{total.toLocaleString("vi-VN")}₫</b>
        </div>

        <button className="checkout-btn" onClick={checkout}>
          Mua hàng
        </button>
      </div>
      
    </div>
  );
}

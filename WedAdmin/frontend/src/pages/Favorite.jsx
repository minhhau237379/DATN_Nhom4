import { useState } from "react";
import "../assets/css/favorite.css";


export default function Favorite({ products = [] }) {
  const [items, setItems] = useState(products);

  const toggleFav = async (id) => {
    try {
      const res = await fetch(`/favorite/toggle/${id}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        setItems(items.filter((p) => p._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (items.length === 0) {
    return (
      <div className="empty-box">
        <span>💔</span>
        Chưa có sản phẩm yêu thích
      </div>
    );
  }

  return (
    <div>
      <div className="header">❤️ Sản phẩm yêu thích</div>

      <div className="product-grid">
        {items.map((p) => (
          <div key={p._id} className="product-card">
            <span className="heart" onClick={() => toggleFav(p._id)}>
              ❤
            </span>

            <img src={p.image} />

            <div>{p.name}</div>

            <div className="price">{p.price.toLocaleString("vi-VN")}₫</div>
          </div>
        ))}
      </div>
      
    </div>
  );
}

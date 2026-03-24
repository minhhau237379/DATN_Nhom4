import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../assets/css/product_detail.css";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // LOAD PRODUCT
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const res = await api.get(`/shop/product/${id}`);

        setProduct(res.data.product);
        setRelatedProducts(res.data.relatedProducts || []);
        setIsFavorite(res.data.isFavorite || false);
      } catch (err) {
        console.error(err);
      }
    };

    loadProduct();
  }, [id]);

  // FAVORITE
  const toggleFav = async (id) => {
    try {
      const res = await api.post(`/favorite/toggle/${id}`);

      if (res.data.success) {
        setIsFavorite(!isFavorite);
        showToast("❤️ Đã cập nhật sản phẩm yêu thích");
      } else {
        showToast("⚠️ Bạn cần đăng nhập");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Lỗi hệ thống");
    }
  };

  // ADD TO CART
  const addToCart = async (productId) => {
    if (!productId) return;

    try {
      const res = await fetch("/cart/add", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (data.success) {
        showToast("🛒 Đã thêm vào giỏ hàng");
      } else {
        showToast("⚠️ Bạn cần đăng nhập");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Lỗi hệ thống");
    }
  };

  // TOAST
  const showToast = (message) => {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.innerText = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  };

  // CHỜ LOAD DATA
  if (!product) {
    return (
      <div className="page-wrapper">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* IMAGE */}

      <div className="product-image">
        <img src={`http://localhost:3003${product.image}`} alt={product.name} />
      </div>

      {/* NAME + PRICE */}

      <div className="section product-info">
        <h5 className="product-name">{product.name}</h5>

        <div className="price-row">
          <div className="price">{product.price?.toLocaleString("vi-VN")}₫</div>

          <img
            className="heart"
            src={
              isFavorite
                ? "/images/UI/heart_on.png"
                : "/images/UI/heart_off.png"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFav(product._id);
            }}
          />
        </div>
      </div>

      {/* ADD TO CART */}

      <button className="btn-cart" onClick={() => addToCart(product._id)}>
        Thêm Vào Giỏ Hàng
      </button>

      {/* DESCRIPTION */}

      <div className="section">
        <h6>Mô tả sản phẩm</h6>

        {product.description ? (
          <p>{product.description}</p>
        ) : (
          <p>Chưa có thông tin chi tiết</p>
        )}

        {/* SPECIFICATIONS */}

        {product.specifications && (
          <table className="spec-table">
            <tbody>
              {Object.keys(product.specifications).map((key) => (
                <tr key={key}>
                  <td className="spec-key">{key}</td>

                  <td>{product.specifications[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RELATED PRODUCTS */}

      {relatedProducts.map((p) => (
        <div
          key={p._id}
          className="related-card"
          onClick={() => navigate(`/product/${p._id}`)}
        >
          <img src={`http://localhost:3003${p.image}`} alt={p.name} />

          <div className="related-name">{p.name}</div>

          <div className="price">{p.price.toLocaleString("vi-VN")}₫</div>
        </div>
      ))}

      {/* TOAST */}

      <div id="toast" className="toast-box"></div>
    </div>
  );
}

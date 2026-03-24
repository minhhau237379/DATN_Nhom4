import { useEffect, useState } from "react";
import api from "../services/api";
import "../assets/css/product.css";
import { Link } from "react-router-dom";

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  // const [favorites, setFavorites] = useState([]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [showFilter, setShowFilter] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await api.get("/shop", {
        params: { search, sort, category, minPrice, maxPrice },
      });

      setProducts(res.data.products);
      setCategories(res.data.categories);
      setFavorites(res.data.favorites);
    } catch (err) {
      console.error(err);
    }
  };

  // const syncFavorites = async () => {
  //   try {
  //     const res = await api.get("/favorite/list");
  //     setFavorites(res.data.favorites);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };

  useEffect(() => {
    fetchProducts();
  }, [search, sort, category, minPrice, maxPrice]);
  // useEffect(() => {
  //   syncFavorites();
  // }, []);

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.innerText = message;

    toast.style.position = "fixed";
    toast.style.bottom = "80px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "rgba(0,0,0,0.8)";
    toast.style.color = "white";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "20px";
    toast.style.zIndex = "9999";
    toast.style.fontSize = "14px";

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  };

  // const toggleFav = async (id) => {
  //   try {
  //     const res = await api.post(`/favorite/toggle/${id}`);

  //     if (res.status === 401) {
  //       showToast("⚠️ Bạn cần đăng nhập");
  //       return;
  //     }

  //     if (res.data.success) {
  //       setFavorites((prev) =>
  //         prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
  //       );

  //       showToast("❤️ Đã cập nhật sản phẩm yêu thích");
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     showToast("❌ Lỗi hệ thống");
  //   }
  // };

  return (
    <>
      {/* HEADER */}
      <div className="top-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="Nhập từ khóa tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
          />
        </div>
      </div>

      {/* CATEGORY NAV */}
      <div className="category-nav">
        <div
          className={`category-item ${category === "" ? "active" : ""}`}
          onClick={() => {
            setCategory("");
          }}
        >
          Tất cả
        </div>

        {categories.map((cat) => (
          <div
            key={cat._id}
            className={`category-item ${category === cat.name ? "active" : ""}`}
            onClick={() => {
              setCategory(cat.name);
            }}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div onClick={() => setShowFilter(true)}>⚙ Bộ lọc</div>

        <div>
          <span>Sắp xếp theo: </span>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setTimeout(fetchProducts, 0);
            }}
          >
            <option value="">Mặc định</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
        </div>
      </div>

     {/* PRODUCT GRID */}
<div className="product-grid">
  {products.map((p) => (
    <div className="product-card" key={p._id}>
      <Link to={`/product/${p._id}`} className="product-link">
        <img
          src={`http://localhost:3003${p.image}`}
          className="product-img"
          alt={p.name}
        />

        <div className="product-info">
          <div className="product-title">{p.name}</div>

          <div className="price-row">
            <span className="price">
              {p.price.toLocaleString("vi-VN")}₫
            </span>

            {/* <img
              className="heart"
              src={
                favorites.includes(p._id)
                  ? "/images/UI/heart_on.png"
                  : "/images/UI/heart_off.png"
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFav(p._id);
              }}
            /> */}
          </div>
        </div>
      </Link>
    </div>
  ))}
</div>

      {/* FILTER SIDEBAR */}
      <div className={`filter-sidebar ${showFilter ? "active" : ""}`}>
        <h5>Bộ lọc</h5>
        <button onClick={() => setShowFilter(false)}>Đóng</button>

        <h6>Khoảng giá</h6>

        <input
          type="number"
          placeholder="Min"
          className="form-control mb-2"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />

        <input
          type="number"
          placeholder="Max"
          className="form-control"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />

        <button
          className="btn btn-dark mt-3 w-100"
          onClick={() => {
            fetchProducts();
            setShowFilter(false);
          }}
        >
          Lọc
        </button>
      </div>

      {/* OVERLAY */}
      {/* <div
        className={`overlay ${showFilter ? "active" : ""}`}
        onClick={() => setShowFilter(false)}
      ></div> */}
    </>
  );
}

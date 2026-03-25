import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./Products.css";

const emptyForm = {
  _id: "",
  name: "",
  price: "",
  stock: "",
  description: "",
  id_category: "",
  imagePath: "",
  status: "1",
  specifications: {
    age: "",
    gender: "",
    brand: "",
    origin: "",
    theme: "",
  },
};

const specFields = [
  { key: "theme", label: "Chủ đề" },
  { key: "age", label: "Độ tuổi" },
  { key: "gender", label: "Giới tính" },
  { key: "brand", label: "Thương hiệu" },
  { key: "origin", label: "Xuất xứ" },
];

const statusText = {
  1: "Hiện",
  0: "Ẩn",
};

const toImageUrl = (path) => {
  if (!path) return "/images/no-image.png";
  if (path.startsWith("http")) return path;
  return `http://localhost:3003${path}`;
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const editing = useMemo(() => Boolean(form._id), [form._id]);

  const load = async () => {
    setLoading(true);
    try {
      const [productRes, categoryRes] = await Promise.all([
        api.get("/admin/products", {
          params: {
            search: debouncedSearch,
            categoryId: categoryFilter || undefined,
            status: statusFilter,
          },
        }),
        api.get("/admin/categories"),
      ]);

      setProducts(productRes.data.products || []);
      setCategories(categoryRes.data.categories || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    load();
  }, [debouncedSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const openCreate = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setMessage("");
  };

  const openEdit = (product) => {
    setForm({
      _id: product._id,
      name: product.name || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      description: product.description || "",
      id_category: product.id_category?._id || product.id_category || "",
      imagePath: product.image || "",
      status: String(product.status ?? 1),
      specifications: {
        ...emptyForm.specifications,
        ...(product.specifications || {}),
      },
    });
    setImageFile(null);
    setImagePreview(toImageUrl(product.image));
    setMessage("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSpecChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      specifications: {
        ...(prev.specifications || {}),
        [key]: value,
      },
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("price", String(form.price));
      formData.append("stock", String(form.stock || 0));
      formData.append("status", form.status);
      formData.append("specifications", JSON.stringify(form.specifications || {}));

      if (form.id_category) {
        formData.append("id_category", form.id_category);
      }

      if (form.imagePath) {
        formData.append("image", form.imagePath);
      }

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      const res = editing
        ? await api.put(`/admin/products/${form._id}`, formData)
        : await api.post("/admin/products", formData);

      setMessage(res.data?.message || "Lưu thành công");
      openCreate();
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) return;

    try {
      await api.delete(`/admin/products/${product._id}`);
      setMessage("Xóa sản phẩm thành công");
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể xóa sản phẩm");
    }
  };

  const updateStock = async (productId, stock) => {
    try {
      await api.patch(`/admin/products/${productId}/stock`, { stock });
      setMessage("Cập nhật tồn kho thành công");
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể cập nhật tồn kho");
    }
  };

  const toggleStatus = async (product) => {
    try {
      await api.patch(`/admin/products/${product._id}/status`, {
        status: product.status === 1 ? 0 : 1,
      });
      setMessage(product.status === 1 ? "Đã ẩn sản phẩm" : "Đã hiển thị sản phẩm");
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể đổi trạng thái sản phẩm");
    }
  };

  const activeCount = products.filter((item) => item.status === 1).length;
  const hiddenCount = products.filter((item) => item.status === 0).length;

  return (
    <div className="stack page-products">
      <section className="panel panel-hero">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quản lý sản phẩm</p>
            <h3>Sản phẩm, ảnh và trạng thái hiển thị</h3>
            
          </div>

          <div className="stats-inline">
            <div className="mini-stat">
              <span>Tổng</span>
              <strong>{products.length}</strong>
            </div>
            <div className="mini-stat">
              <span>Hiện</span>
              <strong>{activeCount}</strong>
            </div>
            <div className="mini-stat">
              <span>Ẩn</span>
              <strong>{hiddenCount}</strong>
            </div>
          </div>
        </div>

        {message && <div className="alert">{message}</div>}

        <div className="filter-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên sản phẩm"
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="1">Hiện</option>
            <option value="0">Ẩn</option>
          </select>
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            Thêm sản phẩm
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>{editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h3>
          {editing && (
            <button type="button" className="btn btn-secondary" onClick={openCreate}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form className="form-grid form-grid-wide" onSubmit={submit}>
          <label>
            Tên sản phẩm
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>

          <label>
            Giá bán
            <input name="price" type="number" min="0" value={form.price} onChange={handleChange} required />
          </label>

          <label>
            Tồn kho
            <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required />
          </label>

          <label>
            Danh mục
            <select name="id_category" value={form.id_category} onChange={handleChange}>
              <option value="">-- Chọn danh mục --</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Trạng thái
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="1">Hiện</option>
              <option value="0">Ẩn</option>
            </select>
          </label>

          <label className="full">
            Ảnh sản phẩm
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>

          <label className="full">
            Đường dẫn ảnh
            <input
              name="imagePath"
              value={form.imagePath}
              onChange={handleChange}
              placeholder="/images/products/..."
            />
          </label>

          <div className="full spec-panel">
            <div className="spec-panel-head">
              <strong>Thông số hiển thị trên app user</strong>
              <span>Điền đầy đủ để trang chi tiết hiển thị đẹp hơn.</span>
            </div>

            <div className="spec-grid">
              {specFields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  <input
                    value={form.specifications?.[field.key] || ""}
                    onChange={(e) => handleSpecChange(field.key, e.target.value)}
                    placeholder={field.label}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="full upload-preview">
            <div className="upload-preview-box">
              {imagePreview || form.imagePath ? (
                <img src={imagePreview || toImageUrl(form.imagePath)} alt="Preview" />
              ) : (
                <div className="upload-placeholder">Chưa chọn ảnh</div>
              )}
            </div>
            <div className="upload-preview-meta">
              <strong>Xem trước ảnh</strong>
              <p>
                Ảnh sẽ được lưu vào <code>backend/public/images/products/&lt;danh-mục&gt;</code> khi bạn chọn file.
              </p>
            </div>
          </div>

          <div className="full actions-inline">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : editing ? "Cập nhật sản phẩm" : "Thêm mới"}
            </button>
            {editing && (
              <button type="button" className="btn btn-secondary" onClick={openCreate}>
                Hủy sửa
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Danh sách sản phẩm</h3>
          <p className="muted-text">
            Bấm vào nút trạng thái để ẩn/hiện nhanh mà không mất dữ liệu.
          </p>
        </div>

        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Tên</th>
                  <th>Danh mục</th>
                  <th>Trạng thái</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <img className="thumb" src={toImageUrl(product.image)} alt={product.name} />
                    </td>
                    <td>
                      <strong>{product.name}</strong>
                      <div className="muted-text small-text">{product.description || "Chưa có mô tả"}</div>
                    </td>
                    <td>{product.id_category?.name || "Chưa có"}</td>
                    <td>
                      <span className={`status-pill ${product.status === 1 ? "status-on" : "status-off"}`}>
                        {statusText[product.status ?? 1]}
                      </span>
                    </td>
                    <td>{Number(product.price || 0).toLocaleString("vi-VN")} ₫</td>
                    <td>
                      <input
                        className="stock-input"
                        type="number"
                        min="0"
                        defaultValue={product.stock || 0}
                        onBlur={(e) => updateStock(product._id, Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <div className="actions-inline">
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(product)}>
                          Sửa
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(product)}>
                          {product.status === 1 ? "Ẩn" : "Hiện"}
                        </button>
                        <button type="button" className="btn btn-danger" onClick={() => remove(product)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

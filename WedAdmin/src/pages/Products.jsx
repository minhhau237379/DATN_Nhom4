import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { getBackendOrigin } from "../services/baseUrl";
import { reloadCurrentPage, scrollToTop } from "../utils/adminActions";
import "./Products.css";

const emptyForm = {
  _id: "",
  name: "",
  price: "",
  stock: "",
  description: "",
  id_category: "",
  status: "1",
  imagePaths: [],
  specifications: {
    age: "",
    gender: "",
    brand: "",
    origin: "",
    theme: "",
  },
};

const descriptionTemplate = `<h4>Thông tin nổi bật</h4>
<p><strong>Chủ đề:</strong> </p>
<p><strong>Độ tuổi:</strong> </p>
<p><strong>Giới tính:</strong> </p>
<p><strong>Thương hiệu:</strong> </p>
<p><strong>Xuất xứ:</strong> </p>`;

const statusText = {
  1: "Hiện",
  0: "Ẩn",
};

const normalizeImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
};

const toImageUrl = (value) => {
  const firstImage = normalizeImages(value)[0];
  if (!firstImage) return "/images/no-image.png";
  if (firstImage.startsWith("http") || firstImage.startsWith("blob:") || firstImage.startsWith("data:")) {
    return firstImage;
  }
  return `${getBackendOrigin()}${firstImage}`;
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState([]);

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

  useEffect(
    () => () => {
      filePreviewUrls.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    },
    [filePreviewUrls],
  );

  const openCreate = () => {
    filePreviewUrls.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });

    setForm({
      ...emptyForm,
      description: descriptionTemplate,
    });
    setSelectedFiles([]);
    setFilePreviewUrls([]);
    setMessage("");
  };

  const openEdit = (product) => {
    filePreviewUrls.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });

    const images = normalizeImages(product.image);

    setForm({
      _id: product._id,
      name: product.name || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      description: product.description || "",
      id_category: product.id_category?._id || product.id_category || "",
      status: String(product.status ?? 1),
      imagePaths: images,
      specifications: {
        ...emptyForm.specifications,
        ...(product.specifications || {}),
      },
    });
    setSelectedFiles([]);
    setFilePreviewUrls([]);
    setMessage("");
    scrollToTop();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);

    filePreviewUrls.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });

    setSelectedFiles(files);
    setFilePreviewUrls(files.map((file) => URL.createObjectURL(file)));
  };

  const fillDescriptionTemplate = () => {
    setForm((prev) => ({
      ...prev,
      description: descriptionTemplate,
    }));
  };

  const clearDescription = () => {
    setForm((prev) => ({
      ...prev,
      description: "",
    }));
  };

  const removeExistingImage = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      imagePaths: (prev.imagePaths || []).filter((_, index) => index !== indexToRemove),
    }));
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
      formData.append("description", form.description || "");
      formData.append("status", form.status);
      formData.append("specifications", JSON.stringify(form.specifications || {}));
      formData.append("images", JSON.stringify(form.imagePaths || []));

      if (form.id_category) {
        formData.append("id_category", form.id_category);
      }

      selectedFiles.forEach((file) => {
        formData.append("imageFiles", file);
      });

      const res = editing
        ? await api.put(`/admin/products/${form._id}`, formData)
        : await api.post("/admin/products", formData);

      setMessage(res.data?.message || "Lưu thành công");
      reloadCurrentPage();
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (product) => {
    try {
      await api.patch(`/admin/products/${product._id}/status`, {
        status: product.status === 1 ? 0 : 1,
      });
      setMessage(product.status === 1 ? "Đã ẩn sản phẩm" : "Đã hiển thị sản phẩm");
      reloadCurrentPage();
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể đổi trạng thái sản phẩm");
    }
  };

  const activeCount = products.filter((item) => item.status === 1).length;
  const hiddenCount = products.filter((item) => item.status === 0).length;
  const previewImages = [...(form.imagePaths || []), ...filePreviewUrls];
  // const descriptionPreview = form.description?.trim() || "<p>Chưa có nội dung mô tả.</p>";

  return (
    <div className="stack page-products">
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

          <div className="full html-editor-panel">
            <div className="field-head">
              <div>
                <span className="field-label">Mô tả sản phẩm</span>
                <small className="field-help">
                  Soạn thảo trực quan, không cần tự viết HTML thủ công.
                </small>
              </div>

              <div className="html-toolbar">
                <button type="button" className="chip-btn chip-primary" onClick={fillDescriptionTemplate}>
                  Chèn mẫu
                </button>
                <button type="button" className="chip-btn chip-danger" onClick={clearDescription}>
                  Xóa nội dung
                </button>
              </div>
            </div>

            <div className="ckeditor-wrap">
              <CKEditor
                editor={ClassicEditor}
                data={form.description || ""}
                config={{
                  licenseKey: "GPL",
                  toolbar: [
                    "undo",
                    "redo",
                    "|",
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "link",
                    "|",
                    "bulletedList",
                    "numberedList",
                    "blockQuote",
                    "|",
                    "insertTable",
                    "mediaEmbed",
                    "|",
                    "removeFormat",
                  ],
                }}
                onChange={(_, editor) => {
                  const data = editor.getData();
                  setForm((prev) => ({ ...prev, description: data }));
                }}
              />
            </div>
          </div>

          <label className="full">
            Ảnh sản phẩm
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </label>

          <div className="full image-preview-panel">
            <div className="image-preview-head">
              <strong>Ảnh hiện có và ảnh mới</strong>
              <span>Chọn nhiều hình để lưu vào cùng một sản phẩm.</span>
            </div>

            {previewImages.length ? (
              <div className="image-preview-grid">
                {previewImages.map((image, index) => (
                  <div className="image-preview-item" key={`${image}-${index}`}>
                    <img src={toImageUrl(image)} alt={`Preview ${index + 1}`} />
                    {index < (form.imagePaths || []).length ? (
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() => removeExistingImage(index)}
                      >
                        Xóa
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="upload-placeholder">Chưa chọn ảnh</div>
            )}
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
          style={{width:"90%"}}
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
        </div>
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
                    </td>
                    <td>{product.id_category?.name || "Chưa có"}</td>
                    <td>
                      <span className={`status-pill ${product.status === 1 ? "status-on" : "status-off"}`}>
                        {statusText[product.status ?? 1]}
                      </span>
                    </td>
                    <td>{Number(product.price || 0).toLocaleString("vi-VN")} đ</td>
                    <td>
                      <span className="stock-text">{product.stock ?? 0}</span>
                    </td>
                    <td>
                      <div className="actions-inline">
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(product)}>
                          Sửa
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(product)}>
                          {product.status === 1 ? "Ẩn" : "Hiện"}
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


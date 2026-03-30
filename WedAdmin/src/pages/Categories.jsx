import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { reloadCurrentPage, scrollToTop } from "../utils/adminActions";
import "./Categories.css";

const emptyForm = {
  _id: "",
  name: "",
  description: "",
  status: "1",
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/categories");
      setCategories(res.data.categories || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const editing = useMemo(() => Boolean(form._id), [form._id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setMessage("");
  };

  const edit = (category) => {
    setForm({
      _id: category._id,
      name: category.name || "",
      description: category.description || "",
      status: String(category.status ?? 1),
    });
    setMessage("");
    scrollToTop();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        name: form.name,
        description: form.description,
        status: form.status,
      };

      const res = editing
        ? await api.put(`/admin/categories/${form._id}`, payload)
        : await api.post("/admin/categories", payload);

      setMessage(res.data?.message || "Lưu thành công");
      reloadCurrentPage();
      return;
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể lưu danh mục");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category) => {
    try {
      await api.patch(`/admin/categories/${category._id}/status`, {
        status: category.status === 1 ? 0 : 1,
      });
      setMessage(category.status === 1 ? "Đã ẩn danh mục" : "Đã hiển thị danh mục");
    } catch (err) {
      setMessage(err.response?.data?.message || "Không thể đổi trạng thái danh mục");
    }
  };

  const activeCount = categories.filter((item) => item.status === 1).length;
  const hiddenCount = categories.filter((item) => item.status === 0).length;

  return (
    <div className="stack page-categories">
      <section className="panel panel-hero">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quản lý danh mục</p>
            <h3>Thêm, sửa và ẩn/hiện danh mục</h3>
            <p className="muted-text">
              Danh mục được dùng chung cho app user và web admin, nên trạng thái ẩn sẽ tự đồng bộ sang shop.
            </p>
          </div>

          <div className="stats-inline">
            <div className="mini-stat">
              <span>Tổng</span>
              <strong>{categories.length}</strong>
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

        
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>{editing ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}</h3>
          {editing && (
            <button type="button" className="btn btn-secondary" onClick={openCreate}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form className="form-grid" onSubmit={submit}>
          <label>
            Tên danh mục
            <input style={{ width: "70%" }} name="name" value={form.name} onChange={handleChange} required />
          </label>

          <label>
            Trạng thái
            <select style={{ width: "70%" }} name="status" value={form.status} onChange={handleChange}>
              <option value="1">Hiện</option>
              <option value="0">Ẩn</option>
            </select>
          </label>

          <label className="full">
            Mô tả
            <textarea style={{ width: "70%" }} name="description" value={form.description} onChange={handleChange} rows="2" />
          </label>

          <div className="full actions-inline">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm mới"}
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
          <h3>Danh sách danh mục</h3>
        </div>

        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td>{category.name}</td>
                    <td>{category.description || "-"}</td>
                    <td>
                      <span className={`status-pill ${category.status === 1 ? "status-on" : "status-off"}`}>
                        {category.status === 1 ? "Hiện" : "Ẩn"}
                      </span>
                    </td>
                    <td>
                      <div className="actions-inline">
                        <button type="button" className="btn btn-secondary" onClick={() => edit(category)}>
                          Sửa
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(category)}>
                          {category.status === 1 ? "Ẩn" : "Hiện"}
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

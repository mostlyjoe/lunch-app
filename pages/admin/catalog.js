// pages/admin/catalog.js
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getProfile } from "../../lib/db/profiles";
import { uploadMenuImage } from "../../lib/db/menuItems";
import {
  getAdminCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  setCatalogItemActive,
} from "../../lib/db/menuCatalog";

export default function AdminCatalogPage() {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editorItem, setEditorItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  function showToast(message, type = "info") {
    setToast({ msg: message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function validateField(name, value) {
    switch (name) {
      case "title":
        return cleanText(value).length >= 2
          ? ""
          : "Title is required (min 2 characters).";
      case "description":
        return cleanText(value).length > 0 ? "" : "Description is required.";
      case "default_price":
        return parseFloat(value) > 0 ? "" : "Default price must be greater than 0.";
      case "image_url":
        return value ? "" : "Image is required.";
      default:
        return "";
    }
  }

  function validateItem(item) {
    return {
      title: validateField("title", item.title),
      description: validateField("description", item.description),
      default_price: validateField("default_price", item.default_price),
      image_url: validateField("image_url", item.image_url),
    };
  }

  const errors = editorItem ? validateItem(editorItem) : {};
  const isValidForm =
    editorItem && Object.values(errors).every((err) => err === "");

  const refreshItems = useCallback(async () => {
    try {
      const res = await getAdminCatalogItems();
      if (!res.ok) throw new Error(res.error);
      setItems(res.data || []);
    } catch (err) {
      showToast("❌ Failed to load catalog items: " + err.message, "error");
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const profile = await getProfile(user.id);
        if (!profile?.is_admin) {
          showToast("❌ Access denied: admins only.", "error");
          return;
        }

        setCurrentUserId(user.id);
        setIsAdmin(true);
        await refreshItems();
      } catch (err) {
        showToast("❌ Failed to load page: " + err.message, "error");
      }
    }

    loadData();
  }, [refreshItems]);

  function resetEditor() {
    setEditorItem(null);
    setIsNew(false);
  }

  async function handleSave() {
    if (!editorItem || !isValidForm) {
      showToast("❌ Please fix validation errors before saving.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: editorItem.title,
        description: editorItem.description,
        default_price: parseFloat(editorItem.default_price).toFixed(2),
        image_url: editorItem.image_url,
        is_active: editorItem.is_active ?? true,
      };

      let res;
      if (isNew) {
        res = await createCatalogItem(payload, currentUserId);
      } else {
        res = await updateCatalogItem(editorItem.id, payload, currentUserId);
      }

      if (!res.ok) throw new Error(res.error);

      showToast(
        isNew ? "✅ Reusable catalog item created!" : "✅ Catalog item updated!",
        "success"
      );

      await refreshItems();
      resetEditor();
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(item) {
    try {
      const res = await setCatalogItemActive(item.id, !item.is_active, currentUserId);
      if (!res.ok) throw new Error(res.error);

      showToast(
        item.is_active ? "✅ Catalog item archived." : "✅ Catalog item reactivated.",
        "success"
      );

      await refreshItems();

      if (editorItem?.id === item.id) {
        setEditorItem({ ...editorItem, is_active: !item.is_active });
      }
    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
  }

  if (!isAdmin) return <p>❌ Access denied.</p>;

  return (
    <main className="admin-menu-page">
      <div className="card-container">
        <div className="editor-card">
          {!editorItem ? (
            <p className="placeholder">
              Select a reusable item to edit, or click Add New.
            </p>
          ) : (
            <>
              <h3>{isNew ? "Add Reusable Catalog Item" : "Edit Reusable Catalog Item"}</h3>

              <div className="form-group">
                <label>Title</label>
                <input
                  value={editorItem.title}
                  onChange={(e) =>
                    setEditorItem({ ...editorItem, title: e.target.value })
                  }
                  className={errors.title ? "invalid" : ""}
                />
                {errors.title && <p className="error-text">{errors.title}</p>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editorItem.description}
                  onChange={(e) =>
                    setEditorItem({ ...editorItem, description: e.target.value })
                  }
                  rows={3}
                  className={errors.description ? "invalid" : ""}
                />
                {errors.description && (
                  <p className="error-text">{errors.description}</p>
                )}
              </div>

              <div className="form-group">
                <label>Default Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editorItem.default_price}
                  onChange={(e) =>
                    setEditorItem({ ...editorItem, default_price: e.target.value })
                  }
                  className={errors.default_price ? "invalid" : ""}
                />
                {errors.default_price && (
                  <p className="error-text">{errors.default_price}</p>
                )}
              </div>

              <div className="form-group">
                <label>Status</label>
                <label className="status-toggle">
                  <input
                    type="checkbox"
                    checked={editorItem.is_active ?? true}
                    onChange={(e) =>
                      setEditorItem({
                        ...editorItem,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  <span>{editorItem.is_active ? "Active" : "Archived"}</span>
                </label>
              </div>

              <div className="form-group image-upload">
                <label>Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const publicUrl = await uploadMenuImage(file);
                      setEditorItem({ ...editorItem, image_url: publicUrl });
                      showToast("✅ Image uploaded!", "success");
                    } catch (err) {
                      showToast("❌ " + err.message, "error");
                    }
                  }}
                />
                {errors.image_url && !editorItem.image_url && (
                  <p className="error-text">{errors.image_url}</p>
                )}
                {editorItem.image_url && (
                  <div className="image-preview">
                    <Image
                      src={editorItem.image_url}
                      alt="Preview"
                      width={320}
                      height={320}
                      style={{ width: "100%", height: "auto", objectFit: "cover" }}
                      unoptimized
                    />
                  </div>
                )}
              </div>

              <div className="button-row">
                <button
                  className={`btn save ${!isValidForm || loading ? "disabled" : ""}`}
                  onClick={handleSave}
                  disabled={!isValidForm || loading}
                  type="button"
                >
                  {loading ? "⏳ Saving..." : "💾 Save"}
                </button>
                <button className="btn" onClick={resetEditor} type="button">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        <div className="table-card">
          <div className="header-row">
            <div>
              <h2>Reusable Catalog Items</h2>
              <p className="placeholder" style={{ marginTop: 6 }}>
                Create once, then reuse these when scheduling actual menu offerings.
              </p>
            </div>

            <button
              className={`btn add ${editorItem && !isNew ? "disabled" : ""}`}
              disabled={editorItem && !isNew}
              title={
                editorItem && !isNew
                  ? "Finish editing before adding a new item"
                  : "Add a new reusable item"
              }
              onClick={() => {
                if (editorItem && !isNew) return;

                setEditorItem({
                  title: "",
                  description: "",
                  default_price: "",
                  image_url: "",
                  is_active: true,
                });
                setIsNew(true);
              }}
              type="button"
            >
              ➕ Add New
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              <p>No reusable catalog items yet.</p>
            </div>
          ) : (
            <table className="menu-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Default Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const isEditing = editorItem && !isNew && editorItem.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`${index % 2 === 0 ? "row-grey" : "row-beige"} ${
                        isEditing ? "active-row" : ""
                      }`}
                    >
                      <td>
                        {item.image_url ? (
                          <div
                            style={{
                              position: "relative",
                              width: 72,
                              height: 72,
                              overflow: "hidden",
                              borderRadius: 8,
                            }}
                          >
                            <Image
                              src={item.image_url}
                              alt={item.title}
                              fill
                              className="adminMenuThumb"
                              style={{ objectFit: "cover" }}
                              unoptimized
                            />
                          </div>
                        ) : (
                          <span>No image</span>
                        )}
                      </td>
                      <td>{item.title}</td>
                      <td className="desc-cell">{item.description}</td>
                      <td>${parseFloat(item.default_price).toFixed(2)}</td>
                      <td>
                        <span
                          className={item.is_active ? "status-active" : "status-archived"}
                        >
                          {item.is_active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td>
                        {!isEditing && (
                          <>
                            <button
                              className="btn edit"
                              onClick={() => {
                                setEditorItem({
                                  ...item,
                                  default_price: item.default_price,
                                });
                                setIsNew(false);
                              }}
                              type="button"
                            >
                              ✏️ Edit
                            </button>{" "}
                            <button
                              className="btn"
                              onClick={() => handleToggleStatus(item)}
                              type="button"
                            >
                              {item.is_active ? "Archive" : "Reactivate"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </main>
  );
}
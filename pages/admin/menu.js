// pages/admin/menu.js
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getProfile } from "../../lib/db/profiles";
import { getActiveCatalogItems } from "../../lib/db/menuCatalog";
import {
  createOfferingFromCatalog,
  getAdminOfferings,
  setOfferingActive,
  updateOffering,
} from "../../lib/db/menuOfferings";
import {
  formatServeDate,
  formatTorontoDateInput,
  formatTorontoDateTime,
  formatTorontoTimeInput,
} from "../../lib/dateTime";

export default function AdminMenuPage() {
  const [catalogItems, setCatalogItems] = useState([]);
  const [offerings, setOfferings] = useState([]);
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

  function getCatalogTitle(id) {
    const match = catalogItems.find((it) => it.id === id);
    return match?.title || "Unknown item";
  }

  function validateField(name, value, item) {
    switch (name) {
      case "catalog_item_id":
        return value ? "" : "Please select a reusable catalog item.";

      case "serve_date":
        return value ? "" : "Serve date is required.";

      case "deadline_date":
        if (!value) return "Deadline date is required.";

        if (item?.serve_date) {
          const serveDate = new Date(`${item.serve_date}T23:59:59`);
          const deadlineDate = new Date(`${value}T23:59:59`);

          if (Number.isNaN(serveDate.getTime()) || Number.isNaN(deadlineDate.getTime())) {
            return "Deadline date is invalid.";
          }

          if (deadlineDate > serveDate) {
            return "Deadline date must be on or before the serve date.";
          }
        }
        return "";

      case "deadline_time":
        return value ? "" : "Deadline time is required.";

      case "override_price":
        if (value === "" || value === null || value === undefined) return "";
        return parseFloat(value) >= 0 ? "" : "Override price must be 0 or higher.";

      default:
        return "";
    }
  }

  function validateItem(item) {
    return {
      catalog_item_id: validateField("catalog_item_id", item.catalog_item_id, item),
      serve_date: validateField("serve_date", item.serve_date, item),
      deadline_date: validateField("deadline_date", item.deadline_date, item),
      deadline_time: validateField("deadline_time", item.deadline_time, item),
      override_price: validateField("override_price", item.override_price, item),
    };
  }

  const errors = editorItem ? validateItem(editorItem) : {};
  const isValidForm = editorItem && Object.values(errors).every((err) => err === "");

  const refreshPageData = useCallback(async () => {
    try {
      const [catalogRes, offeringsRes] = await Promise.all([
        getActiveCatalogItems(),
        getAdminOfferings(),
      ]);

      if (!catalogRes.ok) throw new Error(catalogRes.error);
      if (!offeringsRes.ok) throw new Error(offeringsRes.error);

      setCatalogItems(catalogRes.data || []);
      setOfferings(offeringsRes.data || []);
    } catch (err) {
      showToast("❌ Failed to load page data: " + err.message, "error");
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
        await refreshPageData();
      } catch (err) {
        showToast("❌ Failed to load page: " + err.message, "error");
      }
    }

    loadData();
  }, [refreshPageData]);

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
        catalog_item_id: editorItem.catalog_item_id,
        serve_date: editorItem.serve_date,
        deadline_date: editorItem.deadline_date,
        deadline_time: editorItem.deadline_time,
        override_price: editorItem.override_price,
        is_active: editorItem.is_active ?? true,
      };

      let res;
      if (isNew) {
        res = await createOfferingFromCatalog(payload, currentUserId);
      } else {
        res = await updateOffering(editorItem.id, payload, currentUserId);
      }

      if (!res.ok) throw new Error(res.error);

      showToast(
        isNew ? "✅ Menu offering created!" : "✅ Menu offering updated!",
        "success"
      );

      await refreshPageData();
      resetEditor();
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(item) {
    try {
      const res = await setOfferingActive(item.id, !item.is_active, currentUserId);
      if (!res.ok) throw new Error(res.error);

      showToast(
        item.is_active ? "✅ Offering archived." : "✅ Offering reactivated.",
        "success"
      );

      await refreshPageData();

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
              Select an offering to edit, or click Add New to schedule a reusable item.
            </p>
          ) : (
            <>
              <h3>{isNew ? "Schedule Menu Offering" : "Edit Menu Offering"}</h3>

              <div className="form-group">
                <label>Reusable Item</label>
                <select
                  value={editorItem.catalog_item_id}
                  onChange={(e) =>
                    setEditorItem({
                      ...editorItem,
                      catalog_item_id: e.target.value,
                    })
                  }
                  className={errors.catalog_item_id ? "invalid" : ""}
                >
                  <option value="">Select reusable item</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} (${parseFloat(item.default_price).toFixed(2)})
                    </option>
                  ))}
                </select>
                {errors.catalog_item_id && (
                  <p className="error-text">{errors.catalog_item_id}</p>
                )}
              </div>

              <div className="form-group">
                <label>Serve Date</label>
                <input
                  type="date"
                  value={editorItem.serve_date}
                  onChange={(e) =>
                    setEditorItem({
                      ...editorItem,
                      serve_date: e.target.value,
                    })
                  }
                  className={errors.serve_date ? "invalid" : ""}
                />
                {errors.serve_date && (
                  <p className="error-text">{errors.serve_date}</p>
                )}
              </div>

              <div className="form-group">
                <label>Deadline Date</label>
                <input
                  type="date"
                  value={editorItem.deadline_date}
                  onChange={(e) =>
                    setEditorItem({
                      ...editorItem,
                      deadline_date: e.target.value,
                    })
                  }
                  className={errors.deadline_date ? "invalid" : ""}
                />
                {errors.deadline_date && (
                  <p className="error-text">{errors.deadline_date}</p>
                )}
              </div>

              <div className="form-group">
                <label>Deadline Time</label>
                <input
                  type="time"
                  value={editorItem.deadline_time}
                  onChange={(e) =>
                    setEditorItem({
                      ...editorItem,
                      deadline_time: e.target.value,
                    })
                  }
                  className={errors.deadline_time ? "invalid" : ""}
                />
                {errors.deadline_time && (
                  <p className="error-text">{errors.deadline_time}</p>
                )}
              </div>

              <div className="form-group">
                <label>Override Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Leave blank to use catalog default"
                  value={editorItem.override_price}
                  onChange={(e) =>
                    setEditorItem({
                      ...editorItem,
                      override_price: e.target.value,
                    })
                  }
                  className={errors.override_price ? "invalid" : ""}
                />
                {errors.override_price && (
                  <p className="error-text">{errors.override_price}</p>
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

              {!isNew && (
                <div className="form-group">
                  <label>Snapshot Preview</label>
                  <div className="image-preview" style={{ padding: "0.75rem" }}>
                    <div>
                      <strong>{editorItem.title}</strong>
                      <p style={{ marginTop: 8 }}>
                        {editorItem.description || "No description"}
                      </p>
                      <p style={{ marginTop: 8 }}>
                        Current offering price: $
                        {parseFloat(editorItem.unit_price || 0).toFixed(2)}
                      </p>
                      <p style={{ marginTop: 8 }}>
                        Current deadline: {formatTorontoDateTime(editorItem.order_deadline)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="button-row">
                <button
                  className={`btn save ${!isValidForm || loading ? "disabled" : ""}`}
                  onClick={handleSave}
                  disabled={!isValidForm || loading}
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
              <h2>Menu Offerings</h2>
              <p className="placeholder" style={{ marginTop: 6 }}>
                These are the actual dated offerings users will order from.
              </p>
            </div>

            <button
              className={`btn add ${editorItem && !isNew ? "disabled" : ""}`}
              disabled={editorItem && !isNew}
              title={
                editorItem && !isNew
                  ? "Finish editing before adding a new offering"
                  : "Schedule a new offering"
              }
              onClick={() => {
                if (editorItem && !isNew) return;

                setEditorItem({
                  catalog_item_id: "",
                  serve_date: "",
                  deadline_date: "",
                  deadline_time: "",
                  override_price: "",
                  is_active: true,
                });
                setIsNew(true);
              }}
              type="button"
            >
              ➕ Add New
            </button>
          </div>

          {offerings.length === 0 ? (
            <div className="empty-state">
              <p>No offerings yet.</p>
            </div>
          ) : (
            <table className="menu-table">
              <thead>
                <tr>
                  <th>Snapshot Title</th>
                  <th>Reusable Source</th>
                  <th>Price</th>
                  <th>Serve Date</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offerings.map((item, index) => {
                  const isEditing = editorItem && !isNew && editorItem.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`${index % 2 === 0 ? "row-grey" : "row-beige"} ${
                        isEditing ? "active-row" : ""
                      }`}
                    >
                      <td>{item.title}</td>
                      <td>{getCatalogTitle(item.catalog_item_id)}</td>
                      <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                      <td>{formatServeDate(item.serve_date)}</td>
                      <td>{formatTorontoDateTime(item.order_deadline)}</td>
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
                                  deadline_date: formatTorontoDateInput(item.order_deadline),
                                  deadline_time: formatTorontoTimeInput(item.order_deadline),
                                  override_price: "",
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
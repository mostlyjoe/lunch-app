// pages/admin/menu.js
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
    getMenuItems,
    createMenuItem,
    updateMenuItem,
    uploadMenuImage,
} from "../../lib/db/menuItems";
import { getProfile } from "../../lib/db/profiles";

export default function AdminMenuPage() {
    const [items, setItems] = useState([]);
    const [toast, setToast] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editorItem, setEditorItem] = useState(null);
    const [isNew, setIsNew] = useState(false);

    // ✅ Validation helpers
    function validateField(name, value, item = null) {
        switch (name) {
            case "title":
                return value?.trim().length >= 2 ? "" : "Title is required (min 2 characters).";
            case "description":
                return value?.trim().length > 0 ? "" : "Description is required.";
            case "price":
                return parseFloat(value) > 0 ? "" : "Price must be greater than 0.";
            case "serve_date":
                return value ? "" : "Serve date is required.";
            case "order_deadline":
                if (!value) return "Order deadline is required.";
                if (item?.serve_date && new Date(value) >= new Date(item.serve_date)) {
                    return "Deadline must be before the serve date.";
                }
                return "";
            case "image_url":
                return value ? "" : "Image is required.";
            default:
                return "";
        }
    }

    function validateItem(item) {
        return {
            title: validateField("title", item.title, item),
            description: validateField("description", item.description, item),
            price: validateField("price", item.price, item),
            serve_date: validateField("serve_date", item.serve_date, item),
            order_deadline: validateField("order_deadline", item.order_deadline, item),
            image_url: validateField("image_url", item.image_url, item),
        };
    }

    const errors = editorItem ? validateItem(editorItem) : {};
    const isValidForm = editorItem && Object.values(errors).every((err) => err === "");

    function showToast(message, type = "info") {
        setToast({ msg: message, type });
        setTimeout(() => setToast(null), 4000);
    }

    // ✅ Memoized refreshMenu (fixes ESLint dependency warning)
    const refreshMenu = useCallback(async () => {
        try {
            const menu = await getMenuItems();
            const sortedMenu = (menu || []).sort(
                (a, b) => new Date(b.serve_date) - new Date(a.serve_date)
            );
            setItems(sortedMenu);
        } catch (err) {
            showToast("❌ Failed to refresh menu: " + err.message, "error");
        }
    }, []);

    useEffect(() => {
        async function loadData() {
            try {
                const { data } = await supabase.auth.getUser();
                if (!data?.user) {
                    window.location.href = "/login";
                    return;
                }
                const profile = await getProfile(data.user.id);
                if (!profile?.is_admin) {
                    showToast("❌ Access denied: admins only.", "error");
                    return;
                }
                setIsAdmin(true);
                await refreshMenu();
            } catch (err) {
                showToast("❌ Failed to load menu: " + err.message, "error");
            }
        }
        loadData();
    }, [refreshMenu]);

    async function handleSave() {
        if (!editorItem || !isValidForm) {
            showToast("❌ Please fix validation errors before saving.", "error");
            return;
        }

        setLoading(true);
        try {
            const formattedItem = {
                ...editorItem,
                price: parseFloat(editorItem.price).toFixed(2),
            };

            // 🕒 Convert datetime-local string -> ISO before saving
            if (formattedItem.order_deadline) {
                formattedItem.order_deadline = new Date(formattedItem.order_deadline).toISOString();
            }

            if (isNew) {
                await createMenuItem(formattedItem);
                showToast("✅ Menu item created!", "success");
            } else {
                await updateMenuItem(editorItem.id, formattedItem);
                showToast("✅ Menu item updated!", "success");
            }

            await refreshMenu();
            resetEditor();
        } catch (err) {
            showToast("❌ " + err.message, "error");
        } finally {
            setLoading(false);
        }
    }

    // ✅ Helper: Convert ISO -> local-friendly datetime-local format
    function formatForDateTimeLocal(timestamp) {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        const offset = date.getTimezoneOffset();
        const local = new Date(date.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16);
    }

    // ✅ Display helpers
    function formatServeDate(ymd) {
        if (!ymd) return "Not set";
        const [y, m, d] = ymd.split("-").map(Number);
        const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0);
        return dt.toLocaleDateString("en-CA", {
            timeZone: "America/Toronto",
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function formatDeadline(ts) {
        if (!ts) return "Not set";
        const dt = new Date(ts);
        return dt.toLocaleString("en-CA", {
            timeZone: "America/Toronto",
            dateStyle: "medium",
            timeStyle: "short",
        });
    }

    function resetEditor() {
        setEditorItem(null);
        setIsNew(false);
    }

    if (!isAdmin) return <p>❌ Access denied.</p>;

    return (
        <main className="admin-container">
            <div className="card-container">
                {/* ✅ Editor Card */}
                <div className="editor-card">
                    {!editorItem ? (
                        <p className="placeholder">Select an item to edit or click Add New.</p>
                    ) : (
                        <>
                            <h3>{isNew ? "Add New Menu Item" : "Edit Menu Item"}</h3>

                            {/* Title */}
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

                            {/* Description */}
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

                            {/* Price */}
                            <div className="form-group">
                                <label>Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editorItem.price}
                                    onChange={(e) =>
                                        setEditorItem({ ...editorItem, price: e.target.value })
                                    }
                                    className={errors.price ? "invalid" : ""}
                                />
                                {errors.price && <p className="error-text">{errors.price}</p>}
                            </div>

                            {/* Serve Date */}
                            <div className="form-group">
                                <label>Serve Date</label>
                                <input
                                    type="date"
                                    value={editorItem.serve_date}
                                    onChange={(e) =>
                                        setEditorItem({ ...editorItem, serve_date: e.target.value })
                                    }
                                    className={errors.serve_date ? "invalid" : ""}
                                />
                                {errors.serve_date && (
                                    <p className="error-text">{errors.serve_date}</p>
                                )}
                            </div>

                            {/* ✅ Order Deadline (Date + Time Picker - Local Time Fixed) */}
                            <div className="form-group">
                                <label>Order Deadline (Date + Time)</label>
                                <input
                                    type="datetime-local"
                                    value={
                                        editorItem.order_deadline
                                            ? formatForDateTimeLocal(editorItem.order_deadline)
                                            : ""
                                    }
                                    onChange={(e) =>
                                        setEditorItem({
                                            ...editorItem,
                                            order_deadline: e.target.value,
                                        })
                                    }
                                    className={errors.order_deadline ? "invalid" : ""}
                                />
                                {errors.order_deadline && (
                                    <p className="error-text">{errors.order_deadline}</p>
                                )}
                            </div>

                            {/* ✅ Active / Archived Toggle */}
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

                            {/* Image upload */}
                            <div className="form-group image-upload">
                                <label>Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
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
                                        <img src={editorItem.image_url} alt="Preview" />
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="button-row">
                                <button
                                    className={`btn save ${!isValidForm || loading ? "disabled" : ""}`}
                                    onClick={handleSave}
                                    disabled={!isValidForm || loading}
                                >
                                    {loading ? "⏳ Saving..." : "💾 Save"}
                                </button>
                                <button className="btn" onClick={resetEditor}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* ✅ Items Table */}
                <div className="table-card">
                    <div className="header-row">
                        <h2>Menu Items</h2>
                        <button
                            className={`btn add ${editorItem && !isNew ? "disabled" : ""}`}
                            disabled={editorItem && !isNew}
                            title={
                                editorItem && !isNew
                                    ? "Finish editing before adding a new item"
                                    : "Add a new menu item"
                            }
                            onClick={() => {
                                if (editorItem && !isNew) return;
                                setEditorItem({
                                    title: "",
                                    description: "",
                                    price: "",
                                    image_url: "",
                                    serve_date: "",
                                    order_deadline: "",
                                    is_active: true,
                                });
                                setIsNew(true);
                            }}
                        >
                            ➕ Add New
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className="empty-state">
                            <p>No menu items yet.</p>
                        </div>
                    ) : (
                        <table className="menu-table">
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Title</th>
                                    <th>Description</th>
                                    <th>Price</th>
                                    <th>Serve Date</th>
                                    <th>Order Deadline</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => {
                                    const isActive = editorItem && !isNew && editorItem.id === item.id;
                                    return (
                                        <tr
                                            key={item.id}
                                            className={`${index % 2 === 0 ? "row-grey" : "row-beige"} ${isActive ? "active-row" : ""
                                                }`}
                                        >
                                            <td>
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.title}
                                                        style={{
                                                            width: "60px",
                                                            height: "60px",
                                                            objectFit: "cover",
                                                            borderRadius: "5px",
                                                        }}
                                                    />
                                                ) : (
                                                    <span>No image</span>
                                                )}
                                            </td>
                                            <td>{item.title}</td>
                                            <td className="desc-cell">{item.description}</td>
                                            <td>${parseFloat(item.price).toFixed(2)}</td>
                                            <td>{formatServeDate(item.serve_date)}</td>
                                            <td>{formatDeadline(item.order_deadline)}</td>
                                            <td>
                                                <span
                                                    className={
                                                        item.is_active ? "status-active" : "status-archived"
                                                    }
                                                >
                                                    {item.is_active ? "Active" : "Archived"}
                                                </span>
                                            </td>
                                            <td>
                                                {!isActive && (
                                                    <button
                                                        className="btn edit"
                                                        onClick={() => {
                                                            setEditorItem(item);
                                                            setIsNew(false);
                                                        }}
                                                    >
                                                        ✏️ Edit
                                                    </button>
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

            {/* ✅ CSS */}
            <style jsx>{`
                .admin-container {
                    padding: 2rem;
                    background: #f9fafb;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                }
                .card-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    max-width: 1100px;
                }
                .editor-card {
                    background: #f8fafc;
                    padding: 2rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
                    width: 100%;
                    max-width: 500px;
                    text-align: left;
                }
                .editor-card h3 {
                    margin-bottom: 1rem;
                    text-align: center;
                }
                .placeholder {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                label {
                    font-weight: 600;
                    margin-bottom: 0.3rem;
                    display: block;
                }
                input,
                textarea {
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    font-size: 0.95rem;
                }
                textarea {
                    resize: vertical;
                    min-height: 70px;
                }
                input.invalid,
                textarea.invalid {
                    border-color: red;
                }
                .error-text {
                    font-size: 0.8rem;
                    color: red;
                    margin-top: 0.25rem;
                }
                .image-upload {
                    margin-top: 1rem;
                }
                .image-preview {
                    margin-top: 0.5rem;
                    text-align: center;
                }
                .image-preview img {
                    width: 120px;
                    height: auto;
                    border-radius: 5px;
                    border: 1px solid #ddd;
                }
                .btn {
                    margin: 0.25rem;
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background 0.2s ease;
                }
                .btn.add {
                    background: #28a745;
                    color: white;
                }
                .btn.add.disabled {
                    background: #b8d9b9;
                    color: #fff;
                    cursor: not-allowed;
                    opacity: 0.7;
                }
                .btn.save {
                    background: #0070f3;
                    color: white;
                }
                .btn.save.disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                .btn.edit {
                    background: #ffc107;
                    color: black;
                }
                .toast {
                    position: fixed;
                    top: 1rem;
                    right: 1rem;
                    padding: 1rem;
                    border-radius: 5px;
                    font-weight: bold;
                    z-index: 1000;
                }
                .toast.success {
                    background: #e6ffed;
                    color: #0c6c2c;
                }
                .toast.error {
                    background: #ffe6e6;
                    color: #a10000;
                }
                .button-row {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                    justify-content: center;
                }
                .table-card {
                    width: 100%;
                    background: #fff;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                }
                .header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                .menu-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .menu-table th,
                .menu-table td {
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    text-align: left;
                    vertical-align: top;
                }
                .menu-table th {
                    background: #f0f0f0;
                    font-weight: 600;
                }
                .row-grey {
                    background: #f9f9f9;
                }
                .row-beige {
                    background: #fdfaf4;
                }
                .active-row {
                    background-color: #e6f2ff !important;
                    border-left: 4px solid #0070f3;
                }
                .desc-cell {
                    max-width: 250px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    background: #f8fafc;
                    border: 1px dashed #ccc;
                    border-radius: 8px;
                }
                .status-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .status-active {
                    color: #0c6c2c;
                    font-weight: 600;
                }
                .status-archived {
                    color: #777;
                    font-style: italic;
                }
                @media (max-width: 768px) {
                    .admin-container {
                        padding: 1rem;
                    }
                    .editor-card {
                        padding: 1.5rem;
                        max-width: 100%;
                    }
                    .table-card {
                        padding: 1rem;
                    }
                    .menu-table th,
                    .menu-table td {
                        padding: 0.5rem;
                        font-size: 0.9rem;
                    }
                    .button-row {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .btn {
                        width: 100%;
                        margin: 0.3rem 0;
                    }
                }
            `}</style>
        </main>
    );
}

// pages/orders/index.js
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  getUserOrders,
  deleteOrder,
  updateOrder,
  calculateOrderTotals,
} from "../../lib/db/orders";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [confirmSheet, setConfirmSheet] = useState({ open: false, orderId: null });
  const [expandedMonths, setExpandedMonths] = useState({});

  useEffect(() => setHasMounted(true), []);

  // --- helpers ---
  const parseYMD = useCallback((dateStr) => {
    if (!dateStr) return null;
    const clean = dateStr.includes("T") ? dateStr.slice(0, 10) : dateStr;
    const [y, m, d] = clean.split("-").map((n) => parseInt(n, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, []);

  const formatDate = useCallback(
    (dateStr) => {
      const dt = parseYMD(dateStr);
      if (!dt) return "Unscheduled";
      return dt.toLocaleDateString("en-CA", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
    [parseYMD]
  );

  const monthKey = useCallback(
    (dateStr) => {
      const dt = parseYMD(dateStr);
      if (!dt) return "unscheduled";
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    },
    [parseYMD]
  );

  const monthLabel = (key) => {
    if (key === "unscheduled") return "Unscheduled";
    const [y, m] = key.split("-").map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, 1);
    return dt.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  };

  const clampQty = (v) => Math.max(1, Math.min(10, parseInt(v) || 1));

  // --- effects ---
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to view orders.");
        setLoading(false);
        return;
      }
      try {
        let data = await getUserOrders(user.id);
        data = (data || []).filter((o) => o.menu_items);
        setOrders(data);
      } catch {
        toast.error("Failed to load orders.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // restore expanded month state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ordersPastMonthsOpen");
      if (raw) setExpandedMonths(JSON.parse(raw) || {});
    } catch {}
  }, []);
  // persist expanded month state
  useEffect(() => {
    try {
      localStorage.setItem("ordersPastMonthsOpen", JSON.stringify(expandedMonths));
    } catch {}
  }, [expandedMonths]);

  // --- state mutators ---
  const handleQuantityInput = useCallback((orderId, value) => {
    setEditing((prev) => ({ ...prev, [orderId]: clampQty(value) }));
  }, []);

  const adjustQuantity = useCallback(
    (orderId, delta) => {
      setEditing((prev) => {
        const current =
          prev[orderId] ?? orders.find((o) => o.id === orderId)?.quantity ?? 1;
        return { ...prev, [orderId]: clampQty(current + delta) };
      });
    },
    [orders]
  );

  const handleSave = useCallback(
    async (order) => {
      const newQty = editing[order.id] ?? order.quantity;
      setSavingId(order.id);
      try {
        await updateOrder(order.id, { quantity: newQty, status: "confirmed" });
        setOrders((os) =>
          os.map((o) =>
            o.id === order.id ? { ...o, quantity: newQty, status: "confirmed" } : o
          )
        );
        toast.success(`✅ Order confirmed (${newQty}x ${order.menu_items.title})`);
        setEditing((prev) => {
          const copy = { ...prev };
          delete copy[order.id];
          return copy;
        });
      } catch {
        toast.error("Error updating order ❌");
      } finally {
        setSavingId(null);
      }
    },
    [editing]
  );

  const openDeleteSheet = (orderId) => setConfirmSheet({ open: true, orderId });
  const closeDeleteSheet = () => setConfirmSheet({ open: false, orderId: null });

  const confirmDelete = useCallback(async () => {
    const orderId = confirmSheet.orderId;
    if (!orderId) return;
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      toast.success("🗑️ Order deleted");
    } catch {
      toast.error("Error deleting order ❌");
    } finally {
      setConfirmSheet({ open: false, orderId: null });
    }
  }, [confirmSheet]);

  // --- computed ---
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const item = o.menu_items;
        if (!item) return false;
        const sd = parseYMD(item.serve_date);
        return item.is_active && sd && sd >= today;
      })
      .sort(
        (a, b) =>
          (parseYMD(a.menu_items.serve_date) || 0) -
          (parseYMD(b.menu_items.serve_date) || 0)
      );
  }, [orders, parseYMD, today]);

  const pastOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const item = o.menu_items;
        if (!item) return false;
        const sd = parseYMD(item.serve_date);
        return !item.is_active || !sd || sd < today;
      })
      .sort(
        (a, b) =>
          (parseYMD(b.menu_items.serve_date) || 0) -
          (parseYMD(a.menu_items.serve_date) || 0)
      );
  }, [orders, parseYMD, today]);

  const groupByServeDate = useCallback(
    (list) => {
      const map = {};
      list.forEach((o) => {
        const key = o.menu_items.serve_date || "Unscheduled";
        if (!map[key]) map[key] = [];
        map[key].push(o);
      });
      return Object.entries(map).sort(
        ([a], [b]) => (parseYMD(a) || 0) - (parseYMD(b) || 0)
      );
    },
    [parseYMD]
  );

  const activeGroups = useMemo(
    () => groupByServeDate(activeOrders),
    [activeOrders, groupByServeDate]
  );

  const pastByMonth = useMemo(() => {
    const buckets = {};
    for (const o of pastOrders) {
      const key = monthKey(o.menu_items.serve_date);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(o);
    }
    Object.keys(buckets).forEach((k) => {
      buckets[k].sort(
        (a, b) =>
          (parseYMD(b.menu_items.serve_date) || 0) -
          (parseYMD(a.menu_items.serve_date) || 0)
      );
    });
    return buckets;
  }, [pastOrders, monthKey, parseYMD]);

  const monthSummaries = useMemo(() => {
    const summaries = {};
    for (const [k, list] of Object.entries(pastByMonth)) {
      let minD = null;
      let maxD = null;
      list.forEach((o) => {
        const d = parseYMD(o.menu_items.serve_date);
        if (!d) return;
        if (!minD || d < minD) minD = d;
        if (!maxD || d > maxD) maxD = d;
      });
      const fmt = (d) =>
        d ? d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : null;
      summaries[k] = {
        count: list.length,
        range:
          minD && maxD
            ? `${fmt(minD)} – ${fmt(maxD)}`
            : list.some((o) => !o.menu_items.serve_date)
            ? "Unscheduled"
            : null,
      };
    }
    return summaries;
  }, [pastByMonth, parseYMD]);

  const sortedMonthKeys = useMemo(() => {
    const keys = Object.keys(pastByMonth);
    return keys.sort((a, b) => {
      if (a === "unscheduled") return 1;
      if (b === "unscheduled") return -1;
      return b.localeCompare(a);
    });
  }, [pastByMonth]);

  const hasOrders = orders.length > 0;
  const hasActive = activeOrders.length > 0;
  const hasPast = pastOrders.length > 0;

  const toggleMonth = (key) =>
    setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }));

  // --- early return for SSR hydration clarity ---
  if (!hasMounted) {
    return (
      <main className="orders-page">
        <h1 className="page-title">MY ORDERS</h1>
        <p className="no-orders-msg">Loading…</p>
      </main>
    );
  }

  // --- render ---
  if (loading) return <p className="text-center mt-8">Loading orders...</p>;

  return (
    <main className="orders-page">
      <h1 className="page-title">MY ORDERS</h1>
      {!hasOrders && <p className="no-orders-msg">You have no orders yet.</p>}

      {/* Active Orders */}
      {hasActive && (
        <section className="orders-group">
          <header className="orders-group-header">
            <h2>Active Orders</h2>
          </header>

          {activeGroups.map(([serveDate, dayOrders]) => (
            <div key={serveDate} className="orders-list">
              <h3 className="serve-date-subhead">{formatDate(serveDate)}</h3>
              {dayOrders.map((order) => {
                const item = order.menu_items;
                const editedQty = editing[order.id] ?? order.quantity;
                const totals = calculateOrderTotals({
                  quantity: editedQty,
                  unit_price: order.unit_price,
                });
                const deadlinePassed =
                  item.order_deadline && new Date(item.order_deadline) < new Date();

                return (
                  <article key={order.id} className="order-card">
                    <div className="order-img-wrapper">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="order-img"
                        />
                      ) : (
                        <div className="media-fallback">No image</div>
                      )}
                    </div>

                    <div className="order-info">
                      <div className="order-header">
                        <h3>{item.title}</h3>
                        <span className="status-tag confirmed">Confirmed</span>
                      </div>
                      <p className="desc">{item.description}</p>
                      <p className="serve">
                        <strong>Served:</strong> {formatDate(item.serve_date)}
                      </p>

                      <div className="price-breakdown">
                        <div className="line">
                          <span>Unit Price</span>
                          <span>${order.unit_price.toFixed(2)}</span>
                        </div>
                        <div className="line">
                          <span>Subtotal</span>
                          <span>${totals.subtotal}</span>
                        </div>
                        <div className="line">
                          <span>HST (13%)</span>
                          <span>${totals.tax}</span>
                        </div>
                        <div className="line total">
                          <span>Total</span>
                          <span>${totals.total}</span>
                        </div>
                      </div>

                      {deadlinePassed ? (
                        <p className="deadline-msg">
                          ❌ Order deadline passed — changes disabled
                        </p>
                      ) : (
                        <>
                          <div className="qty-controls">
                            <button onClick={() => adjustQuantity(order.id, -1)}>
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={editedQty}
                              onChange={(e) =>
                                handleQuantityInput(order.id, e.target.value)
                              }
                            />
                            <button onClick={() => adjustQuantity(order.id, 1)}>
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => handleSave(order)}
                            disabled={savingId === order.id}
                            className="btn-save"
                          >
                            {savingId === order.id ? "Saving..." : "Save Changes"}
                          </button>

                          <button
                            onClick={() => openDeleteSheet(order.id)}
                            className="btn-delete"
                          >
                            Delete Order
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </section>
      )}

      {/* Past Orders */}
      {hasPast && (
        <section className="orders-group">
          <header className="orders-group-header">
            <h2>Past Orders</h2>
          </header>

          <div className="month-group-list">
            {sortedMonthKeys.map((key) => {
              const monthOrders = pastByMonth[key] || [];
              const summary =
                monthSummaries[key] || { count: monthOrders.length, range: null };
              const open = !!expandedMonths[key];
              const panelId = `month-panel-${key}`;

              return (
                <div key={key} className="month-group">
                  <button
                    className="month-toggle"
                    onClick={() => toggleMonth(key)}
                    aria-expanded={open}
                    aria-controls={panelId}
                  >
                    <span className="month-title">
                      {monthLabel(key)}{" "}
                      <span className="month-count">({summary.count} items)</span>
                    </span>
                    <span className="month-range">
                      {summary.range ? summary.range : ""}
                    </span>
                    <span className={`chev ${open ? "open" : ""}`} aria-hidden>
                      ▾
                    </span>
                  </button>

                  <div
                    id={panelId}
                    className={`month-panel ${open ? "open" : ""}`}
                    role="region"
                  >
                    <div className="orders-list">
                      {monthOrders.map((order) => {
                        const item = order.menu_items;
                        const totals = calculateOrderTotals({
                          quantity: order.quantity,
                          unit_price: order.unit_price,
                        });

                        return (
                          <article
                            key={order.id}
                            className={`order-card ${!item.is_active ? "archived" : ""}`}
                          >
                            <div className="order-img-wrapper">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.title}
                                  className="order-img"
                                />
                              ) : (
                                <div className="media-fallback">No image</div>
                              )}
                            </div>

                            <div className="order-info">
                              <div className="order-header">
                                <h3>{item.title}</h3>
                                {!item.is_active && (
                                  <span className="archived-badge">Archived</span>
                                )}
                              </div>

                              <p className="serve">
                                <strong>Served:</strong> {formatDate(item.serve_date)}
                              </p>
                              <p className="desc">{item.description}</p>

                              <div className="price-breakdown">
                                <div className="line">
                                  <span>Unit Price</span>
                                  <span>${order.unit_price.toFixed(2)}</span>
                                </div>
                                <div className="line">
                                  <span>Subtotal</span>
                                  <span>${totals.subtotal}</span>
                                </div>
                                <div className="line">
                                  <span>HST (13%)</span>
                                  <span>${totals.tax}</span>
                                </div>
                                <div className="line total">
                                  <span>Total</span>
                                  <span>${totals.total}</span>
                                </div>
                              </div>

                              <p className="deadline-msg">
                                {(!item.is_active &&
                                  "⚠️ Archived — changes disabled.") ||
                                  "⛔ Read-only"}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Payment options notice */}
      <div className="payment-options">
        💳 Payment options include <strong>Cash</strong>, <strong>Debit</strong>, and{" "}
        <strong>E-Transfer</strong> day of delivery.
      </div>

      {/* confirm delete sheet */}
      {confirmSheet.open && (
        <div className="sheet-overlay" onClick={closeDeleteSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-title">⚠️ Delete this order?</p>
            <p className="sheet-text">This action cannot be undone.</p>
            <div className="sheet-actions">
              <button onClick={closeDeleteSheet} className="btn-cancel">
                Cancel
              </button>
              <button onClick={confirmDelete} className="btn-confirm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}</main>
  );
}

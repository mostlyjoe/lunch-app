// pages/orders/index.js
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { supabase } from "../../lib/supabaseClient";
import {
  formatServeDate,
  formatTorontoDateTime,
  isPastDeadline,
} from "../../lib/dateTime";

const HST_RATE = 0.13;
const MONTHS_OPEN_KEY = "ordersPastMonthsOpen";

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function clampQuantity(value) {
  const parsed = Math.floor(Number(value || 1));
  return Math.max(1, Math.min(10, parsed));
}

function monthKeyFromDate(dateStr) {
  if (!dateStr) return "unknown";
  const [y, m] = String(dateStr).split("-");
  if (!y || !m) return "unknown";
  return `${y}-${m}`;
}

function monthLabelFromKey(key) {
  if (!key || key === "unknown") return "Past Orders";

  const [y, m] = key.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, 1, 12, 0, 0);

  return dt.toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    month: "long",
    year: "numeric",
  });
}

function safeDateOnlyToLocal(dateStr) {
  if (!dateStr) return null;

  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d, 12, 0, 0);
}

function getServeTimestamp(order) {
  if (!order?.serve_date) return 0;
  const dt = safeDateOnlyToLocal(order.serve_date);
  return dt ? dt.getTime() : 0;
}

function getDeadlineTimestamp(order) {
  if (!order?.order_deadline) return 0;
  return new Date(order.order_deadline).getTime() || 0;
}

function getDeadlineValue(order) {
  return order?.order_deadline || null;
}

function getDisplayTitle(order) {
  return order?.title || "Menu Item";
}

function getDisplayDescription(order) {
  return order?.description || "";
}

function getDisplayImage(order) {
  return order?.image_url || "";
}

function getDisplayUnitPrice(order) {
  return Number(order?.unit_price || 0);
}

function isCancelled(order) {
  return String(order?.status || "").toLowerCase() === "cancelled";
}

function isOrderLocked(order) {
  return !!order?.is_archived || isCancelled(order) || isPastDeadline(getDeadlineValue(order));
}

function getOrderStatusLabel(order) {
  if (isCancelled(order)) return "Cancelled";
  if (order?.is_archived) return "Archived";
  if (isPastDeadline(getDeadlineValue(order))) return "Closed";
  return order?.status || "active";
}

function normalizeOrderRow(row) {
  const legacy = row.menu_items || null;
  const modern = row.menu_offerings || null;

  const title = modern?.title || legacy?.title || "Menu Item";
  const description = modern?.description || legacy?.description || "";
  const image_url = modern?.image_url || legacy?.image_url || "";
  const serve_date = modern?.serve_date || legacy?.serve_date || null;
  const order_deadline =
    modern?.order_deadline || legacy?.order_deadline || null;

  const modernUnitPrice =
    modern?.unit_price !== undefined && modern?.unit_price !== null
      ? Number(modern.unit_price)
      : null;

  const rowUnitPrice =
    row?.unit_price !== undefined && row?.unit_price !== null
      ? Number(row.unit_price)
      : 0;

  return {
    ...row,
    source_type: modern ? "offering" : "legacy",
    title,
    description,
    image_url,
    serve_date,
    order_deadline,
    unit_price: modernUnitPrice ?? rowUnitPrice,
    is_archived: modern ? !modern.is_active : legacy ? !legacy.is_active : false,
  };
}

export default function OrdersPage() {
  const [booting, setBooting] = useState(true);
  const [orders, setOrders] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [pastMonthsOpen, setPastMonthsOpen] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MONTHS_OPEN_KEY);
      if (raw) {
        setPastMonthsOpen(JSON.parse(raw));
      }
    } catch {
      setPastMonthsOpen({});
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MONTHS_OPEN_KEY, JSON.stringify(pastMonthsOpen));
    } catch {}
  }, [pastMonthsOpen]);

  async function loadOrders() {
    setBooting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          menu_items (
            id,
            title,
            description,
            image_url,
            serve_date,
            order_deadline,
            is_active
          ),
          menu_offerings (
            id,
            title,
            description,
            image_url,
            unit_price,
            serve_date,
            order_deadline,
            is_active
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Failed to load orders.");
      }

      setOrders((data || []).map(normalizeOrderRow));
    } catch (err) {
      toast.error(err.message || "Failed to load orders.");
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateOrderQuantity(order, nextQuantity) {
    const qty = clampQuantity(nextQuantity);
    const currentQty = clampQuantity(order.quantity);

    if (isOrderLocked(order)) {
      toast.error("This order can no longer be edited.");
      return;
    }

    if (qty === currentQty) {
      return;
    }

    setSavingId(order.id);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ quantity: qty })
        .eq("id", order.id);

      if (error) {
        throw new Error(error.message || "Failed to update order.");
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, quantity: qty } : item
        )
      );

      toast.success("Order updated.");
    } catch (err) {
      toast.error(err.message || "Failed to update order.");

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id ? { ...item, quantity: currentQty } : item
        )
      );
    } finally {
      setSavingId(null);
    }
  }

  async function cancelOrder(order) {
    if (isOrderLocked(order)) {
      toast.error("This order can no longer be cancelled.");
      return;
    }

    const previousOrders = orders;
    setCancellingId(order.id);

    try {
      const cancelledAt = new Date().toISOString();

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: "cancelled",
                cancelled_at: cancelledAt,
              }
            : item
        )
      );

      const payload = {
        status: "cancelled",
      };

      // Safe even if column does not exist yet: remove this line if your DB
      // does not have cancelled_at.
      payload.cancelled_at = cancelledAt;

      const { error } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", order.id);

      if (error) {
        throw new Error(error.message || "Failed to cancel order.");
      }

      toast.success("Order cancelled.");
    } catch (err) {
      setOrders(previousOrders);
      toast.error(err.message || "Failed to cancel order.");
    } finally {
      setCancellingId(null);
    }
  }

  const { activeOrders, pastGrouped } = useMemo(() => {
    const active = [];
    const past = [];

    for (const order of orders) {
      if (isOrderLocked(order)) {
        past.push(order);
      } else {
        active.push(order);
      }
    }

    active.sort((a, b) => {
      const serveDiff = getServeTimestamp(a) - getServeTimestamp(b);
      if (serveDiff !== 0) return serveDiff;

      return getDeadlineTimestamp(a) - getDeadlineTimestamp(b);
    });

    const monthMap = new Map();

    for (const order of past) {
      const key = monthKeyFromDate(order.serve_date);
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key).push(order);
    }

    const grouped = Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        label: monthLabelFromKey(key),
        items: items.sort((a, b) => {
          const serveDiff = getServeTimestamp(b) - getServeTimestamp(a);
          if (serveDiff !== 0) return serveDiff;

          const aCreated = new Date(a.created_at || 0).getTime();
          const bCreated = new Date(b.created_at || 0).getTime();
          return bCreated - aCreated;
        }),
      }));

    return {
      activeOrders: active,
      pastGrouped: grouped,
    };
  }, [orders]);

  function toggleMonth(key) {
    setPastMonthsOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function renderOrderCard(order, allowEditing) {
    const quantity = clampQuantity(order.quantity);
    const unitPriceCents = toCents(getDisplayUnitPrice(order));
    const subtotalCents = unitPriceCents * quantity;
    const taxCents = Math.round(subtotalCents * HST_RATE);
    const totalCents = subtotalCents + taxCents;

    const locked = !allowEditing || isOrderLocked(order);
    const statusLabel = getOrderStatusLabel(order);

    return (
      <div
        key={order.id}
        className={`order-card ${order.is_archived ? "archived" : ""} ${isCancelled(order) ? "cancelled" : ""}`}
      >
        <div className="order-img-wrapper">
          {getDisplayImage(order) ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 260,
                aspectRatio: "1 / 1",
              }}
            >
              <Image
                src={getDisplayImage(order)}
                alt={getDisplayTitle(order)}
                fill
                className="order-img"
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </div>
          ) : (
            <div
              className="order-img"
              style={{
                display: "grid",
                placeItems: "center",
                background: "#f3f4f6",
                color: "#777",
              }}
            >
              No image
            </div>
          )}
        </div>

        <div className="order-info">
          <div className="order-header">
            <strong>{getDisplayTitle(order)}</strong>
            <span
              className={`status-tag ${
                isCancelled(order)
                  ? "cancelled"
                  : order.is_archived
                  ? "archived"
                  : locked
                  ? "closed"
                  : "confirmed"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          {getDisplayDescription(order) ? (
            <p className="desc">{getDisplayDescription(order)}</p>
          ) : null}

          <p className="serve">
            <strong>Serve:</strong> {formatServeDate(order.serve_date)}
          </p>

          <p className="serve">
            <strong>Deadline:</strong> {formatTorontoDateTime(order.order_deadline)}
          </p>

          <p className="serve">
            <strong>Source:</strong>{" "}
            {order.source_type === "offering" ? "New offering" : "Legacy item"}
          </p>

          {order.notes && order.notes !== "Note" ? (
            <p className="serve">
              <strong>Notes:</strong> {order.notes}
            </p>
          ) : null}

          <div className="qty-controls">
            <button
              type="button"
              disabled={locked || savingId === order.id}
              onClick={() => updateOrderQuantity(order, quantity - 1)}
            >
              −
            </button>

            <input
              type="number"
              min="1"
              max="10"
              value={quantity}
              disabled={locked || savingId === order.id}
              onChange={(e) => {
                const next = clampQuantity(e.target.value);

                setOrders((prev) =>
                  prev.map((item) =>
                    item.id === order.id ? { ...item, quantity: next } : item
                  )
                );
              }}
              onBlur={(e) => updateOrderQuantity(order, e.target.value)}
            />

            <button
              type="button"
              disabled={locked || savingId === order.id}
              onClick={() => updateOrderQuantity(order, quantity + 1)}
            >
              +
            </button>
          </div>

          <div className="price-breakdown">
            <div className="line">
              <span>Unit</span>
              <span>${fromCents(unitPriceCents)}</span>
            </div>
            <div className="line">
              <span>Subtotal</span>
              <span>${fromCents(subtotalCents)}</span>
            </div>
            <div className="line">
              <span>HST (13%)</span>
              <span>${fromCents(taxCents)}</span>
            </div>
            <div className="line total">
              <span>Total</span>
              <span>${fromCents(totalCents)}</span>
            </div>
          </div>

          {locked ? (
            <div className="deadline-msg">
              {isCancelled(order)
                ? "This order has been cancelled."
                : "Editing is closed for this order."}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn-save"
                disabled={savingId === order.id}
                onClick={() => updateOrderQuantity(order, quantity)}
              >
                {savingId === order.id ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                className="btn-delete"
                disabled={cancellingId === order.id}
                onClick={() => cancelOrder(order)}
              >
                {cancellingId === order.id ? "Cancelling..." : "Cancel Order"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (booting) {
    return (
      <main className="orders-page">
        <h1 className="page-title">My Orders</h1>
        <p className="no-orders-msg">Loading your orders…</p>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <h1 className="page-title">My Orders</h1>

      {activeOrders.length === 0 && pastGrouped.length === 0 ? (
        <p className="no-orders-msg">You have no orders yet.</p>
      ) : null}

      {activeOrders.length > 0 ? (
        <section className="orders-group">
          <div className="orders-group-header">Active Orders</div>
          <div className="orders-list">
            {activeOrders.map((order) => renderOrderCard(order, true))}
          </div>
        </section>
      ) : null}

      {pastGrouped.length > 0 ? (
        <section className="orders-group">
          <div className="orders-group-header">Past Orders</div>

          <div className="month-group-list">
            {pastGrouped.map((group) => {
              const isOpen = !!pastMonthsOpen[group.key];

              return (
                <div key={group.key} className="month-group">
                  <button
                    type="button"
                    className="month-toggle"
                    onClick={() => toggleMonth(group.key)}
                  >
                    <span className="month-title">{group.label}</span>
                    <span className="month-count">{group.items.length} orders</span>
                    <span className={`chev ${isOpen ? "open" : ""}`}>⌄</span>
                  </button>

                  <div className={`month-panel ${isOpen ? "open" : ""}`}>
                    <div className="orders-list">
                      {group.items.map((order) => renderOrderCard(order, false))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="payment-options">
        Payment can be collected at pickup unless your workflow says otherwise.
      </div>
    </main>
  );
}
// pages/orders/index.js
import Image from "next/image";
import Link from "next/link";
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
  if (!Number.isFinite(parsed)) return 1;
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
  return order?.status || "placed";
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
    const cancelledAt = new Date().toISOString();

    setCancellingId(order.id);

    try {
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

      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_at: cancelledAt,
        })
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

  function renderStatusClass(order, locked) {
    if (isCancelled(order)) return "cancelled";
    if (order.is_archived) return "archived";
    if (locked) return "closed";
    return "confirmed";
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
      <section
        key={order.id}
        className={`card cardShadow ordersCard ${order.is_archived ? "archived" : ""} ${isCancelled(order) ? "cancelled" : ""}`}
      >
        <div className="ordersCardGrid">
          <div className="ordersCardImageCol">
            {getDisplayImage(order) ? (
              <div className="ordersCardImageWrap">
                <Image
                  src={getDisplayImage(order)}
                  alt={getDisplayTitle(order)}
                  fill
                  className="ordersCardImage"
                  unoptimized
                />
              </div>
            ) : (
              <div className="menuCardImageFallback ordersCardImageFallback">
                No image
              </div>
            )}
          </div>

          <div className="ordersCardContent">
            <div className="ordersCardHeader">
              <div className="ordersCardTitleWrap">
                <h2 className="h2 ordersCardTitle">{getDisplayTitle(order)}</h2>

                {getDisplayDescription(order) ? (
                  <p className="p ordersCardDescription">
                    {getDisplayDescription(order)}
                  </p>
                ) : null}
              </div>

              <span className={`status-tag ${renderStatusClass(order, locked)}`}>
                {statusLabel}
              </span>
            </div>

            <div className="menuMeta ordersCardMeta">
              <div className="menuMetaRow">
                <span className="menuMetaLabel">Serve</span>
                <span className="menuMetaValue">{formatServeDate(order.serve_date)}</span>
              </div>

              <div className="menuMetaRow">
                <span className="menuMetaLabel">Deadline</span>
                <span className="menuMetaValue">
                  {formatTorontoDateTime(order.order_deadline)}
                </span>
              </div>

              <div className="menuMetaRow">
                <span className="menuMetaLabel">Source</span>
                <span className="menuMetaValue">
                  {order.source_type === "offering" ? "Current offering" : "Legacy item"}
                </span>
              </div>

              {order.notes && order.notes !== "Note" ? (
                <div className="menuMetaRow">
                  <span className="menuMetaLabel">Notes</span>
                  <span className="menuMetaValue">{order.notes}</span>
                </div>
              ) : null}
            </div>

            <div className="ordersCardActionsRow">
              <div className="ordersQtyGroup">
                <span className="ordersQtyLabel">Qty</span>

                <button
                  type="button"
                  className="btn ordersQtyBtn"
                  disabled={locked || savingId === order.id}
                  onClick={() => updateOrderQuantity(order, quantity - 1)}
                >
                  −
                </button>

                <input
                  id={`qty-${order.id}`}
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
                  className="input ordersQtyInput"
                />

                <button
                  type="button"
                  className="btn ordersQtyBtn"
                  disabled={locked || savingId === order.id}
                  onClick={() => updateOrderQuantity(order, quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="priceBreakdownCard ordersPriceCard">
                <div className="priceRow">
                  <span>Unit</span>
                  <span>${fromCents(unitPriceCents)}</span>
                </div>
                <div className="priceRow">
                  <span>Subtotal</span>
                  <span>${fromCents(subtotalCents)}</span>
                </div>
                <div className="priceRow">
                  <span>HST</span>
                  <span>${fromCents(taxCents)}</span>
                </div>
                <div className="priceRow total">
                  <span>Total</span>
                  <span>${fromCents(totalCents)}</span>
                </div>
              </div>
            </div>

            {locked ? (
              <div
                className={`${isCancelled(order) ? "infoBox" : "errorBox"} ordersLockedMessage`}
              >
                {isCancelled(order)
                  ? "This order has been cancelled."
                  : "Editing is closed for this order."}
              </div>
            ) : (
              <div className="btnRow ordersButtonRow">
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={savingId === order.id}
                  onClick={() => updateOrderQuantity(order, quantity)}
                >
                  {savingId === order.id ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={cancellingId === order.id}
                  onClick={() => cancelOrder(order)}
                >
                  {cancellingId === order.id ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (booting) {
    return (
      <main className="pageShell">
        <div className="pageTop">
          <div className="pageTopLeft">
            <h1 className="h1">My Orders</h1>
            <p className="p">Loading your orders…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pageShell">
      <div className="pageTop">
        <div className="pageTopLeft">
          <h1 className="h1">My Orders</h1>
          <p className="p">Review active orders and order history.</p>
        </div>
        <div className="pageTopRight">
          <Link href="/menu" className="btn btnPrimary">
            Back to Menu
          </Link>
        </div>
      </div>

      {activeOrders.length === 0 && pastGrouped.length === 0 ? (
        <section className="card cardShadow">
          <h2 className="h2">No orders yet</h2>
          <p className="p">You have not placed any orders yet.</p>
          <div className="btnRow">
            <Link href="/menu" className="btn btnPrimary">
              Browse Menu
            </Link>
          </div>
        </section>
      ) : null}

      {activeOrders.length > 0 ? (
        <section className="ordersSection">
          <div className="pageTop ordersSectionTop">
            <div className="pageTopLeft">
              <h2 className="h2 ordersSectionTitle">Active Orders</h2>
            </div>
          </div>

          {activeOrders.map((order) => renderOrderCard(order, true))}
        </section>
      ) : null}

      {pastGrouped.length > 0 ? (
        <section className="ordersSection">
          <div className="pageTop ordersSectionTop">
            <div className="pageTopLeft">
              <h2 className="h2 ordersSectionTitle">Past Orders</h2>
            </div>
          </div>

          {pastGrouped.map((group) => {
            const isOpen = !!pastMonthsOpen[group.key];

            return (
              <section key={group.key} className="card cardShadow">
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
                  <div className="ordersMonthList">
                    {group.items.map((order) => renderOrderCard(order, false))}
                  </div>
                </div>
              </section>
            );
          })}
        </section>
      ) : null}

      <section className="card cardShadow ordersFooterCard">
        <p className="p ordersFooterText">
          Payment can be collected at pickup unless your workflow says otherwise.
        </p>
      </section>
    </main>
  );
}
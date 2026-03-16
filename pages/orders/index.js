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

function clampQuantity(value) {
  const parsed = Math.floor(Number(value || 1));
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(10, parsed));
}

function isCancelled(order) {
  return String(order?.status || "").toLowerCase() === "cancelled";
}

function isOrderLocked(order) {
  return isCancelled(order) || isPastDeadline(order?.order_deadline);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [cancelId, setCancelId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
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
          menu_offerings (
            title,
            description,
            image_url,
            unit_price,
            serve_date,
            order_deadline
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((o) => ({
        ...o,
        title: o.menu_offerings?.title || "Menu Item",
        description: o.menu_offerings?.description || "",
        image_url: o.menu_offerings?.image_url || "",
        unit_price: o.menu_offerings?.unit_price || o.unit_price || 0,
        serve_date: o.menu_offerings?.serve_date,
        order_deadline: o.menu_offerings?.order_deadline,
      }));

      setOrders(normalized);
    } catch (err) {
      toast.error("Failed to load orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(order, newQty) {
    const qty = clampQuantity(newQty);

    if (isOrderLocked(order)) return;

    setSavingId(order.id);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ quantity: qty })
        .eq("id", order.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, quantity: qty } : o))
      );

      toast.success("Order updated");
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function cancelOrder(order) {
    if (isOrderLocked(order)) return;

    setCancelId(order.id);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: "cancelled", cancelled_at: new Date().toISOString() }
            : o
        )
      );

      toast.success("Order cancelled");
    } catch (err) {
      toast.error("Cancel failed");
    } finally {
      setCancelId(null);
    }
  }

  const activeOrders = useMemo(
    () => orders.filter((o) => !isOrderLocked(o)),
    [orders]
  );

  const pastOrders = useMemo(
    () => orders.filter((o) => isOrderLocked(o)),
    [orders]
  );

  function renderCard(order, editable) {
    const qty = clampQuantity(order.quantity);

    const subtotal = order.unit_price * qty;
    const tax = subtotal * HST_RATE;
    const total = subtotal + tax;

    return (
      <div key={order.id} className="card cardShadow ordersCard">
        <div className="ordersCardGrid">

          <div className="ordersCardImageCol">
            {order.image_url ? (
              <Image
                src={order.image_url}
                alt={order.title}
                fill
                className="ordersCardImage"
                unoptimized
              />
            ) : (
              <div className="menuCardImageFallback">No image</div>
            )}
          </div>

          <div className="ordersCardContent">

            <div className="ordersCardHeader">
              <h2 className="h2">{order.title}</h2>
              <span className={`status-tag ${isCancelled(order) ? "cancelled" : "confirmed"}`}>
                {order.status}
              </span>
            </div>

            <p className="ordersCardDescription">{order.description}</p>

            <div className="menuMeta">
              <div className="menuMetaRow">
                <span>Serve</span>
                <span>{formatServeDate(order.serve_date)}</span>
              </div>

              <div className="menuMetaRow">
                <span>Deadline</span>
                <span>{formatTorontoDateTime(order.order_deadline)}</span>
              </div>
            </div>

            <div className="ordersCardActionsRow">

              <div className="ordersQtyGroup">
                <button
                  className="ordersQtyBtn"
                  disabled={!editable || savingId === order.id}
                  onClick={() => updateQuantity(order, qty - 1)}
                >
                  −
                </button>

                <input
                  className="ordersQtyInput"
                  type="number"
                  value={qty}
                  min="1"
                  max="10"
                  disabled={!editable}
                  onChange={(e) =>
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === order.id
                          ? { ...o, quantity: clampQuantity(e.target.value) }
                          : o
                      )
                    )
                  }
                  onBlur={(e) => updateQuantity(order, e.target.value)}
                />

                <button
                  className="ordersQtyBtn"
                  disabled={!editable || savingId === order.id}
                  onClick={() => updateQuantity(order, qty + 1)}
                >
                  +
                </button>
              </div>

              <div className="priceBreakdownCard ordersPriceCard">
                <div className="priceRow">
                  <span>Unit</span>
                  <span>${order.unit_price.toFixed(2)}</span>
                </div>

                <div className="priceRow">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                <div className="priceRow">
                  <span>HST</span>
                  <span>${tax.toFixed(2)}</span>
                </div>

                <div className="priceRow total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {editable && (
              <div className="btnRow">
                <button
                  className="btn btnPrimary"
                  disabled={savingId === order.id}
                  onClick={() => updateQuantity(order, qty)}
                >
                  Save
                </button>

                <button
                  className="btn"
                  disabled={cancelId === order.id}
                  onClick={() => cancelOrder(order)}
                >
                  Cancel
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="pageShell">
        <h1 className="h1">My Orders</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="pageShell">

      <div className="pageTop">
        <div>
          <h1 className="h1">My Orders</h1>
          <p className="p">Review your current and past orders.</p>
        </div>

        <Link href="/menu" className="btn btnPrimary">
          Back to Menu
        </Link>
      </div>

      {activeOrders.length > 0 && (
        <>
          <h2 className="h2">Active Orders</h2>
          {activeOrders.map((o) => renderCard(o, true))}
        </>
      )}

      {pastOrders.length > 0 && (
        <>
          <h2 className="h2">Past Orders</h2>
          {pastOrders.map((o) => renderCard(o, false))}
        </>
      )}

      {activeOrders.length === 0 && pastOrders.length === 0 && (
        <div className="card cardShadow">
          <p>You have no orders yet.</p>
        </div>
      )}

    </main>
  );
}
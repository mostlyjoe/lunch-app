// pages/menu/[id].js
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { getMenuItemById } from "../../lib/db/menuItems";
import {
  upsertOrder,
  getUserOrderForItem,
  calculateOrderTotals,
} from "../../lib/db/orders";
import toast from "react-hot-toast";

export default function OrderMenuItemPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState(null);
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingOrder, setExistingOrder] = useState(null);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [deadlineVariant, setDeadlineVariant] = useState("green");

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUser(userData.user);

      const menuItem = await getMenuItemById(id);
      setItem(menuItem);

      if (menuItem?.order_deadline) {
        const now = new Date();
        const deadline = new Date(menuItem.order_deadline);
        const diffHrs = (deadline - now) / (1000 * 60 * 60);

        if (deadline < now) {
          setDeadlinePassed(true);
        } else {
          setDeadlinePassed(false);
          if (diffHrs <= 12) setDeadlineVariant("red");
          else if (diffHrs <= 24) setDeadlineVariant("orange");
          else setDeadlineVariant("green");
        }
      }

      const userOrder = await getUserOrderForItem(userData.user.id, id);
      if (userOrder) {
        setExistingOrder(userOrder);
        setQuantity(userOrder.quantity);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load item.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatServeDate = (ymd) => {
    if (!ymd) return "Not set";
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString("en-CA", {
      timeZone: "America/Toronto",
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDeadline = (ts) => {
    if (!ts) return "Not set";
    const dt = new Date(ts);
    return dt.toLocaleString("en-CA", {
      timeZone: "America/Toronto",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const adjustQuantity = (delta) =>
    setQuantity((q) => Math.max(1, Math.min(10, q + delta)));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!item || !user) return;
    if (deadlinePassed) {
      toast.error("Order deadline has passed.");
      return;
    }

    setSaving(true);
    try {
      const orderPayload = {
        user_id: user.id,
        menu_item_id: item.id,
        quantity,
        unit_price: item.price,
        status: existingOrder ? "updated" : "created",
      };

      await upsertOrder(orderPayload);

      if (existingOrder) {
        const oldQty = existingOrder.quantity;
        const newQty = quantity;
        toast.success(
          `Your order for ${item.title} was updated (${oldQty} → ${newQty}).`
        );
      } else {
        toast.success(`Your order for ${item.title} was placed!`);
      }

      setTimeout(() => {
        const status = existingOrder ? "updated" : "created";
        const itemName = encodeURIComponent(item.title);
        router.push(`/menu?placed=${status}&item=${itemName}`);
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save order ❌");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-center mt-8">Loading menu item...</p>;
  if (!item)
    return (
      <p className="text-center mt-8 text-red-600">Menu item not found.</p>
    );

  const totals = calculateOrderTotals({
    quantity,
    unit_price: item.price,
  });

  return (
    <main className="order-item-page">
      <div className="order-card">
        <div className="image-wrapper">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} />
          ) : (
            <div className="image-fallback">No image</div>
          )}
        </div>

        <div className="order-body">
          <h1 className="order-title">{item.title}</h1>

          {/* 📝 Description restored under title */}
          {item.description && (
            <p className="order-desc">{item.description}</p>
          )}

          <p className="order-serve">
            <strong>Served:</strong> {formatServeDate(item.serve_date)}
          </p>

          {item.order_deadline && (
            <div className="deadline-pill-row">
              <span
                className={`deadline-pill ${
                  deadlinePassed ? "closed" : deadlineVariant
                }`}
              >
                {deadlinePassed
                  ? "Order Closed"
                  : `Order by ${formatDeadline(item.order_deadline)}`}
              </span>
            </div>
          )}

          {deadlinePassed ? (
            <p className="deadline-msg">
              ❌ Order deadline has passed. You can no longer modify this item.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="order-form">
              <div className="qty-controls">
                <button
                  type="button"
                  onClick={() => adjustQuantity(-1)}
                  disabled={saving}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Math.min(10, e.target.value)))
                  }
                />
                <button
                  type="button"
                  onClick={() => adjustQuantity(1)}
                  disabled={saving}
                >
                  +
                </button>
              </div>

              <div className="price-breakdown">
                <div className="line-item">
                  <span>Base Price</span>
                  <span>${item.price.toFixed(2)}</span>
                </div>
                <div className="line-item">
                  <span>Subtotal ({quantity}x)</span>
                  <span>${totals.subtotal}</span>
                </div>
                <div className="line-item">
                  <span>HST (13%)</span>
                  <span>${totals.tax}</span>
                </div>

                <div className="divider"></div>

                <div className="line-item total">
                  <span>Total</span>
                  <span>${totals.total}</span>
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-primary">
                {saving
                  ? "Saving..."
                  : existingOrder
                  ? "Update Order"
                  : "Place Order"}
              </button>
            </form>
          )}
        </div>
      </div></main>
  );
}

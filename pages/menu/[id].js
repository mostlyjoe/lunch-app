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

              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving
                  ? "Saving..."
                  : existingOrder
                  ? "Update Order"
                  : "Place Order"}
              </button>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .order-item-page {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2rem 1rem;
          background: #f8fafc;
          min-height: 100vh;
        }
        .order-card {
          background: #fff;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .image-wrapper {
          width: 100%;
          padding: 0.75rem;
          aspect-ratio: 1 / 1;
          background: #fafafa;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          transition: transform 0.25s ease;
        }
        .image-wrapper:hover img {
          transform: scale(1.02);
        }
        .image-fallback {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #f3f4f6;
          color: #777;
          font-size: 0.95rem;
          border: 1px dashed #ccc;
        }
        .order-body {
          padding: 1.5rem;
          width: 100%;
        }
        .order-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #c62828;
          text-align: center;
        }
        .order-serve {
          margin-bottom: 0.5rem;
          color: #333;
          text-align: center;
        }
        .deadline-pill-row {
          display: flex;
          justify-content: center;
          margin-bottom: 0.75rem;
        }
        .deadline-pill {
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .deadline-pill.green {
          background: #e6f7ee;
          color: #0f5132;
          border: 1px solid #b8e6c9;
        }
        .deadline-pill.orange {
          background: #fff3cd;
          color: #7a5d00;
          border: 1px solid #ffe49a;
        }
        .deadline-pill.red {
          background: #ffe1d6;
          color: #842029;
          border: 1px solid #ffb8a7;
        }
        .deadline-pill.closed {
          background: #ffe6e6;
          color: #b71c1c;
          border: 1px solid #f5b0b0;
        }
        .deadline-msg {
          color: #b91c1c;
          font-weight: 600;
          text-align: center;
          margin-top: 1rem;
        }
        .order-form {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        }
        .qty-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .qty-controls button {
          background: #fdd835;
          border: none;
          border-radius: 8px;
          font-size: 1.5rem;
          padding: 0.3rem 0.9rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .qty-controls button:hover {
          background: #fbc02d;
        }
        .qty-controls input {
          width: 60px;
          text-align: center;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0.25rem;
          font-size: 1rem;
        }
        .price-breakdown {
          background: #fffbea;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          font-size: 0.95rem;
          color: #333;
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .line-item {
          display: flex;
          justify-content: space-between;
          font-family: "Courier New", monospace;
        }
        .line-item span:last-child {
          min-width: 80px;
          text-align: right;
        }
        .divider {
          height: 1px;
          background: #e5e7eb;
          margin: 0.4rem 0;
        }
        .line-item.total {
          font-weight: 700;
          font-size: 1.05rem;
          color: #000;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.9rem 1.25rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s ease;
          width: 100%;
          max-width: 280px;
        }
        .btn-primary:hover {
          background: #1e40af;
        }
        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        @media (max-width: 500px) {
          .order-body {
            padding: 1rem;
          }
          .order-title {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </main>
  );
}

// pages/admin/orders.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getAllOrders, calculateOrderTotals } from "../../lib/db/orders";
import toast from "react-hot-toast";

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function loadOrders() {
            setLoading(true);
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    window.location.href = "/login";
                    return;
                }

                // ✅ Check admin flag
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profileError) throw profileError;
                if (!profile?.is_admin) {
                    toast.error("Access denied: Admins only.");
                    window.location.href = "/";
                    return;
                }

                setIsAdmin(true);

                const allOrders = await getAllOrders();
                setOrders(allOrders);
            } catch (err) {
                console.error("Admin orders load error:", err.message);
                toast.error("Failed to load orders. Check console for details.");
            } finally {
                setLoading(false);
            }
        }

        loadOrders();
    }, []);

    if (!isAdmin) return null;
    if (loading) return <p className="text-center mt-8">Loading all orders...</p>;
    if (orders.length === 0)
        return <p className="text-center mt-8">No orders have been placed yet.</p>;

    // Group by serve_date
    const grouped = orders.reduce((acc, order) => {
        const dateKey = order.menu_items?.serve_date || "Unscheduled";
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(order);
        return acc;
    }, {});

    const sortedGroups = Object.entries(grouped).sort(
        ([a], [b]) => new Date(a) - new Date(b)
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return "Unscheduled";
        let clean = dateStr;
        if (clean.includes("T")) clean = clean.slice(0, 10);
        const [y, m, d] = clean.split("-");
        return new Date(y, m - 1, d).toLocaleDateString("en-CA", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <main className="admin-orders-page">
            <h1 className="page-title">All Orders</h1>

            {sortedGroups.map(([serveDate, dayOrders]) => {
                const dayTotals = dayOrders.reduce(
                    (acc, o) => {
                        const qty = o.quantity;
                        const unit = o.unit_price;
                        const subtotal = qty * unit;
                        const tax = subtotal * 0.13;
                        return {
                            subtotal: acc.subtotal + subtotal,
                            tax: acc.tax + tax,
                            total: acc.total + subtotal + tax,
                        };
                    },
                    { subtotal: 0, tax: 0, total: 0 }
                );

                return (
                    <section className="orders-section" key={serveDate}>
                        <div className="section-header">
                            <h2>{formatDate(serveDate)}</h2>
                            <p className="section-summary">
                                {dayOrders.length} order{dayOrders.length !== 1 ? "s" : ""}
                            </p>
                        </div>

                        <div className="orders-grid">
                            {dayOrders.map((order) => {
                                const { menu_items: item, profiles: user } = order;
                                const totals = calculateOrderTotals(order);

                                return (
                                    <div className="order-card" key={order.id}>
                                        <div className="order-header">
                                            <h3>{item?.title || "Deleted Item"}</h3>
                                            <span
                                                className={`pill ${item?.is_active ? "active" : "archived"
                                                    }`}
                                            >
                                                {item?.is_active ? "Active" : "Archived"}
                                            </span>
                                        </div>

                                        <p className="user-name">
                                            {user
                                                ? `${user.first_name} ${user.last_name}`
                                                : "Unknown User"}
                                        </p>

                                        <div className="details">
                                            <p>Quantity: {order.quantity}</p>
                                            <p>Unit Price: ${order.unit_price.toFixed(2)}</p>
                                            <p>Subtotal: ${totals.subtotal}</p>
                                            <p>HST (13%): ${totals.tax}</p>
                                            <p className="total-line">
                                                <strong>Total: ${totals.total}</strong>
                                            </p>
                                        </div>

                                        <p className="timestamp">
                                            Placed: {new Date(order.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="daily-summary">
                            <p>
                                <strong>Subtotal:</strong> ${dayTotals.subtotal.toFixed(2)}
                            </p>
                            <p>
                                <strong>HST (13%):</strong> ${dayTotals.tax.toFixed(2)}
                            </p>
                            <p className="total-line">
                                <strong>Total:</strong> ${dayTotals.total.toFixed(2)}
                            </p>
                        </div>
                    </section>
                );
            })}

            <style jsx>{`
        .admin-orders-page {
          background: #f9fafb;
          min-height: 100vh;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1rem;
        }

        .orders-section {
          width: 100%;
          max-width: 1100px;
          background: white;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }

        .section-summary {
          color: #6b7280;
          font-size: 0.9rem;
        }

        .orders-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .orders-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .orders-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .order-card {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 1rem;
          text-align: left;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .pill {
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .pill.active {
          background: #dcfce7;
          color: #166534;
        }

        .pill.archived {
          background: #f3f4f6;
          color: #6b7280;
        }

        .user-name {
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .details p {
          margin: 0.15rem 0;
          font-size: 0.95rem;
        }

        .total-line {
          margin-top: 0.5rem;
          font-weight: 600;
        }

        .timestamp {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }

        .daily-summary {
          margin-top: 1rem;
          border-top: 1px solid #e5e7eb;
          padding-top: 0.5rem;
          font-size: 0.95rem;
        }
      `}</style>
        </main>
    );
}

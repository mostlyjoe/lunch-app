// pages/admin/orders-by-shift.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

export default function OrdersByShiftPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showTotals, setShowTotals] = useState(true);

    useEffect(() => {
        async function init() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = "/login";
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .maybeSingle();

            if (!profile?.is_admin) {
                toast.error("Access denied");
                window.location.href = "/";
                return;
            }

            setIsAdmin(true);
            await loadServeDates();
        }
        init();
    }, []);

    async function loadServeDates() {
        const { data, error } = await supabase
            .from("menu_items")
            .select("serve_date")
            .eq("is_active", true);

        if (error) {
            toast.error("Failed to load dates");
            return;
        }

        const uniqueDates = Array.from(
            new Set(data.map((d) => d.serve_date).filter(Boolean))
        ).sort((a, b) => new Date(a) - new Date(b));

        setDates(uniqueDates);
    }

    async function loadOrdersForDate() {
        if (!selectedDate) {
            toast.error("Select a date first");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("orders")
                .select(`
                    id,
                    user_id,
                    quantity,
                    unit_price,
                    menu_items (id, title, serve_date),
                    profiles (first_name, last_name, shift_type)
                `)
                .order("user_id");

            if (error) throw error;

            // ✅ Only include orders that match the selected date
            const filtered = (data || []).filter(
                (o) => o.menu_items?.serve_date === selectedDate
            );

            setOrders(filtered);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    }

    function calculateTotals(orderList) {
        const subtotal = orderList.reduce(
            (acc, o) => acc + o.quantity * o.unit_price,
            0
        );
        const tax = subtotal * 0.13;
        const total = subtotal + tax;
        return {
            subtotal: subtotal.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2),
        };
    }

    const shifts = ["morning", "afternoon", "night"];

    function groupByShiftAndUser() {
        const grouped = {};
        for (const shift of shifts) grouped[shift] = {};

        for (const order of orders) {
            const shift = order.profiles?.shift_type || "unknown";
            const userId = order.user_id;
            if (!grouped[shift][userId]) {
                grouped[shift][userId] = {
                    user: order.profiles,
                    orders: [],
                };
            }
            grouped[shift][userId].orders.push(order);
        }
        return grouped;
    }

    function buildItemSummary(shiftOrders) {
        const summary = {};
        for (const userId in shiftOrders) {
            const u = shiftOrders[userId];
            for (const o of u.orders) {
                const title = o.menu_items?.title || "Unknown Item";
                summary[title] = (summary[title] || 0) + o.quantity;
            }
        }
        return summary;
    }

    function formatLocalDate(dateStr) {
        if (!dateStr) return "Not set";
        const [year, month, day] = dateStr.split("-");
        const d = new Date(year, month - 1, day); // interpret as local date
        return d.toLocaleDateString("en-CA", {
            timeZone: "America/Toronto",
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }

    function printPage() {
        window.print();
    }

    if (!isAdmin) return null;

    const grouped = groupByShiftAndUser();
    const hasOrders = orders.length > 0;

    return (
        <main className="orders-shift-page">
            <div className="top-bar">
                <h1>Orders by Shift</h1>
                <div className="controls">
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    >
                        <option value="">Select serve date</option>
                        {dates.map((d) => (
                            <option key={d} value={d}>
                                {formatLocalDate(d)}
                            </option>
                        ))}
                    </select>
                    <button onClick={loadOrdersForDate} disabled={!selectedDate || loading}>
                        {loading ? "Loading..." : "Load Orders"}
                    </button>
                    <button onClick={() => setShowTotals(!showTotals)}>
                        {showTotals ? "🍽 Hide Totals" : "💰 Show Totals"}
                    </button>
                    <button onClick={printPage} className="print-btn">
                        🖨 Print Orders
                    </button>
                </div>
            </div>

            {!hasOrders && selectedDate && !loading && (
                <div className="empty">
                    <p>No orders found for this date.</p>
                </div>
            )}

            {hasOrders &&
                shifts.map((shift) => {
                    const users = grouped[shift];
                    const userIds = Object.keys(users || {});
                    if (userIds.length === 0) return null;

                    const shiftLabel =
                        shift === "morning"
                            ? "🌅 Morning Shift"
                            : shift === "afternoon"
                                ? "🌇 Afternoon Shift"
                                : "🌙 Night Shift";

                    const summary = buildItemSummary(users);

                    return (
                        <section key={shift} className="shift-section">
                            <h2>{shiftLabel}</h2>

                            <table className={`orders-table ${showTotals ? "" : "no-totals"}`}>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        {showTotals && (
                                            <>
                                                <th>Unit</th>
                                                <th>Subtotal</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {userIds.map((uid) => {
                                        const u = users[uid];
                                        const totals = calculateTotals(u.orders);
                                        return (
                                            <>
                                                {u.orders.map((o, idx) => (
                                                    <tr key={o.id} className={idx % 2 === 0 ? "even" : "odd"}>
                                                        {idx === 0 ? (
                                                            <td rowSpan={u.orders.length + (showTotals ? 3 : 0)}>
                                                                <strong>
                                                                    {u.user?.last_name}{" "}
                                                                    {u.user?.first_name?.[0] || ""}
                                                                </strong>
                                                            </td>
                                                        ) : null}
                                                        <td>{o.menu_items?.title}</td>
                                                        <td>{o.quantity}</td>
                                                        {showTotals && (
                                                            <>
                                                                <td>${o.unit_price.toFixed(2)}</td>
                                                                <td>${(o.unit_price * o.quantity).toFixed(2)}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}

                                                {showTotals && (
                                                    <>
                                                        <tr className="total-row">
                                                            <td colSpan="4" className="text-right">
                                                                Subtotal
                                                            </td>
                                                            <td>${totals.subtotal}</td>
                                                        </tr>
                                                        <tr className="total-row">
                                                            <td colSpan="4" className="text-right">
                                                                HST (13%)
                                                            </td>
                                                            <td>${totals.tax}</td>
                                                        </tr>
                                                        <tr className="total-row total-bold">
                                                            <td colSpan="4" className="text-right">
                                                                Total Due
                                                            </td>
                                                            <td>${totals.total}</td>
                                                        </tr>
                                                    </>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="summary-block">
                                <h3>Items Summary — {shiftLabel.replace(/🌅 |🌇 |🌙 /, "")}</h3>
                                <table className="summary-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Total Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(summary).map(([item, qty], i) => (
                                            <tr key={item} className={i % 2 === 0 ? "even" : "odd"}>
                                                <td>{item}</td>
                                                <td>{qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    );
                })}

            {/* ✅ Full CSS preserved */}
            <style jsx>{`
                .orders-shift-page {
                    padding: 1.5rem;
                    background: white;
                    color: #111827;
                    font-size: 16px;
                }
                .top-bar {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                .controls {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                    align-items: center;
                }
                select,
                button {
                    padding: 0.4rem 0.6rem;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.95rem;
                }
                button {
                    background: #1e3a8a;
                    color: white;
                    cursor: pointer;
                }
                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .print-btn {
                    background: #065f46;
                }
                .shift-section {
                    margin-bottom: 3rem;
                    page-break-inside: avoid;
                }
                h2 {
                    margin-bottom: 0.5rem;
                    font-size: 1.25rem;
                    font-weight: 700;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 0.25rem;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 1rem;
                }
                th,
                td {
                    border: 1px solid #e5e7eb;
                    padding: 0.4rem 0.6rem;
                    text-align: left;
                }
                th {
                    background: #e5e7eb;
                }
                tr.even {
                    background: #f9fafb;
                }
                tr.odd {
                    background: #ffffff;
                }
                .total-row {
                    background: #f3f4f6;
                }
                .total-bold td {
                    font-weight: 700;
                    border-top: 2px solid #d1d5db;
                }
                .summary-block h3 {
                    font-size: 1.1rem;
                    margin-bottom: 0.25rem;
                }
                .no-totals th:nth-child(4),
                .no-totals th:nth-child(5),
                .no-totals td:nth-child(4),
                .no-totals td:nth-child(5),
                .no-totals .total-row {
                    display: none;
                }
                .empty {
                    text-align: center;
                    padding: 2rem;
                    font-weight: 600;
                    color: #6b7280;
                }
                @media print {
                    .top-bar {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                    }
                    table {
                        font-size: 14px;
                    }
                    .shift-section {
                        page-break-after: always;
                    }
                }
            `}</style>
        </main>
    );
}

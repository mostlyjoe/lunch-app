// pages/menu/index.js
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { getMenuItems } from "../../lib/db/menuItems";
import toast from "react-hot-toast";

export default function MenuPage() {
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [menu, setMenu] = useState([]);
    const [now, setNow] = useState(Date.now());

    useEffect(() => setHasMounted(true), []);

    // ⏱️ Live update every minute to refresh pill colors
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    const YELLOW_HOURS = 24;
    const ORANGE_HOURS = 12;

    const refreshMenu = useCallback(async () => {
        try {
            const all = await getMenuItems();
            const activeItems = (all || []).filter((m) => m.is_active);
            const todayYMD = toYMDLocal(new Date());
            const visibleItems = activeItems.filter(
                (m) => !m.serve_date || m.serve_date >= todayYMD
            );
            visibleItems.sort((a, b) =>
                (a.serve_date || "9999-12-31").localeCompare(
                    b.serve_date || "9999-12-31"
                )
            );
            setMenu(visibleItems);
        } catch (err) {
            toast.error("❌ Failed to load menu.");
        }
    }, []);

    // 🔐 Load user and menu
    useEffect(() => {
        async function init() {
            const { data } = await supabase.auth.getUser();
            if (!data?.user) {
                window.location.href = "/login";
                return;
            }
            setUser(data.user);
            await refreshMenu();
        }
        init();
    }, [refreshMenu]);

    // ✅ Handle redirect query for placed/updated orders
    useEffect(() => {
        if (!router.isReady) return;
        const { placed, item, ...rest } = router.query;

        if (placed === "created") {
            toast.success(`✅ Order created${item ? ` for ${item}` : ""}!`);
        } else if (placed === "updated") {
            toast.success(`✅ Order updated${item ? ` for ${item}` : ""}!`);
        }

        if (placed) {
            router.replace({ pathname: "/menu", query: rest }, undefined, { shallow: true });
        }
    }, [router, router.isReady]);

    // === Helpers ===
    function toYMDLocal(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function parseYMDLocal(ymd) {
        if (!ymd) return null;
        const [y, m, d] = ymd.split("-").map(Number);
        return new Date(y, m - 1, d);
    }

    function friendlyDateFromYMD(ymd) {
        const dt = parseYMDLocal(ymd);
        if (!dt) return "Not set";
        return dt.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }

    function friendlyDateTime(d) {
        if (!d) return "Not set";
        return new Date(d).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }

    function msUntil(d) {
        if (!d) return null;
        return new Date(d).getTime() - now;
    }

    function isExpired(item) {
        const ms = msUntil(item?.order_deadline);
        return ms !== null && ms <= 0;
    }

    function isVisible(item) {
        const expired = isExpired(item);
        const serveDate = parseYMDLocal(item.serve_date);
        if (!serveDate) return true;
        const endOfServe = new Date(serveDate);
        endOfServe.setHours(23, 59, 59, 999);
        return !expired || (expired && now < endOfServe.getTime());
    }

    function pillVariant(deadlineISO) {
        if (!deadlineISO) return "muted";
        const ms = msUntil(deadlineISO);
        if (ms === null || ms <= 0) return "muted";
        const hrs = ms / (1000 * 60 * 60);
        if (hrs <= ORANGE_HOURS) return "orange";
        if (hrs <= YELLOW_HOURS) return "yellow";
        return "green";
    }

    const toCurrency = (n) =>
        (Number(n) || 0).toLocaleString(undefined, {
            style: "currency",
            currency: "CAD",
        });

    const groupedByDate = useMemo(() => {
        const map = new Map();
        for (const m of menu) {
            const key = m.serve_date || "unscheduled";
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(m);
        }
        for (const arr of map.values())
            arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        return Array.from(map.entries())
            .sort((a, b) =>
                a[0] === "unscheduled"
                    ? 1
                    : b[0] === "unscheduled"
                    ? -1
                    : a[0].localeCompare(b[0])
            )
            .map(([dateKey, items]) => ({ dateKey, items }));
    }, [menu]);

    function goToItem(id) {
        router.push(`/menu/${id}`);
    }

    function keyActivate(e, id) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToItem(id);
        }
    }

    const hasAnyVisible = groupedByDate.some(({ items }) =>
        items.some((m) => isVisible(m))
    );

    // 🟢 Safe hydration
    if (!hasMounted || !user) {
        return (
            <main className="menu-page">
                <h1 className="page-title">MENU</h1>
                <p className="loading">Loading...</p>
            </main>
        );
    }

    return (
        <main className="menu-page">
            <h1 className="page-title">MENU</h1>

            {!hasAnyVisible && (
                <div className="empty-card">
                    <h2>No active menu items</h2>
                    <p>Please check back soon.</p>
                </div>
            )}

            {groupedByDate.map(({ dateKey, items }) => {
                const visibleItems = items.filter((m) => isVisible(m));
                if (visibleItems.length === 0) return null;

                const deadlines = visibleItems
                    .map((m) => m.order_deadline)
                    .filter(Boolean)
                    .sort((a, b) => new Date(a) - new Date(b));
                const sharedDeadline = deadlines[0] || null;
                const dateHuman =
                    dateKey === "unscheduled"
                        ? "Unscheduled"
                        : friendlyDateFromYMD(dateKey);
                const pillClass = `pill ${pillVariant(sharedDeadline)}`;
                const allExpired = visibleItems.every((m) => isExpired(m));

                return (
                    <section className="date-card" key={dateKey}>
                        <div className="date-card-header">
                            <h2>{dateHuman}</h2>
                            <p className="date-sub">
                                {allExpired ? (
                                    <span className="pill red">
                                        Order Closed after{" "}
                                        {friendlyDateTime(
                                            deadlines[deadlines.length - 1]
                                        )}
                                    </span>
                                ) : sharedDeadline ? (
                                    <span className={pillClass}>
                                        Order by {friendlyDateTime(sharedDeadline)}
                                    </span>
                                ) : (
                                    <span className="pill muted">
                                        Order window not set
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="items-grid">
                            {visibleItems.map((m) => {
                                const expired = isExpired(m);
                                return (
                                    <div
                                        key={m.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`View ${m.title}`}
                                        className={`menu-tile ${
                                            expired ? "expired" : ""
                                        }`}
                                        onClick={() => !expired && goToItem(m.id)}
                                        onKeyDown={(e) =>
                                            !expired && keyActivate(e, m.id)
                                        }
                                        title={expired ? "Ordering closed" : "View & order"}
                                    >
                                        <div className="tile-media">
                                            {m.image_url ? (
                                                <img src={m.image_url} alt={m.title} />
                                            ) : (
                                                <div className="media-fallback">No image</div>
                                            )}
                                        </div>
                                        <div className="tile-body">
                                            <div className="tile-title">{m.title}</div>
                                            {/* Description removed per final design */}
                                        </div>
                                        <div className="tile-footer">
                                            <div className="price">
                                                {toCurrency(m.price)} + HST (13%)
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}</main>
    );
}

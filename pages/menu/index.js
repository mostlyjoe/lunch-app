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

                const serveDate = parseYMDLocal(dateKey);
                const serveDateText = serveDate
                    ? serveDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      })
                    : "";

                return (
                    <section className="date-card" key={dateKey}>
                        <div className="date-card-header">
                            <h2>{dateHuman}</h2>
                            <p className="date-sub">
                                {allExpired ? (
                                    <span className="pill red">
                                        Order Closed after 11:59 PM {serveDateText}
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
                                            <div className="tile-desc" title={m.description}>
                                                {m.description}
                                            </div>
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
            })}

            <style jsx>{`
                .menu-page {
                    padding: 1.5rem;
                    background: #fdfdfd;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                }

                .page-title {
                    font-size: 1.9rem;
                    font-weight: 800;
                    text-align: center;
                    margin-bottom: 0.5rem;
                    color: #1b5e20;
                    letter-spacing: 1px;
                }

                .empty-card {
                    max-width: 1100px;
                    width: 100%;
                    background: #fff;
                    padding: 2.5rem 1.5rem;
                    border-radius: 14px;
                    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
                    text-align: center;
                    color: #444;
                }

                .date-card {
                    width: 100%;
                    max-width: 1100px;
                    background: #fff;
                    padding: 1.25rem 1rem;
                    border-radius: 14px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.07);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .date-card-header {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    margin-bottom: 0.75rem;
                    align-items: center;
                }

                .pill {
                    display: inline-block;
                    padding: 0.35rem 0.75rem;
                    border-radius: 999px;
                    font-weight: 700;
                    font-size: 0.9rem;
                }
                .pill.green {
                    background: #e6f7ee;
                    color: #0f5132;
                    border: 1px solid #b8e6c9;
                }
                .pill.yellow {
                    background: #fff3cd;
                    color: #7a5d00;
                    border: 1px solid #ffe49a;
                }
                .pill.orange {
                    background: #ffe1d6;
                    color: #842029;
                    border: 1px solid #ffb8a7;
                }
                .pill.muted {
                    background: #f3f4f6;
                    color: #555;
                    border: 1px solid #e5e7eb;
                }
                .pill.red {
                    background: #ffebee;
                    color: #b71c1c;
                    border: 1px solid #f5c2c7;
                }

                .items-grid {
                    width: 100%;
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                    justify-items: center;
                }
                @media (min-width: 520px) {
                    .items-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (min-width: 920px) {
                    .items-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                .menu-tile {
                    width: 100%;
                    max-width: 360px;
                    border-radius: 14px;
                    background: #fffdf9;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    text-align: center;
                    cursor: pointer;
                    border: 1px solid #f0f0f0;
                    transition: all 0.25s ease;
                }
                .menu-tile:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
                    border-color: #fdd835;
                }
                .menu-tile.expired {
                    opacity: 0.6;
                    filter: grayscale(0.6);
                    cursor: not-allowed;
                    pointer-events: none;
                    transition: opacity 0.3s ease, filter 0.3s ease;
                }

                .tile-media {
                    width: 100%;
                    padding: 0.5rem;
                    background: #fafafa;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .tile-media img {
                    width: 100%;
                    height: auto;
                    aspect-ratio: 1 / 1;
                    object-fit: cover;
                    border-radius: 10px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                    transition: transform 0.25s ease;
                }
                .menu-tile:hover .tile-media img {
                    transform: scale(1.02);
                }

                .media-fallback {
                    width: 100%;
                    aspect-ratio: 1 / 1;
                    margin: 0.5rem;
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    background: #f3f4f6;
                    color: #888;
                    font-size: 0.9rem;
                    border: 1px dashed #ccc;
                }

                .tile-body {
                    padding: 0.9rem 0.75rem 0.25rem;
                }
                .tile-title {
                    font-weight: 700;
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                    color: #d32f2f;
                }
                .tile-desc {
                    font-size: 0.93rem;
                    color: #555;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .tile-footer {
                    padding: 0.75rem;
                    background: #fffbea;
                    color: #333;
                    font-weight: 600;
                    border-top: 1px solid #f4e9a8;
                }
            `}</style>
        </main>
    );
}

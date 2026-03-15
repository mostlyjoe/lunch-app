// pages/menu/index.js
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { supabase } from "../../lib/supabaseClient";
import { getActiveOfferingsForMenu } from "../../lib/db/menuOfferings";
import {
  formatServeDate,
  formatTorontoDateTime,
  getDeadlineStatus,
  isPastDeadline,
} from "../../lib/dateTime";

function money(value) {
  const num = Number(value || 0);
  return num.toFixed(2);
}

function groupOfferingsByServeDate(items) {
  const groups = new Map();

  for (const item of items) {
    const key = item.serve_date || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([serveDate, offerings]) => ({
      serveDate,
      label: formatServeDate(serveDate),
      offerings: offerings.sort((a, b) => {
        const aTime = new Date(a.order_deadline).getTime();
        const bTime = new Date(b.order_deadline).getTime();
        return aTime - bTime;
      }),
    }));
}

function deadlinePillClass(deadlineValue) {
  const status = getDeadlineStatus(deadlineValue);

  if (status === "green") return "deadline-pill deadline-green";
  if (status === "yellow") return "deadline-pill deadline-yellow";
  if (status === "orange") return "deadline-pill deadline-orange";
  return "deadline-pill deadline-closed";
}

export default function MenuPage() {
  const [booting, setBooting] = useState(true);
  const [offerings, setOfferings] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function load() {
      setBooting(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        setUser(user);

        const res = await getActiveOfferingsForMenu();
        if (!res.ok) {
          throw new Error(res.error || "Failed to load menu.");
        }

        setOfferings(res.data || []);
      } catch (err) {
        toast.error(err.message || "Failed to load menu.");
      } finally {
        setBooting(false);
      }
    }

    load();
  }, []);

  const grouped = useMemo(() => {
    const visible = (offerings || []).filter((item) => {
      if (!item?.is_active) return false;
      if (!item?.order_deadline) return false;
      return !isPastDeadline(item.order_deadline);
    });

    return groupOfferingsByServeDate(visible);
  }, [offerings]);

  if (booting) {
    return (
      <main className="pageShell">
        <div className="pageTop">
          <div className="pageTopLeft">
            <h1 className="h1">Menu</h1>
            <p className="p">Loading available menu offerings…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pageShell">
      <div className="pageTop">
        <div className="pageTopLeft">
          <h1 className="h1">Menu</h1>
          <p className="p">
            Choose from current offerings. Dates and deadlines are shown in Ontario time.
          </p>
        </div>
      </div>

      {grouped.length === 0 ? (
        <section className="card cardShadow">
          <p className="p">No active menu offerings are available right now.</p>
        </section>
      ) : (
        grouped.map((group) => (
          <section key={group.serveDate} className="menuDateSection">
            <div className="pageTop" style={{ marginBottom: "0.75rem" }}>
              <div className="pageTopLeft">
                <h2 className="h2">{group.label}</h2>
              </div>
            </div>

            <div className="menuGrid">
              {group.offerings.map((item) => {
                const closed = isPastDeadline(item.order_deadline);

                return (
                  <article key={item.id} className={`menuCard card cardShadow ${closed ? "menuCardClosed" : ""}`}>
                    <div className="menuCardImageWrap">
                      {item.image_url ? (
                        <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
                          <Image
                            src={item.image_url}
                            alt={item.title || "Menu item"}
                            fill
                            style={{ objectFit: "cover" }}
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="menuCardImageFallback">No image</div>
                      )}
                    </div>

                    <div className="menuCardBody">
                      <h3 className="menuCardTitle">{item.title}</h3>

                      {item.description ? (
                        <p className="menuCardDescription">{item.description}</p>
                      ) : (
                        <p className="menuCardDescription">No description available.</p>
                      )}

                      <div className="menuMeta">
                        <div className="menuMetaRow">
                          <span className="menuMetaLabel">Price</span>
                          <span className="menuMetaValue">${money(item.unit_price)}</span>
                        </div>

                        <div className="menuMetaRow">
                          <span className="menuMetaLabel">Serve date</span>
                          <span className="menuMetaValue">{formatServeDate(item.serve_date, { includeWeekday: true })}</span>
                        </div>

                        <div className="menuMetaRow">
                          <span className="menuMetaLabel">Order deadline</span>
                          <span className="menuMetaValue">{formatTorontoDateTime(item.order_deadline)}</span>
                        </div>
                      </div>

                      <div className="menuCardActions">
                        <span className={deadlinePillClass(item.order_deadline)}>
                          {closed ? "Closed" : "Order Open"}
                        </span>

                        <Link
                          href={`/menu/${item.id}`}
                          className={`btn btnPrimary ${closed ? "btnDisabled" : ""}`}
                          aria-disabled={closed}
                          onClick={(e) => {
                            if (closed) e.preventDefault();
                          }}
                        >
                          {closed ? "Closed" : "Order"}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
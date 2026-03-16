// pages/menu/[id].js
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { supabase } from "../../lib/supabaseClient";
import { getOfferingById } from "../../lib/db/menuOfferings";
import {
  formatServeDate,
  formatTorontoDateTime,
  isPastDeadline,
} from "../../lib/dateTime";

const HST_RATE = 0.13;

function money(value) {
  const num = Number(value || 0);
  return num.toFixed(2);
}

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

function isCancelled(order) {
  return String(order?.status || "").toLowerCase() === "cancelled";
}

export default function MenuOfferingOrderPage() {
  const router = useRouter();
  const { id } = router.query;

  const [booting, setBooting] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [offering, setOffering] = useState(null);

  const [existingOrder, setExistingOrder] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  async function loadPage(offeringId, currentUser) {
    const offeringRes = await getOfferingById(offeringId);
    if (!offeringRes.ok) {
      throw new Error(offeringRes.error || "Failed to load menu offering.");
    }

    const nextOffering = offeringRes.data;
    setOffering(nextOffering);

    const { data: foundOrder, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", currentUser.id)
      .eq("menu_offering_id", offeringId)
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message || "Failed to load your existing order.");
    }

    if (foundOrder) {
      setExistingOrder(foundOrder);
      setQuantity(clampQuantity(foundOrder.quantity || 1));
      setNotes(foundOrder.notes && foundOrder.notes !== "Note" ? foundOrder.notes : "");
    } else {
      setExistingOrder(null);
      setQuantity(1);
      setNotes("");
    }
  }

  useEffect(() => {
    async function init() {
      if (!router.isReady || !id) return;

      setBooting(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        setUser(user);
        await loadPage(id, user);
      } catch (err) {
        toast.error(err.message || "Failed to load order page.");
      } finally {
        setBooting(false);
      }
    }

    init();
  }, [router.isReady, id, router]);

  const orderClosed = useMemo(() => {
    if (!offering?.order_deadline) return true;
    return isPastDeadline(offering.order_deadline);
  }, [offering]);

  const existingOrderCancelled = useMemo(() => {
    return isCancelled(existingOrder);
  }, [existingOrder]);

  const unitPriceCents = useMemo(() => {
    return toCents(offering?.unit_price || 0);
  }, [offering]);

  const subtotalCents = useMemo(() => {
    return unitPriceCents * clampQuantity(quantity);
  }, [unitPriceCents, quantity]);

  const taxCents = useMemo(() => {
    return Math.round(subtotalCents * HST_RATE);
  }, [subtotalCents]);

  const totalCents = useMemo(() => {
    return subtotalCents + taxCents;
  }, [subtotalCents, taxCents]);

  function handleQuantityChange(nextValue) {
    setQuantity(clampQuantity(nextValue));
  }

  async function handleSaveOrder() {
    if (!user?.id) {
      toast.error("You must be signed in.");
      return;
    }

    if (!offering?.id) {
      toast.error("Menu offering not loaded.");
      return;
    }

    if (orderClosed) {
      toast.error("This order deadline has passed.");
      return;
    }

    const nextQty = clampQuantity(quantity);

    setSaving(true);

    try {
      const basePayload = {
        user_id: user.id,
        menu_offering_id: offering.id,
        quantity: nextQty,
        notes: notes?.trim() || null,
        unit_price: Number(offering.unit_price || 0),
      };

      let result;

      if (existingOrder?.id) {
        const revivePayload = {
          ...basePayload,
          status: "placed",
          cancelled_at: null,
        };

        result = await supabase
          .from("orders")
          .update(revivePayload)
          .eq("id", existingOrder.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("orders")
          .insert({
            ...basePayload,
            status: "placed",
            cancelled_at: null,
          })
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(result.error.message || "Failed to save order.");
      }

      setExistingOrder(result.data);

      if (existingOrderCancelled) {
        toast.success("Order re-activated.");
      } else if (existingOrder?.id) {
        toast.success("Order updated.");
      } else {
        toast.success("Order created.");
      }

      await loadPage(offering.id, user);
    } catch (err) {
      toast.error(err.message || "Failed to save order.");
    } finally {
      setSaving(false);
    }
  }

  if (booting) {
    return (
      <main className="pageShell">
        <div className="pageTop">
          <div className="pageTopLeft">
            <h1 className="h1">Loading offering…</h1>
          </div>
        </div>
      </main>
    );
  }

  if (!offering) {
    return (
      <main className="pageShell">
        <section className="card cardShadow">
          <h1 className="h1">Offering not found</h1>
          <p className="p">This menu offering could not be found.</p>
          <div className="btnRow">
            <Link href="/menu" className="btn btnPrimary">
              Back to Menu
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pageShell">
      <div className="pageTop">
        <div className="pageTopLeft">
          <h1 className="h1">{offering.title}</h1>
          <p className="p">
            Order for {formatServeDate(offering.serve_date)}.
          </p>
        </div>
      </div>

      <div className="menuDetailLayout">
        <section className="card cardShadow">
          <div className="menuDetailImageWrap">
            {offering.image_url ? (
              <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
                <Image
                  src={offering.image_url}
                  alt={offering.title || "Menu item"}
                  fill
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>
            ) : (
              <div className="menuCardImageFallback">No image</div>
            )}
          </div>

          <div className="menuDetailBody">
            <h2 className="h2">{offering.title}</h2>

            {offering.description ? (
              <p className="p">{offering.description}</p>
            ) : (
              <p className="p">No description available.</p>
            )}

            <div className="menuMeta" style={{ marginTop: "1rem" }}>
              <div className="menuMetaRow">
                <span className="menuMetaLabel">Price</span>
                <span className="menuMetaValue">${money(offering.unit_price)}</span>
              </div>

              <div className="menuMetaRow">
                <span className="menuMetaLabel">Serve date</span>
                <span className="menuMetaValue">{formatServeDate(offering.serve_date)}</span>
              </div>

              <div className="menuMetaRow">
                <span className="menuMetaLabel">Order deadline</span>
                <span className="menuMetaValue">
                  {formatTorontoDateTime(offering.order_deadline)}
                </span>
              </div>

              <div className="menuMetaRow">
                <span className="menuMetaLabel">Status</span>
                <span className="menuMetaValue">{orderClosed ? "Closed" : "Open"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card cardShadow">
          <h2 className="h2">
            {existingOrderCancelled
              ? "Re-Order This Item"
              : existingOrder
              ? "Update Your Order"
              : "Place Your Order"}
          </h2>

          {existingOrderCancelled ? (
            <div className="infoBox" style={{ marginBottom: "1rem" }}>
              You cancelled this order earlier. Saving now will re-activate it.
            </div>
          ) : existingOrder ? (
            <p className="p" style={{ marginBottom: "1rem" }}>
              You already have an order for this offering. Update it below.
            </p>
          ) : (
            <p className="p" style={{ marginBottom: "1rem" }}>
              Choose your quantity and optional notes.
            </p>
          )}

          {orderClosed ? (
            <div className="errorBox" style={{ marginBottom: "1rem" }}>
              This order deadline has passed. New changes are disabled.
            </div>
          ) : null}

          <div className="formGroup">
            <label className="label" htmlFor="quantity">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              max="10"
              step="1"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              disabled={orderClosed || saving}
              className="input"
            />
          </div>

          <div className="formGroup">
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={orderClosed || saving}
              className="input"
              placeholder="Optional notes for your order"
            />
          </div>

          <div className="priceBreakdownCard" style={{ marginTop: "1rem" }}>
            <div className="priceRow">
              <span>Unit price</span>
              <span>${fromCents(unitPriceCents)}</span>
            </div>
            <div className="priceRow">
              <span>Subtotal</span>
              <span>${fromCents(subtotalCents)}</span>
            </div>
            <div className="priceRow">
              <span>HST (13%)</span>
              <span>${fromCents(taxCents)}</span>
            </div>
            <div className="priceRow total">
              <span>Total</span>
              <span>${fromCents(totalCents)}</span>
            </div>
          </div>

          <div className="btnRow" style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className={`btn btnPrimary ${orderClosed || saving ? "btnDisabled" : ""}`}
              onClick={handleSaveOrder}
              disabled={orderClosed || saving}
            >
              {saving
                ? "Saving..."
                : existingOrderCancelled
                ? "Re-Activate Order"
                : existingOrder
                ? "Update Order"
                : "Create Order"}
            </button>

            <Link href="/menu" className="btn">
              Back to Menu
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
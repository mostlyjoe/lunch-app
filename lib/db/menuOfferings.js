// lib/db/menuOfferings.js
import { supabase } from "../supabaseClient";

/**
 * Scheduled offerings
 * ---------------------------------
 * These are the dated menu entries users actually order from.
 * Each offering snapshots catalog data at creation time.
 *
 * Orders will later tie to:
 *   orders.menu_offering_id
 *
 * NOT directly to:
 *   menu_catalog_items.id
 */

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeMoneyInput(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(2);
}

function toSafeError(error, fallback) {
  return error?.message || fallback;
}

function combineLocalDateAndTimeToISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const localString = `${dateStr}T${timeStr}:00`;
  const dt = new Date(localString);

  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export function validateOfferingInput(input) {
  const catalog_item_id = cleanText(input.catalog_item_id);
  const serve_date = cleanText(input.serve_date);
  const deadline_time = cleanText(input.deadline_time);
  const override_price_raw = input.override_price;

  if (!catalog_item_id) {
    return { ok: false, error: "Please select a reusable menu item." };
  }

  if (!serve_date) {
    return { ok: false, error: "Serve date is required." };
  }

  if (!deadline_time) {
    return { ok: false, error: "Order deadline time is required." };
  }

  const order_deadline = combineLocalDateAndTimeToISO(serve_date, deadline_time);
  if (!order_deadline) {
    return { ok: false, error: "Deadline date/time is invalid." };
  }

  let override_price = null;
  if (override_price_raw !== null && override_price_raw !== undefined && override_price_raw !== "") {
    override_price = normalizeMoneyInput(override_price_raw);
    if (override_price === null) {
      return { ok: false, error: "Override price must be a valid number." };
    }
  }

  return {
    ok: true,
    data: {
      catalog_item_id,
      serve_date,
      deadline_time,
      order_deadline,
      override_price,
      is_active: Boolean(input.is_active ?? true),
    },
  };
}

/**
 * Build the actual offering insert payload by reading the selected catalog item
 * and snapshotting its content into the offering row.
 */
export async function createOfferingFromCatalog(input, currentUserId = null) {
  const validated = validateOfferingInput(input);
  if (!validated.ok) return validated;

  const { catalog_item_id, serve_date, order_deadline, override_price, is_active } = validated.data;

  const catalogRes = await supabase
    .from("menu_catalog_items")
    .select("*")
    .eq("id", catalog_item_id)
    .single();

  if (catalogRes.error || !catalogRes.data) {
    return {
      ok: false,
      error: toSafeError(catalogRes.error, "Could not load selected reusable item."),
    };
  }

  const catalogItem = catalogRes.data;

  const unit_price = override_price ?? catalogItem.default_price;

  const payload = {
    catalog_item_id: catalogItem.id,
    title: catalogItem.title,
    description: catalogItem.description,
    image_url: catalogItem.image_url,
    unit_price,
    serve_date,
    order_deadline,
    is_active,
    created_by: currentUserId || null,
    updated_by: currentUserId || null,
  };

  const { data, error } = await supabase
    .from("menu_offerings")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to create offering.") };
  }

  return { ok: true, data };
}

export async function getAdminOfferings() {
  const { data, error } = await supabase
    .from("menu_offerings")
    .select(`
      *,
      menu_catalog_items (
        id,
        title,
        default_price,
        is_active
      )
    `)
    .order("serve_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to load offerings.") };
  }

  return { ok: true, data: data || [] };
}

export async function getOfferingById(id) {
  if (!id) {
    return { ok: false, error: "Offering id is required." };
  }

  const { data, error } = await supabase
    .from("menu_offerings")
    .select(`
      *,
      menu_catalog_items (
        id,
        title,
        description,
        default_price,
        image_url,
        is_active
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to load offering.") };
  }

  return { ok: true, data };
}

export async function setOfferingActive(id, isActive, currentUserId = null) {
  if (!id) {
    return { ok: false, error: "Offering id is required." };
  }

  const { data, error } = await supabase
    .from("menu_offerings")
    .update({
      is_active: Boolean(isActive),
      updated_by: currentUserId || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to update offering status.") };
  }

  return { ok: true, data };
}

/**
 * Offerings visible to users on the menu page.
 * Active only, upcoming first.
 */
export async function getActiveOfferingsForMenu() {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("menu_offerings")
    .select("*")
    .eq("is_active", true)
    .gte("order_deadline", nowIso)
    .order("serve_date", { ascending: true })
    .order("order_deadline", { ascending: true });

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to load menu offerings.") };
  }

  return { ok: true, data: data || [] };
}

/**
 * For later: include inactive / expired history if needed.
 */
export async function getAllOfferingsForMenuAdminView() {
  const { data, error } = await supabase
    .from("menu_offerings")
    .select("*")
    .order("serve_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to load menu offerings.") };
  }

  return { ok: true, data: data || [] };
}

/**
 * Update an offering directly.
 * NOTE:
 * We are NOT auto-resyncing from catalog on edit.
 * Offerings are historical snapshots.
 */
export async function updateOffering(id, input, currentUserId = null) {
  if (!id) {
    return { ok: false, error: "Offering id is required." };
  }

  const validated = validateOfferingInput(input);
  if (!validated.ok) return validated;

  const existingRes = await supabase
    .from("menu_offerings")
    .select("*")
    .eq("id", id)
    .single();

  if (existingRes.error || !existingRes.data) {
    return {
      ok: false,
      error: toSafeError(existingRes.error, "Could not load offering for update."),
    };
  }

  const existing = existingRes.data;

  let nextUnitPrice = existing.unit_price;
  if (validated.data.override_price !== null) {
    nextUnitPrice = validated.data.override_price;
  }

  // If admin changed the linked catalog item, refresh snapshot from that catalog item.
  let nextSnapshot = {
    catalog_item_id: existing.catalog_item_id,
    title: existing.title,
    description: existing.description,
    image_url: existing.image_url,
  };

  if (validated.data.catalog_item_id !== existing.catalog_item_id) {
    const catalogRes = await supabase
      .from("menu_catalog_items")
      .select("*")
      .eq("id", validated.data.catalog_item_id)
      .single();

    if (catalogRes.error || !catalogRes.data) {
      return {
        ok: false,
        error: toSafeError(catalogRes.error, "Could not load selected reusable item."),
      };
    }

    nextSnapshot = {
      catalog_item_id: catalogRes.data.id,
      title: catalogRes.data.title,
      description: catalogRes.data.description,
      image_url: catalogRes.data.image_url,
    };

    if (validated.data.override_price === null) {
      nextUnitPrice = catalogRes.data.default_price;
    }
  }

  const payload = {
    ...nextSnapshot,
    unit_price: nextUnitPrice,
    serve_date: validated.data.serve_date,
    order_deadline: validated.data.order_deadline,
    is_active: validated.data.is_active,
    updated_by: currentUserId || null,
  };

  const { data, error } = await supabase
    .from("menu_offerings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to update offering.") };
  }

  return { ok: true, data };
}
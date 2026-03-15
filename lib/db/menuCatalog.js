// lib/db/menuCatalog.js
import { supabase } from "../supabaseClient";

/**
 * Reusable catalog items
 * ---------------------------------
 * This is the permanent library of menu products:
 * - title
 * - description
 * - default_price
 * - image_url
 * - is_active
 *
 * IMPORTANT:
 * Orders should NOT tie to this table.
 * Orders will later tie to menu_offerings.
 */

function normalizeMoneyInput(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return num.toFixed(2);
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toSafeError(error, fallback) {
  return error?.message || fallback;
}

export function validateCatalogItem(input) {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const price = normalizeMoneyInput(input.default_price);

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  if (title.length > 150) {
    return { ok: false, error: "Title must be 150 characters or less." };
  }

  if (description.length > 2000) {
    return { ok: false, error: "Description must be 2000 characters or less." };
  }

  if (price === null) {
    return { ok: false, error: "Default price must be a valid number." };
  }

  return {
    ok: true,
    data: {
      title,
      description: description || null,
      default_price: price,
      image_url: cleanText(input.image_url) || null,
      is_active: Boolean(input.is_active ?? true),
    },
  };
}

/**
 * List all catalog items for admin use.
 * Active first, then newest.
 */
export async function getAdminCatalogItems() {
  const { data, error } = await supabase
    .from("menu_catalog_items")
    .select("*")
    .order("is_active", { ascending: false })
    .order("title", { ascending: true });

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to load catalog items.") };
  }

  return { ok: true, data: data || [] };
}

/**
 * List active catalog items for scheduling into offerings.
 */
export async function getActiveCatalogItems() {
  const { data, error } = await supabase
    .from("menu_catalog_items")
    .select("*")
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to load active catalog items.") };
  }

  return { ok: true, data: data || [] };
}

export async function getCatalogItemById(id) {
  if (!id) {
    return { ok: false, error: "Catalog item id is required." };
  }

  const { data, error } = await supabase
    .from("menu_catalog_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to load catalog item.") };
  }

  return { ok: true, data };
}

export async function createCatalogItem(input, currentUserId = null) {
  const validated = validateCatalogItem(input);
  if (!validated.ok) return validated;

  const payload = {
    ...validated.data,
    created_by: currentUserId || null,
    updated_by: currentUserId || null,
  };

  const { data, error } = await supabase
    .from("menu_catalog_items")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to create catalog item.") };
  }

  return { ok: true, data };
}

export async function updateCatalogItem(id, input, currentUserId = null) {
  if (!id) {
    return { ok: false, error: "Catalog item id is required." };
  }

  const validated = validateCatalogItem(input);
  if (!validated.ok) return validated;

  const payload = {
    ...validated.data,
    updated_by: currentUserId || null,
  };

  const { data, error } = await supabase
    .from("menu_catalog_items")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to update catalog item.") };
  }

  return { ok: true, data };
}

/**
 * Soft archive / unarchive
 */
export async function setCatalogItemActive(id, isActive, currentUserId = null) {
  if (!id) {
    return { ok: false, error: "Catalog item id is required." };
  }

  const { data, error } = await supabase
    .from("menu_catalog_items")
    .update({
      is_active: Boolean(isActive),
      updated_by: currentUserId || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { ok: false, error: toSafeError(error, "Failed to update catalog item status.") };
  }

  return { ok: true, data };
}
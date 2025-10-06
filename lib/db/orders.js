// lib/db/orders.js
import { supabase } from "../supabaseClient";

/**
 * Fetch all orders (active + archived) for a given user (user-facing).
 */
export async function getUserOrders(userId) {
    const { data, error } = await supabase
        .from("orders")
        .select(`
            id,
            user_id,
            menu_item_id,
            quantity,
            unit_price,
            status,
            created_at,
            menu_items (
                id,
                title,
                description,
                price,
                serve_date,
                order_deadline,
                image_url,
                is_active
            )
        `)
        .eq("user_id", userId)
        // ✅ Include both active and archived menu items for user visibility
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Fetch a single order for a given user and menu item.
 */
export async function getUserOrderForItem(userId, menuItemId) {
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .eq("menu_item_id", menuItemId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Upsert (create or update) an order.
 */
export async function upsertOrder(orderData) {
    const { data, error } = await supabase
        .from("orders")
        .upsert(orderData, { onConflict: ["user_id", "menu_item_id"] })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete an order by ID.
 */
export async function deleteOrder(orderId) {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) throw error;
    return true;
}

/**
 * Update an order by ID.
 */
export async function updateOrder(orderId, fields) {
    const { error } = await supabase.from("orders").update(fields).eq("id", orderId);
    if (error) throw error;
    return true;
}

/**
 * Fetch all orders (admin view) joined with profiles + menu_items.
 */
export async function getAllOrders() {
    const { data, error } = await supabase
        .from("orders")
        .select(`
            id,
            user_id,
            menu_item_id,
            quantity,
            unit_price,
            status,
            created_at,
            menu_items (
                id,
                title,
                serve_date,
                order_deadline,
                is_active
            ),
            profiles (
                id,
                first_name,
                last_name,
                shift_type
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("getAllOrders error:", error);
        throw error;
    }

    return data || [];
}

/**
 * Calculate subtotal, HST (13%), and total.
 */
export function calculateOrderTotals(order) {
    const qty = order.quantity || 0;
    const unit = parseFloat(order.unit_price) || 0;
    const subtotal = qty * unit;
    const tax = subtotal * 0.13;
    const total = subtotal + tax;

    return {
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
    };
}

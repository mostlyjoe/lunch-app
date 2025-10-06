import { supabase } from "../supabaseClient";

/* ============================
   MENU ITEMS DB HELPERS
   (includes is_active boolean)
=============================== */

// ✅ Get all menu items (active + archived)
export async function getMenuItems() {
    const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("serve_date", { ascending: true });
    if (error) throw error;
    return data || [];
}

// ✅ Get a single menu item by id
export async function getMenuItemById(id) {
    const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}

// ✅ Create a new menu item
export async function createMenuItem(item) {
    // 🕒 ensure full ISO timestamp if a plain datetime string is passed
    const deadlineISO = item.order_deadline
        ? new Date(item.order_deadline).toISOString()
        : null;

    const payload = {
        title: item.title,
        description: item.description,
        price: item.price,
        serve_date: item.serve_date,
        order_deadline: deadlineISO,
        image_url: item.image_url || null,
        is_active: item.is_active ?? true, // default to active
    };

    const { data, error } = await supabase
        .from("menu_items")
        .insert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ✅ Update a menu item
export async function updateMenuItem(id, updates) {
    // 🕒 ensure full ISO timestamp
    const deadlineISO = updates.order_deadline
        ? new Date(updates.order_deadline).toISOString()
        : null;

    const payload = {
        title: updates.title,
        description: updates.description,
        price: updates.price,
        serve_date: updates.serve_date,
        order_deadline: deadlineISO,
        image_url: updates.image_url || null,
        is_active: updates.is_active ?? true,
    };

    const { data, error } = await supabase
        .from("menu_items")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ✅ Delete a menu item (admin-only — future use)
export async function deleteMenuItem(id) {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) throw error;
    return true;
}

// ✅ Upload image to Supabase Storage
export async function uploadMenuImage(file) {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
        .from("menu-images")
        .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
        .from("menu-images")
        .getPublicUrl(fileName);

    return data.publicUrl;
}

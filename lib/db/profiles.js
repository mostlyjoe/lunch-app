import { supabase } from "../supabaseClient";

// ✅ Get a single profile by userId
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

// ✅ Get all profiles (admin only) — includes user email from auth.users
export async function getAllProfiles() {
    // Join auth.users via a foreign table reference to get each user's email
    const { data, error } = await supabase
        .from("profiles")
        .select(`
            id,
            first_name,
            last_name,
            company_name,
            shift_type,
            is_admin,
            auth:auth.users(email)
        `);

    if (error) throw error;

    // Flatten nested email for simpler access in components
    return data.map((p) => ({
        ...p,
        email: p.auth?.email || "—",
    }));
}

// ✅ Update own profile (first/last/shift only)
export async function updateProfile(userId, updates) {
    // enforce default company for all normal updates
    const safeUpdates = {
        first_name: updates.first_name,
        last_name: updates.last_name,
        shift_type: updates.shift_type,
        company_name: "compName01", // always enforce default
    };

    const { data, error } = await supabase
        .from("profiles")
        .update(safeUpdates)
        .eq("id", userId)
        .select()
        .maybeSingle();

    if (error) throw error;
    return data;
}

// ✅ Admin: update any profile (can override company + admin flag)
export async function updateUserProfile(userId, updates) {
    const { data, error } = await supabase
        .from("profiles")
        .update({
            first_name: updates.first_name,
            last_name: updates.last_name,
            shift_type: updates.shift_type,
            company_name: updates.company_name || "compName01", // fallback default
            is_admin: updates.is_admin || false,
        })
        .eq("id", userId)
        .select()
        .maybeSingle();

    if (error) throw error;
    return data;
}

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

// ✅ Get all profiles (admin only)
export async function getAllProfiles() {
    const { data, error } = await supabase
        .from("profiles")
        .select("*");

    if (error) throw error;
    return data;
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

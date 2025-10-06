// pages/api/deleteUser.js
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { targetUserId } = req.body;
        if (!targetUserId) {
            return res.status(400).json({ error: "Missing target user ID" });
        }

        // TODO: verify the caller is an admin
        // For now, assume only admins can call this API (since it uses service role key)

        // Delete related orders first
        await adminClient.from("orders").delete().eq("user_id", targetUserId);

        // Delete profile
        await adminClient.from("profiles").delete().eq("id", targetUserId);

        // Delete user from auth
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
        if (deleteError) throw deleteError;

        return res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("Delete user error:", err.message);
        return res.status(500).json({ error: "Server error: " + err.message });
    }
}

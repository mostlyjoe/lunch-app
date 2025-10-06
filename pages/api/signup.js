// pages/api/signup.js
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

// ✅ Public client (anon key) — used only for signUp()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { email, pin, firstName, lastName, shift } = req.body;

    // ✅ Step 1: Create user in Supabase Auth (public client)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pin, // 6-digit PIN as password
    });

    if (error) {
      if (error.message?.toLowerCase().includes("registered")) {
        return res.status(400).json({
          error: "EMAIL_ALREADY_REGISTERED",
          message: "This email is already registered. Please log in instead.",
        });
      }
      return res.status(400).json({
        error: "SIGNUP_FAILED",
        message: error.message || "Signup failed.",
      });
    }

    const user = data?.user;
    if (!user) {
      return res.status(400).json({
        error: "USER_CREATION_FAILED",
        message: "Signup failed: no user returned from Supabase.",
      });
    }

    // ✅ Step 2: Insert matching profile row using service-role key
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        company_name: "compName01", // default placeholder
        shift_type: shift,
        is_admin: false,
      });

    if (profileError) {
      // ❌ Roll back auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(400).json({
        error: "PROFILE_CREATION_FAILED",
        message: "Profile creation failed. No account was created.",
      });
    }

    return res.status(200).json({
      message: "Signup successful",
      user,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: err.message || "Unexpected server error",
    });
  }
}

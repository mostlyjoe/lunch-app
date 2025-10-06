// pages/api/signup.js
import { createClient } from "@supabase/supabase-js";

// Public client for auth signup (handles email verification automatically)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Admin client for inserting into protected tables
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const { email, pin, firstName, lastName, shift } = req.body;

    // ✅ Step 1: Create user through public supabase client
    // This triggers Supabase's built-in confirmation email flow
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pin,
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

    // ✅ Step 2: Insert profile using admin client (service role)
    // We can safely insert even before email confirmation
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      company_name: "compName01",
      shift_type: shift,
      is_admin: false,
    });

    if (profileError) {
      // ❌ Rollback Auth user if profile insert fails
      await adminClient.auth.admin.deleteUser(user.id);
      return res.status(400).json({
        error: "PROFILE_CREATION_FAILED",
        message: "Profile creation failed. No account was created.",
      });
    }

    // ✅ Step 3: Tell user to check their email
    return res.status(200).json({
      message:
        "Signup successful! Please check your email to confirm your account before logging in.",
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

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

    // ✅ Step 1: Create user in Supabase Auth using service key
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true, // mark verified immediately
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

    // ✅ Step 2: Insert profile row
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      company_name: "compName01",
      shift_type: shift,
      is_admin: false,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(user.id);
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

// pages/login.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

export default function Login() {
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState({});
    const [loadingAuth, setLoadingAuth] = useState(true);

    // ✅ Redirect if already logged in
    useEffect(() => {
        async function checkUser() {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                window.location.href = "/";
            } else {
                setLoadingAuth(false);
            }
        }
        checkUser();
    }, []);

    const markTouched = (field) =>
        setTouched((t) => ({ ...t, [field]: true }));

    // ✅ Validation
    const isEmpty = (v) => String(v).trim().length === 0;
    const isEmailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    const isPinValid = (v) => /^\d{6}$/.test(v);

    const fieldInvalid = {
        email: touched.email && (!isEmailValid(email) || isEmpty(email)),
        pin: touched.pin && (!isPinValid(pin) || isEmpty(pin)),
    };

    const pinMessage =
        fieldInvalid.pin && pin
            ? "PIN must be exactly 6 digits."
            : touched.pin && isEmpty(pin)
            ? "PIN must be exactly 6 digits."
            : "";

    const formValid = isEmailValid(email) && isPinValid(pin);

    // ✅ Login handler
    async function handleLogin(e) {
        e.preventDefault();
        if (!formValid || loading) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pin,
            });
            if (error) throw error;
            if (!data.user) throw new Error("No user returned from login");

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", data.user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            // ✅ Toast success
            toast.success(`Welcome back, ${profile.first_name || "User"}!`);

            // ✅ Redirect after 1s
            setTimeout(() => {
                window.location.href = "/";
            }, 1000);
        } catch (err) {
            console.error("Login error:", err.message);
            toast.error(err.message || "Login failed.");
            setLoading(false);
        }
    }

    // ✅ While checking session
    if (loadingAuth) {
        return (
            <main className="auth">
                <div className="card authCard">Checking session...</div>
            </main>
        );
    }

    return (
        <main className="auth">
            <div className="card authCard">
                <h2>Login</h2>
                <form onSubmit={handleLogin}>
                    {/* Email */}
                    <div className="field-group">
                        <label className="field-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            placeholder="Enter your email"
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => markTouched("email")}
                            className={`input ${
                                fieldInvalid.email
                                    ? "error-border"
                                    : touched.email && !fieldInvalid.email
                                    ? "success-border"
                                    : ""
                            }`}
                        />
                    </div>

                    {/* PIN */}
                    <div className="field-group">
                        <label className="field-label">6-digit PIN</label>
                        <input
                            type={showPin ? "text" : "password"}
                            value={pin}
                            placeholder="Enter PIN"
                            onChange={(e) => setPin(e.target.value)}
                            onBlur={() => markTouched("pin")}
                            maxLength={6}
                            className={`input ${
                                fieldInvalid.pin
                                    ? "error-border"
                                    : touched.pin && !fieldInvalid.pin
                                    ? "success-border"
                                    : ""
                            }`}
                        />
                        {touched.pin && pinMessage && (
                            <p className="error-text">{pinMessage}</p>
                        )}
                    </div>

                    {/* Show PIN */}
                    <div className="showpin-wrapper">
                        <label className="showpin-label">
                            <input
                                type="checkbox"
                                checked={showPin}
                                onChange={() => setShowPin((v) => !v)}
                            />{" "}
                            Show PIN
                        </label>
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={!formValid || loading}>
                        {loading ? (
                            <span className="spinner fade-in"></span>
                        ) : (
                            "Login"
                        )}
                    </button>
                </form>
            </div></main>
    );
}

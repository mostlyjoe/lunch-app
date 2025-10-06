// pages/login.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
    // Form values
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);

    // UI state
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [touched, setTouched] = useState({});
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Redirect if user already signed in
    useEffect(() => {
        async function checkUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                window.location.href = "/"; // already logged in
            } else {
                setLoadingAuth(false);
            }
        }
        checkUser();
    }, []);

    const markTouched = (field) =>
        setTouched((t) => ({ ...t, [field]: true }));

    const showToast = (message, type = "info") => {
        setToast({ msg: message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Validation
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

    // Submit handler
    async function handleLogin(e) {
        e.preventDefault();
        if (!formValid || loading) return;

        setLoading(true);
        try {
            // Step 1: Log in
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pin,
            });
            if (error) throw error;
            if (!data.user) throw new Error("No user returned from login");

            // Step 2: Load profile
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", data.user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            showToast(`✅ Welcome back, ${profile.first_name || "User"}!`, "success");

            // Redirect after success
            setTimeout(() => {
                window.location.href = "/";
            }, 1500);
        } catch (err) {
            console.error("Login error:", err.message);
            showToast("❌ " + err.message, "error");
            setLoading(false);
        }
    }

    // While checking session
    if (loadingAuth) {
        return (
            <main className="auth">
                <div className="card">Checking session...</div>
            </main>
        );
    }

    return (
        <main className="auth">
            <div className="card">
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
                            className={`input ${fieldInvalid.email
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
                            className={`input ${fieldInvalid.pin
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

                    {/* Show PIN toggle */}
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
                        {loading ? <span className="spinner fade-in"></span> : "Login"}
                    </button>
                </form>
            </div>

            {/* Toast Notification */}
            {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

            <style jsx>{`
        .auth {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 80vh;
          background: #f9fafb;
          padding: 1rem;
        }
        .card {
          background: #fff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          max-width: 420px;
          width: 100%;
        }
        h2 {
          text-align: center;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }
        .field-group { margin-bottom: 1rem; }
        .field-label {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
          display: block;
        }
        .input {
          width: 100%;
          padding: 0.65rem 0.7rem;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          transition: border-color 0.15s;
          font-size: 1rem;
        }
        .input:focus { border-color: #0070f3; outline: none; }
        .error-border { border-color: #dc2626; }
        .success-border { border-color: #16a34a; }
        .error-text {
          font-size: 0.8rem;
          color: #b91c1c;
          margin-top: 0.35rem;
        }
        .showpin-wrapper { margin: 0.5rem 0 1.5rem; }
        .showpin-label {
          font-size: 0.85rem;
          cursor: pointer;
          color: #444;
          user-select: none;
        }
        button {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 44px;
          background: #0070f3;
          color: #fff;
          font-weight: 700;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s, transform 0.02s;
          font-size: 1rem;
        }
        button:hover:not(:disabled) { background: #005bb5; }
        button:active:not(:disabled) { transform: translateY(1px); }
        button:disabled { background: #9ca3af; cursor: not-allowed; }
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in {
          opacity: 0;
          transform: scale(0.9);
          animation: fadeIn 0.3s forwards;
        }
        @keyframes fadeIn {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .toast {
          position: fixed;
          top: 1rem;
          right: 1rem;
          padding: 1rem;
          border-radius: 6px;
          font-weight: 600;
          z-index: 10000;
          max-width: calc(100% - 2rem);
          word-wrap: break-word;
        }
        .toast.success { background: #e6ffed; color: #0c6c2c; }
        .toast.error { background: #ffe6e6; color: #a10000; }
        .toast.info { background: #e6f0ff; color: #004085; }
        @media (max-width: 480px) {
          .card { padding: 1rem; }
          h2 { font-size: 1.25rem; }
          button { font-size: 1rem; }
        }
      `}</style>
        </main>
    );
}

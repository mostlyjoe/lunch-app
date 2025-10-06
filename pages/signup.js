// pages/signup.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient"; // adjust path if needed

export default function Signup() {
    // Form values
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [shift, setShift] = useState("");
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [showPin, setShowPin] = useState(false);

    // UI
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [touched, setTouched] = useState({});
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Redirect if user already signed in
    useEffect(() => {
        async function checkUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                window.location.href = "/menu"; // or wherever you want to redirect
            } else {
                setLoadingAuth(false); // allow form to render
            }
        }
        checkUser();
    }, []);

    const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));
    const showToast = (message, type = "info") => {
        setToast({ msg: message, type });
        setTimeout(() => setToast(null), 5000);
    };

    // Validation helpers
    const isEmpty = (v) => String(v).trim().length === 0;
    const isEmailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    const isNameValid = (v) => /^[A-Za-z' -]+$/.test(v.trim());

    const fieldInvalid = {
        email: touched.email && (!isEmailValid(email) || isEmpty(email)),
        firstName: touched.firstName && (!isNameValid(firstName) || isEmpty(firstName)),
        lastName: touched.lastName && (!isNameValid(lastName) || isEmpty(lastName)),
        shift: touched.shift && isEmpty(shift),
        pin: touched.pin && (!/^\d{6}$/.test(pin)),
        confirmPin: touched.confirmPin && (confirmPin !== pin || isEmpty(confirmPin)),
    };

    const pinMessage =
        fieldInvalid.pin && pin
            ? "PIN must be exactly 6 digits."
            : touched.pin && isEmpty(pin)
                ? "PIN must be exactly 6 digits."
                : "";

    const confirmPinMessage =
        fieldInvalid.confirmPin && confirmPin
            ? "PINs must match."
            : touched.confirmPin && isEmpty(confirmPin)
                ? "PINs must match."
                : "";

    const formValid =
        isEmailValid(email) &&
        isNameValid(firstName) &&
        isNameValid(lastName) &&
        !isEmpty(shift) &&
        /^\d{6}$/.test(pin) &&
        confirmPin === pin;

    const borderClass = (field, value) => {
        if (!touched[field]) return "input";
        if (fieldInvalid[field]) return "input error-border";
        if (!isEmpty(value)) return "input success-border";
        return "input";
    };

    async function handleSignup(e) {
        e.preventDefault();
        if (!formValid || loading) return;

        setTouched({
            email: true,
            firstName: true,
            lastName: true,
            shift: true,
            pin: true,
            confirmPin: true,
        });

        setLoading(true);

        try {
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, firstName, lastName, shift, pin }),
            });

            const result = await res.json();
            if (!res.ok) {
                showToast(result.message || "Signup failed.", "error");
                setLoading(false);
                return;
            }

            showToast(
                "✅ Account created! Please verify your email before logging in.",
                "success"
            );

            setTimeout(() => {
                window.location.href = "/login";
            }, 3500);
        } catch (err) {
            showToast("Network error. Please try again.", "error");
            setLoading(false);
        }
    }

    // While checking session
    if (loadingAuth) {
        return (
            <main className="signup-container">
                <div className="card">Checking session...</div>
            </main>
        );
    }

    return (
        <main className="signup-container">
            <div className="card">
                <h2>Create an Account</h2>
                <form onSubmit={handleSignup}>
                    {/* Email */}
                    <div className="field-group">
                        <label className="field-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            placeholder="Enter your email"
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => markTouched("email")}
                            className={borderClass("email", email)}
                        />
                        <p className="info-text">
                            You’ll need to verify this email before logging in.
                        </p>
                    </div>

                    {/* First Name */}
                    <div className="field-group">
                        <label className="field-label">First Name</label>
                        <input
                            value={firstName}
                            placeholder="Enter your first name"
                            onChange={(e) => setFirstName(e.target.value)}
                            onBlur={() => markTouched("firstName")}
                            className={borderClass("firstName", firstName)}
                        />
                    </div>

                    {/* Last Name */}
                    <div className="field-group">
                        <label className="field-label">Last Name</label>
                        <input
                            value={lastName}
                            placeholder="Enter your last name"
                            onChange={(e) => setLastName(e.target.value)}
                            onBlur={() => markTouched("lastName")}
                            className={borderClass("lastName", lastName)}
                        />
                    </div>

                    {/* Shift */}
                    <div className="field-group">
                        <label className="field-label">Shift</label>
                        <select
                            value={shift}
                            onChange={(e) => setShift(e.target.value)}
                            onBlur={() => markTouched("shift")}
                            className={borderClass("shift", shift)}
                        >
                            <option value="">Select Shift</option>
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="night">Night</option>
                        </select>
                    </div>

                    {/* PIN */}
                    <div className="field-group">
                        <label className="field-label">6-digit PIN</label>
                        <input
                            type={showPin ? "text" : "password"}
                            value={pin}
                            placeholder="Enter 6 digits"
                            onChange={(e) => setPin(e.target.value)}
                            onBlur={() => markTouched("pin")}
                            maxLength={6}
                            className={borderClass("pin", pin)}
                        />
                        {touched.pin && pinMessage && (
                            <p className="error-text">{pinMessage}</p>
                        )}
                    </div>

                    {/* Confirm PIN */}
                    <div className="field-group">
                        <label className="field-label">Confirm PIN</label>
                        <input
                            type={showPin ? "text" : "password"}
                            value={confirmPin}
                            placeholder="Re-enter PIN"
                            onChange={(e) => setConfirmPin(e.target.value)}
                            onBlur={() => markTouched("confirmPin")}
                            maxLength={6}
                            className={borderClass("confirmPin", confirmPin)}
                        />
                        {touched.confirmPin && confirmPinMessage && (
                            <p className="error-text">{confirmPinMessage}</p>
                        )}
                    </div>

                    {/* Show/Hide PIN toggle */}
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
                        {loading ? <span className="spinner fade-in"></span> : "Sign Up"}
                    </button>
                </form>
            </div>

            {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

            <style jsx>{`
        .signup-container {
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
        .input, select {
          width: 100%;
          max-width: 100%;
          padding: 0.65rem 0.7rem;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          transition: border-color 0.15s;
          font-size: 1rem;
        }
        .input:focus, select:focus { border-color: #0070f3; outline: none; }
        .error-border { border-color: #dc2626; }
        .success-border { border-color: #16a34a; }
        .error-text {
          font-size: 0.8rem;
          color: #b91c1c;
          margin-top: 0.35rem;
        }
        .info-text {
          font-size: 0.8rem;
          color: #374151;
          margin-top: 0.25rem;
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
          overflow: hidden;
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

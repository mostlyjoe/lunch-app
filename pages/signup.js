// pages/signup.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

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
  const [touched, setTouched] = useState({});
  const [loadingAuth, setLoadingAuth] = useState(true);

  // ✅ Redirect if user already signed in
  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        window.location.href = "/menu";
      } else {
        setLoadingAuth(false);
      }
    }
    checkUser();
  }, []);

  const markTouched = (field) => setTouched((t) => ({ ...t, [field]: true }));

  // ✅ Validation helpers
  const isEmpty = (v) => String(v).trim().length === 0;
  const isEmailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isNameValid = (v) => /^[A-Za-z' -]+$/.test(v.trim());

  const fieldInvalid = {
    email: touched.email && (!isEmailValid(email) || isEmpty(email)),
    firstName: touched.firstName && (!isNameValid(firstName) || isEmpty(firstName)),
    lastName: touched.lastName && (!isNameValid(lastName) || isEmpty(lastName)),
    shift: touched.shift && isEmpty(shift),
    pin: touched.pin && !/^\d{6}$/.test(pin),
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

  // ✅ Signup handler with unified toasts
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
        toast.error(result.message || "Signup failed.");
        setLoading(false);
        return;
      }

      // ✅ Success toast using global style
      toast.success(
        "Account created! Please check your email to verify before logging in."
      );

      // ✅ Redirect after 3s
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } catch (err) {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  }

  // While checking session
  if (loadingAuth) {
    return (
      <main className="signup-container">
        <div className="card authCard">Checking session...</div>
      </main>
    );
  }

  return (
    <main className="signup-container">
      <div className="card authCard">
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
              You’ll receive a verification email before logging in.
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

          {/* Show/Hide PIN */}
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

          <button type="submit" disabled={!formValid || loading}>
            {loading ? <span className="spinner fade-in"></span> : "Sign Up"}
          </button>
        </form>
      </div></main>
  );
}

// pages/under-construction.js
import Link from "next/link";

export default function UnderConstruction() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "720px", background: "white", borderRadius: "16px", padding: "28px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Under construction</h1>
        <p style={{ marginTop: "10px", lineHeight: 1.6 }}>
          We&apos;re doing some maintenance and improvements. Please check back soon.
        </p>

        <div style={{ marginTop: "18px", padding: "12px 14px", borderRadius: "12px", background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <div style={{ fontWeight: 700, marginBottom: "6px" }}>Admins</div>
          <div style={{ lineHeight: 1.5 }}>
            If you&apos;re an admin, you can still sign in.
          </div>
          <div style={{ marginTop: "10px" }}>
            <Link href="/login" style={{ color: "#b91c1c", fontWeight: 700, textDecoration: "underline" }}>
              Go to admin login
            </Link>
          </div>
        </div>

        <div style={{ marginTop: "14px", color: "#6b7280", fontSize: "0.95rem" }}>
          Thanks for your patience.
        </div>
      </div>
    </main>
  );
}

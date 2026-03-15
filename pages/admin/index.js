// pages/admin/index.js
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getProfile } from "../../lib/db/profiles";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const profile = await getProfile(user.id);
        if (!profile?.is_admin) {
          setChecking(false);
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    }

    load();
  }, []);

  if (checking) return <p style={{ padding: "2rem" }}>Loading admin dashboard...</p>;
  if (!isAdmin) return <p style={{ padding: "2rem" }}>❌ Access denied.</p>;

  return (
    <main className="admin-menu-page" style={{ paddingTop: "2rem" }}>
      <div className="table-card" style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="header-row">
          <div>
            <h2>Admin Dashboard</h2>
            <p className="placeholder" style={{ marginTop: 6 }}>
              Reusable items now live in Catalog. Actual dated menu entries live in Menu Offerings.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <Link href="/admin/catalog" className="btn" style={{ textAlign: "center" }}>
            Reusable Catalog
          </Link>

          <Link href="/admin/menu" className="btn" style={{ textAlign: "center" }}>
            Menu Offerings
          </Link>

          <Link href="/admin/orders" className="btn" style={{ textAlign: "center" }}>
            View Orders
          </Link>

          <Link href="/admin/orders-by-shift" className="btn" style={{ textAlign: "center" }}>
            Orders by Shift
          </Link>

          <Link href="/admin/profiles" className="btn" style={{ textAlign: "center" }}>
            User Profiles
          </Link>
        </div>
      </div>
    </main>
  );
}
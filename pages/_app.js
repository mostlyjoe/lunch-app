// pages/_app.js
import "../styles/globals.css"; // ✅ Unified global styles

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";

import NavBar from "../components/NavBar";
import { supabase } from "../lib/supabaseClient";
import { getProfile } from "../lib/db/profiles";

/**
 * Milestone 0: Site-wide "Under Construction" gate
 * - Everyone is redirected to /under-construction
 * - ONLY users whose profiles.is_admin === true can access the rest of the site
 *
 * Notes:
 * - This is a client-side guard (Pages Router). It is strong enough for a temporary lock while you refactor.
 * - You still have RLS + auth for real security (this just gates navigation/UI).
 */
function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // gate: "checking" -> "admin" | "blocked"
  const [gate, setGate] = useState({ status: "checking", isAdmin: false });

  const allowlist = useMemo(() => {
    // Routes that should always be reachable so admins can sign in / recover.
    // Non-admins can reach them too, but anything else redirects to /under-construction.
    return new Set([
      "/under-construction",
      "/login",
      "/signup",
    ]);
  }, []);

  // ✅ Keep session state consistent (redirect to homepage when logged out)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // ✅ Redirect to homepage instead of login
        window.location.href = "/";
      }

      // Re-check gate on auth changes (sign-in / token refresh / etc.)
      if (session?.user?.id) {
        // fire-and-forget; we also run a check on mount + on route changes below
        (async () => {
          try {
            const prof = await getProfile(session.user.id);
            const isAdmin = !!prof?.is_admin;
            setGate({ status: isAdmin ? "admin" : "blocked", isAdmin });
          } catch {
            setGate({ status: "blocked", isAdmin: false });
          }
        })();
      } else {
        setGate({ status: "blocked", isAdmin: false });
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // ✅ Gate check on mount + whenever route changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session?.user?.id) {
          if (!cancelled) setGate({ status: "blocked", isAdmin: false });
          return;
        }

        const prof = await getProfile(session.user.id);
        const isAdmin = !!prof?.is_admin;

        if (!cancelled) setGate({ status: isAdmin ? "admin" : "blocked", isAdmin });
      } catch {
        if (!cancelled) setGate({ status: "blocked", isAdmin: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router.pathname]);

  // ✅ Redirect non-admins away from anything not allowlisted
  useEffect(() => {
    if (gate.status === "checking") return;

    const path = router.pathname;

    // allow listed pages always reachable
    if (allowlist.has(path)) return;

    // non-admin => redirect to construction
    if (!gate.isAdmin) {
      // avoid redirect loops
      if (path !== "/under-construction") {
        router.replace("/under-construction");
      }
    }
  }, [gate.status, gate.isAdmin, router.pathname, allowlist]);

  // ✅ While checking, render nothing (prevents "flash" of real pages)
  if (gate.status === "checking") {
    return (
      <>
        <main style={{ minHeight: "100vh", backgroundColor: "#fafafa", color: "#111" }} />
        <Toaster />
      </>
    );
  }

  const isAdmin = gate.isAdmin;
  const isConstruction = router.pathname === "/under-construction";

  return (
    <>
      {/* ✅ Show Navbar ONLY for admins (keeps non-admins from navigating around) */}
      {isAdmin && !isConstruction ? <NavBar /> : null}

      {/* ✅ Page content */}
      <main style={{ minHeight: "100vh", backgroundColor: "#fafafa", color: "#111" }}>
        <Component {...pageProps} />
      </main>

      {/* ✅ Toast notifications site-wide */}
      <Toaster
        position="top-center"
        toastOptions={{
          success: {
            duration: 2500,
            style: {
              background: "#d1fae5",
              color: "#065f46",
              borderRadius: "8px",
              fontWeight: 600,
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "8px",
              fontWeight: 600,
            },
          },
          style: {
            fontFamily: "Roboto, sans-serif",
            fontSize: "0.95rem",
          },
        }}
      />
    </>
  );
}

export default MyApp;

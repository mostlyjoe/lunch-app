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
 * - This is a client-side guard (Pages Router). Good for temporary lock while refactoring.
 * - Your real security is still Supabase Auth + RLS.
 */
export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // gate: "checking" -> isAdmin true/false
  const [gate, setGate] = useState({ status: "checking", isAdmin: false });

  const allowlist = useMemo(() => {
    // Routes always reachable (so people can sign in / recover)
    return new Set(["/under-construction", "/login", "/signup"]);
  }, []);

  // Keep session state consistent (your existing behavior)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-check gate on auth changes (sign-in / token refresh / etc.)
      if (session?.user?.id) {
        (async () => {
          try {
            const prof = await getProfile(session.user.id);
            const isAdmin = !!prof?.is_admin;
            setGate({ status: "ready", isAdmin });
          } catch {
            setGate({ status: "ready", isAdmin: false });
          }
        })();
      } else {
        setGate({ status: "ready", isAdmin: false });
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Gate check on mount + whenever route changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session?.user?.id) {
          if (!cancelled) setGate({ status: "ready", isAdmin: false });
          return;
        }

        const prof = await getProfile(session.user.id);
        const isAdmin = !!prof?.is_admin;

        if (!cancelled) setGate({ status: "ready", isAdmin });
      } catch {
        if (!cancelled) setGate({ status: "ready", isAdmin: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router.pathname]);

  // Redirect non-admins away from anything not allowlisted
  useEffect(() => {
    if (gate.status !== "ready") return;

    const path = router.pathname;

    // allowlisted pages always reachable
    if (allowlist.has(path)) return;

    // non-admin => redirect to construction
    if (!gate.isAdmin && path !== "/under-construction") {
      router.replace("/under-construction");
    }
  }, [gate.status, gate.isAdmin, router, allowlist]);

  // While checking, render a blank shell (prevents "flash" of real pages)
  if (gate.status !== "ready") {
    return (
      <>
        <main className="appMain" />
        <Toaster
          position="top-center"
          toastOptions={{
            className: "toastBase",
            success: { className: "toastBase toastSuccess" },
            error: { className: "toastBase toastError" },
          }}
        />
      </>
    );
  }

  const isAllowlisted = allowlist.has(router.pathname);

  return (
    <>
      {/* Only show NavBar to admins, and never on allowlisted pages */}
      {gate.isAdmin && !isAllowlisted ? <NavBar /> : null}

      <main className="appMain">
        <Component {...pageProps} />
      </main>

      <Toaster
        position="top-center"
        toastOptions={{
          className: "toastBase",
          success: { className: "toastBase toastSuccess" },
          error: { className: "toastBase toastError" },
        }}
      />
    </>
  );
}
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
 * - Admins can access the full site
 * - One specific non-admin profile can also access normal user pages for testing
 *
 * Notes:
 * - This is a client-side guard (Pages Router). Good for temporary lock while refactoring.
 * - Your real security is still Supabase Auth + RLS.
 * - This DOES NOT make the whitelisted user an admin.
 */

// ✅ Change these to the exact profile name you want to allow through the gate
const TEST_USER_FIRST_NAME = "Jay";
const TEST_USER_LAST_NAME = "Hernandez";

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function isWhitelistedNonAdmin(profile) {
  const first = normalizeName(profile?.first_name);
  const last = normalizeName(profile?.last_name);

  return (
    first === normalizeName(TEST_USER_FIRST_NAME) &&
    last === normalizeName(TEST_USER_LAST_NAME)
  );
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // gate:
  // status: "checking" | "ready"
  // isAdmin: true/false
  // canAccessSite: true/false
  const [gate, setGate] = useState({
    status: "checking",
    isAdmin: false,
    canAccessSite: false,
  });

  const allowlist = useMemo(() => {
    // Routes always reachable (so people can sign in / recover)
    return new Set(["/under-construction", "/login", "/signup"]);
  }, []);

  async function evaluateGateForUser(userId) {
    try {
      if (!userId) {
        return {
          status: "ready",
          isAdmin: false,
          canAccessSite: false,
        };
      }

      const prof = await getProfile(userId);

      const isAdmin = !!prof?.is_admin;
      const isWhitelisted = isWhitelistedNonAdmin(prof);

      return {
        status: "ready",
        isAdmin,
        canAccessSite: isAdmin || isWhitelisted,
      };
    } catch {
      return {
        status: "ready",
        isAdmin: false,
        canAccessSite: false,
      };
    }
  }

  // Keep session state consistent
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextGate = await evaluateGateForUser(session?.user?.id || null);
      setGate(nextGate);
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

        const nextGate = await evaluateGateForUser(session?.user?.id || null);

        if (!cancelled) {
          setGate(nextGate);
        }
      } catch {
        if (!cancelled) {
          setGate({
            status: "ready",
            isAdmin: false,
            canAccessSite: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router.pathname]);

  // Redirect blocked users away from anything not allowlisted
  useEffect(() => {
    if (gate.status !== "ready") return;

    const path = router.pathname;

    // allowlisted pages always reachable
    if (allowlist.has(path)) return;

    // blocked => redirect to construction
    if (!gate.canAccessSite && path !== "/under-construction") {
      router.replace("/under-construction");
    }
  }, [gate.status, gate.canAccessSite, router, allowlist]);

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
      {/* Show NavBar to admins and the temporary whitelisted non-admin user */}
      {gate.canAccessSite && !isAllowlisted ? <NavBar /> : null}

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
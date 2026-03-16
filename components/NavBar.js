// components/NavBar.js
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const MOBILE_BREAKPOINT = 900;

export default function NavBar() {
  const [hasMounted, setHasMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewportKey, setViewportKey] = useState(0);
  const [isCompactNav, setIsCompactNav] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchUserAndProfile(userOverride = null) {
      try {
        let authUser = userOverride;

        if (!authUser) {
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();

          authUser = currentUser || null;
        }

        if (!authUser) {
          if (!cancelled) {
            setUser(null);
            setIsAdmin(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", authUser.id)
          .maybeSingle();

        if (!cancelled) {
          setUser(authUser);
          setIsAdmin(!!profile?.is_admin);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsAdmin(false);
        }
      }
    }

    fetchUserAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserAndProfile(session?.user || null);
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      const compact = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsCompactNav(compact);
      setViewportKey((prev) => prev + 1);

      if (!compact) {
        setMenuOpen(false);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setMenuOpen(false);
    window.location.href = "/";
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const logoLink = user ? "/menu" : "/";

  const desktopLinks = useMemo(() => {
    if (!user) {
      return (
        <>
          <Link href="/login" onClick={closeMenu} className="nav-inline-link">
            Sign In
          </Link>
          <Link href="/signup" onClick={closeMenu} className="nav-inline-link">
            Sign Up
          </Link>
        </>
      );
    }

    if (!isAdmin) {
      return (
        <>
          <Link href="/menu" onClick={closeMenu} className="nav-inline-link">
            Menu
          </Link>
          <Link href="/orders" onClick={closeMenu} className="nav-inline-link nav-nowrap">
            My Orders
          </Link>
          <Link href="/profile" onClick={closeMenu} className="nav-inline-link">
            Profile
          </Link>
          <button
            onClick={() => {
              handleSignOut();
              closeMenu();
            }}
            className="link-button nav-inline-link"
            type="button"
          >
            Sign Out
          </button>
        </>
      );
    }

    return (
      <>
        <Link href="/menu" onClick={closeMenu} className="nav-inline-link">
          Menu
        </Link>
        <Link href="/admin/catalog" onClick={closeMenu} className="nav-inline-link">
          Catalog
        </Link>
        <Link href="/admin/menu" onClick={closeMenu} className="nav-inline-link nav-nowrap">
          Menu Offerings
        </Link>
        <Link
          href="/admin/orders-by-shift"
          onClick={closeMenu}
          className="nav-inline-link nav-nowrap"
        >
          Orders by Shift
        </Link>
        <Link href="/admin/profiles" onClick={closeMenu} className="nav-inline-link nav-nowrap">
          User Profiles
        </Link>
        <button
          onClick={() => {
            handleSignOut();
            closeMenu();
          }}
          className="link-button nav-inline-link"
          type="button"
        >
          Sign Out
        </button>
      </>
    );
  }, [user, isAdmin]);

  const mobileLinks = useMemo(() => {
    if (!user) {
      return (
        <>
          <Link href="/login" onClick={closeMenu}>
            Sign In
          </Link>
          <Link href="/signup" onClick={closeMenu}>
            Sign Up
          </Link>
        </>
      );
    }

    if (!isAdmin) {
      return (
        <>
          <Link href="/menu" onClick={closeMenu}>
            Menu
          </Link>
          <Link href="/orders" onClick={closeMenu}>
            My Orders
          </Link>
          <Link href="/profile" onClick={closeMenu}>
            Profile
          </Link>
          <button
            onClick={() => {
              handleSignOut();
              closeMenu();
            }}
            className="dropdown-signout"
            type="button"
          >
            Sign Out
          </button>
        </>
      );
    }

    return (
      <>
        <Link href="/menu" onClick={closeMenu}>
          Menu
        </Link>
        <Link href="/admin/catalog" onClick={closeMenu}>
          Catalog
        </Link>
        <Link href="/admin/menu" onClick={closeMenu}>
          Menu Offerings
        </Link>
        <Link href="/admin/orders-by-shift" onClick={closeMenu}>
          Orders by Shift
        </Link>
        <Link href="/admin/profiles" onClick={closeMenu}>
          User Profiles
        </Link>
        <button
          onClick={() => {
            handleSignOut();
            closeMenu();
          }}
          className="dropdown-signout"
          type="button"
        >
          Sign Out
        </button>
      </>
    );
  }, [user, isAdmin]);

  if (!hasMounted) return null;

  return (
    <nav key={viewportKey} className="navbar">
      <div className="navbar-inner">
        <div className="nav-center">
          <Link
            href={logoLink}
            onClick={closeMenu}
            className="logo-box"
            aria-label="Go to home or menu"
          >
            <div className="logo-inner">
              <span className="logo-text">LittlePorkStop</span>
            </div>
          </Link>
        </div>

        <div className="nav-right">
          {!isCompactNav ? (
            <div className="nav-links">{desktopLinks}</div>
          ) : (
            <button
              className={`menu-toggle ${menuOpen ? "open" : ""}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              type="button"
            >
              <span className="bar top"></span>
              <span className="bar middle"></span>
              <span className="bar bottom"></span>
            </button>
          )}
        </div>
      </div>

      {isCompactNav && menuOpen && (
        <div id="mobile-menu" className="mobile-menu">
          {mobileLinks}
        </div>
      )}
    </nav>
  );
}
// components/NavBar.js
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Navigation() {
    const [hasMounted, setHasMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [viewportKey, setViewportKey] = useState(0);

    useEffect(() => setHasMounted(true), []);

    useEffect(() => {
        async function fetchUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                setUser(user);
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", user.id)
                    .maybeSingle();
                if (profile?.is_admin) setIsAdmin(true);
            } else {
                setUser(null);
                setIsAdmin(false);
            }
        }
        fetchUser();
    }, []);

    // 🔧 Handle foldable / viewport height change
    useEffect(() => {
        const handleResize = () => {
            setViewportKey((prev) => prev + 1);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (!hasMounted) return null;

    async function handleSignOut() {
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setMenuOpen(false);
        window.location.href = "/";
    }

    const closeMenu = () => setMenuOpen(false);
    const logoLink = user ? "/menu" : "/";

    return (
        <nav key={viewportKey} className="navbar">
            <div className="navbar-inner">
                {/* CENTER (Logo) */}
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

                {/* RIGHT (Links + Hamburger) */}
                <div className="nav-right">
                    <div className="nav-links">
                        {!user && (
                            <>
                                <Link href="/login" onClick={closeMenu}>Sign In</Link>
                                <Link href="/signup" onClick={closeMenu}>Sign Up</Link>
                            </>
                        )}
                        {user && !isAdmin && (
                            <>
                                <Link href="/menu" onClick={closeMenu}>Menu</Link>
                                <Link href="/orders" onClick={closeMenu}>My Orders</Link>
                                <Link href="/profile" onClick={closeMenu}>Profile</Link>
                                <button
                                    onClick={() => {
                                        handleSignOut();
                                        closeMenu();
                                    }}
                                    className="link-button"
                                >
                                    Sign Out
                                </button>
                            </>
                        )}
                        {user && isAdmin && (
                            <>
                                <Link href="/menu" onClick={closeMenu}>Menu</Link>
                                <Link href="/admin/menu" onClick={closeMenu}>Menu Management</Link>
                                <Link href="/admin/orders-by-shift" onClick={closeMenu}>Orders by Shift</Link>
                                <Link href="/admin/profiles" onClick={closeMenu}>User Profiles</Link>
                                <button
                                    onClick={() => {
                                        handleSignOut();
                                        closeMenu();
                                    }}
                                    className="link-button"
                                >
                                    Sign Out
                                </button>
                            </>
                        )}
                    </div>

                    {/* Hamburger button */}
                    <button
                        className={`menu-toggle ${menuOpen ? "open" : ""}`}
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                    >
                        <span className="bar top"></span>
                        <span className="bar middle"></span>
                        <span className="bar bottom"></span>
                    </button>
                </div>
            </div>

            {/* MOBILE MENU */}
            {menuOpen && (
                <div id="mobile-menu" className="mobile-menu">
                    {!user && (
                        <>
                            <Link href="/login" onClick={closeMenu}>Sign In</Link>
                            <Link href="/signup" onClick={closeMenu}>Sign Up</Link>
                        </>
                    )}
                    {user && !isAdmin && (
                        <>
                            <Link href="/menu" onClick={closeMenu}>Menu</Link>
                            <Link href="/orders" onClick={closeMenu}>My Orders</Link>
                            <Link href="/profile" onClick={closeMenu}>Profile</Link>
                            <button
                                onClick={() => {
                                    handleSignOut();
                                    closeMenu();
                                }}
                                className="dropdown-signout"
                            >
                                Sign Out
                            </button>
                        </>
                    )}
                    {user && isAdmin && (
                        <>
                            <Link href="/menu" onClick={closeMenu}>Menu</Link>
                            <Link href="/admin/menu" onClick={closeMenu}>Menu Management</Link>
                            <Link href="/admin/orders-by-shift" onClick={closeMenu}>Orders by Shift</Link>
                            <Link href="/admin/profiles" onClick={closeMenu}>User Profiles</Link>
                            <button
                                onClick={() => {
                                    handleSignOut();
                                    closeMenu();
                                }}
                                className="dropdown-signout"
                            >
                                Sign Out
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ✨ Styles preserved exactly */}</nav>
    );
}
// components/NavBar.js
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Navigation() {
  const [hasMounted, setHasMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewportKey, setViewportKey] = useState(0);

  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.is_admin) setIsAdmin(true);
        else setIsAdmin(false);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    }

    fetchUser();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setViewportKey((prev) => prev + 1);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!hasMounted) return null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setMenuOpen(false);
    window.location.href = "/";
  }

  const closeMenu = () => setMenuOpen(false);
  const logoLink = user ? "/menu" : "/";

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
          <div className="nav-links">
            {!user && (
              <>
                <Link href="/login" onClick={closeMenu}>
                  Sign In
                </Link>
                <Link href="/signup" onClick={closeMenu}>
                  Sign Up
                </Link>
              </>
            )}

            {user && !isAdmin && (
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
                  className="link-button"
                >
                  Sign Out
                </button>
              </>
            )}

            {user && isAdmin && (
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
                  className="link-button"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>

          <button
            className={`menu-toggle ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className="bar top"></span>
            <span className="bar middle"></span>
            <span className="bar bottom"></span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="mobile-menu">
          {!user && (
            <>
              <Link href="/login" onClick={closeMenu}>
                Sign In
              </Link>
              <Link href="/signup" onClick={closeMenu}>
                Sign Up
              </Link>
            </>
          )}

          {user && !isAdmin && (
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
              >
                Sign Out
              </button>
            </>
          )}

          {user && isAdmin && (
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
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
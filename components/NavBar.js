import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Bars3Icon } from "@heroicons/react/24/solid";

export default function Navigation() {
    const [hasMounted, setHasMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

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

    if (!hasMounted) return null; // ✅ prevents hydration mismatch

    async function handleSignOut() {
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setMenuOpen(false);
        window.location.href = "/login";
    }

    const closeMenu = () => setMenuOpen(false);

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                {/* CENTER (Logo) */}
                <div className="nav-center">
                    <Link
                        href="/menu"
                        onClick={closeMenu}
                        className="logo-box"
                        aria-label="Go to Menu"
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
                                <Link href="/login">Sign In</Link>
                                <Link href="/signup">Sign Up</Link>
                            </>
                        )}

                        {user && !isAdmin && (
                            <>
                                <Link href="/menu">Menu</Link>
                                <Link href="/orders">My Orders</Link>
                                <Link href="/profile">Profile</Link>
                                <button onClick={handleSignOut} className="link-button">
                                    Sign Out
                                </button>
                            </>
                        )}

                        {user && isAdmin && (
                            <>
                                <Link href="/menu">Menu</Link>
                                <Link href="/admin/menu">Menu Management</Link>
                                <Link href="/admin/orders-by-shift">Orders by Shift</Link>
                                <Link href="/admin/profiles">User Profiles</Link>
                                <button onClick={handleSignOut} className="link-button">
                                    Sign Out
                                </button>
                            </>
                        )}
                    </div>

                    {/* Hamburger (always far right) */}
                    <button
                        className="menu-toggle"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                    >
                        <Bars3Icon
                            style={{
                                color: "#ffffff",
                                fill: "#ffffff",
                                stroke: "#ffffff",
                                strokeWidth: "2px",
                                width: "28px",
                                height: "28px",
                            }}
                        />
                    </button>
                </div>
            </div>

            {/* MOBILE DROPDOWN */}
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
                            <button onClick={handleSignOut} className="dropdown-signout">
                                Sign Out
                            </button>
                        </>
                    )}

                    {user && isAdmin && (
                        <>
                            <Link href="/menu" onClick={closeMenu}>
                                Menu
                            </Link>
                            <Link href="/admin/menu" onClick={closeMenu}>
                                Menu Management
                            </Link>
                            <Link href="/admin/orders-by-shift" onClick={closeMenu}>
                                Orders by Shift
                            </Link>
                            <Link href="/admin/profiles" onClick={closeMenu}>
                                User Profiles
                            </Link>
                            <button onClick={handleSignOut} className="dropdown-signout">
                                Sign Out
                            </button>
                        </>
                    )}
                </div>
            )}

            <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap");

        .navbar {
          background: #fff176;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
        }

        .navbar-inner {
          display: grid;
          grid-template-columns: 1fr auto; /* logo center, right section flexible */
          align-items: center;
          padding: 0.6rem 1rem;
          gap: 0.5rem;
        }

        .nav-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .nav-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1rem;
          margin-left: auto;
        }

        .logo-box {
          text-decoration: none;
        }
        .logo-inner {
          background: linear-gradient(135deg, #ffeb3b 0%, #ffd54f 100%);
          padding: 0.4rem 1.4rem;
          border-radius: 0.6rem;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }
        .logo-inner:hover {
          transform: scale(1.03);
        }
        .logo-text {
          font-family: "Impact", "Arial Black", sans-serif;
          font-size: 1.5rem;
          font-weight: 900;
          color: #c62828;
          -webkit-text-stroke: 0.5px white;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .nav-links {
          display: flex;
          gap: 1.1rem;
          font-family: "Roboto", sans-serif;
        }
        .nav-links a {
          color: #b71c1c;
          font-weight: 400;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .nav-links a:hover {
          color: #d32f2f;
        }

        .link-button {
          background: #b71c1c;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
          font-family: "Roboto", sans-serif;
          font-weight: 400;
          transition: background 0.2s ease;
        }
        .link-button:hover {
          background: #9a0007;
        }

        .menu-toggle {
          background: #b71c1c;
          border: none;
          width: 44px;
          height: 44px;
          display: none; /* show only on mobile */
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .mobile-menu {
          background: #fff176;
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1rem 0 1.25rem;
          border-top: 1px solid #f1f1f1;
          font-family: "Roboto", sans-serif;
          animation: slideDown 0.25s ease forwards;
        }
        .mobile-menu a {
          text-decoration: none;
          color: #b71c1c;
          font-weight: 400;
          font-size: 1rem;
        }
        .dropdown-signout {
          background: #b71c1c;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-weight: 400;
        }
        .dropdown-signout:hover {
          background: #9a0007;
        }

        @media (max-width: 900px) {
          .nav-links {
            display: none; /* hide links */
          }
          .menu-toggle {
            display: inline-flex; /* show hamburger */
          }
          .mobile-menu {
            display: flex; /* visible when open */
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </nav>
    );
}

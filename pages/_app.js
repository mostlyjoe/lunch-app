// pages/_app.js
import "../styles/globals.css"; // ✅ Unified global styles
import NavBar from "../components/NavBar";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function MyApp({ Component, pageProps }) {
    // ✅ Keep session state consistent (redirect to homepage when logged out)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_OUT") {
                // ✅ Redirect to homepage instead of login
                window.location.href = "/";
            }
        });

        return () => subscription?.unsubscribe();
    }, []);

    return (
        <>
            {/* ✅ Navbar stays globally visible */}
            <NavBar />

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

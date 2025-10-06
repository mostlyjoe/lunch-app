// pages/index.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function HomeRedirect() {
    const router = useRouter();

    useEffect(() => {
        async function checkUser() {
            const { data } = await supabase.auth.getUser();
            const user = data?.user;

            // Not logged in → go to login page
            if (!user) {
                router.replace("/login");
                return;
            }

            // Fetch profile to check admin flag
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .maybeSingle();

            if (error) {
                console.error("Profile fetch error:", error);
                router.replace("/menu"); // fallback
                return;
            }

            // Redirect based on admin flag
            if (profile?.is_admin) {
                router.replace("/admin/menu");
            } else {
                router.replace("/menu");
            }
        }

        checkUser();
    }, [router]);

    return (
        <main className="redirect-page">
            <p>Redirecting...</p>

            <style jsx>{`
        .redirect-page {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.25rem;
          color: #555;
          background: #f9fafb;
        }
      `}</style>
        </main>
    );
}

// pages/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
    const router = useRouter();
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        async function checkUser() {
            const { data } = await supabase.auth.getUser();
            const currentUser = data?.user;
            if (currentUser) {
                // Fetch profile to check admin flag
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", currentUser.id)
                    .maybeSingle();

                if (profile?.is_admin) {
                    router.replace("/admin/menu");
                } else {
                    router.replace("/menu");
                }
            } else {
                setCheckingAuth(false);
            }
            setUser(currentUser);
        }
        checkUser();
    }, [router]);

    if (checkingAuth) {
        return (
            <main className="redirect-page">
                <p>Loading...</p>
            </main>
        );
    }

    return (
        <main className="home-container">
            <div className="welcome-section">
                <h1>Welcome to LunchApp!</h1>
                <p>
                    We’re happy to provide this lunch ordering app exclusively
                    for your company. We hope you’ll take a chance to try it out
                    and enjoy our first featured meal — the{" "}
                    <strong>Thanksgiving Dinner!</strong>
                </p>
            </div>

            <div className="image-wrapper">
                <Image
                    src="/lpsturkeyapp.jpg"
                    alt="Thanksgiving Dinner Flyer"
                    width={800}
                    height={800}
                    priority
                />
            </div>

            <div className="button-row">
                <button onClick={() => router.push("/signup")} className="btn">
                    Sign Up
                </button>
                <button onClick={() => router.push("/login")} className="btn">
                    Login
                </button>
            </div>

            <style jsx>{`
                .home-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    background: #fffdee;
                    padding: 2rem;
                }

                .welcome-section {
                    max-width: 600px;
                    margin-bottom: 1.5rem;
                    color: #333;
                    font-family: "Roboto", sans-serif;
                }

                .welcome-section h1 {
                    font-size: 2rem;
                    color: #2e7d32; /* ✅ Green accent for consistency */
                    margin-bottom: 0.5rem;
                }

                .welcome-section p {
                    font-size: 1.1rem;
                    line-height: 1.6;
                }

                .image-wrapper {
                    width: 100%;
                    max-width: 600px;
                    margin: 1.5rem auto;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
                }

                :global(img) {
                    width: 100%;
                    height: auto;
                    object-fit: contain;
                }

                .button-row {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .btn {
                    background-color: #d32f2f;
                    color: white;
                    font-size: 1rem;
                    border: none;
                    border-radius: 8px;
                    padding: 0.75rem 1.5rem;
                    cursor: pointer;
                    font-family: "Roboto", sans-serif;
                    transition: background-color 0.2s ease;
                }

                .btn:hover {
                    background-color: #b71c1c;
                }

                @media (max-width: 600px) {
                    .welcome-section h1 {
                        font-size: 1.6rem;
                    }

                    .welcome-section p {
                        font-size: 1rem;
                    }

                    .btn {
                        width: 100%;
                        max-width: 280px;
                    }
                }

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

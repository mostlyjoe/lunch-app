import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [menuItems, setMenuItems] = useState([]);

  // Auth check
  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user;
      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (profile?.is_admin) router.replace("/admin/menu");
        else router.replace("/menu");
      } else {
        setCheckingAuth(false);
      }
      setUser(currentUser);
    }
    checkUser();
  }, [router]);

  // Fetch menu items
  useEffect(() => {
    async function fetchMenuItems() {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, title, image_url, is_active")
        .eq("is_active", true)
        .order("serve_date", { ascending: true });
      if (error) console.error("Error fetching menu items:", error.message);
      setMenuItems(data || []);
    }
    fetchMenuItems();
  }, []);

  if (checkingAuth) {
    return (
      <main className="redirect-page">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="app-container">
      {/* Fixed App Header */}
      <header className="app-header">
        <h1>Little Pork Stop</h1>
      </header>

      <section className="welcome">
        <h2>Welcome!</h2>
        <p>
          We’re happy to provide this lunch ordering site exclusively
          for Ampacet. We hope you’ll take a chance to try it out.
          Order your lunch right from your phone or desktop. Browse below to see
          what’s available today and the next few weeks, then sign up or log in to place your order.
        </p>
      </section>

      {/* ✅ Swipe-friendly carousel */}
      <section className="carousel-section">
        <div className="carousel-track">
          {[...menuItems, ...menuItems].map((item, i) => (
            <div key={i} className="carousel-card">
              <div className="img-box">
                <Image
                  src={item.image_url || "/no-image.png"}
                  alt={item.title}
                  width={260}
                  height={260}
                  loading="lazy"
                  unoptimized
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "16px",
                  }}
                />
              </div>
              <p className="card-title">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Buttons */}
      <div className="button-row">
        <button onClick={() => router.push("/signup")} className="btn pulse">
          Sign Up
        </button>
        <button onClick={() => router.push("/login")} className="btn">
          Log In
        </button>
      </div>

      <style jsx>{`
        /* General layout */
        .app-container {
          min-height: 100dvh;
          background: #fffdee;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          font-family: "Roboto", sans-serif;
          overflow-x: hidden;
          animation: fadeIn 0.6s ease-in-out;
          -webkit-font-smoothing: antialiased;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* App Header */
        .app-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background: #fff176;
          color: #b71c1c;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          padding: 0.75rem 1rem;
          z-index: 1000;
        }

        .app-header h1 {
          font-size: 1.4rem;
          font-family: "Impact", sans-serif;
          letter-spacing: 0.5px;
        }

        /* Welcome section */
        .welcome {
          margin-top: 5rem;
          max-width: 640px;
          padding: 0 1rem;
          color: #333;
        }

        .welcome h2 {
          color: #d32f2f;
          font-size: 1.8rem;
          margin-bottom: 0.5rem;
        }

        .welcome p {
          font-size: 1.05rem;
          line-height: 1.6;
        }

        /* Carousel section */
        .carousel-section {
          width: 100%;
          overflow: hidden;
          margin: 2rem 0;
        }

        .carousel-track {
          display: flex;
          animation: scrollLoop 30s linear infinite;
          will-change: transform;
          touch-action: pan-y;
          gap: 1rem;
        }

        @keyframes scrollLoop {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .carousel-section:hover .carousel-track {
          animation-play-state: paused;
        }

        .carousel-card {
          flex-shrink: 0;
          min-width: 260px;
          max-width: 260px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          padding: 0.5rem;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .carousel-card:hover {
          transform: scale(1.04);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .img-box {
          width: 100%;
          height: 240px;
          overflow: hidden;
          border-radius: 16px;
        }

        .card-title {
          margin-top: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          color: #444;
        }

        /* Buttons */
        .button-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn {
          background-color: #d32f2f;
          color: white;
          font-size: 1rem;
          border: none;
          border-radius: 10px;
          padding: 0.75rem 1.75rem;
          cursor: pointer;
          transition: background 0.25s ease, transform 0.25s ease;
          font-family: "Roboto", sans-serif;
        }

        .btn:hover {
          background-color: #b71c1c;
          transform: scale(1.05);
        }

        /* Subtle pulse for Sign Up */
        .pulse {
          animation: pulseAnim 2s ease-in-out infinite;
        }

        @keyframes pulseAnim {
          0%,
          100% {
            transform: scale(1);
            background-color: #d32f2f;
          }
          50% {
            transform: scale(1.05);
            background-color: #e53935;
          }
        }

        /* Loading state */
        .redirect-page {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100dvh;
          font-size: 1.25rem;
          color: #555;
          background: #f9fafb;
        }

        /* Responsive adjustments for foldables and mobile */
        @media (max-width: 768px) {
          .welcome h2 {
            font-size: 1.6rem;
          }
          .welcome p {
            font-size: 0.95rem;
          }
          .carousel-card {
            min-width: 220px;
            max-width: 220px;
          }
          .img-box {
            height: 200px;
          }
        }

        @media (min-width: 1200px) {
          .carousel-card {
            min-width: 300px;
            max-width: 300px;
          }
          .img-box {
            height: 280px;
          }
        }
      `}</style>
    </main>
  );
}

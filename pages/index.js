import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

  // Fetch active menu items
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

  // Auto-advance one image at a time
  useEffect(() => {
    if (menuItems.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % menuItems.length);
    }, 1500); // ~0.75s pause + quick slide
    return () => clearInterval(interval);
  }, [menuItems.length]);

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      // swipe threshold
      if (diff > 0) {
        // left swipe
        setCurrentIndex((prev) => (prev + 1) % menuItems.length);
      } else {
        // right swipe
        setCurrentIndex(
          (prev) => (prev - 1 + menuItems.length) % menuItems.length
        );
      }
    }
  };

  if (checkingAuth) {
    return (
      <main className="redirect-page">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="app-container">
      <header className="app-header">
        <h1>Little Pork Stop</h1>
      </header>

      <section className="welcome">
        <h2>Welcome!</h2>
        <p>
          Browse our latest lunch offerings — swipe left or right to explore
          what’s cooking! Sign up or log in to order your meal.
        </p>
      </section>

      {/* ✅ Single-image swipeable carousel */}
      <section
        className="carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="carousel-track"
          ref={trackRef}
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {menuItems.map((item, i) => (
            <div key={i} className="carousel-slide">
              <Image
                src={item.image_url || "/no-image.png"}
                alt={item.title}
                width={600}
                height={600}
                loading="lazy"
                unoptimized
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  borderRadius: "20px",
                }}
              />
              <p className="caption">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="button-row">
        <button onClick={() => router.push("/signup")} className="btn pulse">
          Sign Up
        </button>
        <button onClick={() => router.push("/login")} className="btn">
          Log In
        </button>
      </div>

      <style jsx>{`
        .app-container {
          min-height: 100dvh;
          background: #fffdee;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          font-family: "Roboto", sans-serif;
          overflow: hidden;
        }

        .app-header {
          position: fixed;
          top: 0;
          width: 100%;
          background: #fff176;
          color: #b71c1c;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          padding: 0.75rem 1rem;
          z-index: 10;
        }

        .app-header h1 {
          font-size: 1.4rem;
          font-family: "Impact", sans-serif;
          letter-spacing: 0.5px;
        }

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

        .carousel {
          position: relative;
          width: 100%;
          max-width: 700px;
          margin: 2rem 0;
          overflow: hidden;
          border-radius: 20px;
          touch-action: pan-y;
        }

        .carousel-track {
          display: flex;
          transition: transform 0.4s ease-in-out;
          width: 100%;
        }

        .carousel-slide {
          flex: 0 0 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .caption {
          margin-top: 0.5rem;
          font-weight: 600;
          color: #444;
        }

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
        }

        .btn:hover {
          background-color: #b71c1c;
          transform: scale(1.05);
        }

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

        @media (max-width: 600px) {
          .welcome h2 {
            font-size: 1.6rem;
          }
          .welcome p {
            font-size: 0.95rem;
          }
        }

        .redirect-page {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100dvh;
          font-size: 1.25rem;
          color: #555;
          background: #f9fafb;
        }
      `}</style>
    </main>
  );
}

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
  const [showHint, setShowHint] = useState(true);
  const intervalRef = useRef(null);
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

  // Auto scroll with pause on touch
  useEffect(() => {
    if (menuItems.length === 0) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % menuItems.length);
    }, 1800);
    return () => clearInterval(intervalRef.current);
  }, [menuItems.length]);

  const pauseAutoScroll = () => clearInterval(intervalRef.current);
  const resumeAutoScroll = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % menuItems.length);
    }, 1800);
  };

  // Swipe handlers
  const handleTouchStart = (e) => {
    pauseAutoScroll();
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => (touchEndX.current = e.touches[0].clientX);
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0)
        setCurrentIndex((prev) => (prev + 1) % menuItems.length);
      else
        setCurrentIndex(
          (prev) => (prev - 1 + menuItems.length) % menuItems.length
        );
    }
    resumeAutoScroll();
  };

  // Hide hint after 2s
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 2000);
    return () => clearTimeout(timer);
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


      <section className="welcome">
        <h2>Welcome!</h2>
        <p>
          We’re happy to provide this lunch ordering site exclusively
          for Ampacet. We hope you’ll take a chance to try it out.<br />
          Swipe through to see what's cooking, then sign up or log in to place
          your lunch order.
        </p>
      </section>

      {/* Carousel */}
      <section
        className="carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {menuItems.map((item, i) => (
            <div key={i} className="carousel-slide">
              <div className="img-container">
                <Image
                  src={item.image_url || "/no-image.png"}
                  alt={item.title}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 768px) 90vw, 600px"
                  style={{ objectFit: "contain", borderRadius: "16px" }}
                />
              </div>
              <p className="caption">{item.title}</p>
            </div>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="dots">
          {menuItems.map((_, i) => (
            <span
              key={i}
              className={`dot ${i === currentIndex ? "active" : ""}`}
            ></span>
          ))}
        </div>

        {/* Swipe hint */}
        {showHint && (
          <div className="swipe-hint">
            <span>← Swipe →</span>
          </div>
        )}
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

        .carousel {
          width: 100%;
          max-width: 650px;
          margin: 1.5rem auto;
          overflow: hidden;
          border-radius: 16px;
          position: relative;
          height: 45vh;
          max-height: 350px;
          touch-action: pan-y;
        }

        .carousel-track {
          display: flex;
          transition: transform 0.45s cubic-bezier(0.33, 1, 0.68, 1);
          width: 100%;
          height: 100%;
        }

        .carousel-slide {
          flex: 0 0 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .img-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: #fff;
          border-radius: 16px;
        }

        .caption {
          margin-top: 0.4rem;
          font-weight: 600;
          color: #444;
          font-size: 1rem;
        }

        .dots {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ccc;
          opacity: 0.7;
          transition: all 0.2s ease;
        }

        .dot.active {
          background: #d32f2f;
          transform: scale(1.3);
          opacity: 1;
        }

        .swipe-hint {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.8);
          padding: 0.25rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          color: #444;
          animation: fadeOut 2s ease forwards;
        }

        @keyframes fadeOut {
          0% {
            opacity: 1;
          }
          80% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
            visibility: hidden;
          }
        }

        .button-row {
          display: flex;
          gap: 1rem;
          margin: 1.2rem auto 2rem;
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

        @media (max-width: 768px) {
          .carousel {
            height: 35vh;
            max-height: 280px;
          }
          .welcome h2 {
            font-size: 1.6rem;
          }
          .welcome p {
            font-size: 0.95rem;
          }
          .caption {
            font-size: 0.9rem;
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

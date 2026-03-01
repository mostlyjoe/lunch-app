import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [showHint, setShowHint] = useState(true);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const intervalRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // 🔒 Auth check
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

  // 📦 Fetch menu items
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

  // 🔁 Auto-scroll
  useEffect(() => {
    if (menuItems.length === 0) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 1800);
    return () => clearInterval(intervalRef.current);
  }, [menuItems.length]);

  // 🧭 Seamless loop logic
  const handleTransitionEnd = () => {
    if (menuItems.length === 0) return;
    const total = menuItems.length;
    if (currentIndex === total + 1) {
      setTransitionEnabled(false);
      setCurrentIndex(1);
    }
  };

  useEffect(() => {
    if (!transitionEnabled) {
      const id = setTimeout(() => setTransitionEnabled(true), 50);
      return () => clearTimeout(id);
    }
  }, [transitionEnabled]);

  // 👆 Swipe handlers
  const pauseAutoScroll = () => clearInterval(intervalRef.current);
  const resumeAutoScroll = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 1800);
  };

  const handleTouchStart = (e) => {
    pauseAutoScroll();
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => (touchEndX.current = e.touches[0].clientX);
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      setCurrentIndex((prev) => (diff > 0 ? prev + 1 : prev - 1));
    }
    resumeAutoScroll();
  };

  // ⏳ Hide swipe hint
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

  // 🧩 Create cloned slides for seamless looping
  const slides =
    menuItems.length > 0
      ? [menuItems[menuItems.length - 1], ...menuItems, menuItems[0]]
      : [];

  return (
    <main className="app-container">
      <section className="welcome">
        <h2>Welcome!</h2>
        <p>
          We&apos;re happy to provide this lunch ordering site exclusively
          for Ampacet. Take a look below to see what&apos;s cooking — then sign
          up or log in to place your order!
        </p>
      </section>

      {/* 🎠 Carousel */}
      <section
        className="carousel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="carousel-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: transitionEnabled
              ? "transform 0.45s cubic-bezier(0.33, 1, 0.68, 1)"
              : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {slides.map((item, i) => (
            <div key={i} className="carousel-slide">
              <div className="img-container">
                <Image
                  src={item.image_url || "/no-image.png"}
                  alt={item.title}
                  width={600}
                  height={600}
                  priority={i === 0}
                  sizes="(max-width: 768px) 90vw, 600px"
                  className="homeCarouselImg"
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
              className={`dot ${
                (currentIndex - 1 + menuItems.length) % menuItems.length === i
                  ? "active"
                  : ""
              }`}
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

      {/* 🔘 Buttons */}
      <div className="button-row">
        <button onClick={() => router.push("/signup")} className="btn pulse">
          Sign Up
        </button>
        <button onClick={() => router.push("/login")} className="btn">
          Log In
        </button>
      </div></main>
  );
}

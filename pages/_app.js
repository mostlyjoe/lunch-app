// pages/_app.js
import "../styles/globals.css"; // ✅ Unified global styles

import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";

import NavBar from "../components/NavBar";

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const hideNavRoutes = new Set([
    "/",
    "/login",
    "/signup",
    "/under-construction",
  ]);

  const showNav = !hideNavRoutes.has(router.pathname);

  return (
    <>
      {showNav ? <NavBar /> : null}

      <main className="appMain">
        <Component {...pageProps} />
      </main>

      <Toaster
        position="top-center"
        toastOptions={{
          className: "toastBase",
          success: { className: "toastBase toastSuccess" },
          error: { className: "toastBase toastError" },
        }}
      />
    </>
  );
}
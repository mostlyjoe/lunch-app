// pages/_app.js
import "../styles/globals.css";
import NavBar from "../components/NavBar";
import { Toaster } from "react-hot-toast";

function MyApp({ Component, pageProps }) {
    return (
        <>
            <NavBar />
            <Component {...pageProps} />
            <Toaster
                position="top-center"
                toastOptions={{
                    success: {
                        duration: 2500,
                        style: { background: "#d1fae5", color: "#065f46" }, // green success look
                    },
                    error: {
                        duration: 3000,
                        style: { background: "#fee2e2", color: "#991b1b" }, // red error look
                    },
                }}
            />
        </>
    );
}

export default MyApp;

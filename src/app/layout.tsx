import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileNav from "../components/MobileNav";
import FloatingSpinWheel from "../components/FloatingSpinWheel";
import CartDrawer from "../components/Cartdrawer";
import { Suspense } from "react";
import { AuthProvider } from "../context/AuthContext";
import AffiliateTracker from "../components/AffiliateTracker";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LoverSmart.com - Premium Fancy & Fashion",
  description: "Exclusive shoes, clothes and fancy items curated for you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="si">
      <body
        className={`${poppins.className} bg-[#f5f5f5] text-gray-800 antialiased pb-20 md:pb-0`}
      >
        <AuthProvider>

          {/* Toast Notifications */}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2500,
              style: {
                background: "#111",
                color: "#fff",
                fontWeight: "700",
                fontSize: "12px",
                borderRadius: "14px",
                padding: "12px 20px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              },
              success: {
                iconTheme: { primary: "#f43f5e", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#f43f5e", secondary: "#fff" },
              },
            }}
          />

          {/* Affiliate Tracker */}
          <Suspense fallback={null}>
            <AffiliateTracker />
          </Suspense>

          <Navbar />

          <Suspense
            fallback={
              <div className="flex h-screen flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
                <div className="font-black text-[10px] text-rose-400 animate-pulse uppercase tracking-[0.3em]">
                  Loading LoverSmart...
                </div>
              </div>
            }
          >
            {children}
          </Suspense>

          <Footer />
          <MobileNav />
          <FloatingSpinWheel />

          {/* Cart Drawer - auto opens when item is added */}
          <CartDrawer />

        </AuthProvider>
      </body>
    </html>
  );
}
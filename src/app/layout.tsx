import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { CoinGeckoProvider } from "@/contexts/CoinGeckoContext";

export const metadata: Metadata = {
  title: "CryptoLens",
  description: "Your comprehensive crypto analytics platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-poppins">
        <QueryProvider>
          <CoinGeckoProvider>
            <Navbar />
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 6000,
                style: {
                  background: "rgba(17, 24, 39, 0.8)",
                  color: "#E5E7EB",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  backdropFilter: "blur(8px)",
                  fontSize: "0.875rem",
                  maxWidth: "400px",
                  padding: "12px 16px",
                  borderRadius: "0.75rem",
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
                },
                success: {
                  style: {
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  },
                },
                error: {
                  style: {
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                  },
                },
                loading: {
                  style: {
                    background: "rgba(59, 130, 246, 0.1)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                  },
                },
              }}
            />
          </CoinGeckoProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

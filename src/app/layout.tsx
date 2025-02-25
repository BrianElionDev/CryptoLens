import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/providers/QueryProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fira",
});

export const metadata: Metadata = {
  title: "CryptoLens",
  description: "Crypto Analytics Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${jakarta.variable} ${firaCode.variable} font-jakarta`}>
        <QueryProvider>
          <Navbar />
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
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

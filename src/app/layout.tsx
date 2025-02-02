import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { KnowledgeProvider } from "@/contexts/KnowledgeContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crypto Lens",
  description: "Crypto currency insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900`}
      >
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: {
              background: "#1F2937",
              color: "#E5E7EB",
              border: "1px solid rgba(59, 130, 246, 0.5)",
              backdropFilter: "blur(8px)",
              fontSize: "1rem",
              padding: "16px",
              maxWidth: "400px",
              boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
            },
          }}
        />
        <Navbar />
        <div className="pt-0">
          <KnowledgeProvider>{children}</KnowledgeProvider>
        </div>
      </body>
    </html>
  );
}

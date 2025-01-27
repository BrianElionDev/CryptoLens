import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { KnowledgeProvider } from "@/contexts/KnowledgeContext";
import Link from "next/link";

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

function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="relative">
        {/* Purple announcement bar */}
        <div className="bg-[#7C3AED] py-2 px-4 text-white text-sm font-medium text-center">
          <span className="inline-flex items-center">
            <span className="mr-2">🚀</span>
            Discover crypto insights with CryptoLens
            <Link
              href="/knowledge"
              className="ml-2 underline hover:text-white/90"
            >
              Learn more →
            </Link>
          </span>
        </div>

        {/* Main navbar */}
        <div className="bg-white/5 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo and primary nav */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                    CryptoLens
                  </span>
                </Link>
                <nav className="hidden md:flex ml-10 space-x-8">
                  <Link
                    href="/"
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium"
                  >
                    Home
                  </Link>
                  <Link
                    href="/knowledge"
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium"
                  >
                    Knowledge
                  </Link>
                  <Link
                    href="/analytics"
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium"
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/faq"
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium"
                  >
                    FAQ
                  </Link>
                </nav>
              </div>

              {/* Secondary nav */}
              <div className="flex items-center space-x-4">
                <Link
                  href="/knowledge"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <Navbar />
        <div className="pt-28">
          <KnowledgeProvider>{children}</KnowledgeProvider>
        </div>
      </body>
    </html>
  );
}

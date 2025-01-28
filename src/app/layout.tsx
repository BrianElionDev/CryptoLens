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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl blur-lg"></div>

        {/* Main navbar */}
        <div className="relative bg-gray-900/70 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between h-auto sm:h-16 py-4 sm:py-0">
              {/* Logo and primary nav */}
              <div className="flex flex-col sm:flex-row items-center w-full sm:w-auto">
                <Link href="/" className="flex items-center mb-4 sm:mb-0">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                    CryptoLens
                  </span>
                </Link>
                <nav className="flex flex-wrap justify-center gap-2 sm:ml-10 sm:space-x-8">
                  <Link
                    href="/knowledge"
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Knowledge
                  </Link>
                  <Link
                    href="/analytics"
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Analytics
                  </Link>
                  <Link
                    href="/autofetch"
                    className="flex items-center space-x-1 text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors group"
                  >
                    <span>Autofetch</span>
                  </Link>
                  <Link
                    href="/faq"
                    className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    FAQ
                  </Link>
                </nav>
              </div>

              {/* Secondary nav */}
              <div className="flex items-center mt-4 sm:mt-0">
                <Link
                  href="/autofetch"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-lg shadow-purple-500/20"
                >
                  Start Fetching
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
        <div className="pt-24">
          <KnowledgeProvider>{children}</KnowledgeProvider>
        </div>
      </body>
    </html>
  );
}

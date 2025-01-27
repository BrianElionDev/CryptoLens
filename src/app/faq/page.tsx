"use client";

import FAQ from "@/components/FAQ";
import Link from "next/link";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Content */}
      <div className="relative">
        <header className="sticky top-0 z-50 bg-gray-900/60 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-800/40 text-cyan-200 hover:text-cyan-100 hover:bg-gray-700/60 transition-all duration-200 border border-gray-700 hover:border-blue-500/50"
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back
              </Link>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                FAQ
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <FAQ />

          {/* Common Questions Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {commonQuestions.map((item, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 backdrop-blur-sm hover:border-blue-400/30 transition-all duration-300 group"
              >
                <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                  {item.question}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </main>

        {/* Floating Action Button */}
        <Link
          href="/knowledge"
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 transform hover:scale-110 transition-all duration-300 group animate-pulse-slow"
        >
          <div className="absolute -top-12 right-0 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-md rounded-lg border border-blue-500/20 text-cyan-200 text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-1">
            Browse Knowledge
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            <svg
              className="w-6 h-6 text-white relative z-10 transform group-hover:rotate-12 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        </Link>

        <style jsx global>{`
          @keyframes pulse-slow {
            0%,
            100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.9;
              transform: scale(1.05);
            }
          }
          .animate-pulse-slow {
            animation: pulse-slow 3s infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
const commonQuestions = [
  {
    question: "Market Sentiment Analysis",
    description:
      "Get real-time sentiment analysis for any cryptocurrency based on social media, news, and market indicators.",
  },
  {
    question: "Price Predictions",
    description:
      "Understand potential price movements based on technical analysis and market patterns.",
  },
  {
    question: "Risk Assessment",
    description:
      "Evaluate the risk level of specific cryptocurrencies or trading strategies.",
  },
  {
    question: "Market Trends",
    description:
      "Discover emerging trends, market patterns, and potential opportunities in the crypto space.",
  },
];

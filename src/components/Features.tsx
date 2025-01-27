"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const Features = () => {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  const cardVariants = {
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 },
    },
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
        <motion.div whileHover="hover" variants={cardVariants}>
          <Link
            href="/faq"
            className="group relative bg-gray-900/40 backdrop-blur-sm rounded-xl p-4 border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 block w-full sm:w-[240px]"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all duration-300">
                <svg
                  className="w-6 h-6 text-cyan-200 group-hover:text-cyan-300 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-cyan-200 group-hover:text-cyan-100">
                  Ask AI
                </h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300">
                  Get personalized crypto insights
                </p>
              </div>
            </div>
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>
        </motion.div>

        <motion.div whileHover="hover" variants={cardVariants}>
          <Link
            href="/knowledge"
            className="group relative bg-gray-900/40 backdrop-blur-sm rounded-xl p-4 border border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 block w-full sm:w-[240px]"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all duration-300">
                <svg
                  className="w-6 h-6 text-cyan-200 group-hover:text-cyan-300 transition-colors"
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
              <div>
                <h3 className="text-lg font-medium text-cyan-200 group-hover:text-cyan-100">
                  Knowledge Base
                </h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300">
                  Explore curated market analysis
                </p>
              </div>
            </div>
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToFeatures}
          className="px-6 py-2.5 rounded-xl border border-cyan-700/50 hover:border-cyan-600 text-cyan-300 hover:bg-cyan-900/20 transition-all duration-200 text-center backdrop-blur-sm hover:shadow-lg hover:shadow-cyan-500/20 text-base sm:w-[240px]"
        >
          Discover More
        </motion.button>
      </div>

      <div
        id="features"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 lg:mt-10"
      >
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-cyan-900/50 hover:border-cyan-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5"
        >
          <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-cyan-200 mb-1.5">
            Real-Time Market Analysis
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            Stay ahead with instant market trends and AI-powered analysis.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-purple-900/50 hover:border-purple-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5"
        >
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-purple-200 mb-1.5">
            Smart Sentiment Analysis
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            Understand market sentiment through AI-powered analysis of social
            media, news, and trading patterns.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-pink-900/50 hover:border-pink-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/5"
        >
          <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-pink-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-pink-200 mb-1.5">
            Personalized Investment Insights
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            Get tailored investment recommendations based on your preferences
            and market conditions.
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Features;

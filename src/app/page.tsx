"use client";

import Features from "@/components/Features";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <main className="h-screen pt-24 flex flex-col bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Main content - subtract navbar height */}
      <div className="flex-1 mt-4 scrollbar-hide">
        <div className="h-full mx-auto px-4 relative">
          <div className="h-full flex flex-col">
            {/* Hero Section - adjusted height */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 xl:gap-16 w-full max-w-7xl mx-auto h-[40vh] lg:h-[45vh]">
              {/* Left Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex-1 w-full lg:max-w-2xl text-center lg:text-left space-y-4"
              >
                <div className="relative group px-4">
                  <div className="absolute -inset-x-4 -inset-y-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                  <motion.h1
                    className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold relative"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
                      CryptoLens
                    </span>
                  </motion.h1>
                </div>
                <motion.div className="space-y-2">
                  <p className="text-lg md:text-xl lg:text-2xl text-cyan-200 font-medium leading-tight">
                    Your AI-Powered Crystal Ball for Crypto Markets
                  </p>
                  <p className="text-sm md:text-base lg:text-lg text-gray-300">
                    Get real-time insights, smart predictions, and personalized
                    recommendations powered by advanced AI technology.
                  </p>
                </motion.div>
              </motion.div>

              {/* Right Content - reduced size */}
              <motion.div className="flex-1 relative group hidden lg:block">
                <div className="w-48 h-48 xl:w-[250px] xl:h-[250px] relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl group-hover:blur-2xl transition-all duration-500" />

                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full backdrop-blur-sm"
                  />
                  <motion.div
                    animate={{
                      scale: [1.05, 1, 1.05],
                      rotate: [0, -5, 5, 0],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                    className="absolute inset-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full backdrop-blur-sm"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2,
                    }}
                    className="absolute inset-8 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full backdrop-blur-sm"
                  />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.svg
                      whileHover={{ scale: 1.1 }}
                      className="w-28 h-28 xl:w-40 xl:h-40 text-cyan-200 transform transition-transform duration-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="group-hover:stroke-blue-300 transition-colors duration-300"
                      />
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          duration: 2,
                          ease: "easeInOut",
                          delay: 0.5,
                        }}
                        d="M15 8.5C14.315 7.81501 13.1087 7.33855 12 7.30872M9 15.5C9.685 16.185 10.8913 16.6614 12 16.6913M12 7.30872C10.7865 7.27668 9.5 7.85001 9.5 9.50001C9.5 12.5 15 11 15 14C15 15.65 13.315 16.7316 12 16.6913M12 7.30872V5.5M12 16.6913V18.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="group-hover:stroke-blue-300 transition-colors duration-300"
                      />
                    </motion.svg>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Features Section - adjusted height */}
            <div className="flex-1 w-full max-w-7xl mx-auto h-[35vh]">
              <Features />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        }
      `}</style>
    </main>
  );
}

import Features from "@/components/Features";

export default function Home() {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 flex items-center justify-center overflow-hidden relative">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
        </div>
        {/* Additional subtle background elements */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left backdrop-blur-sm p-6 rounded-2xl bg-gray-900/20">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
                  CryptoLens
                </span>
              </h1>
            </div>
            <p className="mt-4 lg:mt-6 text-lg lg:text-2xl text-cyan-200 font-medium">
              Your AI-Powered Crystal Ball for Crypto Markets
            </p>
            <p className="mt-2 lg:mt-4 text-gray-300 text-base lg:text-lg">
              Get real-time sentiment analysis and smart investment
              recommendations
            </p>
            <Features />
          </div>

          {/* Right Content - Animated Icon */}
          <div className="flex-1 relative group">
            <div className="w-64 h-64 lg:w-80 lg:h-80 relative transition-transform duration-500 transform group-hover:scale-105">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl group-hover:blur-2xl transition-all duration-500" />

              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full animate-pulse backdrop-blur-sm" />
              <div className="absolute inset-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full animate-pulse animation-delay-1000 backdrop-blur-sm" />
              <div className="absolute inset-8 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full animate-pulse animation-delay-2000 backdrop-blur-sm" />

              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-28 h-28 lg:w-36 lg:h-36 text-cyan-200 transform transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="group-hover:stroke-blue-300 transition-colors duration-300"
                  />
                  <path
                    d="M15 8.5C14.315 7.81501 13.1087 7.33855 12 7.30872M9 15.5C9.685 16.185 10.8913 16.6614 12 16.6913M12 7.30872C10.7865 7.27668 9.5 7.85001 9.5 9.50001C9.5 12.5 15 11 15 14C15 15.65 13.315 16.7316 12 16.6913M12 7.30872V5.5M12 16.6913V18.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="group-hover:stroke-blue-300 transition-colors duration-300"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

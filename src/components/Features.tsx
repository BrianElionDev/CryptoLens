"use client";

export default function Features() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
        <a
          href="/faq"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium hover:from-cyan-600 hover:to-purple-700 transition-all duration-200 text-center shadow-lg hover:shadow-cyan-500/25"
        >
          Ask AI Assistant
        </a>
        <button
          onClick={scrollToFeatures}
          className="px-6 py-2.5 rounded-xl border border-cyan-700/50 hover:border-cyan-600 text-cyan-300 hover:bg-cyan-900/20 transition-all duration-200 text-center backdrop-blur-sm"
        >
          Learn More
        </button>
      </div>

      <div
        id="features"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 lg:mt-12"
      >
        <div className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-cyan-900/50">
          <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-3">
            <svg
              className="w-5 h-5 text-cyan-400"
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
          <h3 className="text-lg font-semibold text-cyan-200">
            Market Analysis
          </h3>
          <p className="mt-1 text-gray-300 text-sm">
            Real-time insights into crypto market trends
          </p>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-purple-900/50">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
            <svg
              className="w-5 h-5 text-purple-400"
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
          <h3 className="text-lg font-semibold text-purple-200">
            Sentiment Analysis
          </h3>
          <p className="mt-1 text-gray-300 text-sm">
            AI-powered market sentiment analysis
          </p>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-pink-900/50">
          <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center mb-3">
            <svg
              className="w-5 h-5 text-pink-400"
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
          <h3 className="text-lg font-semibold text-pink-200">
            Investment Insights
          </h3>
          <p className="mt-1 text-gray-300 text-sm">
            Smart investment recommendations
          </p>
        </div>
      </div>
    </>
  );
}

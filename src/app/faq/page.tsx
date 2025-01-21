import FAQ from "@/components/FAQ";
import Link from "next/link";

export default function FAQPage() {
  return (
    <div className="min-h-screen h-screen overflow-y-auto bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative scrollbar-thin scrollbar-track-gray-900/40 scrollbar-thumb-blue-500/50 hover:scrollbar-thumb-blue-500/70">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
        </div>
        {/* Additional subtle background elements */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative py-12">
        {/* Back Home Button */}
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-900/40 text-cyan-200 hover:text-cyan-100 hover:bg-gray-800/60 transition-all duration-200 mb-8 border border-gray-800 hover:border-blue-500/50"
        >
          <svg
            className="w-5 h-5 mr-2"
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
          Back Home
        </Link>

        <div className="text-center backdrop-blur-sm p-6 rounded-2xl bg-gray-900/20">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <h1 className="text-4xl lg:text-6xl font-bold relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Ask CryptoLens AI
              </span>
            </h1>
          </div>
          <p className="mt-4 text-lg lg:text-2xl text-cyan-200 font-medium">
            Your AI-Powered Crypto Market Analyst
          </p>
        </div>

        <div className="mt-12 backdrop-blur-sm bg-gray-900/20 p-6 rounded-2xl border border-gray-800">
          <FAQ />
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-8 text-center">
            Common Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {commonQuestions.map((item, index) => (
              <div key={index} className="group">
                <div className="bg-gray-900/40 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
                  <h3 className="text-lg font-medium text-cyan-200 mb-2">
                    {item.question}
                  </h3>
                  <p className="text-gray-300">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center pb-8">
          <p className="text-cyan-200 text-lg">
            Need more specific insights? Just ask above and our AI will analyze
            real-time market data for you.
          </p>
        </div>
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

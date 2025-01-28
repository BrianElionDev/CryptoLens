"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function AutofetchPage() {
  const router = useRouter();
  const [channelName, setChannelName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const formattedDate = new Date(startDate).toISOString();

      // Replace with your make.com webhook URL
      await axios.post("YOUR_MAKE_WEBHOOK_URL", {
        channelName: channelName.trim(),
        startDate: formattedDate,
      });

      router.push("/knowledge");
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to start automation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-700" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-[95%] max-w-md mx-auto pt-20 px-4">
        <div className="relative group">
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-pink-600/50 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-70"></div>

          <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 sm:p-8 shadow-2xl">
            <div className="absolute right-4 top-4 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-2">
              Autofetch
            </h1>
            <p className="text-gray-400 mb-8">
              Automate content fetching from YouTube channels
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label
                  htmlFor="channel"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Channel Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <input
                    type="text"
                    id="channel"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="@channel_name"
                    className="relative z-10 w-full bg-gray-900/60 border border-gray-700/50 rounded-lg py-3 px-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Start Date
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <input
                    type="date"
                    id="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="relative z-10 w-full bg-gray-900/60 border border-gray-700/50 rounded-lg py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400/50 [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg py-3 px-4 hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Starting Automation...
                  </span>
                ) : (
                  "Start Automation"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

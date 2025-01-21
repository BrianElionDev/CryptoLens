"use client";

import { useState } from "react";
import axios from "axios";

export default function FAQ() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await axios.post("/api/faq", { question });
      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.answer === "No useful information.") {
        setError(
          "I couldn't find any relevant information. Please try rephrasing your question."
        );
      } else {
        setAnswer(response.data.answer);
      }
    } catch (err) {
      setError("Failed to get answer. Please try again.");
      console.error("FAQ Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-800 hover:border-blue-500/50 transition-duration-300">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="question"
              className="block text-sm font-medium text-cyan-200"
            >
              Ask about crypto markets, sentiment, or get investment advice
            </label>
            <div className="mt-2 relative">
              <input
                type="text"
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="block w-full rounded-xl bg-gray-800/60 border-gray-700 text-gray-100 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 placeholder-gray-400"
                placeholder="e.g., What's the current sentiment for Bitcoin?"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 inline-flex items-center px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing
                  </div>
                ) : (
                  "Ask AI"
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 text-red-400 bg-red-900/20 rounded-lg p-3 border border-red-900/50">
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-6 bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-medium text-cyan-200 mb-3">
              Analysis:
            </h3>
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

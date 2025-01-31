"use client";

import { useState } from "react";
import axios from "axios";

export default function FAQ() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAnswer("");
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about crypto..."
              className="w-full bg-gray-900/60 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg py-3 px-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200 hover:from-blue-600/20 hover:to-purple-600/20"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-lg shadow-purple-500/20 whitespace-nowrap"
          >
            Ask Question
          </button>
        </div>
      </form>

      <div className="mt-6 bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 min-h-[200px]">
        <h3 className="text-lg font-medium text-cyan-200 mb-3">Analysis:</h3>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-400/30 rounded-full"></div>
              <div className="w-12 h-12 border-4 border-blue-500 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-red-400 bg-red-900/20 rounded-lg p-3 border border-red-900/50">
            {error}
          </div>
        ) : answer ? (
          <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
            {answer}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            Ask a question to see the analysis
          </div>
        )}
      </div>
    </div>
  );
}

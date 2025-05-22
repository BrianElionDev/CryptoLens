"use client";

import {
  QueryClientProvider,
  HydrationBoundary,
  DehydratedState,
  QueryClient,
} from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { createQueryClient } from "@/config/query";
import { ErrorBoundary } from "react-error-boundary";

// Store dehydrated state in a global variable to persist between page navigations
let globalState: DehydratedState | null = null;

// Fallback UI for query errors
const QueryErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div className="min-h-[200px] flex flex-col items-center justify-center p-6 bg-gray-900/50 rounded-lg border border-red-500/20">
    <div className="text-red-400 mb-4">
      <h3 className="text-lg font-medium text-red-300 mb-2">
        Data loading error
      </h3>
    </div>
    <p className="text-gray-400 text-sm mb-4 max-w-md text-center">
      {error.message || "Something went wrong while loading data"}
    </p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
    >
      Try again
    </button>
  </div>
);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState<QueryClient>(() => createQueryClient());

  // Initialize HydrationBoundary state on first load
  const [state] = useState<DehydratedState | null>(() => globalState);

  // Update global state when state changes
  useEffect(() => {
    if (state) {
      globalState = state;
    }
  }, [state]);

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Promise Rejection:", event.reason);
      // Prevent the default browser handling of the error
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  return (
    <ErrorBoundary FallbackComponent={QueryErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <HydrationBoundary state={state}>{children}</HydrationBoundary>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

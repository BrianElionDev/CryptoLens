import { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Define a custom error type with status property
interface HttpError extends Error {
  status: number;
}

export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 minutes
      gcTime: 1000 * 60 * 120, // 2 hours
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: (failureCount: number, error: unknown) => {
        // Don't retry if we get a 4xx error (except 429 - rate limit)
        const errorWithStatus = error as HttpError;
        if (
          error instanceof Error &&
          "status" in error &&
          typeof errorWithStatus.status === "number" &&
          errorWithStatus.status >= 400 &&
          errorWithStatus.status < 500 &&
          errorWithStatus.status !== 429
        ) {
          return false;
        }

        // Only retry 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: Error) => {
        // Only show toast on client side
        if (typeof window !== "undefined") {
          console.error("Query error:", error);

          // Prevent showing too many errors at once
          const errorKey = error.message || "unknown-error";
          toast.error(`Failed to fetch data: ${error.message}`, {
            id: `query-error-${errorKey}`,
          });
        }
      },
    },
    mutations: {
      retry: (failureCount: number, error: unknown) => {
        // Don't retry if we get a 4xx error (except 429 - rate limit)
        const errorWithStatus = error as HttpError;
        if (
          error instanceof Error &&
          "status" in error &&
          typeof errorWithStatus.status === "number" &&
          errorWithStatus.status >= 400 &&
          errorWithStatus.status < 500 &&
          errorWithStatus.status !== 429
        ) {
          return false;
        }

        // Only retry 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: Error) => {
        // Only show toast on client side
        if (typeof window !== "undefined") {
          console.error("Mutation error:", error);

          // Prevent showing too many errors at once
          const errorKey = error.message || "unknown-error";
          toast.error(`Operation failed: ${error.message}`, {
            id: `mutation-error-${errorKey}`,
          });
        }
      },
    },
  },
};

export function createQueryClient() {
  return new QueryClient(queryConfig);
}

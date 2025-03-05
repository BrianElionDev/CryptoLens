import { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: Error) => {
        // Only show toast on client side
        if (typeof window !== "undefined") {
          console.error("Query error:", error);
          toast.error("Failed to fetch data. Please try again.");
        }
      },
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: Error) => {
        // Only show toast on client side
        if (typeof window !== "undefined") {
          console.error("Mutation error:", error);
          toast.error("Operation failed. Please try again.");
        }
      },
    },
  },
};

export function createQueryClient() {
  return new QueryClient({
    ...queryConfig,
    defaultOptions: {
      ...queryConfig.defaultOptions,
      queries: {
        ...queryConfig.defaultOptions.queries,
      },
    },
  });
}

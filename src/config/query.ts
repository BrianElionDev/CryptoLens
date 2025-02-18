import { QueryClient } from "@tanstack/react-query";

export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
};

export function createQueryClient() {
  return new QueryClient(queryConfig);
}

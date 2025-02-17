import { QueryClient } from "@tanstack/react-query";

export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
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

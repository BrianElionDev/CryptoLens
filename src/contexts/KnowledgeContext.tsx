"use client";

import React, { createContext, useContext, ReactNode } from "react";
import {
  useQuery,
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import type { KnowledgeItem } from "@/types/knowledge";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// Define the context type
type KnowledgeContextType = {
  knowledgeData: KnowledgeItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

// Create the context
const KnowledgeContext = createContext<KnowledgeContextType | undefined>(
  undefined
);

// Create a provider component
export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      // Use only the API endpoint, don't import server-side code
      const timestamp = Date.now();
      const res = await fetch(`/api/knowledge?limit=all&_t=${timestamp}`);
      if (!res.ok) throw new Error("Failed to fetch knowledge data");
      return await res.json();
    },
    retry: 2, // Retry failed requests 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Create a typed refetch function that bypasses cache
  const refetch = async () => {
    // Properly refetch by invalidating the query which will trigger a fresh fetch
    await queryClient.invalidateQueries({ queryKey: ["knowledge"] });
  };

  return (
    <KnowledgeContext.Provider
      value={{
        knowledgeData: data,
        isLoading,
        error: error as Error | null,
        refetch,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  );
}

// Create a hook to use the context
export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (context === undefined) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider");
  }
  return context;
}

// Create a query provider that wraps the app
export function QueryClientProvider({ children }: { children: ReactNode }) {
  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  );
}

"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { KnowledgeItem } from "@/types/knowledge";

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
export function ClientKnowledgeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Check if we already have server data
  const existingData = queryClient.getQueryData<KnowledgeItem[]>(["knowledge"]);
  const hasServerData = existingData && existingData.length > 0;

  // We'll track if we've seen data with proper length
  const [hasSufficientData, setHasSufficientData] = useState(hasServerData);

  const {
    data = [],
    isLoading,
    error,
    refetch: tanstackRefetch,
  } = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      // If we already have server data with sufficient length, use it
      if (hasServerData && existingData.length > 200) {
        console.log(
          `Using existing server data (${existingData.length} items) from query cache`
        );
        return existingData;
      }

      // Otherwise fetch new data
      const timestamp = Date.now();
      console.log(`Fetching knowledge data with timestamp: ${timestamp}`);

      const res = await fetch(`/api/knowledge?limit=all&_t=${timestamp}`);
      if (!res.ok) throw new Error("Failed to fetch knowledge data");
      const data = await res.json();

      // Log fetched data
      console.log(
        `Fetched ${data.length} knowledge items at ${new Date().toISOString()}`
      );

      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - knowledge data doesn't change often
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    // Only fetch on mount if we don't have server data
    enabled: !hasServerData,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update our state if we get data with proper length
  useEffect(() => {
    if (data && data.length > 200 && !hasSufficientData) {
      setHasSufficientData(true);
    }
  }, [data, hasSufficientData]);

  // Create a typed refetch function
  const refetch = async () => {
    await tanstackRefetch();
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
    throw new Error(
      "useKnowledge must be used within a ClientKnowledgeProvider"
    );
  }
  return context;
}

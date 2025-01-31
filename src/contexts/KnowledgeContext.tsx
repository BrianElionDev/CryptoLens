"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { KnowledgeItem } from "@/types/knowledge";

interface KnowledgeContextType {
  knowledge: KnowledgeItem[];
  isLoading: boolean;
  error: string | null;
  expandedCard: string | null;
  setExpandedCard: (id: string | null) => void;
  refetch: () => Promise<void>;
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(
  undefined
);

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("expandedCard");
    }
    return null;
  });

  useEffect(() => {
    if (expandedCard) {
      localStorage.setItem("expandedCard", expandedCard);
    } else {
      localStorage.removeItem("expandedCard");
    }
  }, [expandedCard]);

  // Separate fetch functions for initial load and polling
  const fetchKnowledge = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/knowledge");
      if (!response.ok) {
        throw new Error("Failed to fetch knowledge data");
      }
      const data = await response.json();
      setKnowledge(data.knowledge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const pollKnowledge = useCallback(async () => {
    try {
      const response = await fetch("/api/knowledge");
      if (!response.ok) throw new Error("Failed to fetch knowledge data");
      const data = await response.json();

      if (JSON.stringify(data.knowledge) !== JSON.stringify(knowledge)) {
        setKnowledge(data.knowledge);
      }
    } catch (err) {
      console.error("Error polling knowledge:", err);
    }
  }, [knowledge]);

  // Initial fetch
  useEffect(() => {
    fetchKnowledge();
  }, []);

  // Polling effect without loading states
  useEffect(() => {
    const pollInterval = setInterval(pollKnowledge, 30000);
    return () => clearInterval(pollInterval);
  }, [knowledge, pollKnowledge]);

  return (
    <KnowledgeContext.Provider
      value={{
        knowledge,
        isLoading,
        error,
        expandedCard,
        setExpandedCard,
        refetch: fetchKnowledge, // Use the loading version for manual refreshes
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (context === undefined) {
    throw new Error("useKnowledge must be used within a KnowledgeProvider");
  }
  return context;
}

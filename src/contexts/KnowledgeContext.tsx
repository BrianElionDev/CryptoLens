"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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

  // Initial fetch
  useEffect(() => {
    fetchKnowledge();
  }, []);

  // Polling effect - fetch every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchKnowledge();
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, []);

  return (
    <KnowledgeContext.Provider
      value={{
        knowledge,
        isLoading,
        error,
        expandedCard,
        setExpandedCard,
        refetch: fetchKnowledge,
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

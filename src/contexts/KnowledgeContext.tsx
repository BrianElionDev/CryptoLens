"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { KnowledgeItem } from "@/types/knowledge";
import { toast } from "react-hot-toast";

interface KnowledgeContextType {
  knowledge: KnowledgeItem[];
  isLoading: boolean;
  error: string | null;
  expandedCard: string | null;
  setExpandedCard: (id: string | null) => void;
  refetch: () => Promise<void>;
  setKnowledge: (data: KnowledgeItem[]) => void;
}

const KnowledgeContext = createContext<KnowledgeContextType>({
  knowledge: [],
  isLoading: true,
  error: null,
  expandedCard: null,
  setExpandedCard: () => {},
  refetch: async () => {},
  setKnowledge: () => {},
});

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

      // Only update if data has changed
      setKnowledge((prevKnowledge) => {
        if (JSON.stringify(data.knowledge) !== JSON.stringify(prevKnowledge)) {
          toast.success("New knowledge data received!", {
            icon: "🔄",
            style: {
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
              color: "#E5E7EB",
            },
          });
          return data.knowledge;
        }
        return prevKnowledge;
      });
    } catch (err) {
      console.error("Error polling knowledge:", err);
      toast.error("Failed to fetch updates", {
        icon: "❌",
        style: {
          background: "rgba(239, 68, 68, 0.2)",
          border: "1px solid rgba(239, 68, 68, 0.5)",
          color: "#E5E7EB",
        },
      });
    }
  }, []); // Empty dependency array since we use functional updates

  // Initial fetch
  useEffect(() => {
    fetchKnowledge();
  }, []);

  // Polling effect
  useEffect(() => {
    const pollInterval = setInterval(pollKnowledge, 30000);
    return () => clearInterval(pollInterval);
  }, [pollKnowledge]); // Only depend on pollKnowledge

  return (
    <KnowledgeContext.Provider
      value={{
        knowledge,
        isLoading,
        error,
        expandedCard,
        setExpandedCard,
        refetch: fetchKnowledge, // Use the loading version for manual refreshes
        setKnowledge,
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

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { KnowledgeItem } from "@/types/knowledge";
import axios from "axios";

export type KnowledgeContextType = {
  knowledge: KnowledgeItem[];
  isLoading: boolean;
  error: string | null;
};

const KnowledgeContext = createContext<KnowledgeContextType>({
  knowledge: [],
  isLoading: false,
  error: null,
});

export const useKnowledge = () => useContext(KnowledgeContext);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const response = await axios.get("/api/knowledge");

        if (response.status !== 200) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = response.data;
        if (Array.isArray(data.knowledge)) {
          setKnowledge(data.knowledge);
        } else {
          setKnowledge([]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch knowledge"
        );
        setKnowledge([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKnowledge();

    // Poll every 30 seconds
    const pollInterval = setInterval(fetchKnowledge, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  return (
    <KnowledgeContext.Provider value={{ knowledge, isLoading, error }}>
      {children}
    </KnowledgeContext.Provider>
  );
}

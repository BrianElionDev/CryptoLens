"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface KnowledgeContextType {
  expandedCard: string | null;
  setExpandedCard: (id: string | null) => void;
}

const KnowledgeContext = createContext<KnowledgeContextType>({
  expandedCard: null,
  setExpandedCard: () => {},
});

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
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

  return (
    <KnowledgeContext.Provider
      value={{
        expandedCard,
        setExpandedCard,
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

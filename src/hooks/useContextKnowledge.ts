"use client";

import { useKnowledge } from "@/contexts/ClientKnowledgeProvider";
export function useContextKnowledge() {
  const { knowledgeData, isLoading, error, totalItems, isComplete, progress } =
    useKnowledge();

  return {
    data: knowledgeData,
    isLoading,
    isError: !!error,
    error,
    totalItems,
    isComplete,
    progress,
  };
}

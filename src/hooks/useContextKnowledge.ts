"use client";

import { useKnowledge } from "@/contexts/ClientKnowledgeProvider";
export function useContextKnowledge() {
  const { knowledgeData, isLoading, error, refetch } = useKnowledge();

  return {
    data: knowledgeData,
    isLoading,
    isError: !!error,
    error,
    refetch,
  };
}

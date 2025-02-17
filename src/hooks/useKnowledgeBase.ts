import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_ENDPOINTS } from "@/config/api";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export function useKnowledgeBase() {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const { data } = await axios.get<KnowledgeEntry[]>(
        API_ENDPOINTS.KNOWLEDGE.BASE
      );
      return data;
    },
  });

  const addEntry = useMutation({
    mutationFn: async (
      newEntry: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt">
    ) => {
      const { data } = await axios.post<KnowledgeEntry>(
        API_ENDPOINTS.KNOWLEDGE.BASE,
        newEntry
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(API_ENDPOINTS.KNOWLEDGE.ENTRY(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });

  return {
    entries,
    isLoading,
    addEntry,
    deleteEntry,
  };
}

"use client";

import { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { CoinGeckoProvider } from "@/contexts/CoinGeckoContext";
import { ClientKnowledgeProvider } from "@/contexts/ClientKnowledgeProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ClientKnowledgeProvider>
        <CoinGeckoProvider>{children}</CoinGeckoProvider>
      </ClientKnowledgeProvider>
    </QueryProvider>
  );
}

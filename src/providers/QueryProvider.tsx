"use client";

import { QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { createQueryClient } from "@/config/query";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}

"use client";

import {
  QueryClientProvider,
  HydrationBoundary,
  DehydratedState,
} from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { createQueryClient } from "@/config/query";

// Store dehydrated state in a global variable to persist between page navigations
let globalState: DehydratedState | null = null;

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  // Initialize HydrationBoundary state on first load
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [state, setState] = useState<DehydratedState | null>(() => globalState);

  // Update global state when state changes
  useEffect(() => {
    if (state) {
      globalState = state;
    }
  }, [state]);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}

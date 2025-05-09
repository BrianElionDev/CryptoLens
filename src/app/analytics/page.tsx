"use client";

import { Suspense } from "react";
import { CryptoMarketsPage } from "@/app/analytics/components/CryptoMarketsPage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 px-4 text-center flex justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CryptoMarketsPage />
    </Suspense>
  );
}

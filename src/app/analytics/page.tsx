// Server Component
import { prefetchKnowledgeData } from "@/lib/server/prefetch";
import { CryptoMarketsPage } from "@/app/analytics/components/CryptoMarketsPage";
import { Suspense } from "react";

export default async function AnalyticsPage() {
  const initialData = await prefetchKnowledgeData();

  return (
    <Suspense
      fallback={
        <div className="pt-24 px-4 text-center">Loading analytics...</div>
      }
    >
      <CryptoMarketsPage initialData={initialData} />
    </Suspense>
  );
}

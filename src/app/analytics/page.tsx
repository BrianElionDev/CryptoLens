// Server Component
import { prefetchKnowledgeData } from "@/lib/server/prefetch";
import { CryptoMarketsPage } from "@/app/analytics/components/CryptoMarketsPage";

export default async function AnalyticsPage() {
  const initialData = await prefetchKnowledgeData();

  return <CryptoMarketsPage initialData={initialData} />;
}

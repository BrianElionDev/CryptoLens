// Server Component
import { prefetchKnowledgeData } from "@/lib/server/prefetch";
import { AnalyticsClient } from "@/app/analytics/components/AnalyticsClient";

export default async function AnalyticsPage() {
  const initialData = await prefetchKnowledgeData();

  return (
    <div className="space-y-6">
      <AnalyticsClient initialData={initialData} />
    </div>
  );
}

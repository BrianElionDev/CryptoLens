import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-28 mb-4" />
        <Skeleton className="h-10 w-72 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-10 w-full max-w-md mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-md" />
        </Card>

        <Card className="p-4">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-md" />
        </Card>
      </div>
    </div>
  );
}

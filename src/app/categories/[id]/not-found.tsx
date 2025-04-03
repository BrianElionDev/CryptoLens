import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center">
      <AlertTriangle className="h-16 w-16 text-yellow-500 mb-6" />
      <h2 className="text-2xl font-bold mb-3">Category Not Found</h2>
      <p className="text-gray-300 dark:text-gray-400 mb-6 text-center max-w-md">
        We couldn&apos;t find the category you&apos;re looking for.
      </p>
      <Link href="/categories">
        <Button>View All Categories</Button>
      </Link>
    </div>
  );
}

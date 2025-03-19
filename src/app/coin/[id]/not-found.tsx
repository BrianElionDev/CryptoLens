import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CoinsIcon } from "lucide-react";

export default function CoinNotFound() {
  return (
    <main className="container mx-auto p-4 mt-24 min-h-[80vh] flex flex-col items-center justify-center gap-6">
      <CoinsIcon className="w-16 h-16 text-blue-400 animate-bounce" />
      <h1 className="text-3xl font-bold text-gray-200">Coin Not Found</h1>
      <p className="text-gray-400 text-center max-w-md">
        The coin you are looking for does not exist or could not be loaded.
        Please try again later.
      </p>
      <Button asChild>
        <Link href="/" className="bg-blue-500 hover:bg-blue-600">
          Back to Home
        </Link>
      </Button>
    </main>
  );
}

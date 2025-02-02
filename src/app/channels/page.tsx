import { Suspense } from "react";
import { ChannelContent } from "./components/ChannelContent";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function ChannelsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900 pt-5">
      {/* Background Animation - Only visible on larger screens */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-cyan-500/30 rounded-full mix-blend-multiply filter blur-xl" />
          <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/50 to-transparent" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Main Content */}
      <main className="pt-20 pb-16 px-2 md:px-4">
        <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8">
          <Suspense fallback={<LoadingSpinner />}>
            <ChannelContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

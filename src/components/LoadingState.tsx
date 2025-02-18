export function LoadingState({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center min-h-[200px] w-full ${className}`}
    >
      <div className="relative">
        <div className="w-12 h-12">
          <div className="absolute w-12 h-12 rounded-full border-4 border-solid border-blue-500/20"></div>
          <div className="absolute w-12 h-12 rounded-full border-4 border-solid border-blue-500 border-t-transparent animate-spin"></div>
        </div>
        <div className="mt-4 text-sm text-gray-400">Loading...</div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="animate-pulse flex space-x-4 p-4">
      <div className="h-4 bg-gray-700/50 rounded w-1/4"></div>
      <div className="h-4 bg-gray-700/50 rounded w-1/4"></div>
      <div className="h-4 bg-gray-700/50 rounded w-1/4"></div>
      <div className="h-4 bg-gray-700/50 rounded w-1/4"></div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-700/50 rounded w-1/3"></div>
        <div className="h-6 bg-gray-700/50 rounded w-1/4"></div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
        <div className="h-4 bg-gray-700/50 rounded w-2/3"></div>
        <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
      </div>
    </div>
  );
}

import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
      <div className="flex items-center gap-3">
        {icon && <div className="text-blue-400">{icon}</div>}
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-gray-200">{value}</p>
    </div>
  );
}

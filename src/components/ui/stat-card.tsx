import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
}

export const StatCard = ({ title, value, icon }: StatCardProps) => {
  return (
    <div className="relative group">
      <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-gray-900/40 backdrop-blur-sm rounded-xl border border-gray-800/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-semibold text-indigo-300 mt-1">
              {value.toLocaleString()}
            </p>
          </div>
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};

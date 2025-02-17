"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabType = "market" | "graphs" | "categories";

interface AnalyticsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AnalyticsTabs({ activeTab, onTabChange }: AnalyticsTabsProps) {
  return (
    <div className="flex justify-center mb-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as TabType)}
        className="w-full max-w-md"
      >
        <TabsList className="grid grid-cols-3 bg-gray-900/50 backdrop-blur-sm">
          <TabsTrigger
            value="market"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
          >
            Market
          </TabsTrigger>
          <TabsTrigger
            value="graphs"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
          >
            Graphs
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
          >
            Categories
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

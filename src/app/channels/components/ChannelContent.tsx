"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useKnowledgeData } from "@/hooks/useCoinData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelAnalytics } from "./ChannelAnalytics";
import { useSearchParams, useRouter } from "next/navigation";
import { useChannelStore } from "@/stores/channelStore";

export const ChannelContent = () => {
  const { data: knowledge } = useKnowledgeData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedChannels, setSelectedChannels } = useChannelStore();
  const initialized = useRef(false);
  const [open, setOpen] = useState(false);
  const [tempSelectedChannels, setTempSelectedChannels] =
    useState<string[]>(selectedChannels);

  // Get unique channels with proper typing
  const channels = Array.from(
    new Set(knowledge?.map((item) => item["channel name"]) || [])
  ).sort() as string[];

  // Initialize from URL params on first load
  useEffect(() => {
    if (initialized.current) return;

    const channelsFromUrl = searchParams.get("channels")?.split(",") || [];
    if (
      channelsFromUrl.length > 0 &&
      channelsFromUrl.every((c) => channels.includes(c))
    ) {
      setSelectedChannels(channelsFromUrl);
      setTempSelectedChannels(channelsFromUrl);
    } else if (channels.length > 0) {
      // Select all channels by default
      setSelectedChannels(channels);
      setTempSelectedChannels(channels);
    }

    initialized.current = true;
  }, [channels, searchParams, setSelectedChannels]);

  // Handle URL updates
  const updateUrl = (selectedChannels: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (selectedChannels.length > 0) {
      params.set("channels", selectedChannels.join(","));
    } else {
      params.delete("channels");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSelectAll = () => {
    setTempSelectedChannels(channels);
  };

  const handleDeselectAll = () => {
    setTempSelectedChannels([]);
  };

  const handleApply = () => {
    setSelectedChannels(tempSelectedChannels);
    updateUrl(tempSelectedChannels);
    setOpen(false);
  };

  // Filter knowledge items by selected channels
  const channelKnowledge = knowledge?.filter((item) =>
    selectedChannels.includes(item["channel name"])
  );

  // Aggregate data for selected channels
  const aggregatedData = useMemo(() => {
    const data = new Map<
      string,
      {
        rpoints: number;
        categories: Set<string>;
        mentions: number;
      }
    >();

    channelKnowledge?.forEach((item) => {
      if (item.llm_answer?.projects) {
        const projects = Array.isArray(item.llm_answer.projects)
          ? item.llm_answer.projects
          : [item.llm_answer.projects];

        projects.forEach((project) => {
          const coin = project.coin_or_project;
          const rpoints = project.rpoints || 0;
          const categories = project.category || [];

          if (!data.has(coin)) {
            data.set(coin, {
              rpoints: 0,
              categories: new Set(),
              mentions: 0,
            });
          }

          const coinData = data.get(coin)!;
          coinData.rpoints += rpoints;
          categories.forEach((cat) => coinData.categories.add(cat));
          coinData.mentions += 1;
        });
      }
    });

    return Array.from(data.entries())
      .map(([coin, data]) => ({
        coin,
        rpoints: data.rpoints,
        categories: Array.from(data.categories),
        mentions: data.mentions,
      }))
      .sort((a, b) => b.rpoints - a.rpoints);
  }, [channelKnowledge]);

  return (
    <div className="space-y-4">
      {/* Channel Selection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            Channel Analysis
          </h2>
          <p className="text-sm text-gray-400">Select channels to analyze</p>
        </div>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-gray-900/60 border-gray-700/50 text-gray-200 hover:bg-gray-800/60"
            >
              Channels
              {selectedChannels.length > 0 && (
                <span className="ml-2 text-blue-400">
                  ({selectedChannels.length})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-4 bg-gray-900/95 border-gray-700/50 backdrop-blur-sm">
            <div className="flex justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Deselect All
              </Button>
            </div>
            <ScrollArea className="h-[200px] mb-4">
              <div className="space-y-2">
                {channels.map((channel) => (
                  <label
                    key={channel}
                    className="flex items-center px-4 py-2 hover:bg-gray-800/60 cursor-pointer rounded"
                  >
                    <Checkbox
                      checked={tempSelectedChannels.includes(channel)}
                      onCheckedChange={(checked) => {
                        setTempSelectedChannels((prev) =>
                          checked
                            ? [...prev, channel]
                            : prev.filter((ch) => ch !== channel)
                        );
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-200">{channel}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
              >
                Apply
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedChannels.length > 0 ? (
        <div className="md:bg-gray-900/40 md:backdrop-blur-sm rounded-xl md:border md:border-gray-800/50">
          <div className="md:p-6">
            <Tabs defaultValue="content" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="grid grid-cols-2 w-full max-w-xl p-1 bg-transparent">
                  <TabsTrigger
                    value="content"
                    className="relative px-8 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300
                    data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
                    data-[state=active]:border data-[state=active]:border-blue-500/50
                    data-[state=active]:shadow-[0_0_20px_rgba(59,130,246,0.15)]
                    hover:bg-gray-700/30"
                  >
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <span className="font-medium text-indigo-300">Content</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="relative px-8 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300
                    data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20
                    data-[state=active]:border data-[state=active]:border-blue-500/50
                    data-[state=active]:shadow-[0_0_20px_rgba(59,130,246,0.15)]
                    hover:bg-gray-700/30"
                  >
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span className="font-medium text-indigo-300">
                      Analytics
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-6 space-y-6">
                <TabsContent value="content" className="focus:outline-none">
                  <div className="relative overflow-hidden rounded-xl border border-gray-800/50 bg-gray-900/40 backdrop-blur-sm">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-800/50">
                          <th scope="col" className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-indigo-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-indigo-300">
                                Coin
                              </span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-indigo-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                />
                              </svg>
                              <span className="text-sm font-medium text-indigo-300">
                                R-Points
                              </span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-indigo-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-indigo-300">
                                Total Count
                              </span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-indigo-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-indigo-300">
                                Categories
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/30">
                        {aggregatedData.map(
                          ({ coin, rpoints, categories, mentions }) => (
                            <tr
                              key={coin}
                              className="hover:bg-gray-800/30 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mr-3">
                                    <span className="text-indigo-400 font-medium">
                                      {coin.charAt(0)}
                                    </span>
                                  </div>
                                  <span className="font-medium text-indigo-300">
                                    {coin}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <span className="px-2.5 py-1 text-sm font-medium bg-indigo-500/10 text-indigo-400 rounded-lg">
                                    {rpoints.toLocaleString()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <span className="px-2.5 py-1 text-sm font-medium bg-gray-800/50 text-gray-300 rounded-lg">
                                    {mentions}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {categories.map((category) => (
                                    <span
                                      key={category}
                                      className="px-2 py-1 text-xs font-medium bg-gray-800/50 text-gray-400 rounded-lg whitespace-nowrap"
                                    >
                                      {category}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="focus:outline-none">
                  <div className="md:bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-0">
                    <div className="md:bg-gray-900/40 md:backdrop-blur-sm rounded-lg bg-transparent">
                      <ChannelAnalytics knowledge={channelKnowledge || []} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-[#12141f] rounded-xl border border-indigo-500/10">
          <svg
            className="w-16 h-16 mx-auto text-indigo-400/50 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
          </svg>
          <p className="text-indigo-200 text-lg">No channels selected</p>
          <p className="text-indigo-400 text-sm mt-2">
            Select channels to view analysis
          </p>
        </div>
      )}
    </div>
  );
};

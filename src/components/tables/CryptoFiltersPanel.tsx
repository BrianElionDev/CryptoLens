"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface FilterSettings {
  dateRange: DateRange;
  datePreset: string;
  showMostRecent: boolean;
  chains: string[];
  categories: string[];
  marketCapMin?: string;
  marketCapMax?: string;
  fdvMin?: string;
  fdvMax?: string;
  priceChangeMin?: string;
  priceChangeMax?: string;
  volumeMin?: string;
  volumeMax?: string;
  volumeChangeMin?: string;
  volumeChangeMax?: string;
  ageMin?: string;
  ageMax?: string;
  ageUnit: string;
}

// Available filter options from data
export interface FilterOptions {
  chains?: string[];
  categories?: { id: string; name: string }[];
  marketCapRanges?: { min: number; max: number }[];
}

interface CryptoFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterSettings;
  onChange: (filters: Partial<FilterSettings>) => void;
  onReset: () => void;
  onApply: () => void;
  filterOptions?: FilterOptions;
  dateRangeInfo?: { earliest: Date; latest: Date } | null;
}

export function CryptoFiltersPanel({
  isOpen,
  onClose,
  filters,
  onChange,
  onReset,
  onApply,
  filterOptions,
  dateRangeInfo,
}: CryptoFiltersPanelProps) {
  // Add state for local filter changes
  const [localFilters, setLocalFilters] = useState<FilterSettings>({
    ...filters,
  });

  // Use dateRangeInfo to log available date range if present
  useEffect(() => {
    if (dateRangeInfo) {
      console.log("Available date range:", {
        earliest: dateRangeInfo.earliest,
        latest: dateRangeInfo.latest,
      });
    }
  }, [dateRangeInfo]);

  // Update local filters when parent filters change
  useEffect(() => {
    console.log("Parent filters changed:", filters);
    // Ensure we keep the parent's datePreset and showMostRecent states in sync
    setLocalFilters({
      ...filters,
      // Ensure datePreset is set correctly based on parent filters
      datePreset: filters.datePreset || "all-time",
      showMostRecent: !!filters.showMostRecent,
    });
  }, [filters]);

  // Update local filters without triggering parent onChange
  const handleLocalChange = (changes: Partial<FilterSettings>) => {
    setLocalFilters((prev) => ({
      ...prev,
      ...changes,
    }));
  };

  // Handle apply button click
  const handleApply = () => {
    // Create a clean copy of filters
    const cleanFilters = { ...localFilters };

    // Log the filters we're applying
    console.log("Applying filters:", cleanFilters);

    // Send the filters to parent
    onChange(cleanFilters);
    onApply();
  };

  // Handle reset button click
  const handleReset = () => {
    onReset();
    setLocalFilters({
      ...filters,
      datePreset: "all-time",
      showMostRecent: false,
      dateRange: { from: undefined, to: undefined },
      categories: [],
    });
  };

  // Default options if none provided
  const defaultCategories = [
    { id: "defi", name: "DeFi" },
    { id: "nft", name: "NFT" },
    { id: "gaming", name: "Gaming" },
    { id: "metaverse", name: "Metaverse" },
    { id: "layer1", name: "Layer 1" },
    { id: "layer2", name: "Layer 2" },
    { id: "meme", name: "Meme" },
    { id: "ai", name: "AI" },
  ];

  // Use provided options or defaults
  const availableCategories = filterOptions?.categories || defaultCategories;

  // Helper to format market cap values
  const formatMarketCap = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value}`;
  };

  // Get market cap ranges
  const marketCapRanges = useMemo(() => {
    // Default ranges if none provided
    if (!filterOptions?.marketCapRanges) {
      return [
        { label: "< $1M", min: 0, max: 1_000_000 },
        { label: "$1M - $10M", min: 1_000_000, max: 10_000_000 },
        { label: "$10M - $100M", min: 10_000_000, max: 100_000_000 },
        { label: "$100M - $1B", min: 100_000_000, max: 1_000_000_000 },
        { label: "$1B - $10B", min: 1_000_000_000, max: 10_000_000_000 },
        { label: "> $10B", min: 10_000_000_000, max: Number.MAX_SAFE_INTEGER },
      ];
    }

    // Use provided ranges
    return filterOptions.marketCapRanges.map((range) => ({
      label: `${formatMarketCap(range.min)} - ${formatMarketCap(range.max)}`,
      min: range.min,
      max: range.max,
    }));
  }, [filterOptions]);

  // Early return if not open, but after all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-gray-900 w-full max-w-2xl rounded-xl border border-gray-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Filters</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 max-h-[80vh] overflow-y-auto space-y-6">
          {/* Category Filter - Only show if we have categories */}
          {availableCategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-gray-300 font-medium">Category</label>
              <Select
                value={localFilters.categories[0] || "all"}
                onValueChange={(value) =>
                  handleLocalChange({ categories: [value] })
                }
              >
                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Market Cap Ranges */}
          <div className="space-y-2">
            <label className="text-gray-300 font-medium">
              Market Cap Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              {marketCapRanges.map((range, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mcap-${index}`}
                    checked={
                      localFilters.marketCapMin === range.min.toString() &&
                      localFilters.marketCapMax === range.max.toString()
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleLocalChange({
                          marketCapMin: range.min.toString(),
                          marketCapMax: range.max.toString(),
                        });
                      } else if (
                        localFilters.marketCapMin === range.min.toString() &&
                        localFilters.marketCapMax === range.max.toString()
                      ) {
                        handleLocalChange({
                          marketCapMin: undefined,
                          marketCapMax: undefined,
                        });
                      }
                    }}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label
                    htmlFor={`mcap-${index}`}
                    className="text-sm font-medium leading-none text-gray-300 cursor-pointer"
                  >
                    {range.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Price Change Range */}
          <div className="space-y-2">
            <label className="text-gray-300 font-medium">
              Price Change (24h)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="price-up"
                  checked={localFilters.priceChangeMin === "0"}
                  onCheckedChange={(checked) => {
                    handleLocalChange({
                      priceChangeMin: checked ? "0" : undefined,
                      priceChangeMax: undefined,
                    });
                  }}
                  className="data-[state=checked]:bg-green-600"
                />
                <Label
                  htmlFor="price-up"
                  className="text-sm font-medium leading-none text-gray-300 cursor-pointer"
                >
                  Gainers (24h)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="price-down"
                  checked={localFilters.priceChangeMax === "0"}
                  onCheckedChange={(checked) => {
                    handleLocalChange({
                      priceChangeMax: checked ? "0" : undefined,
                      priceChangeMin: undefined,
                    });
                  }}
                  className="data-[state=checked]:bg-red-600"
                />
                <Label
                  htmlFor="price-down"
                  className="text-sm font-medium leading-none text-gray-300 cursor-pointer"
                >
                  Losers (24h)
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  %
                </span>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 pl-7 text-white"
                  placeholder="Min"
                  value={localFilters.priceChangeMin || ""}
                  onChange={(e) =>
                    handleLocalChange({ priceChangeMin: e.target.value })
                  }
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  %
                </span>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 pl-7 text-white"
                  placeholder="Max"
                  value={localFilters.priceChangeMax || ""}
                  onChange={(e) =>
                    handleLocalChange({ priceChangeMax: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Volume Range */}
          <div className="space-y-2">
            <label className="text-gray-300 font-medium">Volume (24h)</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 pl-7 text-white"
                  placeholder="Min"
                  value={localFilters.volumeMin || ""}
                  onChange={(e) =>
                    handleLocalChange({ volumeMin: e.target.value })
                  }
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 pl-7 text-white"
                  placeholder="Max"
                  value={localFilters.volumeMax || ""}
                  onChange={(e) =>
                    handleLocalChange({ volumeMax: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-800">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="currentColor"
                d="M12,4C14.1,4 16.1,4.8 17.6,6.3C20.7,9.4 20.7,14.5 17.6,17.6C15.8,19.5 13.3,20.2 10.9,19.9L11.4,17.9C13.1,18.1 14.9,17.5 16.2,16.2C18.5,13.9 18.5,10.1 16.2,7.7C15.1,6.6 13.5,6 12,6V10.6L7,5.6L12,0.6V4M6.3,17.6C3.7,15 3.3,11 5.1,7.9L6.6,9.4C5.5,11.6 5.9,14.4 7.8,16.2C8.3,16.7 8.9,17.1 9.6,17.4L9,19.4C8,19 7.1,18.4 6.3,17.6Z"
              />
            </svg>
            Reset
          </Button>
          <Button
            variant="default"
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

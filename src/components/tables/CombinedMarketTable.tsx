"use client";

import type { CoinData } from "@/hooks/useCoinData";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useCoinData } from "@/hooks/useCoinData";

import { DataTable } from "@/components/ui/data-table";
import type { Row } from "@tanstack/react-table";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CryptoTableHeader } from "./CryptoTableHeader";
import { CryptoFiltersPanel, FilterSettings } from "./CryptoFiltersPanel";
import { CryptoColumnsSelector, Column } from "./CryptoColumnsSelector";
import type { TabType } from "./CryptoTableHeader";
import { CategoriesTable } from "./CategoriesTable";
import { ChannelSelector } from "@/app/analytics/components/ChannelSelector";
import { CoinImage } from "@/components/ui/CoinImage";
import dynamic from "next/dynamic";

// Add client-only components for loading indicators
const LoadingDots = () => (
  <span className="ml-2 text-blue-400 inline-flex">
    <span className="w-2 text-center animate-[dots_1.4s_infinite]">.</span>
    <span className="w-2 text-center animate-[dots_1.4s_0.2s_infinite]">.</span>
    <span className="w-2 text-center animate-[dots_1.4s_0.4s_infinite]">.</span>
  </span>
);

const LoadingIndicator = () => (
  <div className="mt-2 text-xs text-gray-400 italic flex items-center">
    <div className="w-2 h-2 rounded-full bg-blue-400 mr-1.5 animate-pulse"></div>
    Updating market data...
  </div>
);

// Create dynamic imports with SSR disabled
const ClientLoadingDots = dynamic(() => Promise.resolve(LoadingDots), {
  ssr: false,
});

const ClientLoadingIndicator = dynamic(
  () => Promise.resolve(LoadingIndicator),
  {
    ssr: false,
  }
);

type ExtendedCoinData = CoinData & {
  rpoints: number;
  total_mentions: number;
  exact_knowledge_name?: string; // Add this property to fix type errors
};

interface CoinCategoryData {
  channel: string;
  date: string;
  coin: string;
  rpoints: number;
  categories: string[];
  total_count: number;
}

interface ProcessedData {
  projectDistribution: { name: string; value: number }[];
  projectTrends: Map<string, { date: string; rpoints: number }[]>;
  categoryDistribution: { name: string; value: number }[];
  coinCategories: CoinCategoryData[];
  channels: string[];
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface CombinedMarketTableProps {
  processedData: ProcessedData;
  selectedChannels?: string[];
  onCoinSelect?: (coin: {
    symbol: string;
    coingecko_id: string;
    data: ExtendedCoinData;
  }) => void;
  onChannelsChange?: (channels: string[]) => void;
}

export function CombinedMarketTable({
  processedData,
  selectedChannels = [],
  onCoinSelect,
  onChannelsChange,
}: CombinedMarketTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Debug flag for displaying debug information
  const debug = false; // Set to true to show debug panels

  // Add a filter reset flag to help with synchronization issues
  // Commented out due to unused variable lint error, but preserved for future use
  // const [filterResetFlag, setFilterResetFlag] = useState(0);

  // Add loadingVisible state for handling hydration mismatches with the isFetching indicator
  // const [loadingVisible, setLoadingVisible] = useState(false);

  // Create exactCoinMapRef here with the other refs
  const exactCoinMapRef = useRef(
    new Map<
      string,
      {
        symbol: string;
        points: number;
        date: string;
        mentions: number;
        channel: string;
        exact_name: string; // Add exact name to help with precise matching
      }
    >()
  );

  // Debug utils
  const debugFilters = (enable = false) => {
    if (!enable) return;

    console.group("FILTERS DEBUG");
    console.log("Selected channels:", localSelectedChannels);
    console.log("Available channels:", processedData.channels);
    console.log("Date preset:", datePreset);
    console.log("Show most recent:", showMostRecent);
    console.log("Date range:", dateRange);
    console.groupEnd();
  };

  const defaultChannels = processedData.channels;

  const initializeChannels = (): string[] => {
    // First try to get from session storage
    try {
      if (typeof window !== "undefined") {
        const storedChannels = sessionStorage.getItem("cryptoSelectedChannels");
        if (storedChannels) {
          const parsedChannels = JSON.parse(storedChannels);
          if (Array.isArray(parsedChannels) && parsedChannels.length > 0) {
            return parsedChannels;
          }
        }
      }
    } catch (error) {
      console.error("Error restoring channels from session storage:", error);
    }
    // Fallback to default channels
    return defaultChannels;
  };

  // Internal channel state
  const [internalSelectedChannels, setInternalSelectedChannels] =
    useState<string[]>(initializeChannels);

  // Handle channel changes
  const handleChannelsChange = (channels: string[]) => {
    setInternalSelectedChannels(channels);
    // Store in session storage for persistence
    sessionStorage.setItem("cryptoSelectedChannels", JSON.stringify(channels));
    // Notify parent component if callback exists
    if (onChannelsChange) {
      onChannelsChange(channels);
    }
  };

  // Add a local state for selectedChannels that we can modify
  const [localSelectedChannels, setLocalSelectedChannels] =
    useState<string[]>(selectedChannels);

  // Keep local state in sync with prop
  useEffect(() => {
    setLocalSelectedChannels(selectedChannels);
  }, [selectedChannels]);

  // Parse the current page directly from URL with useCallback
  const getCurrentPageFromUrl = useCallback(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam) : 1;
  }, [searchParams]);

  // Use the function for initial state
  const [currentPage, setCurrentPage] = useState(getCurrentPageFromUrl());

  // First, add a flag to prevent overwriting URL changes
  const isChangingPage = useRef(false);
  // Add an additional lock to prevent invalid page values from propagating
  const isProcessingNaN = useRef(false);

  // Add history debug logging
  useEffect(() => {
    // Log URL changes to help debug
    const handleUrlChange = () => {
      console.log("URL CHANGED:", window.location.href);
    };

    // Listen for history changes
    window.addEventListener("popstate", handleUrlChange);

    // Add an alias to router.push to debug URL changes
    const originalPush = router.push;

    router.push = function (url: string, options: Record<string, unknown>) {
      console.log("ROUTER PUSH CALLED:", url, options);
      return originalPush.call(this, url, options);
    };

    return () => {
      window.removeEventListener("popstate", handleUrlChange);

      router.push = originalPush;
    };
  }, [router]);

  // Replace the updatePageUrl function with a more direct version that uses window.history directly
  const updatePageUrl = useCallback(
    (page: number) => {
      // Guard against NaN values
      if (isNaN(page) || page < 1) {
        console.log("Ignoring invalid page value:", page);
        // Only update to page 1 if we're not already processing a NaN value
        if (!isProcessingNaN.current) {
          isProcessingNaN.current = true;
          page = 1;
        } else {
          // If we're already handling a NaN value, just ignore this update
          return;
        }
      }

      // Set flag to indicate we're in the middle of a page change
      isChangingPage.current = true;

      // Create URL based on CoinMarketCap pattern
      let newUrl = pathname;
      if (page > 1) {
        newUrl += `?page=${page}`;
      }

      // Log what we're about to do
      console.log(`UPDATING URL: ${newUrl}, page=${page}`);

      // Update the URL using history API directly to avoid Next.js interference
      if (page === 1) {
        window.history.replaceState({ page: 1 }, "", newUrl);
      } else {
        window.history.pushState({ page }, "", newUrl);
      }

      // Update internal state
      setCurrentPage(page);

      // Store in session storage for persistence across reloads
      sessionStorage.setItem("cryptoTableCurrentPage", page.toString());

      // Clear the flags after a delay
      setTimeout(() => {
        isChangingPage.current = false;
        isProcessingNaN.current = false;

        // Verify URL wasn't changed by something else
        if (page > 1 && !window.location.href.includes(`page=${page}`)) {
          console.error("URL was modified by something else!");
          // Try again with a direct approach if needed
          window.history.pushState({ page }, "", newUrl);
        }
      }, 150); // Increased delay slightly for better stability
    },
    [pathname]
  );

  // Add a direct listener for popstate events to handle back/forward browser navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log("PopState event occurred", event.state);

      // Skip if we're already processing a page change
      if (isChangingPage.current) {
        return;
      }

      // Get the current page from URL
      const url = new URL(window.location.href);
      const pageParam = url.searchParams.get("page");
      const pageFromUrl = pageParam ? parseInt(pageParam) : 1;

      if (!isNaN(pageFromUrl) && pageFromUrl !== currentPage) {
        console.log(`Browser navigation changed page to ${pageFromUrl}`);
        // Set the lock first
        isChangingPage.current = true;
        // Update our state to match the URL
        setCurrentPage(pageFromUrl);
        sessionStorage.setItem(
          "cryptoTableCurrentPage",
          pageFromUrl.toString()
        );
        // Release the lock after a delay
        setTimeout(() => {
          isChangingPage.current = false;
        }, 100);
      }
    };

    // Listen for back/forward button clicks
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [currentPage]);

  // Completely replace the useEffect that syncs URL to state
  useEffect(() => {
    // Skip during active page changes
    if (isChangingPage.current) {
      return;
    }

    // Get the page from the URL directly instead of using searchParams
    const url = new URL(window.location.href);
    const pageParam = url.searchParams.get("page");
    const pageFromUrl = pageParam ? parseInt(pageParam) : 1;

    if (!isNaN(pageFromUrl) && pageFromUrl !== currentPage) {
      console.log(
        `URL has page=${pageFromUrl}, but state has page=${currentPage}. Syncing.`
      );
      isChangingPage.current = true;
      setCurrentPage(pageFromUrl);
      setTimeout(() => {
        isChangingPage.current = false;
      }, 100);
    }
  }, [searchParams, currentPage]);

  const [showMostRecent, setShowMostRecent] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [datePreset, setDatePreset] = useState<string>("all-time");
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [matchingCoinsCount, setMatchingCoinsCount] = useState(0);
  const refreshKeyRef = useRef(0);
  const prevDataRef = useRef<ExtendedCoinData[]>([]);

  // Add the navigation detection effect after refreshKeyRef is defined
  useEffect(() => {
    // Detect if this is a navigation back to the page
    const isNavigatingBack =
      sessionStorage.getItem("navigatingBackToCryptoMarkets") === "true";

    if (isNavigatingBack) {
      console.log("Navigation back detected, refreshing data...");
      // Increment refresh key to trigger a new data fetch
      refreshKeyRef.current += 1;

      // Clear the navigation flag
      sessionStorage.removeItem("navigatingBackToCryptoMarkets");
    }
  }, []);

  // New state for UI components
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [showCount, setShowCount] = useState(100);
  const [tableColumns, setTableColumns] = useState<Column[]>([
    { id: "index", name: "#", enabled: true },
    { id: "name", name: "Coins", enabled: true },
    { id: "price", name: "Price", enabled: true },
    { id: "percent_change_24h", name: "24h %", enabled: true },
    { id: "volume_24h", name: "24h Volume", enabled: true },
    { id: "market_cap", name: "Market Cap", enabled: true },
    { id: "total_mentions", name: "Total Mentions", enabled: true },
  ]);

  // Filter settings state
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    dateRange,
    datePreset,
    showMostRecent,
    chains: [],
    categories: [],
    ageUnit: "hours",
  });

  // Reference to the current sorted data for pagination stability
  const prevSortedDataRef = useRef<ExtendedCoinData[]>([]);

  // Around line 80, add a new search state
  const [searchTerm, setSearchTerm] = useState("");
  // Remove unused categoryFilter and rename it in places where it's needed
  const [showCategoryTable, setShowCategoryTable] = useState(false);

  // Initialize filterSettings properly
  useEffect(() => {
    // Make sure filterSettings uses the correct datePreset value
    setFilterSettings((prev) => ({
      ...prev,
      datePreset: "all-time",
      showMostRecent: false,
      dateRange: { from: undefined, to: undefined },
    }));

    console.log("Initialized filterSettings with all-time preset");
  }, []);

  // Get unique dates from coinCategories
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    processedData.coinCategories.forEach((coin) => {
      if (
        localSelectedChannels.length === 0 ||
        localSelectedChannels.includes(coin.channel)
      ) {
        dates.add(coin.date);
      }
    });
    return Array.from(dates).sort();
  }, [processedData.coinCategories, localSelectedChannels]);

  // Get earliest and latest dates
  const dateRangeInfo = useMemo(() => {
    if (availableDates.length === 0) return null;
    const earliest = new Date(availableDates[0]);
    const latest = new Date(availableDates[availableDates.length - 1]);
    return { earliest, latest };
  }, [availableDates]);

  // Handle preset date range selection
  const handleDatePresetChange = (value: string) => {
    console.log("Setting date preset to:", value);
    setDatePreset(value);
    const now = new Date();

    // Use the same code structure as the direct button handlers for consistency
    if (value === "" || value === "all-time") {
      // All Time - clear date range and most recent flag
      console.log("Applying ALL TIME filter from preset selector");
      setDateRange({ from: undefined, to: undefined });
      setShowMostRecent(false);
      setDateFilterActive(false);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: "all-time",
        dateRange: { from: undefined, to: undefined },
        showMostRecent: false,
      }));
    } else if (value === "most-recent") {
      // Most Recent - set the flag to true but clear date range
      console.log("Applying MOST RECENT filter from preset selector");
      setDateRange({ from: undefined, to: undefined });
      setShowMostRecent(true);
      setDateFilterActive(true);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: "most-recent",
        dateRange: { from: undefined, to: undefined },
        showMostRecent: true,
      }));
    } else if (value === "today") {
      const today = startOfDay(now);
      setDateRange({ from: today, to: endOfDay(now) });
      setShowMostRecent(false);
      setDateFilterActive(true);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: value,
        dateRange: { from: today, to: endOfDay(now) },
        showMostRecent: false,
      }));
    } else if (value === "yesterday") {
      const yesterday = startOfDay(subDays(now, 1));
      setDateRange({ from: yesterday, to: endOfDay(yesterday) });
      setShowMostRecent(false);
      setDateFilterActive(true);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: value,
        dateRange: { from: yesterday, to: endOfDay(yesterday) },
        showMostRecent: false,
      }));
    } else if (value === "last7days") {
      const lastWeek = startOfDay(subDays(now, 7));
      setDateRange({ from: lastWeek, to: endOfDay(now) });
      setShowMostRecent(false);
      setDateFilterActive(true);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: value,
        dateRange: { from: lastWeek, to: endOfDay(now) },
        showMostRecent: false,
      }));
    } else if (value === "last30days") {
      const lastMonth = startOfDay(subDays(now, 30));
      setDateRange({ from: lastMonth, to: endOfDay(now) });
      setShowMostRecent(false);
      setDateFilterActive(true);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: value,
        dateRange: { from: lastMonth, to: endOfDay(now) },
        showMostRecent: false,
      }));
    } else if (value === "custom") {
      // Don't reset the date range when switching to custom
      setShowMostRecent(false);
      setDateFilterActive(!!dateRange.from || !!dateRange.to);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: "custom",
        showMostRecent: false,
      }));
    } else {
      // Default fallback to all-time
      setDateRange({ from: undefined, to: undefined });
      setShowMostRecent(false);
      setDateFilterActive(false);
      setFilterSettings((prev) => ({
        ...prev,
        datePreset: "all-time",
        dateRange: { from: undefined, to: undefined },
        showMostRecent: false,
      }));
    }

    // Force data refresh by incrementing the refresh key
    refreshKeyRef.current += 1;
    // Also increment the filter reset flag to ensure re-filtering
    // Removed commented reference to setFilterResetFlag
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<FilterSettings>) => {
    setFilterSettings((prev) => ({
      ...prev,
      ...newFilters,
    }));

    if (newFilters.dateRange) {
      setDateRange(newFilters.dateRange);
    }

    if (newFilters.showMostRecent !== undefined) {
      setShowMostRecent(newFilters.showMostRecent);
    }
  };

  // Handle apply filters
  const handleApplyFilters = () => {
    // Debug flag to control logging
    const debug = true;

    // Call our debug utility with the debug flag
    debugFilters(debug);

    // Only log essential filter information with debug flag
    if (debug) {
      console.log("\n=== APPLYING FILTERS ===");
      console.log(
        "Filters applied - chains:",
        filterSettings.chains,
        "categories:",
        filterSettings.categories
      );
      console.log("Date preset:", filterSettings.datePreset);
      console.log("showMostRecent flag:", filterSettings.showMostRecent);
      console.log("Date range:", filterSettings.dateRange);
    }

    // Check if we're changing between a significant filter that should reset pagination
    const isSignificantChange =
      filterSettings.dateRange.from !== dateRange.from ||
      filterSettings.dateRange.to !== dateRange.to ||
      filterSettings.showMostRecent !== showMostRecent ||
      (filterSettings.chains.length > 0 &&
        filterSettings.chains[0] !== "all") ||
      (filterSettings.categories.length > 0 &&
        filterSettings.categories[0] !== "all");

    // IMPROVED FILTER MODE DETECTION: More explicit handling of filter modes based on datePreset
    const isMostRecent = filterSettings.datePreset === "most-recent";
    const isAllTime =
      filterSettings.datePreset === "all-time" ||
      filterSettings.datePreset === "";

    if (debug) {
      console.log("Direct filter mode check:");
      console.log("- Is Most Recent preset?", isMostRecent);
      console.log("- Is All Time preset?", isAllTime);
    }

    // IMPORTANT: Apply filter settings with explicit state updates in the correct order
    // This ensures consistent state across all filter-related variables
    if (isAllTime) {
      // All Time filter - explicitly reset all date-related filters
      setDateRange({ from: undefined, to: undefined });
      setShowMostRecent(false);
      setDatePreset("all-time");

      // Update filter settings to match
      setFilterSettings((prev) => ({
        ...prev,
        dateRange: { from: undefined, to: undefined },
        datePreset: "all-time",
        showMostRecent: false,
      }));
    } else if (isMostRecent) {
      // Most Recent filter - clear date range but set showMostRecent flag
      setDateRange({ from: undefined, to: undefined });
      setShowMostRecent(true);
      setDatePreset("most-recent");

      // Update filter settings to match
      setFilterSettings((prev) => ({
        ...prev,
        dateRange: { from: undefined, to: undefined },
        datePreset: "most-recent",
        showMostRecent: true,
      }));
    } else {
      // Other date filters - apply the date range and ensure most-recent is off
      setDateRange(filterSettings.dateRange);
      setShowMostRecent(false);
      setDatePreset(filterSettings.datePreset);

      // Update filter settings for consistency
      setFilterSettings((prev) => ({
        ...prev,
        showMostRecent: false,
      }));
    }

    if (debug) {
      console.log("After applying filters:");
      console.log("Current datePreset:", filterSettings.datePreset);
      console.log("showMostRecent flag set to:", isMostRecent);

      if (isMostRecent) {
        console.log(
          "APPLYING MOST RECENT FILTER - THIS SHOULD RESTRICT TO LATEST DATES"
        );
        console.log("Current value of showMostRecent state:", showMostRecent);
      } else if (isAllTime) {
        console.log("APPLYING ALL TIME FILTER - THIS SHOULD SHOW ALL DATES");
      }
    }

    // Update date filter active status - consider most recent as a filter
    setDateFilterActive(
      !!(
        filterSettings.dateRange.from ||
        filterSettings.dateRange.to ||
        isMostRecent
      )
    );

    // Close the filter panel
    setFiltersOpen(false);

    // Force data refresh by incrementing these counters
    refreshKeyRef.current += 1;
    // Removed commented reference to setFilterResetFlag

    // Reset to page 1 if applying a significant filter
    if (isSignificantChange) {
      resetToPage1();
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    console.log("Resetting all filters");

    // Set All Time as the default preset
    setDatePreset("all-time");
    setShowMostRecent(false);
    setDateRange({ from: undefined, to: undefined });
    setDateFilterActive(false);

    // Reset filter settings
    const resetFilters: FilterSettings = {
      dateRange: { from: undefined, to: undefined },
      datePreset: "all-time",
      showMostRecent: false,
      chains: [], // Add this back to fix the TypeScript error
      categories: [],
      ageUnit: "hours",
      marketCapMin: undefined,
      marketCapMax: undefined,
      priceChangeMin: undefined,
      priceChangeMax: undefined,
      volumeMin: undefined,
      volumeMax: undefined,
    };

    setFilterSettings(resetFilters);

    // Force a data refresh
    refreshKeyRef.current += 1;

    // Reset to page 1 when filters are reset
    resetToPage1();
  };

  // Handle column changes
  const handleColumnChange = (updatedColumns: Column[]) => {
    setTableColumns(updatedColumns);
  };

  const handleCoinSelect = (coin: ExtendedCoinData | null) => {
    if (!onCoinSelect || !coin) return;
    onCoinSelect({
      symbol: coin.symbol,
      coingecko_id: coin.id,
      data: {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        price: coin.price || coin.current_price || 0,
        current_price: coin.price || coin.current_price || 0,
        market_cap: coin.market_cap || 0,
        volume_24h: coin.total_volume || coin.volume_24h || 0,
        percent_change_24h:
          coin.price_change_percentage_24h || coin.percent_change_24h || 0,
        price_change_percentage_24h:
          coin.price_change_percentage_24h || coin.percent_change_24h || 0,
        circulating_supply: coin.circulating_supply || 0,
        image: coin.image || "",
        coingecko_id: coin.id,
        cmc_id: coin.cmc_id,
        market_cap_rank: coin.market_cap_rank || 0,
        fully_diluted_valuation: coin.fully_diluted_valuation || 0,
        total_volume: coin.total_volume || coin.volume_24h || 0,
        high_24h: coin.high_24h || 0,
        low_24h: coin.low_24h || 0,
        price_change_24h: coin.price_change_24h || 0,
        market_cap_change_24h: coin.market_cap_change_24h || 0,
        market_cap_change_percentage_24h:
          coin.market_cap_change_percentage_24h || 0,
        total_supply: coin.total_supply || 0,
        max_supply: coin.max_supply || 0,
        ath: coin.ath || 0,
        ath_change_percentage: coin.ath_change_percentage || 0,
        ath_date: coin.ath_date || "",
        atl: coin.atl || 0,
        atl_change_percentage: coin.atl_change_percentage || 0,
        atl_date: coin.atl_date || "",
        roi: coin.roi || null,
        last_updated: coin.last_updated || "",
        rpoints: coin.rpoints || 0,
        total_mentions: coin.total_mentions || 0,
        data_source: coin.data_source || (coin.cmc_id ? "cmc" : "coingecko"),
      },
    });
  };

  // Fix in symbols useMemo to ensure total_mentions are correctly initialized and tracked separately per coin
  const symbols = useMemo(() => {
    console.log("CRITICAL FILTER STATE:", {
      showMostRecent,
      datePreset,
      isAllTime: datePreset === "all-time" || datePreset === "",
      isMostRecent: datePreset === "most-recent",
    });

    // Create a map to track unique coins by their EXACT name
    // This prevents coins like "Bitcoin" and "Dog (Bitcoin)" from sharing mentions
    const exactCoinMap = new Map<
      string, // Using exact coin name as key
      {
        symbol: string;
        points: number;
        date: string;
        mentions: number;
        channel: string;
        exact_name: string; // Store exact name for precise matching
      }
    >();

    // Use ALL channels when none are selected
    const channels =
      localSelectedChannels.length > 0
        ? localSelectedChannels
        : processedData.channels;
    const channelSet = new Set(channels);

    // Get latest dates for each channel
    const latestDates = new Map<string, string>();
    processedData.coinCategories.forEach((c) => {
      if (channelSet.has(c.channel)) {
        if (
          !latestDates.has(c.channel) ||
          c.date > latestDates.get(c.channel)!
        ) {
          latestDates.set(c.channel, c.date);
        }
      }
    });

    let count = 0;

    // First pass: collect all coins with their EXACT names
    processedData.coinCategories.forEach((coin) => {
      // Only include coins from selected channels
      if (!channelSet.has(coin.channel)) return;

      // Handle Most Recent filter
      const isMostRecentFilter = datePreset === "most-recent";
      if (isMostRecentFilter) {
        const latestDateForChannel = latestDates.get(coin.channel);
        if (coin.date !== latestDateForChannel) {
          return; // Skip non-latest coins
        }
      }

      // Skip if outside date range - only applied when date range is set
      if (dateRange.from || dateRange.to) {
        const coinDate = new Date(coin.date);
        coinDate.setHours(0, 0, 0, 0);

        let fromDate, toDate;
        if (dateRange.from) {
          fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (coinDate < fromDate) return;
        }

        if (dateRange.to) {
          toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (coinDate > toDate) return;
        }
      }

      count++;

      // IMPORTANT CHANGE: Use the exact, complete coin name as key
      // This ensures each unique coin gets its own mention count
      const exactKey = coin.coin.trim();

      // Extract symbol for API matching later
      const symbolMatch = coin.coin.match(/\(\$([^)]+)\)/);
      const symbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";

      const existing = exactCoinMap.get(exactKey);
      if (existing) {
        // If this coin is from a more recent date for its channel, update it
        const existingDate = new Date(existing.date);
        const currentDate = new Date(coin.date);

        if (existing.channel === coin.channel && currentDate > existingDate) {
          // Update with more recent data from the same channel
          existing.points = coin.rpoints;
          existing.date = coin.date;
        } else if (
          existing.channel !== coin.channel &&
          coin.rpoints > existing.points
        ) {
          // This is data from a different channel - use if the points are higher
          existing.points = coin.rpoints;
          existing.date = coin.date;
          existing.channel = coin.channel;
        }

        // Always add to the total mentions count
        existing.mentions += coin.total_count || 1;
      } else {
        // Initialize new entry with total_count
        exactCoinMap.set(exactKey, {
          symbol: symbol || exactKey.toLowerCase(), // Fallback to name if no symbol
          points: coin.rpoints,
          date: coin.date,
          mentions: coin.total_count || 1,
          channel: coin.channel,
          exact_name: exactKey, // Store the exact name to help with precise matching
        });
      }
    });

    // Update the matching coins count
    setMatchingCoinsCount(count);

    // Store the exactCoinMap in our ref so sortedCoinData can use it
    exactCoinMapRef.current = exactCoinMap;

    // Create a map from symbols to exact coin keys
    // This allows us to track multiple exact coins that map to the same symbol
    // e.g., "Bitcoin" and "Dog (Bitcoin)" both have symbol BTC
    const symbolToExactKeys = new Map<string, string[]>();

    // Add all exact coins to their corresponding symbols
    exactCoinMap.forEach((data, exactKey) => {
      if (!symbolToExactKeys.has(data.symbol)) {
        symbolToExactKeys.set(data.symbol, []);
      }
      symbolToExactKeys.get(data.symbol)?.push(exactKey);
    });

    // IMPORTANT: Log the mapping to help debug (only if debug is enabled)
    if (debug) {
      console.log("Symbol to exact name mapping:");
      symbolToExactKeys.forEach((exactKeys, symbol) => {
        console.log(`Symbol ${symbol} maps to:`, exactKeys);
      });
    }

    // Return a unique list of symbols for API calls
    // Each symbol will fetch data for potentially multiple exact coins
    const uniqueSymbols = Array.from(symbolToExactKeys.keys());

    if (debug) {
      console.log(
        `Generated symbols list with ${uniqueSymbols.length} unique symbols from ${count} total coins`
      );
      console.log(`Selected channels: ${channels.join(", ")}`);
    }

    return uniqueSymbols;
  }, [
    processedData.coinCategories,
    localSelectedChannels,
    processedData.channels,
    dateRange,
    datePreset,
    debug,
    showMostRecent,
  ]);

  // Fetch coin data with improved error handling
  // Use only coinData, not contextMarketData
  const {
    data: coinData,
    isFetching,
    refetch,
  } = useCoinData(symbols, refreshKeyRef.current, "full");

  // Remove the original useEffect that forces refetch

  // Combined loading state - simplify to just use direct coinData loading state
  const isDataFetching = useMemo(() => {
    return isFetching;
  }, [isFetching]);

  // Use coinData directly without context data
  const combinedCoinData = useMemo(() => {
    // Simplified logging
    if (!coinData?.data?.length) {
      // Only log this once instead of multiple times
      if (!prevDataRef.current || prevDataRef.current.length === 0) {
        console.log("API data unavailable - using fallback data");
      }
    }
    return coinData;
  }, [coinData]);

  // Add a ref to track the previous sort order
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Track initial load state
  useEffect(() => {
    if (combinedCoinData?.data && combinedCoinData.data.length > 0) {
      setIsInitialLoad(false);
    }
  }, [combinedCoinData]);

  // Normalize category name to match CoinGecko IDs
  const normalizeCategory = (category: string): string => {
    if (!category || typeof category !== "string") {
      return ""; // Return empty string for null/undefined/non-string values
    }

    const normalized = category.toLowerCase().trim();

    // Handle specific categories that need exact mapping to CoinGecko
    const exactMappings: Record<string, string> = {
      "ai & big data": "artificial-intelligence",
      "ai & ml": "artificial-intelligence",
      ai: "artificial-intelligence",
      "artificial intelligence": "artificial-intelligence",
      "artificial-intelligence": "artificial-intelligence",
      "ai & machine learning": "artificial-intelligence",
    };

    if (exactMappings[normalized]) {
      return exactMappings[normalized];
    }

    // Handle special cases for common categories with variations
    if (
      normalized === "meme" ||
      normalized === "meme coin" ||
      normalized === "meme coins" ||
      normalized === "memes" ||
      normalized === "memecoin"
    ) {
      return "meme-token";
    }

    if (normalized === "defi" || normalized === "decentralized finance") {
      return "decentralized-finance-defi";
    }

    if (
      normalized === "layer 1" ||
      normalized === "l1" ||
      normalized === "layer-1"
    ) {
      return "layer-1";
    }

    if (
      normalized === "gaming" ||
      normalized === "games" ||
      normalized === "game" ||
      normalized === "p2e" ||
      normalized === "play to earn"
    ) {
      return "gaming-entertainment-social";
    }

    if (
      normalized === "exchange token" ||
      normalized === "exchange tokens" ||
      normalized === "exchange"
    ) {
      return "centralized-exchange-token-cex";
    }

    if (
      normalized === "payment" ||
      normalized === "payments" ||
      normalized === "payment solution" ||
      normalized === "payment solutions" ||
      normalized === "payment protocol" ||
      normalized === "transaction" ||
      normalized === "remittance" ||
      normalized === "cross-border" ||
      normalized === "cross border" ||
      normalized === "crossborder"
    ) {
      return "payment-solutions";
    }

    if (
      normalized === "privacy" ||
      normalized === "privacy coin" ||
      normalized === "privacy coins" ||
      normalized === "private" ||
      normalized === "anonymity"
    ) {
      return "privacy-coins";
    }

    if (
      normalized === "infrastructure" ||
      normalized === "infra" ||
      normalized === "blockchain infrastructure" ||
      normalized === "web3 infrastructure"
    ) {
      return "infrastructure";
    }

    if (
      normalized === "oracle" ||
      normalized === "oracles" ||
      normalized === "data oracle" ||
      normalized === "price oracle" ||
      normalized === "price feed"
    ) {
      return "oracle";
    }

    if (
      normalized === "nft" ||
      normalized === "nfts" ||
      normalized === "non-fungible token" ||
      normalized === "non fungible token" ||
      normalized === "collectible" ||
      normalized === "collectibles"
    ) {
      return "non-fungible-tokens-nft";
    }

    if (
      normalized === "staking" ||
      normalized === "stake" ||
      normalized === "staking platform" ||
      normalized === "staking protocol" ||
      normalized === "validator" ||
      normalized === "pos"
    ) {
      return "staking-pool";
    }

    if (
      normalized === "scaling" ||
      normalized === "layer 2" ||
      normalized === "l2" ||
      normalized === "rollup" ||
      normalized === "rollups" ||
      normalized === "sidechain" ||
      normalized === "scalability"
    ) {
      return "layer-2";
    }

    if (
      normalized === "utility" ||
      normalized === "utility token" ||
      normalized === "utility tokens" ||
      normalized === "platform token"
    ) {
      return "utility-token";
    }

    // Default case - convert to kebab-case and replace special characters
    return normalized
      .replace(/&/g, "and")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-"); // Replace multiple hyphens with a single one
  };

  // Fix in the sortedCoinData useMemo to use the exactCoinMapRef
  const sortedCoinData = useMemo(() => {
    // For the "Most Recent" filter:
    // We collect the latest data for each coin from each selected channel.
    // 1. For each channel, we only include coins from its most recent date
    // 2. We merge data for the same coin across channels, preferring:
    //    - More recent data from the same channel
    //    - Higher points data when comparing different channels
    // 3. We then match this data with the API coin data for display
    // This ensures we show a combined view of the latest trends across all selected channels.

    // Enable debugging to track matching
    const debug = true;

    // Only log on initial processing or when filters change
    const baseData = prevDataRef.current;
    if (!combinedCoinData?.data?.length) {
      console.log(
        "No combined coin data available - using previous data:",
        baseData.length
      );

      // IMPORTANT: If there's no API data and no previous data,
      // create data directly from processedData.coinCategories
      if (baseData.length === 0 && processedData.coinCategories.length > 0) {
        console.log("Creating fallback data from knowledge base entries");

        // Extract unique coin entries from coinCategories
        const uniqueCoins = new Map();

        // Get channel filter
        const channels =
          localSelectedChannels.length > 0
            ? localSelectedChannels
            : processedData.channels;
        const channelSet = new Set(channels);

        processedData.coinCategories.forEach((coin) => {
          // Apply channel filter
          if (!channelSet.has(coin.channel)) return;

          // Skip if outside date range - only applied when date range is set
          if (dateRange.from || dateRange.to) {
            const coinDate = new Date(coin.date);
            coinDate.setHours(0, 0, 0, 0);

            let fromDate, toDate;
            if (dateRange.from) {
              fromDate = new Date(dateRange.from);
              fromDate.setHours(0, 0, 0, 0);
              if (coinDate < fromDate) return;
            }

            if (dateRange.to) {
              toDate = new Date(dateRange.to);
              toDate.setHours(23, 59, 59, 999);
              if (coinDate > toDate) return;
            }
          }

          // Extract symbol and name
          const symbolMatch = coin.coin.match(/\(\$([^)]+)\)/);
          const symbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";
          const name = coin.coin.replace(/\s*\(\$[^)]+\)/g, "").trim();

          const key = symbol || name.toLowerCase();

          if (uniqueCoins.has(key)) {
            // Update mentions count for existing coin
            const existing = uniqueCoins.get(key);
            existing.total_mentions =
              (existing.total_mentions || 0) + (coin.total_count || 1);
            if (coin.rpoints > existing.rpoints) {
              existing.rpoints = coin.rpoints;
            }
          } else {
            // Create new coin entry
            uniqueCoins.set(key, {
              id: key,
              symbol: symbol || key,
              name: name,
              rpoints: coin.rpoints,
              total_mentions: coin.total_count || 1,
              price: 0,
              current_price: 0,
              market_cap: 0,
              volume_24h: 0,
              total_volume: 0,
              percent_change_24h: 0,
              price_change_percentage_24h: 0,
              image: "",
              data_source: "knowledge", // Mark as coming from knowledge base
              exact_knowledge_name: coin.coin,
            });
          }
        });

        // Convert to array and sort by rpoints
        const fallbackData = Array.from(uniqueCoins.values()).sort(
          (a, b) => b.rpoints - a.rpoints
        );

        console.log(`Created ${fallbackData.length} fallback coin entries`);

        // Save to previous data ref for next render
        prevDataRef.current = fallbackData;
        return fallbackData;
      }

      return baseData;
    }

    console.log(
      `Processing ${combinedCoinData.data.length} coins from API response`
    );

    // Debug API data format
    // if (debug) {
    //   console.log("First coin from API data:", combinedCoinData.data[0]);
    // }

    // Access the exact coin map that we saved in the symbols function
    const exactCoins = exactCoinMapRef.current;

    // Process the API data
    const result: ExtendedCoinData[] = [];

    // COMPLETELY NEW MATCHING APPROACH:
    // 1. Create a map to track processed coins to avoid duplicates
    const processedCoins = new Set<string>();

    // 2. Create a mapping of cleaned coin names to API coins for better matching
    const apiCoinMap = new Map<string, CoinData>();
    combinedCoinData.data.forEach((coin) => {
      if (coin.name) {
        apiCoinMap.set(coin.name.toLowerCase().trim(), coin);

        // Also map by symbol for secondary matching
        if (coin.symbol) {
          apiCoinMap.set(coin.symbol.toLowerCase().trim(), coin);
        }
      }
    });

    // 3. First iterate through our exact coin names to ensure we keep the exact mention counts
    exactCoins.forEach((coinData, exactName) => {
      // Extract clean name without symbol for matching
      const cleanExactName = exactName
        .replace(/\s*\(\$[^)]+\)/g, "")
        .toLowerCase()
        .trim();

      // Get the symbol from the exact name - this is important for correct matching
      const symbolMatch = exactName.match(/\(\$([^)]+)\)/);
      const exactSymbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";

      // First, try to find an exact match by both name and symbol
      let matchedApiCoin = null;

      // Look for exact name match first (highest priority)
      for (const apiCoin of combinedCoinData.data) {
        if (
          apiCoin.name &&
          cleanExactName === apiCoin.name.toLowerCase().trim()
        ) {
          // If symbol also matches, this is a perfect match
          if (
            exactSymbol &&
            apiCoin.symbol &&
            exactSymbol === apiCoin.symbol.toLowerCase().trim()
          ) {
            matchedApiCoin = apiCoin;
            break;
          }

          // Strong match by name (even if symbol doesn't match exactly)
          matchedApiCoin = apiCoin;
          break;
        }
      }

      // If no exact name match was found, try matching by symbol
      // But be careful with coins like HarryPotterObamaSonic10Inu that have symbol "BITCOIN"
      if (!matchedApiCoin && exactSymbol) {
        // Only match by symbol if the name ALSO contains part of the symbol
        // This prevents wrong matches like HarryPotterObamaSonic10Inu -> Bitcoin
        const possibleMatches = combinedCoinData.data.filter(
          (apiCoin) =>
            apiCoin.symbol &&
            apiCoin.symbol.toLowerCase() === exactSymbol &&
            (apiCoin.name.toLowerCase().includes(exactSymbol) ||
              cleanExactName.includes(apiCoin.name.toLowerCase()))
        );

        if (possibleMatches.length > 0) {
          // Take the first match or the one with highest market cap
          matchedApiCoin = possibleMatches.sort(
            (a, b) => (b.market_cap || 0) - (a.market_cap || 0)
          )[0];
        }
      }

      // Fallback to coinData.symbol from our mapping, but with strict verification
      if (!matchedApiCoin && coinData.symbol) {
        // Only use this if the symbol is not a common word or too generic
        if (
          coinData.symbol.length >= 3 &&
          !["btc", "eth", "bitcoin", "ethereum"].includes(coinData.symbol)
        ) {
          const symbolMatch = combinedCoinData.data.find(
            (apiCoin) =>
              apiCoin.symbol &&
              apiCoin.symbol.toLowerCase() === coinData.symbol &&
              (apiCoin.name.toLowerCase().includes(coinData.symbol) ||
                cleanExactName.includes(apiCoin.name.toLowerCase()))
          );

          if (symbolMatch) {
            matchedApiCoin = symbolMatch;
            // Remove debug logging of individual symbol matches
          }
        }
      }

      // If we found a match in API data through any matching method
      if (matchedApiCoin) {
        // Generate a unique ID for this coin to avoid duplicates
        const coinUniqueId = matchedApiCoin.id + "-" + exactName;

        // Only process this coin if we haven't seen it before
        if (!processedCoins.has(coinUniqueId)) {
          processedCoins.add(coinUniqueId);

          // Push to results with exact mention count from our knowledge data
          result.push({
            ...matchedApiCoin,
            rpoints: coinData.points,
            total_mentions: coinData.mentions,
            data_source: matchedApiCoin.cmc_id ? "cmc" : "coingecko",
            // Store the exact name to help with display/debugging
            exact_knowledge_name: exactName,
          } as ExtendedCoinData);

          if (debug) {
            // Only log matched coins in debug mode but not each individual one
            // This line was causing too many logs but we maintain its presence for the debug flag
          }
        }
      } else if (debug) {
        // Don't log every failed match - this was flooding the console
      }
    });

    // Log the result count
    if (debug) {
      console.log(
        `Found ${result.length} matching coins from ${exactCoins.size} total entries`
      );
    }

    // Sort by rpoints (primary) and market cap (secondary)
    const sortedResult = [...result].sort(
      (a, b) =>
        b.rpoints - a.rpoints || (b.market_cap || 0) - (a.market_cap || 0)
    );

    // Apply search filter if searchTerm is provided
    let filteredResult = [...sortedResult];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredResult = filteredResult.filter(
        (coin) =>
          coin.name?.toLowerCase()?.includes(lowerSearch) ||
          coin.symbol?.toLowerCase()?.includes(lowerSearch)
      );
    }

    // Apply category filter if filterSettings has categories and not set to "all"
    if (
      filterSettings.categories.length > 0 &&
      filterSettings.categories[0] !== "all"
    ) {
      filteredResult = filteredResult.filter((coin) => {
        // Find all mentions of this coin in the data
        const coinMentions = processedData.coinCategories.filter((c) => {
          // Use exact_knowledge_name for more precise matching if available
          if (
            coin.exact_knowledge_name &&
            c.coin === coin.exact_knowledge_name
          ) {
            return true;
          }

          // Otherwise fall back to symbol and name matching
          const symbolMatch = c.coin.match(/\(\$([^)]+)\)/);
          const coinSymbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";
          const cleanCoinName = c.coin
            ? c.coin
                .replace(/\s*\(\$[^)]+\)/g, "")
                .toLowerCase()
                .trim()
            : "";

          return (
            coinSymbol === coin.symbol.toLowerCase() ||
            (cleanCoinName &&
              coin.name &&
              cleanCoinName.includes(coin.name.toLowerCase())) ||
            (coin.name &&
              cleanCoinName &&
              coin.name.toLowerCase().includes(cleanCoinName))
          );
        });

        // Check if any mention has one of the required categories
        return coinMentions.some((mention) =>
          mention.categories && Array.isArray(mention.categories)
            ? mention.categories.some(
                (cat) =>
                  cat &&
                  typeof cat === "string" &&
                  filterSettings.categories.includes(
                    normalizeCategory(cat.toLowerCase())
                  )
              )
            : false
        );
      });
    }

    // Apply price change filters (gainers/losers)
    if (
      filterSettings.priceChangeMin !== undefined ||
      filterSettings.priceChangeMax !== undefined
    ) {
      // Apply minimum filter (gainers)
      if (filterSettings.priceChangeMin !== undefined) {
        const min = parseFloat(filterSettings.priceChangeMin);
        if (!isNaN(min)) {
          filteredResult = filteredResult.filter((coin) => {
            const priceChange =
              coin.price_change_percentage_24h || coin.percent_change_24h || 0;
            return priceChange >= min;
          });
        }
      }

      // Apply maximum filter (losers)
      if (filterSettings.priceChangeMax !== undefined) {
        const max = parseFloat(filterSettings.priceChangeMax);
        if (!isNaN(max)) {
          filteredResult = filteredResult.filter((coin) => {
            const priceChange =
              coin.price_change_percentage_24h || coin.percent_change_24h || 0;
            return priceChange <= max;
          });
        }
      }
    }

    // Apply market cap filters
    if (
      filterSettings.marketCapMin !== undefined ||
      filterSettings.marketCapMax !== undefined
    ) {
      if (filterSettings.marketCapMin !== undefined) {
        const min = parseFloat(filterSettings.marketCapMin);
        if (!isNaN(min)) {
          filteredResult = filteredResult.filter(
            (coin) => (coin.market_cap || 0) >= min
          );
        }
      }

      if (filterSettings.marketCapMax !== undefined) {
        const max = parseFloat(filterSettings.marketCapMax);
        if (!isNaN(max)) {
          filteredResult = filteredResult.filter(
            (coin) => (coin.market_cap || 0) <= max
          );
        }
      }
    }

    // Apply volume filters
    if (
      filterSettings.volumeMin !== undefined ||
      filterSettings.volumeMax !== undefined
    ) {
      if (filterSettings.volumeMin !== undefined) {
        const min = parseFloat(filterSettings.volumeMin);
        if (!isNaN(min)) {
          filteredResult = filteredResult.filter(
            (coin) => (coin.volume_24h || coin.total_volume || 0) >= min
          );
        }
      }

      if (filterSettings.volumeMax !== undefined) {
        const max = parseFloat(filterSettings.volumeMax);
        if (!isNaN(max)) {
          filteredResult = filteredResult.filter(
            (coin) => (coin.volume_24h || coin.total_volume || 0) <= max
          );
        }
      }
    }

    prevDataRef.current = filteredResult;
    prevSortedDataRef.current = filteredResult;
    return filteredResult;
  }, [
    combinedCoinData,
    processedData.coinCategories,
    localSelectedChannels,
    processedData.channels,
    dateRange,
    searchTerm,
    filterSettings,
  ]);

  // Control pagination when data changes
  useEffect(() => {
    // When the data changes, ensure we're not trying to view a page that doesn't exist
    if (sortedCoinData.length > 0) {
      const pageCount = Math.ceil(sortedCoinData.length / showCount);
      if (currentPage > pageCount) {
        setCurrentPage(1);
      }
    }

    // isDataFetching is used inside the component but not included in the deps array
    if (isDataFetching) {
      // Reset to first page when data is loading
      setCurrentPage(1);
    }
  }, [sortedCoinData, showCount, currentPage, isDataFetching]);

  const memoizedColumns = useMemo(
    () => [
      {
        accessorKey: "index",
        header: "#",
        size: 60, // Reduced size for mobile
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[15px] text-gray-400 font-medium">
            {row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: "name",
        header: "Coins",
        size: 300,
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="flex items-center gap-3">
            {row.original.image && (
              <CoinImage
                src={row.original.image}
                alt={row.original.name || ""}
                width={32}
                height={32}
                className="w-8 h-8 md:w-8 md:h-8"
                coinId={row.original.cmc_id || row.original.id}
                fallbackText={row.original.symbol?.substring(0, 2)}
                source={
                  row.original.data_source === "cmc" ? "cmc" : "coingecko"
                }
              />
            )}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-[14px] md:text-[15px] font-medium text-gray-100 truncate max-w-[80px] md:max-w-[200px]">
                  {row.original.name}
                </span>
                <span
                  className={`text-[10px] md:text-xs px-1 md:px-2 py-0.5 rounded-full ${
                    row.original.data_source === "cmc"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {row.original.data_source === "cmc" ? "CMC" : "CG"}
                </span>
              </div>
              <span className="text-[10px] md:text-xs text-gray-400">
                {row.original.symbol?.toUpperCase()}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => {
          const price = row.original.price || row.original.current_price || 0;
          const priceChange = row.original.price_change_percentage_24h || 0;

          // Format price based on its value
          let formattedPrice;
          if (price < 0.0000001) {
            formattedPrice = price.toFixed(10).replace(/\.?0+$/, "");
          } else if (price < 0.00001) {
            formattedPrice = price.toFixed(8).replace(/\.?0+$/, "");
          } else if (price < 0.01) {
            formattedPrice = price.toFixed(6).replace(/\.?0+$/, "");
          } else if (price < 1) {
            formattedPrice = price.toFixed(4).replace(/\.?0+$/, "");
          } else if (price < 100) {
            formattedPrice = price.toFixed(2).replace(/\.?0+$/, "");
          } else {
            formattedPrice = formatCurrency(price).replace("$", "");
          }

          return (
            <div
              className={`font-medium transition-colors duration-300 text-left text-[12px] md:text-[15px] ${
                priceChange > 0
                  ? "text-green-400"
                  : priceChange < 0
                  ? "text-red-400"
                  : "text-gray-100"
              }`}
            >
              ${formattedPrice}
            </div>
          );
        },
        size: 120, // Reduced for mobile
      },
      {
        accessorKey: "percent_change_24h",
        header: "24h %",
        size: 100, // Reduced for mobile
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => {
          const value = row.original.percent_change_24h ?? 0;
          return (
            <div
              className={`text-[12px] md:text-[15px] font-medium ${
                value >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatPercentage(value)}
            </div>
          );
        },
      },
      {
        accessorKey: "volume_24h",
        header: "24h Volume",
        size: 150, // Reduced for mobile
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[12px] md:text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.volume_24h)}
          </div>
        ),
      },
      {
        accessorKey: "market_cap",
        header: "Market Cap",
        size: 150, // Reduced for mobile
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[12px] md:text-[15px] font-medium text-gray-100">
            {formatCurrency(row.original.market_cap)}
          </div>
        ),
      },
      {
        accessorKey: "total_mentions",
        header: "Total Mentions",
        size: 120, // Reduced for mobile
        cell: ({ row }: { row: Row<ExtendedCoinData> }) => (
          <div className="text-[12px] md:text-[15px] font-medium text-blue-300">
            {(row.original.total_mentions || 0).toLocaleString()}
          </div>
        ),
      },
    ],
    []
  );

  // Create visible columns based on enabled state
  const visibleColumns = useMemo(
    () =>
      memoizedColumns.filter((col) => {
        const tableColumn = tableColumns.find((c) => c.id === col.accessorKey);
        return !tableColumn || tableColumn.enabled;
      }),
    [memoizedColumns, tableColumns]
  );

  const onRowClick = (row: ExtendedCoinData) => {
    handleCoinSelect(row);

    // Save current page in history state so we can navigate back properly
    const currentPageNumber = currentPage;

    console.log(`Navigating from page ${currentPageNumber} to coin details`);

    // Save page in session storage
    sessionStorage.setItem("last_page_number", currentPageNumber.toString());
    sessionStorage.setItem("back_navigation_pending", "true");

    // Set flag to indicate we're navigating away
    sessionStorage.setItem("navigatingBackToCryptoMarkets", "true");

    // Create target URL with proper ID format
    let targetUrl;
    if (row.data_source === "cmc") {
      const coinId = `cmc-${row.cmc_id}`;
      targetUrl = `/coin/${coinId}`;
    } else {
      targetUrl = `/coin/${row.id}`;
    }

    // Navigate to coin details
    router.push(targetUrl);
  };

  // Add a new effect to handle page restoration when coming back from coin details
  useEffect(() => {
    // Check if we need to restore the page
    if (sessionStorage.getItem("back_navigation_pending") === "true") {
      // Get the saved page
      const savedPage = sessionStorage.getItem("last_page_number");

      if (savedPage) {
        const pageNum = parseInt(savedPage);

        // Check if we need to restore a different page
        if (!isNaN(pageNum) && pageNum > 1 && pageNum !== currentPage) {
          console.log(
            `Restoring to saved page ${pageNum} after coming back from coin details`
          );

          // Use setTimeout to let the component mount first
          setTimeout(() => {
            updatePageUrl(pageNum);
          }, 100);
        }
      }

      // Clear the flag
      sessionStorage.removeItem("back_navigation_pending");
      sessionStorage.removeItem("last_page_number");
    }
  }, [currentPage, updatePageUrl]);

  // Handle show count change
  const handleShowCountChange = (count: number) => {
    // Calculate if we need to adjust the current page when reducing items per page
    if (count < showCount) {
      const currentItemIndex = (currentPage - 1) * showCount;
      const newPageIndex = Math.floor(currentItemIndex / count) + 1;
      setCurrentPage(newPageIndex);
    }

    setShowCount(count);
  };

  // Add a ref to track if URL update is needed
  // const needsUrlUpdate = useRef(false); // Commented out to fix lint error

  // Use a simple cleanup effect instead
  useEffect(() => {
    return () => {
      // Reset the back navigation flag when leaving the page
      sessionStorage.removeItem("back_navigation_handled");
    };
  }, []);

  // Reset function simplified
  const resetToPage1 = () => {
    // Reset to page 1 for search, category, or major filter changes
    console.log("Resetting to page 1");
    updatePageUrl(1);
  };

  // Add handleSearch function
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Reset to page 1 and update URL
    updatePageUrl(1);
  };

  // Handle category filtering
  const handleCategoryFilter = (category: string | null) => {
    console.log("Category filter:", category);

    if (category) {
      // Apply category filter
      setFilterSettings((prev) => ({
        ...prev,
        categories: [category],
      }));
    } else {
      // Clear category filter
      setFilterSettings((prev) => ({
        ...prev,
        categories: [],
      }));
    }

    // Reset to page 1 in URL
    updatePageUrl(1);
  };

  // Update the handleTabChange function to only show category table, not navigate
  const handleTabChange = (tab: TabType) => {
    console.log("Tab changed:", tab);

    // Always reset to page 1 when changing tabs
    setCurrentPage(1);

    if (tab === "categories") {
      setShowCategoryTable(true);
      // Apply no category filter
      setFilterSettings((prev) => ({
        ...prev,
        categories: [],
      }));
    } else if (tab === "all") {
      setShowCategoryTable(false);
      // Reset category filters
      setFilterSettings((prev) => ({
        ...prev,
        categories: [],
      }));
    } else {
      // No longer navigating for specific categories
      // Just reset to allow the category filter to work
      setShowCategoryTable(false);
    }
  };

  // Add a handler for category selection
  const handleCategorySelect = (category: string) => {
    // When a category is selected from the CategoriesTable,
    // set it as the active tab and filter
    console.log(`Category selected: ${category}`);

    // Instead of passing to handleTabChange, directly navigate to the category page
    router.push(`/categories/${normalizeCategory(category)}`);
  };

  // Update the Skeleton component
  const Skeleton = () => (
    <div
      className="py-2 px-4"
      style={{
        height: `${Math.min(showCount, 10) * 48}px`,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: Math.min(showCount, 10) }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center space-x-4 py-3 border-b border-gray-800/30"
        >
          <div className="w-8 h-4 bg-gray-700/50 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gray-700/60"></div>
              <div>
                <div className="h-4 bg-gray-700/50 rounded w-32"></div>
                <div className="h-3 mt-1 bg-gray-700/30 rounded w-16"></div>
              </div>
            </div>
          </div>
          <div className="h-4 bg-gray-700/50 rounded w-16"></div>
          <div className="h-4 bg-gray-700/50 rounded w-16"></div>
          <div className="h-4 bg-gray-700/50 rounded w-24"></div>
          <div className="h-4 bg-gray-700/50 rounded w-16"></div>
        </div>
      ))}
    </div>
  );

  // Add a ref to store pagination state
  const paginationStateRef = useRef({ page: 1 });

  // Create a ref to store the data-table's DOM element
  const tableRef = useRef<HTMLDivElement | null>(null);

  // Use a MutationObserver to detect when pagination resets
  useEffect(() => {
    // Initial setup - capture current page whenever it changes
    const observer = new MutationObserver(() => {
      const paginationElements =
        document.querySelectorAll(".pagination-button");
      paginationElements.forEach((btn) => {
        if (btn.classList.contains("bg-blue-600")) {
          const pageNumber = parseInt(btn.textContent || "1", 10);
          if (pageNumber !== paginationStateRef.current.page) {
            paginationStateRef.current.page = pageNumber;
            console.log(`Page changed to: ${pageNumber}`);
          }
        }
      });
    });

    // Start observing the table for pagination changes
    if (tableRef.current) {
      observer.observe(tableRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  // Replace the current useEffect for pagination state with this more robust implementation
  useEffect(() => {
    if (!isDataFetching && sortedCoinData.length > 0) {
      // Store current page in sessionStorage to persist across data refreshes
      sessionStorage.setItem("cryptoTableCurrentPage", currentPage.toString());
    }
  }, [currentPage, isDataFetching, sortedCoinData.length, isFetching]);

  // Add this effect to restore pagination from sessionStorage when data loads
  useEffect(() => {
    if (!isFetching && sortedCoinData.length > 0) {
      const savedPage = sessionStorage.getItem("cryptoTableCurrentPage");
      if (savedPage && parseInt(savedPage) !== currentPage) {
        const pageNum = parseInt(savedPage);
        // Verify the requested page is valid
        const maxPage = Math.ceil(sortedCoinData.length / showCount);
        if (pageNum > 0 && pageNum <= maxPage) {
          setCurrentPage(pageNum);
        }
      }
    }
  }, [isFetching, sortedCoinData, showCount, currentPage]);

  // Modify the coinData useEffect to prevent resetting page
  useEffect(() => {
    if (combinedCoinData?.data && combinedCoinData.data.length > 0) {
      setIsInitialLoad(false);
      // Don't reset the page here - this was potentially causing issues
    }
  }, [combinedCoinData]);

  // Add a simple console log to view current page state
  useEffect(() => {
    console.log(`CombinedMarketTable: Page state is ${currentPage}`);
  }, [currentPage]);

  // Add a useCallback for handling data refreshes - place this before the return statement
  const handleDataRefresh = useCallback(() => {
    if (sortedCoinData.length > 0) {
      const maxPage = Math.ceil(sortedCoinData.length / showCount);

      if (currentPage > 0 && currentPage <= maxPage) {
        // Valid page, no need to log
      } else {
        // Only log for invalid pages that need adjustment
        const currentUrlPage = searchParams.get("page");
        if (currentUrlPage && parseInt(currentUrlPage) > maxPage) {
          updatePageUrl(1);
        }
      }
    }
  }, [sortedCoinData, showCount, currentPage, updatePageUrl, searchParams]);

  // Update the useEffect for sortedCoinData changes to use debounced refresh handler
  useEffect(() => {
    // Only handle data refresh if this is not the initial load
    if (!isInitialLoad && prevDataRef.current.length > 0) {
      // Use a short debounce to avoid multiple refreshes in quick succession
      const refreshTimer = setTimeout(() => {
        handleDataRefresh();
      }, 200);

      return () => clearTimeout(refreshTimer);
    }
  }, [sortedCoinData, handleDataRefresh, isInitialLoad]);

  // Fix the back navigation effect to respect the isChangingPage flag
  useEffect(() => {
    // Only run this once on initial mount
    const hasRun = sessionStorage.getItem("back_navigation_handled");
    if (hasRun === "true") {
      return;
    }

    // Mark as handled immediately to prevent multiple runs
    sessionStorage.setItem("back_navigation_handled", "true");

    // Check if we're coming back from coin details page
    const lastTableUrl = sessionStorage.getItem("last_table_page_url");

    if (lastTableUrl) {
      // Set the changing flag to prevent interference
      isChangingPage.current = true;

      try {
        const lastUrl = new URL(lastTableUrl);
        const lastPage = lastUrl.searchParams.get("page");

        // Clear the URL from storage to prevent reuse
        sessionStorage.removeItem("last_table_page_url");

        // Parse the page number
        const pageNum = lastPage ? parseInt(lastPage) : 1;

        if (isNaN(pageNum)) {
          // Invalid page number, reset to page 1
          setTimeout(() => updatePageUrl(1), 10);
        } else if (pageNum !== currentPage) {
          // Only update if different from current page
          setTimeout(() => updatePageUrl(pageNum), 10);
        } else {
          // Same page, just clear the flag
          isChangingPage.current = false;
        }
      } catch (error) {
        console.error("Failed to parse last table URL:", error);
        isChangingPage.current = false;
      }
    }

    // Add cleanup function to reset the flag when component unmounts
    return () => {
      sessionStorage.removeItem("back_navigation_handled");
    };
  }, [currentPage, updatePageUrl]); // Add dependencies

  // Add a reference to the previous URL page for comparison
  // const prevUrlPageRef = useRef<number | null>(null); // Removed unused reference

  // Add a stable table ID that won't cause remounts
  const tableId = useRef(`crypto-table-${Date.now()}`).current;

  // Add a ref to track if the component has been initialized
  const isInitialized = useRef(false);

  // On first render, set the page correctly from URL
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;

      // Get the initial page directly from URL
      const initialPage = getCurrentPageFromUrl();

      // Set the initial page directly without URL update
      if (initialPage !== currentPage) {
        setCurrentPage(initialPage);
      }
    }
  }, [currentPage, getCurrentPageFromUrl]);

  // Add a handler for DataTable's onPageChange that guards against NaN values
  const handlePageChange = (page: number) => {
    // Guard against NaN or invalid values
    if (isNaN(page) || page < 1) {
      // Only log the message once per session to avoid console spam
      if (!hasShownNaNWarningRef.current) {
        console.log("Invalid page number detected");
        hasShownNaNWarningRef.current = true;
      }
      return;
    }

    // Only update if the page is actually changing
    if (page !== currentPage) {
      // Set the flag first to prevent interference
      isChangingPage.current = true;
      // Directly update without router
      updatePageUrl(page);
    }
  };

  // Store selected channels in session storage whenever they change
  useEffect(() => {
    if (localSelectedChannels.length > 0) {
      sessionStorage.setItem(
        "cryptoSelectedChannels",
        JSON.stringify(localSelectedChannels)
      );
    }
  }, [localSelectedChannels]);

  // Try to restore selected channels from session storage on component mount
  useEffect(() => {
    const storedChannels = sessionStorage.getItem("cryptoSelectedChannels");
    if (storedChannels && JSON.parse(storedChannels).length > 0) {
      try {
        const channels = JSON.parse(storedChannels);
        if (Array.isArray(channels) && channels.length > 0) {
          setLocalSelectedChannels(channels);
        }
      } catch (error) {
        console.error("Failed to parse stored channels", error);
      }
    }
  }, []);

  // Add a more robust refresh handler using a ref to track the last refresh time
  const lastRefreshTimeRef = useRef(0);

  // Track refreshKey changes and debounce rapid updates
  useEffect(() => {
    const currentTime = Date.now();
    const timeSinceLastRefresh = currentTime - lastRefreshTimeRef.current;

    // Only process if it's been more than 500ms since last refresh
    if (timeSinceLastRefresh < 500) {
      return;
    }

    if (refreshKeyRef.current > 0) {
      lastRefreshTimeRef.current = currentTime;

      // Use timeout to ensure state updates have propagated
      const timer = setTimeout(() => {
        // Clear any local storage cache to force fresh data
        try {
          localStorage.removeItem("cryptolens_direct_api_cache");
        } catch (error) {
          console.error("Cache clear failed", error);
        }

        // Force query refresh
        refetch();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [refreshKeyRef, refetch]);

  // Add a new ref to track if we've shown the warning
  // Place near other useRef declarations around line 800-900
  const hasShownNaNWarningRef = useRef(false);

  return (
    <div className="space-y-4">
      {/* Add the channel selector at the top */}
      <div className="flex justify-between items-center">
        <div>{/* You could add a title or other controls here */}</div>
        <ChannelSelector
          channels={processedData.channels}
          selectedChannels={internalSelectedChannels}
          onChannelsChange={handleChannelsChange}
        />
      </div>

      {/* New Table Header Component */}
      <CryptoTableHeader
        onTabChange={handleTabChange}
        onOpenFilters={() => setFiltersOpen(true)}
        onToggleColumns={() => setColumnsOpen(true)}
        showCount={showCount}
        onShowCountChange={handleShowCountChange}
        onSearch={handleSearch}
        onCategoryFilter={handleCategoryFilter}
      />

      {/* Status bar with count */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {dateFilterActive && matchingCoinsCount === 0
            ? "No coins found for this date range"
            : `${sortedCoinData.length} coins`}
          {/* Replace with client-only component */}
          {isFetching && <ClientLoadingDots />}
        </div>

        {/* Date filter controls */}
        <div className="flex items-center gap-2">
          {/* Basic toggle buttons for All Time / Most Recent */}
          <div className="flex items-center bg-gray-800/70 border border-gray-700 rounded-lg overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                datePreset === "all-time"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700/50"
              }`}
              onClick={() => {
                console.log("Toggling to ALL TIME directly");
                // Direct implementation to set to All Time
                setDatePreset("all-time");
                setShowMostRecent(false);
                setDateRange({ from: undefined, to: undefined });
                setDateFilterActive(false);
                // Also update the filter settings object
                setFilterSettings((prev) => ({
                  ...prev,
                  datePreset: "all-time",
                  showMostRecent: false,
                  dateRange: { from: undefined, to: undefined },
                }));
                // Force refresh
                refreshKeyRef.current += 1;
              }}
            >
              All Time
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                datePreset === "most-recent"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700/50"
              }`}
              onClick={() => {
                console.log("Toggling to MOST RECENT directly");
                // Direct implementation to set to Most Recent
                setDatePreset("most-recent");
                setShowMostRecent(true);
                setDateRange({ from: undefined, to: undefined });
                setDateFilterActive(true);
                // Also update the filter settings object
                setFilterSettings((prev) => ({
                  ...prev,
                  datePreset: "most-recent",
                  showMostRecent: true,
                  dateRange: { from: undefined, to: undefined },
                }));
                // Force refresh
                refreshKeyRef.current += 1;
              }}
            >
              Most Recent
            </button>
          </div>

          {/* Date Preset Dropdown */}
          <Select
            value={
              datePreset !== "all-time" && datePreset !== "most-recent"
                ? datePreset
                : ""
            }
            onValueChange={(value) => {
              if (value) {
                handleDatePresetChange(value);
              }
            }}
          >
            <SelectTrigger className="w-[160px] h-9 text-sm bg-gray-800/70 border-gray-700 text-gray-200">
              <SelectValue placeholder="Date Filters" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="last90days">Last 3 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom date range selection - direct in-line calendar */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 text-sm bg-gray-800/70 border-gray-700 ${
                      dateRange.from
                        ? "text-blue-400 border-blue-700/50"
                        : "text-gray-200"
                    } hover:bg-gray-700`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      format(dateRange.from, "MMM d")
                    ) : (
                      <span>Start</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-gray-800 border-gray-700 p-0">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown-buttons"
                    selected={dateRange.from}
                    onSelect={(date) => {
                      // Update states in a consistent order
                      console.log(
                        `Setting start date to: ${
                          date ? date.toISOString().split("T")[0] : "undefined"
                        }`
                      );

                      const startTime = performance.now();
                      setDateRange({
                        ...dateRange,
                        from: date,
                      });
                      setFilterSettings((prev) => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          from: date,
                        },
                      }));
                      setDateFilterActive(true);

                      // Explicitly trigger refresh for immediate feedback
                      refreshKeyRef.current += 1;

                      // If we have an end date, might as well refresh data
                      if (dateRange.to) {
                        console.log(
                          "Start date set with existing end date - refreshing data"
                        );
                        setTimeout(() => (refreshKeyRef.current += 1), 50);
                      }

                      const endTime = performance.now();
                      console.log(
                        `Custom date filter update took ${(
                          endTime - startTime
                        ).toFixed(2)}ms`
                      );
                    }}
                    disabled={(date) => {
                      return (
                        date > new Date() || // Disable future dates
                        (dateRangeInfo?.earliest
                          ? date < dateRangeInfo.earliest
                          : false)
                      );
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-gray-400">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 text-sm bg-gray-800/70 border-gray-700 ${
                      dateRange.to
                        ? "text-blue-400 border-blue-700/50"
                        : "text-gray-200"
                    } hover:bg-gray-700`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? (
                      format(dateRange.to, "MMM d")
                    ) : (
                      <span>End</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="bg-gray-800 border-gray-700 p-0">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown-buttons"
                    selected={dateRange.to}
                    onSelect={(date) => {
                      // Update states in a consistent order
                      console.log(
                        `Setting end date to: ${
                          date ? date.toISOString().split("T")[0] : "undefined"
                        }`
                      );

                      const startTime = performance.now();
                      setDateRange({
                        ...dateRange,
                        to: date,
                      });
                      setFilterSettings((prev) => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          to: date,
                        },
                      }));
                      setDateFilterActive(true);

                      // Explicitly trigger refresh
                      refreshKeyRef.current += 1;

                      const endTime = performance.now();
                      console.log(
                        `Custom date filter update took ${(
                          endTime - startTime
                        ).toFixed(2)}ms`
                      );
                    }}
                    disabled={(date) => {
                      return (
                        date > new Date() || // Disable future dates
                        (dateRange.from
                          ? date < dateRange.from // Don't allow end date before start date
                          : false) ||
                        (dateRangeInfo?.earliest
                          ? date < dateRangeInfo.earliest
                          : false)
                      );
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="icon"
                className={`h-9 w-9 ${
                  dateFilterActive
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                    : "bg-gray-800/70 text-gray-300"
                }`}
                onClick={() => {
                  // Clear dates and trigger filter update with clearer logging
                  console.log("Clearing custom date range");

                  const startTime = performance.now();

                  // Clear dates in state
                  setDateRange({ from: undefined, to: undefined });
                  setFilterSettings((prev) => ({
                    ...prev,
                    dateRange: { from: undefined, to: undefined },
                  }));

                  // Handle filter state determination
                  if (dateFilterActive) {
                    console.log(
                      "Date filter was active, explicitly deactivating"
                    );
                    setDateFilterActive(false);
                  }

                  // Force double refresh after a small delay to ensure state is updated
                  refreshKeyRef.current += 1;
                  setTimeout(() => {
                    refreshKeyRef.current += 1;
                    const endTime = performance.now();
                    console.log(
                      `Clearing date filter took ${(
                        endTime - startTime
                      ).toFixed(2)}ms total`
                    );
                  }, 50);
                }}
                title="Clear dates"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {showCategoryTable ? (
        <CategoriesTable
          processedData={processedData}
          onCategorySelect={handleCategorySelect}
        />
      ) : (
        <div className="bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-sm rounded-xl border border-gray-800/20 overflow-x-auto">
          {sortedCoinData.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-gray-500">
              <Filter className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {dateFilterActive
                  ? showMostRecent
                    ? "No recent coins found for the selected channels"
                    : datePreset === "custom"
                    ? "No coins found for the custom date range"
                    : `No coins found for the "${datePreset}" filter`
                  : searchTerm
                  ? `No coins found matching "${searchTerm}"`
                  : "No coins found with the current filters"}
              </p>
              <p className="text-sm mt-2">
                {dateFilterActive && showMostRecent
                  ? "Try selecting different channels or use 'All Time' filter"
                  : dateFilterActive && datePreset === "custom"
                  ? "Try selecting a broader date range or use a preset filter"
                  : dateFilterActive
                  ? "Try selecting a different time period or use 'All Time'"
                  : searchTerm
                  ? "Try a different search term or clear the search"
                  : "Try adjusting your filters or selecting different channels"}
              </p>

              {/* Action buttons */}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-800/50 border-gray-700 text-gray-200 hover:bg-gray-700"
                  onClick={handleResetFilters}
                >
                  Reset All Filters
                </Button>

                {dateFilterActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-700/20"
                    onClick={() => {
                      // Switch to All Time
                      setDatePreset("all-time");
                      setShowMostRecent(false);
                      setDateRange({ from: undefined, to: undefined });
                      setDateFilterActive(false);
                      setFilterSettings((prev) => ({
                        ...prev,
                        datePreset: "all-time",
                        showMostRecent: false,
                        dateRange: { from: undefined, to: undefined },
                      }));
                      refreshKeyRef.current += 1;
                    }}
                  >
                    Show All Time
                  </Button>
                )}
              </div>

              {/* Debug info section */}
              {debug && (
                <div className="mt-4 p-3 bg-gray-800 rounded text-xs text-left w-full max-w-lg">
                  <p className="text-blue-300 font-semibold">
                    Debug Filter Info:
                  </p>
                  <p>
                    Filter mode:{" "}
                    {showMostRecent
                      ? "Most Recent"
                      : dateFilterActive
                      ? datePreset === "custom"
                        ? "Custom Date Range"
                        : datePreset
                      : "All Time"}
                  </p>
                  <p>
                    Selected channels:{" "}
                    {localSelectedChannels.length > 0
                      ? localSelectedChannels.join(", ")
                      : "All channels"}
                  </p>
                  <p>Search term: {searchTerm || "None"}</p>
                  <p>
                    Category filter:{" "}
                    {filterSettings.categories.length > 0
                      ? filterSettings.categories.join(", ")
                      : "None"}
                  </p>
                  <p>
                    Chain filter:{" "}
                    {filterSettings.chains.length > 0
                      ? filterSettings.chains.join(", ")
                      : "None"}
                  </p>
                  <p>
                    Total categories in data:{" "}
                    {processedData.coinCategories.length}
                  </p>
                  <p>Matched before filtering: {matchingCoinsCount}</p>
                </div>
              )}
            </div>
          ) : isDataFetching && sortedCoinData.length === 0 ? (
            <Skeleton />
          ) : (
            <div ref={tableRef} className="overflow-x-auto">
              <DataTable
                key={tableId}
                columns={visibleColumns}
                data={sortedCoinData}
                onRowClick={onRowClick}
                virtualizeRows={true}
                isLoading={
                  isInitialLoad ||
                  (isDataFetching && sortedCoinData.length === 0)
                }
                pageSize={showCount}
                showPagination={true}
                currentPage={currentPage}
                initialPage={getCurrentPageFromUrl()}
                onPageChange={handlePageChange}
              />

              {/* Add loading indicator */}
              {isFetching && <ClientLoadingIndicator />}
            </div>
          )}
        </div>
      )}

      {/* Filters Panel */}
      <CryptoFiltersPanel
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filterSettings}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onApply={handleApplyFilters}
        dateRangeInfo={dateRangeInfo}
      />

      {/* Columns Selector */}
      <CryptoColumnsSelector
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        columns={tableColumns}
        onChange={handleColumnChange}
      />
    </div>
  );
}

export type { CoinCategoryData, ProcessedData };

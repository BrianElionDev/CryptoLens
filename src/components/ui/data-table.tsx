"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Cell,
  getPaginationRowModel,
  OnChangeFn,
  PaginationState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import styles from "../tables/cryptoTable.module.css";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (data: TData) => void;
  pageSize?: number;
  virtualizeRows?: boolean;
  isLoading?: boolean;
  showPagination?: boolean;
  className?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  initialPage?: number;
}

const CellContent = <TData,>({
  cell,
  rowId,
}: {
  cell: Cell<TData, unknown>;
  rowId: string;
}) => {
  const cellRef = useRef<HTMLDivElement>(null);
  const cellKey = `${rowId}-${cell.column.id}`;

  return (
    <div
      ref={cellRef}
      className="transition-all duration-300"
      data-cell-key={cellKey}
      data-column-id={cell.column.id}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </div>
  );
};

const LoadingCell = ({ width }: { width: number }) => (
  <td
    style={{ width }}
    className="py-5 px-4 whitespace-nowrap border-t border-gray-800/50"
  >
    <div className="animate-pulse">
      <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
    </div>
  </td>
);

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  pageSize = 100,
  virtualizeRows = false,
  isLoading = false,
  showPagination = true,
  className,
  currentPage,
  onPageChange,
  initialPage = 1,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = useState({
    pageIndex: initialPage > 0 ? initialPage - 1 : 0,
    pageSize: pageSize,
  });
  const prevDataRef = useRef<TData[]>([]);
  const prevDataLengthRef = useRef(0);
  const prevValuesMap = useRef(new Map<string, unknown>());
  const currentPageRef = useRef(0);
  const lastValidPageIndexRef = useRef<number>(0);

  // Prevents unnecessary onPageChange calls
  const prevCurrentPageRef = useRef<number | undefined>(currentPage);

  // Determine if pagination is controlled externally
  const isControlled = currentPage !== undefined && onPageChange !== undefined;

  // Calculate the actual pagination state to use based on props and internal state
  const pagination = useMemo(() => {
    // For controlled pagination, use the currentPage prop
    if (isControlled && currentPage !== undefined) {
      return {
        pageIndex: currentPage - 1,
        pageSize,
      };
    }
    // For uncontrolled pagination, use internal state
    return internalPagination;
  }, [isControlled, currentPage, pageSize, internalPagination]);

  // Update internal state when initialPage prop changes
  useEffect(() => {
    if (!isControlled && initialPage > 0) {
      const validPageIndex = Math.max(0, initialPage - 1);
      setInternalPagination((prev) => {
        if (prev.pageIndex !== validPageIndex) {
          return { ...prev, pageIndex: validPageIndex };
        }
        return prev;
      });
    }
  }, [initialPage, isControlled]);

  // Pagination change handler that respects controlled/uncontrolled mode
  const handlePaginationChange = useCallback(
    (newPagination: typeof pagination) => {
      const newPageIndex = newPagination.pageIndex;
      const newPage = newPageIndex + 1;

      if (isControlled) {
        // For controlled pagination, call the parent's callback only when page actually changes
        if (prevCurrentPageRef.current !== newPage && onPageChange) {
          onPageChange(newPage);
          prevCurrentPageRef.current = newPage;
        }
      } else {
        // For uncontrolled, update internal state
        setInternalPagination(newPagination);
      }

      // Always update tracking refs
      currentPageRef.current = newPageIndex;
      lastValidPageIndexRef.current = newPageIndex;
    },
    [isControlled, onPageChange]
  );

  // Track when controlled currentPage prop changes
  useEffect(() => {
    if (isControlled) {
      prevCurrentPageRef.current = currentPage;
    }
  }, [currentPage, isControlled]);

  // All useMemo hooks
  const displayData = useMemo(() => {
    // Track the previous data length to help with pagination stability
    if (data.length > 0) {
      prevDataLengthRef.current = data.length;
      return data;
    }
    if (isLoading && prevDataRef.current.length > 0) return prevDataRef.current;
    return [];
  }, [data, isLoading]);

  // Table setup with pagination
  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: handlePaginationChange as OnChangeFn<PaginationState>,
    state: {
      sorting,
      pagination,
    },
    manualPagination: !showPagination,
    debugTable: false,
  });

  // Update page size when it changes from props
  useEffect(() => {
    if (!isControlled) {
      setInternalPagination((prev) => ({
        ...prev,
        pageSize,
      }));
    }
  }, [pageSize, isControlled]);

  // Modify the useEffect for data changes to always preserve pagination position
  useEffect(() => {
    if (data.length > 0) {
      const pageCount = Math.ceil(data.length / pageSize);

      // Only handle page corrections for uncontrolled mode
      if (!isControlled) {
        // Maintain the selected page index whenever possible
        if (lastValidPageIndexRef.current >= pageCount) {
          // Page is out of bounds after data change, go to last valid page
          const newPageIndex = Math.max(0, pageCount - 1);

          setInternalPagination((prev) => ({
            ...prev,
            pageIndex: newPageIndex,
          }));

          lastValidPageIndexRef.current = newPageIndex;
        }
      }

      // Update refs
      prevDataRef.current = data;
      prevDataLengthRef.current = data.length;
    }
  }, [data, pageSize, isControlled]);

  // Move virtualizer setup before its usage
  const rowVirtualizer = useVirtualizer({
    count: Math.max(
      table.getRowModel().rows.length,
      prevDataRef.current.length
    ),
    getScrollElement: () => document.documentElement,
    estimateSize: () => 60,
    overscan: 10,
    enabled: virtualizeRows,
  });

  // Effects
  useEffect(() => {
    if (data.length > 0) {
      const updates = new Set<string>();

      data.forEach((item, index) => {
        const itemRecord = item as Record<string, unknown>;
        Object.keys(itemRecord).forEach((key) => {
          const cellKey = `${index}-${key}`;
          const currentValue = itemRecord[key];
          const prevValue = prevValuesMap.current.get(cellKey);

          if (prevValue !== undefined && prevValue !== currentValue) {
            updates.add(cellKey);
          }
          prevValuesMap.current.set(cellKey, currentValue);
        });
      });

      if (updates.size > 0) {
        requestAnimationFrame(() => {
          updates.forEach((cellKey) => {
            const element = document.querySelector(
              `[data-cell-key="${cellKey}"]`
            ) as HTMLElement;
            if (element) {
              element.classList.remove(styles.glowChange);
              void element.offsetWidth;
              element.classList.add(styles.glowChange);
            }
          });
        });
      }
    }
  }, [data]);

  // For controlled pagination, ensure the page is valid after data changes
  useEffect(() => {
    if (isControlled && data.length > 0 && onPageChange) {
      const pageCount = Math.ceil(data.length / pageSize);
      const currentPageIndex = (currentPage || 1) - 1;

      // If current page is invalid, notify parent
      if (currentPageIndex >= pageCount) {
        // Go to last valid page
        const validPage = Math.max(1, pageCount);
        if (validPage !== currentPage) {
          onPageChange(validPage);
          prevCurrentPageRef.current = validPage;
        }
      }
    }
  }, [data.length, isControlled, currentPage, pageSize, onPageChange]);

  // Calculate the effective current page to display
  const effectiveCurrentPage = useMemo(() => {
    return isControlled && currentPage
      ? currentPage
      : table.getState().pagination.pageIndex + 1;
  }, [isControlled, currentPage, table]);

  // Define setPage outside the PaginationControls component to avoid conditional hooks error
  const setPage = useCallback(
    (pageNumber: number) => {
      if (pageNumber < 1) pageNumber = 1;
      const maxPage = table.getPageCount() || 1;
      if (pageNumber > maxPage) pageNumber = maxPage;

      if (isControlled && onPageChange) {
        if (pageNumber !== prevCurrentPageRef.current) {
          onPageChange(pageNumber);
          prevCurrentPageRef.current = pageNumber;
        }
      } else {
        setInternalPagination((prev) => ({
          ...prev,
          pageIndex: pageNumber - 1,
        }));
      }
    },
    [table, onPageChange, isControlled]
  );

  // Pagination controls
  const PaginationControls = () => {
    if (!showPagination) return null;

    const pageCount = table.getPageCount() || 1;
    const currentPageNumber = effectiveCurrentPage;

    // Generate page numbers to display
    const getPageNumbers = () => {
      const maxVisiblePages = 5;
      const pages = [];

      if (pageCount <= maxVisiblePages) {
        // Show all pages if there are fewer than maxVisiblePages
        for (let i = 1; i <= pageCount; i++) {
          pages.push(i);
        }
      } else {
        // Always show first page
        pages.push(1);

        // Calculate the range of pages to show
        let startPage = Math.max(2, currentPageNumber - 1);
        let endPage = Math.min(pageCount - 1, currentPageNumber + 1);

        // Adjust if we're near the beginning
        if (currentPageNumber <= 3) {
          endPage = 4;
        }

        // Adjust if we're near the end
        if (currentPageNumber >= pageCount - 2) {
          startPage = pageCount - 3;
        }

        // Add ellipsis after first page if needed
        if (startPage > 2) {
          pages.push("ellipsis1");
        }

        // Add middle pages
        for (let i = startPage; i <= endPage; i++) {
          pages.push(i);
        }

        // Add ellipsis before last page if needed
        if (endPage < pageCount - 1) {
          pages.push("ellipsis2");
        }

        // Always show last page
        if (pageCount > 1) {
          pages.push(pageCount);
        }
      }

      return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 py-3 border-t border-gray-800 gap-3 sm:gap-0">
        <div className="flex items-center text-xs sm:text-sm text-gray-400 order-2 sm:order-1">
          <span>
            Page {currentPageNumber} of {pageCount}
          </span>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
          {/* First page button - hide on small screens */}
          <button
            className="hidden sm:block p-1.5 sm:p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(1)}
            disabled={currentPageNumber === 1}
            aria-label="First page"
            type="button"
          >
            <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>

          {/* Previous page button */}
          <button
            className="p-1.5 sm:p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(Math.max(1, currentPageNumber - 1))}
            disabled={currentPageNumber === 1}
            aria-label="Previous page"
            type="button"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>

          {/* Page number buttons - limit on mobile */}
          {pageNumbers
            .slice(0, window.innerWidth < 640 ? 3 : pageNumbers.length)
            .map((page, index) => {
              if (page === "ellipsis1" || page === "ellipsis2") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="text-gray-500 px-1"
                  >
                    ...
                  </span>
                );
              }

              const pageNumber = Number(page);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`pagination-button px-2 sm:px-3 py-1 rounded-md border text-xs sm:text-sm ${
                    currentPageNumber === pageNumber
                      ? "bg-blue-600 text-white border-blue-700"
                      : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={currentPageNumber === pageNumber}
                >
                  {page}
                </button>
              );
            })}

          {/* Next page button */}
          <button
            className="p-1.5 sm:p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(Math.min(pageCount, currentPageNumber + 1))}
            disabled={currentPageNumber === pageCount}
            aria-label="Next page"
            type="button"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>

          {/* Last page button - hide on small screens */}
          <button
            className="hidden sm:block p-1.5 sm:p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(pageCount)}
            disabled={currentPageNumber === pageCount}
            aria-label="Last page"
            type="button"
          >
            <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>

        <div className="hidden sm:flex items-center text-xs sm:text-sm text-gray-400 order-3">
          <span>
            Showing {table.getRowModel().rows.length} of {displayData.length}{" "}
            entries
          </span>
        </div>
      </div>
    );
  };

  // Only show loading state if we have no data at all
  if (displayData.length === 0 && isLoading) {
    return (
      <div
        className={`w-full ${styles.cryptoTableContainer} ${className || ""}`}
      >
        <div className="block lg:hidden">
          {/* Mobile Loading State */}
          <div className="overflow-hidden rounded-lg border border-gray-800/50 bg-gray-900/60 backdrop-blur-sm">
            <div className="flex">
              {/* Fixed columns skeleton */}
              <div className="flex-shrink-0 bg-gray-900/90 border-r border-gray-700/50">
                <table className="border-separate border-spacing-0">
                  <thead className="bg-gray-800/80">
                    <tr>
                      <th className="py-3 px-2 text-left text-xs font-semibold text-gray-300 w-10 border-b border-gray-700/50">
                        #
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-gray-300 w-32 border-b border-gray-700/50">
                        Coins
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="bg-gray-900/40">
                        <td className="py-3 px-2 border-b border-gray-800/30">
                          <div className="h-3 bg-gray-700/50 rounded w-4 animate-pulse"></div>
                        </td>
                        <td className="py-3 px-3 border-b border-gray-800/30">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-700/50 rounded-full animate-pulse"></div>
                            <div className="space-y-2">
                              <div className="h-3 bg-gray-700/50 rounded w-16 animate-pulse"></div>
                              <div className="h-2 bg-gray-700/30 rounded w-8 animate-pulse"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Scrollable columns skeleton */}
              <div className="flex-1 overflow-x-auto">
                <table className="border-separate border-spacing-0 w-full">
                  <thead className="bg-gray-800/80">
                    <tr>
                      <th className="py-3 px-3 w-24 border-b border-gray-700/50">
                        <div className="h-3 bg-gray-700/50 rounded w-12 animate-pulse"></div>
                      </th>
                      {columns.slice(3).map((column, colIndex) => (
                        <th
                          key={colIndex}
                          className="py-3 px-2 min-w-20 whitespace-nowrap border-b border-gray-700/50"
                        >
                          <div className="h-3 bg-gray-700/50 rounded w-12 animate-pulse"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="bg-gray-900/40">
                        <td className="py-3 px-3 w-24 border-b border-gray-800/30">
                          <div className="h-3 bg-gray-700/50 rounded w-12 animate-pulse"></div>
                        </td>
                        {columns.slice(3).map((column, colIndex) => (
                          <td
                            key={colIndex}
                            className="py-3 px-2 min-w-20 border-b border-gray-800/30"
                          >
                            <div className="h-3 bg-gray-700/50 rounded w-10 animate-pulse"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Loading State */}
        <div className="hidden lg:block">
          <table
            className={`w-full border-separate border-spacing-0 ${styles.cryptoTable}`}
          >
            <thead className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="w-full">
                  {headerGroup.headers.map((header) => {
                    const width = header.column.getSize();
                    return (
                      <th
                        key={header.id}
                        style={{ width }}
                        className="py-4 text-left text-sm font-medium text-gray-400 px-4 whitespace-nowrap hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="h-3 w-3 text-gray-500" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, index) => (
                <tr key={index} className="bg-gray-900/40">
                  {columns.map((column, colIndex) => (
                    <LoadingCell key={colIndex} width={column.size || 0} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Only show loading cells for new rows
  if (virtualizeRows) {
    return (
      <div
        className={`w-full ${styles.cryptoTableContainer} ${className || ""}`}
      >
        <style jsx global>{`
          .glow-change {
            animation: glow 2s ease-out;
          }
          @keyframes glow {
            0% {
              box-shadow: 0 0 0 rgba(59, 130, 246, 0);
            }
            20% {
              box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
            }
            100% {
              box-shadow: 0 0 0 rgba(59, 130, 246, 0);
            }
          }
        `}</style>

        {/* Mobile Table with Fixed Columns */}
        <div className="block lg:hidden">
          <div className="overflow-hidden rounded-lg border border-gray-800/50 bg-gray-900/60 backdrop-blur-sm">
            <div className="flex">
              {/* Fixed columns (# and Coins) */}
              <div className="flex-shrink-0 bg-gray-900/90 border-r border-gray-700/50">
                <table className="border-separate border-spacing-0">
                  <thead className="bg-gray-800/80">
                    <tr>
                      {table
                        .getHeaderGroups()[0]
                        ?.headers.slice(0, 2) // Only # + Coins
                        .map((header) => {
                          const isSorted = header.column.getIsSorted();
                          return (
                            <th
                              key={header.id}
                              className={`py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                                isSorted
                                  ? "text-blue-400"
                                  : "text-gray-300 hover:text-gray-100"
                              } transition-colors cursor-pointer border-b border-gray-700/50 ${
                                header.id === "index"
                                  ? "w-10 px-2" // Rank column
                                  : "w-32 px-3" // Coins column
                              }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <div className="flex items-center gap-1">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getCanSort() && (
                                  <span className="ml-1">
                                    {{
                                      asc: (
                                        <span className="text-blue-400 text-xs">
                                          ↑
                                        </span>
                                      ),
                                      desc: (
                                        <span className="text-blue-400 text-xs">
                                          ↓
                                        </span>
                                      ),
                                      false: (
                                        <ArrowUpDown className="h-3 w-3 text-gray-500" />
                                      ),
                                    }[isSorted as string] || null}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {rowVirtualizer?.getVirtualItems().map((virtualRow) => {
                      const row = table.getRowModel().rows[virtualRow.index];
                      if (!row) return null;

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-blue-500/5 transition-colors cursor-pointer bg-gray-900/40"
                          onClick={() => onRowClick?.(row.original)}
                        >
                          {row
                            .getVisibleCells()
                            .slice(0, 2) // Only # + Coins
                            .map((cell, index) => (
                              <td
                                key={cell.id}
                                className={`py-3 border-b border-gray-800/30 ${
                                  index === 0 ? "px-2" : "px-3" // Different padding for rank vs coins
                                }`}
                              >
                                <CellContent cell={cell} rowId={row.id} />
                              </td>
                            ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Scrollable columns with Price prominently shown */}
              <div className="flex-1 overflow-x-auto">
                <table className="border-separate border-spacing-0 w-full">
                  <thead className="bg-gray-800/80">
                    <tr>
                      {table
                        .getHeaderGroups()[0]
                        ?.headers.slice(2) // Start from Price column
                        .map((header, index) => {
                          const isSorted = header.column.getIsSorted();
                          return (
                            <th
                              key={header.id}
                              className={`py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                                isSorted
                                  ? "text-blue-400"
                                  : "text-gray-300 hover:text-gray-100"
                              } transition-colors cursor-pointer border-b border-gray-700/50 ${
                                index === 0
                                  ? "w-24 px-3 font-medium" // Price column - not sticky, let it scroll naturally
                                  : "min-w-20 px-2  text-xs" // Other columns
                              }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <div className="flex items-center gap-1">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getCanSort() && (
                                  <span className="ml-1">
                                    {{
                                      asc: (
                                        <span className="text-blue-400 text-xs">
                                          ↑
                                        </span>
                                      ),
                                      desc: (
                                        <span className="text-blue-400 text-xs">
                                          ↓
                                        </span>
                                      ),
                                      false: (
                                        <ArrowUpDown className="h-3 w-3 text-gray-500" />
                                      ),
                                    }[isSorted as string] || null}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {rowVirtualizer?.getVirtualItems().map((virtualRow) => {
                      const row = table.getRowModel().rows[virtualRow.index];
                      if (!row) return null;

                      return (
                        <tr
                          key={`scroll-${row.id}`}
                          className="hover:bg-blue-500/5 transition-colors cursor-pointer bg-gray-900/40"
                          onClick={() => onRowClick?.(row.original)}
                        >
                          {row
                            .getVisibleCells()
                            .slice(2) // Start from Price column
                            .map((cell, index) => (
                              <td
                                key={cell.id}
                                className={`py-3 border-b border-gray-800/30 ${
                                  index === 0
                                    ? "w-24 px-3 font-medium" // Price column - not sticky, let it scroll naturally
                                    : "min-w-20 px-2 py-7 text-xs" // Other columns
                                }`}
                              >
                                <CellContent cell={cell} rowId={row.id} />
                              </td>
                            ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className={styles.cryptoTable}>
            <thead className="sticky top-0 bg-gray-900/90 backdrop-blur-sm z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="w-full">
                  {headerGroup.headers.map((header) => {
                    const width = header.column.getSize();
                    const isSorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        style={{ width }}
                        className={`py-4 text-left text-sm font-medium px-4 whitespace-nowrap ${
                          isSorted
                            ? "text-blue-400"
                            : "text-gray-400 hover:text-gray-200"
                        } transition-colors cursor-pointer`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="ml-1">
                              {{
                                asc: <span className="text-blue-400">↑</span>,
                                desc: <span className="text-blue-400">↓</span>,
                                false: (
                                  <ArrowUpDown className="h-3 w-3 text-gray-500" />
                                ),
                              }[isSorted as string] || null}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rowVirtualizer?.getVirtualItems().map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];

                // Show loading state for new rows only
                if (!row && isLoading) {
                  return (
                    <tr
                      key={`loading-${virtualRow.index}`}
                      className="bg-gray-900/40"
                    >
                      {columns.map((column, colIndex) => (
                        <LoadingCell key={colIndex} width={column.size || 0} />
                      ))}
                    </tr>
                  );
                }

                if (!row) return null;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-500/5 transition-colors cursor-pointer bg-gray-900/40"
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const width = cell.column.getSize();
                      return (
                        <td
                          key={cell.id}
                          style={{ width }}
                          className="py-2 px-1 whitespace-nowrap border-t border-gray-800/50 text-xs"
                        >
                          <CellContent cell={cell} rowId={row.id} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {showPagination && <PaginationControls />}
      </div>
    );
  }

  return (
    <div className={`${styles.cryptoTableContainer} ${className || ""}`}>
      <style jsx global>{`
        .glow-change {
          animation: glow 2s ease-out;
        }
        @keyframes glow {
          0% {
            box-shadow: 0 0 0 rgba(59, 130, 246, 0);
          }
          20% {
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
          }
          100% {
            box-shadow: 0 0 0 rgba(59, 130, 246, 0);
          }
        }
      `}</style>
      <Table className={styles.cryptoTable}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isSorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.getSize() }}
                    className={`${
                      isSorted
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span className="ml-1">
                          {{
                            asc: <span className="text-blue-400">↑</span>,
                            desc: <span className="text-blue-400">↓</span>,
                            false: (
                              <ArrowUpDown className="h-3 w-3 text-gray-500" />
                            ),
                          }[isSorted as string] || null}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={`${onRowClick ? "cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                >
                  <CellContent cell={cell} rowId={row.id} />
                </TableCell>
              ))}
            </TableRow>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-4">
                <div className="text-sm text-gray-400">No data available</div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {showPagination && <PaginationControls />}
    </div>
  );
}

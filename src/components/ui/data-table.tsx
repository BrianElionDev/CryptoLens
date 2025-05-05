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

  // Determine if pagination is controlled externally
  const isControlled = currentPage !== undefined && onPageChange !== undefined;

  // Calculate the actual pagination state to use
  const pagination = isControlled
    ? { pageIndex: (currentPage || 1) - 1, pageSize }
    : internalPagination;

  // Pagination change handler that respects controlled/uncontrolled mode
  const handlePaginationChange = (newPagination: typeof pagination) => {
    const newPage = newPagination.pageIndex + 1;

    if (isControlled) {
      // For controlled pagination, call the parent's callback
      // Avoid unnecessary calls if page hasn't changed
      if (currentPage !== newPage) {
        onPageChange!(newPage);
      }
    } else {
      // For uncontrolled, update internal state
      setInternalPagination(newPagination);
    }

    // Always update the currentPageRef for internal tracking
    currentPageRef.current = newPagination.pageIndex;
    lastValidPageIndexRef.current = newPagination.pageIndex;
  };

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
    onPaginationChange: handlePaginationChange,
    state: {
      sorting,
      pagination,
    },
    manualPagination: !showPagination,
    debugTable: false,
  });

  // Update page size when it changes from props
  useEffect(() => {
    setInternalPagination((prev) => ({
      ...prev,
      pageSize,
    }));
  }, [pageSize]);

  // Modify the useEffect for data changes to always preserve pagination position
  useEffect(() => {
    if (data.length > 0) {
      const pageCount = Math.ceil(data.length / pageSize);

      // Maintain the selected page index whenever possible
      if (lastValidPageIndexRef.current >= pageCount) {
        // Page is out of bounds after data change, go to last valid page
        const newPageIndex = Math.max(0, pageCount - 1);

        // Don't call setPagination directly to avoid a full reset
        // Instead, just update the page on the table
        setTimeout(() => {
          if (table.getPageCount() > 0) {
            table.setPageIndex(newPageIndex);
            lastValidPageIndexRef.current = newPageIndex;
          }
        }, 0);
      } else {
        // Keep current page but update size - note we use lastValidPageIndexRef directly
        setInternalPagination(() => ({
          pageIndex: lastValidPageIndexRef.current,
          pageSize,
        }));
      }

      // Update refs
      prevDataRef.current = data;
      prevDataLengthRef.current = data.length;
    }
  }, [data, pageSize, table]);

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

  // Only update pageSize, never reset pageIndex when just the data changes
  useEffect(() => {
    if (!isControlled) {
      setInternalPagination((prev) => {
        // Check if current page is still valid
        const pageCount = Math.ceil(data.length / pageSize);
        const validPageIndex =
          prev.pageIndex >= pageCount
            ? Math.max(0, pageCount - 1)
            : prev.pageIndex;

        return {
          pageIndex: validPageIndex,
          pageSize,
        };
      });
    }
  }, [data.length, pageSize, isControlled]);

  // If using controlled pagination, ensure the page is valid after data changes
  useEffect(() => {
    if (isControlled && data.length > 0) {
      const pageCount = Math.ceil(data.length / pageSize);
      const currentPageIndex = (currentPage || 1) - 1;

      // If current page is invalid, notify parent
      if (currentPageIndex >= pageCount && onPageChange) {
        // Go to last valid page
        const validPage = Math.max(1, pageCount);
        onPageChange(validPage);
      }
    }
  }, [data.length, isControlled, currentPage, pageSize, onPageChange]);

  // For controlled pagination, override the current page calculation
  const effectiveCurrentPage =
    isControlled && currentPage
      ? currentPage
      : table.getState().pagination.pageIndex + 1;

  // Define setPage outside the PaginationControls component to avoid conditional hooks error
  const setPage = useCallback(
    (pageNumber: number) => {
      if (pageNumber < 1) pageNumber = 1;
      if (pageNumber > table.getPageCount()) pageNumber = table.getPageCount();
      if (onPageChange) onPageChange(pageNumber);
    },
    [table, onPageChange]
  );

  // Pagination controls
  const PaginationControls = () => {
    if (!showPagination) return null;

    const pageCount = table.getPageCount();
    const currentPageIndex = table.getState().pagination.pageIndex;
    const currentPageNumber = currentPageIndex + 1;

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
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
        <div className="flex items-center text-sm text-gray-400">
          <span>
            Page {effectiveCurrentPage} of {pageCount || 1}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(1)}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
            type="button"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            className="p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(Math.max(1, effectiveCurrentPage - 1))}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page number buttons */}
          {pageNumbers.map((page, index) => {
            if (page === "ellipsis1" || page === "ellipsis2") {
              return (
                <span key={`ellipsis-${index}`} className="text-gray-500">
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
                className={`pagination-button px-3 py-1 rounded-md border ${
                  effectiveCurrentPage === pageNumber
                    ? "bg-blue-600 text-white border-blue-700"
                    : "border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={effectiveCurrentPage === pageNumber}
              >
                {page}
              </button>
            );
          })}

          <button
            className="p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() =>
              setPage(Math.min(pageCount, effectiveCurrentPage + 1))
            }
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            className="p-2 rounded-md border border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setPage(pageCount)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
            type="button"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center text-sm text-gray-400">
          <span>
            Showing {table.getRowModel().rows.length} of {displayData.length}{" "}
            entries
          </span>
        </div>
      </div>
    );
  };

  // When initialPage changes, update pagination if it doesn't match current page
  useEffect(() => {
    if (initialPage && initialPage !== currentPage) {
      const pageIndex = initialPage - 1;
      const maxPageIndex = Math.ceil(data.length / pageSize) - 1;
      const validPageIndex = Math.min(
        Math.max(0, pageIndex),
        Math.max(0, maxPageIndex)
      );

      if (
        isControlled &&
        onPageChange &&
        validPageIndex !== pagination.pageIndex
      ) {
        onPageChange(validPageIndex + 1);
      } else if (!isControlled) {
        setInternalPagination(({ pageSize }) => ({
          pageIndex: validPageIndex,
          pageSize,
        }));
      }

      // Update refs
      currentPageRef.current = validPageIndex;
      lastValidPageIndexRef.current = validPageIndex;
    }
  }, [
    initialPage,
    data.length,
    pageSize,
    isControlled,
    onPageChange,
    currentPage,
    pagination.pageIndex,
  ]);

  // Only show loading state if we have no data at all
  if (displayData.length === 0 && isLoading) {
    return (
      <div
        className={`w-full ${styles.cryptoTableContainer} ${className || ""}`}
      >
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
                        className="py-5 px-4 whitespace-nowrap border-t border-gray-800/50"
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

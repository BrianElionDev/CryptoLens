"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Cell,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (data: TData) => void;
  pageSize?: number;
  virtualizeRows?: boolean;
  isLoading?: boolean;
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
  virtualizeRows = false,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const prevDataRef = useRef<TData[]>([]);
  const prevValuesMap = useRef(new Map<string, unknown>());

  // 3. All useMemo hooks
  const displayData = useMemo(() => {
    if (data.length > 0) return data;
    if (isLoading && prevDataRef.current.length > 0) return prevDataRef.current;
    return [];
  }, [data, isLoading]);

  // 4. Table setup
  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

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

  // 6. Effects
  useEffect(() => {
    if (data.length > 0) {
      prevDataRef.current = data;
    }
  }, [data]);

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
              element.classList.remove("glow-change");
              void element.offsetWidth;
              element.classList.add("glow-change");
            }
          });
        });
      }
    }
  }, [data]);

  // Only show loading state if we have no data at all
  if (displayData.length === 0 && isLoading) {
    return (
      <div className="w-full">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="w-full">
                {headerGroup.headers.map((header) => {
                  const width = header.column.getSize();
                  return (
                    <th
                      key={header.id}
                      style={{ width }}
                      className="py-4 text-left text-sm font-medium text-white px-4 whitespace-nowrap bg-gray-900/80 backdrop-blur-sm"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
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
      <div className="w-full">
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
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="w-full">
                {headerGroup.headers.map((header) => {
                  const width = header.column.getSize();
                  return (
                    <th
                      key={header.id}
                      style={{ width }}
                      className="py-4 text-left text-sm font-medium text-white px-4 whitespace-nowrap bg-gray-900/80 backdrop-blur-sm"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
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
      </div>
    );
  }

  return (
    <div className="rounded-md border">
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
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.column.getSize() }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
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
    </div>
  );
}

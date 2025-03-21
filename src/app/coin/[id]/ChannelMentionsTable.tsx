"use client";

import { useMemo } from "react";
import { useKnowledgeData } from "@/hooks/useCoinData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface ChannelMention {
  channel: string;
  total_count: number;
}

const columns: ColumnDef<ChannelMention>[] = [
  {
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-400" />
        <span className="font-medium text-gray-200">
          {row.getValue("channel")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "total_count",
    header: "Total Mentions",
    cell: ({ row }) => (
      <div className="flex items-center">
        <span className="px-2.5 py-1 text-sm font-medium bg-blue-500/10 text-blue-400 rounded-lg">
          {row.getValue("total_count")}
        </span>
      </div>
    ),
  },
];

export default function ChannelMentionsTable({ coinId }: { coinId: string }) {
  const { data: knowledge, isLoading } = useKnowledgeData();

  const channelMentions = useMemo(() => {
    if (!knowledge) return [];

    const mentions = new Map<string, number>();

    knowledge.forEach((item) => {
      if (item.llm_answer?.projects) {
        const projects = Array.isArray(item.llm_answer.projects)
          ? item.llm_answer.projects
          : [item.llm_answer.projects];

        projects.forEach((project) => {
          if (project.coin_or_project) {
            const symbolMatch = project.coin_or_project.match(/\(\$([^)]+)\)/);
            const symbol = symbolMatch ? symbolMatch[1].toLowerCase() : "";
            const cleanName = project.coin_or_project
              .replace(/\s*\(\$[^)]+\)/g, "")
              .toLowerCase()
              .trim();
            const key = symbol || cleanName;

            // Match using the same logic as CombinedMarketTable
            if (key === coinId.toLowerCase()) {
              const channel = item["channel name"];
              const count = project.total_count || 1;
              mentions.set(channel, (mentions.get(channel) || 0) + count);
            }
          }
        });
      }
    });

    return Array.from(mentions.entries())
      .map(([channel, count]) => ({
        channel,
        total_count: count,
      }))
      .sort((a, b) => b.total_count - a.total_count);
  }, [knowledge, coinId]);

  const table = useReactTable({
    data: channelMentions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-gray-200">Channel Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!knowledge || knowledge.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-gray-200">Channel Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            No knowledge data available
          </div>
        </CardContent>
      </Card>
    );
  }

  if (channelMentions.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-gray-200">Channel Mentions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            No mentions found for this coin
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-gray-200">Channel Mentions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-gray-800">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-gray-800 hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-gray-400 h-10 px-4"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-gray-800 hover:bg-gray-800/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-500"
                  >
                    No channel mentions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

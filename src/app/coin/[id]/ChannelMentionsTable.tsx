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

  console.log("CoinId:", coinId);
  console.log("Knowledge data:", knowledge);

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
            const extractedSymbol = symbolMatch
              ? symbolMatch[1].toLowerCase()
              : "";
            const cleanName = project.coin_or_project
              .replace(/\s*\(\$[^)]+\)/g, "")
              .toLowerCase()
              .trim();

            console.log("Project:", {
              original: project.coin_or_project,
              cleanName,
              extractedSymbol,
              coinId: coinId.toLowerCase(),
            });

            // Special handling for Bitcoin
            if (
              cleanName === "bitcoin" ||
              cleanName === "btc" ||
              extractedSymbol === "btc"
            ) {
              if (
                coinId.toLowerCase() === "bitcoin" ||
                coinId.toLowerCase() === "btc"
              ) {
                const channel = item["channel name"];
                const count = project.total_count || 1;
                mentions.set(channel, (mentions.get(channel) || 0) + count);
                console.log("Found Bitcoin match:", { channel, count });
              }
              return;
            }

            // Direct mappings for common variations
            const directMappings: Record<string, string> = {
              // Bitcoin and its variants
              bitcoin: "bitcoin",
              btc: "bitcoin",
              "bit coin": "bitcoin",
              "bitcoin cash": "bitcoin-cash",
              bch: "bitcoin-cash",
              "bitcoin sv": "bitcoin-cash-sv",
              bsv: "bitcoin-cash-sv",

              // Ethereum and its ecosystem
              ethereum: "ethereum",
              eth: "ethereum",
              "ethereum classic": "ethereum-classic",
              etc: "ethereum-classic",

              // Major Layer 1s
              solana: "solana",
              sol: "solana",
              cardano: "cardano",
              ada: "cardano",
              polkadot: "polkadot",
              dot: "polkadot",
              avalanche: "avalanche-2",
              avax: "avalanche-2",
              polygon: "matic-network",
              matic: "matic-network",
              cosmos: "cosmos",
              atom: "cosmos",
              "near protocol": "near",
              near: "near",
              arbitrum: "arbitrum",
              arb: "arbitrum",
              optimism: "optimism",
              op: "optimism",

              // Major DeFi and Exchange tokens
              binance: "binancecoin",
              bnb: "binancecoin",
              ripple: "ripple",
              xrp: "ripple",
              chainlink: "chainlink",
              link: "chainlink",
              uniswap: "uniswap",
              uni: "uniswap",
              aave: "aave",
              maker: "maker",
              mkr: "maker",
              compound: "compound",
              comp: "compound",
              curve: "curve-dao-token",
              crv: "curve-dao-token",

              // Popular altcoins
              dogecoin: "dogecoin",
              doge: "dogecoin",
              litecoin: "litecoin",
              ltc: "litecoin",
              tron: "tron",
              trx: "tron",
              "shiba inu": "shiba-inu",
              shib: "shiba-inu",
              pepe: "pepe",
              stellar: "stellar",
              xlm: "stellar",
              monero: "monero",
              xmr: "monero",
              filecoin: "filecoin",
              fil: "filecoin",

              // Stablecoins
              tether: "tether",
              usdt: "tether",
              "usd coin": "usd-coin",
              usdc: "usd-coin",
              dai: "dai",
              trueusd: "true-usd",
              tusd: "true-usd",
              frax: "frax",

              // Gaming and Metaverse
              "the sandbox": "the-sandbox",
              sand: "the-sandbox",
              decentraland: "decentraland",
              mana: "decentraland",
              "axie infinity": "axie-infinity",
              axie: "axie-infinity",
              gala: "gala",
              illuvium: "illuvium",
              ilv: "illuvium",
              enjin: "enjincoin",
              enj: "enjincoin",

              // Additional tokens
              sui: "sui",
              celestia: "celestia",
              tia: "celestia",
              brett: "brett",
              ultra: "ultra",
              uos: "ultra",
              singularitynet: "singularitynet",
              agix: "singularitynet",
              zklink: "zklink",
              zkl: "zklink",
              "official trump": "trump",
              trump: "trump",
              "trump digital trading card": "trump",
              "trump nft": "trump",
              "trump token": "trump",
            };

            // Try exact matches first
            const exactMatch =
              cleanName === coinId.toLowerCase() ||
              extractedSymbol === coinId.toLowerCase() ||
              directMappings[cleanName] === coinId.toLowerCase() ||
              directMappings[extractedSymbol] === coinId.toLowerCase() ||
              cleanName.replace(/\s+/g, "-") === coinId.toLowerCase() ||
              coinId.toLowerCase().replace(/-/g, " ") === cleanName;

            if (exactMatch) {
              const channel = item["channel name"];
              const count = project.total_count || 1;
              mentions.set(channel, (mentions.get(channel) || 0) + count);
              console.log("Found exact match:", { channel, count });
              return;
            }

            // Try direct mappings
            const mappedId =
              directMappings[cleanName] || directMappings[extractedSymbol];
            if (mappedId === coinId.toLowerCase()) {
              const channel = item["channel name"];
              const count = project.total_count || 1;
              mentions.set(channel, (mentions.get(channel) || 0) + count);
              console.log("Found mapping match:", { channel, count });
              return;
            }

            // Try partial matches with improved handling of hyphens and spaces
            const coinIdLower = coinId.toLowerCase();
            const cleanNameNoSpaces = cleanName.replace(/\s+/g, "-");
            const coinIdNoHyphens = coinIdLower.replace(/-/g, " ");

            if (
              cleanName.includes(coinIdLower) ||
              coinIdLower.includes(cleanName) ||
              cleanNameNoSpaces.includes(coinIdLower) ||
              coinIdLower.includes(cleanNameNoSpaces) ||
              cleanName.includes(coinIdNoHyphens) ||
              coinIdNoHyphens.includes(cleanName) ||
              extractedSymbol === coinIdLower ||
              coinIdLower === extractedSymbol
            ) {
              const channel = item["channel name"];
              const count = project.total_count || 1;
              mentions.set(channel, (mentions.get(channel) || 0) + count);
              console.log("Found partial match:", { channel, count });
            }
          }
        });
      }
    });

    const result = Array.from(mentions.entries())
      .map(([channel, count]) => ({
        channel,
        total_count: count,
      }))
      .sort((a, b) => b.total_count - a.total_count);

    console.log("Final mentions:", result);
    return result;
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

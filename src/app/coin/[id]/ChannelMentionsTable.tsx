"use client";

import { useMemo } from "react";
import { useContextKnowledge } from "@/hooks/useContextKnowledge";
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
  const { data: knowledge, isLoading } = useContextKnowledge();
  const currentCoinId = coinId.toLowerCase();

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

            // Map project names to standardized IDs
            const projectCoinId =
              directMappings[cleanName] ||
              directMappings[extractedSymbol] ||
              cleanName.replace(/\s+/g, "-");

            // Try exact matches
            const isExactMatch =
              cleanName === currentCoinId ||
              extractedSymbol === currentCoinId ||
              projectCoinId === currentCoinId ||
              cleanName.replace(/\s+/g, "-") === currentCoinId ||
              currentCoinId.replace(/-/g, " ") === cleanName;

            // Special case for Bitcoin
            const isBitcoin =
              (currentCoinId === "bitcoin" || currentCoinId === "btc") &&
              (cleanName === "bitcoin" ||
                cleanName === "btc" ||
                extractedSymbol === "btc");

            if (isExactMatch || isBitcoin) {
              const channel = item["channel name"];
              if (channel) {
                const count = project.total_count || 1;
                mentions.set(channel, (mentions.get(channel) || 0) + count);
              }
            }
          }
        });
      }
    });

    // Convert to array and sort by count
    return Array.from(mentions.entries())
      .map(([channel, total_count]) => ({ channel, total_count }))
      .sort((a, b) => b.total_count - a.total_count);
  }, [knowledge, currentCoinId]);

  const table = useReactTable({
    data: channelMentions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="bg-black/40 backdrop-blur-sm border-purple-500/20 hover:bg-black/60 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Loading Mentions...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 backdrop-blur-sm border-purple-500/20 hover:bg-black/60 transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Channel Mentions
        </CardTitle>
        {channelMentions.length > 0 && (
          <div className="text-sm text-gray-400">
            Total mentions:{" "}
            <span className="text-blue-300 font-medium">
              {channelMentions
                .reduce((sum, item) => sum + item.total_count, 0)
                .toLocaleString()}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {channelMentions.length > 0 ? (
          <div className="rounded-md overflow-hidden border border-gray-800">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="bg-gray-900/40 text-gray-400"
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
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-gray-800 bg-black/20 hover:bg-black/40"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-center">
            <MessageSquare className="w-12 h-12 text-gray-500/40" />
            <p className="text-gray-500">No mentions found in content</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

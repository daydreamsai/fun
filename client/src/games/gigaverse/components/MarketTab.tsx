import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { formatEther } from "viem";
import { usePriceStore } from "@/store/priceStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Package,
  TrendingUp,
  Gem,
  Search,
} from "lucide-react";

interface MarketItem {
  id: number;
  name: string;
  type: string;
  rarity: number;
  rarityName: string;
  iconUrl: string;
  floorPriceEth: bigint;
  floorPriceUsd: number;
  balance: number;
}

interface MarketTabProps {
  state: ContextState<GigaverseContext>;
}

// Enhanced rarity color system with gradients
const getRarityStyles = (rarity: number) => {
  const styles = [
    {
      bg: "from-gray-500/10 to-gray-600/10",
      border: "border-gray-500/20",
      text: "text-gray-400",
      glow: "",
    },
    {
      bg: "from-green-500/10 to-green-600/10",
      border: "border-green-500/30",
      text: "text-green-400",
      glow: "shadow-[0_0_20px_rgba(34,197,94,0.2)]",
    },
    {
      bg: "from-blue-500/10 to-blue-600/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
    },
    {
      bg: "from-purple-500/10 to-purple-600/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.2)]",
    },
    {
      bg: "from-orange-500/10 to-orange-600/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
      glow: "shadow-[0_0_20px_rgba(251,146,60,0.3)]",
    },
    {
      bg: "from-red-500/10 to-red-600/10",
      border: "border-red-500/30",
      text: "text-red-400",
      glow: "shadow-[0_0_25px_rgba(239,68,68,0.3)]",
    },
  ];
  return styles[rarity] || styles[0];
};

export function MarketTab({ state }: MarketTabProps) {
  const { balances } = state.options.game.player;
  const { exchangeRate } = usePriceStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Get unique item types
  const itemTypes = useMemo(() => {
    const types = new Set<string>();
    state.options.game.offchain.gameItems.forEach((item) => {
      if (item.TYPE_CID) types.add(item.TYPE_CID);
    });
    return Array.from(types).sort();
  }, [state.options.game.offchain.gameItems]);

  // Prepare market data
  const marketData = useMemo<MarketItem[]>(() => {
    return state.options.game.marketplaceFloor.entities
      .map((floorItem) => {
        const gameItem = state.options.game.items.entities.find(
          (item) => parseInt(item.docId) === floorItem.GAME_ITEM_ID_CID
        );
        const offchainItem = state.options.game.offchain.gameItems.find(
          (item) => parseInt(item.docId) === floorItem.GAME_ITEM_ID_CID
        );
        const balance =
          balances.find((b) => b.item.id === floorItem.GAME_ITEM_ID_CID)
            ?.balance || 0;

        if (!gameItem || !offchainItem) return null;

        return {
          id: floorItem.GAME_ITEM_ID_CID,
          name: gameItem.NAME_CID,
          type: offchainItem.TYPE_CID,
          rarity: offchainItem.RARITY_CID,
          rarityName:
            offchainItem.RARITY_NAME || `Rarity ${offchainItem.RARITY_CID}`,
          iconUrl: offchainItem.ICON_URL_CID || offchainItem.IMG_URL_CID,
          floorPriceEth: BigInt(floorItem.ETH_MINT_PRICE_CID),
          floorPriceUsd: exchangeRate
            ? Number(
                formatEther(BigInt(floorItem.ETH_MINT_PRICE_CID * exchangeRate))
              )
            : 0,
          balance,
        };
      })
      .filter(Boolean) as MarketItem[];
  }, [state.options.game, balances, exchangeRate]);

  // Filter market data by type
  const filteredMarketData = useMemo(() => {
    if (selectedType === "all") return marketData;
    return marketData.filter((item) => item.type === selectedType);
  }, [marketData, selectedType]);

  // Enhanced columns with visual improvements
  const columns = useMemo<ColumnDef<MarketItem>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            #{String(row.getValue("id")).padStart(4, "0")}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 hover:bg-transparent"
            >
              Item
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const rarityStyles = getRarityStyles(row.original.rarity);
          return (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "relative w-10 h-10  overflow-hidden border",
                  rarityStyles.border
                )}
              >
                <img
                  src={row.original.iconUrl}
                  className="w-full h-full object-cover"
                  alt={row.getValue("name")}
                />
              </div>
              <div className="font-medium">{row.getValue("name")}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 hover:bg-transparent"
            >
              Type
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <span className="text-sm capitalize text-muted-foreground">
            {row.getValue("type")}
          </span>
        ),
      },
      {
        accessorKey: "rarity",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 hover:bg-transparent"
            >
              Rarity
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const rarity = row.getValue("rarity") as number;
          const styles = getRarityStyles(rarity);
          return (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  rarity === 0 && "bg-gray-500",
                  rarity === 1 && "bg-green-500",
                  rarity === 2 && "bg-blue-500",
                  rarity === 3 && "bg-purple-500",
                  rarity === 4 && "bg-orange-500",
                  rarity === 5 && "bg-red-500"
                )}
              />
              <span className={cn("text-xs font-medium", styles.text)}>
                {row.original.rarityName}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "floorPriceEth",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 hover:bg-transparent"
            >
              Floor Price
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const ethPrice = Number(formatEther(row.getValue("floorPriceEth")));
          const usdPrice = row.original.floorPriceUsd;
          return (
            <div>
              <div className="font-mono font-medium">
                {ethPrice.toFixed(4)} ETH
              </div>
              <div className="text-xs text-muted-foreground">
                ${usdPrice.toFixed(2)}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "balance",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-auto p-0 hover:bg-transparent"
            >
              Your Balance
              <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const balance = row.getValue("balance") as number;
          const value = row.original.floorPriceUsd * balance;
          return balance > 0 ? (
            <div>
              <div className="font-semibold text-primary">{balance} owned</div>
              <div className="text-xs text-muted-foreground">
                ${value.toFixed(2)} value
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredMarketData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Market Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Market Floor Prices
          </h3>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-muted-foreground">Live Prices</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 pr-4 py-2 w-[320px]"
          />
        </div>
      </div>

      {/* Type Filter Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("all")}
          >
            All Items
            <span className="ml-2 text-xs opacity-60">
              ({marketData.length})
            </span>
          </Button>
          {itemTypes.map((type) => {
            const count = marketData.filter(
              (item) => item.type === type
            ).length;
            if (count === 0) return null;

            return (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type}
                <span className="ml-2 text-xs opacity-60">
                  ({count})
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="flex-1 border bg-card overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left px-4 py-3 font-medium text-sm"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    index % 2 === 0 && "bg-muted/10"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {table.getRowModel().rows.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              No items found
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Enhanced Footer */}
      <div className="mt-6 space-y-4">
        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {table.getFilteredRowModel().rows.length}
            </span>{" "}
            items
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1 text-sm">
              <span className="px-3 py-1.5 rounded-md bg-muted font-medium">
                {table.getState().pagination.pageIndex + 1}
              </span>
              <span className="text-muted-foreground">of</span>
              <span className="text-muted-foreground font-medium">
                {table.getPageCount()}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="border bg-gradient-to-br from-primary/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Total Items
              </span>
            </div>
            <div className="text-2xl font-bold">
              {state.options.game.marketplaceFloor.entities.length}
            </div>
          </div>

          <div className="border bg-gradient-to-br from-green-500/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Your Holdings
              </span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {balances.filter((b) => b.balance > 0).length}
            </div>
          </div>

          <div className="border bg-gradient-to-br from-blue-500/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Portfolio Value
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {exchangeRate ? (
                <span>
                  $
                  {balances
                    .reduce((total, b) => {
                      const floorPrice =
                        state.options.game.marketplaceFloor.entities.find(
                          (f) => f.GAME_ITEM_ID_CID === b.item.id
                        )?.ETH_MINT_PRICE_CID || 0;
                      return (
                        total +
                        Number(
                          formatEther(
                            BigInt(
                              floorPrice * b.balance * exchangeRate
                            )
                          )
                        )
                      );
                    }, 0)
                    .toFixed(2)}
                </span>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>

          <div className="border bg-gradient-to-br from-purple-500/5 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gem className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Rare Items
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {
                balances.filter((b) => {
                  const item =
                    state.options.game.offchain.gameItems.find(
                      (entity) => entity.ID_CID === b.item.id
                    );
                  return item && item.RARITY_CID >= 3;
                }).length
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
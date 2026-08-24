import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Package, Plus, Search, AlertTriangle, Clock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { useInventoryItems, useInventoryAlerts } from "../../hooks/use-inventory";
import { useDebounce } from "../../hooks/use-debounce";
import { formatCurrency } from "../../lib/currency";
import type { ItemCategory } from "../../types/inventory";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: Array<{ value: ItemCategory | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "MEDICATION", label: "Medication" },
  { value: "VACCINE", label: "Vaccine" },
  { value: "SURGICAL_SUPPLY", label: "Surgical" },
  { value: "DIAGNOSTIC_SUPPLY", label: "Diagnostic" },
  { value: "FOOD", label: "Food" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  MEDICATION: "Medication",
  VACCINE: "Vaccine",
  SURGICAL_SUPPLY: "Surgical",
  DIAGNOSTIC_SUPPLY: "Diagnostic",
  FOOD: "Food",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

// ── Stock level badge ─────────────────────────────────────────────────────────

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0)
    return (
      <Badge variant="destructive" className="text-xs">
        Out of Stock
      </Badge>
    );
  if (qty <= threshold)
    return (
      <Badge variant="warning" className="text-xs">
        Low Stock
      </Badge>
    );
  return (
    <Badge variant="success" className="text-xs">
      In Stock
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function InventoryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ItemCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Cursor-based pagination: cursorHistory[i] is the cursor that fetches page i+2
  // (page 1 has no cursor). pageIndex is 0-based.
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setCursorHistory([]);
  }, [debouncedSearch, tab]);

  const currentCursor =
    pageIndex === 0 ? undefined : cursorHistory[pageIndex - 1];

  const { data, isLoading, isFetching } = useInventoryItems({
    ...(tab !== "ALL" ? { category: tab } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(currentCursor ? { cursor: currentCursor } : {}),
    limit: PAGE_SIZE,
  });
  const { data: alerts } = useInventoryAlerts();

  const items = data?.items ?? [];

  const goToNextPage = () => {
    if (!data?.hasMore || !data.nextCursor) return;
    setCursorHistory((prev) => {
      const next = [...prev];
      next[pageIndex] = data.nextCursor as string;
      return next;
    });
    setPageIndex((p) => p + 1);
  };

  const goToPreviousPage = () => {
    setPageIndex((p) => Math.max(0, p - 1));
  };

  const alertCount =
    (alerts?.low_stock.length ?? 0) + (alerts?.expiring_soon.length ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventory & Pharmacy</h1>
          <p className="text-sm text-muted-foreground">
            Manage drugs, supplies, and equipment
          </p>
        </div>
        <div className="flex gap-2">
          {alertCount > 0 && (
            <Button
              variant="outline"
              className="text-orange-600 border-orange-300"
              onClick={() => navigate("/inventory/alerts")}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {alertCount} Alert{alertCount !== 1 ? "s" : ""}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/inventory/grn")}>
            Goods Received
          </Button>
          <Button onClick={() => navigate("/inventory/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ItemCategory | "ALL")}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.value} value={c.value} className="text-xs">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <Card>
        {/* <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {isLoading
              ? "Loading..."
              : `${items.length} item${items.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader> */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No items found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab !== "ALL"
                  ? "Try a different category."
                  : "Add your first inventory item."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-6 py-3">
                      Name
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Category
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">
                      Qty on Hand
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">
                      Current Price
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Nearest Expiry
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const expiringSoon =
                      item.nearest_expiry &&
                      new Date(item.nearest_expiry) <=
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <tr
                        key={item.id}
                        className="border-b cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/inventory/${item.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium">{item.name}</div>
                          {item.sku && (
                            <div className="text-xs text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          )}
                          {item.is_controlled && (
                            <Badge
                              variant="destructive"
                              className="text-xs mt-1"
                            >
                              Controlled
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {CATEGORY_LABEL[item.category]}
                        </td>
                        <td className="px-4 py-4 text-right font-mono">
                          {item.quantity_on_hand}{" "}
                          <span className="text-muted-foreground text-xs">
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StockBadge
                            qty={item.quantity_on_hand}
                            threshold={item.reorder_threshold}
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          {item.current_price ? (
                            formatCurrency(item.current_price)
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {item.nearest_expiry ? (
                            <div
                              className={`flex items-center gap-1 text-xs ${expiringSoon ? "text-orange-600" : "text-muted-foreground"}`}
                            >
                              {expiringSoon && <Clock className="h-3 w-3" />}
                              {format(
                                new Date(item.nearest_expiry),
                                "MMM d, yyyy",
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground text-xs">
                          {item.location ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(pageIndex > 0 || (!isLoading && items.length > 0)) && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={goToPreviousPage}
                aria-disabled={pageIndex === 0}
                className={
                  pageIndex === 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{pageIndex + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={goToNextPage}
                aria-disabled={!data?.hasMore || isFetching}
                className={
                  !data?.hasMore || isFetching
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

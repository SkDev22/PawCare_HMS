import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, FileText, Plus, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../components/ui/pagination";
import { useGrnList } from "../../../hooks/use-grn";
import { useDebounce } from "../../../hooks/use-debounce";

const PAGE_SIZE = 15;

export function GrnListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setCursorHistory([]);
  }, [debouncedSearch]);

  const currentCursor = pageIndex === 0 ? undefined : cursorHistory[pageIndex - 1];
  const { data, isLoading, isFetching } = useGrnList({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(currentCursor ? { cursor: currentCursor } : {}),
    limit: PAGE_SIZE,
  });

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
  const goToPreviousPage = () => setPageIndex((p) => Math.max(0, p - 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inventory")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Goods Received Notes</h1>
            <p className="text-sm text-muted-foreground">
              Every stock receipt and the batches it created
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/inventory/grn/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New GRN
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by GRN # or supplier..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No goods received notes yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Receive your first stock delivery to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-6 py-3">GRN #</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Supplier</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Items</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Received By</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((grn) => (
                    <tr
                      key={grn.id}
                      className="border-b cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/inventory/grn/${grn.id}`)}
                    >
                      <td className="px-6 py-4 font-medium">{grn.grn_number}</td>
                      <td className="px-4 py-4">
                        {grn.supplier_name}
                        {grn.supplier_invoice_no && (
                          <div className="text-xs text-muted-foreground">
                            Inv: {grn.supplier_invoice_no}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-mono">{grn._count.items}</td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {grn.received_by_staff.first_name} {grn.received_by_staff.last_name}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {format(new Date(grn.received_at), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {(pageIndex > 0 || (!isLoading && items.length > 0)) && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={goToPreviousPage}
                aria-disabled={pageIndex === 0}
                className={pageIndex === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{pageIndex + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={goToNextPage}
                aria-disabled={!data?.hasMore || isFetching}
                className={!data?.hasMore || isFetching ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

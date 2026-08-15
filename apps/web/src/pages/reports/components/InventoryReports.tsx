import { format } from "date-fns";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  useStockLevelsReport,
  useInventoryUsageReport,
  useExpiringItemsReport,
} from "../../../hooks/use-reports";
import { formatCurrency } from "../../../lib/currency";
import { StatCard, EmptyState } from "./ReportPrimitives";

function categoryLabel(category: string) {
  return category.toLowerCase().replace(/_/g, " ");
}

// ── Stock Levels ───────────────────────────────────────────────────────────────

export function StockLevelsReportView() {
  const { data, isLoading } = useStockLevelsReport();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Low Stock Items"
          value={data.lowStockCount}
          tone={data.lowStockCount > 0 ? "destructive" : "default"}
        />
        <StatCard label="Total Stock Value" value={formatCurrency(data.totalStockValue)} />
      </div>
      {data.items.length === 0 ? (
        <EmptyState message="No active inventory items." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reorder At</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {categoryLabel(i.category)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {i.quantity_on_hand} {i.unit}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {i.reorder_threshold}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(i.stockValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={i.isLow ? "destructive" : "secondary"} className="text-xs">
                      {i.isLow ? "Low Stock" : "OK"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Inventory Usage ───────────────────────────────────────────────────────────

export function InventoryUsageReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useInventoryUsageReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Dispenses" value={data.totalTransactions} />
        <StatCard label="Unique Items Used" value={data.items.length} />
      </div>
      {data.items.length === 0 ? (
        <EmptyState message="No inventory dispensed in this period." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Dispensed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {categoryLabel(i.category)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {i.totalDispensed} {i.unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Expiring Items ───────────────────────────────────────────────────────────────

export function ExpiringItemsReportView({ days }: { days: number }) {
  const { data, isLoading } = useExpiringItemsReport(days);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Items in Window" value={data.items.length} />
        <StatCard
          label="Already Expired"
          value={data.expiredCount}
          tone={data.expiredCount > 0 ? "destructive" : "default"}
        />
      </div>
      {data.items.length === 0 ? (
        <EmptyState message="No items expiring in this window." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.sku ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {i.quantity_on_hand} {i.unit}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {i.expiry_date ? format(new Date(i.expiry_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {i.location ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={i.isExpired ? "destructive" : "warning"} className="text-xs">
                      {i.isExpired ? "Expired" : "Expiring Soon"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

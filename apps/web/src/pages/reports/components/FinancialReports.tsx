import { format } from "date-fns";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
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
  useRevenueReport,
  useOutstandingBalances,
  useServiceSalesReport,
  useTaxSummaryReport,
} from "../../../hooks/use-reports";
import { formatCurrency } from "../../../lib/currency";
import { StatCard, EmptyState } from "./ReportPrimitives";

// ── Revenue ──────────────────────────────────────────────────────────────────

export function RevenueReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useRevenueReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const methodRows = Object.entries(data.byMethod).sort((a, b) => b[1] - a[1]);
  const dailyRows = [...data.dailySeries].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} tone="success" />
        <StatCard label="Outstanding" value={formatCurrency(data.totalOutstanding)} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
        </CardHeader>
        {methodRows.length === 0 ? (
          <CardContent>
            <EmptyState message="No payments recorded in this period." />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methodRows.map(([method, amount]) => (
                <TableRow key={method}>
                  <TableCell className="text-sm capitalize">
                    {method.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Revenue</CardTitle>
        </CardHeader>
        {dailyRows.length === 0 ? (
          <CardContent>
            <EmptyState message="No revenue data for this period." />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRows.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="text-sm">{format(new Date(d.date), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(d.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

// ── Outstanding Payments (AR) ────────────────────────────────────────────────────

export function OutstandingBalancesReportView() {
  const { data, isLoading } = useOutstandingBalances();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Outstanding" value={formatCurrency(data.totalOutstanding)} tone="warning" />
        <StatCard label="Current" value={formatCurrency(data.buckets.current)} />
        <StatCard label="1–30 Days" value={formatCurrency(data.buckets.days30)} tone="warning" />
        <StatCard label="31–60 Days" value={formatCurrency(data.buckets.days60)} tone="warning" />
      </div>

      {data.buckets.days90plus > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm">
            <span className="font-medium text-destructive">
              90+ Day Overdue: {formatCurrency(data.buckets.days90plus)}
            </span>
          </CardContent>
        </Card>
      )}

      {data.items.length === 0 ? (
        <EmptyState message="No outstanding balances." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="text-sm">
                    <p className="font-medium">
                      {inv.owner.first_name} {inv.owner.last_name}
                    </p>
                    {inv.owner.email && (
                      <p className="text-xs text-muted-foreground">{inv.owner.email}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={inv.status === "OVERDUE" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(inv.total)}</TableCell>
                  <TableCell className="text-right text-sm font-medium text-destructive">
                    {formatCurrency(inv.balance)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {inv.daysOverdue > 0 ? `${inv.daysOverdue}d` : "Current"}
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

// ── Service / Item Sales ────────────────────────────────────────────────────────

export function ServiceSalesReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useServiceSalesReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <StatCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} tone="success" />
      {data.items.length === 0 ? (
        <EmptyState message="No sales in this period." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((i) => (
                <TableRow key={i.key}>
                  <TableCell className="text-sm font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {i.category.toLowerCase().replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-right text-sm">{i.quantity}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(i.revenue)}
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

// ── Tax / Financial Summary ──────────────────────────────────────────────────────

export function TaxSummaryReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useTaxSummaryReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const rows: [string, number][] = [
    ["Subtotal", data.subtotal],
    ["Tax Collected", data.tax],
    ["Discounts Given", data.discount],
    ["Total Invoiced", data.total],
    ["Total Collected", data.collected],
  ];

  return (
    <div className="space-y-4">
      <StatCard label="Invoices in Period" value={data.invoiceCount} />
      <Card>
        <Table>
          <TableBody>
            {rows.map(([label, value]) => (
              <TableRow key={label}>
                <TableCell className="text-sm text-muted-foreground">{label}</TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCurrency(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

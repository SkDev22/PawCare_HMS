import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Receipt, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useDebounce } from '../../hooks/use-debounce';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { useInvoices } from '../../hooks/use-billing';
import { InvoiceForm } from './components/InvoiceForm';
import type { InvoiceStatus } from '../../types/billing';

const STATUS_TABS: Array<{ label: string; value: InvoiceStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Partial', value: 'PARTIALLY_PAID' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const STATUS_BADGE: Record<InvoiceStatus, 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT:          'secondary',
  SENT:           'info',
  PAID:           'success',
  PARTIALLY_PAID: 'warning',
  OVERDUE:        'destructive',
  CANCELLED:      'secondary',
  REFUNDED:       'outline',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT:          'Draft',
  SENT:           'Sent',
  PAID:           'Paid',
  PARTIALLY_PAID: 'Partial',
  OVERDUE:        'Overdue',
  CANCELLED:      'Cancelled',
  REFUNDED:       'Refunded',
};

function fmt(val: string) {
  return `$${parseFloat(val).toFixed(2)}`;
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

export function BillingPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useInvoices({
    ...(tab !== 'ALL' ? { status: tab } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  const invoices = data?.items ?? [];

  const balance = (item: (typeof invoices)[0]) =>
    parseFloat(item.total) - parseFloat(item.paid_amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing & Invoicing</h1>
          <p className="text-sm text-muted-foreground">Manage invoices and track payments</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <InvoiceForm
              onSuccess={(id) => { setCreateOpen(false); navigate(`/billing/${id}`); }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + status tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as InvoiceStatus | 'ALL')}>
          <TabsList className="flex-wrap h-auto gap-1">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search owner or patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {isLoading ? 'Loading...' : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No invoices found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {debouncedSearch
                  ? `No matches for "${debouncedSearch}".`
                  : tab !== 'ALL' ? 'Try a different filter.' : 'Create a new invoice to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const bal = balance(invoice);
                    return (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/billing/${invoice.id}`)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{invoice.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {invoice.owner.first_name} {invoice.owner.last_name}
                          </div>
                          {invoice.owner.email && (
                            <div className="text-xs text-muted-foreground">{invoice.owner.email}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {invoice.due_date
                            ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[invoice.status]} className="text-xs">
                            {STATUS_LABEL[invoice.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {fmt(invoice.total)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {fmt(invoice.paid_amount)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          <span className={bal > 0.001 ? 'text-destructive' : 'text-emerald-600'}>
                            {fmt(bal.toFixed(2))}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

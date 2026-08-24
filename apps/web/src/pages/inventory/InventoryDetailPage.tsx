import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  TrendingDown,
  TrendingUp,
  MinusCircle,
  XCircle,
  Plus,
  Layers,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useInventoryItem,
  useItemBatches,
  useLogTransaction,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from "../../hooks/use-inventory";
import { formatCurrency } from "../../lib/currency";
import type { LogTransactionType, StockBatch } from "../../types/inventory";

// ── Transaction type display ──────────────────────────────────────────────────

const TX_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  purchase: TrendingUp,
  dispensed: TrendingDown,
  adjustment: MinusCircle,
  expired: XCircle,
};

const TX_COLORS: Record<string, string> = {
  purchase: "text-green-600",
  dispensed: "text-red-600",
  adjustment: "text-blue-600",
  expired: "text-orange-600",
};

const TX_LABEL: Record<string, string> = {
  purchase: "Purchase",
  dispensed: "Dispensed",
  adjustment: "Adjustment",
  expired: "Expired",
};

// ── Log transaction dialog ────────────────────────────────────────────────────

const AUTO_BATCH = "__auto__";

const TxSchema = z
  .object({
    type: z.enum(["dispensed", "adjustment", "expired"]),
    batch_id: z.string().default(AUTO_BATCH),
    quantity: z.coerce
      .number()
      .int()
      .refine((n) => n !== 0, "Cannot be zero"),
    reference_id: z.string().max(200).default(""),
    notes: z.string().max(500).default(""),
  })
  .refine((data) => data.type === "dispensed" || data.batch_id !== AUTO_BATCH, {
    message: "Select a batch for this transaction type",
    path: ["batch_id"],
  });

function LogTransactionDialog({
  itemId,
  unit,
  batches,
  presetBatchId,
  open,
  onOpenChange,
}: {
  itemId: string;
  unit: string;
  batches: StockBatch[];
  presetBatchId: string | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const logTx = useLogTransaction(itemId);
  const presetBatch = batches.find((b) => b.id === presetBatchId);

  const form = useForm<z.infer<typeof TxSchema>>({
    resolver: zodResolver(TxSchema),
    defaultValues: {
      type: "dispensed",
      batch_id: presetBatchId ?? AUTO_BATCH,
      quantity: 1,
      reference_id: "",
      notes: "",
    },
  });

  const txType = form.watch("type");
  const isOut = txType === "dispensed" || txType === "expired";

  function onSubmit(values: z.infer<typeof TxSchema>) {
    const qty = isOut ? -Math.abs(values.quantity) : Math.abs(values.quantity);
    logTx.mutate(
      {
        type: values.type as LogTransactionType,
        quantity: qty,
        ...(values.batch_id !== AUTO_BATCH
          ? { batch_id: values.batch_id }
          : {}),
        ...(values.reference_id ? { reference_id: values.reference_id } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Type <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dispensed">
                        Dispensed (stock out)
                      </SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="expired">
                        Expired (write-off)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {presetBatch ? (
              <div className="rounded-md border px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Batch</p>
                <p>
                  {presetBatch.batch_no ??
                    presetBatch.id.slice(0, 8).toUpperCase()}{" "}
                  · {presetBatch.quantity_remaining} {unit} remaining
                </p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="batch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Batch{" "}
                      {txType !== "dispensed" && (
                        <span className="text-destructive">*</span>
                      )}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {txType === "dispensed" && (
                          <SelectItem value={AUTO_BATCH}>
                            Auto (oldest batch first)
                          </SelectItem>
                        )}
                        {batches
                          .filter((b) => !b.is_closed)
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.batch_no ?? b.id.slice(0, 8).toUpperCase()} ·{" "}
                              {b.quantity_remaining} {unit} left
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity ({unit}){" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Enter amount"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {isOut
                      ? "Will be subtracted from stock"
                      : "Will be added to stock"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference (PO #, Prescription ID)</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={logTx.isPending}>
                {logTx.isPending ? "Saving..." : "Log Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [txOpen, setTxOpen] = useState(false);
  const [txBatchId, setTxBatchId] = useState<string | undefined>(undefined);

  const { data: item, isLoading } = useInventoryItem(id);
  const { data: batches } = useItemBatches(id);
  const updateItem = useUpdateInventoryItem(id ?? "");
  const deleteItem = useDeleteInventoryItem();

  const batchLabelById = new Map(
    (batches ?? []).map((b) => [
      b.id,
      b.batch_no ?? b.id.slice(0, 8).toUpperCase(),
    ]),
  );

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Item not found.</p>
        <Button variant="link" onClick={() => navigate("/inventory")}>
          Back to Inventory
        </Button>
      </div>
    );
  }

  const isLowStock = item.quantity_on_hand <= item.reorder_threshold;
  const expiringSoon =
    item.nearest_expiry &&
    new Date(item.nearest_expiry) <=
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  function openBatchAction(batchId: string) {
    setTxBatchId(batchId);
    setTxOpen(true);
  }

  const hasStockHistory = (batches?.length ?? 0) > 0;

  function handleDelete() {
    if (!id) return;
    if (window.confirm(`Delete "${item?.name}"? This cannot be undone.`)) {
      deleteItem.mutate(id, { onSuccess: () => navigate("/inventory") });
    }
  }

  return (
    <div className="space-y-6 w-full mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{item.name}</h1>
            {item.is_controlled && (
              <Badge variant="destructive" className="text-xs">
                Controlled
              </Badge>
            )}
            {!item.is_active && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {item.category.replace(/_/g, " ")} · {item.unit}
            {item.sku ? ` · SKU: ${item.sku}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {item.is_active && (
            <Button
              onClick={() => {
                setTxBatchId(undefined);
                setTxOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Log Transaction
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/inventory/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateItem.mutate({ is_active: !item.is_active })}
          >
            {item.is_active ? "Deactivate" : "Reactivate"}
          </Button>
          {!hasStockHistory && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={deleteItem.isPending}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className={isLowStock ? "border-orange-300" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Qty on Hand</p>
            <p
              className={`text-2xl font-bold ${isLowStock ? "text-orange-600" : ""}`}
            >
              {item.quantity_on_hand}
            </p>
            <p className="text-xs text-muted-foreground">{item.unit}</p>
            {isLowStock && (
              <p className="text-xs text-orange-600 mt-1">
                Below reorder threshold
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reorder At</p>
            <p className="text-2xl font-bold">{item.reorder_threshold}</p>
            <p className="text-xs text-muted-foreground">{item.unit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-2xl font-bold">
              {item.current_price ? formatCurrency(item.current_price) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              From oldest active batch
            </p>
          </CardContent>
        </Card>
        <Card className={expiringSoon ? "border-orange-300" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Nearest Expiry</p>
            {item.nearest_expiry ? (
              <>
                <p
                  className={`text-sm font-bold mt-1 ${expiringSoon ? "text-orange-600" : ""}`}
                >
                  {format(new Date(item.nearest_expiry), "MMM d, yyyy")}
                </p>
                {expiringSoon && (
                  <p className="text-xs text-orange-600 mt-1">Expiring soon</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Batches */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" /> Batches ({(batches ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!batches || batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Layers className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No stock received yet — receive stock via a Goods Received Note.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-4 py-2">
                      Batch
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2">
                      Received
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2">
                      Remaining
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2">
                      Cost
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2">
                      Price
                    </th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-2">
                      Discount
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2">
                      Expiry
                    </th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-2">
                      Status
                    </th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">
                        {b.batch_no ?? b.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(b.received_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {b.quantity_remaining} / {b.quantity_received}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(b.unit_cost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(b.selling_price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(b.discount_percent) > 0
                          ? `${b.discount_percent}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {b.expiry_date
                          ? format(new Date(b.expiry_date), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={b.is_closed ? "secondary" : "success"}
                          className="text-xs"
                        >
                          {b.is_closed ? "Closed" : "Active"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!b.is_closed && item.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openBatchAction(b.id)}
                          >
                            Adjust
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: item details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" /> Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {item.supplier_name && (
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p>{item.supplier_name}</p>
                {item.supplier_sku && (
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.supplier_sku}
                  </p>
                )}
              </div>
            )}
            {item.location && (
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p>{item.location}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Added</p>
              <p>{format(new Date(item.created_at), "MMM d, yyyy")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: transaction history */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Recent Transactions ({item.transactions.length})
              </CardTitle>
              {item.is_active && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTxBatchId(undefined);
                    setTxOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Log
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {item.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No transactions yet
                  </p>
                </div>
              ) : (
                <div className="divide-y max-h-[480px] overflow-y-auto">
                  {item.transactions.map((tx) => {
                    const Icon = TX_ICONS[tx.type] ?? MinusCircle;
                    const color = TX_COLORS[tx.type] ?? "";
                    const isOut = tx.quantity < 0;

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className={`shrink-0 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {TX_LABEL[tx.type] ?? tx.type}
                            </span>
                            {tx.batch_id && batchLabelById.has(tx.batch_id) && (
                              <span className="text-xs text-muted-foreground">
                                Batch {batchLabelById.get(tx.batch_id)}
                              </span>
                            )}
                            {tx.reference_id && (
                              <span className="text-xs text-muted-foreground">
                                #{tx.reference_id}
                              </span>
                            )}
                          </div>
                          {tx.notes && (
                            <p className="text-xs text-muted-foreground">
                              {tx.notes}
                            </p>
                          )}
                          {tx.performed_by_staff && (
                            <p className="text-xs text-muted-foreground">
                              By {tx.performed_by_staff.first_name}{" "}
                              {tx.performed_by_staff.last_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(tx.created_at),
                              "MMM d, yyyy h:mm a",
                            )}
                          </p>
                        </div>
                        <div
                          className={`text-sm font-semibold shrink-0 ${color}`}
                        >
                          {isOut ? "" : "+"}
                          {tx.quantity} {item.unit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {id && (
        <LogTransactionDialog
          itemId={id}
          unit={item.unit}
          batches={batches ?? []}
          presetBatchId={txBatchId}
          open={txOpen}
          onOpenChange={(v) => {
            setTxOpen(v);
            if (!v) setTxBatchId(undefined);
          }}
        />
      )}
    </div>
  );
}

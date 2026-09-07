import { useRef, useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  Minus,
  X,
  ShoppingCart,
  Printer,
  Search,
  PauseCircle,
  Eye,
  Undo2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useInventoryItems } from "@/hooks/use-inventory";
import { useOwners } from "@/hooks/use-owners";
import { useClinic } from "@/hooks/use-clinic";
import { useCreateSale, useRecentSales, useProcessReturn } from "@/hooks/use-pos";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/currency";
import type { PosCartItem, PosSale } from "@/types/pos";
import { PosReceiptPrint } from "./components/PosReceiptPrint";

interface HeldSale {
  id: string;
  heldAt: string;
  cart: PosCartItem[];
  customerName: string;
  ownerId: string | null;
}

const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "insurance", label: "Insurance" },
];

function ItemSearch({ onAdd }: { onAdd: (item: { id: string; name: string; price: string }) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 200);
  const inputRef = useRef<HTMLInputElement>(null);
  // Pet Shop only ever sells RETAIL-category stock — medications and other
  // clinical inventory are dispensed through EMR, never rung up here,
  // regardless of the clinic's plan (see pos.service.ts's createSale).
  const { data } = useInventoryItems(
    { search: debounced, category: "RETAIL", is_active: true, limit: 8 },
    { enabled: !!debounced.trim() },
  );
  const results = debounced.trim() ? (data?.items ?? []) : [];

  const addAndReset = (item: { id: string; name: string; price: string }) => {
    onAdd(item);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        autoFocus
        placeholder="Scan barcode or search item by name…"
        className="pl-9"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          // A barcode scanner types the full code and hits Enter — if that
          // uniquely matched exactly one item, add it immediately instead
          // of requiring a click.
          if (e.key === "Enter" && results.length === 1) {
            e.preventDefault();
            const r = results[0];
            if (r.current_price !== null) {
              addAndReset({ id: r.id, name: r.name, price: r.current_price });
            }
          }
        }}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={r.current_price === null}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              onMouseDown={() => {
                if (r.current_price !== null) {
                  addAndReset({ id: r.id, name: r.name, price: r.current_price });
                }
              }}
            >
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.sku ? `SKU: ${r.sku} · ` : ""}
                  {r.current_price === null ? "Out of stock" : `${r.quantity_on_hand} in stock`}
                </div>
              </div>
              {r.current_price !== null && (
                <div className="text-sm font-medium shrink-0">
                  {formatCurrency(r.current_price)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The input's value IS the customer name — typing it freehand is enough to
// put that name on the receipt/invoice. Selecting a suggestion additionally
// links an existing owner record; editing the text after that unlinks it
// again (the link is only valid while the text matches what was picked).
function CustomerInput({
  name,
  linkedOwnerId,
  onNameChange,
  onSelectOwner,
  onUnlink,
}: {
  name: string;
  linkedOwnerId: string | null;
  onNameChange: (name: string) => void;
  onSelectOwner: (owner: { id: string; first_name: string; last_name: string }) => void;
  onUnlink: () => void;
}) {
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(name, 250);
  const { data } = useOwners(
    { search: debounced, limit: 8 },
    { enabled: !linkedOwnerId && !!debounced.trim() },
  );
  const results = !linkedOwnerId && debounced.trim() ? (data?.items ?? []) : [];

  return (
    <div className="relative">
      <Input
        placeholder="Walk-in, type a name, or search an existing client…"
        value={name}
        onChange={(e) => {
          onNameChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {linkedOwnerId && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-muted-foreground">Linked to an existing client</span>
          <Button variant="ghost" size="sm" onClick={onUnlink} className="h-5 px-1.5 text-xs">
            <X className="h-3 w-3 mr-1" />
            Unlink
          </Button>
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((o) => (
            <button
              key={o.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onMouseDown={() => {
                onSelectOwner(o);
                setOpen(false);
              }}
            >
              <div className="font-medium">
                {o.first_name} {o.last_name}
              </div>
              <div className="text-xs text-muted-foreground">{o.phone}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Named-page CSS (page: <ident>) proved unreliable for actually changing
// the physical page size at print time, so instead we inject a plain
// @page override right before printing and remove it once the print
// dialog closes — this is the same @page mechanism that already works
// for the A4 documents elsewhere in the app, just swapped in temporarily.
// "auto" height is deliberate: thermal receipt paper is a continuous roll
// with no fixed length — a real thermal printer's driver cuts right after
// the content ends, so "auto" is what avoids wasting blank paper. Virtual
// destinations with no printer behind them (e.g. "Save as PDF") can't
// represent a variable-length page and will fall back to a default page
// size in preview — that's a limitation of previewing without the actual
// roll-paper hardware, not a bug; a real thermal printer prints this correctly.
function printThermalReceipt() {
  const style = document.createElement("style");
  style.textContent = "@page { size: 80mm auto; margin: 2mm; }";
  document.head.appendChild(style);
  const cleanup = () => {
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

function Receipt({
  sale,
  clinic,
  onNewSale,
  onClose,
}: {
  sale: PosSale;
  clinic: { name: string; address: string | null; phone: string | null; logo_url: string | null } | undefined;
  onNewSale?: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <PosReceiptPrint sale={sale} clinic={clinic} />
      <div className="mx-auto max-w-md space-y-6 print:hidden">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={printThermalReceipt}>
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        {onNewSale && <Button onClick={onNewSale}>New Sale</Button>}
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4 text-sm">
          <div className="text-center space-y-1">
            {clinic?.logo_url && (
              <img
                src={clinic.logo_url}
                alt={clinic.name}
                className="h-12 mx-auto object-contain mb-1"
              />
            )}
            {clinic && <p className="font-semibold text-base">{clinic.name}</p>}
            {clinic?.address && <p className="text-muted-foreground text-xs">{clinic.address}</p>}
            {clinic?.phone && <p className="text-muted-foreground text-xs">{clinic.phone}</p>}
          </div>

          <div className="border-t border-dashed pt-3 text-center space-y-1">
            <p className="font-medium">Sale Receipt</p>
            <p className="text-muted-foreground font-mono text-xs">
              {sale.invoice_number ?? `#${sale.id.slice(0, 8).toUpperCase()}`}
            </p>
            <p className="text-muted-foreground text-xs">
              {format(new Date(sale.created_at), "PPp")}
            </p>
            <p className="text-muted-foreground text-xs">
              {sale.owner
                ? `${sale.owner.first_name} ${sale.owner.last_name}`
                : sale.customer_name ?? "Walk-in customer"}
            </p>
          </div>

          <div className="border-t border-dashed pt-3 space-y-1.5">
            {sale.line_items.map((li) => (
              <div key={li.id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {li.description}
                  <span className="text-muted-foreground">
                    {" "}
                    ({li.quantity} × {formatCurrency(li.unit_price)})
                  </span>
                </span>
                <span className="shrink-0">{formatCurrency(li.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed pt-3 space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{formatCurrency(sale.tax_amount)}</span>
            </div>
            {Number(sale.discount_amount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{formatCurrency(sale.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {sale.payments[0] && (
            <div className="space-y-1">
              <p className="text-center text-xs text-muted-foreground pt-2">
                Paid via {sale.payments[0].method.replace("_", " ")}
              </p>
              {sale.payments[0].amount_tendered &&
                Number(sale.payments[0].amount_tendered) > Number(sale.payments[0].amount) && (
                  <div className="space-y-0.5 pt-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tendered</span>
                      <span>{formatCurrency(sale.payments[0].amount_tendered)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Change</span>
                      <span>
                        {formatCurrency(
                          Number(sale.payments[0].amount_tendered) - Number(sale.payments[0].amount),
                        )}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground border-t border-dashed pt-3">
            Thank you for shopping with us!
          </p>
        </CardContent>
      </Card>
      </div>
    </>
  );
}

function ReturnDialog({ sale, onClose }: { sale: PosSale; onClose: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const processReturn = useProcessReturn();

  const lines = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([line_item_id, quantity]) => ({ line_item_id, quantity }));

  const handleSubmit = () => {
    if (lines.length === 0) return;
    processReturn.mutate(
      {
        saleId: sale.id,
        lines,
        ...(reason ? { reason } : {}),
        refund_method: refundMethod,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Return items — {sale.invoice_number ?? `#${sale.id.slice(0, 8).toUpperCase()}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            {sale.line_items.map((li) => (
              <div key={li.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{li.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Sold: {li.quantity} × {formatCurrency(li.unit_price)}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={li.quantity}
                  className="w-20 shrink-0"
                  value={quantities[li.id] ?? 0}
                  onChange={(e) =>
                    setQuantities((prev) => ({
                      ...prev,
                      [li.id]: Math.max(0, Math.min(li.quantity, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <Textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />

          <Select value={refundMethod} onValueChange={setRefundMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Refund method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="w-full cursor-pointer"
            disabled={lines.length === 0 || processReturn.isPending}
            onClick={handleSubmit}
          >
            {processReturn.isPending ? "Processing…" : "Process Return"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecentSalesPanel({
  canReturn,
  onView,
  onReturn,
}: {
  canReturn: boolean;
  onView: (sale: PosSale) => void;
  onReturn: (sale: PosSale) => void;
}) {
  const { data } = useRecentSales({ limit: 6 });
  const sales = data?.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Recent Sales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No sales yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sales.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {s.invoice_number ?? `#${s.id.slice(0, 8).toUpperCase()}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.owner ? `${s.owner.first_name} ${s.owner.last_name}` : (s.customer_name ?? "Walk-in")}
                    {" · "}
                    {format(new Date(s.created_at), "p")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm font-medium mr-1">{formatCurrency(s.total)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(s)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {canReturn && s.status !== "REFUNDED" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReturn(s)}>
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PosCheckoutPage() {
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [linkedOwnerId, setLinkedOwnerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountAmount, setDiscountAmount] = useState("");
  const [tenderedAmount, setTenderedAmount] = useState("");
  const [completedSale, setCompletedSale] = useState<PosSale | null>(null);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [viewingSale, setViewingSale] = useState<PosSale | null>(null);
  const [returningSale, setReturningSale] = useState<PosSale | null>(null);

  const { data: clinic } = useClinic();
  const createSale = useCreateSale();
  const effectivePermissions = useAuthStore((s) => s.user?.effective_permissions);
  const canReturn = hasPermission(effectivePermissions, "PAYMENT_VOID");

  const addToCart = (item: { id: string; name: string; price: string }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { item_id: item.id, name: item.name, quantity: 1, unit_price: item.price }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item_id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item_id !== itemId));
  };

  const resetCustomer = () => {
    setCustomerName("");
    setLinkedOwnerId(null);
  };

  const subtotal = cart.reduce((sum, c) => sum + Number(c.unit_price) * c.quantity, 0);
  const taxRate = clinic ? Number(clinic.tax_rate) : 0;
  const estimatedTax = subtotal * (taxRate / 100);
  const discount = Math.min(Number(discountAmount) || 0, subtotal + estimatedTax);
  const estimatedTotal = Math.max(0, subtotal + estimatedTax - discount);
  const tendered = Number(tenderedAmount) || 0;
  const changeDue = Math.max(0, tendered - estimatedTotal);

  const handleCompleteSale = () => {
    createSale.mutate(
      {
        ...(linkedOwnerId
          ? { owner_id: linkedOwnerId }
          : customerName.trim()
            ? { customer_name: customerName.trim() }
            : {}),
        items: cart.map((c) => ({ item_id: c.item_id, quantity: c.quantity })),
        payment_method: paymentMethod,
        discount_amount: discount,
        ...(tendered > 0 ? { amount_tendered: tendered } : {}),
      },
      {
        onSuccess: (sale) => {
          setCompletedSale(sale);
          setCart([]);
          resetCustomer();
          setPaymentMethod("cash");
          setDiscountAmount("");
          setTenderedAmount("");
        },
      },
    );
  };

  const holdSale = () => {
    if (cart.length === 0) return;
    setHeldSales((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        heldAt: new Date().toISOString(),
        cart,
        customerName,
        ownerId: linkedOwnerId,
      },
    ]);
    setCart([]);
    resetCustomer();
  };

  const resumeSale = (id: string) => {
    const held = heldSales.find((h) => h.id === id);
    if (!held) return;
    setCart(held.cart);
    setCustomerName(held.customerName);
    setLinkedOwnerId(held.ownerId);
    setHeldSales((prev) => prev.filter((h) => h.id !== id));
    setShowHeld(false);
  };

  const discardHeld = (id: string) => setHeldSales((prev) => prev.filter((h) => h.id !== id));

  if (completedSale) {
    return (
      <Receipt
        sale={completedSale}
        clinic={clinic}
        onNewSale={() => setCompletedSale(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Pet Shop Checkout</h1>
          <p className="text-sm text-muted-foreground">
            Scan or search items to ring up an over-the-counter sale.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={cart.length === 0} onClick={holdSale}>
            <PauseCircle className="h-4 w-4 mr-2" />
            Hold Sale
          </Button>
          {heldSales.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHeld(true)}>
              Held ({heldSales.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <ItemSearch onAdd={addToCart} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart {cart.length > 0 && `(${cart.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Cart is empty — scan or search an item above to get started.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.item_id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(c.unit_price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(c.item_id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{c.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(c.item_id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="w-20 text-right text-sm font-medium">
                          {formatCurrency(Number(c.unit_price) * c.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => removeFromCart(c.item_id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerInput
                name={customerName}
                linkedOwnerId={linkedOwnerId}
                onNameChange={(name) => {
                  setCustomerName(name);
                  setLinkedOwnerId(null);
                }}
                onSelectOwner={(owner) => {
                  setCustomerName(`${owner.first_name} ${owner.last_name}`);
                  setLinkedOwnerId(owner.id);
                }}
                onUnlink={() => setLinkedOwnerId(null)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (est.)</span>
                  <span>{formatCurrency(estimatedTax)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
                  <span>Total (est.)</span>
                  <span>{formatCurrency(estimatedTotal)}</span>
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">Discount</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>

              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">Amount Tendered</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                />
                {tendered > 0 && (
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-muted-foreground">Change Due</span>
                    <span className="font-medium">{formatCurrency(changeDue)}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full cursor-pointer"
                disabled={cart.length === 0 || createSale.isPending}
                onClick={handleCompleteSale}
              >
                {createSale.isPending ? "Processing…" : "Complete Sale"}
              </Button>
            </CardContent>
          </Card>

          <RecentSalesPanel
            canReturn={canReturn}
            onView={setViewingSale}
            onReturn={setReturningSale}
          />
        </div>
      </div>

      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Held Sales</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {heldSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No held sales.</p>
            ) : (
              heldSales.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {h.cart.length} item{h.cart.length !== 1 ? "s" : ""}
                      {h.customerName ? ` · ${h.customerName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Held at {format(new Date(h.heldAt), "p")}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => resumeSale(h.id)}>
                      Resume
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => discardHeld(h.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {viewingSale && (
        <Dialog open onOpenChange={(open) => !open && setViewingSale(null)}>
          <DialogContent className="sm:max-w-lg">
            <Receipt sale={viewingSale} clinic={clinic} onClose={() => setViewingSale(null)} />
          </DialogContent>
        </Dialog>
      )}

      {returningSale && (
        <ReturnDialog sale={returningSale} onClose={() => setReturningSale(null)} />
      )}
    </div>
  );
}

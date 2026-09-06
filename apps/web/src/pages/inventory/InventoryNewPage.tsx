import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useCreateInventoryItem } from "../../hooks/use-inventory";
import { useCreateGrn } from "../../hooks/use-grn";
import { SupplierPicker } from "../../components/inventory/SupplierPicker";
import type { ItemCategory } from "../../types/inventory";

const CATEGORIES: Array<{ value: ItemCategory; label: string }> = [
  { value: "MEDICATION", label: "Medication" },
  { value: "VACCINE", label: "Vaccine" },
  { value: "SURGICAL_SUPPLY", label: "Surgical" },
  { value: "DIAGNOSTIC_SUPPLY", label: "Diagnostic" },
  { value: "FOOD", label: "Food" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
];

const CreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.enum([
    "MEDICATION",
    "VACCINE",
    "SURGICAL_SUPPLY",
    "DIAGNOSTIC_SUPPLY",
    "FOOD",
    "EQUIPMENT",
    "OTHER",
  ]),
  unit: z.string().min(1, "Unit is required").max(50),
  reorder_threshold: z.coerce.number().int().min(0).default(10),
  sku: z.string().max(100).default(""),
  barcode: z.string().max(100).default(""),
  supplier_name: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
  is_controlled: z.boolean().default(false),
});

const DEFAULT_VALUES: z.infer<typeof CreateSchema> = {
  name: "",
  category: "MEDICATION",
  unit: "",
  reorder_threshold: 10,
  sku: "",
  barcode: "",
  supplier_name: "",
  location: "",
  is_controlled: false,
};

const StockSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_cost: z.coerce.number().min(0, "Unit cost must be non-negative"),
  selling_price: z.coerce.number().min(0, "Selling price must be non-negative"),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  batch_no: z.string().max(100).default(""),
  expiry_date: z.string().default(""),
});

const STOCK_DEFAULTS: z.infer<typeof StockSchema> = {
  quantity: 1,
  unit_cost: 0,
  selling_price: 0,
  discount_percent: 0,
  batch_no: "",
  expiry_date: "",
};

export function InventoryNewPage() {
  const navigate = useNavigate();
  const createItem = useCreateInventoryItem();
  const createGrn = useCreateGrn();
  const [addedCount, setAddedCount] = useState(0);

  const [receiveStockNow, setReceiveStockNow] = useState(true);
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");

  // Once the item half succeeds, this holds its id so a failed stock
  // submission can be retried without re-creating the item or losing what
  // was typed into the stock section.
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof CreateSchema>>({
    resolver: zodResolver(CreateSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const stockForm = useForm<z.infer<typeof StockSchema>>({
    resolver: zodResolver(StockSchema),
    defaultValues: STOCK_DEFAULTS,
  });

  const isBusy = createItem.isPending || createGrn.isPending;

  function completeCycle() {
    setAddedCount((n) => n + 1);
    setPendingItemId(null);
    setStockError(null);

    const itemValues = form.getValues();
    // Keep category/supplier/location — batches of new items (e.g. a
    // shipment of several vaccines) usually share those; only clear the
    // per-item fields so the form is ready for the next one immediately.
    form.reset({
      ...DEFAULT_VALUES,
      category: itemValues.category,
      supplier_name: itemValues.supplier_name,
      location: itemValues.location,
      is_controlled: itemValues.is_controlled,
    });
    stockForm.reset(STOCK_DEFAULTS);
    form.setFocus("name");
  }

  function submitStock(itemId: string) {
    setStockError(null);
    const s = stockForm.getValues();
    createGrn.mutate(
      {
        supplier_name: supplierName,
        ...(supplierId ? { supplier_id: supplierId } : {}),
        ...(supplierInvoiceNo ? { supplier_invoice_no: supplierInvoiceNo } : {}),
        items: [
          {
            item_id: itemId,
            quantity: s.quantity,
            unit_cost: s.unit_cost,
            selling_price: s.selling_price,
            discount_percent: s.discount_percent || 0,
            ...(s.batch_no ? { batch_no: s.batch_no } : {}),
            ...(s.expiry_date ? { expiry_date: s.expiry_date } : {}),
          },
        ],
      },
      {
        onSuccess: () => completeCycle(),
        onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
          setStockError(
            err?.response?.data?.error?.message ??
              "Failed to save initial stock — the item was created; retry below.",
          );
        },
      },
    );
  }

  async function handleSubmit() {
    // Retry path — the item already exists, only the stock half failed.
    if (pendingItemId) {
      submitStock(pendingItemId);
      return;
    }

    const itemValid = await form.trigger();
    if (!itemValid) return;

    if (receiveStockNow) {
      const stockValid = await stockForm.trigger();
      if (!stockValid) return;
      if (!supplierName.trim()) {
        setStockError("Supplier is required to receive stock.");
        return;
      }
    }

    const values = form.getValues();
    createItem.mutate(
      {
        name: values.name,
        category: values.category,
        unit: values.unit,
        reorder_threshold: values.reorder_threshold,
        ...(values.sku ? { sku: values.sku } : {}),
        ...(values.barcode ? { barcode: values.barcode } : {}),
        ...(values.supplier_name ? { supplier_name: values.supplier_name } : {}),
        ...(values.location ? { location: values.location } : {}),
        is_controlled: values.is_controlled,
      },
      {
        onSuccess: (item) => {
          if (!receiveStockNow) {
            completeCycle();
            return;
          }
          setPendingItemId(item.id);
          submitStock(item.id);
        },
      },
    );
  }

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Add Inventory Item</h1>
          <p className="text-sm text-muted-foreground">
            Catalog the item and, if you have stock in hand, receive it in the
            same step — no need to visit Goods Received separately.
            {addedCount > 0 && ` Added ${addedCount} so far.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <fieldset disabled={!!pendingItemId} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Amoxicillin 250mg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Category <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Unit <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="tablet, ml, box, each" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reorder_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reorder Threshold</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional — for Pet Shop scanning" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier (catalog note)</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location / Shelf</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Cabinet A, Shelf 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!!pendingItemId}
                    onClick={() =>
                      form.setValue("is_controlled", !form.watch("is_controlled"))
                    }
                    className={`w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
                      form.watch("is_controlled")
                        ? "bg-destructive"
                        : "bg-muted border border-input"
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-auto ${
                        form.watch("is_controlled") ? "translate-x-2" : "-translate-x-2"
                      }`}
                    />
                  </button>
                  <span className="text-sm">Controlled substance</span>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Initial Stock</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="receive-now" className="text-xs text-muted-foreground font-normal">
                Receive stock now
              </Label>
              <Switch
                id="receive-now"
                checked={receiveStockNow}
                disabled={!!pendingItemId}
                onCheckedChange={setReceiveStockNow}
              />
            </div>
          </CardHeader>
          <CardContent>
            {!receiveStockNow ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                This item will have zero stock until you receive it here or via{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => navigate("/inventory/grn/new")}
                >
                  Goods Received
                </button>
                .
              </p>
            ) : (
              <Form {...stockForm}>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <fieldset disabled={!!pendingItemId} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>
                        Supplier <span className="text-destructive">*</span>
                      </Label>
                      <SupplierPicker
                        name={supplierName}
                        onChange={({ id, name }) => {
                          setSupplierId(id);
                          setSupplierName(name);
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Supplier Invoice #</Label>
                        <Input
                          value={supplierInvoiceNo}
                          onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                          placeholder="Optional"
                        />
                      </div>

                      <FormField
                        control={stockForm.control}
                        name="batch_no"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Batch #</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={stockForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Quantity <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={stockForm.control}
                        name="unit_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Unit Cost <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={stockForm.control}
                        name="selling_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Selling Price <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={stockForm.control}
                        name="discount_percent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount %</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={stockForm.control}
                        name="expiry_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </fieldset>

                  {stockError && (
                    <p className="text-sm text-destructive">{stockError}</p>
                  )}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => navigate("/inventory")}>
          {addedCount > 0 ? "Done" : "Cancel"}
        </Button>
        <Button type="button" disabled={isBusy} onClick={handleSubmit}>
          <PackagePlus className="h-4 w-4 mr-2" />
          {isBusy
            ? "Saving..."
            : pendingItemId
              ? "Retry Stock"
              : receiveStockNow
                ? "Create Item + Receive Stock"
                : "Create Item"}
        </Button>
      </div>
    </div>
  );
}

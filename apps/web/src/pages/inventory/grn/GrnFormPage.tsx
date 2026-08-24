import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "../../../components/ui/command";
import { useInventoryItems } from "../../../hooks/use-inventory";
import { useCreateGrn } from "../../../hooks/use-grn";
import { useSuppliers } from "../../../hooks/use-suppliers";
import { useDebounce } from "../../../hooks/use-debounce";
import { formatCurrency } from "../../../lib/currency";

type LineRow = {
  key: string;
  item_id: string;
  item_name: string;
  item_unit: string;
  batch_no: string;
  quantity: string;
  unit_cost: string;
  selling_price: string;
  discount_percent: string;
  expiry_date: string;
};

function emptyRow(): LineRow {
  return {
    key: Math.random().toString(36).slice(2),
    item_id: "",
    item_name: "",
    item_unit: "",
    batch_no: "",
    quantity: "1",
    unit_cost: "",
    selling_price: "",
    discount_percent: "0",
    expiry_date: "",
  };
}

// Rendered as a modal (portalled to document.body by the Dialog primitive)
// rather than an inline absolutely-positioned dropdown, because this picker
// sits inside a table wrapped in `overflow-x-auto` — an inline dropdown would
// get clipped by that wrapper and never actually be visible to the user.
function ItemPicker({
  onSelect,
}: {
  onSelect: (item: { id: string; name: string; unit: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const { data } = useInventoryItems({
    ...(debouncedQuery ? { search: debouncedQuery } : {}),
    limit: 8,
  });
  const results = data?.items ?? [];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full justify-start font-normal text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-3.5 w-3.5 mr-2" />
        Search item…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Select an inventory item</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search items…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {debouncedQuery
                  ? "No items found."
                  : "Type to search the catalog."}
              </CommandEmpty>
              {results.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    onSelect({ id: item.id, name: item.name, unit: item.unit });
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                  {item.name}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Suppliers rarely change, so this lets staff pick an existing one instead of
// retyping it every GRN. Typing a name with no match just gets saved as a new
// supplier automatically when the GRN is submitted (see grn.service.ts's
// resolveSupplierTx) — there's no separate "add supplier" step.
function SupplierPicker({
  name,
  onChange,
}: {
  name: string;
  onChange: (v: { id: string | null; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const debouncedName = useDebounce(name, 250);
  const { data: suppliers } = useSuppliers({
    ...(debouncedName ? { search: debouncedName } : {}),
    limit: 8,
  });
  const results = suppliers ?? [];
  const hasExactMatch = results.some(
    (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
  );

  return (
    <div className="relative">
      <Input
        value={name}
        onChange={(e) => {
          onChange({ id: null, name: e.target.value });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search or type a new supplier"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => {
                onChange({ id: s.id, name: s.name });
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
            >
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
          {name.trim().length > 0 && !hasExactMatch && (
            <p className="px-3 py-2 text-xs text-muted-foreground border-t">
              No match — “{name.trim()}” will be saved as a new supplier.
            </p>
          )}
          {results.length === 0 && name.trim().length === 0 && (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              Type to search saved suppliers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function GrnFormPage() {
  const navigate = useNavigate();
  const createGrn = useCreateGrn();

  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<LineRow[]>([emptyRow()]);

  function updateRow(key: string, patch: Partial<LineRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function removeRow(key: string) {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.key !== key) : prev,
    );
  }

  const total = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_cost) || 0),
    0,
  );

  const canSubmit =
    supplierName.trim().length > 0 &&
    rows.every(
      (r) =>
        r.item_id &&
        Number(r.quantity) > 0 &&
        Number(r.unit_cost) >= 0 &&
        Number(r.selling_price) >= 0,
    );

  function onSubmit() {
    createGrn.mutate(
      {
        supplier_name: supplierName,
        ...(supplierId ? { supplier_id: supplierId } : {}),
        ...(supplierInvoiceNo
          ? { supplier_invoice_no: supplierInvoiceNo }
          : {}),
        ...(notes ? { notes } : {}),
        items: rows.map((r) => ({
          item_id: r.item_id,
          quantity: Number(r.quantity),
          unit_cost: Number(r.unit_cost),
          selling_price: Number(r.selling_price),
          discount_percent: Number(r.discount_percent) || 0,
          ...(r.batch_no ? { batch_no: r.batch_no } : {}),
          ...(r.expiry_date ? { expiry_date: r.expiry_date } : {}),
        })),
      },
      {
        onSuccess: (grn) => navigate(`/inventory/grn/${grn.id}`),
      },
    );
  }

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory/grn")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">New Goods Received Note</h1>
          <p className="text-sm text-muted-foreground">
            Receiving stock creates a new batch per line, each with its own
            cost, price, discount, and expiry.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Supplier</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>
              Supplier Name <span className="text-destructive">*</span>
            </Label>
            <SupplierPicker
              name={supplierName}
              onChange={({ id, name }) => {
                setSupplierId(id);
                setSupplierName(name);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Supplier Invoice #</Label>
            <Input
              value={supplierInvoiceNo}
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <Label>Notes</Label>
            <Textarea
              rows={1}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Line Items</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Line
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium text-muted-foreground px-4 py-2 min-w-55">
                    Item
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">
                    Batch #
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-24">
                    Qty
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-28">
                    Unit Cost
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-28">
                    Sell Price
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2 w-24">
                    Discount %
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2 w-40">
                    Expiry
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b last:border-b-0 align-top"
                  >
                    <td className="px-4 py-2">
                      {row.item_id ? (
                        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm">
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">
                            {row.item_name}
                          </span>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              updateRow(row.key, {
                                item_id: "",
                                item_name: "",
                                item_unit: "",
                              })
                            }
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <ItemPicker
                          onSelect={(item) =>
                            updateRow(row.key, {
                              item_id: item.id,
                              item_name: item.name,
                              item_unit: item.unit,
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-9"
                        value={row.batch_no}
                        onChange={(e) =>
                          updateRow(row.key, { batch_no: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        className="h-9 text-right"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.key, { quantity: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9 text-right"
                        value={row.unit_cost}
                        onChange={(e) =>
                          updateRow(row.key, { unit_cost: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9 text-right"
                        value={row.selling_price}
                        onChange={(e) =>
                          updateRow(row.key, { selling_price: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        className="h-9 text-right"
                        value={row.discount_percent}
                        onChange={(e) =>
                          updateRow(row.key, {
                            discount_percent: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        className="h-9"
                        value={row.expiry_date}
                        onChange={(e) =>
                          updateRow(row.key, { expiry_date: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={rows.length === 1}
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total cost:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(total)}
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/inventory/grn")}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || createGrn.isPending}
            onClick={onSubmit}
          >
            {createGrn.isPending ? "Saving..." : "Receive Stock"}
          </Button>
        </div>
      </div>
    </div>
  );
}

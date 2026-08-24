import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
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
import { useInventoryItem, useUpdateInventoryItem } from "../../hooks/use-inventory";
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

const EditSchema = z.object({
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
  supplier_name: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
  is_controlled: z.boolean().default(false),
});

export function InventoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading } = useInventoryItem(id);
  const update = useUpdateInventoryItem(id ?? "");

  const form = useForm<z.infer<typeof EditSchema>>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      name: "",
      category: "MEDICATION",
      unit: "",
      reorder_threshold: 10,
      sku: "",
      supplier_name: "",
      location: "",
      is_controlled: false,
    },
  });

  useEffect(() => {
    if (!item) return;
    form.reset({
      name: item.name,
      category: item.category,
      unit: item.unit,
      reorder_threshold: item.reorder_threshold,
      sku: item.sku ?? "",
      supplier_name: item.supplier_name ?? "",
      location: item.location ?? "",
      is_controlled: item.is_controlled,
    });
    // Only re-sync when the loaded item itself changes, not on every render —
    // otherwise this would clobber in-progress edits with the last-saved value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  function onSubmit(values: z.infer<typeof EditSchema>) {
    update.mutate(
      {
        name: values.name,
        category: values.category,
        unit: values.unit,
        reorder_threshold: values.reorder_threshold,
        sku: values.sku,
        supplier_name: values.supplier_name,
        location: values.location,
        is_controlled: values.is_controlled,
      },
      {
        onSuccess: () => navigate(`/inventory/${id}`),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
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

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/inventory/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Edit {item.name}</h1>
          <p className="text-sm text-muted-foreground">
            Update the catalog entry. Cost, selling price, discount, and expiry are
            managed per batch and aren't edited here.
          </p>
        </div>
      </div>

      <div>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  name="supplier_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
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
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    form.setValue("is_controlled", !form.watch("is_controlled"))
                  }
                  className={`w-10 h-6 rounded-full transition-colors shrink-0 ${
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

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(`/inventory/${id}`)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                  {update.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </div>
    </div>
  );
}

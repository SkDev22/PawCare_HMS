import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Stethoscope, Plus, Pencil, Search } from "lucide-react";
import { CreateServiceSchema, type CreateServiceInput } from "@pawcare/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import { useAllServices, useCreateService, useUpdateService } from "@/hooks/use-billing";
import type { Service } from "@/types/billing";

const CATEGORY_LABEL: Record<string, string> = {
  exam: "Exam",
  procedure: "Procedure",
  lab: "Lab",
  medication: "Medication",
  grooming: "Grooming",
  other: "Other",
};

function getServerErrorMessage(err: unknown): string {
  if (
    err !== null &&
    typeof err === "object" &&
    "response" in err &&
    err.response !== null &&
    typeof err.response === "object" &&
    "data" in err.response
  ) {
    const data = err.response.data as { error?: { message?: string } };
    return data?.error?.message ?? "Failed to save service. Please try again.";
  }
  return "Unable to connect to the server. Check your network.";
}

function ServiceFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Service | null;
}) {
  const createService = useCreateService();
  const updateService = useUpdateService();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateServiceInput>({
    resolver: zodResolver(CreateServiceSchema),
    defaultValues: { name: "", category: "exam", price: 0, is_taxable: true },
  });

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              name: editing.name,
              category: editing.category as CreateServiceInput["category"],
              price: Number(editing.price),
              duration_minutes: editing.duration_minutes ?? undefined,
              is_taxable: editing.is_taxable,
            }
          : { name: "", category: "exam", price: 0, is_taxable: true },
      );
    }
  }, [open, editing, reset]);

  const onSubmit = async (data: CreateServiceInput) => {
    try {
      if (editing) {
        await updateService.mutateAsync({ id: editing.id, ...data });
        toast.success("Service updated");
      } else {
        await createService.mutateAsync(data);
        toast.success("Service added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(getServerErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="service-name">Name</Label>
            <Input id="service-name" placeholder="Consultation Fee" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="service-category">Category</Label>
              <Select
                value={watch("category")}
                onValueChange={(v) => setValue("category", v as CreateServiceInput["category"], { shouldDirty: true })}
              >
                <SelectTrigger id="service-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="service-price">Price</Label>
              <Input
                id="service-price"
                type="number"
                step="0.01"
                min={0}
                {...register("price")}
              />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
          </div>

          <div className="grid gap-2 sm:w-1/2">
            <Label htmlFor="service-duration">Duration (minutes)</Label>
            <Input
              id="service-duration"
              type="number"
              step="1"
              min={1}
              placeholder="Optional"
              {...register("duration_minutes", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
            {errors.duration_minutes && (
              <p className="text-xs text-destructive">{errors.duration_minutes.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <Label htmlFor="service-taxable" className="cursor-pointer font-normal">
              Taxable
            </Label>
            <Switch
              id="service-taxable"
              checked={watch("is_taxable")}
              onCheckedChange={(v) => setValue("is_taxable", v, { shouldDirty: true })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ServicesManagementCard() {
  const { data: services = [], isLoading } = useAllServices();
  const updateService = useUpdateService();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [search, setSearch] = useState("");

  const filteredServices = services.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const categoryLabel = CATEGORY_LABEL[s.category] ?? s.category;
    return (
      s.name.toLowerCase().includes(q) || categoryLabel.toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setDialogOpen(true);
  }

  function toggleActive(service: Service) {
    updateService.mutate(
      { id: service.id, is_active: !service.is_active },
      {
        onError: () => toast.error("Failed to update service status."),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <CardTitle className="text-base">Billable Services</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Services and procedures your clinic can charge for — consultations,
              exams, surgeries, and more. Used when adding charges to a medical
              record or invoice.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Service
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No services yet — add your first one above.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search services…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {filteredServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No services match "{search}".
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((s) => (
                      <TableRow key={s.id} className={!s.is_active ? "opacity-60" : undefined}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{CATEGORY_LABEL[s.category] ?? s.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.price)}</TableCell>
                        <TableCell>{s.is_taxable ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <button type="button" onClick={() => toggleActive(s)}>
                            <Badge variant={s.is_active ? "success" : "secondary"} className="cursor-pointer">
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <ServiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </Card>
  );
}

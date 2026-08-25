import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { UpdateClinicSchema, type UpdateClinicInput } from "@pawcare/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinic, useUpdateClinic } from "@/hooks/use-clinic";

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
    return data?.error?.message ?? "Failed to update clinic. Please try again.";
  }
  return "Unable to connect to the server. Check your network.";
}

export function ClinicInformationForm() {
  const { data: clinic, isLoading } = useClinic();
  const updateClinic = useUpdateClinic();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateClinicInput>({
    resolver: zodResolver(UpdateClinicSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      timezone: "",
      currency: "",
      tax_rate: 0,
      invoice_prefix: "",
      invoice_due_days: 14,
      invoice_footer_text: "",
    },
  });

  useEffect(() => {
    if (clinic) {
      reset({
        name: clinic.name,
        address: clinic.address ?? "",
        phone: clinic.phone ?? "",
        email: clinic.email ?? "",
        timezone: clinic.timezone,
        currency: clinic.currency,
        tax_rate: Number(clinic.tax_rate),
        invoice_prefix: clinic.invoice_prefix,
        invoice_due_days: clinic.invoice_due_days,
        invoice_footer_text: clinic.invoice_footer_text ?? "",
      });
    }
  }, [clinic, reset]);

  const onSubmit = async (data: UpdateClinicInput) => {
    try {
      await updateClinic.mutateAsync(data);
      toast.success("Clinic information updated");
    } catch (err) {
      toast.error(getServerErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <CardTitle className="text-base">Clinic Information</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Name, address, contact details, timezone, and currency.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="clinic-name">Clinic name</Label>
                <Input id="clinic-name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clinic-phone">Phone</Label>
                <Input id="clinic-phone" type="tel" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="clinic-email">Contact email</Label>
                <Input id="clinic-email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clinic-currency">Currency</Label>
                <Input id="clinic-currency" placeholder="LKR" {...register("currency")} />
                {errors.currency && (
                  <p className="text-xs text-destructive">{errors.currency.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clinic-address">Address</Label>
              <Textarea id="clinic-address" rows={2} {...register("address")} />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
            </div>

            <div className="grid gap-2 sm:w-1/2">
              <Label htmlFor="clinic-timezone">Timezone</Label>
              <Input id="clinic-timezone" placeholder="Asia/Colombo" {...register("timezone")} />
              {errors.timezone && (
                <p className="text-xs text-destructive">{errors.timezone.message}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Invoicing
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="clinic-tax-rate">Tax rate (%)</Label>
                  <Input
                    id="clinic-tax-rate"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    {...register("tax_rate")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-applied to new invoices until manually edited.
                  </p>
                  {errors.tax_rate && (
                    <p className="text-xs text-destructive">{errors.tax_rate.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="clinic-invoice-prefix">Invoice prefix</Label>
                  <Input id="clinic-invoice-prefix" placeholder="INV-" {...register("invoice_prefix")} />
                  {errors.invoice_prefix && (
                    <p className="text-xs text-destructive">{errors.invoice_prefix.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="clinic-due-days">Default due (days)</Label>
                  <Input
                    id="clinic-due-days"
                    type="number"
                    step="1"
                    min={0}
                    max={365}
                    {...register("invoice_due_days")}
                  />
                  {errors.invoice_due_days && (
                    <p className="text-xs text-destructive">{errors.invoice_due_days.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clinic-invoice-footer">Invoice footer text</Label>
                <Textarea
                  id="clinic-invoice-footer"
                  rows={2}
                  placeholder="Thank you for trusting us with your pet's care."
                  {...register("invoice_footer_text")}
                />
                {errors.invoice_footer_text && (
                  <p className="text-xs text-destructive">{errors.invoice_footer_text.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {isDirty ? "You have unsaved changes" : ""}
              </p>
              <Button type="submit" disabled={!isDirty || isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

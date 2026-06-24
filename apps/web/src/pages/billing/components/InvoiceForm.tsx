import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from '../../../hooks/use-debounce';
import { useOwners } from '../../../hooks/use-owners';
import { useCreateInvoice } from '../../../hooks/use-billing';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../../components/ui/form';
import type { Invoice } from '../../../types/billing';

const Schema = z.object({
  owner_id:        z.string().uuid('Select a valid owner'),
  due_date:        z.string().default(''),
  notes:           z.string().default(''),
  tax_amount:      z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
});

type FormValues = z.infer<typeof Schema>;

interface Props {
  onSuccess: (invoiceId: string) => void;
  onCancel: () => void;
}

export function InvoiceForm({ onSuccess, onCancel }: Props) {
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedOwnerName, setSelectedOwnerName] = useState('');
  const debouncedSearch = useDebounce(ownerSearch, 300);

  const { data: ownersData } = useOwners({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    limit: 8,
  });

  const createInvoice = useCreateInvoice();

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { owner_id: '', due_date: '', notes: '', tax_amount: 0, discount_amount: 0 },
  });

  const owners = ownersData?.items ?? [];

  function handleOwnerSelect(id: string, name: string) {
    form.setValue('owner_id', id, { shouldValidate: true });
    setSelectedOwnerName(name);
    setOwnerSearch('');
  }

  function onSubmit(values: FormValues) {
    createInvoice.mutate(
      {
        owner_id: values.owner_id,
        ...(values.due_date ? { due_date: values.due_date } : {}),
        ...(values.notes    ? { notes:    values.notes }    : {}),
        ...(values.tax_amount      > 0 ? { tax_amount:      values.tax_amount }      : {}),
        ...(values.discount_amount > 0 ? { discount_amount: values.discount_amount } : {}),
      },
      {
        onSuccess: (invoice: Invoice) => onSuccess(invoice.id),
      },
    );
  }

  const ownerId = form.watch('owner_id');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* Owner search */}
        <div className="space-y-1">
          <Label>Client *</Label>
          {ownerId && selectedOwnerName ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                {selectedOwnerName}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { form.setValue('owner_id', ''); setSelectedOwnerName(''); }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search by name, email, or phone..."
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
              />
              {form.formState.errors.owner_id && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.owner_id.message}
                </p>
              )}
              {ownerSearch.length > 1 && owners.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {owners.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 first:rounded-t-md last:rounded-b-md"
                      onClick={() => handleOwnerSelect(o.id, `${o.first_name} ${o.last_name}`)}
                    >
                      <span className="font-medium">{o.first_name} {o.last_name}</span>
                      {o.email && (
                        <span className="text-muted-foreground ml-2 text-xs">{o.email}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {ownerSearch.length > 1 && owners.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                  No clients found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Due date */}
        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tax & Discount in a row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="tax_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax ($)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="discount_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount ($)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Internal notes..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createInvoice.isPending}>
            {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

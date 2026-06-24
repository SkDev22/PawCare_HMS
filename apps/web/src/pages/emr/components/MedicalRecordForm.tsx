import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { usePets } from '../../../hooks/use-pets';
import { useVets } from '../../../hooks/use-appointments';
import { useCreateMedicalRecord } from '../../../hooks/use-emr';
import type { MedicalRecord } from '../../../types/emr';

const FormSchema = z.object({
  pet_id:          z.string().uuid('Select a patient'),
  vet_id:          z.string().uuid('Select a veterinarian').optional(),
  visit_date:      z.string().min(1, 'Visit date is required'),
  chief_complaint: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

function PetSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data } = usePets({ search, limit: 8 });

  const selected = data?.items.find((p) => p.id === value);

  return (
    <div className="relative">
      <Input
        placeholder="Search patient by name..."
        value={open ? search : (selected ? `${selected.name}${selected.owner ? ` (${selected.owner.first_name} ${selected.owner.last_name})` : ''}` : '')}
        onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && data && data.items.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {data.items.map((pet) => (
            <button
              key={pet.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex flex-col"
              onMouseDown={() => { onChange(pet.id); setSearch(''); setOpen(false); }}
            >
              <span className="font-medium">{pet.name}</span>
              <span className="text-muted-foreground text-xs">
                {pet.species}{pet.owner ? ` · ${pet.owner.first_name} ${pet.owner.last_name}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MedicalRecordFormProps {
  onSuccess?: (recordId: string) => void;
  onCancel?: () => void;
}

export function MedicalRecordForm({ onSuccess, onCancel }: MedicalRecordFormProps) {
  const createRecord = useCreateMedicalRecord();
  const { data: vetsData } = useVets();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      pet_id:          '',
      visit_date:      format(new Date(), 'yyyy-MM-dd'),
      chief_complaint: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    createRecord.mutate(
      {
        pet_id:          values.pet_id,
        visit_date:      values.visit_date,
        ...(values.vet_id          ? { vet_id:          values.vet_id }          : {}),
        ...(values.chief_complaint ? { chief_complaint: values.chief_complaint } : {}),
      },
      {
        onSuccess: (record: MedicalRecord) => onSuccess?.(record.id),
      },
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="pet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient</FormLabel>
              <FormControl>
                <PetSearch value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Veterinarian</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select veterinarian (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vetsData?.map((vet) => (
                    <SelectItem key={vet.id} value={vet.id}>
                      Dr. {vet.first_name} {vet.last_name}
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
          name="visit_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visit Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chief_complaint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chief Complaint</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Reason for visit..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createRecord.isPending}>
            {createRecord.isPending ? 'Creating...' : 'Create Record'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

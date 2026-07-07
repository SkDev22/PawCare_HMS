import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePetSchema, type CreatePetInput } from '@pawcare/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { useCreatePet, useUpdatePet } from '@/hooks/use-pets';
import type { Pet } from '@/types/patients';

interface Props {
  open:      boolean;
  onClose:   () => void;
  ownerId:   string;
  editPet?: Pet;
}

export function PetForm({ open, onClose, ownerId, editPet }: Props) {
  const isEdit = !!editPet;

  const form = useForm<CreatePetInput>({
    resolver: zodResolver(CreatePetSchema),
    defaultValues: {
      owner_id:      ownerId,
      name:          '',
      species:       'DOG',
      breed:         '',
      date_of_birth: '',
      weight_kg:     undefined,
      sex:           undefined,
      color:         '',
      insurance_id:  '',
      notes:         '',
    },
  });

  useEffect(() => {
    if (editPet) {
      form.reset({
        owner_id:      ownerId,
        name:          editPet.name,
        species:       editPet.species,
        breed:         editPet.breed ?? '',
        date_of_birth: editPet.date_of_birth ? editPet.date_of_birth.slice(0, 10) : '',
        weight_kg:     editPet.weight_kg ? Number(editPet.weight_kg) : undefined,
        sex:           editPet.sex ?? undefined,
        color:         editPet.color ?? '',
        insurance_id:  editPet.insurance_id ?? '',
        notes:         editPet.notes ?? '',
      });
    } else {
      form.reset({ owner_id: ownerId, name: '', species: 'DOG', breed: '', date_of_birth: '', weight_kg: undefined, sex: undefined, color: '', insurance_id: '', notes: '' });
    }
  }, [editPet, ownerId, form]);

  const create = useCreatePet();
  const update = useUpdatePet(editPet?.id ?? '');

  const onSubmit = async (values: CreatePetInput) => {
    try {
      if (isEdit) {
        const { owner_id: _omit, ...rest } = values;
        await update.mutateAsync(rest);
      } else {
        await create.mutateAsync(values);
      }
      onClose();
    } catch {
      // errors surfaced via toast in hook
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pet' : 'Add New Pet'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the pet's profile." : "Register a new patient."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl><Input placeholder="Buddy" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Species *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['DOG','CAT','BIRD','RABBIT','REPTILE','SMALL_MAMMAL','OTHER'] as const).map((s) => (
                          <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl><Input placeholder="Labrador Retriever" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Unknown" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Male (intact)</SelectItem>
                        <SelectItem value="F">Female (intact)</SelectItem>
                        <SelectItem value="M_NEUTERED">Male (neutered)</SelectItem>
                        <SelectItem value="F_SPAYED">Female (spayed)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="4.5"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color / markings</FormLabel>
                  <FormControl><Input placeholder="Golden brown" {...field} /></FormControl>
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
                    <Textarea placeholder="Any relevant notes…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add pet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

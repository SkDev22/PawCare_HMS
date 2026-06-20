import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateOwnerSchema, type CreateOwnerInput } from '@pawcare/shared';
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
import { useCreateOwner, useUpdateOwner } from '@/hooks/use-owners';
import type { Owner } from '@/types/patients';

interface Props {
  open:        boolean;
  onClose:     () => void;
  editOwner?: Owner;
}

export function OwnerForm({ open, onClose, editOwner }: Props) {
  const isEdit = !!editOwner;

  const form = useForm<CreateOwnerInput>({
    resolver: zodResolver(CreateOwnerSchema),
    defaultValues: {
      first_name:        '',
      last_name:         '',
      email:             '',
      phone:             '',
      address:           '',
      emergency_contact: '',
      preferred_contact: 'email',
      portal_enabled:    false,
    },
  });

  useEffect(() => {
    if (editOwner) {
      form.reset({
        first_name:        editOwner.first_name,
        last_name:         editOwner.last_name,
        email:             editOwner.email ?? '',
        phone:             editOwner.phone,
        address:           editOwner.address ?? '',
        emergency_contact: editOwner.emergency_contact ?? '',
        preferred_contact: editOwner.preferred_contact,
        portal_enabled:    editOwner.portal_enabled,
      });
    } else {
      form.reset({ first_name: '', last_name: '', email: '', phone: '', address: '', emergency_contact: '', preferred_contact: 'email', portal_enabled: false });
    }
  }, [editOwner, form]);

  const create = useCreateOwner();
  const update = useUpdateOwner(editOwner?.id ?? '');

  const onSubmit = async (values: CreateOwnerInput) => {
    try {
      if (isEdit) {
        await update.mutateAsync(values);
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
          <DialogTitle>{isEdit ? 'Edit Owner' : 'Add New Owner'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the owner's contact information." : "Register a new client / pet owner."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone *</FormLabel>
                    <FormControl><Input placeholder="+1-555-0100" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main St, Springfield" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergency_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency contact</FormLabel>
                    <FormControl><Input placeholder="Name / phone" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferred_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred contact</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create owner'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

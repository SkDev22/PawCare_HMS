import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '../../../components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { useCreateStaff, useUpdateStaff } from '../../../hooks/use-staff';
import type { StaffMember, StaffRole } from '../../../types/staff';

const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'ADMIN',          label: 'Admin' },
  { value: 'VETERINARIAN',   label: 'Veterinarian' },
  { value: 'NURSE',          label: 'Nurse' },
  { value: 'RECEPTIONIST',   label: 'Receptionist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
];

// ── Create schema (password required) ────────────────────────────────────────

const CreateSchema = z.object({
  email:          z.string().email('Invalid email'),
  password:       z.string().min(8, 'At least 8 characters'),
  first_name:     z.string().min(1, 'Required').max(100),
  last_name:      z.string().min(1, 'Required').max(100),
  role:           z.enum(['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN']),
  specialization: z.string().default(''),
  license_number: z.string().default(''),
  phone:          z.string().default(''),
});

// ── Edit schema (no password) ─────────────────────────────────────────────────

const EditSchema = z.object({
  first_name:     z.string().min(1, 'Required').max(100),
  last_name:      z.string().min(1, 'Required').max(100),
  email:          z.string().email('Invalid email'),
  role:           z.enum(['ADMIN', 'VETERINARIAN', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN']),
  specialization: z.string().default(''),
  license_number: z.string().default(''),
  phone:          z.string().default(''),
});

type CreateValues = z.infer<typeof CreateSchema>;
type EditValues   = z.infer<typeof EditSchema>;

// ── Create form ───────────────────────────────────────────────────────────────

function CreateStaffForm({
  onSuccess,
  onCancel,
}: { onSuccess: (member: StaffMember) => void; onCancel: () => void }) {
  const createStaff = useCreateStaff();

  const form = useForm<CreateValues>({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      email: '', password: '', first_name: '', last_name: '',
      role: 'RECEPTIONIST', specialization: '', license_number: '', phone: '',
    },
  });

  function onSubmit(values: CreateValues) {
    createStaff.mutate(
      {
        email:      values.email,
        password:   values.password,
        first_name: values.first_name,
        last_name:  values.last_name,
        role:       values.role,
        ...(values.specialization ? { specialization: values.specialization } : {}),
        ...(values.license_number ? { license_number: values.license_number } : {}),
        ...(values.phone          ? { phone:          values.phone }          : {}),
      },
      { onSuccess },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="first_name" render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="last_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email *</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password *</FormLabel>
            <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem>
            <FormLabel>Role *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="license_number" render={({ field }) => (
            <FormItem>
              <FormLabel>License #</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="specialization" render={({ field }) => (
          <FormItem>
            <FormLabel>Specialization</FormLabel>
            <FormControl><Input placeholder="e.g. Small Animals, Surgery" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={createStaff.isPending}>
            {createStaff.isPending ? 'Creating...' : 'Add Staff Member'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditStaffForm({
  member,
  onSuccess,
  onCancel,
}: { member: StaffMember; onSuccess: () => void; onCancel: () => void }) {
  const updateStaff = useUpdateStaff(member.id);

  const form = useForm<EditValues>({
    resolver: zodResolver(EditSchema),
    defaultValues: {
      first_name:     member.first_name,
      last_name:      member.last_name,
      email:          member.email,
      role:           member.role,
      specialization: member.specialization ?? '',
      license_number: member.license_number ?? '',
      phone:          member.phone ?? '',
    },
  });

  function onSubmit(values: EditValues) {
    updateStaff.mutate(
      {
        first_name: values.first_name,
        last_name:  values.last_name,
        email:      values.email,
        role:       values.role,
        ...(values.specialization ? { specialization: values.specialization } : {}),
        ...(values.license_number ? { license_number: values.license_number } : {}),
        ...(values.phone          ? { phone:          values.phone }          : {}),
      },
      { onSuccess },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="first_name" render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="last_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email *</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem>
            <FormLabel>Role *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="license_number" render={({ field }) => (
            <FormItem>
              <FormLabel>License #</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="specialization" render={({ field }) => (
          <FormItem>
            <FormLabel>Specialization</FormLabel>
            <FormControl><Input placeholder="e.g. Small Animals, Surgery" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={updateStaff.isPending}>
            {updateStaff.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Unified export ────────────────────────────────────────────────────────────

interface StaffFormProps {
  member?:    StaffMember;
  onSuccess:  (member?: StaffMember) => void;
  onCancel:   () => void;
}

export function StaffForm({ member, onSuccess, onCancel }: StaffFormProps) {
  if (member) {
    return <EditStaffForm member={member} onSuccess={() => onSuccess()} onCancel={onCancel} />;
  }
  return <CreateStaffForm onSuccess={(m) => onSuccess(m)} onCancel={onCancel} />;
}

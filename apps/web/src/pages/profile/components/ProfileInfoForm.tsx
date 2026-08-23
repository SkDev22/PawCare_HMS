import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UpdateOwnProfileSchema, type UpdateOwnProfileInput } from '@pawcare/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth.store';
import { useUpdateProfile } from '@/hooks/use-auth';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function getServerErrorMessage(err: unknown): string {
  if (
    err !== null &&
    typeof err === 'object' &&
    'response' in err &&
    err.response !== null &&
    typeof err.response === 'object' &&
    'data' in err.response
  ) {
    const data = err.response.data as { error?: { message?: string } };
    return data?.error?.message ?? 'Failed to update profile. Please try again.';
  }
  return 'Unable to connect to the server. Check your network.';
}

export function ProfileInfoForm() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();

  const showSpecialization = user?.role === 'VETERINARIAN';
  const showLicense = user?.role === 'VETERINARIAN' || user?.role === 'LAB_TECHNICIAN';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateOwnProfileInput>({
    resolver: zodResolver(UpdateOwnProfileSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: user?.phone ?? '',
      specialization: user?.specialization ?? '',
      license_number: user?.license_number ?? '',
    },
  });

  const onSubmit = async (data: UpdateOwnProfileInput) => {
    try {
      await updateProfile.mutateAsync(data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getServerErrorMessage(err));
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <SectionLabel>Basic information</SectionLabel>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" {...register('first_name')} />
            {errors.first_name && (
              <p className="text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" {...register('last_name')} />
            {errors.last_name && (
              <p className="text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} disabled />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...register('phone')} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Your email is your login and can't be changed here — contact an admin if it needs to
          change.
        </p>
      </div>

      {(showSpecialization || showLicense) && (
        <>
          <Separator />
          <div className="space-y-4">
            <SectionLabel>Professional details</SectionLabel>

            <div className="grid gap-4 sm:grid-cols-2">
              {showSpecialization && (
                <div className="grid gap-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    placeholder="e.g. Small animals, Surgery"
                    {...register('specialization')}
                  />
                  {errors.specialization && (
                    <p className="text-xs text-destructive">{errors.specialization.message}</p>
                  )}
                </div>
              )}

              {showLicense && (
                <div className="grid gap-2">
                  <Label htmlFor="license_number">License number</Label>
                  <Input id="license_number" {...register('license_number')} />
                  {errors.license_number && (
                    <p className="text-xs text-destructive">{errors.license_number.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isDirty ? 'You have unsaved changes' : ''}
        </p>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

import type { BadgeProps } from '@/components/ui/badge';
import type { Species, PetStatus } from '@/types/patients';

export function speciesIcon(species: Species): string {
  const icons: Record<Species, string> = {
    DOG:         '🐶',
    CAT:         '🐱',
    BIRD:        '🐦',
    RABBIT:      '🐰',
    REPTILE:     '🦎',
    SMALL_MAMMAL:'🐹',
    OTHER:       '🐾',
  };
  return icons[species] ?? '🐾';
}

export function speciesBadgeVariant(status: PetStatus): BadgeProps['variant'] {
  const map: Record<PetStatus, BadgeProps['variant']> = {
    ACTIVE:      'success',
    INACTIVE:    'secondary',
    TRANSFERRED: 'warning',
    DECEASED:    'destructive',
  };
  return map[status] ?? 'outline';
}

export function formatSex(sex: string | null): string {
  const labels: Record<string, string> = {
    M:         'Male',
    F:         'Female',
    M_NEUTERED:'Male (neutered)',
    F_SPAYED:  'Female (spayed)',
  };
  return (sex && labels[sex]) ? labels[sex] : '—';
}

export function calcAge(dob: string | null): string {
  if (!dob) return '—';
  const birth = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}yr`;
}

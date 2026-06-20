import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Mail, Phone, MapPin, AlertCircle, Pencil } from 'lucide-react';
import { useOwner } from '@/hooks/use-owners';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OwnerForm } from '@/components/patients/OwnerForm';
import { PetForm } from '@/components/patients/PetForm';
import { speciesBadgeVariant, speciesIcon } from '@/lib/patient-utils';
import type { Owner } from '@/types/patients';

export function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: owner, isLoading, error } = useOwner(id);

  const [editOpen, setEditOpen] = useState(false);
  const [addPetOpen, setAddPetOpen] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <AlertCircle className="w-10 h-10 opacity-40" />
        <p className="font-medium">Owner not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/owners')}>
          Back to owners
        </Button>
      </div>
    );
  }

  const initials = owner
    ? `${owner.first_name[0]}${owner.last_name[0]}`.toUpperCase()
    : '??';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/owners')}>
        <ArrowLeft className="w-4 h-4" />
        Owners
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 text-xl">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold">
                    {owner?.first_name} {owner?.last_name}
                  </h1>
                  {owner?.portal_enabled && (
                    <Badge variant="info">Portal access</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {owner?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {owner.phone}
                    </span>
                  )}
                  {owner?.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {owner.email}
                    </span>
                  )}
                  {owner?.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {owner.address}
                    </span>
                  )}
                </div>

                {owner?.emergency_contact && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Emergency: {owner.emergency_contact}
                  </p>
                )}
              </div>

              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4" />
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pets section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">Pets</CardTitle>
          {owner && (
            <Button size="sm" onClick={() => setAddPetOpen(true)}>
              <Plus className="w-4 h-4" />
              Add pet
            </Button>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}

          {!isLoading && owner?.pets?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No pets registered yet.</p>
            </div>
          )}

          {!isLoading &&
            owner?.pets?.map((pet) => (
              <Link
                key={pet.id}
                to={`/patients/${pet.id}`}
                className="flex items-center gap-4 px-6 py-4 border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-lg bg-accent">
                    {speciesIcon(pet.species)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium">{pet.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pet.species} {pet.breed ? `· ${pet.breed}` : ''}
                  </p>
                </div>

                <Badge variant={speciesBadgeVariant(pet.status)}>
                  {pet.status}
                </Badge>
              </Link>
            ))}
        </CardContent>
      </Card>

      {owner && (
        <>
          <OwnerForm open={editOpen} onClose={() => setEditOpen(false)} editOwner={owner as Owner} />
          <PetForm open={addPetOpen} onClose={() => setAddPetOpen(false)} ownerId={owner.id} />
        </>
      )}
    </div>
  );
}

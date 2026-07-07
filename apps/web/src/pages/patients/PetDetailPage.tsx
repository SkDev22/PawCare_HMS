import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  Pencil,
  Plus,
  Weight,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { usePet, useAddAllergy } from "@/hooks/use-pets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { PetForm } from "@/components/patients/PetForm";
import {
  speciesIcon,
  speciesBadgeVariant,
  formatSex,
  calcAge,
} from "@/lib/patient-utils";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/permissions";

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = hasPermission(role, "PATIENT_WRITE");
  const { data: pet, isLoading, error } = usePet(id);

  const [editOpen, setEditOpen] = useState(false);
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [allergen, setAllergen] = useState("");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe" | "">(
    "",
  );

  const addAllergy = useAddAllergy(id ?? "");

  const handleAddAllergy = async () => {
    if (!allergen.trim()) return;
    await addAllergy.mutateAsync({
      allergen,
      reaction: reaction || undefined,
      severity: severity || undefined,
    });
    setAllergyOpen(false);
    setAllergen("");
    setReaction("");
    setSeverity("");
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <AlertCircle className="w-10 h-10 opacity-40" />
        <p className="font-medium">Patient not found</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/patients")}
        >
          Back to patients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate("/patients")}
      >
        <ArrowLeft className="w-4 h-4" />
        Patients
      </Button>

      {/* Header */}
      <div>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 max-w-lg">
              <Avatar className="h-16 w-16 text-3xl">
                <AvatarFallback className="bg-accent text-2xl">
                  {speciesIcon(pet!.species)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold">{pet?.name}</h1>
                  <Badge variant={speciesBadgeVariant(pet!.status)}>
                    {pet?.status}
                  </Badge>
                </div>

                <p className="text-muted-foreground mt-1">
                  {pet?.species}
                  {pet?.breed ? ` · ${pet.breed}` : ""}
                  {pet?.sex ? ` · ${formatSex(pet.sex)}` : ""}
                  {pet?.color ? ` · ${pet.color}` : ""}
                </p>

                <div className="flex flex-wrap gap-4 mt-3 text-sm font-bold text-muted-foreground">
                  {pet?.date_of_birth && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {calcAge(pet.date_of_birth)} old · born{" "}
                      {format(new Date(pet.date_of_birth), "dd MMM yyyy")}
                    </span>
                  )}
                  {pet?.weight_kg && (
                    <span className="flex items-center gap-1.5">
                      <Weight className="w-3.5 h-3.5" />
                      {Number(pet.weight_kg).toFixed(1)} kg
                    </span>
                  )}
                </div>

                {pet?.owner && (
                  <p className="text-sm mt-2">
                    Owner:{" "}
                    <Link
                      to={`/owners/${pet.owner.id}`}
                      className="text-primary hover:underline"
                    >
                      {pet.owner.first_name} {pet.owner.last_name}
                    </Link>
                    {pet.owner.phone ? ` · ${pet.owner.phone}` : ""}
                  </p>
                )}
              </div>

              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allergies">
            Allergies{" "}
            {pet?.allergies?.length ? `(${pet.allergies.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="vaccinations">
            Vaccinations{" "}
            {pet?.vaccinations?.length ? `(${pet.vaccinations.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            Prescriptions{" "}
            {pet?.prescriptions?.length ? `(${pet.prescriptions.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Insurance ID</span>
                    <p className="mt-0.5 font-medium">
                      {pet?.insurance_id ?? "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="mt-0.5">{pet?.notes ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registered</span>
                    <p className="mt-0.5">
                      {pet?.created_at
                        ? format(new Date(pet.created_at), "dd MMM yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allergies */}
        <TabsContent value="allergies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">Known Allergies</CardTitle>
              {canWrite && (
                <Button size="sm" onClick={() => setAllergyOpen(true)}>
                  <Plus className="w-4 h-4" /> Add allergy
                </Button>
              )}
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {pet?.allergies?.length === 0 && (
                <p className="text-center text-muted-foreground py-10 text-sm">
                  No known allergies.
                </p>
              )}
              {pet?.allergies?.map((a) => (
                <div
                  key={a.id}
                  className="px-6 py-4 border-b last:border-0 flex items-start justify-between"
                >
                  <div>
                    <p className="font-medium">{a.allergen}</p>
                    {a.reaction && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Reaction: {a.reaction}
                      </p>
                    )}
                  </div>
                  {a.severity && (
                    <Badge
                      variant={
                        a.severity === "severe"
                          ? "destructive"
                          : a.severity === "moderate"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {a.severity}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vaccinations */}
        <TabsContent value="vaccinations">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Vaccination History</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {pet?.vaccinations?.length === 0 && (
                <p className="text-center text-muted-foreground py-10 text-sm">
                  No vaccinations recorded.
                </p>
              )}
              {pet?.vaccinations?.map((v) => (
                <div key={v.id} className="px-6 py-4 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{v.vaccine_name}</p>
                    <Badge variant="success">Given</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Administered:{" "}
                    {format(new Date(v.administered_at), "dd MMM yyyy")}
                    {v.next_due_at
                      ? ` · Due: ${format(new Date(v.next_due_at), "dd MMM yyyy")}`
                      : ""}
                  </p>
                  {v.manufacturer && (
                    <p className="text-xs text-muted-foreground">
                      Mfr: {v.manufacturer}{" "}
                      {v.lot_number ? `· Lot: ${v.lot_number}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Active Prescriptions</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {pet?.prescriptions?.length === 0 && (
                <p className="text-center text-muted-foreground py-10 text-sm">
                  No active prescriptions.
                </p>
              )}
              {pet?.prescriptions?.map((rx) => (
                <div key={rx.id} className="px-6 py-4 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{rx.drug_name}</p>
                    {rx.refills_remaining > 0 && (
                      <Badge variant="info">
                        {rx.refills_remaining} refill
                        {rx.refills_remaining !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rx.dosage} · {rx.frequency}
                    {rx.duration_days ? ` · ${rx.duration_days} days` : ""}
                  </p>
                  {rx.instructions && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rx.instructions}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add allergy dialog */}
      <Dialog
        open={allergyOpen}
        onOpenChange={(v) => {
          if (!v) setAllergyOpen(false);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Allergy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Allergen *</Label>
              <Input
                placeholder="e.g. Penicillin"
                value={allergen}
                onChange={(e) => setAllergen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reaction</Label>
              <Input
                placeholder="e.g. Hives, vomiting"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as typeof severity)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllergyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAllergy}
              disabled={!allergen.trim() || addAllergy.isPending}
            >
              {addAllergy.isPending ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pet && (
        <PetForm
          open={editOpen}
          onClose={() => setEditOpen(false)}
          ownerId={pet.owner_id}
          editPet={pet}
        />
      )}
    </div>
  );
}

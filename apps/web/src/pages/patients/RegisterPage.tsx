import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CreateOwnerSchema,
  CreatePetSchema,
  type CreateOwnerInput,
} from "@pawcare/shared";
import { useCreateOwner, useOwners } from "@/hooks/use-owners";
import { useCreatePet } from "@/hooks/use-pets";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Owner } from "@/types/patients";

const PetFieldsSchema = CreatePetSchema.omit({ owner_id: true });
type PetFieldsInput = z.infer<typeof PetFieldsSchema>;

const PET_FIELDS_DEFAULTS: PetFieldsInput = {
  name: "",
  species: "DOG",
  breed: "",
  date_of_birth: "",
  weight_kg: undefined,
  sex: undefined,
  color: "",
  insurance_id: "",
  notes: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [ownerMode, setOwnerMode] = useState<"new" | "existing">("new");

  // ── Existing-owner search ──────────────────────────────────────────────
  const [ownerSearch, setOwnerSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const debouncedSearch = useDebounce(ownerSearch, 300);

  const { data: ownersData } = useOwners({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    limit: 8,
  });
  const ownerResults = ownersData?.items ?? [];

  // ── New-owner form ─────────────────────────────────────────────────────
  const emergencyContactEditedRef = useRef(false);
  const ownerForm = useForm<CreateOwnerInput>({
    resolver: zodResolver(CreateOwnerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      emergency_contact: "",
      preferred_contact: "phone",
      portal_enabled: false,
    },
  });

  // ── Pet form (owner_id resolved separately at submit time) ─────────────
  const petForm = useForm<PetFieldsInput>({
    resolver: zodResolver(PetFieldsSchema),
    defaultValues: PET_FIELDS_DEFAULTS,
  });

  const createOwner = useCreateOwner();
  const createPet = useCreatePet();
  const isPending = createOwner.isPending || createPet.isPending;

  const canSubmit = ownerMode === "new" || !!selectedOwner;

  async function handleRegister() {
    const petValid = await petForm.trigger();

    if (ownerMode === "existing") {
      if (!selectedOwner || !petValid) return;
      const petValues = petForm.getValues();
      try {
        const pet = (await createPet.mutateAsync({
          ...petValues,
          owner_id: selectedOwner.id,
        })) as { id: string };
        goToNewAppointment(pet.id, petValues.name, petValues.species, selectedOwner);
      } catch {
        // error surfaced via toast in hook
      }
      return;
    }

    const ownerValid = await ownerForm.trigger();
    if (!ownerValid || !petValid) return;

    try {
      const owner = (await createOwner.mutateAsync(
        ownerForm.getValues(),
      )) as Owner;
      const petValues = petForm.getValues();
      try {
        const pet = (await createPet.mutateAsync({
          ...petValues,
          owner_id: owner.id,
        })) as { id: string };
        goToNewAppointment(pet.id, petValues.name, petValues.species, owner);
      } catch {
        // Owner was created but the pet failed — stay put so the user can
        // retry the pet half; the owner record on its own is still valid.
      }
    } catch {
      // error surfaced via toast in hook
    }
  }

  // Registration's whole point is to save time — send the user straight
  // into scheduling the visit instead of making them navigate there and
  // search for the patient they just created.
  function goToNewAppointment(
    petId: string,
    petName: string,
    species: string,
    owner: Owner,
  ) {
    navigate("/appointments", {
      state: {
        newAppointmentForPet: {
          id: petId,
          name: petName,
          species,
          owner: {
            first_name: owner.first_name,
            last_name: owner.last_name,
          },
        },
      },
    });
  }

  function handleOwnerSelect(owner: Owner) {
    setSelectedOwner(owner);
    setOwnerSearch("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Register Patient</h1>
        {/* <p className="text-sm text-muted-foreground mt-0.5">
          Register a new pet together with its owner in one step.
        </p> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Owner panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Owner</CardTitle>
            <CardDescription>
              Create a new client or pick an existing one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={ownerMode}
              onValueChange={(v) => setOwnerMode(v as "new" | "existing")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">New owner</TabsTrigger>
                <TabsTrigger value="existing">Existing owner</TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="pt-4">
                <Form {...ownerForm}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={ownerForm.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ownerForm.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last name</FormLabel>
                            <FormControl>
                              <Input placeholder="Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={ownerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="jane@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ownerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Phone <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="077 123 4567"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  if (!emergencyContactEditedRef.current) {
                                    ownerForm.setValue(
                                      "emergency_contact",
                                      e.target.value,
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={ownerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="123 Main St, Springfield"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={ownerForm.control}
                        name="emergency_contact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency contact</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Name / phone"
                                {...field}
                                onChange={(e) => {
                                  emergencyContactEditedRef.current = true;
                                  field.onChange(e);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ownerForm.control}
                        name="preferred_contact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred contact</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
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
                  </div>
                </Form>
              </TabsContent>

              <TabsContent value="existing" className="pt-4">
                {selectedOwner ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
                      <div className="font-medium">
                        {selectedOwner.first_name} {selectedOwner.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedOwner.phone}
                        {selectedOwner.email ? ` · ${selectedOwner.email}` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOwner(null)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search by name, email, or phone…"
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                    />
                    {ownerSearch.length > 1 && ownerResults.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                        {ownerResults.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 first:rounded-t-md last:rounded-b-md"
                            onClick={() => handleOwnerSelect(o)}
                          >
                            <span className="font-medium">
                              {o.first_name} {o.last_name}
                            </span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {o.phone}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {ownerSearch.length > 1 && ownerResults.length === 0 && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                        No clients found
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pet panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pet</CardTitle>
            <CardDescription>The patient's profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...petForm}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={petForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Buddy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={petForm.control}
                    name="species"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Species <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(
                              [
                                "DOG",
                                "CAT",
                                "BIRD",
                                "RABBIT",
                                "REPTILE",
                                "SMALL_MAMMAL",
                                "OTHER",
                              ] as const
                            ).map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.replace("_", " ")}
                              </SelectItem>
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
                    control={petForm.control}
                    name="breed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Breed</FormLabel>
                        <FormControl>
                          <Input placeholder="Labrador Retriever" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={petForm.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={(v) => field.onChange(v || undefined)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Unknown" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M">Male (intact)</SelectItem>
                            <SelectItem value="F">Female (intact)</SelectItem>
                            <SelectItem value="M_NEUTERED">
                              Male (neutered)
                            </SelectItem>
                            <SelectItem value="F_SPAYED">
                              Female (spayed)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={petForm.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={petForm.control}
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
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={petForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color / markings</FormLabel>
                      <FormControl>
                        <Input placeholder="Golden brown" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={petForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any relevant notes…"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3">
        {ownerMode === "existing" && !selectedOwner && (
          <p className="text-sm text-muted-foreground mr-auto">
            Select an owner above to continue.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/patients")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleRegister}
          disabled={isPending || !canSubmit}
        >
          {isPending ? "Registering…" : "Register patient"}
        </Button>
      </div>
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { Search, History } from "lucide-react";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { usePets } from "../../hooks/use-pets";
import { useDebounce } from "../../hooks/use-debounce";
import { speciesIcon } from "../../lib/patient-utils";
import type { Pet } from "../../types/patients";

const SPECIES_LABEL: Record<string, string> = {
  DOG: "Dog",
  CAT: "Cat",
  BIRD: "Bird",
  RABBIT: "Rabbit",
  REPTILE: "Reptile",
  SMALL_MAMMAL: "Small Mammal",
  OTHER: "Other",
};

interface PatientSearchProps {
  onSelect: (pet: Pet) => void;
  placeholder?: string;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
}

export function PatientSearch({
  onSelect,
  placeholder = "Search for a patient by name…",
  emptyIcon = <History className="h-10 w-10 mb-3 opacity-30" />,
  emptyTitle = "Search for a patient to view their full visit history",
  emptyHint = "All records for that patient will be shown in one place, newest first.",
}: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const { data, isLoading } = usePets(
    debouncedQuery ? { search: debouncedQuery, limit: 15 } : undefined,
  );
  const results = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {!debouncedQuery && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          {emptyIcon}
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-xs mt-1">{emptyHint}</p>
        </div>
      )}

      {debouncedQuery && isLoading && (
        <div className="space-y-2 max-w-md">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      )}

      {debouncedQuery && !isLoading && results.length === 0 && (
        <p className="text-sm text-muted-foreground py-6">
          No patients found for "{debouncedQuery}".
        </p>
      )}

      {debouncedQuery && !isLoading && results.length > 0 && (
        <Card className="max-w-md">
          <CardContent className="p-0">
            {results.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => onSelect(pet)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-accent text-base">
                    {speciesIcon(pet.species)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{pet.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {SPECIES_LABEL[pet.species] ?? pet.species}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                    {pet.owner
                      ? ` · ${pet.owner.first_name} ${pet.owner.last_name}`
                      : ""}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

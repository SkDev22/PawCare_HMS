import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdatePet } from "@/hooks/use-pets";
import type { Pet, PetStatus } from "@/types/patients";

const STATUS_OPTIONS: { label: string; value: PetStatus }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Transferred", value: "TRANSFERRED" },
  { label: "Deceased", value: "DECEASED" },
];

interface ChangeStatusDialogProps {
  pet: Pet | null;
  onClose: () => void;
}

export function ChangeStatusDialog({ pet, onClose }: ChangeStatusDialogProps) {
  const [status, setStatus] = useState<PetStatus | "">("");
  const updatePet = useUpdatePet(pet?.id ?? "");

  useEffect(() => {
    if (pet) setStatus(pet.status);
  }, [pet]);

  const handleSave = async () => {
    if (!pet || !status || status === pet.status) {
      onClose();
      return;
    }
    await updatePet.mutateAsync({ status });
    onClose();
  };

  return (
    <Dialog
      open={!!pet}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Status — {pet?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PetStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status === "DECEASED" && pet?.status !== "DECEASED" && (
            <p className="text-sm text-muted-foreground">
              This won't affect existing medical records, invoices, or
              history. If this pet has upcoming appointments, remember to
              cancel them separately.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!status || updatePet.isPending}
          >
            {updatePet.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

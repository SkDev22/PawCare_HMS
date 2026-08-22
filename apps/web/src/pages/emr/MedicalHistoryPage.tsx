import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  PawPrint,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Pill,
  Activity,
  FlaskConical,
  Paperclip,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Skeleton } from "../../components/ui/skeleton";
import { usePetHistory } from "../../hooks/use-pets";
import { speciesIcon } from "../../lib/patient-utils";
import { PatientSearch } from "../../components/patients/PatientSearch";
import type { Pet } from "../../types/patients";
import type { PetHistoryRecord } from "../../types/emr";

const SPECIES_LABEL: Record<string, string> = {
  DOG: "Dog",
  CAT: "Cat",
  BIRD: "Bird",
  RABBIT: "Rabbit",
  REPTILE: "Reptile",
  SMALL_MAMMAL: "Small Mammal",
  OTHER: "Other",
};

// ── Per-visit history card ───────────────────────────────────────────────────────

function HistoryRecordCard({
  record,
  expanded,
  onToggle,
}: {
  record: PetHistoryRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const primaryDx = record.diagnoses.find((d) => d.is_primary);
  const otherDx = record.diagnoses.filter((d) => !d.is_primary);
  const v = record.vitals;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 p-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {format(new Date(record.visit_date), "MMM d, yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              Dr. {record.vet.first_name} {record.vet.last_name}
            </span>
            {primaryDx && (
              <Badge variant="default" className="text-xs">
                {primaryDx.name}
              </Badge>
            )}
            {otherDx.slice(0, 2).map((dx) => (
              <Badge key={dx.id} variant="secondary" className="text-xs">
                {dx.name}
              </Badge>
            ))}
            {otherDx.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{otherDx.length - 2}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {record.chief_complaint ?? "No chief complaint recorded"}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <>
          <Separator />
          <CardContent className="pt-4 space-y-5">
            {/* SOAP note */}
            {record.soap_note && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  SOAP Note
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {record.soap_note.note || "—"}
                </p>
              </div>
            )}

            {/* Vitals */}
            {v && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Vitals
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Weight
                    </span>
                    {v.weight_kg ? `${v.weight_kg} kg` : "—"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Temp
                    </span>
                    {v.temperature_c ? `${v.temperature_c} °C` : "—"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Heart Rate
                    </span>
                    {v.heart_rate_bpm ? `${v.heart_rate_bpm} bpm` : "—"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Resp. Rate
                    </span>
                    {v.respiratory_rate ? `${v.respiratory_rate}/min` : "—"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Blood Pressure
                    </span>
                    {v.blood_pressure ?? "—"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      BCS
                    </span>
                    {v.body_condition_score
                      ? `${v.body_condition_score}/9`
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Diagnoses */}
            {record.diagnoses.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Diagnoses
                </p>
                <div className="space-y-1.5">
                  {record.diagnoses.map((dx) => (
                    <div
                      key={dx.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="font-medium">{dx.name}</span>
                      {dx.is_primary && (
                        <Badge variant="default" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      {dx.code && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {dx.code}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prescriptions */}
            {record.prescriptions.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5" />
                  Prescriptions
                </p>
                <div className="space-y-1.5">
                  {record.prescriptions.map((rx) => (
                    <div key={rx.id} className="text-sm">
                      <span className="font-medium">{rx.drug_name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {rx.dosage} · {rx.frequency}
                        {rx.duration_days ? ` · ${rx.duration_days}d` : ""}
                        {!rx.is_active ? " · inactive" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lab results */}
            {record.lab_results.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Lab Results
                </p>
                <div className="space-y-1.5">
                  {record.lab_results.map((lr) => (
                    <div
                      key={lr.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="font-medium">{lr.test_name}</span>
                      <span className="text-muted-foreground">
                        {lr.value}
                        {lr.unit ? ` ${lr.unit}` : ""}
                      </span>
                      {lr.is_abnormal && (
                        <Badge
                          variant="destructive"
                          className="text-xs flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Abnormal
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {record.attachments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {record.attachments.map((a) => (
                    <Badge key={a.id} variant="outline" className="text-xs">
                      {a.file_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {!record.soap_note &&
              !v &&
              record.diagnoses.length === 0 &&
              record.prescriptions.length === 0 &&
              record.lab_results.length === 0 &&
              record.attachments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No further details recorded for this visit.
                </p>
              )}

            <div className="flex justify-end">
              <Link
                to={`/emr/${record.id}`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Open full record
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function MedicalHistoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Arriving from a patient's own profile page with that pet already known —
  // skip the search step and go straight to their history.
  useEffect(() => {
    const state = location.state as { presetPet?: Pet } | null;
    if (state?.presetPet) {
      setSelectedPet(state.presetPet);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = usePetHistory(selectedPet?.id);
  const records = data?.records ?? [];

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changePatient = () => {
    setSelectedPet(null);
    setExpandedIds(new Set());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Medical History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Search a patient to see every visit in one place, newest first.
        </p>
      </div>

      {!selectedPet ? (
        <PatientSearch onSelect={setSelectedPet} />
      ) : (
        <div className="space-y-4">
          {/* Selected patient header */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-accent text-xl">
                  {speciesIcon(selectedPet.species)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/patients/${selectedPet.id}`}
                  className="font-semibold hover:underline"
                >
                  {selectedPet.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {SPECIES_LABEL[selectedPet.species] ?? selectedPet.species}
                  {selectedPet.breed ? ` · ${selectedPet.breed}` : ""}
                  {selectedPet.owner
                    ? ` · Owner: ${selectedPet.owner.first_name} ${selectedPet.owner.last_name}`
                    : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={changePatient}>
                Change patient
              </Button>
            </CardContent>
          </Card>

          {/* History timeline */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <PawPrint className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                No medical records yet for {selectedPet.name}.
              </p>
            </div>
          )}

          {!isLoading && records.length > 0 && (
            <div className="space-y-3">
              {records.map((record) => (
                <HistoryRecordCard
                  key={record.id}
                  record={record}
                  expanded={expandedIds.has(record.id)}
                  onToggle={() => toggleExpand(record.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

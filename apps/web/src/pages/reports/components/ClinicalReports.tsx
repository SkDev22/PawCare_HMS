import { useState } from "react";
import { format } from "date-fns";
import { Stethoscope } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { PatientSearch } from "../../../components/patients/PatientSearch";
import { usePetHistory } from "../../../hooks/use-pets";
import {
  useMedicalRecordsSummaryReport,
  useVaccinationsDueReport,
  useDoctorPerformanceReport,
} from "../../../hooks/use-reports";
import { formatCurrency } from "../../../lib/currency";
import { StatCard, EmptyState } from "./ReportPrimitives";
import type { Pet } from "../../../types/patients";

// ── Patient Visit History ────────────────────────────────────────────────────

export function PatientVisitHistoryReport() {
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const { data, isLoading } = usePetHistory(selectedPet?.id);
  const records = data?.records ?? [];

  if (!selectedPet) {
    return (
      <div className="print:hidden">
        <PatientSearch
          onSelect={setSelectedPet}
          placeholder="Search for a patient…"
          emptyIcon={<Stethoscope className="h-10 w-10 mb-3 opacity-30" />}
          emptyTitle="Search for a patient to generate their visit history report"
          emptyHint="Every recorded visit will be listed below, newest first."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium">{selectedPet.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedPet.species}
              {selectedPet.owner
                ? ` · Owner: ${selectedPet.owner.first_name} ${selectedPet.owner.last_name}`
                : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedPet(null)}>
            Change patient
          </Button>
        </CardContent>
      </Card>

      <div className="hidden print:block">
        <p className="font-semibold">
          {selectedPet.name} — {selectedPet.species}
        </p>
        {selectedPet.owner && (
          <p className="text-sm text-muted-foreground">
            Owner: {selectedPet.owner.first_name} {selectedPet.owner.last_name}
          </p>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : records.length === 0 ? (
        <EmptyState message="No visit records for this patient." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Chief Complaint</TableHead>
                <TableHead>Diagnoses</TableHead>
                <TableHead>Veterinarian</TableHead>
                <TableHead className="text-right">Rx / Labs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(new Date(r.visit_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-60 truncate">
                    {r.chief_complaint ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.diagnoses.length === 0
                      ? "—"
                      : r.diagnoses.map((d) => d.name).join(", ")}
                  </TableCell>
                  <TableCell className="text-sm">
                    Dr. {r.vet.first_name} {r.vet.last_name}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {r.prescriptions.length > 0 && (
                      <span className="mr-2">{r.prescriptions.length} Rx</span>
                    )}
                    {r.lab_results.length > 0 && <span>{r.lab_results.length} lab</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Medical Records Summary ─────────────────────────────────────────────────────

export function MedicalRecordsSummaryReportView({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const { data, isLoading } = useMedicalRecordsSummaryReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Records" value={data.totalRecords} />
        <StatCard label="Primary Diagnoses" value={data.primaryDiagnosisCount} />
        <StatCard label="Prescriptions" value={data.totalPrescriptions} />
        <StatCard label="Lab Results" value={data.totalLabResults} />
      </div>

      {data.diagnoses.length === 0 ? (
        <EmptyState message="No diagnoses recorded in this period." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diagnosis</TableHead>
                <TableHead className="text-right">Occurrences</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.diagnoses.map((d) => (
                <TableRow key={d.name}>
                  <TableCell className="text-sm">{d.name}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{d.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Vaccination Due/Compliance ──────────────────────────────────────────────────

export function VaccinationComplianceReportView({ days }: { days: number }) {
  const { data, isLoading } = useVaccinationsDueReport(days);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Due / Overdue" value={data.items.length} />
        <StatCard
          label="Overdue"
          value={data.overdueCount}
          tone={data.overdueCount > 0 ? "destructive" : "default"}
        />
      </div>
      {data.items.length === 0 ? (
        <EmptyState message="No pets due for vaccination in this window." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Vaccine</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm font-medium">{v.pet.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.pet.owner.first_name} {v.pet.owner.last_name}
                  </TableCell>
                  <TableCell className="text-sm">{v.vaccine_name}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(v.next_due_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.pet.owner.phone}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={v.isOverdue ? "destructive" : "warning"} className="text-xs">
                      {v.isOverdue ? "Overdue" : "Due Soon"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ── Doctor Performance ───────────────────────────────────────────────────────────

export function DoctorPerformanceReportView({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const { data, isLoading } = useDoctorPerformanceReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.doctors.length === 0 ? (
        <EmptyState message="No veterinarians found." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Veterinarian</TableHead>
                <TableHead className="text-right">Appointments Completed</TableHead>
                <TableHead className="text-right">Medical Records</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.doctors.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm font-medium">Dr. {d.name}</TableCell>
                  <TableCell className="text-right text-sm">{d.appointmentsCompleted}</TableCell>
                  <TableCell className="text-right text-sm">{d.medicalRecords}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(d.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

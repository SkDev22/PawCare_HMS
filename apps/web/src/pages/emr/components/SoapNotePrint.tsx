import { format } from "date-fns";
import type { MedicalRecord } from "../../../types/emr";
import { useAuthStore } from "../../../stores/auth.store";
import { useClinic } from "../../../hooks/use-clinic";

interface Props {
  record: MedicalRecord;
}

const SPECIES_LABEL: Record<string, string> = {
  DOG: "Dog",
  CAT: "Cat",
  BIRD: "Bird",
  RABBIT: "Rabbit",
  REPTILE: "Reptile",
  SMALL_MAMMAL: "Small Mammal",
  OTHER: "Other",
};

function SoapSection({
  label,
  content,
}: {
  label: string;
  content: string | null | undefined;
}) {
  return (
    <div className="mb-3 break-inside-avoid">
      <p className="mb-1 border-b border-slate-300 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {content?.trim() ? (
        <p className="whitespace-pre-wrap text-xs leading-snug text-slate-800">
          {content}
        </p>
      ) : (
        <p className="text-xs text-slate-400">Not recorded.</p>
      )}
    </div>
  );
}

function VitalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 px-2 py-1 text-center">
      <p className="text-[8px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

// Print-only SOAP note layout, rendered alongside (and hidden behind) the
// interactive record page. Kept deliberately minimal — grayscale only, no
// color blocks — so it reads cleanly on paper.
export function SoapNotePrint({ record }: Props) {
  const clinicName = useAuthStore((s) => s.user?.clinic_name);
  const { data: clinic } = useClinic();

  const { pet, soap_note, vitals, diagnoses } = record;
  const activeRx = record.prescriptions.filter((rx) => rx.is_active);

  return (
    <div className="hidden print:flex print:min-h-screen print:flex-col bg-white p-8 text-slate-900">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between border-b-2 border-slate-900 pb-2.5">
        <div>
          <h2 className="text-lg font-bold">{clinicName ?? "PawCare HMS"}</h2>
          {clinic?.address && (
            <p className="text-[10px] text-slate-500">{clinic.address}</p>
          )}
          {(clinic?.phone || clinic?.email) && (
            <p className="text-[10px] text-slate-500">
              {[clinic?.phone, clinic?.email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <h1 className="text-lg font-extrabold uppercase tracking-wide">
            Clinical Record
          </h1>
          <p className="mt-0.5 text-[10px] font-semibold uppercase text-slate-400">
            patient evaluations and treatment steps
          </p>
        </div>
      </div>

      {/* General information */}
      <div className="mb-3 grid grid-cols-2 gap-x-10 text-xs">
        <InfoRow label="Patient Name" value={pet.name} />
        <InfoRow
          label="Visit Date"
          value={format(new Date(record.visit_date), "MM-dd-yyyy")}
        />
        <InfoRow
          label="Client Name"
          value={`${pet.owner.first_name} ${pet.owner.last_name}`}
        />
        <InfoRow
          label="Species / Breed"
          value={`${SPECIES_LABEL[pet.species] ?? pet.species}${pet.breed ? ` · ${pet.breed}` : ""}`}
        />
        <InfoRow
          label="Veterinarian"
          value={`Dr. ${record.vet.first_name} ${record.vet.last_name}`}
        />
        <InfoRow
          label="Current Medication"
          value={
            activeRx.length
              ? activeRx.map((rx) => rx.drug_name).join(", ")
              : "None"
          }
        />
      </div>

      {/* Chief complaint */}
      {record.chief_complaint && (
        <div className="mb-3 break-inside-avoid">
          <p className="mb-1 border-b border-slate-300 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Chief Complaint
          </p>
          <p className="text-xs text-slate-800">{record.chief_complaint}</p>
        </div>
      )}

      {/* Vitals */}
      {vitals && (
        <div className="mb-3 break-inside-avoid">
          <p className="mb-1 border-b border-slate-300 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Vitals
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {vitals.weight_kg && (
              <VitalStat label="Weight" value={`${vitals.weight_kg} kg`} />
            )}
            {vitals.temperature_c && (
              <VitalStat label="Temp" value={`${vitals.temperature_c} °C`} />
            )}
            {vitals.heart_rate_bpm && (
              <VitalStat label="HR" value={`${vitals.heart_rate_bpm} bpm`} />
            )}
            {vitals.respiratory_rate && (
              <VitalStat label="RR" value={`${vitals.respiratory_rate}/min`} />
            )}
            {vitals.blood_pressure && (
              <VitalStat label="BP" value={vitals.blood_pressure} />
            )}
            {vitals.body_condition_score && (
              <VitalStat
                label="BCS"
                value={`${vitals.body_condition_score}/9`}
              />
            )}
          </div>
        </div>
      )}

      {/* SOAP note */}
      <SoapSection label="SOAP Note" content={soap_note?.note} />

      {/* Diagnoses */}
      {diagnoses.length > 0 && (
        <div className="mb-3 break-inside-avoid">
          <p className="mb-1 border-b border-slate-300 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Diagnoses
          </p>
          <ul className="space-y-0.5 text-xs text-slate-800">
            {diagnoses.map((dx) => (
              <li key={dx.id} className="flex items-center gap-2">
                <span>{dx.name}</span>
                {dx.is_primary && (
                  <span className="rounded-full border border-slate-400 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-slate-600">
                    Primary
                  </span>
                )}
                {dx.code && (
                  <span className="font-mono text-[10px] text-slate-400">
                    {dx.code}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prescriptions */}
      {activeRx.length > 0 && (
        <div className="mb-4 break-inside-avoid">
          <p className="mb-1 border-b border-slate-300 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Prescriptions
          </p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left">
                <th className="py-1 pr-2 font-semibold">Drug</th>
                <th className="py-1 pr-2 font-semibold">Dosage</th>
                <th className="py-1 pr-2 font-semibold">Frequency</th>
                <th className="py-1 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {activeRx.map((rx) => (
                <tr key={rx.id} className="border-b border-slate-200">
                  <td className="py-1 pr-2">{rx.drug_name}</td>
                  <td className="py-1 pr-2">{rx.dosage}</td>
                  <td className="py-1 pr-2">{rx.frequency}</td>
                  <td className="py-1">
                    {rx.duration_days ? `${rx.duration_days} days` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signatures */}
      <div className="mt-auto flex justify-between gap-10 border-t border-slate-200 pt-3 pb-10">
        <div className="w-56">
          <div className="border-b border-slate-400 pb-5" />
          <p className="mt-1 text-[10px] text-slate-500">
            Veterinarian Signature
          </p>
        </div>
        <div className="w-56">
          <div className="border-b border-slate-400 pb-5" />
          <p className="mt-1 text-[10px] text-slate-500">Date</p>
        </div>
      </div>
    </div>
  );
}

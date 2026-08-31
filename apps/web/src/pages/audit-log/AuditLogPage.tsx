import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ScrollText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { useAuditLog } from "../../hooks/use-audit-log";
import type { AuditEntityType, AuditLogEntry } from "../../types/audit-log";

const PAGE_SIZE = 25;

const CATEGORY_TABS: Array<{ label: string; value: "ALL" | AuditEntityType }> = [
  { label: "All",     value: "ALL" },
  { label: "Billing", value: "Payment" },
  { label: "Staff",   value: "StaffUser" },
];

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  MedicalRecord: "Medical record",
  SoapNote: "SOAP note",
  Vitals: "Vitals",
  Diagnosis: "Diagnosis",
  Prescription: "Prescription",
  MedicalRecordCharge: "Charge",
  Payment: "Payment",
  StaffUser: "Staff member",
};

const ACTION_VERBS: Record<AuditLogEntry["action"], string> = {
  CREATE: "added",
  UPDATE: "updated",
  DELETE: "removed",
};

// Internal bookkeeping fields aren't useful in a before/after diff.
const DIFF_SKIP_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "medical_record_id",
  "pet_id",
  "vet_id",
  "prescribed_by",
  "created_by",
  "invoice_id",
  "invoice_line_item_id",
]);

function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { field: string; from: unknown; to: unknown }[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  for (const key of keys) {
    if (DIFF_SKIP_KEYS.has(key)) continue;
    const from = before[key];
    const to = after[key];
    // Every real column on these entities is a primitive (string/number/
    // boolean/date-string/null) — an object or array here means a relation
    // slipped into the audit snapshot (a backend bug, not a real field
    // change), so it's never useful to show and would otherwise dump raw
    // JSON into the log. Skip rather than render it.
    if (isPlainObjectOrArray(from) || isPlainObjectOrArray(to)) continue;
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field: key, from, to });
    }
  }
  return changes;
}

function isPlainObjectOrArray(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function EntrySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-md" />
      ))}
    </div>
  );
}

export function AuditLogPage() {
  const [category, setCategory] = useState<"ALL" | AuditEntityType>("ALL");

  // Cursor-based pagination: cursorHistory[i] is the cursor that fetches page
  // i+2 (page 1 has no cursor). pageIndex is 0-based.
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setCursorHistory([]);
  }, [category]);

  const currentCursor = pageIndex === 0 ? undefined : cursorHistory[pageIndex - 1];

  const { data, isLoading, isFetching } = useAuditLog({
    ...(category !== "ALL" ? { entity_type: category } : {}),
    ...(currentCursor ? { cursor: currentCursor } : {}),
    limit: PAGE_SIZE,
  });

  const entries = data?.items ?? [];

  const goToNextPage = () => {
    if (!data?.hasMore || !data.nextCursor) return;
    setCursorHistory((prev) => {
      const next = [...prev];
      next[pageIndex] = data.nextCursor as string;
      return next;
    });
    setPageIndex((p) => p + 1);
  };

  const goToPreviousPage = () => setPageIndex((p) => Math.max(0, p - 1));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every sensitive change made across medical records, billing, and staff accounts.
        </p>
      </div>

      <Tabs value={category} onValueChange={(v) => setCategory(v as "ALL" | AuditEntityType)}>
        <TabsList>
          {CATEGORY_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {isLoading ? "Loading..." : `${entries.length} entr${entries.length !== 1 ? "ies" : "y"} on this page`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <EntrySkeleton />
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ScrollText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No audit entries found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sensitive changes will show up here as they happen.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const staffName = entry.performed_by_staff
                  ? `${entry.performed_by_staff.first_name} ${entry.performed_by_staff.last_name}`
                  : "Unknown staff";
                const changes =
                  entry.action === "UPDATE" ? diffFields(entry.before, entry.after) : [];

                return (
                  <div key={entry.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm">
                        <span className="font-medium">• {ENTITY_LABELS[entry.entity_type]}</span>{" "}
                        {ACTION_VERBS[entry.action]} by {staffName}
                        {entry.medical_record_id && (
                          <Link
                            to={`/emr/${entry.medical_record_id}`}
                            className="ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View record <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(entry.created_at), "PPp")}
                      </span>
                    </div>

                    {changes.length > 0 && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {changes.map((c) => (
                          <p key={c.field} className="text-xs text-muted-foreground">
                            <span className="font-mono">{c.field}</span>:{" "}
                            {formatDiffValue(c.from)} → {formatDiffValue(c.to)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {(pageIndex > 0 || data?.hasMore) && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={goToPreviousPage}
                aria-disabled={pageIndex === 0}
                className={pageIndex === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{pageIndex + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={goToNextPage}
                aria-disabled={!data?.hasMore || isFetching}
                className={
                  !data?.hasMore || isFetching ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

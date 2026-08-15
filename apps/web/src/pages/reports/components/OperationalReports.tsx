import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  useAppointmentsReport,
  useDemographicsReport,
  useServiceSalesReport,
} from "../../../hooks/use-reports";
import { formatCurrency } from "../../../lib/currency";
import { StatCard, EmptyState } from "./ReportPrimitives";

function label(s: string) {
  return s.replace(/_/g, " ").toLowerCase();
}

// ── Appointment Statistics ───────────────────────────────────────────────────────

export function AppointmentStatsReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useAppointmentsReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const statusRows = Object.entries(data.byStatus).sort((a, b) => b[1] - a[1]);
  const typeRows = Object.entries(data.byType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total" value={data.total} />
        <StatCard label="Completed" value={data.byStatus["COMPLETED"] ?? 0} tone="success" />
        <StatCard label="No-Show Rate" value={`${data.noShowRate.toFixed(1)}%`} tone="warning" />
        <StatCard
          label="Cancellation Rate"
          value={`${data.cancellationRate.toFixed(1)}%`}
          tone="destructive"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Type</CardTitle>
          </CardHeader>
          {typeRows.length === 0 ? (
            <CardContent>
              <EmptyState message="No appointments in this period." />
            </CardContent>
          ) : (
            <Table>
              <TableBody>
                {typeRows.map(([type, count]) => (
                  <TableRow key={type}>
                    <TableCell className="text-sm capitalize">{label(type)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Status</CardTitle>
          </CardHeader>
          {statusRows.length === 0 ? (
            <CardContent>
              <EmptyState message="No appointments in this period." />
            </CardContent>
          ) : (
            <Table>
              <TableBody>
                {statusRows.map(([status, count]) => (
                  <TableRow key={status}>
                    <TableCell className="text-sm capitalize">{label(status)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Patient / Owner Demographics ─────────────────────────────────────────────────

export function DemographicsReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useDemographicsReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Owners" value={data.totalOwners} />
        <StatCard label="New Owners" value={data.newOwners} tone="success" />
        <StatCard label="Total Pets" value={data.totalPets} />
        <StatCard label="New Pets" value={data.newPets} tone="success" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Patients Seen" value={data.uniquePatientsSeen} />
        <StatCard label="New Patients Seen" value={data.newPatientsSeen} tone="success" />
        <StatCard label="Returning Patients" value={data.returningPatientsSeen} />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Species Mix</CardTitle>
        </CardHeader>
        {data.species.length === 0 ? (
          <CardContent>
            <EmptyState message="No patients registered." />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Species</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.species.map((s) => (
                <TableRow key={s.species}>
                  <TableCell className="text-sm capitalize">{label(s.species)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{s.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <StatCard
        label="Client Portal Adoption"
        value={`${data.portalEnabledCount} of ${data.totalOwners} owners`}
      />
    </div>
  );
}

// ── Service Utilization ─────────────────────────────────────────────────────────

export function ServiceUtilizationReportView({ start, end }: { start: string; end: string }) {
  const { data, isLoading } = useServiceSalesReport(start, end);
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const byUsage = [...data.items].sort((a, b) => b.quantity - a.quantity);

  return (
    <div className="space-y-4">
      <StatCard label="Distinct Services/Items Used" value={data.items.length} />
      {byUsage.length === 0 ? (
        <EmptyState message="No service or item usage in this period." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Times Used</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byUsage.map((i) => (
                <TableRow key={i.key}>
                  <TableCell className="text-sm font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">{i.type}</TableCell>
                  <TableCell className="text-right text-sm">{i.quantity}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(i.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

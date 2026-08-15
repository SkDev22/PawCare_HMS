import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
import { REPORT_CATEGORIES, REPORTS } from "./report-registry";

export function ReportsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Financial, clinical, and operational reports for the clinic.
        </p>
      </div>

      {REPORT_CATEGORIES.map((category) => {
        const reports = REPORTS.filter((r) => r.category === category);
        if (reports.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((r) => (
                <Card
                  key={r.key}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                  onClick={() => navigate(`/reports/${r.key}`)}
                >
                  <CardContent className="p-5 flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <r.icon className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

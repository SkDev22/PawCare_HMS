import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicHours, useUpdateClinicHours, type ClinicHoursEntry } from "@/hooks/use-clinic";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DayRow = {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
};

function buildRows(hours: ClinicHoursEntry[]): DayRow[] {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const existing = hours.find((h) => h.day_of_week === day);
    return {
      day_of_week: day,
      is_closed: existing?.is_closed ?? false,
      open_time: existing?.open_time ?? "09:00",
      close_time: existing?.close_time ?? "17:00",
    };
  });
}

function getServerErrorMessage(err: unknown): string {
  if (
    err !== null &&
    typeof err === "object" &&
    "response" in err &&
    err.response !== null &&
    typeof err.response === "object" &&
    "data" in err.response
  ) {
    const data = err.response.data as { error?: { message?: string } };
    return data?.error?.message ?? "Failed to update business hours. Please try again.";
  }
  return "Unable to connect to the server. Check your network.";
}

export function BusinessHoursForm() {
  const { data, isLoading } = useClinicHours();
  const updateHours = useUpdateClinicHours();
  const [rows, setRows] = useState<DayRow[]>([]);

  useEffect(() => {
    if (data) setRows(buildRows(data));
  }, [data]);

  function toggleDay(idx: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, is_closed: !r.is_closed } : r)));
  }

  function setTime(idx: number, field: "open_time" | "close_time", value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function handleSave() {
    try {
      await updateHours.mutateAsync({ entries: rows });
      toast.success("Business hours updated");
    } catch (err) {
      toast.error(getServerErrorMessage(err));
    }
  }

  const dirty = data ? JSON.stringify(rows) !== JSON.stringify(buildRows(data)) : false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <CardTitle className="text-base">Business Hours</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set when the clinic is open. Used for booking windows and quiet-hour
              notifications.
            </p>
          </div>
        </div>
        <Button size="sm" disabled={!dirty || updateHours.isPending} onClick={handleSave}>
          {updateHours.isPending ? "Saving…" : "Save hours"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={row.day_of_week} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`w-10 h-6 rounded-full transition-colors shrink-0 ${
                    !row.is_closed ? "bg-primary" : "bg-muted border border-input"
                  }`}
                  aria-label={`Toggle ${DAY_NAMES[row.day_of_week]}`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-auto ${
                      !row.is_closed ? "translate-x-2" : "-translate-x-2"
                    }`}
                  />
                </button>

                <span
                  className={`w-10 text-sm font-medium shrink-0 ${
                    !row.is_closed ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {DAY_SHORT[row.day_of_week]}
                </span>

                {!row.is_closed ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={row.open_time}
                      onChange={(e) => setTime(idx, "open_time", e.target.value)}
                      className="w-32 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      value={row.close_time}
                      onChange={(e) => setTime(idx, "close_time", e.target.value)}
                      className="w-32 text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Closed</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

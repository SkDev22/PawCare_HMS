import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

async function downloadCsv(url: string, filename: string) {
  try {
    const res = await api.get(url, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    toast.error("Failed to export. Please try again.");
  }
}

export function DataExportCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <Download className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <CardTitle className="text-base">Data Export</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Download your clinic's records as CSV files, ready to open in Excel or Google
            Sheets.
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => downloadCsv("/reports/export/patients", "patients.csv")}
        >
          Export Patients
        </Button>
        <Button
          variant="outline"
          onClick={() => downloadCsv("/reports/export/invoices", "invoices.csv")}
        >
          Export Invoices
        </Button>
      </CardContent>
    </Card>
  );
}

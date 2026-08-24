import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, FileText, Package } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { useGrn } from "../../../hooks/use-grn";
import { formatCurrency } from "../../../lib/currency";

export function GrnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: grn, isLoading } = useGrn(id);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Goods received note not found.</p>
        <Button variant="link" onClick={() => navigate("/inventory/grn")}>
          Back to Goods Received
        </Button>
      </div>
    );
  }

  const totalCost = grn.items.reduce(
    (sum, i) => sum + Number(i.unit_cost) * i.quantity,
    0,
  );

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory/grn")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {grn.grn_number}
          </h1>
          <p className="text-sm text-muted-foreground">
            Received {format(new Date(grn.received_at), "MMM d, yyyy")} by{" "}
            {grn.received_by_staff.first_name} {grn.received_by_staff.last_name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Supplier</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Supplier</p>
            <p>{grn.supplier_name}</p>
            {(grn.supplier?.phone || grn.supplier?.email) && (
              <p className="text-xs text-muted-foreground">
                {[grn.supplier.phone, grn.supplier.email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoice #</p>
            <p>{grn.supplier_invoice_no ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Notes</p>
            <p>{grn.notes ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Line Items ({grn.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-medium text-muted-foreground px-4 py-2">
                    Item
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">
                    Batch #
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">
                    Qty
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">
                    Unit Cost
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">
                    Sell Price
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">
                    Discount
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">
                    Expiry
                  </th>
                </tr>
              </thead>
              <tbody>
                {grn.items.map((line) => (
                  <tr key={line.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 hover:underline"
                        onClick={() => navigate(`/inventory/${line.item.id}`)}
                      >
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {line.item.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {line.batch_no ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {line.quantity} {line.item.unit}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(line.unit_cost)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(line.selling_price)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {Number(line.discount_percent) > 0
                        ? `${line.discount_percent}%`
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {line.expiry_date
                        ? format(new Date(line.expiry_date), "MMM d, yyyy")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-right">
        Total cost:{" "}
        <span className="font-medium text-foreground">
          {formatCurrency(totalCost)}
        </span>
      </p>
    </div>
  );
}

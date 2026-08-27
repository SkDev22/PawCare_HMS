import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Package,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useInventoryAlerts } from "../../hooks/use-inventory";
import {
  useControlledApprovals,
  useApproveControlledDispense,
  useRejectControlledDispense,
} from "../../hooks/use-emr";
import { useAuthStore } from "../../stores/auth.store";
import { hasPermission } from "../../lib/permissions";

function ControlledApprovalsCard() {
  const user = useAuthStore((s) => s.user);
  const canApprove = hasPermission(user?.role, "CONTROLLED_SUBSTANCE_APPROVE");
  const { data: approvals, isLoading } = useControlledApprovals();
  const approve = useApproveControlledDispense();
  const reject = useRejectControlledDispense();

  if (!canApprove) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-orange-600" />
          Pending Controlled-Substance Approvals ({approvals?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !approvals || approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <ShieldAlert className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nothing awaiting dual sign-off.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {approvals.map((a) => {
              const isOwnRequest = a.requested_by === user?.id;
              const busy = approve.isPending || reject.isPending;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {a.prescription.drug_name} · {a.quantity} {a.item.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For {a.prescription.pet.name} · requested by{" "}
                      {isOwnRequest
                        ? "you"
                        : a.requested_by_staff
                          ? `${a.requested_by_staff.first_name} ${a.requested_by_staff.last_name}`
                          : "another staff member"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isOwnRequest || busy}
                      title={
                        isOwnRequest
                          ? "A different staff member must approve this"
                          : undefined
                      }
                      onClick={() => reject.mutate({ approvalId: a.id })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      disabled={isOwnRequest || busy}
                      title={
                        isOwnRequest
                          ? "A different staff member must approve this"
                          : undefined
                      }
                      onClick={() => approve.mutate(a.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InventoryAlertsPage() {
  const navigate = useNavigate();
  const { data: alerts, isLoading } = useInventoryAlerts();

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/inventory")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Inventory Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Items below their reorder threshold and batches expiring within 30
            days
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Low Stock ({alerts?.low_stock.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!alerts || alerts.low_stock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Package className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nothing below its reorder threshold.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {alerts.low_stock.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/inventory/${item.id}`)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity_on_hand} {item.unit} on hand · reorder
                          at {item.reorder_threshold}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.quantity_on_hand === 0
                            ? "destructive"
                            : "warning"
                        }
                        className="text-xs"
                      >
                        {item.quantity_on_hand === 0
                          ? "Out of Stock"
                          : "Low Stock"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Expiring Soon ({alerts?.expiring_soon.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!alerts || alerts.expiring_soon.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No batches expiring within 30 days.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {alerts.expiring_soon.map((batch) => {
                    const isExpired = batch.expiry_date
                      ? new Date(batch.expiry_date) < new Date()
                      : false;
                    return (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={() => navigate(`/inventory/${batch.item.id}`)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {batch.item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {batch.batch_no ??
                              batch.id.slice(0, 8).toUpperCase()}{" "}
                            · {batch.quantity_remaining} {batch.item.unit}{" "}
                            remaining
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={isExpired ? "destructive" : "warning"}
                            className="text-xs"
                          >
                            {isExpired ? "Expired" : "Expiring"}
                          </Badge>
                          {batch.expiry_date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(
                                new Date(batch.expiry_date),
                                "MMM d, yyyy",
                              )}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <ControlledApprovalsCard />
        </>
      )}
    </div>
  );
}

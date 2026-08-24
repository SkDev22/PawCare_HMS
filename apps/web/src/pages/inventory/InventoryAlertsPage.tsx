import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Clock, Package } from "lucide-react";
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
        </>
      )}
    </div>
  );
}

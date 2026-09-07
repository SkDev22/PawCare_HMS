import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import type { PosSale } from "@/types/pos";

interface Props {
  sale: PosSale;
  clinic: { name: string; address: string | null; phone: string | null } | undefined;
}

// Print-only thermal ticket for the Pet Shop receipt — hidden on screen,
// shown only when printing. The 80mm page size itself is applied by
// printThermalReceipt() in PosCheckoutPage.tsx (a temporary @page override
// injected right before window.print()) since CSS named pages proved
// unreliable for actually changing the physical page size in testing.
// Kept as a separate component from the on-screen `Receipt` card because
// the two have fundamentally different layout constraints: a screen card
// vs. a ~72mm-wide ticket.
export function PosReceiptPrint({ sale, clinic }: Props) {
  return (
    <div className="hidden print:block bg-white text-black">
      <div className="w-[72mm] mx-auto font-mono text-[11px] leading-snug">
        <div className="text-center space-y-0.5">
          {clinic && <p className="text-sm font-bold">{clinic.name}</p>}
          {clinic?.address && <p>{clinic.address}</p>}
          {clinic?.phone && <p>{clinic.phone}</p>}
        </div>

        <div className="border-t border-dashed border-black mt-2 pt-2 text-center space-y-0.5">
          <p className="font-bold">SALE RECEIPT</p>
          <p>{sale.invoice_number ?? `#${sale.id.slice(0, 8).toUpperCase()}`}</p>
          <p>{format(new Date(sale.created_at), "PPp")}</p>
          <p>
            {sale.owner
              ? `${sale.owner.first_name} ${sale.owner.last_name}`
              : sale.customer_name ?? "Walk-in customer"}
          </p>
        </div>

        <div className="border-t border-dashed border-black mt-2 pt-2 space-y-1">
          {sale.line_items.map((li) => (
            <div key={li.id}>
              <div className="flex justify-between gap-2">
                <span>{li.description}</span>
                <span className="shrink-0">{formatCurrency(li.total)}</span>
              </div>
              <div className="text-[10px]">
                {li.quantity} x {formatCurrency(li.unit_price)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black mt-2 pt-2 space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(sale.tax_amount)}</span>
          </div>
          {Number(sale.discount_amount) > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatCurrency(sale.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
            <span>TOTAL</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {sale.payments[0] && (
          <div className="mt-2 space-y-0.5">
            <p className="text-center">
              Paid via {sale.payments[0].method.replace("_", " ").toUpperCase()}
            </p>
            {sale.payments[0].amount_tendered &&
              Number(sale.payments[0].amount_tendered) > Number(sale.payments[0].amount) && (
                <>
                  <div className="flex justify-between">
                    <span>Tendered</span>
                    <span>{formatCurrency(sale.payments[0].amount_tendered)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>
                      {formatCurrency(
                        Number(sale.payments[0].amount_tendered) - Number(sale.payments[0].amount),
                      )}
                    </span>
                  </div>
                </>
              )}
          </div>
        )}

        <p className="text-center border-t border-dashed border-black mt-2 pt-2">
          Thank you for shopping with us!
        </p>
      </div>
    </div>
  );
}

import { format } from 'date-fns';
import { formatCurrency } from '../../../lib/currency';
import type { Invoice } from '../../../types/billing';

interface Props {
  invoice: Invoice;
  statusLabel: string;
}

// Print-only receipt layout, rendered alongside (and hidden behind) the
// interactive invoice dashboard. Kept as plain light-mode styling since it
// should look the same on paper regardless of the app's current theme.
export function InvoiceReceipt({ invoice, statusLabel }: Props) {
  const subtotal = parseFloat(invoice.subtotal);
  const tax = parseFloat(invoice.tax_amount);
  const discount = parseFloat(invoice.discount_amount);
  const total = parseFloat(invoice.total);
  const paid = parseFloat(invoice.paid_amount);
  const balance = total - paid;
  const invoiceNumber = invoice.id.slice(0, 8).toUpperCase();

  return (
    <div className="hidden print:block bg-white text-slate-900 p-10">
      {/* Letterhead */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-lg font-bold">PawCare HMS</h2>
          <p className="text-sm text-slate-500">Pet Hospital &amp; Clinic</p>
        </div>
        <span className="h-fit shrink-0 rounded-full border border-brand-700 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
          {statusLabel}
        </span>
      </div>

      <h1 className="mb-10 text-center text-3xl font-extrabold tracking-[0.2em] text-brand-700">
        INVOICE
      </h1>

      {/* Bill To / meta */}
      <div className="mb-8 flex justify-between gap-10">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">
            Bill To
          </p>
          <p className="text-base font-semibold">
            {invoice.owner.first_name} {invoice.owner.last_name}
          </p>
          {invoice.owner.address && (
            <p className="text-sm text-slate-500">{invoice.owner.address}</p>
          )}
          <p className="text-sm text-slate-500">{invoice.owner.phone}</p>
          {invoice.owner.email && (
            <p className="text-sm text-slate-500">{invoice.owner.email}</p>
          )}
        </div>
        <div className="shrink-0 space-y-1">
          <div className="flex justify-between gap-8">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
              Invoice #
            </span>
            <span className="text-sm font-mono">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
              Invoice date
            </span>
            <span className="text-sm">
              {format(new Date(invoice.created_at), 'MM-dd-yyyy')}
            </span>
          </div>
          {invoice.due_date && (
            <div className="flex justify-between gap-8">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
                Due date
              </span>
              <span className="text-sm">
                {format(new Date(invoice.due_date), 'MM-dd-yyyy')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <table className="mb-2 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-brand-700 text-white">
            <th className="w-14 px-3 py-2 text-left font-semibold">Qty</th>
            <th className="px-3 py-2 text-left font-semibold">Description</th>
            <th className="w-28 px-3 py-2 text-right font-semibold">
              Unit Price
            </th>
            <th className="w-28 px-3 py-2 text-right font-semibold">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((item) => (
            <tr key={item.id} className="border-b border-slate-200">
              <td className="px-3 py-2">{item.quantity}</td>
              <td className="px-3 py-2">{item.description}</td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mb-10 flex justify-end">
        <div className="w-72 text-sm">
          <div className="flex justify-between border-b border-slate-200 py-1.5">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between border-b border-slate-200 py-1.5">
              <span className="text-slate-500">Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-200 py-1.5">
            <span className="text-slate-500">Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="mt-1 flex justify-between bg-brand-50 px-2 py-2 font-bold text-brand-700">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {paid > 0 && (
            <div className="mt-1 flex justify-between py-1.5">
              <span className="text-slate-500">Paid</span>
              <span>{formatCurrency(paid)}</span>
            </div>
          )}
          <div
            className={`flex justify-between py-1.5 font-semibold ${
              balance > 0.001 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            <span>Balance Due</span>
            <span>{formatCurrency(balance)}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="border-t border-slate-200 pt-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">
          Terms &amp; Conditions
        </p>
        <p className="text-xs text-slate-500">
          {invoice.due_date
            ? `Payment is due by ${format(new Date(invoice.due_date), 'MMM d, yyyy')}.`
            : 'Payment is due upon receipt.'}
        </p>
        <p className="text-xs text-slate-500">
          Thank you for trusting us with your pet&apos;s care.
        </p>
      </div>
    </div>
  );
}

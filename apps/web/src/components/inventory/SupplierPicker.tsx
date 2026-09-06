import { useState } from "react";
import { Building2 } from "lucide-react";
import { Input } from "../ui/input";
import { useSuppliers } from "../../hooks/use-suppliers";
import { useDebounce } from "../../hooks/use-debounce";

// Suppliers rarely change, so this lets staff pick an existing one instead of
// retyping it every time. Typing a name with no match just gets saved as a
// new supplier automatically when the GRN is submitted (see
// grn.service.ts's resolveSupplierTx) — there's no separate "add supplier" step.
export function SupplierPicker({
  name,
  onChange,
}: {
  name: string;
  onChange: (v: { id: string | null; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const debouncedName = useDebounce(name, 250);
  const { data: suppliers } = useSuppliers({
    ...(debouncedName ? { search: debouncedName } : {}),
    limit: 8,
  });
  const results = suppliers ?? [];
  const hasExactMatch = results.some(
    (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
  );

  return (
    <div className="relative">
      <Input
        value={name}
        onChange={(e) => {
          onChange({ id: null, name: e.target.value });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search or type a new supplier"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-48 overflow-y-auto">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => {
                onChange({ id: s.id, name: s.name });
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
            >
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
          {name.trim().length > 0 && !hasExactMatch && (
            <p className="px-3 py-2 text-xs text-muted-foreground border-t">
              No match — "{name.trim()}" will be saved as a new supplier.
            </p>
          )}
          {results.length === 0 && name.trim().length === 0 && (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              Type to search saved suppliers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

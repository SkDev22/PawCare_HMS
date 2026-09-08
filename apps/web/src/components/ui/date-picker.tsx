import * as React from "react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "value" | "onChange"> {
  // Plain "yyyy-MM-dd" string in, string out — matches the format every
  // date field in this app already stores/validates against, so this is a
  // drop-in replacement for <Input type="date" {...field} /> under both
  // react-hook-form's FormField (field.onChange accepts a plain value) and
  // plain useState-bound inputs.
  value?: string | undefined;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, placeholder = "Pick a date", className, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
    const isValidSelected = selected && !isNaN(selected.getTime());

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !isValidSelected && "text-muted-foreground",
              className,
            )}
            {...props}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {isValidSelected ? format(selected, "MMM d, yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={isValidSelected ? selected : undefined}
            onSelect={(date) => {
              if (date) {
                onChange?.(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = "DatePicker";

export { DatePicker };

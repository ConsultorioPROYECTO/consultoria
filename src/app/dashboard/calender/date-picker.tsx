"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selectedDate?: Date;
  onDateSelect: (date: Date | undefined) => void;
  className?: string;
  // Props para sincronización
  displayMonth?: Date;
  onMonthChange?: (month: Date) => void;
}

export function DatePicker({ 
  selectedDate, 
  onDateSelect, 
  className,
  displayMonth,
  onMonthChange 
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    onDateSelect(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal text-sm text-muted-foreground",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, "d 'de' MMM", { locale: es })
          ) : (
            "Seleccionar fecha"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          month={displayMonth}
          onMonthChange={onMonthChange}
          initialFocus
          locale={es}
          weekStartsOn={0}
          className="rounded-md border-0"
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
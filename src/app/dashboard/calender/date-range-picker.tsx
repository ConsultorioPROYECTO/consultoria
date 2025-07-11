"use client";

import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";



export interface DateRangePickerProps {
  currentDate: Date;
  onRangeSelect?: (range: { start: Date; end: Date }) => void;
  // Props para sincronización
  displayMonth?: Date;
  onMonthChange?: (month: Date) => void;
}

export function DateRangePicker({
  currentDate,
  onRangeSelect,
  displayMonth: externalDisplayMonth,
  onMonthChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalDisplayMonth, setInternalDisplayMonth] = useState(currentDate);
  const displayMonth = externalDisplayMonth || internalDisplayMonth;
  
  // Calcular el rango de semana basado en currentDate
  const getWeekRange = (): DateRange => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return { from: weekStart, to: weekEnd };
  };
  
  const selectedRange = getWeekRange();
  
  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range?.from) return;
    
    const weekStart = startOfWeek(range.from, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(range.from, { weekStartsOn: 0 });
    onRangeSelect?.({ start: weekStart, end: weekEnd });
    
    setIsOpen(false);
  };

  const handlePreviousWeek = () => {
    const previousWeek = subWeeks(currentDate, 1);
    const weekStart = startOfWeek(previousWeek, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(previousWeek, { weekStartsOn: 0 });
    
    // Solo navegar si la semana anterior está en el mismo mes que el mes mostrado
    if (weekStart.getMonth() === displayMonth.getMonth() || weekEnd.getMonth() === displayMonth.getMonth()) {
      onRangeSelect?.({ start: weekStart, end: weekEnd });
    }
  };

  const handleNextWeek = () => {
    const nextWeek = addWeeks(currentDate, 1);
    const weekStart = startOfWeek(nextWeek, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(nextWeek, { weekStartsOn: 0 });
    
    // Solo navegar si la semana siguiente está en el mismo mes que el mes mostrado
    if (weekStart.getMonth() === displayMonth.getMonth() || weekEnd.getMonth() === displayMonth.getMonth()) {
      onRangeSelect?.({ start: weekStart, end: weekEnd });
    }
  };

  const getDisplayText = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(weekStart, "d MMMM", { locale: es })} - ${format(weekEnd, "d MMMM", { locale: es })}`;
  };



  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal capitalize",
            !currentDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col">
          <Calendar
            mode="range"
            month={displayMonth}
            onMonthChange={onMonthChange || setInternalDisplayMonth}
            selected={selectedRange}
            onSelect={handleRangeSelect}
            initialFocus
            locale={es}
            numberOfMonths={1}
            weekStartsOn={0}
            hideNavigation
            components={{
              MonthCaption: () => (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Select
                      value={displayMonth.getMonth().toString()}
                      onValueChange={(value) => {
                        const newMonth = new Date(displayMonth.getFullYear(), parseInt(value), 1);
                        if (onMonthChange) {
                          onMonthChange(newMonth);
                        } else {
                          setInternalDisplayMonth(newMonth);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[120px] h-8 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()} className="capitalize">
                            {format(new Date(2024, i, 1), "MMMM", { locale: es })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={displayMonth.getFullYear().toString()}
                      onValueChange={(value) => {
                        const newMonth = new Date(parseInt(value), displayMonth.getMonth(), 1);
                        if (onMonthChange) {
                          onMonthChange(newMonth);
                        } else {
                          setInternalDisplayMonth(newMonth);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[100px] h-8 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => {
                          const year = 2020 + i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousWeek}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm capitalize">
                      {format(selectedRange.from!, "d MMMM", { locale: es })} - {format(selectedRange.to!, "d MMMM", { locale: es })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextWeek}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            }}
            className="rounded-lg border-0 capitalize"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface BirthDatePickerProps {
  selectedDate?: Date
  onDateSelect: (date: Date | undefined) => void
  className?: string
  placeholder?: string
}

export function BirthDatePicker({
  selectedDate,
  onDateSelect,
  className,
  placeholder = 'Seleccionar fecha'
}: BirthDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    onDateSelect(date)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className
          )}
        >
          {selectedDate ? (
            format(selectedDate, 'dd/MM/yyyy', { locale: es })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) =>
            date > new Date() || date < new Date('1900-01-01')
          }
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}
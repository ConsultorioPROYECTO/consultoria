'use client'

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { CalendarDays, Clock, User, Stethoscope } from "lucide-react"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments"

// Nuevo schema para datos de citas médicas
export const appointmentSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  doctorSpecialty: z.string(),
  patientName: z.string(),
  service: z.string(),
  date: z.string(),
  time: z.string().optional(),
  status: z.enum(['Confirmada', 'Completada', 'Pendiente', 'Llegó']),
})

type AppointmentData = z.infer<typeof appointmentSchema>

// Definir columnas para la tabla de citas
const columns: ColumnDef<AppointmentData>[] = [
  {
    accessorKey: "patientName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <User className="mr-2 h-4 w-4" />
          Paciente
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("patientName")}</div>
    ),
  },
  {
    accessorKey: "doctorSpecialty",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Stethoscope className="mr-2 h-4 w-4" />
          Especialidad
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-center">
        <Badge variant="outline">{row.getValue("doctorSpecialty")}</Badge>
      </div>
    ),
  },
  {
    accessorKey: "service",
    header: "Servicio",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.getValue("service")}
      </div>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Fecha
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      return (
        <div className="text-sm">
          {date.toLocaleDateString('es-ES')}
        </div>
      )
    },
  },
  {
    accessorKey: "time",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Clock className="mr-2 h-4 w-4" />
          Hora
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-sm font-mono">
        {row.getValue("time")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge 
          variant={
            status === 'Completada' ? 'default' :
            status === 'Confirmada' ? 'secondary' :
            status === 'Llegó' ? 'outline' : 'destructive'
          }
          className={
            status === 'Completada' ? 'bg-green-100 text-green-800' :
            status === 'Confirmada' ? 'bg-blue-100 text-blue-800' :
            status === 'Llegó' ? 'bg-purple-100 text-purple-800' : 
            'bg-yellow-100 text-yellow-800'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "doctorId",
    header: "Doctor ID",
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground text-center">
        #{row.getValue("doctorId")}
      </div>
    ),
  },
]

export function DataTable() {
  const { doctors, loading, error } = useDoctorsWithAppointments()
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Transformar datos de asistentes con doctores a formato de tabla
  const tableData = React.useMemo(() => {
    if (!doctors.length) return []
    
    const appointments: AppointmentData[] = []
    
    doctors.forEach(assistant => {
      assistant.doctors.forEach(doctor => {
        doctor.appointments.forEach((appointment) => {
          appointments.push({
            id: appointment.id?.toString() || '',
            doctorId: doctor.idDoctor?.toString() || '',
            doctorSpecialty: doctor.speciality || '',
            patientName: appointment.patient ? 
              `${appointment.patient.firstName} ${appointment.patient.lastName}` : 
              'Paciente no disponible',
            service: 'Servicio no disponible', // appointment.service?.name || '',
            date: appointment.createdAt?.toString() || '',
            time: '', // Campo no disponible en el esquema actual
            status: appointment.status as AppointmentData['status'],
          })
        })
      })
    })
    
    return appointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [doctors])

  // Filtrar datos según el filtro de estado
  const filteredData = React.useMemo(() => {
    if (statusFilter === "all") return tableData
    return tableData.filter(appointment => appointment.status === statusFilter)
  }, [tableData, statusFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  if (loading) {
    return (
      <div className="w-full p-4">
        <div className="rounded-lg border">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Tabla de Citas</h3>
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <div className="rounded-lg border">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Tabla de Citas</h3>
            <p className="text-red-500">Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-4">
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-4">
          <div>
            <h3 className="text-lg font-semibold">Tabla de Citas</h3>
            <p className="text-sm text-muted-foreground">
              {filteredData.length} citas de {doctors.length} médicos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Confirmada">Confirmada</SelectItem>
                <SelectItem value="Llegó">Llegó</SelectItem>
                <SelectItem value="Completada">Completada</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar paciente..."
              value={(table.getColumn("patientName")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("patientName")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No se encontraron citas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {table.getRowModel().rows.length} de {filteredData.length} citas
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <div className="text-sm">
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

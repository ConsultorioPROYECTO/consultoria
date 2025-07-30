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
import { CalendarDays, User, Phone, Mail, FileText } from "lucide-react"

import { Badge } from "@rutas/components/ui/badge"
import { Button } from "@rutas/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { Input } from "@rutas/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rutas/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rutas/components/ui/table"
import { usePatientsOnly } from "@/hooks/useDashboardOptimized"
import { type PatientWithRelations } from "@/hooks/usePatients"

// Definir columnas para la tabla de pacientes
const columns: ColumnDef<PatientWithRelations>[] = [
  {
    accessorKey: "patientCode",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <FileText className="mr-2 h-4 w-4" />
          Código
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-xs font-medium">
        {row.getValue("patientCode")}
      </div>
    ),
  },
  {
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    id: "fullName",
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
    cell: ({ row }) => {
      const patient = row.original;
      return (
        <div className="flex flex-col gap-1">
          <div className="font-medium text-sm">
            {patient.firstName} {patient.lastName}
          </div>
          <div className="text-xs text-muted-foreground">
            {patient.identificationType}: {patient.identificationNumber}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "gender",
    header: "Género",
    cell: ({ row }) => {
      const gender = row.getValue("gender") as string;
      return (
        <Badge 
          variant="outline"
          className={
            gender === 'M' ? 'bg-blue-100 text-blue-800' :
            gender === 'F' ? 'bg-pink-100 text-pink-800' :
            'bg-gray-100 text-gray-800'
          }
        >
          {gender === 'M' ? 'Masculino' : gender === 'F' ? 'Femenino' : 'Otro'}
        </Badge>
      )
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Phone className="mr-2 h-4 w-4" />
          Teléfono
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">
        {row.getValue("phone") || "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground">
        {row.getValue("email") || "N/A"}
      </div>
    ),
  },
  {
    accessorKey: "birthDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Edad
        </Button>
      )
    },
    cell: ({ row }) => {
      const birthDate = row.getValue("birthDate") as Date;
      if (!birthDate) return <div className="text-xs text-muted-foreground">N/A</div>;
      
      const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return (
        <div className="text-xs text-muted-foreground">
          {age} años
        </div>
      );
    },
  },
]

export function PatientsTable() {
  const { patients, isLoading: loading, error } = usePatientsOnly()
  const [genderFilter, setGenderFilter] = React.useState<string>("all")
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Aplicar filtro de género
  const filteredPatients = React.useMemo(() => {
    if (genderFilter === "all") return patients
    return patients.filter(patient => patient.gender === genderFilter)
  }, [patients, genderFilter])

  const table = useReactTable({
    data: filteredPatients,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error || 'Error desconocido'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Pacientes ({filteredPatients.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full space-y-4">
          {/* Filtros */}
          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Buscar pacientes..."
              value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("fullName")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Género" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Femenino</SelectItem>
                <SelectItem value="Other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
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
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No se encontraron pacientes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {table.getRowModel().rows.length} de{" "}
              {filteredPatients.length} pacientes
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <div className="text-sm text-muted-foreground">
                Página {table.getState().pagination.pageIndex + 1} de{" "}
                {table.getPageCount()}
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
      </CardContent>
    </Card>
  )
}
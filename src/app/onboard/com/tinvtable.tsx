"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Trash2 } from "lucide-react"

import { Button } from "@rutas/components/ui/button"
import { Checkbox } from "@rutas/components/ui/checkbox"
import { Input } from "@rutas/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rutas/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@rutas/components/ui/dropdown-menu"
import { ChevronDown, ArrowUpAZ, ArrowDownZA, ArrowUpDown } from "lucide-react"
import { AlertDelete } from "./alertDele"

export type InviteStatus = "Pendiente" | "Aceptada" | "Expirada" | "Enviada"

export type InvitedRow = {
  id: string
  status: InviteStatus
  email: string
  role: string
}

interface TInvTableProps {
  data: InvitedRow[]
  roles: string[]
  onRoleChange: (email: string, newRole: string) => void
  onDelete: (email: string) => void
  selectedRowIds: Record<string, boolean>
  onSelectRow: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
}

export function TInvTable({
  data,
  roles,
  onRoleChange,
  onDelete,
  selectedRowIds,
  onSelectRow,
  onSelectAll,
}: TInvTableProps) {
  // Paginación manual
  const PAGE_SIZE = 5;
  const [page, setPage] = React.useState(0);


  // Nuevo estado local para simular el cambio de estado
  const [localData, setLocalData] = React.useState(data);

  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Calcular los datos de la página actual
  const paginatedData = localData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(localData.length / PAGE_SIZE);

  // Si la página actual queda vacía tras eliminar, retrocede una página
  React.useEffect(() => {
    if (page > 0 && page >= totalPages) {
      setPage(totalPages - 1);
    }
  }, [data.length, page, totalPages]);

  // Obtener los emails seleccionados
  const selectedEmails = React.useMemo(
    () => localData.filter(row => selectedRowIds[row.id]).map(row => row.email),
    [localData, selectedRowIds]
  );

  // Función para borrar uno o varios
  const handleDeleteMultiple = (emails: string[]) => {
    emails.forEach(email => onDelete(email));
    onSelectAll(false);
  };

  // Column definitions
  const columns: ColumnDef<InvitedRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={data.length > 0 && data.every(row => selectedRowIds[row.id])}
          // Elimina indeterminate y ref si tu Checkbox no lo soporta
          onCheckedChange={value => onSelectAll(!!value)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={!!selectedRowIds[row.original.id]}
          onCheckedChange={value => onSelectRow(row.original.id, !!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "status",
      header: "Estatus",
      cell: ({ row }) => (
        <div className="capitalize">{row.original.status}</div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          Correo
          {column.getIsSorted() === "asc" ? (
            <ArrowUpAZ className="ml-1 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDownZA className="ml-1 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-1 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => <div className="lowercase">{row.original.email}</div>,
    },
    // En la definición de columnas:
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => (
        <div style={{ width: 180, minWidth: 180, maxWidth: 180, display: "flex", alignItems: "center" }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-white bg-muted px-2 py-1"
                style={{ minWidth: 0 }}
              >
                <span className="truncate">{row.original.role}</span>
                <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[180px] max-w-[180px]">
              {roles.map((r) => (
                <DropdownMenuCheckboxItem
                  key={r}
                  checked={row.original.role === r}
                  onCheckedChange={() => onRoleChange(row.original.email, r)}
                  className="capitalize"
                >
                  {r}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        // Si hay varias seleccionadas y esta fila está seleccionada, pasar todas
        const isRowSelected = !!selectedRowIds[row.original.id];
        const multipleSelected = selectedEmails.length > 1 && isRowSelected;
        const emailsToDelete = multipleSelected ? selectedEmails : [row.original.email];
        return (
          <div style={{ width: 48, minWidth: 48, maxWidth: 48, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <AlertDelete
              onDelete={handleDeleteMultiple}
              emails={emailsToDelete}
            />
          </div>
        );
      },
    },
  ]

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const table = useReactTable({
    data: paginatedData, // Solo los datos de la página actual
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    manualPagination: true,
    pageCount: totalPages,
  })

  // Funciones para paginación
  const handlePrevious = () => {
    setPage((prev) => Math.max(prev - 1, 0));
  };
  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  // Cambiar estado de "Pendiente" a "Enviada"
  const handleSendInvitations = () => {
    setLocalData(prev =>
      prev.map(invite =>
        invite.status === "Pendiente"
          ? { ...invite, status: "Enviada" }
          : invite
      )
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrar correos..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={event =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columnas <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id === "select"
                    ? "Seleccionar"
                    : column.id.charAt(0).toUpperCase() + column.id.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table className="table-fixed w-full">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={
                      header.column.id === "select"
                        ? { width: 40 }
                        : header.column.id === "status"
                        ? { width: 90 }
                        : header.column.id === "email"
                        ? { width: 180 }
                        : header.column.id === "role"
                        ? { width: 130 }
                        : header.column.id === "actions"
                        ? { width: 48 }
                        : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay invitaciones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Botones de paginación a la izquierda y botón de enviar invitaciones a la derecha */}
      <div className="flex items-center justify-between space-x-2 py-4 px-2" style={{ minWidth: 400 }}>
        {totalPages > 1 ? (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page >= totalPages - 1}
            >
              Próximo
            </Button>
          </div>
        ) : <div /> }
        <div style={{ minWidth: 150, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="button"
            size="sm"
            onClick={handleSendInvitations}
            style={{ minWidth: 150 }}
          >
            Enviar invitaciones
          </Button>
        </div>
      </div>
    </div>
  )
}


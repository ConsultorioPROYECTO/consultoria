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
import { CalendarDays, User, Phone, Mail, FileText, Eye, Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePatientsOnly } from "@/hooks/useDashboardOptimized"
import { type PatientWithRelations } from "@/hooks/usePatients"
import { useAuth } from "@/app/context/AuthContext"

/** Types matching GET /api/attachments/list response for patient filter */
interface PatientAttachmentItem {
  id: number;
  objectKey: string;
  objectName: string;
  contentType: string;
  fileSize: number;
  fileCategory: string;
  description: string | null;
  isActive: boolean;
  isPublic: boolean;
  accessLevel: string;
  createdAt: string; // serialized date from backend
}

interface PatientAttachmentsResponse {
  data?: {
    items: PatientAttachmentItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: Record<string, unknown>;
  };
  message?: string;
}

/** Utility formatters (keep simple to avoid extra deps) */
function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return '—'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString()
}

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

  // Dialog state
  const { user } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedPatient, setSelectedPatient] = React.useState<PatientWithRelations | null>(null)
  const [attachments, setAttachments] = React.useState<PatientAttachmentItem[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = React.useState(false)
  const [attachmentsError, setAttachmentsError] = React.useState<string | null>(null)

  const openDocumentsDialog = React.useCallback((patient: PatientWithRelations) => {
    setSelectedPatient(patient)
    setIsDialogOpen(true)
  }, [])

  React.useEffect(() => {
    let aborted = false
    async function fetchPatientAttachments(patientId: number) {
      try {
        setAttachmentsLoading(true)
        setAttachmentsError(null)
        const token = await user?.getIdToken()
        const url = `/api/attachments/list?patientId=${patientId}&limit=20&sortBy=createdAt&sortOrder=desc&page=1`
        const resp = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!resp.ok) throw new Error('No se pudo obtener la lista de archivos del paciente')
        const json: PatientAttachmentsResponse = await resp.json()
        if (!aborted) setAttachments(json?.data?.items ?? [])
      } catch (e) {
        if (!aborted) setAttachmentsError(e instanceof Error ? e.message : 'Error desconocido al listar archivos')
      } finally {
        if (!aborted) setAttachmentsLoading(false)
      }
    }

    if (isDialogOpen && selectedPatient?.id) {
      fetchPatientAttachments(selectedPatient.id)
    }
    return () => {
      aborted = true
    }
  }, [isDialogOpen, selectedPatient, user])

  const handleViewAttachment = React.useCallback(async (objectKey: string, fileName?: string) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const resp = await fetch('/api/attachments/presigned-get-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ objectKey, disposition: 'inline', fileName }),
      })
      if (!resp.ok) throw new Error('No se pudo obtener URL de descarga')
      const data: { data: { presignedUrl: string } } = await resp.json()
      window.open(data.data.presignedUrl, '_blank')
    } catch (e) {
      console.error(e)
    }
  }, [user])

  const handleDownloadAttachment = React.useCallback(async (objectKey: string, fileName?: string) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const resp = await fetch('/api/attachments/presigned-get-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ objectKey, disposition: 'attachment', fileName }),
      })
      if (!resp.ok) throw new Error('No se pudo obtener URL de descarga')
      const data: { data: { presignedUrl: string } } = await resp.json()
      const link = document.createElement('a')
      link.href = data.data.presignedUrl
      link.download = fileName || objectKey.split('/').pop() || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error(e)
    }
  }, [user])

  // Aplicar filtro de género
  const filteredPatients = React.useMemo(() => {
    if (genderFilter === "all") return patients
    return patients.filter(patient => patient.gender === genderFilter)
  }, [patients, genderFilter])

  // Columns need to be defined inside to use openDocumentsDialog
  const columns: ColumnDef<PatientWithRelations>[] = React.useMemo(() => [
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
    {
      id: 'actions',
      header: () => <div className="text-xs font-medium">Acciones</div>,
      cell: ({ row }) => {
        const patient = row.original
        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openDocumentsDialog(patient)}>
              <FileText className="mr-2 h-4 w-4" />
              Documentos
            </Button>
          </div>
        )
      },
      enableHiding: false,
      enableSorting: false,
    }
  ], [openDocumentsDialog])

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
          <CardTitle className="font-bold text-2xl">Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex flex-col gap-2">
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
    <Card className="h-full flex flex-col">
      <CardHeader className="px-6 gap-0">
        <CardTitle className="text-2xl font-bold">Pacientes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-6">
      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Input
            placeholder="Buscar pacientes..."
            value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("fullName")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por género" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Femenino</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border">
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
        <div className="flex flex-1 text-sm text-muted-foreground items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
                    Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}  
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
      </CardContent>

      {/* Patient Documents Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Documentos del paciente</DialogTitle>
            <DialogDescription>
              {selectedPatient ? (
                <span>Listado de archivos asociados a {selectedPatient.firstName} {selectedPatient.lastName}</span>
              ) : (
                <span>Selecciona un paciente para ver sus documentos</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {attachmentsLoading ? (
              <div className="text-sm text-muted-foreground">Cargando documentos...</div>
            ) : attachmentsError ? (
              <div className="text-sm text-red-500">{attachmentsError}</div>
            ) : attachments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay documentos para este paciente.</div>
            ) : (
              <div className="rounded-md border">
                <ScrollArea className="max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Tamaño</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attachments.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium text-sm">{item.objectName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.contentType}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatBytes(item.fileSize)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewAttachment(item.objectKey, item.objectName)} title="Ver">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadAttachment(item.objectKey, item.objectName)} title="Descargar">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
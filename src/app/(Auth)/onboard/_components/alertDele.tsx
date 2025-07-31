'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@rutas/components/ui/alert-dialog"
  import { Button } from "@rutas/components/ui/button"
  import { Trash2 } from "lucide-react"

  interface AlertDeleteProps {
    onDelete: (emails: string[]) => void
    emails: string[]
  }

  export function AlertDelete({ onDelete, emails }: AlertDeleteProps) {
    const isMultiple = emails.length > 1;
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Eliminar</span>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isMultiple
                ? `¿Estás seguro de eliminar ${emails.length} invitaciones?`
                : "¿Estás seguro de eliminar esta invitación?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isMultiple
                ? "Esta acción no se puede deshacer. Esto eliminará permanentemente las invitaciones seleccionadas y no podrás recuperarlas."
                : "Esta acción no se puede deshacer. Esto eliminará permanentemente la invitación y no podrás recuperarla."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(emails)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }
  
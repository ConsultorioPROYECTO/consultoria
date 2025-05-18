// src/app/dashboard/3/compo/ConflictResolutionCenter.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { ShieldAlert, MessageCircle, CheckSquare, Users } from "lucide-react";
import { Badge } from "@rutas/components/ui/badge";
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rutas/components/ui/dialog";
import { Textarea } from "@rutas/components/ui/textarea";
import { Label } from "@rutas/components/ui/label";

interface ConflictCase {
  id: string;
  type: 'Queja Paciente' | 'Disputa de Horario' | 'Problema Facturación' | 'Otro';
  involvedParties: string[]; // Nombres o IDs de pacientes, doctores, personal
  description: string;
  submittedAt: string;
  status: 'Abierto' | 'En Investigación' | 'Resolución Propuesta' | 'Resuelto' | 'Cerrado';
  priority: 'Alta' | 'Media' | 'Baja';
  resolutionNotes?: string;
  assignedTo?: string; // Asistente o admin que lo maneja
}

// Mock data
const mockConflictCases: ConflictCase[] = [
  {
    id: "case1",
    type: "Queja Paciente",
    involvedParties: ["Ana Torres (Paciente)", "Recepción"],
    description: "La paciente Ana Torres reporta un largo tiempo de espera el día de ayer y trato poco amable en recepción.",
    submittedAt: "2024-08-02 09:00 AM",
    status: "Abierto",
    priority: "Alta",
    assignedTo: "Asistente Principal"
  },
  {
    id: "case2",
    type: "Disputa de Horario",
    involvedParties: ["Dr. Alan Grant", "Dra. Ellie Sattler"],
    description: "Conflicto por uso de sala de procedimientos el próximo Lunes a las 10:00 AM.",
    submittedAt: "2024-08-01 15:30 PM",
    status: "En Investigación",
    priority: "Media",
    assignedTo: "Asistente Principal"
  },
  {
    id: "case3",
    type: "Problema Facturación",
    involvedParties: ["Luis Fernández (Paciente)", "Dpto. Facturación"],
    description: "El paciente Luis Fernández indica un cobro incorrecto en su última factura.",
    submittedAt: "2024-07-31 11:00 AM",
    status: "Resuelto",
    priority: "Media",
    resolutionNotes: "Se contactó al paciente, se verificó el error y se emitió nota de crédito. Paciente conforme.",
    assignedTo: "Asistente Facturación"
  },
];

export function ConflictResolutionCenter() {
  const [cases, setCases] = useState<ConflictCase[]>(mockConflictCases);
  const [selectedCase, setSelectedCase] = useState<ConflictCase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  const openCaseModal = (conflictCase: ConflictCase) => {
    setSelectedCase(conflictCase);
    setResolutionNote(conflictCase.resolutionNotes || "");
    setIsModalOpen(true);
  };

  const handleUpdateStatus = (newStatus: ConflictCase['status']) => {
    if (!selectedCase) return;
    const updatedCase = { ...selectedCase, status: newStatus, resolutionNotes: resolutionNote };
    setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
    // En una app real, aquí se guardaría en backend
    if (newStatus === 'Resuelto' || newStatus === 'Cerrado') {
        setIsModalOpen(false);
        setSelectedCase(null);
    }
  };

  const getPriorityBadge = (priority: ConflictCase['priority']) => {
    if (priority === 'Alta') return <Badge variant="destructive">Alta</Badge>;
    if (priority === 'Media') return <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">Media</Badge>;
    return <Badge variant="outline">Baja</Badge>;
  };

  const getStatusBadge = (status: ConflictCase['status']) => {
    if (status === 'Abierto') return <Badge variant="outline" className="border-red-500 text-red-500">Abierto</Badge>;
    if (status === 'En Investigación') return <Badge className="bg-yellow-500 text-white">En Investigación</Badge>;
    if (status === 'Resolución Propuesta') return <Badge className="bg-blue-500 text-white">Resolución Propuesta</Badge>;
    if (status === 'Resuelto') return <Badge className="bg-green-500 text-white">Resuelto</Badge>;
    if (status === 'Cerrado') return <Badge variant="secondary">Cerrado</Badge>;
    return <Badge>{status}</Badge>;
  };

  return (
    <Card className="col-span-1 lg:col-span-2"> {/* Ajustar según layout */}
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldAlert className="h-5 w-5 mr-2 text-primary" />
          Centro de Resolución de Conflictos
        </CardTitle>
        <CardDescription>
          Gestiona y documenta quejas, disputas y otros problemas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cases.filter(c => c.status !== 'Resuelto' && c.status !== 'Cerrado').length > 0 ? (
          <ScrollArea className="h-[400px]"> {/* Altura ajustable */}
            <div className="space-y-3 pr-3">
              {cases.filter(c => c.status !== 'Resuelto' && c.status !== 'Cerrado').map((conflictCase) => (
                <div 
                    key={conflictCase.id} 
                    className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openCaseModal(conflictCase)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{conflictCase.type} (ID: {conflictCase.id})</p>
                      <p className="text-xs text-muted-foreground">
                        Involucrados: {conflictCase.involvedParties.join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                        {getStatusBadge(conflictCase.status)}
                        {getPriorityBadge(conflictCase.priority)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1 line-clamp-2">{conflictCase.description}</p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Presentado: {conflictCase.submittedAt}</span>
                    {conflictCase.assignedTo && <span>Asignado a: {conflictCase.assignedTo}</span>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay casos activos pendientes de resolución.</p>
        )}

        {/* Podría haber una sección para casos resueltos/cerrados si se desea */}
      </CardContent>

      {selectedCase && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle del Caso: {selectedCase.type} (ID: {selectedCase.id})</DialogTitle>
              <DialogDescription>
                Gestionar el caso y actualizar su estado.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
                <div>
                    <Label className="font-semibold">Involucrados:</Label>
                    <p className="text-sm text-muted-foreground">{selectedCase.involvedParties.join(', ')}</p>
                </div>
                <div>
                    <Label className="font-semibold">Descripción:</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCase.description}</p>
                </div>
                <div>
                    <Label className="font-semibold">Estado Actual:</Label> {getStatusBadge(selectedCase.status)}
                </div>
                 <div>
                    <Label className="font-semibold">Prioridad:</Label> {getPriorityBadge(selectedCase.priority)}
                </div>
                <div>
                    <Label htmlFor="resolution-notes">Notas de Resolución / Seguimiento:</Label>
                    <Textarea 
                        id="resolution-notes" 
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        className="min-h-[100px] mt-1"
                        placeholder="Añade notas sobre la investigación, acciones tomadas, propuestas de resolución..."
                    />
                </div>
            </div>
            <DialogFooter className="sm:justify-between">
                <div className="flex gap-2 flex-wrap">
                    {selectedCase.status === 'Abierto' && <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('En Investigación')}>Marcar como En Investigación</Button>}
                    {selectedCase.status === 'En Investigación' && <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('Resolución Propuesta')}>Proponer Resolución</Button>}
                    {(selectedCase.status === 'Resolución Propuesta' || selectedCase.status === 'En Investigación') && <Button size="sm" variant="default" onClick={() => handleUpdateStatus('Resuelto')}>Marcar como Resuelto</Button>}
                </div>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cerrar Ventana</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
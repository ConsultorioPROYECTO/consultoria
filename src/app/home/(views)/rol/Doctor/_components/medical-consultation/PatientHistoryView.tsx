// src/app/dashboard/2/compo/PatientHistoryView.tsx
'use client';

import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Badge } from "@rutas/components/ui/badge";
import { useState } from "react";

interface MedicalRecord {
  id: string;
  date: string;
  type: string; // e.g., 'Consulta', 'Examen', 'Cirugía'
  doctor: string;
  diagnosis: string;
  notes: string;
  attachments?: { name: string; url: string }[];
}

// Mock data - en una aplicación real, esto vendría de una API para un paciente específico
const mockPatientHistory: MedicalRecord[] = [
  {
    id: "rec1",
    date: "2023-10-15",
    type: "Consulta General",
    doctor: "Dr. Pérez",
    diagnosis: "Gripe común",
    notes: "Paciente presenta fiebre leve y tos. Se recomienda reposo y paracetamol.",
    attachments: [{ name: "Resultados_Lab.pdf", url: "#" }],
  },
  {
    id: "rec2",
    date: "2023-05-20",
    type: "Examen de Sangre",
    doctor: "Laboratorio Central",
    diagnosis: "Valores normales",
    notes: "Todos los indicadores dentro de los rangos esperados.",
  },
  {
    id: "rec3",
    date: "2022-11-01",
    type: "Consulta Especializada",
    doctor: "Dr. Gómez (Cardiólogo)",
    diagnosis: "Hipertensión Leve",
    notes: "Se recomienda monitoreo de presión arterial y dieta baja en sodio.",
  },
];

interface PatientHistoryViewProps {
  patientId: number | null; // Se pasaría el ID del paciente seleccionado
  patientName?: string;
  // isOpen: boolean; // Ya no es un diálogo, no necesita isOpen
  // onOpenChange: (open: boolean) => void; // Ya no es un diálogo, no necesita onOpenChange
}

export function PatientHistoryView({
  patientId,
}: PatientHistoryViewProps) {
  const [history] = useState<MedicalRecord[]>(mockPatientHistory);

  // En una app real, aquí se haría un fetch del historial del pacienteId
  // useEffect(() => {
  //   if (patientId) {
  //     // fetchPatientHistory(patientId).then(data => setHistory(data));
  //   }
  // }, [patientId]);

  if (!patientId) return null;

  return (
    <ScrollArea className="h-[400px] flex-grow pr-6 -mr-6">
      <div className="space-y-6 py-4">
        {history.length > 0 ? (
          history.map((record) => (
            <div key={record.id} className="p-4 border rounded-lg bg-card shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-lg text-primary">{record.type}</h4>
                <Badge variant="outline">{new Date(record.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1"><strong>Médico/Lugar:</strong> {record.doctor}</p>
              <p className="text-sm text-muted-foreground mb-1"><strong>Diagnóstico:</strong> {record.diagnosis}</p>
              <div className="mt-2 pt-2 border-t">
                <p className="text-sm font-medium mb-1">Notas:</p>
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{record.notes}</p>
              </div>
              {record.attachments && record.attachments.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-1">Archivos Adjuntos:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {record.attachments.map((att, index) => (
                      <li key={index} className="text-sm">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {att.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">No hay historial médico disponible para este paciente.</p>
        )}
      </div>
    </ScrollArea>
  );
}
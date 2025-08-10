// src/app/dashboard/2/compo/PatientHistoryView.tsx
'use client';

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useAuth } from '@/app/context/AuthContext';

interface PatientHistoryRecord {
  id: number | string;
  date: string; // ISO string
  type: string; // e.g., fileCategory or derived label
  doctor: string; // uploader or doctor name if available
  diagnosis: string; // mapped from medicalService name if available
  notes: string; // mapped from attachment description
  attachments?: { name: string; objectKey: string }[];
}

// Tipos mínimos para parsear la respuesta del endpoint /api/attachments/list
interface AttachmentListItem {
  id: number;
  objectKey: string;
  objectName: string;
  fileCategory: string;
  description: string | null;
  createdAt: string; // serializado desde backend
  doctor?: {
    idDoctor: number;
    speciality: string;
    user?: {
      displayName: string | null;
      email: string | null;
    };
  } | null;
  medicalService?: {
    id: number;
    name: string;
    category: string;
  } | null;
  uploadedByUser?: {
    id: number;
    displayName: string | null;
    email: string | null;
  } | null;
}

interface AttachmentListResponse {
  data?: {
    items: AttachmentListItem[];
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

interface PatientHistoryViewProps {
  patientId: number | null; // Se pasaría el ID del paciente seleccionado
  patientName?: string;
}

export function PatientHistoryView({
  patientId,
}: PatientHistoryViewProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<PatientHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    async function fetchPatientHistory() {
      if (!patientId || !user) {
        setHistory([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const token = await user.getIdToken();
        const url = `/api/attachments/list?patientId=${patientId}&limit=50&sortBy=createdAt&sortOrder=desc`;
        const resp = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error('No se pudo obtener el historial del paciente');
        const json: AttachmentListResponse = await resp.json();
        const items = json?.data?.items ?? [];

        // Mapear cada adjunto a un registro de historial manteniendo el layout existente
        const mapped: PatientHistoryRecord[] = items.map((item) => ({
          id: item.id,
          date: item.createdAt,
          type: beautifyCategory(item.fileCategory),
          doctor: item.doctor?.user?.displayName || item.uploadedByUser?.displayName || 'No especificado',
          diagnosis: item.medicalService?.name || 'No especificado',
          notes: item.description || '',
          attachments: [
            {
              name: item.objectName,
              objectKey: item.objectKey,
            },
          ],
        }));

        if (!aborted) setHistory(mapped);
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : 'Error desconocido al cargar historial');
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    fetchPatientHistory();

    return () => {
      aborted = true;
    };
  }, [patientId, user]);

  if (!patientId) return null;

  const handleViewAttachment = async (objectKey?: string, fileName?: string) => {
    if (!objectKey || !user) return;
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/attachments/presigned-get-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          objectKey,
          disposition: 'inline',
          fileName: fileName ?? undefined,
        }),
      });
      if (!resp.ok) throw new Error('No se pudo obtener URL de descarga');
      const data: { data: { presignedUrl: string } } = await resp.json();
      window.open(data.data.presignedUrl, '_blank');
    } catch {
      // Falla silenciosa en esta vista
      // console.error(e);
    }
  };

  return (
    <ScrollArea className="h-[400px] flex-grow pr-6 -mr-6">
      <div className="space-y-6 py-4">
        {loading && (
          <p className="text-center text-muted-foreground py-8">Cargando historial...</p>
        )}
        {!loading && error && (
          <p className="text-center text-red-500 py-8">{error}</p>
        )}
        {!loading && !error && history.length > 0 ? (
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
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{record.notes || 'Sin notas'}</p>
              </div>
              {record.attachments && record.attachments.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-1">Archivos Adjuntos:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {record.attachments.map((att, index) => (
                      <li key={`${record.id}-${index}`} className="text-sm">
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); handleViewAttachment(att.objectKey, att.name); }}
                          className="text-blue-600 hover:underline"
                        >
                          {att.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (!loading && !error && (
          <p className="text-center text-muted-foreground py-8">No hay historial médico disponible para este paciente.</p>
        ))}
      </div>
    </ScrollArea>
  );
}

function beautifyCategory(category: string | undefined): string {
  if (!category) return 'Documento';
  const map: Record<string, string> = {
    medical_document: 'Documento Médico',
    lab_result: 'Resultado de Laboratorio',
    imaging: 'Imagen Diagnóstica',
    prescription: 'Receta',
    referral: 'Referencia',
  };
  return map[category] ?? capitalize(category.replaceAll('_', ' '));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
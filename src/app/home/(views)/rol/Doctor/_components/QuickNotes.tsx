// src/app/dashboard/2/compo/QuickNotes.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MicIcon, SaveIcon } from "lucide-react"; // Asumiendo lucide-react
import { useState } from "react";

interface QuickNotesProps {
  appointmentId: string | null; // Para asociar la nota a una cita específica
  patientName?: string;
}

export function QuickNotes({ appointmentId, patientName }: QuickNotesProps) {
  const [noteContent, setNoteContent] = useState("");
  const [isRecording, setIsRecording] = useState(false); // Estado para simular grabación

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    // Lógica para guardar la nota (ej. enviar a API)
    // Nota guardada - log removido para producción
    setNoteContent(""); // Limpiar después de guardar
    alert("Nota guardada (simulación)");
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Aquí iría la lógica para iniciar el reconocimiento de voz
      // Por ahora, solo simulamos y añadimos texto de ejemplo
      setNoteContent(prev => prev + (prev ? " " : "") + "El paciente refiere...");
      alert("Simulando inicio de reconocimiento de voz...");
    } else {
      // Lógica para detener el reconocimiento de voz
      alert("Simulando fin de reconocimiento de voz.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas Rápidas de Consulta</CardTitle>
        {patientName && <CardDescription>Para: {patientName}</CardDescription>}
        {!patientName && <CardDescription>Selecciona una cita para tomar notas.</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={appointmentId ? "Escribe tus notas aquí o usa el micrófono..." : "Selecciona una cita para activar las notas."}
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          rows={6}
          disabled={!appointmentId}
        />
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleRecording} 
            disabled={!appointmentId}
            title={isRecording ? "Detener grabación" : "Iniciar reconocimiento de voz"}
          >
            <MicIcon className={`h-5 w-5 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
          </Button>
          <span className="text-xs text-muted-foreground">
            {isRecording ? "Grabando..." : "Reconocimiento de voz (simulado)"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveNote} disabled={!noteContent.trim() || !appointmentId}>
          <SaveIcon className="mr-2 h-4 w-4" /> Guardar Nota
        </Button>
      </CardFooter>
    </Card>
  );
}
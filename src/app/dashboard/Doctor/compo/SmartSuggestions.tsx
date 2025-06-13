// src/app/dashboard/2/compo/SmartSuggestions.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { Lightbulb, CheckCircle, AlertTriangle } from "lucide-react"; // Asumiendo lucide-react
import { ScrollArea } from "@rutas/components/ui/scroll-area";

interface Suggestion {
  id: string;
  type: 'diagnosis' | 'treatment' | 'follow-up' | 'preventive';
  text: string;
  relevance: 'high' | 'medium' | 'low';
  source?: string; // e.g., "Basado en historial similar", "Protocolo estándar"
}

// Mock data - en una aplicación real, esto vendría de una IA o sistema de reglas
const mockSuggestions: Suggestion[] = [
  {
    id: "sug1",
    type: "diagnosis",
    text: "Considerar prueba de alergia para paciente con rinitis persistente.",
    relevance: "high",
    source: "Patrón en pacientes similares",
  },
  {
    id: "sug2",
    type: "treatment",
    text: "Para insomnio leve, sugerir técnicas de higiene del sueño antes de medicar.",
    relevance: "medium",
    source: "Guías de práctica clínica",
  },
  {
    id: "sug3",
    type: "follow-up",
    text: "Programar revisión de lípidos en 6 meses para paciente con colesterol limítrofe.",
    relevance: "high",
  },
  {
    id: "sug4",
    type: "preventive",
    text: "Recordar al paciente la importancia de la vacuna antigripal anual (temporada actual).",
    relevance: "medium",
    source: "Recomendación estacional",
  },
];

interface SmartSuggestionsProps {
  patientId: string | null; // Para contextualizar las sugerencias
  currentCondition?: string; // Condición actual que podría influir
}

export function SmartSuggestions({ patientId, currentCondition }: SmartSuggestionsProps) {
  // Lógica para obtener sugerencias basadas en patientId y currentCondition
  // Por ahora, usamos mockSuggestions filtradas si hay un paciente
  const activeSuggestions = patientId ? mockSuggestions : [];

  const getRelevanceColor = (relevance: 'high' | 'medium' | 'low') => {
    if (relevance === 'high') return 'text-red-500';
    if (relevance === 'medium') return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-primary" />
          Sugerencias Inteligentes
        </CardTitle>
        <CardDescription>
          {patientId 
            ? `Recomendaciones para el paciente actual (basadas en ${currentCondition || 'historial'}).`
            : "Selecciona un paciente para ver sugerencias contextuales."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeSuggestions.length > 0 ? (
          <ScrollArea className="h-[280px]"> {/* Altura ajustable */}
            <div className="space-y-3 pr-3">
              {activeSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="p-3 border rounded-md bg-card hover:shadow-sm">
                  <div className="flex items-start">
                    <div className={`mr-3 mt-1 ${getRelevanceColor(suggestion.relevance)}`}>
                      {suggestion.relevance === 'high' && <AlertTriangle size={18} />}
                      {suggestion.relevance === 'medium' && <Lightbulb size={18} />}
                      {suggestion.relevance === 'low' && <CheckCircle size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{suggestion.text}</p>
                      <div className="text-xs text-muted-foreground mt-1 space-x-2">
                        <span>Tipo: <span className="capitalize font-semibold">{suggestion.type}</span></span>
                        {suggestion.source && <span>Fuente: {suggestion.source}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button variant="ghost" size="sm">Descartar</Button>
                    <Button variant="outline" size="sm">Aplicar/Más Info</Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {patientId ? "No hay sugerencias específicas en este momento." : "Las sugerencias aparecerán aquí al seleccionar un paciente."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
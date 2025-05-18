// src/app/dashboard/3/compo/CommunicationTemplates.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { ClipboardCopy, Edit3, PlusCircle, Search } from "lucide-react";
import { useState } from 'react';
import { Input } from "@rutas/components/ui/input";
import { Textarea } from "@rutas/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rutas/components/ui/dialog";
import { Label } from "@rutas/components/ui/label";

interface Template {
  id: string;
  name: string;
  category: string; // Ej: Recordatorios, Confirmaciones, Seguimiento, Informativos
  content: string;
  placeholders?: string[]; // Ej: [NOMBRE_PACIENTE], [FECHA_CITA], [HORA_CITA]
}

// Mock data
const mockTemplates: Template[] = [
  {
    id: "tpl1",
    name: "Recordatorio de Cita General",
    category: "Recordatorios",
    content: "Hola [NOMBRE_PACIENTE], te recordamos tu cita para el [FECHA_CITA] a las [HORA_CITA]. Por favor, confirma tu asistencia. ¡Gracias!",
    placeholders: ["[NOMBRE_PACIENTE]", "[FECHA_CITA]", "[HORA_CITA]"]
  },
  {
    id: "tpl2",
    name: "Confirmación de Cita",
    category: "Confirmaciones",
    content: "Estimado/a [NOMBRE_PACIENTE], tu cita para el [FECHA_CITA] a las [HORA_CITA] con el Dr./Dra. [NOMBRE_DOCTOR] ha sido confirmada. ¡Te esperamos!",
    placeholders: ["[NOMBRE_PACIENTE]", "[FECHA_CITA]", "[HORA_CITA]", "[NOMBRE_DOCTOR]"]
  },
  {
    id: "tpl3",
    name: "Solicitud de Feedback Post-Consulta",
    category: "Seguimiento",
    content: "Hola [NOMBRE_PACIENTE], esperamos que tu consulta haya sido satisfactoria. Nos encantaría conocer tu opinión: [LINK_ENCUESTA]. ¡Gracias por tu tiempo!",
    placeholders: ["[NOMBRE_PACIENTE]", "[LINK_ENCUESTA]"]
  },
  {
    id: "tpl4",
    name: "Información Pre-Operatoria",
    category: "Informativos",
    content: "Estimado/a [NOMBRE_PACIENTE], para tu procedimiento el [FECHA_CITA], recuerda: [INSTRUCCIONES_PREVIAS]. Si tienes dudas, contáctanos.",
    placeholders: ["[NOMBRE_PACIENTE]", "[FECHA_CITA]", "[INSTRUCCIONES_PREVIAS]"]
  },
];

export function CommunicationTemplates() {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // Podrías añadir un toast de notificación aquí
    alert("Plantilla copiada al portapapeles");
  };

  const openModal = (template?: Template) => {
    if (template) {
      setCurrentTemplate(template);
      setIsEditing(true);
    } else {
      setCurrentTemplate({ id: `tpl-${Date.now()}`, name: '', category: '', content: '', placeholders: [] });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!currentTemplate) return;

    if (isEditing) {
      setTemplates(templates.map(t => t.id === currentTemplate.id ? currentTemplate : t));
    } else {
      setTemplates([...templates, currentTemplate]);
    }
    setIsModalOpen(false);
    setCurrentTemplate(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center">
                    <ClipboardCopy className="h-5 w-5 mr-2 text-primary" />
                    Plantillas de Comunicación
                </CardTitle>
                <CardDescription>
                    Gestiona y utiliza plantillas para mensajes frecuentes.
                </CardDescription>
            </div>
            <Button onClick={() => openModal()} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" /> Nueva Plantilla
            </Button>
        </div>
        <div className="relative mt-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar plantillas por nombre o categoría..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        {filteredTemplates.length > 0 ? (
          <ScrollArea className="h-[400px]"> {/* Altura ajustable */}
            <div className="space-y-3 pr-3">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="p-3 border rounded-md bg-card hover:shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground">Categoría: {template.category}</p>
                    </div>
                    <div className="space-x-2 flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => openModal(template)} title="Editar">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(template.content)}>
                            <ClipboardCopy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-sm whitespace-pre-wrap">{template.content}</p>
                  {template.placeholders && template.placeholders.length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Placeholders: {template.placeholders.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No se encontraron plantillas o no hay plantillas creadas.</p>
        )}
      </CardContent>

      {isModalOpen && currentTemplate && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Plantilla" : "Crear Nueva Plantilla"}</DialogTitle>
              <DialogDescription>
                {isEditing ? `Modifica los detalles de la plantilla "${currentTemplate.name}".` : "Completa los detalles para la nueva plantilla."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tpl-name" className="text-right">Nombre</Label>
                <Input id="tpl-name" value={currentTemplate.name} onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tpl-category" className="text-right">Categoría</Label>
                <Input id="tpl-category" value={currentTemplate.category} onChange={(e) => setCurrentTemplate({...currentTemplate, category: e.target.value})} className="col-span-3" placeholder="Ej: Recordatorios, Informativos"/>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="tpl-content" className="text-right pt-2">Contenido</Label>
                <Textarea id="tpl-content" value={currentTemplate.content} onChange={(e) => setCurrentTemplate({...currentTemplate, content: e.target.value})} className="col-span-3 min-h-[150px]" placeholder="Escribe el contenido de la plantilla. Usa placeholders como [NOMBRE_PACIENTE]."/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tpl-placeholders" className="text-right">Placeholders</Label>
                <Input id="tpl-placeholders" value={currentTemplate.placeholders?.join(', ') || ''} onChange={(e) => setCurrentTemplate({...currentTemplate, placeholders: e.target.value.split(',').map(p => p.trim())})} className="col-span-3" placeholder="Ej: [NOMBRE_PACIENTE], [FECHA_CITA]"/>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveTemplate}>Guardar Plantilla</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
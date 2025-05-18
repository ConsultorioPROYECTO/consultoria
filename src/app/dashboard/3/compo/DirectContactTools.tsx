// src/app/dashboard/3/compo/DirectContactTools.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { Phone, MessageSquare, Video, Users } from "lucide-react";
import { useState } from 'react';
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rutas/components/ui/dialog";

// Mock data for patients/contacts - in a real app, this would come from an API
const mockContacts = [
  { id: "pat1", name: "Ana Torres", type: "Patient" },
  { id: "pat2", name: "Luis Fernández", type: "Patient" },
  { id: "doc1", name: "Dr. Alan Grant", type: "Doctor" },
  { id: "staff1", name: "Laura Palmer", type: "Staff" },
];

export function DirectContactTools() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; description: string; action: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<{id: string, name: string} | null>(null);

  const openContactModal = (action: string, contact?: {id: string, name: string}) => {
    let title = "";
    let description = "";
    if (contact) {
        setSelectedContact(contact);
        if (action === "call") {
            title = `Iniciar Llamada con ${contact.name}`;
            description = `Estás a punto de iniciar una llamada con ${contact.name}.`;
        } else if (action === "message") {
            title = `Enviar Mensaje a ${contact.name}`;
            description = `Redacta y envía un mensaje directo a ${contact.name}.`;
        } else if (action === "video") {
            title = `Iniciar Videollamada con ${contact.name}`;
            description = `Estás a punto de iniciar una videollamada con ${contact.name}.`;
        }
    } else {
        setSelectedContact(null); // For general actions like group call
        if (action === "groupCall") {
            title = "Iniciar Llamada Grupal";
            description = "Selecciona participantes para una llamada grupal.";
        }
    }
    setModalContent({ title, description, action });
    setIsModalOpen(true);
  };

  const handleAction = () => {
    if (modalContent && selectedContact) {
      // Simulate action
      console.log(`${modalContent.action} initiated with ${selectedContact.name}`);
    } else if (modalContent) {
      console.log(`${modalContent.action} initiated`);
    }
    setIsModalOpen(false);
    setModalContent(null);
    setSelectedContact(null);
  };

  const filteredContacts = mockContacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Phone className="h-5 w-5 mr-2 text-primary" />
          Herramientas de Contacto Directo
        </CardTitle>
        <CardDescription>
          Inicia llamadas, envía mensajes o comienza videollamadas rápidamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={() => openContactModal("call", mockContacts[0])} className="w-full">
            <Phone className="h-4 w-4 mr-2" /> Llamar
          </Button>
          <Button onClick={() => openContactModal("message", mockContacts[1])} className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" /> Mensaje
          </Button>
          <Button onClick={() => openContactModal("video", mockContacts[2])} className="w-full">
            <Video className="h-4 w-4 mr-2" /> Videollamada
          </Button>
          <Button onClick={() => openContactModal("groupCall")} variant="outline" className="w-full">
            <Users className="h-4 w-4 mr-2" /> Llamada Grupal
          </Button>
        </div>
        
        <div>
          <Label htmlFor="search-contact">Buscar Contacto Rápido</Label>
          <Input 
            id="search-contact"
            type="text" 
            placeholder="Escribe nombre de paciente, doctor o personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
          {searchTerm && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
              {filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    className="p-2 hover:bg-muted/50 cursor-pointer flex justify-between items-center"
                    // onClick={() => openContactModal("call", contact)} // Example: default to call
                  >
                    <span>{contact.name} <span className="text-xs text-muted-foreground">({contact.type})</span></span>
                    <div className="space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openContactModal("call", contact)}><Phone className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openContactModal("message", contact)}><MessageSquare className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openContactModal("video", contact)}><Video className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-2 text-sm text-muted-foreground">No se encontraron contactos.</p>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {modalContent && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{modalContent.title}</DialogTitle>
              <DialogDescription>
                {modalContent.description}
              </DialogDescription>
            </DialogHeader>
            {/* Aquí podrías agregar campos específicos para cada acción, ej. un textarea para mensajes */} 
            {modalContent.action === "message" && selectedContact && (
                <div className="mt-4">
                    <Label htmlFor="message-content">Mensaje para {selectedContact.name}</Label>
                    <textarea id="message-content" className="mt-1 w-full p-2 border rounded-md min-h-[100px]" placeholder="Escribe tu mensaje..."></textarea>
                </div>
            )}
            {modalContent.action === "groupCall" && (
                <div className="mt-4">
                    <Label>Seleccionar participantes:</Label>
                    {/* Aquí iría un selector múltiple de contactos */} 
                    <p className="text-sm text-muted-foreground mt-1">Funcionalidad de selección de participantes para llamada grupal pendiente de implementación.</p>
                </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAction}>Confirmar {modalContent.action.includes("Call") ? "Llamada" : "Acción"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
'use client';

import { CreatePatientCard } from "./_components/CreatePatientCard";
import { useAuth } from "../../context/AuthContext";
import { PatientsTable } from "./_components/PatientsTable";
import { PatientsOverview } from "./_components/PatientsOverview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatsView from "./chat/chats";
import { Users, MessageCircle } from "lucide-react";




export default function PatientsView() {
  const { user } = useAuth();
  
  // Obtener y formatear los dos primeros nombres del usuario
  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Hola, {displayTwoNames}
        </h1>
        <p className="text-muted-foreground">
          Gestión completa de pacientes y su información médica.
        </p>
      </div>
      
      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="chats" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chats
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="patients" className="mt-6">
          <div className="grid gap-6">
            {/* Primera fila: Estadísticas y Acciones Rápidas */}
            <div className="grid gap-6 lg:grid-cols-2">
              <PatientsOverview />
              <CreatePatientCard />
            </div>

            {/* Segunda fila: Tabla de Pacientes */}
            <div className="grid gap-6">
              <PatientsTable />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="chats" className="mt-6">
          <ChatsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
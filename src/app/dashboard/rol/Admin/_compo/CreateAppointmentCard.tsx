'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Plus } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import WaveformLoader from '@/components/custom/WaveformLoader';

// Lazy load del modal para evitar problemas de prerender
const CreateAppointmentModal = dynamic(() => import('./CreateAppointmentModal').then(mod => ({ default: mod.CreateAppointmentModal })), {
  loading: () => (
    <div className="flex items-center justify-center p-4">
      <WaveformLoader className="w-12 h-12 text-muted-foreground" />
    </div>
  ),
  ssr: false
});

/**
 * Interfaz para la respuesta de creación de cita
 */
interface CreateAppointmentResponse {
  appointmentId: number;
  googleEventId: string | null;
  googleCalendarId: string | null;
  status: string;
  syncStatus: string;
}

interface CreateAppointmentCardProps {
  onAppointmentCreated?: (appointment: CreateAppointmentResponse) => void;
}

export function CreateAppointmentCard({ onAppointmentCreated }: CreateAppointmentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);


  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAppointmentCreated = (appointment: CreateAppointmentResponse) => {
    if (onAppointmentCreated) {
      onAppointmentCreated(appointment);
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <Card className="flex flex-col justify-between h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-start justify-between">
            Crear Nueva Cita
            <Button 
              size="sm" 
              className="ml-2 selection:bg-secondary selection:text-primary" 
              onClick={handleOpenModal}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nueva Cita
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
          <div className="text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Haga clic en &quot;Nueva Cita&quot; para programar una cita médica.</p>
          </div>
        </CardContent>
      </Card>

      <CreateAppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </>
  );
}
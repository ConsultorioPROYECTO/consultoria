'use client';

import React from 'react';
import { CreateAppointmentModal } from '../Doctor/compo/CreateAppointmentModal';

/**
 * @typedef {object} ImportantNotificationsProps
 * @description Propiedades para el componente ImportantNotifications.
 */
type ImportantNotificationsProps = {
  onAppointmentCreated?: (appointment: any) => void;
};

/**
 * Componente para crear citas médicas con integración completa al backend.
 * @returns {React.ReactElement} El componente de creación de citas.
 */
const ImportantNotifications: React.FC<ImportantNotificationsProps> = ({ onAppointmentCreated }) => {
  const handleAppointmentCreated = (appointment: any) => {
    // Callback cuando se crea una cita exitosamente
    if (onAppointmentCreated) {
      onAppointmentCreated(appointment);
    }
    
    // Aquí podrías agregar lógica adicional como:
    // - Actualizar el estado global
    // - Mostrar notificaciones
    // - Refrescar la lista de citas
    console.log('Nueva cita creada:', appointment);
  };

  return (
    <CreateAppointmentModal onAppointmentCreated={handleAppointmentCreated} />
  );
};

export { ImportantNotifications };
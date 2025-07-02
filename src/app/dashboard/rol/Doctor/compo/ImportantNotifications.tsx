'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@rutas/components/ui/card';
import { Button } from '@rutas/components/ui/button';
import { Input } from '@rutas/components/ui/input';
import { Label } from '@rutas/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rutas/components/ui/select';
import { Textarea } from '@rutas/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@rutas/components/ui/dialog';
import { Switch } from '@rutas/components/ui/switch';
import { Calendar } from '@rutas/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@rutas/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@rutas/app/context/AuthContext';
import { usePatients } from '@rutas/hooks/usePatients';
import { useMedicalServices, MedicalService } from '@rutas/hooks/useMedicalServices';
import { getFirebaseAuthToken } from '@rutas/app/lib/firebase/clientUtils';

/**
 * @typedef {object} CreateAppointmentRequest
 * @description Datos para crear una nueva cita.
 */
interface CreateAppointmentRequest {
  doctorId: number;
  patientId: number;
  serviceId: number;
  date: string;
  time: string;
  isVirtual?: boolean;
  meetingLink?: string;
  notes?: string;
}

/**
 * @typedef {object} DoctorInfo
 * @description Información del doctor actual.
 */
interface DoctorInfo {
  idDoctor: number;
  firstName: string;
  lastName: string;
}

/**
 * @typedef {object} ImportantNotificationsProps
 * @description Propiedades para el componente ImportantNotifications.
 */
type ImportantNotificationsProps = Record<string, never>;

/**
 * Componente para crear citas médicas.
 * @returns {React.ReactElement} El componente de creación de citas.
 */
const ImportantNotifications: React.FC<ImportantNotificationsProps> = () => {
  const { user } = useAuth();
  const { patients, loading: patientsLoading } = usePatients();
  const { services: medicalServices, loading: servicesLoading } = useMedicalServices();
  
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateAppointmentRequest>({
    doctorId: 0,
    patientId: 0,
    serviceId: 0,
    date: '',
    time: '',
    isVirtual: false,
    meetingLink: '',
    notes: ''
  });

  // Obtener información del doctor actual
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!user) return;
      
      try {
        const token = await getFirebaseAuthToken();
        if (!token) return;
        
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const users = await response.json();
          const currentUser = users.find((u: { firebaseUid: string; idDoctor?: number; firstName: string; lastName: string }) => u.firebaseUid === user.uid);
          
          if (currentUser && currentUser.idDoctor) {
            setDoctorInfo({
              idDoctor: currentUser.idDoctor,
              firstName: currentUser.firstName,
              lastName: currentUser.lastName
            });
            
            setFormData(prev => ({
              ...prev,
              doctorId: currentUser.idDoctor
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching doctor info:', error);
      }
    };
    
    fetchDoctorInfo();
  }, [user]);

  const handleInputChange = (field: keyof CreateAppointmentRequest, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({
        ...prev,
        date: format(date, 'yyyy-MM-dd')
      }));
      setIsCalendarOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorInfo) {
      alert('No se pudo obtener la información del doctor');
      return;
    }
    
    if (!formData.patientId || !formData.serviceId || !formData.date || !formData.time) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    if (formData.isVirtual && !formData.meetingLink) {
      alert('Por favor proporcione el enlace de la reunión para citas virtuales');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = await getFirebaseAuthToken();
      if (!token) {
        alert('Error de autenticación');
        return;
      }
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await response.json();
        alert('Cita creada exitosamente');
        setIsDialogOpen(false);
        // Resetear formulario
        setFormData({
          doctorId: doctorInfo.idDoctor,
          patientId: 0,
          serviceId: 0,
          date: '',
          time: '',
          isVirtual: false,
          meetingLink: '',
          notes: ''
        });
        setSelectedDate(undefined);
      } else {
        const error = await response.json();
        alert(`Error al crear la cita: ${error.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error al crear la cita');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="flex flex-col justify-between h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-semibold flex items-center justify-between">
          Crear Nueva Cita
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-2">
                <Plus className="h-4 w-4 mr-1" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Cita</DialogTitle>
                <DialogDescription>
                  Complete los detalles para programar una nueva cita médica.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Selección de Paciente */}
                <div className="space-y-2">
                  <Label htmlFor="patient">Paciente *</Label>
                  <Select 
                    value={formData.patientId.toString()} 
                    onValueChange={(value) => handleInputChange('patientId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsLoading ? (
                        <SelectItem value="loading" disabled>Cargando pacientes...</SelectItem>
                      ) : (
                        patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.firstName} {patient.lastName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selección de Servicio */}
                <div className="space-y-2">
                  <Label htmlFor="service">Servicio Médico *</Label>
                  <Select 
                    value={formData.serviceId.toString()} 
                    onValueChange={(value) => handleInputChange('serviceId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicesLoading ? (
                        <SelectItem value="loading" disabled>Cargando servicios...</SelectItem>
                      ) : (
                        medicalServices.map((service: MedicalService) => (
                           <SelectItem key={service.id} value={service.id.toString()}>
                             {service.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha */}
                <div className="space-y-2">
                  <Label>Fecha *</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Hora */}
                <div className="space-y-2">
                  <Label htmlFor="time">Hora *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    required
                  />
                </div>

                {/* Cita Virtual */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="virtual"
                    checked={formData.isVirtual}
                    onCheckedChange={(checked) => handleInputChange('isVirtual', checked)}
                  />
                  <Label htmlFor="virtual">Cita Virtual</Label>
                </div>

                {/* Enlace de Reunión (solo si es virtual) */}
                {formData.isVirtual && (
                  <div className="space-y-2">
                    <Label htmlFor="meetingLink">Enlace de Reunión *</Label>
                    <Input
                      id="meetingLink"
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={formData.meetingLink}
                      onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                      required={formData.isVirtual}
                    />
                  </div>
                )}

                {/* Notas */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (Opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionales sobre la cita..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !doctorInfo}
                  >
                    {isSubmitting ? 'Creando...' : 'Crear Cita'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
        <div className="text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Haga clic en &quot;Nueva Cita&quot; para programar una cita médica.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export { ImportantNotifications };

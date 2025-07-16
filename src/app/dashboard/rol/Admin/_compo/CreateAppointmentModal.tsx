'use client';

import React, { useState, useEffect, useCallback } from 'react';
import WaveformLoader from '@/components/custom/WaveformLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/app/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

/**
 * Interfaz para los datos de creación de cita
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
 * Interfaz para pacientes
 */
interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

/**
 * Interfaz para servicios médicos
 */
interface MedicalService {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice?: number;
}

/**
 * Interfaz para usuarios del sistema
 */
interface User {
  id: number;
  firebaseUid: string;
  email: string;
  emailVerified: boolean | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string | null;
  role: string;
  isActive: boolean;
  organizationId: number | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  idDoctor: number | null;
  idAssistant: number | null;
}

/**
 * Interfaz para médicos
 */
interface Doctor {
  id: number;
  idDoctor: number;
  displayName: string;
  email: string;
  role: string;
}

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

/**
 * Props del componente
 */
interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentCreated?: (appointment: CreateAppointmentResponse) => void;
  contextDoctorId?: number;
}

/**
 * Componente para crear citas médicas con integración completa al backend
 */
export function CreateAppointmentModal({ isOpen, onClose, onAppointmentCreated, contextDoctorId }: CreateAppointmentModalProps) {
  const { user, userRole } = useAuth();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Estados para los datos del formulario
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

  // Estados para los datos de las APIs
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medicalServices, setMedicalServices] = useState<MedicalService[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  
  // Estados para los Combobox
  const [openDoctorCombo, setOpenDoctorCombo] = useState(false);
  const [openPatientCombo, setOpenPatientCombo] = useState(false);
  const [openServiceCombo, setOpenServiceCombo] = useState(false);



  /**
   * Obtener lista de pacientes
   */
  const fetchPatients = useCallback(async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener pacientes');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Error al cargar pacientes', {
        description: 'No se pudieron cargar los pacientes disponibles',
        duration: 4000,
      });
      return [];
    }
  }, [user]);

  /**
   * Obtener lista de servicios médicos
   */
  const fetchMedicalServices = useCallback(async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const response = await fetch('/api/medical-services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener servicios médicos');
      }

      const data = await response.json();
      return data.data.services || [];
    } catch (error) {
      console.error('Error fetching medical services:', error);
      toast.error('Error al cargar servicios médicos', {
        description: 'No se pudieron cargar los servicios disponibles',
        duration: 4000,
      });
      return [];
    }
  }, [user]);

  /**
   * Obtener lista de médicos
   */
  const fetchDoctors = useCallback(async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      // Determinar el endpoint basado en el rol del usuario
      const endpoint = userRole === 'asistente'
        ? '/api/assistants/doctors-with-appointments'
        : '/api/users';

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener médicos');
      }

      const data = await response.json();
      
      // Si el endpoint es el de asistentes, la data ya viene lista
      if (userRole === 'asistente') {
        return data.doctors || [];
      }

      // Para admin, filtrar solo usuarios con rol 'medico' y que tengan idDoctor
      const doctorsOnly = data.filter((user: User) => user.role === 'medico' && user.idDoctor) || [];
      return doctorsOnly;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Error al cargar médicos', {
        description: 'No se pudieron cargar los médicos disponibles',
        duration: 4000,
      });
      return [];
    }
  }, [user]);

  /**
   * Cargar datos iniciales cuando se abre el modal
   */
  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [patientsResult, servicesResult, doctorsResult] = await Promise.all([
        fetchPatients(),
        fetchMedicalServices(),
        fetchDoctors()
      ]);

      setPatients(patientsResult);
      setMedicalServices(servicesResult);
      setDoctors(doctorsResult);
      
      // Actualizar el doctorId en el formulario usando el contexto
      setFormData(prev => ({
        ...prev,
        doctorId: contextDoctorId || 0
      }));
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Error al cargar datos iniciales', {
        description: 'No se pudieron cargar los datos necesarios. Por favor, intente nuevamente.',
        duration: 5000,
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [contextDoctorId, fetchPatients, fetchMedicalServices, fetchDoctors]);

  /**
   * Efecto para cargar datos cuando se abre el modal
   */
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, loadInitialData]);

  /**
   * Manejar cambios en los campos del formulario
   */
  const handleInputChange = (field: keyof CreateAppointmentRequest, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Manejar selección de fecha
   */
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

  /**
   * Crear la cita
   */
  const createAppointment = async (appointmentData: CreateAppointmentRequest) => {
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Error al crear la cita');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  };

  /**
   * Manejar envío del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.doctorId || !formData.patientId || !formData.serviceId || !formData.date || !formData.time) {
      toast.error('Por favor complete todos los campos requeridos', {
        description: 'Todos los campos marcados con * son obligatorios',
        duration: 4000,
      });
      return;
    }
    
    if (formData.isVirtual && !formData.meetingLink) {
      toast.error('Enlace de reunión requerido', {
        description: 'Por favor proporcione el enlace de la reunión para citas virtuales',
        duration: 4000,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await createAppointment(formData);
      
      toast.success('¡Cita creada exitosamente!', {
        description: `Cita programada para el ${formData.date} a las ${formData.time}`,
        duration: 5000,
      });
      
      // Llamar callback si existe
      if (onAppointmentCreated) {
        onAppointmentCreated(result);
      }
      
      // Cerrar modal y resetear formulario
      onClose();
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al crear la cita', {
        description: errorMessage,
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resetear formulario
   */
  const resetForm = () => {
    setFormData({
      doctorId: contextDoctorId || 0,
      patientId: 0,
      serviceId: 0,
      date: '',
      time: '',
      isVirtual: false,
      meetingLink: '',
      notes: ''
    });
    setSelectedDate(undefined);
  };

  /**
   * Manejar cierre del modal
   */
  const handleCloseDialog = useCallback(() => {
    onClose();
    resetForm();
  }, [onClose]);

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[90vh]">
            <div className="overflow-y-auto">
              <DrawerHeader className="text-left px-4">
                <DrawerTitle>Crear Nueva Cita</DrawerTitle>
                <DrawerDescription>
                  Complete los detalles para programar una nueva cita médica.
                </DrawerDescription>
              </DrawerHeader>
              <div className="pb-4 px-4">
                <FormContent
                  formData={formData}
                  doctors={doctors}
                  patients={patients}
                  medicalServices={medicalServices}
                  selectedDate={selectedDate}
                  isLoading={isLoading}
                  isLoadingData={isLoadingData}
                  openDoctorCombo={openDoctorCombo}
                  setOpenDoctorCombo={setOpenDoctorCombo}
                  openPatientCombo={openPatientCombo}
                  setOpenPatientCombo={setOpenPatientCombo}
                  openServiceCombo={openServiceCombo}
                  setOpenServiceCombo={setOpenServiceCombo}
                  isCalendarOpen={isCalendarOpen}
                  setIsCalendarOpen={setIsCalendarOpen}
                  handleInputChange={handleInputChange}
                  handleDateSelect={handleDateSelect}
                  handleSubmit={handleSubmit}
                  handleCloseDialog={handleCloseDialog}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Cita</DialogTitle>
              <DialogDescription>
                Complete los detalles para programar una nueva cita médica.
              </DialogDescription>
            </DialogHeader>
            <FormContent
              formData={formData}
              doctors={doctors}
              patients={patients}
              medicalServices={medicalServices}
              selectedDate={selectedDate}
              isLoading={isLoading}
              isLoadingData={isLoadingData}
              openDoctorCombo={openDoctorCombo}
              setOpenDoctorCombo={setOpenDoctorCombo}
              openPatientCombo={openPatientCombo}
              setOpenPatientCombo={setOpenPatientCombo}
              openServiceCombo={openServiceCombo}
              setOpenServiceCombo={setOpenServiceCombo}
              isCalendarOpen={isCalendarOpen}
              setIsCalendarOpen={setIsCalendarOpen}
              handleInputChange={handleInputChange}
              handleDateSelect={handleDateSelect}
              handleSubmit={handleSubmit}
              handleCloseDialog={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

interface FormContentProps {
  formData: CreateAppointmentRequest;
  doctors: Doctor[];
  patients: Patient[];
  medicalServices: MedicalService[];
  selectedDate: Date | undefined;
  isLoading: boolean;
  isLoadingData: boolean;
  openDoctorCombo: boolean;
  setOpenDoctorCombo: React.Dispatch<React.SetStateAction<boolean>>;
  openPatientCombo: boolean;
  setOpenPatientCombo: React.Dispatch<React.SetStateAction<boolean>>;
  openServiceCombo: boolean;
  setOpenServiceCombo: React.Dispatch<React.SetStateAction<boolean>>;
  isCalendarOpen: boolean;
  setIsCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleInputChange: (field: keyof CreateAppointmentRequest, value: string | number | boolean) => void;
  handleDateSelect: (date: Date | undefined) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleCloseDialog: () => void;
}

// Componente del contenido del formulario
const FormContent = React.memo<FormContentProps>(({ 
  formData,
  doctors,
  patients,
  medicalServices,
  selectedDate,
  isLoading,
  isLoadingData,
  openDoctorCombo,
  setOpenDoctorCombo,
  openPatientCombo,
  setOpenPatientCombo,
  openServiceCombo,
  setOpenServiceCombo,
  isCalendarOpen,
  setIsCalendarOpen,
  handleInputChange,
  handleDateSelect,
  handleSubmit,
  handleCloseDialog
}) => (
    <>
      {isLoadingData ? (
        <div className="flex h-screen flex-col items-center justify-center">
          <WaveformLoader className="w-24 h-auto text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Selección de Médico */}
          <div className="grid gap-2">
            <Label htmlFor="doctor">Médico *</Label>
            <Popover open={openDoctorCombo} onOpenChange={setOpenDoctorCombo} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDoctorCombo}
                  className="w-full justify-between"
                >
                  {formData.doctorId > 0
                    ? doctors.find((doctor) => doctor.idDoctor === formData.doctorId)?.displayName
                    : "Seleccionar médico..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar médico..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ningún médico.</CommandEmpty>
                    <CommandGroup>
                      {doctors.map((doctor) => (
                        <CommandItem
                          key={doctor.idDoctor}
                          value={`${doctor.displayName} ${doctor.email}`}
                          onSelect={() => {
                            handleInputChange('doctorId', doctor.idDoctor);
                            setOpenDoctorCombo(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.doctorId === doctor.idDoctor ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-sm truncate">
                              {doctor.displayName}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {doctor.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selección de Paciente */}
          <div className="grid gap-2">
            <Label htmlFor="patient">Paciente *</Label>
            <Popover open={openPatientCombo} onOpenChange={setOpenPatientCombo} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPatientCombo}
                  className="w-full justify-between"
                >
                  {formData.patientId > 0
                    ? (() => {
                        const patient = patients.find((p) => p.id === formData.patientId);
                        return patient ? `${patient.firstName} ${patient.lastName}` : "Seleccionar paciente...";
                      })()
                    : "Seleccionar paciente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar paciente..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ningún paciente.</CommandEmpty>
                    <CommandGroup>
                      {patients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={`${patient.firstName} ${patient.lastName} ${patient.email || ''}`}
                          onSelect={() => {
                            handleInputChange('patientId', patient.id);
                            setOpenPatientCombo(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.patientId === patient.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="font-medium text-sm truncate">
                            {patient.firstName} {patient.lastName}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selección de Servicio */}
          <div className="grid gap-2">
            <Label htmlFor="service">Servicio Médico *</Label>
            <Popover open={openServiceCombo} onOpenChange={setOpenServiceCombo} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openServiceCombo}
                  className="w-full justify-between"
                >
                  {formData.serviceId > 0
                    ? medicalServices.find((service) => service.id === formData.serviceId)?.name
                    : "Seleccionar servicio..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar servicio..." />
                  <CommandList>
                    <CommandEmpty>No se encontró ningún servicio.</CommandEmpty>
                    <CommandGroup>
                      {medicalServices.map((service) => (
                        <CommandItem
                          key={service.id}
                          value={`${service.name} ${service.description || ''}`}
                          onSelect={() => {
                            handleInputChange('serviceId', service.id);
                            setOpenServiceCombo(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.serviceId === service.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-sm truncate flex-1 mr-3">
                              {service.name}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md whitespace-nowrap">
                              {service.durationMinutes}m
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha */}
          <div className="grid gap-2">
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
          <div className="grid gap-2">
            <Label htmlFor="time">Hora *</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
              required
            />
          </div>

          {/* Tipo de Cita */}
          <div className="grid gap-2">
            <Label>Tipo de Cita *</Label>
            <Tabs
              value={formData.isVirtual ? "virtual" : "presencial"}
              onValueChange={(value) => {
                handleInputChange('isVirtual', value === "virtual");
                // Limpiar el enlace si cambia a presencial
                if (value === "presencial") {
                  handleInputChange('meetingLink', '');
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="presencial" 
                  className="flex items-center gap-2"
                >
                  🏥 Presencial
                </TabsTrigger>
                <TabsTrigger 
                  value="virtual" 
                  className="flex items-center gap-2"
                >
                  💻 Virtual
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Enlace de Reunión (solo si es virtual) */}
          {formData.isVirtual && (
            <div className="grid gap-2">
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
          <div className="grid gap-2">
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
          <div className="grid grid-cols-2 gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCloseDialog}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                'Crear Cita'
              )}
            </Button>
          </div>
        </form>
      )}
    </>
  ));

FormContent.displayName = 'FormContent';
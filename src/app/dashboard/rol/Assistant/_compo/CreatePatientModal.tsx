'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Plus, UserPlus } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/app/context/AuthContext'

interface CreatePatientModalProps {
  onPatientCreated?: () => void
}

interface CreatePatientRequest {
  firstName: string
  lastName: string
  identificationType: string
  identificationNumber: string
  gender: string
  birthDate?: string
  phone?: string
  email?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  allergies?: string
  currentMedications?: string
  bloodType?: string
}

const IDENTIFICATION_TYPES = [
  { value: 'DNI', label: 'DNI - Documento Nacional de Identidad' },
  { value: 'CC', label: 'CC - Cédula de Ciudadanía' },
  { value: 'TI', label: 'TI - Tarjeta de Identidad' },
  { value: 'CE', label: 'CE - Cédula de Extranjería' },
  { value: 'PP', label: 'PP - Pasaporte' },
  { value: 'RC', label: 'RC - Registro Civil' },
  { value: 'AS', label: 'AS - Acta de Nacimiento' },
]

const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'Other', label: 'Otro' },
]

const BLOOD_TYPES = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
]

// Componente del formulario separado para evitar recreaciones
interface FormContentProps {
  formData: CreatePatientRequest
  handleInputChange: (field: keyof CreatePatientRequest, value: string) => void
  handleSubmit: (e: React.FormEvent) => void
  handleCloseDialog: () => void
  isLoading: boolean
}

const FormContent = React.memo(({ formData, handleInputChange, handleSubmit, handleCloseDialog, isLoading }: FormContentProps) => (
  <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información Personal Básica */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Información Personal</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Ingrese el nombre"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Ingrese el apellido"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="identificationType">Tipo de Identificación *</Label>
            <Select
              value={formData.identificationType}
              onValueChange={(value) => handleInputChange('identificationType', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione el tipo" />
              </SelectTrigger>
              <SelectContent>
                {IDENTIFICATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="identificationNumber">Número de Identificación *</Label>
            <Input
              id="identificationNumber"
              value={formData.identificationNumber}
              onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
              placeholder="Ingrese el número"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Género *</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => handleInputChange('gender', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bloodType">Tipo de Sangre</Label>
            <Select
              value={formData.bloodType}
              onValueChange={(value) => handleInputChange('bloodType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Información de Contacto */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Información de Contacto</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Ingrese el teléfono"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Ingrese el email"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Dirección</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Ingrese la dirección"
            rows={2}
          />
        </div>
      </div>

      {/* Contacto de Emergencia */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Contacto de Emergencia</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Nombre</Label>
            <Input
              id="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              placeholder="Nombre del contacto"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Teléfono</Label>
            <Input
              id="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
              placeholder="Teléfono del contacto"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emergencyContactRelation">Relación</Label>
            <Input
              id="emergencyContactRelation"
              value={formData.emergencyContactRelation}
              onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
              placeholder="Relación con el paciente"
            />
          </div>
        </div>
      </div>

      {/* Información Médica */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Información Médica</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="allergies">Alergias</Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              placeholder="Describa las alergias conocidas"
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currentMedications">Medicamentos Actuales</Label>
            <Textarea
              id="currentMedications"
              value={formData.currentMedications}
              onChange={(e) => handleInputChange('currentMedications', e.target.value)}
              placeholder="Liste los medicamentos que toma actualmente"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
        <Button
          type="button"
          variant="outline"
          onClick={handleCloseDialog}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Paciente'
          )}
        </Button>
      </div>
    </form>
  </>
))

FormContent.displayName = 'FormContent'

export function CreatePatientModal({ onPatientCreated }: CreatePatientModalProps) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CreatePatientRequest>({
    firstName: '',
    lastName: '',
    identificationType: '',
    identificationNumber: '',
    gender: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    allergies: '',
    currentMedications: '',
    bloodType: '',
  })

  const handleInputChange = useCallback((field: keyof CreatePatientRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      firstName: '',
      lastName: '',
      identificationType: '',
      identificationNumber: '',
      gender: '',
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      allergies: '',
      currentMedications: '',
      bloodType: '',
    })
  }, [])

  const validateForm = useCallback((): boolean => {
    if (!formData.firstName.trim()) {
      toast.error('El nombre es requerido')
      return false
    }
    if (!formData.lastName.trim()) {
      toast.error('El apellido es requerido')
      return false
    }
    if (!formData.identificationType) {
      toast.error('El tipo de identificación es requerido')
      return false
    }
    if (!formData.identificationNumber.trim()) {
      toast.error('El número de identificación es requerido')
      return false
    }
    if (!formData.gender) {
      toast.error('El género es requerido')
      return false
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('El formato del email no es válido')
      return false
    }
    return true
  }, [formData])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('Debe estar autenticado para registrar un paciente')
      return
    }
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Preparar los datos para enviar (remover campos vacíos opcionales)
      const dataToSend: Partial<CreatePatientRequest> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        identificationType: formData.identificationType,
        identificationNumber: formData.identificationNumber.trim(),
        gender: formData.gender,
      }

      // Agregar campos opcionales solo si tienen valor
      if (formData.birthDate) dataToSend.birthDate = formData.birthDate
      if (formData.phone?.trim()) dataToSend.phone = formData.phone.trim()
      if (formData.email?.trim()) dataToSend.email = formData.email.trim()
      if (formData.address?.trim()) dataToSend.address = formData.address.trim()
      if (formData.emergencyContactName?.trim()) dataToSend.emergencyContactName = formData.emergencyContactName.trim()
      if (formData.emergencyContactPhone?.trim()) dataToSend.emergencyContactPhone = formData.emergencyContactPhone.trim()
      if (formData.emergencyContactRelation?.trim()) dataToSend.emergencyContactRelation = formData.emergencyContactRelation.trim()
      if (formData.allergies?.trim()) dataToSend.allergies = formData.allergies.trim()
      if (formData.currentMedications?.trim()) dataToSend.currentMedications = formData.currentMedications.trim()
      if (formData.bloodType) dataToSend.bloodType = formData.bloodType

      const token = await user.getIdToken()

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear el paciente')
      }

      await response.json()
      
      toast.success('Paciente registrado exitosamente')
      resetForm()
      setIsDialogOpen(false)
      onPatientCreated?.()
    } catch (error) {
      console.error('Error creating patient:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear el paciente')
    } finally {
      setIsLoading(false)
    }
  }, [formData, onPatientCreated, validateForm, resetForm, user])

  const handleOpenDialog = () => {
    setIsDialogOpen(true)
  }

  const handleCloseDialog = useCallback(() => {
    resetForm()
    setIsDialogOpen(false)
  }, [resetForm])

  return (
    <Card className="flex flex-col justify-between h-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center justify-between">
          Registrar Nuevo Paciente
          {isMobile ? (
            <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DrawerTrigger asChild>
                <Button size="sm" className="ml-2" onClick={handleOpenDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Paciente
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[90vh]">
                <div className="overflow-y-auto">
                  <DrawerHeader className="text-left px-4">
                    <DrawerTitle>Registrar Nuevo Paciente</DrawerTitle>
                    <DrawerDescription>
                      Complete la información del paciente. Los campos marcados con * son obligatorios.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="pb-4 px-4">
                    <FormContent 
                      formData={formData}
                      handleInputChange={handleInputChange}
                      handleSubmit={handleSubmit}
                      handleCloseDialog={handleCloseDialog}
                      isLoading={isLoading}
                    />
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-2" onClick={handleOpenDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
                  <DialogDescription>
                    Complete la información del paciente. Los campos marcados con * son obligatorios.
                  </DialogDescription>
                </DialogHeader>
                <FormContent 
                   formData={formData}
                   handleInputChange={handleInputChange}
                   handleSubmit={handleSubmit}
                   handleCloseDialog={handleCloseDialog}
                   isLoading={isLoading}
                 />
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
        <div className="text-muted-foreground">
          <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Haga clic en &quot;Nuevo Paciente&quot; para registrar un paciente en el sistema.</p>
        </div>
      </CardContent>
    </Card>
  )
}
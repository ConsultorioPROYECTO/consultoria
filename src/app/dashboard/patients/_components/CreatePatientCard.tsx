'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, UserPlus } from 'lucide-react'
import { CreatePatientModal } from './CreatePatientModal'

interface CreatePatientCardProps {
  onPatientCreated?: () => void
}

export function CreatePatientCard({ onPatientCreated }: CreatePatientCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handlePatientCreated = () => {
    handleCloseModal()
    onPatientCreated?.()
  }

  return (
    <>
      <Card className="flex flex-col justify-between h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center justify-between">
            Registrar Nuevo Paciente
            <Button size="sm" className="ml-2" onClick={handleOpenModal}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Paciente
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
          <div className="text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Haga clic en &quot;Nuevo Paciente&quot; para registrar un paciente en el sistema.</p>
          </div>
        </CardContent>
      </Card>
      
      <CreatePatientModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPatientCreated={handlePatientCreated}
      />
    </>
  )
}
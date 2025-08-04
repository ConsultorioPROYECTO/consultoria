'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
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
        <CardHeader className="flex flex-col gap-0">
          <CardTitle className="text-2xl font-bold flex items-center justify-between">
            Registrar Nuevo Paciente
            
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-end items-end text-center">
          <Button size="sm" className="ml-2" onClick={handleOpenModal}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Paciente
            </Button>
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
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailIcon, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddStaffForm } from './AddStaffForm';

interface StaffMember {
  email: string;
  role: 'Médico' | 'Asistente';
  serviceId?: number;
  serviceName?: string;
}

interface CreateInvitationCardProps {
  onStaffAdded?: (staff: StaffMember) => void;
}

export function CreateInvitationCard({ onStaffAdded }: CreateInvitationCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleStaffAdded = (staff: StaffMember) => {
    if (onStaffAdded) {
      onStaffAdded(staff);
    }
  };

  return (
    <>
      <Card className="flex flex-col justify-between h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-start justify-between">
            Invitar Personal
            <Button 
              size="sm" 
              className="ml-2 selection:bg-secondary selection:text-primary" 
              onClick={handleOpenModal}
            >
              <Plus className="h-4 w-4 mr-1" />
              Invitar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
          <div className="text-muted-foreground">
            <MailIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Haga clic en &quot;Invitar&quot; para agregar nuevo personal a la organización.</p>
          </div>
        </CardContent>
      </Card>

      <AddStaffForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddStaff={handleStaffAdded}
      />
    </>
  );
}
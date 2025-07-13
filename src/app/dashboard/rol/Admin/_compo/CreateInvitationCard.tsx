'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailIcon, Plus } from 'lucide-react';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface CreateInvitationCardProps {
  onInvitationCreated?: (invitation: any) => void;
}

export function CreateInvitationCard({ onInvitationCreated }: CreateInvitationCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleInvitationCreated = (invitation: any) => {
    if (onInvitationCreated) {
      onInvitationCreated(invitation);
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <Card className="flex flex-col justify-between h-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-start justify-between">
            Crear Nueva Invitación
            <Button 
              size="sm" 
              className="ml-2 selection:bg-secondary selection:text-primary" 
              onClick={handleOpenModal}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nueva Invitación
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
          <div className="text-muted-foreground">
            <MailIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Haga clic en &quot;Nueva Invitación&quot; para enviar una invitación.</p>
          </div>
        </CardContent>
      </Card>

      {/* TODO: Crear CreateInvitationModal component */}
      {/* <CreateInvitationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onInvitationCreated={handleInvitationCreated}
      /> */}
    </>
  );
}
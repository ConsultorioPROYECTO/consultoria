'use client';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import WaveformLoader from '@/components/custom/WaveformLoader';

export type UserRole = 'medico' | 'asistente' | 'admin' | 'N/A' | null;

interface RoleBasedRendererProps {
  userRole: UserRole;
  isLoading: boolean;
  error?: string | null;
}

const LoadingSpinner = () => (
  <div className="flex h-screen flex-col items-center justify-center">
    <WaveformLoader className="w-24 h-auto text-muted-foreground" />
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
      <div className="text-gray-600">{message}</div>
    </div>
  </div>
);

const AdminDashboard = dynamic(() => import('../(views)/rol/Admin/admin-view'), {
  loading: () => <LoadingSpinner />,
});
const DoctorDashboard = dynamic(() => import('../(views)/rol/Doctor/doctor-view'), {
  loading: () => <LoadingSpinner />,
});
const AssistantDashboard = dynamic(() => import('../(views)/rol/Assistant/assistant-view'), {
  loading: () => <LoadingSpinner />,
});

const RoleBasedRenderer: React.FC<RoleBasedRendererProps> = ({
  userRole,
  isLoading,
  error
}) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {(() => {
        switch (userRole) {
          case 'medico':
            return <DoctorDashboard />;
          case 'asistente':
            return <AssistantDashboard />;
          case 'admin':
            return <AdminDashboard />;
          case 'N/A':
            return (
              <ErrorMessage message="Por favor, completa tu proceso de registro para acceder al Home" />
            );
          case null:
            return (
              <ErrorMessage message="Cargando información del usuario..." />
            );
          default:
            return (
              <ErrorMessage message="Rol de usuario no reconocido" />
            );
        }
      })()}
    </Suspense>
  );
};

export default RoleBasedRenderer;
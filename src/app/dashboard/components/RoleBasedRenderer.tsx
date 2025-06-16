'use client';
import AdminDashboard from '../rol/Admin/page';
import DoctorDashboard from '../rol/Doctor/page';
import AssistantDashboard from '../rol/Assistant/page';
import { UserRole } from '@rutas/app/hooks/useUserRole';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';

interface RoleBasedRendererProps {
  userRole: UserRole;
  isLoading: boolean;
  error?: string | null;
}

const LoadingSpinner = () => (
  <div className="flex h-screen flex-col items-center items-center justify-center">
    {/* <p className="font-bold text-muted-foreground text-xl text-center mb-4">Cargando<br/>dashboard...</p> */}
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

  switch (userRole) {
    case 'medico':
      return <DoctorDashboard />;
    case 'asistente':
      return <AssistantDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return (
        <ErrorMessage message="Rol de usuario no reconocido o no asignado" />
      );
  }
};

export default RoleBasedRenderer;
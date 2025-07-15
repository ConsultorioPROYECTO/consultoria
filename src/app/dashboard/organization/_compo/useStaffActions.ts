import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { showSuccessToast, showErrorToast } from '../../rol/Admin/_compo/toaster';

interface StaffMember { // Definición de la interfaz StaffMember
  id: number;
  name: string;
  role: 'admin' | 'medico' | 'asistente' | 'N/A';
  specialty?: string;
  assignedDoctor?: string;
  status: 'active' | 'inactive';
  email: string;
  patients?: number;
  appointments?: number;
}

export function useStaffActions() {
  const { user } = useAuth();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChangeRole = async (staffMember: StaffMember, newRole: 'admin' | 'medico' | 'asistente', onUpdate: () => void) => {
    if (!user || !staffMember) return;
    setIsChangingRole(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/users/rol/change-rol/${staffMember.id}/${newRole}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Error al cambiar el rol.');
        } catch {
          throw new Error(errorText || 'Error al cambiar el rol.');
        }
      }

      showSuccessToast('Rol actualizado correctamente.');
      onUpdate();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Ocurrió un error desconocido.");
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleDeleteStaff = async (staffMember: StaffMember, onUpdate: () => void, onClose: () => void) => {
    if (!user || !staffMember) return;
    setIsDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/users/unlik-organization/${staffMember.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Error al eliminar el miembro.');
        } catch {
          throw new Error(errorText || 'Error al eliminar el miembro.');
        }
      }

      showSuccessToast('Miembro eliminado de la organización.');
      onUpdate();
      onClose();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Ocurrió un error desconocido.");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isChangingRole,
    isDeleting,
    handleChangeRole,
    handleDeleteStaff,
  };
}
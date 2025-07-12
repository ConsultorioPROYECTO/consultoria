import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { eq } from 'drizzle-orm';
import type { Organization } from '@/db/schema/organization';

/**
 * Obtiene la información de la organización incluyendo instanceId y apiKey basado en el organizationId del usuario autenticado.
 * 
 * @param organizationId - ID de la organización del usuario autenticado
 * @returns Promise con la información de la organización o null si no se encuentra
 */
export async function getOrganizationInstance(organizationId: number): Promise<{
  success: boolean;
  organization?: Organization;
  instanceId?: string;
  apiKey?: string;
  error?: string;
}> {
  try {
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
    });

    if (!org) {
      return {
        success: false,
        error: 'Organización no encontrada',
      };
    }

    if (!org.instanceId) {
      return {
        success: false,
        error: 'La organización no tiene una instancia de Evolution API configurada',
      };
    }

    return {
      success: true,
      organization: org,
      instanceId: org.instanceId,
      apiKey: org.apiKey || undefined,
    };
  } catch (error) {
    console.error('Error obteniendo instancia de organización:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Funcion auxiliar para la creacion del codigo de invitacion aleatorio de 6 caracteres
 * no solo crea el codigo, tambien verifica que no exista en la base de datos
 * @returns {string} - Codigo de invitacion aleatorio de 6 caracteres
 */
export const generateRandomInvitationCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let invitationCode = '';
  for (let i = 0; i < 6; i++) {
    invitationCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  // Verificar si el código de invitación ya existe en la base de datos
  const existingOrganization = await db.select().from(organization).where(eq(organization.invitationCode, invitationCode));
  if (existingOrganization.length != 0) {
    // Si el código de invitación ya existe, generar uno nuevo
    console.log('Codigo de invitacion ya existe, generando uno nuevo');
    console.log(existingOrganization);
    return generateRandomInvitationCode();
  }
  return invitationCode;
};
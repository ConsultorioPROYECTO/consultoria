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
 * Genera una combinación alfanumérica aleatoria de un número determinado de caracteres.
 * 
 * @param length - Número de caracteres que debe tener la cadena generada
 * @returns {string} - Cadena alfanumérica aleatoria del tamaño especificado
 * 
 * @example
 * ```typescript
 * const code = generateRandomAlphanumeric(8); // "A3bC9xZ1"
 * const shortCode = generateRandomAlphanumeric(4); // "X7mP"
 * ```
 */
export const generateRandomAlphanumeric = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

/**
 * Funcion auxiliar para la creacion del codigo de invitacion aleatorio de 6 caracteres
 * no solo crea el codigo, tambien verifica que no exista en la base de datos
 * @returns {string} - Codigo de invitacion aleatorio de 6 caracteres
 */
export const generateRandomInvitationCode = async (): Promise<string> => {
  const invitationCode = generateRandomAlphanumeric(6);
  
  // Verificar si el código de invitación ya existe en la base de datos
  const existingOrganization = await db.select().from(organization).where(eq(organization.invitationCode, invitationCode));
  if (existingOrganization.length !== 0) {
    // Si el código de invitación ya existe, generar uno nuevo
    console.log('Codigo de invitacion ya existe, generando uno nuevo');
    console.log(existingOrganization);
    return generateRandomInvitationCode();
  }
  return invitationCode;
};

/**
 * Genera un instanceId único para la organización de 25 caracteres alfanuméricos.
 * Verifica que no exista en la base de datos antes de retornarlo.
 * 
 * @returns {Promise<string>} - instanceId único de 25 caracteres
 * 
 * @example
 * ```typescript
 * const instanceId = await generateUniqueInstanceId(); // "A3bC9xZ1mP4qR7sT2vW8yE5nK"
 * ```
 */
export const generateUniqueInstanceId = async (): Promise<string> => {
  const instanceId = generateRandomAlphanumeric(25);
  
  // Verificar si el instanceId ya existe en la base de datos
  const existingOrganization = await db.select().from(organization).where(eq(organization.instanceId, instanceId));
  if (existingOrganization.length !== 0) {
    // Si el instanceId ya existe, generar uno nuevo
    console.log('InstanceId ya existe, generando uno nuevo');
    console.log(existingOrganization);
    return generateUniqueInstanceId();
  }
  return instanceId;
};

/**
 * Genera un apiKey único para la organización de 25 caracteres alfanuméricos.
 * Verifica que no exista en la base de datos antes de retornarlo.
 * 
 * @returns {Promise<string>} - apiKey único de 25 caracteres
 * 
 * @example
 * ```typescript
 * const apiKey = await generateUniqueApiKey(); // "X7mP9qR3sT6vW2yE8nK4bC1zA"
 * ```
 */
export const generateUniqueApiKey = async (): Promise<string> => {
  const apiKey = generateRandomAlphanumeric(25);
  
  // Verificar si el apiKey ya existe en la base de datos
  const existingOrganization = await db.select().from(organization).where(eq(organization.apiKey, apiKey));
  if (existingOrganization.length !== 0) {
    // Si el apiKey ya existe, generar uno nuevo
    console.log('ApiKey ya existe, generando uno nuevo');
    console.log(existingOrganization);
    return generateUniqueApiKey();
  }
  return apiKey;
};
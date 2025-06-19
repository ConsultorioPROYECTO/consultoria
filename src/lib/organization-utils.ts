import { db } from '@rutas/db';
import { organization } from '@rutas/db/schema/organization';
import { eq } from 'drizzle-orm';

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
/**
 * Utilidades compartidas para la autenticación
 */

/**
 * Construye la URL de redirección con los parámetros de invitación y rol
 * @param basePath - Ruta base (ej: '/login' o '/signup')
 * @param invitacionCode - Código de invitación opcional
 * @param role - Rol opcional
 * @returns URL completa con parámetros
 */
export function buildAuthRedirectUrl(
  basePath: string,
  invitacionCode?: string | null,
  role?: string | null
): string {
  if (!invitacionCode && !role) {
    return basePath;
  }

  const params = new URLSearchParams();
  if (invitacionCode) {
    params.set('invitacionCode', invitacionCode);
  }
  if (role) {
    params.set('role', role);
  }

  return `${basePath}?${params.toString()}`;
}

/**
 * Extrae los parámetros de autenticación de los searchParams
 * @param searchParams - URLSearchParams de Next.js
 * @returns Objeto con invitacionCode y role
 */
export function extractAuthParams(searchParams: URLSearchParams) {
  return {
    invitacionCode: searchParams.get('invitacionCode'),
    role: searchParams.get('role')
  };
}

/**
 * Valida si un código de invitación tiene el formato correcto
 * @param code - Código de invitación a validar
 * @returns true si es válido, false en caso contrario
 */
export function isValidInvitationCode(code: string | null): boolean {
  if (!code) return false;
  // Asumiendo que el código debe tener al menos 6 caracteres alfanuméricos
  return /^[a-zA-Z0-9]{6,}$/.test(code);
}

/**
 * Valida si un rol es válido
 * @param role - Rol a validar
 * @returns true si es válido, false en caso contrario
 */
export function isValidRole(role: string | null): boolean {
  if (!role) return false;
  const validRoles = ['admin', 'doctor', 'patient', 'staff'];
  return validRoles.includes(role.toLowerCase());
}

/**
 * Construye el objeto de parámetros para redirección preservando invitación y rol
 * @param invitacionCode - Código de invitación
 * @param role - Rol del usuario
 * @returns Objeto con los parámetros válidos
 */
export function buildRedirectParams(invitacionCode?: string | null, role?: string | null) {
  const params: Record<string, string> = {};
  
  if (invitacionCode && isValidInvitationCode(invitacionCode)) {
    params.invitacionCode = invitacionCode;
  }
  
  if (role && isValidRole(role)) {
    params.role = role;
  }
  
  return params;
}
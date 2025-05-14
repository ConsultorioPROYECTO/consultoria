// src/lib/firebase/clientUtils.ts

/**
 * @fileoverview Utilidades del lado del cliente relacionadas con Firebase Authentication.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-12
 */

import { auth } from './firebaseConfig'; // Importa la instancia de auth del cliente (no admin)
import { User } from 'firebase/auth';

/**
 * Obtiene el Token ID JWT del usuario actualmente autenticado en Firebase.
 * Este token se puede enviar al backend para su verificación.
 *
 * @async
 * @returns {Promise<string | null>} Una promesa que resuelve al Token ID del usuario si está autenticado
 *                                   y el token se puede obtener, o `null` si no hay usuario autenticado
 *                                   o si ocurre un error.
 * @example
 * const token = await getFirebaseAuthToken();
 * if (token) {
 *   // Usar el token en la cabecera Authorization de una solicitud fetch
 *   const response = await fetch('/api/protected-route', {
 *     headers: {
 *       'Authorization': `Bearer ${token}`,
 *     },
 *   });
 * } else {
 *   console.log('Usuario no autenticado o token no disponible.');
 * }
 */
export const getFirebaseAuthToken = async (): Promise<string | null> => {
  const currentUser: User | null = auth.currentUser;

  if (!currentUser) {
    console.warn('[Client Utils] getFirebaseAuthToken: No hay usuario actual autenticado.');
    return null;
  }

  try {
    const idToken = await currentUser.getIdToken(true); // true fuerza la actualización del token si está expirado
    return idToken;
  } catch (error) {
    console.error('[Client Utils] getFirebaseAuthToken: Error al obtener el Token ID:', error);
    return null;
  }
};
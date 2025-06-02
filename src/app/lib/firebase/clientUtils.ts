// src/lib/firebase/clientUtils.ts

/**
 * @fileoverview Utilidades del lado del cliente relacionadas con Firebase Authentication.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-12
 */

import { auth } from './firebaseConfig'; // Importa la instancia de auth del cliente (no admin)
import { User, onAuthStateChanged } from 'firebase/auth';


/**
 * Obtiene el Token ID JWT del usuario actualmente autenticado en Firebase de forma robusta,
 * esperando a que el estado de autenticación se resuelva.
 * Este token se puede enviar al backend para su verificación.
 *
 * @async
 * @returns {Promise<string | null>} Una promesa que resuelve al Token ID del usuario si está autenticado
 *                                   y el token se puede obtener, o `null` si no hay usuario autenticado,
 *                                   si ocurre un error, o si el estado de autenticación no se resuelve.
 * @example
 * const token = await getFirebaseAuthToken();
 * if (token) {
 *   // Usar el token
 * } else {
 *   console.log('Usuario no autenticado o token no disponible.');
 * }
 */
export const getFirebaseAuthToken = (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        unsubscribe(); // Desuscribirse después de la primera emisión para evitar fugas de memoria
        if (user) {
          try {
            const idToken = await user.getIdToken(true); // true fuerza la actualización
            resolve(idToken);
          } catch (error) {
            console.error('[Client Utils] getFirebaseAuthTokenRobust: Error al obtener el Token ID:', error);
            resolve(null); // Opcionalmente, reject(error) si se prefiere manejar errores explícitamente
          }
        } else {
          console.warn('[Client Utils] getFirebaseAuthTokenRobust: No hay usuario autenticado después de verificar el estado.');
          resolve(null);
        }
      },
      (error) => {
        // Este callback de error es para errores en el observador onAuthStateChanged mismo
        unsubscribe(); // Asegurarse de desuscribir también en caso de error del observador
        console.error('[Client Utils] getFirebaseAuthTokenRobust: Error en el observador onAuthStateChanged:', error);
        reject(error); // Opcionalmente, resolve(null)
      }
    );
  });
};
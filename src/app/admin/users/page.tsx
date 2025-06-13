// src/app/admin/users/page.tsx
'use client'; // Este componente necesita ser un Client Component para usar useEffect, useState y llamar a la API.

/**
 * @fileoverview Página para mostrar la lista de todos los usuarios obtenidos de la API.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-12
 *
 * @description
 * Este componente de página realiza una solicitud GET a la API `/api/users`
 * para obtener y mostrar una lista de todos los usuarios del sistema.
 * Incluye manejo de estados de carga y error.
 *
 * ¡¡¡NOTA DE SEGURIDAD!!!
 * Esta página debería ser accesible SÓLO para usuarios autenticados y con roles
 * administrativos. La lógica para obtener el token y enviarlo en la cabecera
 * de la solicitud es crucial, al igual que la validación de dicho token y rol
 * en el backend (`/api/users`).
 *
 * @requires react - Para `useState`, `useEffect`.
 * @requires ../../../lib/firebase/clientUtils - Para `getFirebaseAuthToken`.
 * @requires ../../../lib/db/schema - Para el tipo `User` (opcional, para tipado fuerte de los datos).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getFirebaseAuthToken } from '../../lib/firebase/clientUtils';
import type { User as DbUser } from '../../../db/schema/users'; // Importa el tipo de tu Drizzle schema

// Definimos un tipo más específico para lo que esperamos de la API,
// podrías ajustarlo si la API devuelve un subconjunto de campos.
// Por ahora, asumimos que es compatible con DbUser.
type UserApiResponse = DbUser;

/**
 * Componente UsersListPage.
 * Muestra una lista de usuarios obtenidos de la API `/api/users`.
 * @returns {React.ReactElement} El elemento JSX de la página.
 */
export default function UsersListPage(): React.ReactElement<any> {
  const [users, setUsers] = useState<UserApiResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Función para obtener los usuarios de la API.
   * Incluye la obtención del token de autenticación de Firebase.
   */
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = await getFirebaseAuthToken();

    if (!token) {
      setError('Autenticación requerida. Por favor, inicia sesión.');
      setIsLoading(false);
      // Podrías redirigir al login aquí si es necesario
      // import { useRouter } from 'next/navigation';
      // const router = useRouter();
      // router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data: UserApiResponse[] = await response.json();
      setUsers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Un error desconocido ocurrió.';
      console.error('Error al obtener usuarios:', errorMessage);
      setError(`No se pudieron cargar los usuarios: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback para memorizar la función si fuera necesario

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Ejecutar fetchUsers cuando el componente se monta o fetchUsers cambia

  // --- Renderizado del Componente ---

  if (isLoading) {
    return (
      <div className='p-5 font-sans max-w-7xl mx-auto'>
        <h1 className='text-center mb-5 text-gray-700'>Lista de Usuarios del Sistema</h1>
        <p className='text-center text-lg text-gray-600'>Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-5 font-sans max-w-7xl mx-auto'>
        <h1 className='text-center mb-5 text-gray-700'>Lista de Usuarios del Sistema</h1>
        <p className='text-center text-lg text-red-600 bg-red-50 p-3 rounded-md border border-red-500'>{error}</p>
        <button onClick={fetchUsers} className='px-4 py-2.5 my-2.5 mb-5 bg-blue-600 text-white border-none rounded hover:bg-blue-700 cursor-pointer text-base disabled:opacity-50 disabled:cursor-not-allowed'>Reintentar</button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className='p-5 font-sans max-w-7xl mx-auto'>
        <h1 className='text-center mb-5 text-gray-700'>Lista de Usuarios del Sistema</h1>
        <p>No se encontraron usuarios.</p>
        <button onClick={fetchUsers} className='px-4 py-2.5 my-2.5 mb-5 bg-blue-600 text-white border-none rounded hover:bg-blue-700 cursor-pointer text-base disabled:opacity-50 disabled:cursor-not-allowed'>Actualizar</button>
      </div>
    );
  }

  return (
    <div className='p-5 font-sans max-w-7xl mx-auto'>
      <h1 className='text-center mb-5 text-gray-700'>Lista de Usuarios del Sistema</h1>
      <button onClick={fetchUsers} className='px-4 py-2.5 my-2.5 mb-5 bg-blue-600 text-white border-none rounded hover:bg-blue-700 cursor-pointer text-base disabled:opacity-50 disabled:cursor-not-allowed' disabled={isLoading}>
        {isLoading ? 'Actualizando...' : 'Actualizar Lista'}
      </button>
      <table className='w-full border-collapse mt-5 shadow-md'>
        <thead>
          <tr>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>ID (DB)</th>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>Firebase UID</th>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>Email</th>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>Nombre</th>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>Rol</th>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>Teléfono</th>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>Activo</th>
            <th className='"border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold"'>Creado</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id || user.firebaseUid}> {/* Usar ID de DB si está, sino firebaseUid */}
              <td className='border border-gray-200 p-2.5 text-left break-words'>{user.id}</td>
              <td className='border border-gray-200 p-2.5 text-left break-words' title={user.firebaseUid}>{user.firebaseUid?.substring(0, 10)}...</td>
              <td className='border border-gray-200 p-2.5 text-left break-words'>{user.email || 'N/A'}</td>
              <td className='border border-gray-200 p-2.5 text-left break-words'>{user.displayName || 'N/A'}</td>
              <td className='border border-gray-200 p-2.5 text-left break-words'>{user.role}</td>
              <td className='border border-gray-200 p-2.5 text-left break-words'>{user.phoneNumber || 'N/A'}</td>
              <td className='border border-gray-200 p-2.5 text-left break-words'>{user.isActive ? 'Sí' : 'No'}</td>
              <td className='border border-gray-200 p-2.5 text-left break-words'>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// Tailwind CSS classes for styling components
/*
const styles = {
  container: "p-5 font-sans max-w-7xl mx-auto",
  header: "text-center mb-5 text-gray-700",
  loadingText: "text-center text-lg text-gray-600",
  errorText: "text-center text-lg text-red-600 bg-red-50 p-3 rounded-md border border-red-500",
  button: "px-4 py-2.5 my-2.5 mb-5 bg-blue-600 text-white border-none rounded hover:bg-blue-700 cursor-pointer text-base disabled:opacity-50 disabled:cursor-not-allowed",
  table: "w-full border-collapse mt-5 shadow-md",
  th: "border border-gray-200 p-3 text-left bg-gray-100 text-gray-700 font-bold",
  td: "border border-gray-200 p-2.5 text-left break-words"
} as const;
*/
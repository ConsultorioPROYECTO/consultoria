// src/app/api/contact/route.ts

/**
 * @fileoverview API Route para manejar las solicitudes de contacto desde la landing page.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-20
 *
 * @description
 * Maneja las solicitudes POST a `/api/contact` para guardar la información
 * de contacto de personas que solicitan acceso a la plataforma desde el formulario
 * de la landing page. Esta ruta NO requiere autenticación ya que es para usuarios
 * que aún no tienen acceso a la plataforma.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires @/db - Instancia `db` de Drizzle ORM.
 * @requires @/db/schema - Definición de la tabla `contactRequests`.
 * @requires zod - Para validación de datos de entrada.
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a:
 *  - NextResponse con status 400 si los datos de entrada son inválidos.
 *  - NextResponse con status 201 si la solicitud se guarda exitosamente.
 *  - NextResponse con status 500 si ocurre un error en la base de datos.
 *
 * @example - Cómo usar la API desde el frontend:
 * ```javascript
 * const response = await fetch('/api/contact', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     name: 'Juan Pérez',
 *     email: 'juan@ejemplo.com',
 *     company: 'Clínica Ejemplo',
 *     message: 'Estoy interesado en la plataforma...'
 *   })
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contactRequests } from '@/db/schema';
import { z } from 'zod';

/**
 * Schema de validación para los datos del formulario de contacto
 */
const contactFormSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .trim(),
  email: z.string()
    .email('Debe ser un email válido')
    .max(255, 'El email no puede exceder 255 caracteres')
    .trim(),
  company: z.string()
    .min(1, 'La empresa u organización es requerida')
    .max(255, 'La empresa no puede exceder 255 caracteres')
    .trim(),
  message: z.string()
    .min(1, 'El mensaje es requerido')
    .max(2000, 'El mensaje no puede exceder 2000 caracteres')
    .trim()
});

/**
 * Maneja las solicitudes POST para crear una nueva solicitud de contacto
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parsear el cuerpo de la solicitud
    const body = await request.json();

    // Validar los datos de entrada
    const validationResult = contactFormSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Datos de entrada inválidos',
          errors: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { name, email, company, message } = validationResult.data;

    // Insertar la solicitud de contacto en la base de datos
    const [newContactRequest] = await db
      .insert(contactRequests)
      .values({
        name,
        email,
        company,
        message
      })
      .returning({ id: contactRequests.id });

    return NextResponse.json(
      {
        success: true,
        message: 'Solicitud de contacto enviada exitosamente',
        data: {
          id: newContactRequest.id
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error al guardar la solicitud de contacto:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

/**
 * Maneja las solicitudes GET para obtener todas las solicitudes de contacto
 * (Esta funcionalidad podría ser útil para un panel de administración)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const requests = await db
      .select()
      .from(contactRequests)
      .orderBy(contactRequests.createdAt);

    return NextResponse.json(
      {
        success: true,
        data: requests
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error al obtener las solicitudes de contacto:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
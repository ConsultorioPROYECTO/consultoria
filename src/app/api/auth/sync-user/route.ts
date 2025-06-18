// src/app/api/auth/sync-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db'; // Asegúrate que la ruta al db sea correcta
import { users, NewUser } from '@rutas/db/schema/users'; // Asegúrate que la ruta al schema sea correcta
import { eq } from 'drizzle-orm';
import { assistants, doctors } from '@rutas/db/schema';
import { sql } from 'drizzle-orm';
import { createCalendar } from '@/app/lib/google-calendar/calendar-utils';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    const firebaseUid = typeof userData.firebaseUid === 'string' ? userData.firebaseUid.trim() : userData.firebaseUid;

    if (!firebaseUid) {
      return NextResponse.json({ error: 'firebaseUid es requerido y debe ser una cadena de texto válida' }, { status: 400 });
    }

    // Prepara los datos para insertar/actualizar
    const newUser : NewUser = {
      firebaseUid,
      email: userData.email,
      emailVerified: userData.emailVerified || false,
      phoneNumber: userData.phoneNumber,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      providerId: userData.providerId,
      role: 'N/A',
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Upsert: inserta o actualiza si ya existe
    await db
      .insert(users)
      .values(newUser)
      .onDuplicateKeyUpdate({
        set: {
          ...newUser,
          createdAt: sql`${users.createdAt}`, // No sobreescribas createdAt si ya existe
          role: sql`${users.role}`, // No sobreescribas el rol si ya existe
          isActive: sql`${users.isActive}`, // No sobreescribas isActive si ya existe
        },
      });

    // Ahora puedes hacer un select si necesitas devolver el usuario actualizado
    const user = await db.query.users.findFirst({ where: eq(users.firebaseUid, firebaseUid) });

    // Crear registro en doctors o assistants si corresponde
    if (user?.role === 'medico') {
      // Verifica si ya existe registro en doctors
      const doctorExists = await db.query.doctors.findFirst({ where: eq(doctors.userId, user.id) });
      if (!doctorExists) {
        // Crear calendario de Google para el doctor
        let calendarId = '';
        try {
          const calendarResult = await createCalendar({
            summary: `Calendario - ${user.displayName || user.email}`,
            description: `Calendario médico para ${user.displayName || user.email}`,
            timeZone: 'America/Bogota'
          });
          
          if (calendarResult.success && calendarResult.data?.id) {
            calendarId = calendarResult.data.id;
            console.log(`[Sync User] Calendario creado exitosamente: ${calendarId}`);
          } else {
            console.error('[Sync User] Error creando calendario:', calendarResult.error);
            // Continuar sin calendar_id si falla la creación
          }
        } catch (error) {
          console.error('[Sync User] Error al crear calendario de Google:', error);
          // Continuar sin calendar_id si falla la creación
        }
        
        await db.insert(doctors).values({ 
          userId: user.id, 
          speciality: '', 
          calendar_id: calendarId, 
          privatePhone: '', 
          nitId: '', 
          availability: '', 
          tokenGoogleId: '' 
        });
      } else if (!doctorExists.calendar_id) {
        // Si el doctor existe pero no tiene calendar_id, crear uno
        try {
          const calendarResult = await createCalendar({
            summary: `Calendario - ${user.displayName || user.email}`,
            description: `Calendario médico para ${user.displayName || user.email}`,
            timeZone: 'America/Bogota'
          });
          
          if (calendarResult.success && calendarResult.data?.id) {
            await db.update(doctors)
              .set({ 
                calendar_id: calendarResult.data.id,
                updatedAt: new Date()
              })
              .where(eq(doctors.userId, user.id));
            console.log(`[Sync User] Calendario agregado a doctor existente: ${calendarResult.data.id}`);
          } else {
            console.error('[Sync User] Error creando calendario para doctor existente:', calendarResult.error);
          }
        } catch (error) {
          console.error('[Sync User] Error al crear calendario para doctor existente:', error);
        }
      }
    } else if (user?.role === 'asistente') {
      // Verifica si ya existe registro en assistants
      const assistantExists = await db.query.assistants.findFirst({ where: eq(assistants.userId, user.id) });
      if (!assistantExists) {
        await db.insert(assistants).values({ userId: user.id });
      }
    }

    return NextResponse.json({ message: user ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente', user }, { status: user ? 200 : 201 });
  } catch (error) {
    // Manejo de errores centralizado
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
// src/app/api/auth/sync-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db'; // Asegúrate que la ruta al db sea correcta
import { users, NewUser } from '@rutas/db/schema/users'; // Asegúrate que la ruta al schema sea correcta
import { eq } from 'drizzle-orm';
import { assistants, doctors } from '@rutas/db/schema';
import { sql } from 'drizzle-orm';
import { onDoctorCreated } from '@/lib/hooks/calendar-hooks';

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
        // Crear el registro del doctor
        await db.insert(doctors).values({ 
          userId: user.id, 
          speciality: '', 
          calendar_id: '', 
          privatePhone: '', 
          nitId: '', 
          availability: '', 
          tokenGoogleId: '',
          calendar_settings: {
            notifications: {
              email: true,
              popup: true,
              minutesBefore: [15, 60],
            },
            workingHours: {
              start: '08:00',
              end: '18:00',
              days: [1, 2, 3, 4, 5],
            },
            autoAcceptMeetings: false,
            defaultMeetingDuration: 30,
          }
        });
        
        // Obtener el ID del doctor recién creado
        const newDoctor = await db.query.doctors.findFirst({ where: eq(doctors.userId, user.id) });
        
        if (newDoctor && user.displayName) {
          // Crear calendario automáticamente para el nuevo doctor
          try {
            const calendarResult = await onDoctorCreated(newDoctor.idDoctor, {
              firstName: user.displayName.split(' ')[0] || 'Doctor',
              lastName: user.displayName.split(' ').slice(1).join(' ') || '',
              email: user.email || undefined,
              timezone: 'America/Bogota'
            });
            
            if (calendarResult.success) {
              console.log(`Calendar created successfully for doctor ${newDoctor.idDoctor}: ${calendarResult.calendarId}`);
            } else {
              console.error(`Failed to create calendar for doctor ${newDoctor.idDoctor}: ${calendarResult.error}`);
            }
          } catch (calendarError) {
            console.error('Error creating calendar for new doctor:', calendarError);
          }
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
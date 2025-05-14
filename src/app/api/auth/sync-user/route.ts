// src/app/api/auth/sync-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db'; // Asegúrate que la ruta al db sea correcta
import { users, NewUser } from '@rutas/db/schema/users'; // Asegúrate que la ruta al schema sea correcta
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
    try {
        const userData = await request.json();
        console.log('[sync-user] userData recibida (raw):', JSON.stringify(userData, null, 2));

        // Extract and trim firebaseUid first
        const rawFirebaseUid = userData.firebaseUid;
        const firebaseUid = typeof rawFirebaseUid === 'string' ? rawFirebaseUid.trim() : rawFirebaseUid;

        // Validate the trimmed firebaseUid
        if (!userData || !firebaseUid) { 
            console.log('[sync-user] firebaseUid es requerido o inválido después del trim:', firebaseUid);
            return NextResponse.json({ error: 'firebaseUid es requerido y debe ser una cadena de texto válida' }, { status: 400 });
        }
        
        console.log(`[sync-user] firebaseUid procesado (trimmed): '${firebaseUid}', type: ${typeof firebaseUid}`);

        const { 
            // firebaseUid is already defined and processed.
            // Destructure other properties from userData.
            email,
            emailVerified,
            phoneNumber,
            displayName,
            photoURL,
            providerId 
        } = userData;

        const existingUser = await db
            .select({ firebaseUidDb: users.firebaseUid, id: users.id }) // Seleccionar columnas específicas para depuración
            .from(users)
            .where(eq(users.firebaseUid, firebaseUid))
            .limit(1);
        console.log(`[sync-user] Querying for existing user with processed firebaseUid: '${firebaseUid}' (type: ${typeof firebaseUid})`);
        console.log('[sync-user] existingUser query result:', JSON.stringify(existingUser, null, 2));
        console.log(`[sync-user] Type of existingUser: ${typeof existingUser}, isArray: ${Array.isArray(existingUser)}`);
        if (Array.isArray(existingUser)) {
            console.log(`[sync-user] Length of existingUser array: ${existingUser.length}`);
        }
        // Log explícito para la evaluación de la condición de existencia del usuario
        const userExists = Array.isArray(existingUser) && existingUser.length > 0;
        console.log(`[sync-user] Evaluando existencia de usuario: existingUser.length = ${existingUser?.length}, userExists = ${userExists}`);

        if (userExists) {
            console.log(`[sync-user] Usuario EXISTENTE encontrado con firebaseUid: ${firebaseUid}. ID: ${existingUser[0].id}. Procediendo a actualizar.`);
            // Usuario existe, actualizar
            await db // No se asigna a updatedUser ya que se vuelve a consultar después
                .update(users)
                .set({
                    email: email,
                    emailVerified: emailVerified,
                    phoneNumber: phoneNumber,
                    displayName: displayName,
                    photoURL: photoURL,
                    providerId: providerId,
                    lastLoginAt: new Date(), 
                    updatedAt: new Date(), 
                })
                .where(eq(users.firebaseUid, firebaseUid));
                // .returning() eliminado; no es efectivo para MySQL y la consulta posterior ya existe.
            
            // Después de actualizar, obtener el usuario para devolverlo
            const userAfterUpdate = await db
                .select()
                .from(users)
                .where(eq(users.firebaseUid, firebaseUid))
                .limit(1);

            console.log('[sync-user] Usuario actualizado:', JSON.stringify(userAfterUpdate[0], null, 2));
            return NextResponse.json({ message: 'Usuario actualizado exitosamente', user: userAfterUpdate[0] }, { status: 200 });
        } else {
            console.log(`[sync-user] Usuario con firebaseUid: ${firebaseUid} NO encontrado. Procediendo a crear.`);
            // Usuario no existe, crear
            const newUser: NewUser = {
                firebaseUid: firebaseUid,
                email: email,
                emailVerified: emailVerified || false,
                phoneNumber: phoneNumber,
                displayName: displayName,
                photoURL: photoURL,
                providerId: providerId,
                role: 'user', // Rol por defecto
                isActive: true, // Activo por defecto
                lastLoginAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await db // No se asigna a createdUser ya que se vuelve a consultar después
                .insert(users)
                .values(newUser);
                // .returning() eliminado; no es efectivo para MySQL y la consulta posterior ya existe.
            
            // Después de insertar, obtener el usuario para devolverlo
            const userAfterInsert = await db
                .select()
                .from(users)
                .where(eq(users.firebaseUid, firebaseUid)) // Usar firebaseUid que es único
                .limit(1);

            console.log('[sync-user] Usuario creado:', JSON.stringify(userAfterInsert[0], null, 2));
            return NextResponse.json({ message: 'Usuario creado exitosamente', user: userAfterInsert[0] }, { status: 201 });
        }
    } catch (error) {
        console.error('Error en sync-user:', error);
        // Considera un logging más robusto en producción
        const errorMessage = error instanceof Error ? error.message : 'Un error desconocido ocurrió';
        return NextResponse.json({ error: 'Error interno del servidor', details: errorMessage }, { status: 500 });
    }
}
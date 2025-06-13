import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db';
import { doctors } from '@rutas/db/schema/doctors';
import { eq } from 'drizzle-orm';
import { WorkingHours, validateWorkingHours } from '@rutas/types/working-hours';

// GET - Obtener horarios de trabajo de un doctor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const doctorId = parseInt(resolvedParams.id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'ID de doctor inválido' },
        { status: 400 }
      );
    }

    const doctor = await db
      .select({
        idDoctor: doctors.idDoctor,
        availability: doctors.availability
      })
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);

    if (doctor.length === 0) {
      return NextResponse.json(
        { error: 'Doctor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      doctorId: doctor[0].idDoctor,
      workingHours: doctor[0].availability
    });
  } catch (error) {
    console.error('Error al obtener horarios del doctor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar horarios de trabajo de un doctor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const doctorId = parseInt(resolvedParams.id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'ID de doctor inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { workingHours }: { workingHours: WorkingHours } = body;

    if (!workingHours) {
      return NextResponse.json(
        { error: 'Horarios de trabajo requeridos' },
        { status: 400 }
      );
    }

    // Validar horarios
    const validationErrors = validateWorkingHours(workingHours);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Horarios inválidos', details: validationErrors },
        { status: 400 }
      );
    }

    // Verificar que el doctor existe
    const existingDoctor = await db
      .select({ idDoctor: doctors.idDoctor })
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);

    if (existingDoctor.length === 0) {
      return NextResponse.json(
        { error: 'Doctor no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar horarios
    await db
      .update(doctors)
      .set({
        availability: workingHours,
        updatedAt: new Date()
      })
      .where(eq(doctors.idDoctor, doctorId));

    return NextResponse.json({
      message: 'Horarios actualizados exitosamente',
      doctorId,
      workingHours
    });
  } catch (error) {
    console.error('Error al actualizar horarios del doctor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { medicalServices } from '@/db/schema/medical_services';
import { eq } from 'drizzle-orm';

type TimeSlot = {
  start: string;
  end: string;
};

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string, idServicios: string }> }
): Promise<NextResponse<TimeSlot[] | { error: string }>> {
  console.log('API: /api/doctors/[id]/availability/[idServicios] - Request received');
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  console.debug(`Request Params: date=${dateParam}`);

  if (!dateParam) {
    console.error('Validation Error: "date" parameter is required.');
    return NextResponse.json(
      { error: 'El parámetro "date" es requerido' }, 
      { status: 400 }
    );
  }

  const resolvedParams = await params;
  const doctorId = parseInt(resolvedParams.id, 10);
  const serviceId = parseInt(resolvedParams.idServicios, 10);
  console.debug(`Parsed doctorId: ${doctorId}, serviceId: ${serviceId}`);

  if (isNaN(doctorId) || isNaN(serviceId)) {
    console.error(`Validation Error: Invalid doctorId or serviceId`);
    return NextResponse.json(
      { error: 'El doctorId o serviceId no es válido' }, 
      { status: 400 }
    );
  }

  try {
    console.log(`Attempting to get availability for doctor ${doctorId} on ${dateParam} with service ${serviceId}`);

    // Fetch doctor's timezone
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
    });
    if (!doctor || !doctor.calendar_timezone) {
      throw new Error('Doctor or timezone not found');
    }
    const doctorTimezone = doctor.calendar_timezone;

    // Fetch service duration
    const service = await db.query.medicalServices.findFirst({
      where: eq(medicalServices.id, serviceId),
    });
    if (!service) {
      throw new Error('Service not found');
    }
    const intervalMinutes = service.durationMinutes;
    if (intervalMinutes < 5) {
      throw new Error('Invalid service duration');
    }
    console.debug(`Service duration: ${intervalMinutes} minutes`);

    const targetDate = DateTime.fromISO(dateParam, { zone: doctorTimezone });
    if (!targetDate.isValid) {
      console.error(`Validation Error: Invalid date format for ${dateParam}`);
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const startDate = targetDate.startOf('day');
    const endDate = targetDate.endOf('day');
    console.debug(`Date Range: startDate=${startDate.toISO()}, endDate=${endDate.toISO()}, timezone=${doctorTimezone}`);

    console.log('Calling getDoctorAvailability...');
    const availableIntervals = await getDoctorAvailability(
      doctorId,
      startDate,
      endDate
    );
    console.log(`Received ${availableIntervals.length} available intervals from getDoctorAvailability.`);
    console.debug('Raw available intervals:', availableIntervals.map(i => i.toISO()));

    const availableSlots: TimeSlot[] = [];
    for (const interval of availableIntervals) {
      let currentSlotStart = interval.start!;
      console.debug(`Processing interval: ${interval.start!.toISO()} - ${interval.end!.toISO()}`);
      while (currentSlotStart.plus({ minutes: intervalMinutes }) <= interval.end!) {
        const currentSlotEnd = currentSlotStart.plus({ minutes: intervalMinutes });
        availableSlots.push({
          start: currentSlotStart.toISO() || '',
          end: currentSlotEnd.toISO() || '',
        });
        console.debug(`Generated slot: ${currentSlotStart.toISO()} - ${currentSlotEnd.toISO()}`);
        currentSlotStart = currentSlotEnd;
      }
    }
    console.log(`Generated ${availableSlots.length} final available slots.`);
    console.debug('Final available slots:', availableSlots);

    return NextResponse.json(availableSlots);

  } catch (error) {
    console.error('Error al obtener la disponibilidad del doctor:', {
      doctorId,
      serviceId,
      date: dateParam,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
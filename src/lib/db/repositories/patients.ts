// src/lib/db/repositories/patients.ts
import { db } from '@/db';
import { patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function findPatientById(id: number, organizationId: number) {
  return await db.query.patients.findFirst({
    where: and(
      eq(patients.id, id),
      eq(patients.organizationId, organizationId),
      eq(patients.isActive, true)
    ),
    with: {
      appointments: {
        with: {
          doctor: {
            columns: { speciality: true }
          },
          service: {
            columns: { name: true, category: true }
          }
        },
        orderBy: (appointments, { desc }) => [desc(appointments.id)]
      }
    }
  });
}
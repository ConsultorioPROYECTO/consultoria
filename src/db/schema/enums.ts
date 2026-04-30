import { pgEnum } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'medico', 'asistente', 'N/A']);
export const appointmentStatus = pgEnum('appointment_status', ['pending', 'accepted', 'attended', 'rejected', 'canceled']);
export const syncStatus = pgEnum('sync_status', ['pending', 'synced', 'failed', 'not_synced']);
export const appointmentPriority = pgEnum('appointment_priority', ['low', 'normal', 'high', 'urgent']);
export const identificationType = pgEnum('identification_type', ['DNI', 'CC', 'TI', 'CE', 'PP', 'RC', 'AS']);
export const gender = pgEnum('gender', ['M', 'F', 'Other']);
export const bloodType = pgEnum('blood_type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
export const fileCategory = pgEnum('file_category', ['medical_document', 'patient_photo', 'medical_image', 'appointment_note', 'prescription', 'lab_result', 'other']);
export const accessLevel = pgEnum('access_level', ['private', 'organization', 'restricted']);
export const invitationRole = pgEnum('invitation_role', ['admin', 'medico', 'asistente', 'N/A']);
export const invitationStatus = pgEnum('invitation_status', ['pending', 'approved', 'rejected', 'cancelled', 'expired']);

import { relations } from "drizzle-orm/relations";
import { doctors, appointments, patients, medicalServices, assistants, assistantDoctor, users, doctorServices, organization, plans, organizationInvitationsRequest } from "./schema";

export const appointmentsRelations = relations(appointments, ({one}) => ({
	doctor: one(doctors, {
		fields: [appointments.doctorId],
		references: [doctors.id]
	}),
	patient: one(patients, {
		fields: [appointments.patientId],
		references: [patients.id]
	}),
	medicalService: one(medicalServices, {
		fields: [appointments.serviceId],
		references: [medicalServices.id]
	}),
}));

export const doctorsRelations = relations(doctors, ({one, many}) => ({
	appointments: many(appointments),
	assistantDoctors: many(assistantDoctor),
	doctorServices: many(doctorServices),
	user: one(users, {
		fields: [doctors.userId],
		references: [users.id]
	}),
}));

export const patientsRelations = relations(patients, ({one, many}) => ({
	appointments: many(appointments),
	organization: one(organization, {
		fields: [patients.organizationId],
		references: [organization.id]
	}),
}));

export const medicalServicesRelations = relations(medicalServices, ({one, many}) => ({
	appointments: many(appointments),
	doctorServices: many(doctorServices),
	organization: one(organization, {
		fields: [medicalServices.organizationId],
		references: [organization.id]
	}),
}));

export const assistantDoctorRelations = relations(assistantDoctor, ({one}) => ({
	assistant: one(assistants, {
		fields: [assistantDoctor.assistantId],
		references: [assistants.id]
	}),
	doctor: one(doctors, {
		fields: [assistantDoctor.doctorId],
		references: [doctors.id]
	}),
}));

export const assistantsRelations = relations(assistants, ({one, many}) => ({
	assistantDoctors: many(assistantDoctor),
	user: one(users, {
		fields: [assistants.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	assistants: many(assistants),
	doctors: many(doctors),
	organization: one(organization, {
		fields: [users.organizationId],
		references: [organization.id]
	}),
}));

export const doctorServicesRelations = relations(doctorServices, ({one}) => ({
	doctor: one(doctors, {
		fields: [doctorServices.doctorId],
		references: [doctors.id]
	}),
	medicalService: one(medicalServices, {
		fields: [doctorServices.serviceId],
		references: [medicalServices.id]
	}),
}));

export const organizationRelations = relations(organization, ({one, many}) => ({
	medicalServices: many(medicalServices),
	plan: one(plans, {
		fields: [organization.planId],
		references: [plans.id]
	}),
	organizationInvitationsRequests: many(organizationInvitationsRequest),
	patients: many(patients),
	users: many(users),
}));

export const plansRelations = relations(plans, ({many}) => ({
	organizations: many(organization),
}));

export const organizationInvitationsRequestRelations = relations(organizationInvitationsRequest, ({one}) => ({
	organization: one(organization, {
		fields: [organizationInvitationsRequest.organizationId],
		references: [organization.id]
	}),
}));
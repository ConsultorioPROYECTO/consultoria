CREATE TYPE "public"."access_level" AS ENUM('private', 'organization', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."appointment_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'accepted', 'attended', 'rejected', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');--> statement-breakpoint
CREATE TYPE "public"."file_category" AS ENUM('medical_document', 'patient_photo', 'medical_image', 'appointment_note', 'prescription', 'lab_result', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'F', 'Other');--> statement-breakpoint
CREATE TYPE "public"."identification_type" AS ENUM('DNI', 'CC', 'TI', 'CE', 'PP', 'RC', 'AS');--> statement-breakpoint
CREATE TYPE "public"."invitation_role" AS ENUM('admin', 'medico', 'asistente', 'N/A');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'synced', 'failed', 'not_synced');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'medico', 'asistente', 'N/A');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "appointments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doctor_id" integer NOT NULL,
	"patient_id" integer,
	"service_id" integer,
	"organization_id" integer NOT NULL,
	"appointment_date" timestamp NOT NULL,
	"appointment_time" varchar(8) NOT NULL,
	"end_time" varchar(8),
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"patient_notes" text,
	"appointment_price" varchar(20),
	"priority" "appointment_priority" DEFAULT 'normal',
	"is_first_time" integer DEFAULT 0,
	"is_follow_up" integer DEFAULT 0,
	"follow_up_of_id" integer,
	"google_event_id" varchar(255) NOT NULL,
	"google_calendar_id" varchar(255) NOT NULL,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"last_sync_attempt" timestamp,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"canceled_at" timestamp,
	"attended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assistant_doctor" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assistant_doctor_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"assistant_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assistants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assistants_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "contact_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contact_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_services" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doctor_services_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doctor_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"custom_price" numeric(10, 2),
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doctors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"speciality" varchar(255) NOT NULL,
	"calendar_id" varchar(255),
	"private_phone" varchar(255) NOT NULL,
	"nit_id" varchar(255) NOT NULL,
	"token_google_id" varchar(255) NOT NULL,
	"calendar_timezone" varchar(50) DEFAULT 'America/Bogota' NOT NULL,
	"calendar_color" varchar(7) DEFAULT '#1976D2' NOT NULL,
	"calendar_sync_enabled" boolean DEFAULT true NOT NULL,
	"last_calendar_sync" timestamp,
	"calendar_settings" jsonb,
	"working_hours" jsonb,
	"appointment_duration" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"firebase_uid" varchar(255) NOT NULL,
	"email" varchar(255),
	"email_verified" boolean DEFAULT false,
	"phone_number" varchar(50),
	"display_name" varchar(255),
	"photo_url" text,
	"provider_id" varchar(50),
	"role" "user_role" DEFAULT 'N/A' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"organization_id" integer,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"invitation_code" varchar(6) NOT NULL,
	"address" varchar(255),
	"phone" varchar(15),
	"email" varchar(255),
	"nit" varchar(45),
	"logo" varchar(255),
	"timezone" varchar(40),
	"currency" varchar(40),
	"plan_id" integer,
	"instance_id" varchar(25),
	"api_key" varchar(25),
	"r2_bucket_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invitation_code_unique" UNIQUE("invitation_code"),
	CONSTRAINT "organization_r2_bucket_name_unique" UNIQUE("r2_bucket_name")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "patients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"identification_type" "identification_type" NOT NULL,
	"identification_number" varchar(50) NOT NULL,
	"birth_date" date,
	"gender" "gender" NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"emergency_contact_name" varchar(200),
	"emergency_contact_phone" varchar(20),
	"emergency_contact_relation" varchar(50),
	"medical_history" text,
	"allergies" text,
	"current_medications" text,
	"blood_type" "blood_type",
	"organization_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_identification_unique" UNIQUE("identification_type","identification_number")
);
--> statement-breakpoint
CREATE TABLE "medical_services" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "medical_services_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"code" varchar(50) NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"base_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"category" varchar(100) NOT NULL,
	"requires_preparation" boolean DEFAULT false NOT NULL,
	"preparation_instructions" text,
	"organization_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_code_organization_unique" UNIQUE("code","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organization_invitations_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_invitations_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"invitation_token" char(6) NOT NULL,
	"role" "invitation_role" DEFAULT 'N/A' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"message" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"cancelled_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "organization_invitations_request_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"price_monthly" integer NOT NULL,
	"price_annually" integer NOT NULL,
	"features" jsonb NOT NULL,
	"token_limit" varchar(100) NOT NULL,
	"medicos_limit" varchar(100) NOT NULL,
	"asistentes_limit" varchar(100) NOT NULL,
	"is_popular" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "r2_objects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "r2_objects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"object_key" varchar(500) NOT NULL,
	"object_name" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"file_hash" varchar(64),
	"patient_id" integer,
	"appointment_id" integer,
	"doctor_id" integer,
	"medical_service_id" integer,
	"organization_id" integer NOT NULL,
	"file_category" "file_category" NOT NULL,
	"description" text,
	"tags" jsonb,
	"last_presigned_url" text,
	"presigned_url_expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"access_level" "access_level" DEFAULT 'private' NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "unique_object_key_org" UNIQUE("object_key","organization_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_medical_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."medical_services"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assistant_doctor" ADD CONSTRAINT "assistant_doctor_assistant_id_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."assistants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_doctor" ADD CONSTRAINT "assistant_doctor_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_service_id_medical_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."medical_services"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medical_services" ADD CONSTRAINT "medical_services_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "organization_invitations_request" ADD CONSTRAINT "org_inv_req_org_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "r2_objects" ADD CONSTRAINT "r2_objects_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "r2_objects" ADD CONSTRAINT "r2_objects_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "r2_objects" ADD CONSTRAINT "r2_objects_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "r2_objects" ADD CONSTRAINT "r2_objects_medical_service_id_medical_services_id_fk" FOREIGN KEY ("medical_service_id") REFERENCES "public"."medical_services"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "r2_objects" ADD CONSTRAINT "r2_objects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "r2_objects" ADD CONSTRAINT "r2_objects_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_appointments_doctor_id" ON "appointments" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient_id" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_service_id" ON "appointments" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_organization_id" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_date_time" ON "appointments" USING btree ("appointment_date","appointment_time");--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appointments_priority" ON "appointments" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_date" ON "appointments" USING btree ("organization_id","appointment_date");--> statement-breakpoint
CREATE INDEX "idx_appointments_org_status" ON "appointments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_appointments_doctor_date" ON "appointments" USING btree ("doctor_id","appointment_date");--> statement-breakpoint
CREATE INDEX "idx_appointments_doctor_status" ON "appointments" USING btree ("doctor_id","status");--> statement-breakpoint
CREATE INDEX "idx_appointments_patient_date" ON "appointments" USING btree ("patient_id","appointment_date");--> statement-breakpoint
CREATE INDEX "idx_appointments_created_at" ON "appointments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_attended_at" ON "appointments" USING btree ("attended_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_canceled_at" ON "appointments" USING btree ("canceled_at");--> statement-breakpoint
CREATE INDEX "idx_appointments_google_event_id" ON "appointments" USING btree ("google_event_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_sync_status" ON "appointments" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "idx_appointments_follow_up" ON "appointments" USING btree ("follow_up_of_id");--> statement-breakpoint
CREATE INDEX "idx_appointments_first_time" ON "appointments" USING btree ("is_first_time");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_doctor_unique_idx" ON "assistant_doctor" USING btree ("assistant_id","doctor_id");--> statement-breakpoint
CREATE INDEX "assistant_doctor_assistant_id_idx" ON "assistant_doctor" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "assistant_doctor_doctor_id_idx" ON "assistant_doctor" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "assistant_user_id_idx" ON "assistants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "doctor_services_unique_idx" ON "doctor_services" USING btree ("doctor_id","service_id");--> statement-breakpoint
CREATE INDEX "doctor_services_doctor_id_idx" ON "doctor_services" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "doctor_services_service_id_idx" ON "doctor_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "doctor_services_available_idx" ON "doctor_services" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "doctors_user_id_idx" ON "doctors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "firebase_uid_idx" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "phone_number_idx" ON "users" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "organization_name_idx" ON "organization" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organization_email_idx" ON "organization" USING btree ("email");--> statement-breakpoint
CREATE INDEX "organization_phone_idx" ON "organization" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "organization_nit_idx" ON "organization" USING btree ("nit");--> statement-breakpoint
CREATE INDEX "organization_invitation_code_idx" ON "organization" USING btree ("invitation_code");--> statement-breakpoint
CREATE INDEX "organization_plan_id_idx" ON "organization" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "organization_instance_id_idx" ON "organization" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "organization_api_key_idx" ON "organization" USING btree ("api_key");--> statement-breakpoint
CREATE INDEX "patient_organization_id_idx" ON "patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_name_idx" ON "patients" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "patient_email_idx" ON "patients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "patient_phone_idx" ON "patients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "service_code_idx" ON "medical_services" USING btree ("code");--> statement-breakpoint
CREATE INDEX "service_organization_id_idx" ON "medical_services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_name_idx" ON "medical_services" USING btree ("name");--> statement-breakpoint
CREATE INDEX "service_category_idx" ON "medical_services" USING btree ("category");--> statement-breakpoint
CREATE INDEX "service_active_idx" ON "medical_services" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "inv_org_id_idx" ON "organization_invitations_request" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inv_status_idx" ON "organization_invitations_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inv_created_at_idx" ON "organization_invitations_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inv_approved_at_idx" ON "organization_invitations_request" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "inv_rejected_at_idx" ON "organization_invitations_request" USING btree ("rejected_at");--> statement-breakpoint
CREATE INDEX "inv_cancelled_at_idx" ON "organization_invitations_request" USING btree ("cancelled_at");--> statement-breakpoint
CREATE INDEX "inv_user_email_idx" ON "organization_invitations_request" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "inv_invitation_token_idx" ON "organization_invitations_request" USING btree ("invitation_token");--> statement-breakpoint
CREATE INDEX "inv_role_idx" ON "organization_invitations_request" USING btree ("role");--> statement-breakpoint
CREATE INDEX "plan_name_idx" ON "plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_organization_id" ON "r2_objects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_patient_id" ON "r2_objects" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_appointment_id" ON "r2_objects" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_doctor_id" ON "r2_objects" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_medical_service_id" ON "r2_objects" USING btree ("medical_service_id");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_category" ON "r2_objects" USING btree ("file_category");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_uploaded_by" ON "r2_objects" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_created_at" ON "r2_objects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_object_key" ON "r2_objects" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "idx_r2_objects_active" ON "r2_objects" USING btree ("is_active");
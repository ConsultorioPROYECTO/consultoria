CREATE TABLE `r2_objects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`object_key` varchar(500) NOT NULL,
	`object_name` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`file_size` bigint NOT NULL,
	`file_hash` varchar(64),
	`patient_id` int,
	`appointment_id` int,
	`doctor_id` int,
	`medical_service_id` int,
	`organization_id` int NOT NULL,
	`file_category` enum('medical_document','patient_photo','medical_image','appointment_note','prescription','lab_result','other') NOT NULL,
	`description` text,
	`tags` json,
	`last_presigned_url` text,
	`presigned_url_expires_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_public` boolean NOT NULL DEFAULT false,
	`access_level` enum('private','organization','restricted') NOT NULL DEFAULT 'private',
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `r2_objects_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_object_key_org` UNIQUE(`object_key`,`organization_id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `r2_objects` ADD CONSTRAINT `r2_objects_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `r2_objects` ADD CONSTRAINT `r2_objects_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `r2_objects` ADD CONSTRAINT `r2_objects_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`idDoctor`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `r2_objects` ADD CONSTRAINT `r2_objects_medical_service_id_medical_services_id_fk` FOREIGN KEY (`medical_service_id`) REFERENCES `medical_services`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `r2_objects` ADD CONSTRAINT `r2_objects_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `r2_objects` ADD CONSTRAINT `r2_objects_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `idx_r2_objects_organization_id` ON `r2_objects` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_patient_id` ON `r2_objects` (`patient_id`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_appointment_id` ON `r2_objects` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_doctor_id` ON `r2_objects` (`doctor_id`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_medical_service_id` ON `r2_objects` (`medical_service_id`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_category` ON `r2_objects` (`file_category`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_uploaded_by` ON `r2_objects` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_created_at` ON `r2_objects` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_object_key` ON `r2_objects` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_r2_objects_active` ON `r2_objects` (`is_active`);
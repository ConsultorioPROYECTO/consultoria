ALTER TABLE `appointments` MODIFY COLUMN `status` enum('Confirmada','Completada','Pendiente','Llegó','Cancelada') NOT NULL DEFAULT 'Pendiente';--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `patient_name` varchar(255);--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `service` varchar(255);--> statement-breakpoint
ALTER TABLE `appointments` ADD `patient_id` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `service_id` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `cancel_reason` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reminder_sent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_service_id_medical_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `medical_services`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `appointment_patient_id_idx` ON `appointments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `appointment_service_id_idx` ON `appointments` (`service_id`);--> statement-breakpoint
CREATE INDEX `appointment_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `appointment_date_time_idx` ON `appointments` (`date`,`time`);
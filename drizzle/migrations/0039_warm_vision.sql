DROP INDEX `appointment_doctor_id_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_patient_id_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_service_id_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_organization_id_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_status_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_google_event_id_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_google_calendar_id_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_sync_status_idx` ON `appointments`;--> statement-breakpoint
ALTER TABLE `appointments` ADD `appointment_date` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `appointment_time` varchar(8) NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `end_time` varchar(8);--> statement-breakpoint
ALTER TABLE `appointments` ADD `duration_minutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `patient_notes` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `appointment_price` varchar(20);--> statement-breakpoint
ALTER TABLE `appointments` ADD `priority` enum('low','normal','high','urgent') DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `appointments` ADD `is_first_time` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `appointments` ADD `is_follow_up` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `appointments` ADD `follow_up_of_id` int;--> statement-breakpoint
ALTER TABLE `appointments` ADD `canceled_at` timestamp;--> statement-breakpoint
ALTER TABLE `appointments` ADD `attended_at` timestamp;--> statement-breakpoint
CREATE INDEX `idx_appointments_doctor_id` ON `appointments` (`doctor_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_patient_id` ON `appointments` (`patient_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_service_id` ON `appointments` (`service_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_organization_id` ON `appointments` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_date_time` ON `appointments` (`appointment_date`,`appointment_time`);--> statement-breakpoint
CREATE INDEX `idx_appointments_status` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_appointments_priority` ON `appointments` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_appointments_org_date` ON `appointments` (`organization_id`,`appointment_date`);--> statement-breakpoint
CREATE INDEX `idx_appointments_org_status` ON `appointments` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_appointments_doctor_date` ON `appointments` (`doctor_id`,`appointment_date`);--> statement-breakpoint
CREATE INDEX `idx_appointments_doctor_status` ON `appointments` (`doctor_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_appointments_patient_date` ON `appointments` (`patient_id`,`appointment_date`);--> statement-breakpoint
CREATE INDEX `idx_appointments_created_at` ON `appointments` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_appointments_attended_at` ON `appointments` (`attended_at`);--> statement-breakpoint
CREATE INDEX `idx_appointments_canceled_at` ON `appointments` (`canceled_at`);--> statement-breakpoint
CREATE INDEX `idx_appointments_google_event_id` ON `appointments` (`google_event_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_sync_status` ON `appointments` (`sync_status`);--> statement-breakpoint
CREATE INDEX `idx_appointments_follow_up` ON `appointments` (`follow_up_of_id`);--> statement-breakpoint
CREATE INDEX `idx_appointments_first_time` ON `appointments` (`is_first_time`);
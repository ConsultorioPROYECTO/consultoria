DROP INDEX `appointment_time_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_date_idx` ON `appointments`;--> statement-breakpoint
DROP INDEX `appointment_date_time_idx` ON `appointments`;--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `google_event_id` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `google_calendar_id` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `time`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `date`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `cancel_reason`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `reminder_sent`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `patient_name`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `service`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `duration_minutes`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `is_virtual`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `meeting_link`;--> statement-breakpoint
ALTER TABLE `doctors` DROP COLUMN `availability`;--> statement-breakpoint
ALTER TABLE `doctors` DROP COLUMN `working_hours`;--> statement-breakpoint
ALTER TABLE `doctors` DROP COLUMN `break_times`;
ALTER TABLE `appointments` ADD `google_event_id` varchar(255);--> statement-breakpoint
ALTER TABLE `appointments` ADD `google_calendar_id` varchar(255);--> statement-breakpoint
ALTER TABLE `appointments` ADD `sync_status` enum('pending','synced','failed','not_synced') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `last_sync_attempt` timestamp;--> statement-breakpoint
ALTER TABLE `appointments` ADD `sync_error` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `duration_minutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `is_virtual` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD `meeting_link` varchar(500);--> statement-breakpoint
ALTER TABLE `doctors` ADD `calendar_timezone` varchar(50) DEFAULT 'America/Bogota' NOT NULL;--> statement-breakpoint
ALTER TABLE `doctors` ADD `calendar_color` varchar(7) DEFAULT '#1976D2' NOT NULL;--> statement-breakpoint
ALTER TABLE `doctors` ADD `calendar_sync_enabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `doctors` ADD `last_calendar_sync` timestamp;--> statement-breakpoint
ALTER TABLE `doctors` ADD `calendar_settings` json;--> statement-breakpoint
ALTER TABLE `doctors` ADD `working_hours` json;--> statement-breakpoint
ALTER TABLE `doctors` ADD `break_times` json;--> statement-breakpoint
ALTER TABLE `doctors` ADD `appointment_duration` int DEFAULT 30 NOT NULL;--> statement-breakpoint
CREATE INDEX `appointment_google_event_id_idx` ON `appointments` (`google_event_id`);--> statement-breakpoint
CREATE INDEX `appointment_google_calendar_id_idx` ON `appointments` (`google_calendar_id`);--> statement-breakpoint
CREATE INDEX `appointment_sync_status_idx` ON `appointments` (`sync_status`);
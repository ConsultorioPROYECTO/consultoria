ALTER TABLE `organization` RENAME COLUMN `timezone` TO `timezone_id`;--> statement-breakpoint
ALTER TABLE `organization` MODIFY COLUMN `timezone_id` int unsigned;--> statement-breakpoint
ALTER TABLE `organization` ADD CONSTRAINT `organization_timezone_id_timezones_id_fk` FOREIGN KEY (`timezone_id`) REFERENCES `timezones`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `organization_timezone_id_idx` ON `organization` (`timezone_id`);
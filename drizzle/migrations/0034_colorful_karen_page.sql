ALTER TABLE `organization` ADD `instance_id` varchar(25);--> statement-breakpoint
ALTER TABLE `organization` ADD `api_key` varchar(25);--> statement-breakpoint
CREATE INDEX `organization_plan_id_idx` ON `organization` (`plan_id`);--> statement-breakpoint
CREATE INDEX `organization_instance_id_idx` ON `organization` (`instance_id`);--> statement-breakpoint
CREATE INDEX `organization_api_key_idx` ON `organization` (`api_key`);
ALTER TABLE `organization` ADD `welcome_message` varchar(255);--> statement-breakpoint
CREATE INDEX `organization_r2_bucket_name_idx` ON `organization` (`r2_bucket_name`);
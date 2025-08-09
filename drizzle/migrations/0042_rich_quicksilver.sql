ALTER TABLE `organization` ADD `r2_bucket_name` varchar(255);--> statement-breakpoint
ALTER TABLE `organization` ADD CONSTRAINT `organization_r2_bucket_name_unique` UNIQUE(`r2_bucket_name`);
ALTER TABLE `organization_join_request` DROP FOREIGN KEY `organization_join_request_user_id_users_id_fk`;
--> statement-breakpoint
DROP INDEX `user_id_idx` ON `organization_join_request`;--> statement-breakpoint
ALTER TABLE `organization_join_request` ADD `user_email` varchar(255) NOT NULL;--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `organization_join_request` (`user_email`);--> statement-breakpoint
ALTER TABLE `organization_join_request` DROP COLUMN `user_id`;
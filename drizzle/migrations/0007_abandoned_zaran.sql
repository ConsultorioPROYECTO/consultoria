CREATE TABLE `organization` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` varchar(255),
	`phone` varchar(15),
	`email` varchar(255),
	`nit` varchar(45),
	`logo` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `organization_id` int;--> statement-breakpoint
CREATE INDEX `organization_name_idx` ON `organization` (`name`);--> statement-breakpoint
CREATE INDEX `organization_email_idx` ON `organization` (`email`);--> statement-breakpoint
CREATE INDEX `organization_phone_idx` ON `organization` (`phone`);--> statement-breakpoint
CREATE INDEX `organization_nit_idx` ON `organization` (`nit`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;
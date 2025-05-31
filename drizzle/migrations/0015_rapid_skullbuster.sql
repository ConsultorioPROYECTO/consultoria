CREATE TABLE `organization_join_request` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`user_id` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`message` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`approved_at` timestamp,
	`rejected_at` timestamp,
	`cancelled_at` timestamp,
	`is_deleted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `organization_join_request_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `organization_join_request` ADD CONSTRAINT `organization_join_request_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `organization_join_request` ADD CONSTRAINT `organization_join_request_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `organization_id_idx` ON `organization_join_request` (`organization_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `organization_join_request` (`user_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `organization_join_request` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `organization_join_request` (`created_at`);--> statement-breakpoint
CREATE INDEX `approved_at_idx` ON `organization_join_request` (`approved_at`);--> statement-breakpoint
CREATE INDEX `rejected_at_idx` ON `organization_join_request` (`rejected_at`);--> statement-breakpoint
CREATE INDEX `cancelled_at_idx` ON `organization_join_request` (`cancelled_at`);
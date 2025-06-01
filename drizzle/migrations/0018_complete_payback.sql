CREATE TABLE `organization_invitations_request` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`user_email` varchar(255) NOT NULL,
	`role` enum('admin','medico','asistente','N/A') NOT NULL DEFAULT 'N/A',
	`status` enum('pending','approved','rejected','cancelled','expired') NOT NULL DEFAULT 'pending',
	`message` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`approved_at` timestamp,
	`rejected_at` timestamp,
	`cancelled_at` timestamp,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`expires_at` timestamp,
	CONSTRAINT `organization_invitations_request_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `organization_join_request`;--> statement-breakpoint
ALTER TABLE `organization` MODIFY COLUMN `invitation_code` varchar(6) NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD CONSTRAINT `organization_invitation_code_unique` UNIQUE(`invitation_code`);--> statement-breakpoint
ALTER TABLE `organization_invitations_request` ADD CONSTRAINT `organization_invitations_request_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `organization_id_idx` ON `organization_invitations_request` (`organization_id`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `organization_invitations_request` (`status`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `organization_invitations_request` (`created_at`);--> statement-breakpoint
CREATE INDEX `approved_at_idx` ON `organization_invitations_request` (`approved_at`);--> statement-breakpoint
CREATE INDEX `rejected_at_idx` ON `organization_invitations_request` (`rejected_at`);--> statement-breakpoint
CREATE INDEX `cancelled_at_idx` ON `organization_invitations_request` (`cancelled_at`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `organization_invitations_request` (`user_email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `organization_invitations_request` (`role`);
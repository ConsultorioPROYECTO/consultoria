CREATE TABLE `plans` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(255),
	`price` int NOT NULL,
	`duration` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `organization` ADD `plan_id` int unsigned;--> statement-breakpoint
CREATE INDEX `plan_name_idx` ON `plans` (`name`);--> statement-breakpoint
ALTER TABLE `organization` ADD CONSTRAINT `organization_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE cascade;
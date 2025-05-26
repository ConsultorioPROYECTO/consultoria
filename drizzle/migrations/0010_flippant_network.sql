CREATE TABLE `assistants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assistants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assistant_doctor` (
	`assistant_id` int NOT NULL,
	`doctor_id` int NOT NULL
);
--> statement-breakpoint
ALTER TABLE `assistants` ADD CONSTRAINT `assistants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `assistant_doctor` ADD CONSTRAINT `assistant_doctor_assistant_id_assistants_id_fk` FOREIGN KEY (`assistant_id`) REFERENCES `assistants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assistant_doctor` ADD CONSTRAINT `assistant_doctor_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assistant_user_id_idx` ON `assistants` (`user_id`);
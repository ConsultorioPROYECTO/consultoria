CREATE TABLE `doctors` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`speciality` varchar(255) NOT NULL,
	`calendar_id` varchar(255) NOT NULL,
	`private_phone` varchar(255) NOT NULL,
	`nit_id` varchar(255) NOT NULL,
	`availability` varchar(255) NOT NULL,
	`token_google_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctors_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE INDEX `firebase_uid_idx` ON `doctors` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `doctors` (`user_id`);--> statement-breakpoint
CREATE INDEX `phone_number_idx` ON `doctors` (`user_id`);
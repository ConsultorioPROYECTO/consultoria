CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`firebase_uid` varchar(255) NOT NULL,
	`email` varchar(255),
	`email_verified` boolean DEFAULT false,
	`phone_number` varchar(50),
	`display_name` varchar(255),
	`photo_url` text,
	`provider_id` varchar(50),
	`role` enum('admin','medico','asistente','N/A') NOT NULL DEFAULT 'N/A',
	`is_active` boolean NOT NULL DEFAULT true,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_firebase_uid_unique` UNIQUE(`firebase_uid`)
);
--> statement-breakpoint
CREATE INDEX `firebase_uid_idx` ON `users` (`firebase_uid`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `phone_number_idx` ON `users` (`phone_number`);
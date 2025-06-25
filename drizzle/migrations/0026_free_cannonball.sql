ALTER TABLE `assistants` ADD CONSTRAINT `assistants_user_id_unique` UNIQUE(`user_id`);--> statement-breakpoint
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_user_id_unique` UNIQUE(`user_id`);
ALTER TABLE `doctors` DROP INDEX `doctors_user_id_unique`;--> statement-breakpoint
ALTER TABLE `doctors` MODIFY COLUMN `user_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE cascade;
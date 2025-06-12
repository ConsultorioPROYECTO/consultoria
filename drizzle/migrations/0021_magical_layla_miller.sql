ALTER TABLE `patients` DROP FOREIGN KEY `patients_user_id_users_id_fk`;
--> statement-breakpoint
DROP INDEX `patient_user_id_idx` ON `patients`;--> statement-breakpoint
ALTER TABLE `patients` DROP COLUMN `user_id`;
CREATE TABLE `appointments` (
	`id_appointment` serial AUTO_INCREMENT NOT NULL,
	`doctor_id` int NOT NULL,
	`time` varchar(5) NOT NULL,
	`patient_name` varchar(255) NOT NULL,
	`service` varchar(255) NOT NULL,
	`date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id_appointment` PRIMARY KEY(`id_appointment`)
);
--> statement-breakpoint
ALTER TABLE `doctors` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `appointment_doctor_id_idx` ON `appointments` (`doctor_id`);--> statement-breakpoint
CREATE INDEX `appointment_time_idx` ON `appointments` (`time`);--> statement-breakpoint
CREATE INDEX `appointment_date_idx` ON `appointments` (`date`);
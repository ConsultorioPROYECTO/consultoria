CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_code` varchar(20) NOT NULL,
	`user_id` int,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`identification_type` enum('CC','TI','CE','PP','RC','AS') NOT NULL,
	`identification_number` varchar(50) NOT NULL,
	`birth_date` date,
	`gender` enum('M','F','Other') NOT NULL,
	`phone` varchar(20),
	`email` varchar(255),
	`address` text,
	`emergency_contact_name` varchar(200),
	`emergency_contact_phone` varchar(20),
	`emergency_contact_relation` varchar(50),
	`medical_history` text,
	`allergies` text,
	`current_medications` text,
	`blood_type` enum('A+','A-','B+','B-','AB+','AB-','O+','O-'),
	`organization_id` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_patient_code_unique` UNIQUE(`patient_code`)
);
--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `patient_code_idx` ON `patients` (`patient_code`);--> statement-breakpoint
CREATE INDEX `patient_user_id_idx` ON `patients` (`user_id`);--> statement-breakpoint
CREATE INDEX `patient_organization_id_idx` ON `patients` (`organization_id`);--> statement-breakpoint
CREATE INDEX `patient_identification_idx` ON `patients` (`identification_type`,`identification_number`);--> statement-breakpoint
CREATE INDEX `patient_name_idx` ON `patients` (`first_name`,`last_name`);--> statement-breakpoint
CREATE INDEX `patient_email_idx` ON `patients` (`email`);--> statement-breakpoint
CREATE INDEX `patient_phone_idx` ON `patients` (`phone`);
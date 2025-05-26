CREATE TABLE `doctor_services` (
	`doctor_id` int NOT NULL,
	`service_id` int NOT NULL,
	`custom_price` decimal(10,2),
	`is_available` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `doctor_services` ADD CONSTRAINT `doctor_services_doctor_id_doctors_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `doctor_services` ADD CONSTRAINT `doctor_services_service_id_medical_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `medical_services`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `doctor_services_doctor_id_idx` ON `doctor_services` (`doctor_id`);--> statement-breakpoint
CREATE INDEX `doctor_services_service_id_idx` ON `doctor_services` (`service_id`);--> statement-breakpoint
CREATE INDEX `doctor_services_available_idx` ON `doctor_services` (`is_available`);--> statement-breakpoint
CREATE INDEX `doctor_services_doctor_service_idx` ON `doctor_services` (`doctor_id`,`service_id`);
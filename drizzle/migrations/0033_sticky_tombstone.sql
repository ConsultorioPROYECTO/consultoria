DROP INDEX `doctor_services_doctor_service_idx` ON `doctor_services`;--> statement-breakpoint
ALTER TABLE `doctor_services` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `doctor_services` ADD `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `doctor_services` ADD CONSTRAINT `doctor_services_unique_idx` UNIQUE(`doctor_id`,`service_id`);
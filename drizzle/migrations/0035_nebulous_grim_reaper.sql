ALTER TABLE `assistant_doctor` ADD `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `assistant_doctor` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `assistant_doctor` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `assistant_doctor` ADD CONSTRAINT `assistant_doctor_unique_idx` UNIQUE(`assistant_id`,`doctor_id`);
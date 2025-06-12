ALTER TABLE `patients` DROP INDEX `patients_patient_code_unique`;--> statement-breakpoint
DROP INDEX `patient_code_idx` ON `patients`;--> statement-breakpoint
DROP INDEX `patient_identification_idx` ON `patients`;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patient_identification_unique` UNIQUE(`identification_type`,`identification_number`);--> statement-breakpoint
ALTER TABLE `patients` DROP COLUMN `patient_code`;
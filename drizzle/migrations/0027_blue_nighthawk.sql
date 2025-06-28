ALTER TABLE `appointments` ADD `organization_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `appointment_organization_id_idx` ON `appointments` (`organization_id`);
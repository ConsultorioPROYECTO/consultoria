CREATE TABLE `medical_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`code` varchar(50) NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 30,
	`base_price` decimal(10,2) NOT NULL DEFAULT '0.00',
	`category` varchar(100) NOT NULL,
	`requires_preparation` boolean NOT NULL DEFAULT false,
	`preparation_instructions` text,
	`organization_id` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_services_id` PRIMARY KEY(`id`),
	CONSTRAINT `medical_services_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `medical_services` ADD CONSTRAINT `medical_services_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `service_code_idx` ON `medical_services` (`code`);--> statement-breakpoint
CREATE INDEX `service_organization_id_idx` ON `medical_services` (`organization_id`);--> statement-breakpoint
CREATE INDEX `service_name_idx` ON `medical_services` (`name`);--> statement-breakpoint
CREATE INDEX `service_category_idx` ON `medical_services` (`category`);--> statement-breakpoint
CREATE INDEX `service_active_idx` ON `medical_services` (`is_active`);
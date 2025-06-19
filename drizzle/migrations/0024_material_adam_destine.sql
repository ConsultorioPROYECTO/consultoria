ALTER TABLE `plans` MODIFY COLUMN `description` varchar(500);--> statement-breakpoint
ALTER TABLE `plans` ADD `price_monthly` int NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `price_annually` int NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `features` json NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `token_limit` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `medicos_limit` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `asistentes_limit` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `is_popular` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `plans` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `plans` DROP COLUMN `duration`;
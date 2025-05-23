ALTER TABLE `appointments` RENAME COLUMN `id_appointment` TO `id`;--> statement-breakpoint
ALTER TABLE `appointments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `appointments` ADD PRIMARY KEY(`id`);
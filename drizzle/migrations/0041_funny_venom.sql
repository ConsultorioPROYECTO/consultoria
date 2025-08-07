CREATE TABLE `timezones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`country_codes` varchar(100) NOT NULL,
	`coordinates` varchar(50) NOT NULL,
	`timezone_name` varchar(100) NOT NULL,
	`comments` text,
	CONSTRAINT `timezones_id` PRIMARY KEY(`id`),
	CONSTRAINT `timezones_timezone_name_unique` UNIQUE(`timezone_name`)
);
--> statement-breakpoint
CREATE INDEX `timezone_name_idx` ON `timezones` (`timezone_name`);--> statement-breakpoint
CREATE INDEX `country_codes_idx` ON `timezones` (`country_codes`);
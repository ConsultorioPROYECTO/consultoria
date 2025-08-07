ALTER TABLE `organization_invitations_request` ADD `invitation_token` char(6) NOT NULL;--> statement-breakpoint
ALTER TABLE `organization_invitations_request` ADD CONSTRAINT `organization_invitations_request_invitation_token_unique` UNIQUE(`invitation_token`);--> statement-breakpoint
CREATE INDEX `invitation_token_idx` ON `organization_invitations_request` (`invitation_token`);
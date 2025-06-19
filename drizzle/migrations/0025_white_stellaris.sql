ALTER TABLE `organization_invitations_request` DROP FOREIGN KEY `organization_invitations_request_organization_id_organization_id_fk`;
--> statement-breakpoint
ALTER TABLE `organization_invitations_request` ADD CONSTRAINT `org_inv_req_org_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE cascade;
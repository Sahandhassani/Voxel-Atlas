CREATE TABLE `platform_admin_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`budget_usd` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`modality` text NOT NULL,
	`sample_id` text,
	`object_key` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `platform_datasets_owner_idx` ON `platform_datasets` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `platform_datasets_object_unique` ON `platform_datasets` (`object_key`);--> statement-breakpoint
CREATE TABLE `platform_federated_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`config_json` text NOT NULL,
	`yaml` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `platform_federated_owner_idx` ON `platform_federated_configs` (`owner_id`);--> statement-breakpoint
CREATE TABLE `platform_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`request_key` text NOT NULL,
	`model_id` text NOT NULL,
	`dataset_id` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`cost_credits` integer NOT NULL,
	`output_url` text NOT NULL,
	`viewer_url` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_jobs_request_unique` ON `platform_jobs` (`owner_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `platform_jobs_owner_idx` ON `platform_jobs` (`owner_id`);--> statement-breakpoint
CREATE TABLE `platform_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `platform_sessions_user_idx` ON `platform_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `platform_sessions_expiry_idx` ON `platform_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_storage_usage` (
	`key` text PRIMARY KEY NOT NULL,
	`used_bytes` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_users` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`member_id` text NOT NULL,
	`credits` integer DEFAULT 500 NOT NULL,
	`storage_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_users_member_unique` ON `platform_users` (`member_id`);--> statement-breakpoint
CREATE TABLE `platform_vault_claims` (
	`user_id` text PRIMARY KEY NOT NULL,
	`claimed_at` integer NOT NULL,
	`prize_credits` integer NOT NULL
);

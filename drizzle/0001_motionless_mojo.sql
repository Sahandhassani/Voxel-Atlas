CREATE TABLE `platform_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`request_key` text NOT NULL,
	`reply_to_id` text,
	`model` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_chat_message_request_unique` ON `platform_chat_messages` (`thread_id`,`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `platform_chat_message_reply_unique` ON `platform_chat_messages` (`thread_id`,`reply_to_id`);--> statement-breakpoint
CREATE INDEX `platform_chat_message_thread_idx` ON `platform_chat_messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `platform_chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`order_id` text,
	`request_key` text NOT NULL,
	`active_request` text,
	`active_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_chat_thread_request_unique` ON `platform_chat_threads` (`owner_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `platform_chat_thread_owner_idx` ON `platform_chat_threads` (`owner_id`,`updated_at`);
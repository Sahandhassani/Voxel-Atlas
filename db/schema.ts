import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const platformUsers = sqliteTable('platform_users', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), name: text('name').notNull(),
  memberId: text('member_id').notNull(), credits: integer('credits').notNull().default(500),
  storageBytes: integer('storage_bytes').notNull().default(0), createdAt: integer('created_at').notNull(),
}, t => [uniqueIndex('platform_users_member_unique').on(t.memberId)]);

export const platformSessions = sqliteTable('platform_sessions', {
  tokenHash: text('token_hash').primaryKey(), userId: text('user_id').notNull(), kind: text('kind').notNull(),
  expiresAt: integer('expires_at').notNull(), createdAt: integer('created_at').notNull(),
}, t => [index('platform_sessions_user_idx').on(t.userId), index('platform_sessions_expiry_idx').on(t.expiresAt)]);

export const platformDatasets = sqliteTable('platform_datasets', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), name: text('name').notNull(),
  kind: text('kind').notNull(), modality: text('modality').notNull(), sampleId: text('sample_id'),
  objectKey: text('object_key').notNull(), sizeBytes: integer('size_bytes').notNull(), createdAt: integer('created_at').notNull(),
}, t => [index('platform_datasets_owner_idx').on(t.ownerId), uniqueIndex('platform_datasets_object_unique').on(t.objectKey)]);

export const platformJobs = sqliteTable('platform_jobs', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), requestKey: text('request_key').notNull(),
  modelId: text('model_id').notNull(), datasetId: text('dataset_id').notNull(), status: text('status').notNull(),
  mode: text('mode').notNull(), costCredits: integer('cost_credits').notNull(),
  outputUrl: text('output_url').notNull(), viewerUrl: text('viewer_url').notNull(), createdAt: integer('created_at').notNull(),
}, t => [uniqueIndex('platform_jobs_request_unique').on(t.ownerId,t.requestKey),index('platform_jobs_owner_idx').on(t.ownerId)]);

export const platformFederatedConfigs = sqliteTable('platform_federated_configs', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), configJson: text('config_json').notNull(),
  yaml: text('yaml').notNull(), createdAt: integer('created_at').notNull(),
}, t => [index('platform_federated_owner_idx').on(t.ownerId)]);

export const platformSettings = sqliteTable('platform_settings', {
  key: text('key').primaryKey(), value: text('value').notNull(), updatedAt: integer('updated_at').notNull(),
});

export const platformAdminProjects = sqliteTable('platform_admin_projects', {
  id: text('id').primaryKey(), title: text('title').notNull(), description: text('description').notNull(),
  kind: text('kind').notNull(), status: text('status').notNull(), budgetUsd: integer('budget_usd'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
});

export const platformVaultClaims = sqliteTable('platform_vault_claims', {
  userId: text('user_id').primaryKey(), claimedAt: integer('claimed_at').notNull(), prizeCredits: integer('prize_credits').notNull(),
});

export const platformRateLimits = sqliteTable('platform_rate_limits', {
  key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull(),
});

export const platformStorageUsage = sqliteTable('platform_storage_usage', {
  key: text('key').primaryKey(), usedBytes: integer('used_bytes').notNull().default(0),
});

export const platformChatThreads = sqliteTable('platform_chat_threads', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  title: text('title').notNull(), orderId: text('order_id'),
  requestKey: text('request_key').notNull(),
  activeRequest: text('active_request'), activeUntil: integer('active_until').notNull().default(0),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, t => [uniqueIndex('platform_chat_thread_request_unique').on(t.ownerId, t.requestKey), index('platform_chat_thread_owner_idx').on(t.ownerId, t.updatedAt)]);

export const platformChatMessages = sqliteTable('platform_chat_messages', {
  id: text('id').primaryKey(), threadId: text('thread_id').notNull(), ownerId: text('owner_id').notNull(),
  role: text('role').notNull(), content: text('content').notNull(), source: text('source').notNull(),
  status: text('status').notNull(), requestKey: text('request_key').notNull(),
  replyToId: text('reply_to_id'), model: text('model'), createdAt: integer('created_at').notNull(),
}, t => [uniqueIndex('platform_chat_message_request_unique').on(t.threadId, t.requestKey), uniqueIndex('platform_chat_message_reply_unique').on(t.threadId, t.replyToId), index('platform_chat_message_thread_idx').on(t.threadId, t.createdAt)]);

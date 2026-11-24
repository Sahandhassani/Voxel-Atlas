import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleApi, platformAccountContext } from '../lib/platform-api.mjs';
import { handleMcp } from '../lib/site-mcp.mjs';
import { sendChatMessage, replyFromChatGPT, readChat, ChatError } from '../lib/central-chat.mjs';

const origin = 'https://chat-test.example';
const key = label => `test-request-${label}-${crypto.randomUUID()}`;
const identity = who => who === 'guest' ? {} : {
  'oai-authenticated-user-id': `chat-test-${who}`,
  'oai-authenticated-user-email': `${who}@example.test`,
};

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  const migrations = fs.readdirSync(new URL('../drizzle/', import.meta.url)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  for (const name of migrations) db.exec(fs.readFileSync(new URL(`../drizzle/${name}`, import.meta.url), 'utf8'));
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='platform_chat_threads'").get(), 'Apply the generated chat migration before running this suite.');
  class D1Statement {
    constructor(sql, args = []) { this.sql = sql; this.args = args; }
    bind(...args) { return new D1Statement(this.sql, args); }
    async first() { return db.prepare(this.sql).get(...this.args) || null; }
    async all() { return { results: db.prepare(this.sql).all(...this.args) }; }
    execute() {
      const statement = db.prepare(this.sql);
      if (statement.columns().length) return { success: true, results: statement.all(...this.args), meta: { changes: 0 } };
      return { success: true, meta: { changes: Number(statement.run(...this.args).changes) } };
    }
    async run() { return this.execute(); }
  }
  const DB = {
    prepare: sql => new D1Statement(sql),
    batch: async statements => {
      db.exec('BEGIN');
      try { const results = statements.map(statement => statement.execute()); db.exec('COMMIT'); return results; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  const env = { DB, ADMIN_EMAILS: 'owner@example.test' };
  const cookies = new Map();
  async function api(path, { who = 'alice', method = 'GET', body, raw, headers = {}, includeOrigin = true } = {}) {
    const requestHeaders = new Headers({ ...identity(who), ...headers });
    requestHeaders.set('cf-connecting-ip', who === 'guest' ? '192.0.2.2' : '192.0.2.3');
    if (cookies.has(who)) requestHeaders.set('cookie', cookies.get(who));
    if (includeOrigin && !['GET', 'HEAD'].includes(method) && !requestHeaders.has('origin')) requestHeaders.set('origin', origin);
    let payload = raw;
    if (body !== undefined) { payload = JSON.stringify(body); requestHeaders.set('content-type', 'application/json'); }
    const result = await handleApi(new Request(origin + path, { method, headers: requestHeaders, ...(payload !== undefined ? { body: payload } : {}) }), env);
    for (const cookie of result.headers.getSetCookie()) cookies.set(who, cookie.split(';')[0]);
    return { status: result.status, headers: result.headers, data: await result.json() };
  }
  async function rpc(method, params, { who = 'alice', headers = {}, raw, httpMethod = 'POST' } = {}) {
    const request = new Request(origin + '/mcp', {
      method: httpMethod,
      headers: { ...identity(who), 'content-type': 'application/json', ...headers },
      ...(httpMethod === 'POST' ? { body: raw ?? JSON.stringify({ jsonrpc: '2.0', id: 'test-rpc', method, ...(params !== undefined ? { params } : {}) }) } : {}),
    });
    const result = await handleMcp(request, env);
    return { status: result.status, headers: result.headers, data: result.status === 204 ? null : await result.json() };
  }
  const tool = (name, args = {}, options) => rpc('tools/call', { name, arguments: args }, options);
  const context = async (who = 'alice', extraEnv = {}) => platformAccountContext(new Request(origin + '/mcp', { headers: identity(who) }), { ...env, ...extraEnv });
  async function create(options = {}) {
    const { who = 'alice', ...input } = options;
    const result = await api('/api/chat/threads', { who, method: 'POST', body: { requestKey: key('create'), ...input } });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return result.data.thread;
  }
  async function message(thread, content = 'Discuss the project plan.', who = 'alice', requestKey = key('message')) {
    return api(`/api/chat/threads/${thread.id}/messages`, { who, method: 'POST', body: { content, requestKey } });
  }
  t.after(() => db.close());
  return { db, env, api, rpc, tool, context, create, message };
}

const toolData = result => result.data.result.structuredContent;
const toolError = result => JSON.parse(result.data.result.content[0].text).error;
const rejectsCode = (promise, code) => assert.rejects(promise, error => error instanceof ChatError && error.code === code);

test('public config/discovery work while private APIs and MCP tools require account identity', async t => {
  const f = fixture(t);
  const config = await f.api('/api/chat/config', { who: 'guest' });
  assert.equal(config.status, 200);
  assert.deepEqual(config.data.ai, { configured: false, model: null });
  assert.equal(config.headers.get('cache-control'), 'private, no-store');
  assert.equal((await f.api('/api/chat/threads', { who: 'guest' })).status, 401);
  assert.equal((await f.api('/api/chat/threads', { who: 'guest', method: 'POST', body: { requestKey: key('guest') } })).status, 401);
  const discovery = await f.rpc('server/discover', undefined, { who: 'guest' });
  assert.deepEqual(discovery.data.result.supportedVersions, ['2026-07-28']);
  const tools = (await f.rpc('tools/list', undefined, { who: 'guest' })).data.result.tools;
  assert.equal(tools.length, 4);
  assert.equal(tools.find(tool => tool.name === 'voxel_reply_to_my_chat').annotations.readOnlyHint, false);
  const orders = toolData(await f.tool('voxel_project_orders', {}, { who: 'guest' })).orders;
  for (const name of ['Business', 'VaultPolicies', 'CentralAIChat', 'TerminalAndLogs', 'AIEnsemble', 'RealtimeVoice']) assert.ok(orders.some(order => order.name === name));
  for (const [name, args] of [['voxel_list_my_chats', {}], ['voxel_read_my_chat', { threadId: 'chat_' + 'a'.repeat(32) }], ['voxel_reply_to_my_chat', { threadId: 'chat_' + 'a'.repeat(32), replyToMessageId: 'msg_unknown', content: 'No access', requestKey: key('guest-reply') }]]) {
    const result = await f.tool(name, args, { who: 'guest' });
    assert.equal(result.data.result.isError, true);
    assert.equal(toolError(result).code, 'AUTH_REQUIRED');
  }
});

test('enforces same-origin browser writes and bounded JSON parsing', async t => {
  const f = fixture(t);
  for (const options of [{ includeOrigin: false }, { headers: { origin: 'https://other.example' } }, { headers: { 'sec-fetch-site': 'cross-site' } }]) {
    assert.equal((await f.api('/api/chat/threads', { method: 'POST', body: { requestKey: key('csrf') }, ...options })).status, 403);
  }
  assert.equal((await f.api('/api/chat/threads', { method: 'POST', raw: '{}', headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await f.api('/api/chat/threads', { method: 'POST', raw: '{', headers: { 'content-type': 'application/json' } })).status, 400);
  assert.equal((await f.api('/api/chat/threads', { method: 'POST', raw: 'x'.repeat(32001), headers: { 'content-type': 'application/json' } })).status, 413);
  assert.equal((await f.rpc('tools/list', undefined, { headers: { origin: 'https://other.example' } })).status, 403);
  assert.equal((await f.rpc('tools/list', undefined, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal((await f.rpc('tools/list', undefined, { httpMethod: 'GET' })).status, 405);
  assert.equal((await f.rpc('tools/list', undefined, { raw: 'x'.repeat(65537) })).data.error.code, -32700);
  assert.equal((await f.rpc('missing-method')).data.error.code, -32601);
});

test('validates thread selections and creates/replays one stable conversation per request', async t => {
  const f = fixture(t);
  const input = { title: 'Business discussion', orderId: '15', requestKey: key('stable') };
  const first = await f.api('/api/chat/threads', { method: 'POST', body: input });
  assert.equal(first.status, 201);
  const repeated = await f.api('/api/chat/threads', { method: 'POST', body: input });
  assert.equal(repeated.data.replayed, true);
  assert.equal(repeated.data.thread.id, first.data.thread.id);
  assert.equal((await f.api('/api/chat/threads')).data.threads.length, 1);
  assert.equal((await f.api('/api/chat/threads', { method: 'POST', body: { ...input, title: 'Changed title' } })).status, 409);
  assert.equal((await f.api('/api/chat/threads', { method: 'POST', body: { requestKey: 'short' } })).status, 400);
  const unknown = await f.api('/api/chat/threads', { method: 'POST', body: { requestKey: key('unknown'), orderId: '99' } });
  assert.equal(unknown.data.error.code, 'UNKNOWN_ORDER');
  assert.equal((await f.api('/api/chat/threads', { method: 'POST', body: { requestKey: key('title'), title: 'x'.repeat(121) } })).status, 400);
  const duplicates = await Promise.all(Array.from({ length: 4 }, () => f.api('/api/chat/threads', { method: 'POST', body: { requestKey: 'test-concurrent-create-0001', orderId: '16' } })));
  assert.ok(duplicates.every(result => result.status === 201));
  assert.equal(new Set(duplicates.map(result => result.data.thread.id)).size, 1);
});

test('isolates list/read/write/delete and rejects forged MCP ownership arguments', async t => {
  const f = fixture(t);
  const aliceThread = await f.create({ title: 'Alice private', orderId: '15' });
  await f.message(aliceThread, 'Only Alice should read this.');
  const alice = await f.context('alice');
  assert.equal((await f.api('/api/chat/threads', { who: 'bob' })).data.threads.length, 0);
  for (const who of ['bob', 'owner']) {
    assert.equal((await f.api(`/api/chat/threads/${aliceThread.id}`, { who })).status, 404);
    assert.equal((await f.api(`/api/chat/threads/${aliceThread.id}/messages`, { who, method: 'POST', body: { content: 'Cross-user write', requestKey: key('cross'), ownerId: alice.user.id } })).status, 404);
    assert.equal((await f.api(`/api/chat/threads/${aliceThread.id}`, { who, method: 'DELETE' })).status, 404);
    const read = await f.tool('voxel_read_my_chat', { threadId: aliceThread.id }, { who });
    assert.equal(toolError(read).code, 'CHAT_NOT_FOUND');
  }
  assert.equal((await f.tool('voxel_read_my_chat', { threadId: aliceThread.id, ownerId: alice.user.id }, { who: 'bob' })).data.error.code, -32602);
  assert.equal((await f.tool('voxel_list_my_chats', { ownerId: alice.user.id }, { who: 'bob' })).data.error.code, -32602);
  const forged = await f.api('/api/chat/threads', { who: 'bob', method: 'POST', body: { title: 'Bob own', ownerId: alice.user.id, requestKey: key('forged-owner') } });
  assert.equal(forged.status, 201);
  assert.equal((await f.api(`/api/chat/threads/${forged.data.thread.id}`)).status, 404, 'JSON ownerId cannot move ownership to another account.');
  assert.equal(toolData(await f.tool('voxel_read_my_chat', { threadId: aliceThread.id })).messages[0].content, 'Only Alice should read this.');
});

test('saves without a provider honestly and replays messages without adding fabricated replies', async t => {
  const f = fixture(t);
  const thread = await f.create({ orderId: '15' });
  const requestKey = key('saved');
  const first = await f.message(thread, 'Build Business.assets first.', 'alice', requestKey);
  assert.equal(first.status, 201);
  assert.equal(first.data.userMessage.status, 'awaiting_ai');
  assert.equal(first.data.assistantMessage, null);
  assert.equal(first.data.ai.configured, false);
  const replay = await f.message(thread, 'Build Business.assets first.', 'alice', requestKey);
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.userMessage.id, first.data.userMessage.id);
  assert.equal((await f.message(thread, 'A different instruction.', 'alice', requestKey)).data.error.code, 'REQUEST_KEY_REUSED');
  assert.equal((await f.message(thread, 'x'.repeat(6001))).status, 400);
  const saved = await f.api(`/api/chat/threads/${thread.id}`);
  assert.equal(saved.data.messages.length, 1);
  assert.equal(saved.data.messages[0].role, 'user');
  assert.equal(saved.headers.get('cache-control'), 'private, no-store');
  assert.ok(JSON.parse(saved.data.projectContext).selectedOrder.id === '15');
});

test('ChatGPT replies require a fresh user message, are idempotent, and stay private', async t => {
  const f = fixture(t);
  const thread = await f.create();
  const sent = await f.message(thread, 'Explain the current order list.');
  const input = { threadId: thread.id, replyToMessageId: sent.data.userMessage.id, content: 'Here is your project outline.', requestKey: key('bridge') };
  const denied = await f.tool('voxel_reply_to_my_chat', input, { who: 'bob' });
  assert.equal(toolError(denied).code, 'CHAT_NOT_FOUND');
  const first = await f.tool('voxel_reply_to_my_chat', input);
  assert.equal(first.data.result.isError, false);
  assert.equal(toolData(first).message.source, 'chatgpt');
  assert.equal(toolData(first).message.role, 'assistant');
  const repeated = await f.tool('voxel_reply_to_my_chat', input);
  assert.equal(toolData(repeated).replayed, true);
  assert.equal(toolData(repeated).message.id, toolData(first).message.id);
  assert.equal(toolError(await f.tool('voxel_reply_to_my_chat', { ...input, content: 'Changed reply.' })).code, 'REQUEST_KEY_REUSED');
  assert.equal(toolError(await f.tool('voxel_reply_to_my_chat', { ...input, requestKey: key('already-replied') })).code, 'CONVERSATION_CHANGED');
  const second = await f.message(thread, 'Follow-up instruction.');
  assert.equal(toolError(await f.tool('voxel_reply_to_my_chat', { ...input, requestKey: key('stale') })).code, 'CONVERSATION_CHANGED');
  const current = await f.tool('voxel_reply_to_my_chat', { ...input, replyToMessageId: second.data.userMessage.id, requestKey: key('current') });
  assert.equal(current.data.result.isError, false);
  const saved = await f.api(`/api/chat/threads/${thread.id}`);
  assert.equal(saved.data.messages.length, 4);
  assert.ok(saved.data.messages.every(message => message.status === 'completed'));
});

test('deletion removes records and prevents both API and MCP access afterwards', async t => {
  const f = fixture(t);
  const thread = await f.create();
  await f.message(thread, 'This conversation will be deleted.');
  assert.equal((await f.api(`/api/chat/threads/${thread.id}`, { method: 'DELETE', includeOrigin: false })).status, 403);
  assert.deepEqual((await f.api(`/api/chat/threads/${thread.id}`, { method: 'DELETE' })).data, { deleted: true });
  assert.equal((await f.api(`/api/chat/threads/${thread.id}`)).status, 404);
  assert.equal(toolError(await f.tool('voxel_read_my_chat', { threadId: thread.id })).code, 'CHAT_NOT_FOUND');
  assert.equal((await f.message(thread)).status, 404);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM platform_chat_messages WHERE thread_id=?').get(thread.id).n, 0);
  assert.equal((await f.api('/api/chat/threads')).data.threads.length, 0);
});

test('injected provider replies are stored once and repeat submission never calls it again', async t => {
  const f = fixture(t);
  const thread = await f.create({ orderId: '15' });
  const ctx = await f.context('alice', { OPENAI_API_KEY: 'sk-test-placeholder-not-a-real-key' });
  const input = { content: 'What is Business?', requestKey: key('ai') };
  let calls = 0, reference;
  const fakeProvider = async args => { calls++; reference = args; return { content: 'Business is planned work.', model: 'gpt-6-luna' }; };
  const first = await sendChatMessage(ctx, thread.id, input, fakeProvider);
  assert.equal(first.userMessage.status, 'completed');
  assert.equal(first.assistantMessage.source, 'openai');
  assert.equal(first.assistantMessage.content, 'Business is planned work.');
  assert.equal(reference.messages.at(-1).content, input.content);
  assert.equal(JSON.parse(reference.projectContext).selectedOrder.id, '15');
  const repeated = await sendChatMessage(ctx, thread.id, input, fakeProvider);
  assert.equal(repeated.replayed, true);
  assert.equal(repeated.assistantMessage.id, first.assistantMessage.id);
  assert.equal(calls, 1);
  await rejectsCode(sendChatMessage(ctx, thread.id, { ...input, content: 'Changed prompt' }, fakeProvider), 'REQUEST_KEY_REUSED');
  assert.equal(calls, 1);
  const read = await readChat(ctx, thread.id);
  assert.equal(read.messages.length, 2);
  assert.ok(!JSON.stringify(read).includes(ctx.env.OPENAI_API_KEY));
});

test('a pending provider holds the conversation lock against new messages, bridge replies, and deletion', async t => {
  const f = fixture(t);
  const thread = await f.create();
  const ctx = await f.context('alice', { OPENAI_API_KEY: 'sk-test-placeholder-not-a-real-key' });
  let release, entered;
  const providerEntered = new Promise(resolve => { entered = resolve; });
  const providerResult = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const input = { content: 'Wait for this reply.', requestKey: key('pending') };
  const pending = sendChatMessage(ctx, thread.id, input, async () => { calls++; entered(); return providerResult; });
  await providerEntered;
  const read = await readChat(ctx, thread.id);
  assert.equal(read.messages[0].status, 'processing');
  const replay = await sendChatMessage(ctx, thread.id, input, async () => { throw new Error('Should not run'); });
  assert.equal(replay.replayed, true);
  assert.equal(replay.assistantMessage, null);
  await rejectsCode(sendChatMessage(ctx, thread.id, { content: 'Concurrent new message', requestKey: key('concurrent') }, async () => { throw new Error('Should not run'); }), 'CHAT_BUSY');
  await rejectsCode(replyFromChatGPT(ctx, { threadId: thread.id, replyToMessageId: read.messages[0].id, content: 'Concurrent bridge reply', requestKey: key('bridge-busy') }), 'CHAT_BUSY');
  assert.equal((await f.api(`/api/chat/threads/${thread.id}`, { method: 'DELETE' })).data.error.code, 'CHAT_BUSY');
  release({ content: 'Reply is complete.', model: 'gpt-6-luna' });
  await pending;
  assert.equal(calls, 1);
  assert.equal(f.db.prepare('SELECT active_request,active_until FROM platform_chat_threads WHERE id=?').get(thread.id).active_request, null);
  assert.equal((await readChat(ctx, thread.id)).messages.length, 2);
});

test('provider failure leaves an honest saved message, releases its lock, and permits a ChatGPT reply', async t => {
  const f = fixture(t);
  const thread = await f.create();
  const ctx = await f.context('alice', { OPENAI_API_KEY: 'sk-test-placeholder-not-a-real-key' });
  const failed = await sendChatMessage(ctx, thread.id, { content: 'Try an AI answer.', requestKey: key('failure') }, async () => { throw new Error('Never expose private diagnostics.'); });
  assert.equal(failed.userMessage.status, 'failed');
  assert.equal(failed.assistantMessage, null);
  assert.equal(failed.errorCode, 'AI_UNAVAILABLE');
  assert.ok(!JSON.stringify(failed).includes('private diagnostics'));
  const reply = await replyFromChatGPT(ctx, { threadId: thread.id, replyToMessageId: failed.userMessage.id, content: 'I can reply through the connection.', requestKey: key('bridge-recovery') });
  assert.equal(reply.message.source, 'chatgpt');
  assert.equal((await readChat(ctx, thread.id)).messages[0].status, 'completed');
});

test('AI member and site budgets stop provider execution and release acquired locks', async t => {
  const f = fixture(t);
  const thread = await f.create();
  const ctx = await f.context('alice', { OPENAI_API_KEY: 'sk-test-placeholder-not-a-real-key' });
  let calls = 0;
  const provider = async () => { calls++; return { content: 'A bounded reply.', model: 'gpt-6-luna' }; };
  for (let i = 0; i < 10; i++) await sendChatMessage(ctx, thread.id, { content: `Question ${i}`, requestKey: key('budget') }, provider);
  await rejectsCode(sendChatMessage(ctx, thread.id, { content: 'Question over the limit', requestKey: key('over-budget') }, provider), 'CHAT_RATE_LIMITED');
  assert.equal(calls, 10);
  assert.equal(f.db.prepare('SELECT active_request FROM platform_chat_threads WHERE id=?').get(thread.id).active_request, null);
  const bobThread = await f.create({ who: 'bob' });
  const bob = await f.context('bob', { OPENAI_API_KEY: 'sk-test-placeholder-not-a-real-key' });
  f.db.prepare('UPDATE platform_rate_limits SET count=100,expires_at=? WHERE key=?').run(Date.now() + 86400000, 'chat:ai-site');
  await rejectsCode(sendChatMessage(bob, bobThread.id, { content: 'Site budget reached', requestKey: key('site-budget') }, provider), 'CHAT_RATE_LIMITED');
  assert.equal(calls, 10);
  assert.equal((await readChat(bob, bobThread.id)).messages.length, 0);
});

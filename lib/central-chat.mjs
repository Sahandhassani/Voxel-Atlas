import catalog from '../public/orders-catalog.json' with { type: 'json' };
import { chatProviderConfig, generateChatReply } from './chat-provider.mjs';

export class ChatError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ChatError(status, code, message); };
const now = () => Date.now();
const uid = prefix => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
const statement = (env, sql, args = []) => env.DB.prepare(sql).bind(...args);
const first = (env, sql, args = []) => statement(env, sql, args).first();
const run = (env, sql, args = []) => statement(env, sql, args).run();
const rows = async (env, sql, args = []) => (await statement(env, sql, args).all()).results || [];
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
const MAX_THREADS = 30, MAX_MESSAGES = 100, MESSAGE_CHARS = 6000;

export function requireChatAccount(ctx) {
  if (ctx.user?.kind !== 'account') fail(401, 'AUTH_REQUIRED', 'Sign in with ChatGPT to save and open your private conversations.');
}
function field(value, name, max, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, 'INVALID_INPUT', `${name} must contain between 1 and ${max} characters.`);
  return value.trim();
}
function requestKey(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(value)) fail(400, 'INVALID_REQUEST_KEY', 'Use a unique request key of 16 to 100 letters, numbers, underscores, or hyphens.');
  return value;
}
function orderId(value) {
  if (!value) return null;
  if (typeof value !== 'string' || !catalog.orders.some(order => order.id === value)) fail(400, 'UNKNOWN_ORDER', 'Choose an order from the project list.');
  return value;
}
async function body(request) {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) fail(415, 'JSON_REQUIRED', 'Send a JSON request body.');
  const max = 32000;
  if (Number(request.headers.get('content-length') || 0) > max) fail(413, 'BODY_TOO_LARGE', 'The message is too large.');
  if (!request.body) fail(400, 'INVALID_JSON', 'A JSON request body is required.');
  const reader = request.body.getReader(), chunks = []; let size = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); fail(413, 'BODY_TOO_LARGE', 'The message is too large.'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const data = JSON.parse(new TextDecoder().decode(bytes)); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
  catch { fail(400, 'INVALID_JSON', 'The JSON request could not be read.'); }
}
async function limit(env, scope, max, seconds) {
  const at = now(), until = at + seconds * 1000;
  const result = await first(env, 'INSERT INTO platform_rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count,expires_at', ['chat:' + scope, until, at, at, until]);
  if (result.count > max) fail(429, 'CHAT_RATE_LIMITED', 'The conversation limit has been reached. Please try again later.');
}
function serialThread(t) { return { id: t.id, title: t.title, orderId: t.order_id, createdAt: new Date(t.created_at).toISOString(), updatedAt: new Date(t.updated_at).toISOString() }; }
function serialMessage(m) { return { id: m.id, role: m.role, content: m.content, source: m.source, status: m.status, replyToId: m.reply_to_id, model: m.model, createdAt: new Date(m.created_at).toISOString() }; }
export function projectOrders() { return catalog; }
export function projectContext(selectedId) {
  const summaries = catalog.orders.map(o => ({ id: o.id, name: o.name, status: o.status, summary: o.summary }));
  const selected = catalog.orders.find(o => o.id === selectedId);
  return JSON.stringify({ project: 'Voxel Atlas', orders: summaries, selectedOrder: selected || null, boundaries: ['The MRI synthesis workflows are precomputed demonstrations, not trained model inference.', 'Demo credits have no monetary value and do not pay AI service costs.', 'An AI reply does not change code, deploy a website, purchase assets, authorize documents, or connect Spotify.', 'The business inventory, regulations, certifications, government access, and MATLAB are planned work unless the catalog explicitly says otherwise.'] });
}
async function threadFor(ctx, id) {
  requireChatAccount(ctx);
  if (typeof id !== 'string' || !/^chat_[a-f0-9]{32}$/.test(id)) fail(404, 'CHAT_NOT_FOUND', 'Conversation not found.');
  const thread = await first(ctx.env, 'SELECT * FROM platform_chat_threads WHERE id=? AND owner_id=?', [id, ctx.user.id]);
  if (!thread) fail(404, 'CHAT_NOT_FOUND', 'Conversation not found.');
  return thread;
}
export async function listChats(ctx) {
  requireChatAccount(ctx);
  return { threads: (await rows(ctx.env, 'SELECT * FROM platform_chat_threads WHERE owner_id=? ORDER BY updated_at DESC LIMIT 30', [ctx.user.id])).map(serialThread), private: true };
}
export async function readChat(ctx, id) {
  const thread = await threadFor(ctx, id);
  const messages = await rows(ctx.env, 'SELECT * FROM platform_chat_messages WHERE thread_id=? AND owner_id=? ORDER BY created_at,rowid LIMIT 100', [id, ctx.user.id]);
  return { thread: serialThread(thread), messages: messages.map(serialMessage), private: true, projectContext: projectContext(thread.order_id) };
}
async function createChat(ctx, input) {
  requireChatAccount(ctx);
  const key = requestKey(input.requestKey), selected = orderId(input.orderId), title = field(input.title, 'Title', 120, true) || (selected ? catalog.orders.find(o => o.id === selected).name + ' discussion' : 'Project conversation');
  const prior = await first(ctx.env, 'SELECT * FROM platform_chat_threads WHERE owner_id=? AND request_key=?', [ctx.user.id, key]);
  if (prior) { if (prior.title !== title || prior.order_id !== selected) fail(409, 'REQUEST_KEY_REUSED', 'This request key belongs to a different conversation.'); return { thread: serialThread(prior), replayed: true }; }
  await limit(ctx.env, 'new:' + ctx.user.id, 20, 3600);
  const id = uid('chat'), at = now();
  await run(ctx.env, 'INSERT OR IGNORE INTO platform_chat_threads (id,owner_id,title,order_id,request_key,active_request,active_until,created_at,updated_at) SELECT ?,?,?,?,?,NULL,0,?,? WHERE (SELECT COUNT(*) FROM platform_chat_threads WHERE owner_id=?)<?', [id, ctx.user.id, title, selected, key, at, at, ctx.user.id, MAX_THREADS]);
  const created = await first(ctx.env, 'SELECT * FROM platform_chat_threads WHERE owner_id=? AND request_key=?', [ctx.user.id, key]);
  if (!created) fail(409, 'CHAT_LIMIT', 'You can save 30 conversations. Delete an older conversation before starting another.');
  if (created.title !== title || created.order_id !== selected) fail(409, 'REQUEST_KEY_REUSED', 'This request key belongs to a different conversation.');
  return { thread: serialThread(created) };
}
async function acquire(ctx, id, lock) {
  const at = now();
  const result = await run(ctx.env, 'UPDATE platform_chat_threads SET active_request=?,active_until=? WHERE id=? AND owner_id=? AND active_until<=?', [lock, at + 90000, id, ctx.user.id, at]);
  if (!result.meta?.changes) fail(409, 'CHAT_BUSY', 'A reply is already being processed. Refresh this conversation in a moment.');
}
const release = (ctx, id, lock) => run(ctx.env, 'UPDATE platform_chat_threads SET active_request=NULL,active_until=0 WHERE id=? AND owner_id=? AND active_request=?', [id, ctx.user.id, lock]);
async function replayMessage(ctx, threadId, prior, content) {
  if (prior.role !== 'user' || prior.content !== content) fail(409, 'REQUEST_KEY_REUSED', 'This request key belongs to a different message.');
  const answer = await first(ctx.env, 'SELECT * FROM platform_chat_messages WHERE thread_id=? AND owner_id=? AND reply_to_id=?', [threadId, ctx.user.id, prior.id]);
  return { userMessage: serialMessage(prior), assistantMessage: answer ? serialMessage(answer) : null, ai: chatProviderConfig(ctx.env), replayed: true, notice: answer ? undefined : 'Your message is already saved. Refresh to check for a reply.' };
}
export async function sendChatMessage(ctx, threadId, input, provider = generateChatReply) {
  const thread = await threadFor(ctx, threadId), content = field(input.content, 'Message', MESSAGE_CHARS), key = requestKey(input.requestKey), env = ctx.env;
  const prior = await first(env, 'SELECT * FROM platform_chat_messages WHERE thread_id=? AND owner_id=? AND request_key=?', [threadId, ctx.user.id, key]);
  if (prior) return replayMessage(ctx, threadId, prior, content);
  const id = uid('msg'); await acquire(ctx, threadId, id);
  try {
    const duplicate = await first(env, 'SELECT * FROM platform_chat_messages WHERE thread_id=? AND owner_id=? AND request_key=?', [threadId, ctx.user.id, key]);
    if (duplicate) return replayMessage(ctx, threadId, duplicate, content);
    await limit(env, 'messages:' + ctx.user.id, 100, 86400);
    const ai = chatProviderConfig(env), at = now();
    if (ai.configured) { await limit(env, 'ai-member:' + ctx.user.id, 10, 86400); await limit(env, 'ai-site', 100, 86400); }
    await run(env, 'INSERT INTO platform_chat_messages (id,thread_id,owner_id,role,content,source,status,request_key,reply_to_id,model,created_at) SELECT ?,?,?,\'user\',?,\'member\',?,?,NULL,NULL,? WHERE (SELECT COUNT(*) FROM platform_chat_messages WHERE thread_id=?)<?', [id, threadId, ctx.user.id, content, ai.configured ? 'processing' : 'awaiting_ai', key, at, threadId, MAX_MESSAGES - 1]);
    let saved = await first(env, 'SELECT * FROM platform_chat_messages WHERE id=? AND owner_id=?', [id, ctx.user.id]);
    if (!saved) fail(409, 'MESSAGE_LIMIT', 'This conversation is full. Start a new one to continue.');
    await run(env, 'UPDATE platform_chat_threads SET updated_at=? WHERE id=? AND owner_id=?', [at, threadId, ctx.user.id]);
    if (!ai.configured) return { userMessage: serialMessage(saved), assistantMessage: null, ai, notice: 'Message saved privately. Automatic AI replies need the owner to connect an AI service. You can ask the Voxel Atlas connection in ChatGPT to read and reply to this conversation.' };
    let reply;
    try {
      const history = (await rows(env, 'SELECT role,content FROM platform_chat_messages WHERE thread_id=? AND owner_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20', [threadId, ctx.user.id])).reverse();
      reply = await provider({ env, messages: history, projectContext: projectContext(thread.order_id) });
    } catch (error) {
      await run(env, 'UPDATE platform_chat_messages SET status=\'failed\' WHERE id=? AND owner_id=?', [id, ctx.user.id]);
      saved.status = 'failed';
      return { userMessage: serialMessage(saved), assistantMessage: null, ai, notice: 'Your message was saved, but the AI service did not finish a reply. You can continue through the Voxel Atlas connection in ChatGPT or send a new message later.', errorCode: typeof error?.code === 'string' ? error.code : 'AI_UNAVAILABLE' };
    }
    const responseId = uid('msg'), completedAt = Math.max(now(), at + 1);
    await env.DB.batch([
      statement(env, 'INSERT INTO platform_chat_messages (id,thread_id,owner_id,role,content,source,status,request_key,reply_to_id,model,created_at) VALUES (?,?,?,\'assistant\',?,\'openai\',\'completed\',?,?,?,?)', [responseId, threadId, ctx.user.id, reply.content, 'reply_' + id, id, reply.model, completedAt]),
      statement(env, 'UPDATE platform_chat_messages SET status=\'completed\' WHERE id=? AND owner_id=?', [id, ctx.user.id]),
      statement(env, 'UPDATE platform_chat_threads SET updated_at=? WHERE id=? AND owner_id=?', [completedAt, threadId, ctx.user.id]),
    ]);
    saved.status = 'completed';
    return { userMessage: serialMessage(saved), assistantMessage: serialMessage(await first(env, 'SELECT * FROM platform_chat_messages WHERE id=?', [responseId])), ai };
  } finally { await release(ctx, threadId, id); }
}
export async function replyFromChatGPT(ctx, input) {
  const thread = await threadFor(ctx, input.threadId), content = field(input.content, 'Reply', 12000), key = requestKey(input.requestKey), target = field(input.replyToMessageId, 'Message ID', 80);
  const old = await first(ctx.env, 'SELECT * FROM platform_chat_messages WHERE thread_id=? AND owner_id=? AND request_key=?', [thread.id, ctx.user.id, key]);
  if (old) { if (old.source !== 'chatgpt' || old.content !== content || old.reply_to_id !== target) fail(409, 'REQUEST_KEY_REUSED', 'This request key belongs to another reply.'); return { message: serialMessage(old), replayed: true, private: true }; }
  const lock = uid('reply'); await acquire(ctx, thread.id, lock);
  try {
    const latest = await first(ctx.env, 'SELECT * FROM platform_chat_messages WHERE thread_id=? AND owner_id=? ORDER BY created_at DESC,rowid DESC LIMIT 1', [thread.id, ctx.user.id]);
    if (!latest || latest.role !== 'user' || latest.id !== target) fail(409, 'CONVERSATION_CHANGED', 'The conversation changed or already has a reply. Read it again before replying.');
    await limit(ctx.env, 'bridge:' + ctx.user.id, 100, 86400);
    const id = uid('msg'), at = Math.max(now(), latest.created_at + 1);
    await ctx.env.DB.batch([
      statement(ctx.env, 'INSERT INTO platform_chat_messages (id,thread_id,owner_id,role,content,source,status,request_key,reply_to_id,model,created_at) VALUES (?,?,?,\'assistant\',?,\'chatgpt\',\'completed\',?,?,NULL,?)', [id, thread.id, ctx.user.id, content, key, target, at]),
      statement(ctx.env, 'UPDATE platform_chat_messages SET status=\'completed\' WHERE id=? AND owner_id=?', [target, ctx.user.id]),
      statement(ctx.env, 'UPDATE platform_chat_threads SET updated_at=? WHERE id=? AND owner_id=?', [at, thread.id, ctx.user.id]),
    ]);
    return { message: serialMessage(await first(ctx.env, 'SELECT * FROM platform_chat_messages WHERE id=?', [id])), private: true };
  } finally { await release(ctx, thread.id, lock); }
}
export async function routeChat(ctx) {
  const path = new URL(ctx.request.url).pathname, method = ctx.request.method;
  if (path === '/api/chat/config' && method === 'GET') return json({ ai: chatProviderConfig(ctx.env), bridge: { available: true }, limits: { messageChars: MESSAGE_CHARS, threads: MAX_THREADS, messagesPerThread: MAX_MESSAGES, aiRepliesPerDay: 10 }, projectContext: 'Project order catalog', private: true });
  requireChatAccount(ctx);
  if (path === '/api/chat/threads' && method === 'GET') return json(await listChats(ctx));
  if (path === '/api/chat/threads' && method === 'POST') return json(await createChat(ctx, await body(ctx.request)), 201);
  const match = path.match(/^\/api\/chat\/threads\/(chat_[a-f0-9]{32})(\/messages)?$/);
  if (match && !match[2] && method === 'GET') return json(await readChat(ctx, match[1]));
  if (match && match[2] && method === 'POST') return json(await sendChatMessage(ctx, match[1], await body(ctx.request)), 201);
  if (match && !match[2] && method === 'DELETE') {
    await threadFor(ctx, match[1]); const lock = uid('delete'); await acquire(ctx, match[1], lock);
    try { await ctx.env.DB.batch([statement(ctx.env, 'DELETE FROM platform_chat_messages WHERE thread_id=? AND owner_id=?', [match[1], ctx.user.id]), statement(ctx.env, 'DELETE FROM platform_chat_threads WHERE id=? AND owner_id=? AND active_request=?', [match[1], ctx.user.id, lock])]); }
    finally { await release(ctx, match[1], lock); }
    return json({ deleted: true });
  }
  fail(404, 'NOT_FOUND', 'This conversation route was not found.');
}

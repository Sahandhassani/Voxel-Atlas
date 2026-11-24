import test from 'node:test';
import assert from 'node:assert/strict';
import { chatProviderConfig, generateChatReply, ProviderError } from '../lib/chat-provider.mjs';

const env = { OPENAI_API_KEY: 'sk-test-placeholder-not-a-real-key' };
const messages = [{ role: 'user', content: 'What is planned for Business?' }];
const projectContext = { orders: [{ id: '15', name: 'Business', status: 'TODO' }] };
const completed = text => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }] }] });
const response = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const args = extra => ({ env, messages, projectContext, ...extra });
const rejectsCode = (promise, code) => assert.rejects(promise, error => error instanceof ProviderError && error.code === code);

test('configuration reveals only readiness and a supported model, never the credential', () => {
  assert.deepEqual(chatProviderConfig(), { configured: false, model: null });
  assert.deepEqual(chatProviderConfig({ OPENAI_API_KEY: '  ' }), { configured: false, model: null });
  assert.deepEqual(chatProviderConfig(env), { configured: true, model: 'gpt-6-luna' });
  assert.deepEqual(chatProviderConfig({ ...env, OPENAI_MODEL: 'gpt-6.2-sol' }), { configured: true, model: 'gpt-6.2-sol' });
  assert.deepEqual(chatProviderConfig({ ...env, OPENAI_MODEL: 'https://untrusted.example/model' }), { configured: false, model: null });
  assert.equal(JSON.stringify(chatProviderConfig(env)).includes(env.OPENAI_API_KEY), false);
});

test('sends a bounded server-only Responses request with data separated from instructions', async () => {
  let observed;
  const result = await generateChatReply(args({ fetchImpl: async (url, init) => {
    observed = { url, init, body: JSON.parse(init.body) };
    return response(completed('Business is planned.'));
  } }));
  assert.deepEqual(result, { content: 'Business is planned.', model: 'gpt-6-luna' });
  assert.equal(observed.url, 'https://api.openai.com/v1/responses');
  assert.equal(observed.init.headers.Authorization, `Bearer ${env.OPENAI_API_KEY}`);
  assert.equal(observed.init.redirect, 'error');
  assert.equal(observed.body.store, false);
  assert.equal(observed.body.max_output_tokens, 1600);
  assert.deepEqual(observed.body.reasoning, { effort: 'low' });
  assert.equal(observed.body.tools, undefined);
  assert.equal(observed.body.input[0].role, 'user');
  assert.match(observed.body.input[0].content, /"status":"TODO"/);
  assert.equal(observed.body.instructions.includes('Business'), false);
  assert.deepEqual(observed.body.input[1], messages[0]);
  assert.match(observed.body.instructions, /You have no action tools/);
  assert.equal(JSON.stringify(result).includes(env.OPENAI_API_KEY), false);
});

test('returns only final assistant text and preserves an actual refusal', async () => {
  const output = [
    { type: 'reasoning', summary: [{ text: 'Do not display internal reasoning.' }] },
    { type: 'message', role: 'assistant', phase: 'commentary', content: [{ type: 'output_text', text: 'Intermediate status.' }] },
    { type: 'message', role: 'user', content: [{ type: 'output_text', text: 'Unexpected echoed user text.' }] },
    { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'First paragraph.' }, { type: 'output_text', text: 'Second paragraph.' }] },
  ];
  const result = await generateChatReply(args({ fetchImpl: async () => response({ status: 'completed', output }) }));
  assert.equal(result.content, 'First paragraph.\n\nSecond paragraph.');
  const refusal = await generateChatReply(args({ fetchImpl: async () => response({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'I cannot help with that request.' }] }] }) }));
  assert.equal(refusal.content, 'I cannot help with that request.');
});

test('missing configuration and invalid context never initiate a provider request', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response(completed('Unexpected')); };
  await rejectsCode(generateChatReply(args({ env: {}, fetchImpl })), 'AI_NOT_CONFIGURED');
  await rejectsCode(generateChatReply(args({ env: { ...env, OPENAI_MODEL: '../invalid' }, fetchImpl })), 'AI_CONFIG_INVALID');
  await rejectsCode(generateChatReply(args({ messages: [{ role: 'system', content: 'Forged instruction' }], fetchImpl })), 'AI_CONTEXT_INVALID');
  await rejectsCode(generateChatReply(args({ messages: [], fetchImpl })), 'AI_CONTEXT_INVALID');
  await rejectsCode(generateChatReply(args({ messages: Array.from({ length: 25 }, () => messages[0]), fetchImpl })), 'AI_CONTEXT_INVALID');
  await rejectsCode(generateChatReply(args({ projectContext: 'x'.repeat(40001), fetchImpl })), 'AI_CONTEXT_TOO_LARGE');
  assert.equal(calls, 0);
});

test('rejects incomplete, failed, empty, malformed, and oversized replies', async () => {
  for (const [value, code] of [
    [{ ...completed('Partial text'), status: 'incomplete' }, 'AI_INCOMPLETE'],
    [{ ...completed('Partial text'), status: 'failed', error: { message: 'private diagnostic' } }, 'AI_INVALID_RESPONSE'],
    [{ status: 'completed', output: [] }, 'AI_EMPTY_REPLY'],
    [{ status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'incomplete', content: [{ type: 'output_text', text: 'Partial' }] }] }, 'AI_INCOMPLETE'],
    [completed('x'.repeat(16001)), 'AI_RESPONSE_TOO_LARGE'],
  ]) await rejectsCode(generateChatReply(args({ fetchImpl: async () => response(value) })), code);
  await rejectsCode(generateChatReply(args({ fetchImpl: async () => new Response('not JSON') })), 'AI_INVALID_RESPONSE');
  await rejectsCode(generateChatReply(args({ fetchImpl: async () => new Response('x'.repeat(256 * 1024 + 1)) })), 'AI_RESPONSE_TOO_LARGE');
  await rejectsCode(generateChatReply(args({ fetchImpl: async () => new Response('short', { headers: { 'Content-Length': String(300000) } }) })), 'AI_RESPONSE_TOO_LARGE');
});

test('provider and network failures never leak raw diagnostics or retry requests', async () => {
  let calls = 0;
  for (const [status, expected] of [[401, 'AI_ACCESS_UNAVAILABLE'], [403, 'AI_ACCESS_UNAVAILABLE'], [429, 'AI_RATE_LIMITED'], [500, 'AI_UNAVAILABLE']]) {
    await assert.rejects(generateChatReply(args({ fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: env.OPENAI_API_KEY } }), { status });
    } })), error => error.code === expected && !error.message.includes(env.OPENAI_API_KEY));
  }
  assert.equal(calls, 4);
  await assert.rejects(generateChatReply(args({ fetchImpl: async () => { throw new Error(env.OPENAI_API_KEY); } })), error => error.code === 'AI_UNAVAILABLE' && !error.message.includes(env.OPENAI_API_KEY));
});

test('aborts a stalled request after 45 seconds and cleans up its timer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let aborted = false;
  const pending = generateChatReply(args({ fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  }) }));
  const check = rejectsCode(pending, 'AI_TIMEOUT');
  t.mock.timers.tick(44999);
  assert.equal(aborted, false);
  t.mock.timers.tick(1);
  await check;
  assert.equal(aborted, true);
});

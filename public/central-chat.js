/* Central chat: account-private conversations with explicit AI connection state. */
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const icons = {
  chat: svg('<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  book: svg('<path d="M3 4h7a2 2 0 0 1 2 2v15a4 4 0 0 0-4-2H3V4Zm18 0h-7a2 2 0 0 0-2 2v15a4 4 0 0 1 4-2h5V4Z"/>'),
  refresh: svg('<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 6a8 8 0 0 1 13.5 4M4.3 14a8 8 0 0 0 13.5 4"/>'),
  copy: svg('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'),
  download: svg('<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>'),
  lock: svg('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
  close: svg('<path d="m6 6 12 12M6 18 18 6"/>'),
  layers: svg('<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>'),
  spark: svg('<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Z"/>'),
  trash: svg('<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>'),
};
const key = () => crypto.randomUUID();
const AUTH_DRAFT_KEY = 'voxel-atlas:chat-signin-draft:v1';
const AUTH_DRAFT_TTL = 10 * 60 * 1000;
const stamp = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
async function fallbackApi(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined });
  let result;
  try { result = await response.json(); } catch { throw new Error('The server returned an unexpected response. Please try again.'); }
  if (!response.ok) {
    const error = new Error(result.error?.message || 'The request could not be completed.');
    error.status = response.status;
    error.code = result.error?.code;
    throw error;
  }
  return result;
}

export async function renderCentralChat(main, context = {}) {
  const api = context.api || fallbackApi;
  const query = new URLSearchParams(location.search);
  const initialOrder = /^\d{2}$/.test(query.get('order') || '') ? query.get('order') : '';
  const initialThread = /^[a-zA-Z0-9_-]{1,100}$/.test(query.get('thread') || '') ? query.get('thread') : '';
  const state = {
    session: context.session || null, config: null, configError: false, catalog: [], catalogError: false,
    threads: [], thread: null, messages: [], orderId: initialOrder, loading: true, sending: false,
    loadError: '', notice: '', deleting: false, confirmDelete: false, createKey: key(), pendingSend: null, returnThreadId: initialThread,
  };
  const $ = selector => main.querySelector(selector);
  const account = () => state.session?.user?.kind === 'account';
  const notify = (message, error = false) => {
    if (context.toast) context.toast(message, error);
    const region = $('#cc-announcement');
    if (region) region.textContent = message;
  };
  const configured = () => state.config?.ai?.configured === true;
  const chosenOrder = () => state.catalog.find(order => order.id === (state.thread?.orderId || state.orderId));
  const signInPath = () => {
    const params = new URLSearchParams();
    const threadId = state.thread?.id || state.returnThreadId;
    if (threadId) params.set('thread', threadId); else if (state.orderId) params.set('order', state.orderId);
    return `/signin-with-chatgpt?return_to=${encodeURIComponent(`/chat${params.size ? `?${params}` : ''}`)}`;
  };
  main.classList.add('cc-main');
  document.title = 'Central chat · Voxel Atlas';
  main.innerHTML = `<section class="cc-page" aria-labelledby="cc-title">
    <header class="cc-page-heading">
      <div><p class="cc-eyebrow">YOUR IDEAS, CONNECTED</p><h1 id="cc-title">Central chat<span class="cc-title-period">.</span></h1><p class="cc-heading-copy">One place to discuss your research, your business, and what to build next.</p></div>
      <a class="vx-button vx-secondary" href="/orders">${icons.layers}Project orders</a>
    </header>
    <div class="cc-layout">
      <aside class="cc-sidebar" aria-label="Saved conversations">
        <div class="cc-sidebar-heading"><h2>Your conversations</h2><span class="cc-count" id="cc-thread-count">0</span></div>
        <button class="vx-button cc-new" id="cc-new" type="button">${icons.plus}New conversation</button>
        <div class="cc-thread-list" id="cc-thread-list"><p class="cc-muted">Opening your workspace…</p></div>
        <div class="cc-context-summary">${icons.book}<div><strong>Project context included</strong><p>Your named orders help keep the conversation specific.</p><a href="/orders">Browse the order list</a></div></div>
        <div class="cc-private-note">${icons.lock}<span>Your saved chats belong to your account.</span></div>
      </aside>
      <section class="cc-conversation" aria-label="Conversation">
        <header class="cc-conversation-heading">
          <div class="cc-conversation-label"><span class="cc-assistant-mark">${icons.spark}</span><div><h2 id="cc-conversation-title">A new conversation</h2><p id="cc-connection-status">Checking the AI connection…</p></div></div>
          <div class="cc-tools"><button type="button" class="cc-icon-button" id="cc-refresh" aria-label="Refresh conversation" title="Refresh conversation">${icons.refresh}</button><button type="button" class="cc-icon-button" id="cc-export" aria-label="Download conversation" title="Download conversation" disabled>${icons.download}</button><button type="button" class="cc-icon-button" id="cc-delete" aria-label="Delete conversation" title="Delete conversation" disabled>${icons.trash}</button></div>
        </header>
        <div class="cc-delete-confirm" id="cc-delete-confirm" hidden><p>Delete this conversation and its saved messages?</p><div><button type="button" class="vx-button vx-danger" id="cc-delete-confirm-button">Delete conversation</button><button type="button" class="vx-button vx-secondary" id="cc-delete-cancel">Keep it</button></div></div>
        <div class="cc-error" id="cc-error" role="alert" hidden></div>
        <div class="cc-message-scroll" id="cc-message-scroll"><div class="cc-messages" id="cc-messages" role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions"></div></div>
        <div class="cc-bridge" id="cc-bridge" hidden><div>${icons.chat}<p id="cc-bridge-copy"></p></div><button type="button" class="cc-text-button" id="cc-copy-instruction">${icons.copy}Copy ChatGPT instruction</button></div>
        <div class="cc-manual-copy" id="cc-manual-copy" hidden><label for="cc-manual-text">Copy this instruction into ChatGPT</label><textarea id="cc-manual-text" readonly rows="4"></textarea><button type="button" class="cc-text-button" id="cc-close-copy">Close</button></div>
        <form class="cc-composer" id="cc-composer">
          <div class="cc-composer-top"><label for="cc-order">Discuss an order</label><select id="cc-order" aria-describedby="cc-order-note"><option value="">Whole project</option></select><a href="/orders" class="cc-context-link">View context</a></div>
          <p id="cc-order-note" class="cc-order-note">Choose a topic, or bring your own idea.</p>
          <label class="cc-sr-only" for="cc-input">Your message</label>
          <textarea id="cc-input" rows="3" maxlength="6000" placeholder="What would you like to work on?" aria-describedby="cc-compose-help"></textarea>
          <div class="cc-composer-bottom"><span id="cc-compose-help">Enter to send · Shift + Enter for a new line</span><span class="cc-char-count" id="cc-char-count">0 / 6,000</span><button type="submit" class="vx-button cc-send" id="cc-send">Send message</button><a id="cc-signin" class="vx-button cc-signin" href="/signin-with-chatgpt?return_to=%2Fchat" target="_top" hidden>Sign in to chat</a></div>
        </form>
        <p class="cc-bottom-note" id="cc-bottom-note">AI can help discuss and draft. Changes to the website still need to be implemented.</p>
      </section>
    </div>
    <div id="cc-announcement" class="cc-sr-only" role="status" aria-live="polite"></div>
  </section>`;
  // Keep handoff details with the conversation so they cannot push the composer
  // out of the bounded desktop workspace, including when manual copy is open.
  $('#cc-message-scroll').append($('#cc-bridge'), $('#cc-manual-copy'));
  const input = $('#cc-input');
  input.value = (query.get('prompt') || '').slice(0, 6000);
  try {
    const stored = sessionStorage.getItem(AUTH_DRAFT_KEY);
    if (stored) {
      const age = Date.now() - JSON.parse(stored).createdAt;
      if (!Number.isFinite(age) || age < 0 || age > AUTH_DRAFT_TTL) sessionStorage.removeItem(AUTH_DRAFT_KEY);
    }
  } catch { try { sessionStorage.removeItem(AUTH_DRAFT_KEY); } catch {} }
  // Prefilled prompts are drafts, never automatic submissions.
  if (query.has('prompt')) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete('prompt');
    history.replaceState(history.state, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  }

  // Only an explicit sign-in click stores this one draft, briefly, in this tab.
  // It is consumed once after authentication; conversation history stays on the server.
  function rememberSignInDraft(event) {
    if (account() || !main.contains(input)) return;
    event.currentTarget.href = signInPath();
    try {
      sessionStorage.setItem(AUTH_DRAFT_KEY, JSON.stringify({ createdAt: Date.now(), content: input.value.slice(0, 6000), orderId: state.orderId || '', threadId: state.thread?.id || state.returnThreadId || '' }));
    } catch { /* Sign-in still works when session storage is unavailable. */ }
  }
  function consumeSignInDraft() {
    if (!account()) return null;
    try {
      const stored = sessionStorage.getItem(AUTH_DRAFT_KEY);
      if (!stored) return null;
      sessionStorage.removeItem(AUTH_DRAFT_KEY);
      const draft = JSON.parse(stored);
      const age = Date.now() - draft.createdAt;
      if (!Number.isFinite(age) || age < 0 || age > AUTH_DRAFT_TTL || typeof draft.content !== 'string' || draft.content.length > 6000) return null;
      if (typeof draft.orderId !== 'string' || !/^(?:\d{2})?$/.test(draft.orderId) || typeof draft.threadId !== 'string' || !/^[a-zA-Z0-9_-]{0,100}$/.test(draft.threadId)) return null;
      if ((initialThread && initialThread !== draft.threadId) || (initialOrder && initialOrder !== draft.orderId) || input.value) return null;
      return draft;
    } catch { return null; }
  }

  function updateUrl() {
    const url = new URL(location.href);
    url.searchParams.delete('prompt');
    if (state.thread) { url.searchParams.set('thread', state.thread.id); url.searchParams.delete('order'); }
    else { url.searchParams.delete('thread'); state.orderId ? url.searchParams.set('order', state.orderId) : url.searchParams.delete('order'); }
    history.replaceState(history.state, '', url.pathname + url.search);
  }
  function paintStatus() {
    const status = $('#cc-connection-status');
    status.className = configured() ? 'cc-status cc-status-ready' : 'cc-status';
    status.textContent = state.configError ? 'Connection status unavailable' : state.loading && !state.config ? 'Checking the AI connection…' : configured() ? `AI connected${state.config.ai.model ? ` · ${state.config.ai.model}` : ''}` : 'AI setup needed · ChatGPT handoff available';
    $('#cc-conversation-title').textContent = state.thread?.title || 'A new conversation';
    $('#cc-thread-count').textContent = String(state.threads.length);
    $('#cc-new').disabled = state.sending || state.loading || state.deleting;
    $('#cc-refresh').disabled = state.sending || state.loading || state.deleting;
    $('#cc-refresh').classList.toggle('cc-refreshing', state.loading);
    $('#cc-export').disabled = !state.thread || !state.messages.length || state.sending;
    $('#cc-delete').disabled = !state.thread || state.sending || state.deleting;
    $('#cc-delete-confirm').hidden = !state.confirmDelete;
    $('#cc-delete-confirm-button').disabled = state.deleting;
    $('#cc-delete-confirm-button').textContent = state.deleting ? 'Deleting…' : 'Delete conversation';
    $('#cc-order').disabled = !!state.thread || state.sending || state.loading || state.deleting;
    input.disabled = state.sending || state.loading || state.deleting;
    $('#cc-send').hidden = !account();
    $('#cc-signin').hidden = account();
    $('#cc-signin').href = signInPath();
    $('#cc-send').disabled = !input.value.trim() || state.sending || state.loading || state.deleting;
    $('#cc-send').textContent = state.sending ? (configured() ? 'Waiting for AI…' : 'Saving message…') : configured() ? 'Send message' : 'Save message';
    $('#cc-composer').setAttribute('aria-busy', String(state.sending));
    $('#cc-char-count').textContent = `${input.value.length.toLocaleString()} / ${Number(input.maxLength).toLocaleString()}`;
    const order = chosenOrder();
    $('#cc-order-note').textContent = state.thread ? `${order ? `${order.id} · ${order.name}` : 'Whole project'} context. Start a new conversation to change this topic.` : state.catalogError ? 'The order list could not load. You can still discuss the whole project.' : order ? order.summary : 'Choose a topic, or bring your own idea.';
    $('#cc-error').hidden = !state.loadError;
    $('#cc-error').textContent = state.loadError;
    $('#cc-bottom-note').textContent = configured() ? 'AI can help discuss and draft. Changes to the website still need to be implemented.' : 'Automatic AI replies will be available after the site owner connects the AI service.';
    const hasPending = state.messages.length && state.messages[state.messages.length - 1]?.role === 'user';
    $('#cc-bridge').hidden = !state.thread || !state.messages.length;
    $('#cc-bridge-copy').textContent = !configured() && hasPending ? 'Your message is saved privately. In ChatGPT, ask the Voxel Atlas connection to read and reply to this conversation. Then refresh here.' : 'Continue with ChatGPT using the Voxel Atlas connection. Copy this conversation’s instruction, then refresh here to see a saved reply.';
    $('#cc-copy-instruction').disabled = state.sending;
  }
  function paintThreads() {
    const list = $('#cc-thread-list');
    if (!account()) { list.innerHTML = `<div class="cc-history-empty">${icons.chat}<p>A space for your next idea.</p><span>Sign in to keep your conversations across devices.</span></div>`; return; }
    if (state.loading && !state.threads.length) { list.innerHTML = '<p class="cc-muted">Loading your conversations…</p>'; return; }
    if (!state.threads.length) { list.innerHTML = '<div class="cc-history-empty"><p>Your story starts here.</p><span>Send a message to create your first conversation.</span></div>'; return; }
    list.innerHTML = state.threads.map(thread => `<button type="button" class="cc-thread ${state.thread?.id === thread.id ? 'is-current' : ''}" data-thread="${esc(thread.id)}" ${state.thread?.id === thread.id ? 'aria-current="true"' : ''} ${state.sending || state.loading || state.deleting ? 'disabled' : ''}><span class="cc-thread-icon">${icons.chat}</span><span><strong>${esc(thread.title || 'Untitled conversation')}</strong><small>${thread.orderId ? `Order ${esc(thread.orderId)} · ` : ''}${esc(stamp(thread.updatedAt))}</small></span></button>`).join('');
  }
  function welcome() {
    const specific = chosenOrder();
    return `<div class="cc-welcome"><div class="cc-welcome-symbol" aria-hidden="true"><span></span>${icons.spark}<span></span></div><p class="cc-welcome-eyebrow">VOXEL ATLAS · CENTRAL CHAT</p><h2>${specific ? `Let’s talk about ${esc(specific.title || specific.name)}.` : 'What shall we build next?'}</h2><p class="cc-welcome-description">${specific ? esc(specific.summary) : 'Ask a question, shape a new idea, or work through a project order. Start with a name like Business, FederatedLab, or MATLAB.'}</p><div class="cc-prompt-grid"><button type="button" data-prompt="Help me plan Business.assets: cars, houses, yachts, and precious metals. What information do we need first?" data-order="15"><span>${icons.layers}Business</span><strong>Plan my visual inventory</strong></button><button type="button" data-prompt="Explain what the FederatedLab currently does and help me choose the next step for a dataset workflow." data-order="06"><span>${icons.book}Research</span><strong>Explore the federated lab</strong></button><button type="button" data-prompt="Help me outline VaultPolicies, public documentation, and the planned government-only documents area. Identify the details still needed." data-order="10"><span>${icons.lock}Policy & documentation</span><strong>Organize the policy work</strong></button><button type="button" data-prompt="Review the project order list. Explain what works now, what is planned, and which order we could work on next." data-order=""><span>${icons.chat}Project orders</span><strong>Find a useful next step</strong></button></div>${!account() ? `<p class="cc-welcome-signin">${icons.lock}Sign in to save messages and keep your conversations private.</p>` : !configured() && !state.loading ? '<p class="cc-welcome-signin">You can save a conversation now and continue it through the Voxel Atlas connection in ChatGPT.</p>' : ''}</div>`;
  }
  function paintMessages(scroll = false) {
    const messages = $('#cc-messages');
    if (!state.messages.length) messages.innerHTML = welcome();
    else messages.innerHTML = state.messages.map((message, index) => {
      const assistant = message.role === 'assistant';
      const who = assistant ? (message.source === 'chatgpt' ? 'ChatGPT' : 'Voxel AI') : 'You';
      const waiting = !assistant && index === state.messages.length - 1 && message.status === 'awaiting_ai';
      return `<article class="cc-message ${assistant ? 'cc-message-assistant' : 'cc-message-user'}"><div class="cc-message-avatar" aria-hidden="true">${assistant ? icons.spark : 'Y'}</div><div class="cc-message-body"><div class="cc-message-meta"><strong>${who}</strong><time datetime="${esc(message.createdAt)}">${esc(stamp(message.createdAt))}</time>${waiting ? '<span class="cc-message-state">Saved · awaiting reply</span>' : ''}${message.status === 'failed' && index === state.messages.length - 1 ? '<span class="cc-message-state">Saved · AI response failed</span>' : ''}</div><p class="cc-message-copy">${esc(message.content)}</p></div></article>`;
    }).join('');
    if (state.sending) messages.insertAdjacentHTML('beforeend', `<div class="cc-working" role="status"><span class="cc-working-spinner"></span>${configured() ? 'Waiting for the AI response…' : 'Saving your message…'}</div>`);
    if (state.notice) messages.insertAdjacentHTML('beforeend', `<p class="cc-message-notice" role="status">${esc(state.notice)}</p>`);
    if (scroll) { const scroller = $('#cc-message-scroll'); requestAnimationFrame(() => { scroller.scrollTop = scroller.scrollHeight; }); }
  }
  function paintOptions() {
    const select = $('#cc-order');
    select.innerHTML = '<option value="">Whole project</option>' + state.catalog.map(order => `<option value="${esc(order.id)}">${esc(order.id)} · ${esc(order.name)}</option>`).join('');
    if (state.catalog.length && state.orderId && !state.catalog.some(order => order.id === state.orderId)) state.orderId = '';
    select.value = state.thread?.orderId || state.orderId || '';
  }
  function paint(scroll = false) { paintOptions(); paintStatus(); paintThreads(); paintMessages(scroll); }
  function upsertThread(thread) {
    if (!thread?.id) return;
    state.threads = [thread, ...state.threads.filter(item => item.id !== thread.id)].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  async function loadThread(id, { preserveDraft = false } = {}) {
    if (state.sending || state.loading || state.deleting) return;
    state.loading = true; state.loadError = ''; state.notice = ''; state.confirmDelete = false; paintStatus(); paintThreads();
    try {
      const result = await api(`/api/chat/threads/${encodeURIComponent(id)}`);
      state.thread = result.thread; state.messages = result.messages || []; state.orderId = result.thread.orderId || '';
      state.pendingSend = null; if (!preserveDraft) input.value = ''; upsertThread(result.thread); updateUrl();
    } catch (error) { state.loadError = error.message; }
    finally { state.loading = false; paint(true); }
  }
  function newConversation() {
    if (state.sending || state.loading || state.deleting) return;
    state.thread = null; state.messages = []; state.loadError = ''; state.notice = ''; state.confirmDelete = false;
    state.createKey = key(); state.pendingSend = null; state.returnThreadId = ''; input.value = ''; $('#cc-manual-copy').hidden = true;
    updateUrl(); paint(); input.focus();
  }
  async function refresh() {
    if (state.sending || state.deleting || state.loading) return;
    state.loading = true; state.loadError = ''; paintStatus(); paintThreads();
    try {
      state.config = await api('/api/chat/config'); state.configError = false;
      if (account()) {
        const result = await api('/api/chat/threads'); state.threads = result.threads || [];
        if (state.thread) { const current = await api(`/api/chat/threads/${encodeURIComponent(state.thread.id)}`); state.thread = current.thread; state.messages = current.messages || []; }
      }
      state.notice = ''; notify('Conversation refreshed.');
    } catch (error) { state.loadError = error.message; }
    finally { state.loading = false; paint(true); }
  }
  async function sendMessage(event) {
    event.preventDefault();
    const content = input.value.trim();
    if (!account() || !content || state.sending || state.loading || state.deleting) return;
    if (content.length > input.maxLength) { state.loadError = `Keep your message within ${input.maxLength.toLocaleString()} characters.`; paintStatus(); return; }
    state.sending = true; state.loadError = ''; state.notice = ''; state.confirmDelete = false; paint(true);
    try {
      if (!state.thread) {
        const created = await api('/api/chat/threads', { method: 'POST', body: { title: content.slice(0, 80), orderId: state.orderId || null, requestKey: state.createKey } });
        state.thread = created.thread; upsertThread(created.thread); updateUrl();
      }
      if (!state.pendingSend || state.pendingSend.content !== content || state.pendingSend.threadId !== state.thread.id) state.pendingSend = { content, threadId: state.thread.id, requestKey: key() };
      const result = await api(`/api/chat/threads/${encodeURIComponent(state.thread.id)}/messages`, { method: 'POST', body: { content, requestKey: state.pendingSend.requestKey } });
      for (const message of [result.userMessage, result.assistantMessage].filter(Boolean)) {
        const existing = state.messages.findIndex(item => item.id === message.id);
        if (existing >= 0) state.messages[existing] = message; else state.messages.push(message);
      }
      if (result.ai) state.config = { ...state.config, ai: { ...state.config?.ai, ...result.ai } };
      state.notice = result.notice || (!result.assistantMessage ? 'Message saved. Continue this conversation with the Voxel Atlas connection in ChatGPT.' : '');
      state.thread.updatedAt = result.assistantMessage?.createdAt || result.userMessage?.createdAt || state.thread.updatedAt;
      upsertThread(state.thread); state.pendingSend = null; input.value = '';
      notify(result.assistantMessage ? 'AI reply received.' : 'Your message is saved privately.');
    } catch (error) { state.loadError = error.message; notify(error.message, true); }
    finally { state.sending = false; paint(true); if (!state.loadError) input.focus(); }
  }
  async function copyInstruction() {
    if (!state.thread) return;
    const order = chosenOrder();
    const instruction = `Use the Voxel Atlas connection to read my private conversation ${state.thread.id}${order ? ` about order ${order.id}, ${order.name}` : ''}. Review its saved messages and the project orders. Reply to the latest unanswered user message and save your response in that same Voxel Atlas conversation. Do not claim the website has been changed unless a change was actually implemented.`;
    try { await navigator.clipboard.writeText(instruction); notify('ChatGPT instruction copied. Paste it into your ChatGPT conversation.'); }
    catch { $('#cc-manual-copy').hidden = false; $('#cc-manual-text').value = instruction; $('#cc-manual-text').focus(); $('#cc-manual-text').select(); notify('Select and copy the instruction shown above the message box.'); }
  }
  function exportConversation() {
    if (!state.thread) return;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), thread: state.thread, messages: state.messages }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `voxel-chat-${state.thread.id}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Conversation downloaded.');
  }
  async function deleteConversation() {
    if (!state.thread || state.sending || state.deleting) return;
    state.deleting = true; state.loadError = ''; paintStatus(); paintThreads();
    try {
      const id = state.thread.id;
      await api(`/api/chat/threads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      state.threads = state.threads.filter(thread => thread.id !== id); state.deleting = false; newConversation(); notify('Conversation deleted.');
    } catch (error) { state.loadError = error.message; }
    finally { state.deleting = false; paintStatus(); paintThreads(); }
  }

  $('#cc-composer').addEventListener('submit', sendMessage);
  input.addEventListener('input', paintStatus);
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && account()) { event.preventDefault(); $('#cc-composer').requestSubmit(); } });
  $('#cc-order').addEventListener('change', event => { state.orderId = event.target.value; state.returnThreadId = ''; updateUrl(); paintStatus(); if (!state.messages.length) paintMessages(); });
  $('#cc-signin').addEventListener('click', rememberSignInDraft);
  const accountLink = document.querySelector('#vx-account');
  if (accountLink) accountLink.addEventListener('click', event => {
    if (accountLink.getAttribute('href')?.startsWith('/signin-with-chatgpt')) rememberSignInDraft(event);
  });
  $('#cc-new').addEventListener('click', newConversation);
  $('#cc-refresh').addEventListener('click', refresh);
  $('#cc-copy-instruction').addEventListener('click', copyInstruction);
  $('#cc-export').addEventListener('click', exportConversation);
  $('#cc-delete').addEventListener('click', () => { state.confirmDelete = true; paintStatus(); $('#cc-delete-cancel').focus(); });
  $('#cc-delete-cancel').addEventListener('click', () => { state.confirmDelete = false; paintStatus(); $('#cc-delete').focus(); });
  $('#cc-delete-confirm-button').addEventListener('click', deleteConversation);
  $('#cc-close-copy').addEventListener('click', () => { $('#cc-manual-copy').hidden = true; $('#cc-copy-instruction').focus(); });
  $('#cc-thread-list').addEventListener('click', event => { const target = event.target.closest('[data-thread]'); if (target) loadThread(target.dataset.thread); });
  $('#cc-messages').addEventListener('click', event => {
    const target = event.target.closest('[data-prompt]'); if (!target || state.sending || state.loading || state.deleting) return;
    if (!state.thread) { state.orderId = target.dataset.order || ''; state.returnThreadId = ''; updateUrl(); paintOptions(); }
    input.value = target.dataset.prompt; paintStatus(); input.focus(); input.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  });
  paint();

  const initialRequests = [api('/api/chat/config'), fetch('/orders-catalog.json', { credentials: 'same-origin' }).then(async response => { if (!response.ok) throw new Error('The project order catalog could not be loaded.'); return response.json(); })];
  if (!state.session) initialRequests.push(api('/api/session'));
  const results = await Promise.allSettled(initialRequests);
  if (results[0].status === 'fulfilled') { state.config = results[0].value; input.maxLength = Math.min(6000, Math.max(1, Number(state.config.limits?.messageChars) || 6000)); input.value = input.value.slice(0, input.maxLength); }
  else state.configError = true;
  if (results[1].status === 'fulfilled') state.catalog = Array.isArray(results[1].value.orders) ? results[1].value.orders : [];
  else state.catalogError = true;
  if (results[2]?.status === 'fulfilled') state.session = results[2].value;
  const restoredDraft = consumeSignInDraft();
  if (restoredDraft) { input.value = restoredDraft.content.slice(0, input.maxLength); state.orderId = restoredDraft.orderId; state.returnThreadId = restoredDraft.threadId; }
  if (account()) {
    try { const result = await api('/api/chat/threads'); state.threads = result.threads || []; }
    catch (error) { state.loadError = error.message; }
  }
  state.loading = false;
  const returnThreadId = initialThread || state.returnThreadId;
  if (returnThreadId && account()) await loadThread(returnThreadId, { preserveDraft: true });
  else paint();
  if (restoredDraft) notify('Your draft is restored. Review it, then send when you are ready.');
}

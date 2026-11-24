const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const statusLabels = {
  LIVE_DEMO: 'Live demo',
  PRIVATE_FUTURE_WORK: 'Private future work',
  PRIVATE_DEMO: 'Private demo',
  WEB_APP_AVAILABLE: 'Web app available',
  TODO: 'Planned',
  SCOPE_TO_DEFINE: 'Scope to define',
  IN_PROGRESS: 'In progress',
  AI_SETUP_REQUIRED: 'AI setup required',
  LIVE: 'Available'
};
const liveRoutes = new Set(['/', '/linkers', '/games', '/synthesis', '/federated', '/viewer.html', '/admin', '/vault', '/red-room', '/research', '/download', '/chat']);
const liveStatuses = new Set(['LIVE_DEMO', 'WEB_APP_AVAILABLE', 'LIVE']);
const privateStatuses = new Set(['PRIVATE_DEMO', 'PRIVATE_FUTURE_WORK']);
const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const chatIcon = svg('<path d="M20 11.5a8 8 0 0 1-8 8H4l-1 1v-9a8.5 8.5 0 0 1 17 0Z"/><path d="M7 10h9M7 14h6"/>');
const searchIcon = svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>');
const exportIcon = svg('<path d="M14 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>');

function chatLink(order) {
  const prompt = `Let's work on ${order.name} (order ${order.id}). Review its current status and requirements, then help me choose the next concrete step.`;
  return `/chat?order=${encodeURIComponent(order.id)}&prompt=${encodeURIComponent(prompt)}`;
}

function statusClass(status) {
  if (liveStatuses.has(status)) return 'live';
  if (privateStatuses.has(status)) return 'private';
  if (status === 'IN_PROGRESS' || status === 'AI_SETUP_REQUIRED') return 'progress';
  return 'planned';
}

function requirementHTML(text) {
  const separator = text.indexOf(' — ');
  if (separator < 0) return escapeHTML(text);
  return `<code>${escapeHTML(text.slice(0, separator))}</code><span>${escapeHTML(text.slice(separator + 3))}</span>`;
}

function cardHTML(order) {
  const linked = order.route && liveRoutes.has(order.route);
  return `<article class="vo-card" id="order-${escapeHTML(order.id)}" data-order-id="${escapeHTML(order.id)}">
    <header class="vo-card-header"><code class="vo-order-id">${escapeHTML(order.id)}</code><span class="vo-status vo-status-${statusClass(order.status)}">${escapeHTML(statusLabels[order.status] || order.status)}</span></header>
    <code class="vo-order-name">${escapeHTML(order.name)}</code>
    <h2>${escapeHTML(order.title)}</h2><p class="vo-summary">${escapeHTML(order.summary)}</p>
    <details class="vo-details"><summary>Requirements & next steps<span aria-hidden="true">+</span></summary>
      <div class="vo-detail-content"><h3>Requested scope</h3><ul class="vo-requirements">${order.requirements.map(requirement => `<li>${requirementHTML(requirement)}</li>`).join('')}</ul>
      <h3>Next steps</h3><ul class="vo-next-steps">${order.nextSteps.map(step => `<li>${escapeHTML(step)}</li>`).join('')}</ul>
      ${order.route ? `<div class="vo-route"><span>${linked ? 'Workspace path' : 'Planned path'}</span><code>${escapeHTML(order.route)}</code></div>` : ''}</div>
    </details>
    <footer class="vo-card-actions"><a class="vo-discuss" href="${escapeHTML(chatLink(order))}">${chatIcon}<span>Discuss in central chat</span></a>${linked ? `<a class="vo-open" href="${escapeHTML(order.route)}">Open page</a>` : ''}</footer>
  </article>`;
}

export async function renderOrders(main, context = {}) {
  main.classList.add('vo-main');
  main.innerHTML = '<div class="vx-loading"><div class="vx-spinner"></div><p>Opening the project orders…</p></div>';
  const response = await fetch('/orders-catalog.json', {cache:'no-cache'});
  if (!response.ok) throw new Error('The order list could not be loaded. Please try again.');
  const catalog = await response.json();
  if (!Array.isArray(catalog.orders)) throw new Error('The order list is temporarily unavailable.');
  const orders = catalog.orders;
  const available = orders.filter(order => liveStatuses.has(order.status)).length;
  const planned = orders.filter(order => ['TODO','SCOPE_TO_DEFINE'].includes(order.status)).length;
  main.innerHTML = `<div class="vo-page">
    <header class="vo-heading"><div><div class="vx-kicker">THE PROJECT, IN ONE PLACE</div><h1>Your orders.</h1><p>A shared vocabulary for everything we’re building.<br class="vo-desktop-break"> Open a requirement, then bring it into the central chat.</p></div><a class="vx-button" href="/chat">${chatIcon}Central chat</a></header>
    <section class="vo-overview" aria-label="Project overview"><div class="vo-overview-copy"><span class="vo-overview-label">SPEAK THE SAME LANGUAGE</span><p>“Build <code>Business.assets</code> first.”<br>“Update <code>VaultPolicies.documents</code>.”</p><span>Stable names keep each request attached to the right part of the app.</span></div><div class="vo-counts"><div><strong>${orders.length}</strong><span>project orders</span></div><div><strong>${available}</strong><span>available demos & tools</span></div><div><strong>${planned}</strong><span>planned or undefined</span></div></div></section>
    <div class="vo-toolbar"><div class="vo-search"><label class="vo-sr-only" for="vo-search">Search project orders</label>${searchIcon}<input type="search" id="vo-search" placeholder="Search names, pages, or requirements" autocomplete="off" /></div><div class="vo-filter-field"><label class="vo-sr-only" for="vo-filter">Filter project orders</label><select id="vo-filter"><option value="all">All orders</option><option value="available">Available</option><option value="planned">Planned & undefined</option><option value="private">Private spaces</option><option value="progress">In progress</option></select><span aria-hidden="true">⌄</span></div><button class="vo-download" type="button" id="vo-download">${exportIcon}<span>Export JSON</span></button></div>
    <div class="vo-list-caption"><span id="vo-result-count" role="status" aria-live="polite"></span><button type="button" id="vo-expand">Expand requirements</button></div>
    <div class="vo-grid" id="vo-grid"></div>
    <section class="vo-about"><h2>What the statuses mean</h2><p><strong>Live demo</strong> means you can try the current demonstration. <strong>Planned</strong> and <strong>scope to define</strong> are requests still to build. Private areas require their own access. A chat discussion records or explains a request; it does not automatically deploy changes.</p><p>Personal inventories, account balances, private research details, credentials, and government documents are not part of this public order list.</p></section>
  </div>`;
  const search = main.querySelector('#vo-search');
  const filter = main.querySelector('#vo-filter');
  const grid = main.querySelector('#vo-grid');
  const expand = main.querySelector('#vo-expand');
  let expanded = false;
  const render = () => {
    const query = search.value.trim().toLocaleLowerCase();
    const shown = orders.filter(order => {
      const category = filter.value;
      const matchesCategory = category === 'all' || category === 'available' && liveStatuses.has(order.status) || category === 'planned' && ['TODO','SCOPE_TO_DEFINE'].includes(order.status) || category === 'private' && privateStatuses.has(order.status) || category === 'progress' && ['IN_PROGRESS','AI_SETUP_REQUIRED'].includes(order.status);
      const text = [order.id, order.name, order.title, order.summary, ...order.requirements, ...order.nextSteps].join(' ').toLocaleLowerCase();
      return matchesCategory && (!query || text.includes(query));
    });
    main.querySelector('#vo-result-count').textContent = `${shown.length} of ${orders.length} orders`;
    grid.innerHTML = shown.length ? shown.map(cardHTML).join('') : '<div class="vo-empty"><h2>No matching orders</h2><p>Try a broader name, like Business, MRI, or documents.</p><button type="button" class="vx-button vx-secondary" id="vo-clear">Clear filters</button></div>';
    grid.querySelectorAll('details').forEach(details => { details.open = expanded; });
    main.querySelector('#vo-clear')?.addEventListener('click', () => { search.value = ''; filter.value = 'all'; render(); search.focus(); });
    expand.disabled = !shown.length;
  };
  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  expand.addEventListener('click', () => {
    expanded = !expanded;
    grid.querySelectorAll('details').forEach(details => { details.open = expanded; });
    expand.textContent = expanded ? 'Collapse requirements' : 'Expand requirements';
  });
  main.querySelector('#vo-download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(catalog, null, 2) + '\n'], {type:'application/json'}));
    const link = document.createElement('a');
    link.href = url; link.download = 'voxel-atlas-orders.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (context.toast) context.toast('Project order list exported.');
  });
  render();
  const selected = location.hash.match(/^#(?:order-)?(\d{2})$/)?.[1];
  if (selected) {
    const card = main.querySelector(`[data-order-id="${selected}"]`);
    if (card) { card.querySelector('details').open = true; card.scrollIntoView({block:'start'}); }
  }
}

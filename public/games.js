import { RESOURCES, STOPS, STATION_COST, newBoard, canBuild, rollBoard, boardAction,
  newMarket, marketPrice, portfolioValue, marketTrade, advanceMarket } from './game-engine.mjs';

const shapes = {
  timber: '<path d="m12 2-7 9h4l-5 7h7v4h2v-4h7l-5-7h4L12 2Z"/>',
  energy: '<path d="m14 2-9 12h6l-1 8 9-13h-6l1-7Z"/>',
  knowledge: '<path d="M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V4Zm9 3v14"/>',
  lookout: '<path d="M4 19 10 5l4 10 3-6 5 10H4Zm3-7 3 1 2-2M3 3h3M4.5 1.5v3"/>',
  harbor: '<path d="M12 3v14m-5-8h10M4 14c0 10 16 10 16 0M2 16l2-2 2 2m12 0 2-2 2 2"/><circle cx="12" cy="4" r="2"/>',
  rain: '<path d="M6 15h12a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0-1 10Zm1 4-1 3m7-3-1 3m7-3-1 3"/>',
  station: '<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-7h4v7M8 10h.01M16 10h.01"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  flag: '<path d="M5 22V3m0 1c5-5 9 4 14 0v10c-5 4-9-5-14 0"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>',
  chart: '<path d="M3 3v18h18M6 15l5-5 4 3 6-8"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
};
const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.lookout}</svg>`;
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const coordinates = Array.from({ length: 20 }, (_, i) => i < 6 ? [1, i + 1] : i < 11 ? [i - 4, 6] : i < 16 ? [6, 16 - i] : [21 - i, 1]);
const dieDots = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function dice(value) { return `<span class="km-die" aria-label="${value ? 'Die result ' + value : 'Ready to roll'}">${Array.from({length:9},(_,i)=>`<i class="${(dieDots[value || 5]).includes(i+1)?'on':''}"></i>`).join('')}</span>`; }
function coastArt() {
  return `<svg class="km-coast-art" viewBox="0 0 380 230" fill="none" aria-hidden="true">
    <path d="M0 0h380v230H0z" fill="#c2e5e5"/><path d="M0 95c44-19 85 13 116 30 30 16 47-2 78 14 41 21 67-5 101 1 35 7 57 37 85 29v61H0Z" fill="#eee2bf"/>
    <path d="M0 115c44-19 85 13 116 30 30 16 47-2 78 14 41 21 67-5 101 1 35 7 57 37 85 29v41H0Z" fill="#b8cf9a"/>
    <path d="M-8 202c52-35 65 9 108-12s69 17 103 7 70-24 106 11 67-4 85 10" stroke="#e9f1d1" stroke-width="15"/>
    <path d="M-8 202c52-35 65 9 108-12s69 17 103 7 70-24 106 11 85-4 85 10" stroke="#f9f7e6" stroke-width="2" stroke-dasharray="6 8"/>
    <path d="m230 142 7-62h22l7 62z" fill="#fff8e3"/><path d="m233 118 3-14h25l2 14z" fill="#c36150"/><path d="M234 81v-16h28v16z" fill="#284d48"/><path d="m229 65 19-16 19 16z" fill="#c36150"/><path d="M240 69h5v8h-5zm11 0h5v8h-5z" fill="#f9d17e"/><path d="M246 134h8v10h-8z" fill="#284d48"/>
    <path d="m40 152 13-25 14 25z" fill="#547e58"/><path d="m58 158 15-29 16 29z" fill="#426d4d"/><path d="M52 152v8m21-3v9" stroke="#63714b" stroke-width="3"/>
    <path d="M31 61h42m-28 11h46m38-30h45m132 57h41m-23 13h35M167 96h28" stroke="#eef9ef" stroke-width="2" stroke-linecap="round"/>
    <path d="m136 66 7-4 7 4m6-12 7-4 7 4" stroke="#688a81" stroke-width="2"/><circle cx="319" cy="35" r="18" fill="#f6e5ab"/>
  </svg>`;
}

export function renderGames(main) {
  let board = newBoard(), market = newMarket();
  let active = new URLSearchParams(location.search).get('game') === 'market' ? 'market' : 'board';
  let resetArmed = false;
  main.classList.add('km-main');
  function paint() {
    const focusedId = main.contains(document.activeElement) ? document.activeElement.id : '';
    main.innerHTML = `<section class="km-app"><header class="km-header"><div><a class="km-back" href="/linkers">${svg('map')}Back to Linkers</a><div class="km-eyebrow">A LITTLE PLAY. A LITTLE DISCOVERY.</div><h1>${active === 'board' ? 'Kuzey Marmara' : 'Market lab'}</h1><p>${active === 'board' ? 'Build a trail of discovery along the coast.' : 'Try an idea. Watch a fictional market unfold.'}</p></div><div class="km-local">${svg('flag')}PLAY MODE<span>Virtual resources only</span></div></header>
      <nav class="km-tabs" aria-label="Choose a game"><button type="button" id="km-board-tab" data-game="board" aria-current="${active === 'board' ? 'page' : 'false'}">${svg('map')}Coastal expedition</button><button type="button" id="km-market-tab" data-game="market" aria-current="${active === 'market' ? 'page' : 'false'}">${svg('chart')}Market lab</button></nav>
      <div id="km-game">${active === 'board' ? boardHTML() : marketHTML()}</div>
      <footer class="km-footer"><span>Original games from the Voxel Atlas playground.</span><span>Single player · This session only · No cash value</span></footer></section>`;
    main.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => {
      active = button.dataset.game; resetArmed = false;
      history.replaceState(null, '', active === 'market' ? '/games?game=market' : '/games'); paint();
    }));
    active === 'board' ? wireBoard() : wireMarket();
    main.querySelector('#km-reset').addEventListener('click', () => {
      if (!resetArmed && (active === 'board' ? board.turn > 1 || board.phase === 'action' : market.day > 0 || market.trades.length)) {
        resetArmed = true; const button = main.querySelector('#km-reset'); button.textContent = 'Confirm new game'; return;
      }
      if (active === 'board') board = newBoard(); else market = newMarket();
      resetArmed = false; paint();
    });
    if (focusedId) {
      let next = document.getElementById(focusedId);
      if (!next || next.disabled) next = main.querySelector(active === 'board'
        ? '#km-play-again, #km-roll:not(:disabled), #km-build:not(:disabled), [data-gather]:not(:disabled)'
        : '#km-next-day:not(:disabled), #km-reset');
      next?.focus({preventScroll:true});
    }
  }
  function boardHTML() {
    const stop = STOPS[board.position], final = board.phase === 'finished';
    const can = canBuild(board);
    return `<div class="km-board-layout"><div class="km-board-column"><div class="km-score-strip"><span><strong>${board.stations.length}<em>/ 4</em></strong>Research stations</span><span class="km-progress" aria-label="${board.stations.length} of 4 stations">${Array.from({length:4},(_,i)=>`<i class="${i < board.stations.length ? 'complete' : ''}">${svg('station')}</i>`).join('')}</span><span class="km-turn"><strong>${board.turn}<em>/ ${board.maxTurns}</em></strong>Expedition turn</span></div>
      <div class="km-board" aria-label="Coastal board with 20 stops. Current stop: ${stop.name}">
      ${STOPS.map((tile, i) => `<div class="km-tile km-tile-${tile.type}${board.position === i ? ' current' : ''}${board.stations.includes(i) ? ' built' : ''}" style="grid-row:${coordinates[i][0]};grid-column:${coordinates[i][1]}" title="${tile.name}${board.stations.includes(i) ? ' · Station built' : ''}"><span class="km-tile-number">${i + 1}</span>${svg(board.stations.includes(i) ? 'station' : tile.type)}<span class="km-tile-name">${tile.type === 'rain' ? 'Weather' : tile.type === 'lookout' ? 'Supplies' : tile.type === 'harbor' ? 'Start' : tile.type}</span>${board.position === i ? '<span class="km-pawn" aria-label="Your marker"></span>' : ''}</div>`).join('')}
      <div class="km-board-center">${coastArt()}<div class="km-board-caption"><span>RUMELI FENERİ</span><h2>The coastal<br>expedition</h2><p>4 stations. 16 turns.<br>A whole world to connect.</p></div>${final ? `<div class="km-end"><div class="km-end-icon">${svg(board.result === 'won' ? 'flag' : 'lookout')}</div><span class="km-eyebrow">${board.result === 'won' ? 'EXPEDITION COMPLETE' : 'DAYLIGHT FADES'}</span><h2>${board.result === 'won' ? 'You connected the coast.' : 'Every route teaches you.'}</h2><p>${board.result === 'won' ? `Four stations in ${board.turn} turns.` : `${board.stations.length} of four stations built.`}</p><button type="button" class="km-button" id="km-play-again">Play again</button></div>` : ''}</div></div>
      <div class="km-legend"><span><i class="km-legend-dot"></i>Your explorer</span><span>${svg('station')}Your station</span><span>${svg('lookout')}Gain every supply</span></div>
      <details class="km-rules"><summary>How to play</summary><ol><li>Roll once each turn and follow the coastal route. Land on a resource to collect two of it. Lookouts and the harbor give one of each; weather uses one energy.</li><li>After moving, build one station or gather one extra supply. A station costs <strong>2 timber + 2 energy + 1 knowledge</strong>. Each stop can hold one station.</li><li>Connect <strong>four stations within 16 turns</strong>. Completing a full loop gives a supply bonus. Gather what you are missing, then build when the moment is right.</li></ol></details></div>
      <aside class="km-control-column"><section class="km-supplies"><div class="km-section-label">YOUR BACKPACK</div><div class="km-resource-row">${RESOURCES.map(r=>`<div class="km-resource km-resource-${r}">${svg(r)}<strong>${board.supplies[r]}</strong><span>${r}</span></div>`).join('')}</div></section>
      <section class="km-turn-card"><div class="km-section-label">${final ? 'EXPEDITION REPORT' : board.phase === 'roll' ? 'STEP 1 · EXPLORE' : 'STEP 2 · MAKE YOUR MOVE'}</div><div class="km-location"><span class="km-location-icon">${svg(stop.type)}</span><div><small>YOU ARE AT</small><h2>${stop.name}</h2></div></div><p class="km-status" role="status" aria-live="polite">${board.message}</p>
      ${!final ? `<button type="button" class="km-button km-roll" id="km-roll" ${board.phase !== 'roll' ? 'disabled' : ''}>${dice(board.dice)}<span>${board.phase === 'roll' ? 'Roll the dice' : `You rolled ${board.dice}`}<small>${board.phase === 'roll' ? 'Discover your next stop' : 'Now build or gather below'}</small></span></button>
      <div class="km-build-area"><button type="button" class="km-button km-build" id="km-build" ${!can ? 'disabled' : ''}>${svg('station')}Build a research station</button><div class="km-build-cost">${RESOURCES.map(r=>`<span class="${board.supplies[r] < STATION_COST[r] ? 'short' : ''}">${svg(r)}${STATION_COST[r]}</span>`).join('')}<span>${board.stations.includes(board.position) ? 'Station already here' : 'Materials per station'}</span></div></div>
      <div class="km-gather-label">Or gather one extra supply to finish this turn</div><div class="km-gather">${RESOURCES.map(r=>`<button type="button" id="km-gather-${r}" data-gather="${r}" aria-label="Gather one ${r}" ${board.phase !== 'action' ? 'disabled' : ''}>${svg(r)}<span>+1 ${r}</span></button>`).join('')}</div>` : `<div class="km-final-summary"><strong>${board.stations.length}</strong><span>research stations established</span></div>`}</section>
      <button type="button" class="km-reset" id="km-reset">${svg('reset')}New expedition</button>
      ${board.history.length ? `<section class="km-log"><div class="km-section-label">EXPEDITION NOTES</div><ol>${board.history.slice(0,4).map(message=>`<li>${message}</li>`).join('')}</ol></section>` : `<div class="km-tip">${svg('knowledge')}<p>Field tip: save a little energy. Coastal weather can use a supply before you build.</p></div>`}</aside></div>`;
  }
  function wireBoard() {
    main.querySelector('#km-roll')?.addEventListener('click', () => { board = rollBoard(board, Math.floor(Math.random() * 6) + 1); resetArmed = false; paint(); });
    main.querySelector('#km-build')?.addEventListener('click', () => { board = boardAction(board, 'build'); paint(); });
    main.querySelectorAll('[data-gather]').forEach(button => button.addEventListener('click', () => { board = boardAction(board, 'gather', button.dataset.gather); paint(); }));
    main.querySelector('#km-play-again')?.addEventListener('click', () => { board = newBoard(); resetArmed = false; paint(); });
  }
  function marketChart() {
    const visible = market.prices.slice(0, market.day + 1), low = Math.floor((Math.min(...visible) - 8) / 10) * 10,
      high = Math.ceil((Math.max(...visible) + 8) / 10) * 10;
    const x = i => 50 + i * 550 / 23, y = value => 230 - (value - low) * 190 / (high - low);
    const points = visible.map((p,i)=>`${x(i)},${y(p)}`).join(' ');
    const color = marketPrice(market) >= 100 ? '#248067' : '#c5664f';
    return `<svg class="km-chart" viewBox="0 0 630 280" role="img" aria-label="Fictional price chart. Day ${market.day + 1}: ${marketPrice(market).toFixed(2)} virtual coins."><defs><linearGradient id="km-price-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${color}" stop-opacity=".2"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${[0,.5,1].map(f=>`<line x1="50" y1="${40+190*f}" x2="600" y2="${40+190*f}" stroke="#dbe3d9" stroke-dasharray="4 5"/><text x="40" y="${45+190*f}" text-anchor="end">${Math.round(high-(high-low)*f)}</text>`).join('')}<line x1="50" y1="${y(100)}" x2="600" y2="${y(100)}" stroke="#99b3a5" stroke-dasharray="4 5"/><polygon points="50,230 ${points} ${x(market.day)},230" fill="url(#km-price-fill)"/><polyline points="${points}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(market.day)}" cy="${y(marketPrice(market))}" r="5" fill="${color}" stroke="#fff" stroke-width="2"/>${[0,7,15,23].map(i=>`<text x="${x(i)}" y="257" text-anchor="middle">Day ${i+1}</text>`).join('')}</svg>`;
  }
  function marketHTML() {
    const value = portfolioValue(market), change = value - 1000, price = marketPrice(market);
    return `<div class="km-market-stats"><div><span>Portfolio value</span><strong>${number(value)}<small>coins</small></strong><em class="${change < 0 ? 'negative' : ''}">${change >= 0 ? '+' : ''}${(change / 10).toFixed(2)}% this session</em></div><div><span>Available cash</span><strong>${number(market.cash)}</strong><em>Virtual coins</em></div><div><span>Your position</span><strong>${market.shares}<small>shares</small></strong><em>One fictional instrument</em></div><div><span>Market day</span><strong>${market.day + 1}<small>/ 24</small></strong><em>${market.finished ? 'Session complete' : 'Advance at your pace'}</em></div></div>
      <div class="km-market-layout"><section class="km-chart-card"><div class="km-market-title"><div><div class="km-section-label">SYNTHETIC INSTRUMENT</div><h2>Marmara Research Index</h2><p>Invented prices · No real market feed</p></div><span class="km-instrument">MRI</span></div><div class="km-quote">${number(price)}<span>virtual coins / share</span></div>${marketChart()}<p class="km-status km-market-message" role="status" aria-live="polite">${market.message}</p>${market.finished ? `<div class="km-market-result"><h3>${change >= 0 ? 'You finished in the green.' : 'A lesson in changing markets.'}</h3><p>Your portfolio: <strong>${number(value)} coins</strong>. Buying 10 shares on day one and holding would finish at <strong>${number(10 * price)} coins</strong>.</p></div>` : ''}</section>
      <aside class="km-market-actions"><div class="km-section-label">YOUR TRADING DESK</div><label class="km-input-label" for="km-strategy">Experiment mode</label><select id="km-strategy" ${market.finished ? 'disabled' : ''}><option value="manual" ${market.strategy === 'manual' ? 'selected' : ''}>Manual decisions</option><option value="trend" ${market.strategy === 'trend' ? 'selected' : ''}>Trend follower</option></select><p class="km-strategy-note">${market.strategy === 'trend' ? 'Before advancing, the strategy buys one share when price is above its 3-day average, or sells one below it. It trades only with available cash and shares.' : 'Choose when to buy and sell. Then advance one day to see a new synthetic price.'}</p><div class="km-trade-buttons"><button type="button" class="km-button" id="km-buy" ${market.finished || market.cash < price ? 'disabled' : ''}>Buy 1 share</button><button type="button" class="km-button km-button-outline" id="km-sell" ${market.finished || market.shares < 1 ? 'disabled' : ''}>Sell 1 share</button></div><div class="km-afford">You can buy ${Math.floor(market.cash / price)} shares at this price.</div><button type="button" class="km-button km-next-day" id="km-next-day" ${market.finished ? 'disabled' : ''}>${market.day === 23 ? 'Finish session' : 'Advance one day'}</button><button type="button" class="km-reset" id="km-reset">${svg('reset')}New market session</button><details class="km-rules"><summary>How this experiment works</summary><p>You start with 1,000 imaginary coins. Prices are randomly generated for 24 days. Holdings are valued at the current price; no borrowing, short sales, commissions, or real payments are modeled.</p><p>Try manual trading or the simple trend rule, then compare your result with buying and holding. There is no cash prize or promised return.</p></details></aside></div>
      <section class="km-trade-log"><div class="km-section-label">TRADE JOURNAL</div>${market.trades.length ? `<div class="km-table-wrap"><table><thead><tr><th>Day</th><th>Action</th><th>Shares</th><th>Price</th></tr></thead><tbody>${market.trades.map(t=>`<tr><td>${t.day}</td><td><span class="km-trade-badge ${t.side}">${t.side === 'buy' ? 'Bought' : 'Sold'}</span></td><td>${t.amount}</td><td>${number(t.price)} coins</td></tr>`).join('')}</tbody></table></div>` : '<p class="km-no-trades">Your first trade starts the journal. Each action stays in this browser session.</p>'}</section>`;
  }
  function wireMarket() {
    main.querySelector('#km-strategy').addEventListener('change', e => { market.strategy = e.target.value; paint(); });
    main.querySelector('#km-buy').addEventListener('click', () => { market = marketTrade(market, 'buy'); paint(); });
    main.querySelector('#km-sell').addEventListener('click', () => { market = marketTrade(market, 'sell'); paint(); });
    main.querySelector('#km-next-day').addEventListener('click', () => { market = advanceMarket(market); resetArmed = false; paint(); });
  }
  paint();
}

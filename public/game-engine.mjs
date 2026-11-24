// Original, device-local practice games. No real currency, rewards, or data feeds.
export const RESOURCES = ['timber', 'energy', 'knowledge'];
export const STOPS = [
  ['harbor', 'Rumeli harbor'], ['timber', 'Pine grove'], ['knowledge', 'Field notebook'],
  ['energy', 'Solar clearing'], ['timber', 'Forest trail'], ['lookout', 'Black Sea lookout'],
  ['knowledge', 'University outpost'], ['energy', 'Wind garden'], ['timber', 'Cedar bend'],
  ['rain', 'Passing rain'], ['knowledge', 'Research library'], ['energy', 'Sunlit ridge'],
  ['timber', 'Green corridor'], ['lookout', 'Marmara viewpoint'], ['knowledge', 'Signal station'],
  ['energy', 'Coastal turbine'], ['timber', 'Woodland camp'], ['rain', 'Sea breeze'],
  ['knowledge', 'Discovery point'], ['energy', 'Lighthouse'],
].map(([type, name], index) => ({ type, name, index }));
export const STATION_COST = { timber: 2, energy: 2, knowledge: 1 };
export function newBoard() {
  return { turn: 1, maxTurns: 16, position: 0, phase: 'roll', dice: null,
    supplies: { timber: 3, energy: 2, knowledge: 1 }, stations: [],
    message: 'Your expedition begins at Rumeli harbor. Roll to discover your first stop.',
    history: [], result: null };
}
export function canBuild(s) {
  return s.phase === 'action' && !s.stations.includes(s.position) &&
    RESOURCES.every(r => s.supplies[r] >= STATION_COST[r]);
}
export function rollBoard(state, die) {
  if (state.phase !== 'roll' || !Number.isInteger(die) || die < 1 || die > 6) return state;
  const s = structuredClone(state), previous = s.position;
  s.dice = die; s.position = (s.position + die) % STOPS.length; s.phase = 'action';
  const stop = STOPS[s.position]; let message = `${die} steps · ${stop.name}. `;
  if (s.position < previous) {
    RESOURCES.forEach(r => s.supplies[r]++);
    message += 'A completed loop brings one of every supply. ';
  }
  if (RESOURCES.includes(stop.type)) {
    s.supplies[stop.type] += 2;
    message += `Collected 2 ${stop.type}.`;
  } else if (stop.type === 'rain') {
    if (s.supplies.energy > 0) { s.supplies.energy--; message += 'Windy weather used 1 energy.'; }
    else message += 'You sheltered through the weather. No supplies lost.';
  } else {
    RESOURCES.forEach(r => s.supplies[r]++);
    message += 'The lookout team shared one of every supply.';
  }
  s.message = message + ' Build a station or gather one extra supply.';
  s.history.unshift(message); s.history = s.history.slice(0, 8); return s;
}
export function boardAction(state, action, resource) {
  if (state.phase !== 'action') return state;
  if (action === 'build' && !canBuild(state)) return state;
  if (action === 'gather' && !RESOURCES.includes(resource)) return state;
  if (!['build', 'gather'].includes(action)) return state;
  const s = structuredClone(state); let message;
  if (action === 'build') {
    RESOURCES.forEach(r => s.supplies[r] -= STATION_COST[r]);
    s.stations.push(s.position);
    message = `Station ${s.stations.length} opened at ${STOPS[s.position].name}.`;
  } else { s.supplies[resource]++; message = `Packed 1 extra ${resource} for the next leg.`; }
  s.history.unshift(message); s.history = s.history.slice(0, 8);
  if (s.stations.length >= 4) {
    s.phase = 'finished'; s.result = 'won';
    s.message = `Four stations connected in ${s.turn} turns. The coast is ready for discovery.`;
  } else if (s.turn >= s.maxTurns) {
    s.phase = 'finished'; s.result = 'lost';
    s.message = `The expedition is over. You connected ${s.stations.length} of 4 stations. Start a new route to try again.`;
  } else { s.turn++; s.phase = 'roll'; s.message = message + ' Roll when you are ready.'; }
  return s;
}

export function newMarket(random = Math.random) {
  const prices = [100];
  for (let day = 1; day < 24; day++) {
    const change = (random() - .48) * .15 + Math.sin(day * .7) * .018;
    prices.push(Math.max(15, Math.round(prices.at(-1) * (1 + change) * 100) / 100));
  }
  return { day: 0, prices, cash: 1000, shares: 0, trades: [], strategy: 'manual', finished: false,
    message: 'A fictional market, a fresh 1,000-coin portfolio. Buy, sell, or advance the day.' };
}
export const marketPrice = s => s.prices[s.day];
export const portfolioValue = s => Math.round((s.cash + s.shares * marketPrice(s)) * 100) / 100;
export function marketTrade(state, side, amount = 1) {
  if (state.finished || !Number.isInteger(amount) || amount < 1 || !['buy', 'sell'].includes(side)) return state;
  const price = marketPrice(state), cost = Math.round(price * amount * 100) / 100;
  if ((side === 'buy' && state.cash < cost) || (side === 'sell' && state.shares < amount)) return state;
  const s = structuredClone(state);
  s.cash = Math.round((s.cash + (side === 'buy' ? -cost : cost)) * 100) / 100;
  s.shares += side === 'buy' ? amount : -amount;
  s.trades.unshift({ day: s.day + 1, side, amount, price }); s.trades = s.trades.slice(0, 12);
  s.message = `${side === 'buy' ? 'Bought' : 'Sold'} ${amount} ${amount === 1 ? 'share' : 'shares'} at ${price.toFixed(2)} virtual coins.`;
  return s;
}
export function advanceMarket(state) {
  if (state.finished) return state;
  let s = structuredClone(state); let action = 'No strategy trade today.';
  if (s.strategy === 'trend' && s.day >= 2) {
    const average = s.prices.slice(s.day - 2, s.day + 1).reduce((a, b) => a + b, 0) / 3;
    const next = marketTrade(s, marketPrice(s) >= average ? 'buy' : 'sell');
    if (next !== s) { s = next; action = 'Trend follower: ' + s.message; }
  }
  if (s.day === s.prices.length - 1) {
    s.finished = true; s.message = 'Session complete. Compare your final portfolio with buying and holding.';
  } else {
    s.day++; s.message = s.strategy === 'trend' ? action : 'A new day. Review the price and choose your next move.';
  }
  return s;
}

import { tracks, buckets, weeks, taskLabels, uid, makeWeek, makePlayer, fresh, totals, progress, market, marketResult, goodwill, moduleFor, newGroup, newHomeGame, awards, earnedAwards, grantAwards, savingsMilestones, shopItems, shopWallet, buyUpgrade, equipTheme, setShopTarget } from './game.js';

const sitePath = location.pathname.replace(/index\.html$/, '');
const key = 'sam-lucas-workspace-v1:' + sitePath;
const currency = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });
const money = cents => currency.format(cents / 100);
const $ = selector => document.querySelector(selector);
const dialog = $('#dialog');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const marks = ['$', '◎', '◇', '♡'];
const statuses = { todo: 'To do', submitted: 'Awaiting review', revision: 'Revise', approved: 'Approved' };
function readSave(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
let workspace = readSave(key);
if (!workspace || !Array.isArray(workspace.groups)) {
  workspace = { groups: [], sample: null, active: null };
  const previous = readSave('sam-lucas-pilot-v1:' + sitePath);
  if (previous?.version === 1 && Array.isArray(previous.players)) {
    previous.players.forEach(p => grantAwards(p, { checkSavings: true }));
    workspace.active = uid();
    workspace.groups.push({ id: workspace.active, data: previous });
  }
}
function groupState(id) {
  return id === 'test' ? workspace.sample : workspace.groups.find(group => group.id === id)?.data;
}
let state = groupState(workspace.active);
let view = 'home';
let role = null;
const publicRoutes = new Set(['home', 'setup', 'public-help']);
const learnerRoutes = new Set(['week', 'money', 'progress', 'shop', 'learner-help']);
const facilitatorRoutes = new Set(['group', 'detail', 'settings', 'facilitator-help']);
let ledgerWeek;
let detailWeek;
let detailPlayerId;

const player = () => state?.players.find(p => p.id === state.current) ?? state?.players[0];
const activeWeek = p => p.weeks.at(-1);
const isHomeGame = () => state?.kind === 'home';
const facilitatorLabel = () => isHomeGame() ? 'Parent / caregiver view' : 'Facilitator view';
const dashboardLabel = () => isHomeGame() ? 'Parent dashboard' : 'Group dashboard';
const button = (label, action, attrs = '', style = 'secondary') => `<button type="button" class="button ${style}" data-action="${action}" ${attrs}>${label}</button>`;
const playerAttrs = p => `data-player="${esc(p.id)}"`;
const pill = (label, tone = '') => `<span class="pill ${tone}">${label}</span>`;
function announce(message) { $('#live').textContent = message; }
function save(message, unlocked = []) {
  try { localStorage.setItem(key, JSON.stringify(workspace)); }
  catch { message = 'Browser storage is unavailable. Recent changes may be lost on reload.'; }
  render();
  if (message || unlocked.length) {
    const toast = $('#notice');
    toast.textContent = [message, ...unlocked.map(award => 'Badge unlocked: ' + award.title + ' (+' + award.points + ' pts).')].filter(Boolean).join(' ');
    toast.classList.toggle('reward-toast', Boolean(unlocked.length));
    toast.hidden = false;
    toast.focus();
  }
}
function navigate(next) {
  const canOpen = publicRoutes.has(next)
    || (role === 'learner' && player() && learnerRoutes.has(next))
    || (role === 'facilitator' && state && facilitatorRoutes.has(next));
  view = canOpen ? next : 'home';
  if (publicRoutes.has(view)) {
    role = null;
    detailPlayerId = undefined;
    detailWeek = undefined;
    dialog.replaceChildren();
    announce('');
  }
  ledgerWeek = undefined;
  render();
  $('#main').focus();
}
function selectGroup(id) {
  workspace.active = id;
  state = groupState(id);
}
function openRole(nextRole) {
  role = nextRole;
  if (role === 'facilitator') detailWeek = undefined;
  navigate(role === 'facilitator' ? 'group' : player() ? 'week' : 'home');
}
function pageHeader(label, title, description, action = '') {
  return `<div class="page-header"><div><div class="eyebrow">${label}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
function pct(p) { return Math.min(100, Math.floor(progress(p).buckets[1] * 100 / p.target)); }
function taskName(task, p) {
  if (task.title) return task.title;
  if (task.id === 'business') return 'Try it in your business';
  if (task.id === 'reflection' && p.mode === 'manual') return 'Try it beyond your business';
  return taskLabels[task.id];
}
function taskPrompt(task, p, week) {
  if (task.assignedPrompt && ['submitted','approved'].includes(task.status)) return task.assignedPrompt;
  const info = week.module ?? moduleFor(p, week.index);
  if (task.id === 'business') return info.business;
  if (task.id === 'learning') return 'Read the short lesson and answer one question.';
  if (task.id === 'reflection') return info.outside;
  return task.prompt;
}
function goal(p, dark = false) {
  return `<section class="goal ${dark ? 'goal-dark' : 'panel'}"><div class="eyebrow">MY SAVINGS GOAL</div><h2>${esc(p.goal)}</h2>
    <div class="goal-amount"><strong>${money(progress(p).buckets[1])}</strong> <span>of ${money(p.target)}</span></div>
    <progress value="${pct(p)}" max="100" aria-label="Savings goal progress"></progress><div class="goal-bottom"><span>${pct(p)}% of goal</span>${button('Edit goal', 'edit-player', '', 'quiet')}</div></section>`;
}
function bucketCards(amounts) {
  return `<div class="bucket-grid">${buckets.map((name, index) => `<article class="bucket bucket-${index}"><div class="bucket-icon" aria-hidden="true">${marks[index]}</div><div><div class="bucket-label">${name}</div><strong>${money(amounts[index])}</strong></div></article>`).join('')}</div>`;
}
function marketControls(p, week) {
  const spec = market[week.index];
  if (week.closed) return button('See your campaign results', 'view', 'data-view="progress"', 'primary');
  if (p.mode !== 'sim') {
    const t = totals(week);
    return `<div class="real-week"><h2>Your business this week</h2>
      <div class="real-business">${p.offer ? `<p><strong>What you offer</strong> · ${esc(p.offer)}</p>` : ''}${p.customers ? `<p><strong>Who it’s for</strong> · ${esc(p.customers)}</p>` : ''}</div>
      <div class="market-numbers"><div><span>Sales and paid jobs</span><strong>${money(t.sales)}</strong></div><div><span>Business costs</span><strong>${money(t.costs)}</strong></div><div><span>Profit before tax</span><strong>${money(t.profit)}</strong></div></div>
      <p class="detail">Log actual business income and costs. If you had no sales this week, record any costs and explain what happened in your mission.</p>
      <div class="action-row">${button('Record money in or out', 'add-entry', '', 'primary')}${button('Open money log', 'view', 'data-view="money"')}</div></div>`;
  }
  if (week.choice !== null) {
    const { sales, costs, profit } = totals(week);
    const result = week.result;
    const missed = result ? result.demand - result.sold : 0;
    return `<div class="market-result"><div class="section-title"><div><h2>Market results</h2><p>${result ? result.sold + ' sales at ' + money(result.price) + ' each' : 'Your previously recorded market result'}${result?.returning ? ' · ' + result.returning + ' returning' : ''}</p></div>${pill(profit < 0 ? 'Loss this week' : profit === 0 ? 'Broke even' : 'Profit this week', profit < 0 ? 'amber' : 'green')}</div>
      <div class="market-numbers"><div><span>Sales revenue</span><strong>${money(sales)}</strong></div><div><span>Business costs</span><strong>${money(costs)}</strong></div><div><span>Before tax</span><strong>${money(profit)}</strong></div></div>
      ${result ? `<p>${missed > 0 ? missed + (missed === 1 ? ' interested customer' : ' interested customers') + ' missed out because you reached capacity. ' : ''}${result.regularsEarned ? '+' + result.regularsEarned + ' potential regulars for future markets.' : 'No new potential regulars this week.'}</p>` : ''}
      ${profit < 0 ? '<p>Costs were higher than sales. The loss stays on your record, and there’s no profit to split into buckets this week.</p>' : ''}
      ${button('See money and buckets', 'view', 'data-view="money"', 'small')}</div>`;
  }
  if (week.plan === undefined) {
    return `<h2>Choose your plan</h2><div class="market-options">${spec.plans.map((plan,i) => `<button type="button" class="market-option" data-action="plan" data-index="${i}"><strong>${plan.label}</strong><span>${plan.tradeoff}</span><small>${money(plan.price)} per sale · ${money(plan.cost)} upfront · up to ${plan.capacity} sales</small></button>`).join('')}</div>`;
  }
  const plan = spec.plans[week.plan];
  const projection = week.tactic === undefined ? null : marketResult(p, week, week.plan, week.tactic);
  const breakEven = projection ? Math.ceil(projection.costs / plan.price) : 0;
  return `<div class="market-signal"><div class="eyebrow">MARKET NEWS</div><p>${spec.signal}</p></div><h2>How will you respond?</h2><p class="detail">Your plan: ${plan.label.toLowerCase()} · ${button('Change plan', 'clear-plan', '', 'quiet')}</p>
    <div class="market-options tactics">${spec.tactics.map(([label,lift,fee,earned], i) => `<button type="button" class="market-option" aria-pressed="${week.tactic === i}" data-action="tactic" data-index="${i}"><strong>${label}</strong><small>${fee ? money(fee) + ' extra cost' : 'No extra cost'} · ${lift ? '+' + lift + ' expected interest' : 'Same expected interest'}${earned ? ' · chance to build regulars' : ''}</small></button>`).join('')}</div>
    ${projection ? `<p class="market-forecast">You need <strong>${breakEven} sales</strong> to cover costs. Your capacity is ${plan.capacity}.${breakEven > plan.capacity ? ' This plan can’t break even at this capacity.' : ''}</p>${button('Run market day', 'run-market', '', 'primary run-button')}` : ''}`;
}
function weekView(p) {
  const week = activeWeek(p), info = moduleFor(p, week.index), tally = totals(week), path = progress(p);
  const required = week.tasks.filter(task => task.required).length;
  const approved = week.tasks.filter(task => task.required && task.status === 'approved').length;
  const status = task => p.solo && task.status === 'approved' ? 'Complete' : statuses[task.status];
  return `<div class="game-intro"><div><div class="eyebrow">${esc(p.business)} · ${p.solo ? 'Solo practice' : tracks[p.track] + ' · Mentor review'}</div><h1>${week.closed ? 'Campaign complete' : esc(info.title)}</h1><p>${week.closed ? 'Look back on your business decisions and see how far you got towards your goal.' : esc(info.summary)}</p></div>
    ${isHomeGame() ? '' : button('Start your own game', 'add-player', '', 'small')}</div>
  <div class="game-shell"><div class="play-area"><section class="scene" aria-label="Market board">
    <div class="scene-header"><strong>${p.mode === 'sim' ? market[week.index].place : 'My business'}</strong><span>WEEK ${week.index + 1} / 4</span></div>
    ${p.mode === 'sim' ? `<ol class="market-steps" aria-label="Market day stages">${['Choose a plan', 'Respond to news', 'See results'].map((label, i) => {
      const stage = week.choice !== null ? 2 : week.plan !== undefined ? 1 : 0;
      return `<li ${stage === i ? 'aria-current="step"' : ''}><span class="step-number" aria-hidden="true">${i < stage ? '✓' : i+1}</span>${label}</li>`;
    }).join('')}</ol>` : ''}
    <div class="scene-footer"><span>${p.mode === 'sim' ? goodwill(p) + ' potential regulars' : 'Real business'}</span><span>${path.points} points</span></div>
    <div class="market-controls">${marketControls(p, week)}</div></section>
  <section class="quest-log" aria-labelledby="tasks-heading"><div class="section-title"><div><h2 id="tasks-heading">Weekly missions</h2><p>${approved} of ${required} required missions ${p.solo ? 'complete' : 'approved'}</p></div>${pill(week.closed ? 'Week closed' : tally.ready ? (p.solo ? 'Ready to settle' : 'Ready for check-in') : 'In progress', 'green')}</div>
  <div class="tasks">${week.tasks.map((task, index) => `<article class="task"><div class="task-icon task-icon-${index % 3}" aria-hidden="true">${task.status === 'approved' ? '✓' : ['$', '?', '…'][index % 3]}</div><div class="task-copy"><div class="task-type">${taskLabels[task.id] ?? taskLabels.custom} · +${task.points} pts${task.required ? '' : ' · Optional'}</div><h3>${esc(taskName(task, p))}</h3><p>${esc(taskPrompt(task, p, week))}</p>${task.feedback ? `<p class="feedback"><strong>Feedback</strong> · ${esc(task.feedback)}</p>` : ''}</div><div class="task-actions">${pill(status(task), task.status === 'approved' ? 'green' : task.status === 'revision' ? 'amber' : '')}${button(week.closed || ['submitted','approved'].includes(task.status) ? 'View' : 'Open', 'task', `data-id="${esc(task.id)}"`, 'small')}</div></article>`).join('')}</div>
  ${p.solo && tally.ready && !week.closed ? `<div class="settle">${button('Settle the week', 'solo-settle', '', 'primary')}</div>` : ''}
  </section></div><aside class="aside">${goal(p, true)}<section class="panel route"><h2>Season map</h2><ol>${weeks.map((entry, index) => `<li class="${index === week.index ? 'current' : ''}"><span class="route-dot">${p.weeks[index]?.closed ? '✓' : index + 1}</span><span>${esc(moduleFor(p,index).title)}${index > week.index ? '<small>Locked</small>' : ''}</span></li>`).join('')}</ol></section>
  ${week.index > 0 && !week.closed ? `<section class="panel"><h2>${p.solo ? 'Last week’s note' : 'Last check-in'}</h2><p>${esc(p.weeks[week.index - 1].feedback)}</p></section>` : ''}</aside></div>`;
}
const typeNames = { sale: 'Sale', cost: 'Business expense', reward: 'Activity reward' };
function transactionTable(p, week) {
  if (!week.transactions.length) return '<p>No transactions recorded for this week.</p>';
  return `<div class="table-wrap"><table><thead><tr><th scope="col">Description</th><th scope="col">Type</th><th scope="col">Amount</th>${week.closed ? '' : '<th scope="col">Action</th>'}</tr></thead><tbody>${week.transactions.map(entry => {
    const attrs = `${playerAttrs(p)} data-id="${esc(entry.id)}"`;
    return `<tr><td>${esc(entry.label)}</td><td>${typeNames[entry.kind]}</td><td>${money(entry.cents)}</td>${week.closed ? '' : `<td>${entry.sim ? 'Scenario' : button('Edit', 'edit-entry', attrs, 'small') + button('Remove', 'remove-entry', attrs, 'small')}</td>`}</tr>`;
  }).join('')}</tbody></table></div>`;
}
function moneyView(p) {
  const week = p.weeks.find(w => w.index === ledgerWeek) ?? activeWeek(p), t = totals(week);
  return `${pageHeader('MY BUSINESS', 'Money log', 'See what came in, what went out and how profit is split.', week.closed ? '' : button('Add entry', 'add-entry', '', 'primary'))}
  <label class="inline-field">Week <select id="ledger-week">${p.weeks.map(w => `<option value="${w.index}" ${w === week ? 'selected' : ''}>${w.index + 1} · ${esc(moduleFor(p,w.index).title)}</option>`).join('')}</select></label>
  <div class="stats">${[['Sales',t.sales],['Expenses',t.costs],['Profit before tax',t.profit],['Simulated tax (' + week.rules.tax + '%)',t.tax]].map(([label,cents]) => `<article class="panel"><span>${label}</span><strong>${money(cents)}</strong></article>`).join('')}</div>
  <section class="panel ledger"><div class="section-title"><h2>Transactions</h2>${pill(week.closed ? 'Week closed' : 'Open week', 'green')}</div>
  ${transactionTable(p, week)}</section>
  <div class="section-title spaced"><div><h2>${week.closed ? 'Weekly bucket allocation' : 'Bucket preview'}</h2><p>${t.profit < 0 ? 'This week made a loss, so there’s no profit to split.' : money(t.distributable) + ' of business profit after simulated tax.'}</p></div></div>
  ${bucketCards(t.allocations)}
  <p class="detail">Activity rewards recorded separately · ${money(t.rewards)}${t.match ? ' · Simulated savings match ' + money(t.match) : ''}</p>`;
}
function awardShelf(p, result) {
  const earned = earnedAwards(p);
  const skills = awards.filter(award => !award.percent && (!award.practice || p.mode === 'sim'));
  const savings = awards.filter(award => award.percent);
  const saved = result.buckets[1];
  const next = savings.find(award => !earned.includes(award));
  const remaining = next && Math.max(0, Math.ceil(p.target * next.percent / 100) - saved);
  const closed = result.closed === weeks.length;
  const nextTitle = next ? (closed ? 'Season complete' : 'Next savings badge · ' + next.title) : 'Savings badge collection complete';
  let nextNote = 'You’ve earned every savings milestone on this journey.';
  if (next) {
    if (closed) nextNote = 'You saved ' + money(saved) + ' towards your ' + money(p.target) + ' goal this season.';
    else if (remaining) nextNote = 'Add ' + money(remaining) + ' more to Save through closed weeks to unlock it.';
    else nextNote = 'Close a week to claim this milestone.';
  }
  const renderAwards = items => `<ul class="award-grid">${items.map(award => {
    const unlocked = earned.includes(award);
    return `<li class="award-card ${unlocked ? 'unlocked' : ''}">
      <span class="award-mark" aria-hidden="true">${award.icon}</span>
      <div><strong>${award.title}</strong><p>${award.description}</p><small>${unlocked ? 'Earned' : 'To unlock'} · +${award.points} pts</small></div>
    </li>`;
  }).join('')}</ul>`;
  return `<section class="panel award-shelf" aria-labelledby="award-heading">
    <div class="section-title"><div><h2 id="award-heading">Milestone rewards</h2><p>${earned.length} of ${skills.length + savings.length} badges earned</p></div>${pill('+' + result.awardPoints + ' reward points','green')}</div>
    <div class="next-reward"><strong>${nextTitle}</strong><p>${nextNote}</p></div>
    <h3>Savings journey</h3>${renderAwards(savings)}
    <h3>Business and money skills</h3>${renderAwards(skills)}
  </section>`;
}
function progressView(p) {
  const result = progress(p), wallet = shopWallet(p);
  return `${pageHeader('MY BUSINESS', 'My progress', 'See what you saved and what you learnt along the way.')}
  <div class="progress-layout">${goal(p, true)}<div class="stats progress-stats"><article class="panel"><span>Weeks closed</span><strong>${result.closed} / 4</strong></article><article class="panel"><span>Total points</span><strong>${result.points}</strong><p class="detail">${result.points - result.awardPoints} from missions and weeks · ${result.awardPoints} from badges</p></article></div></div>
  <section class="panel shop-callout"><div><h2>Upgrade your virtual shop</h2><p><strong>${wallet.balance} points available</strong> · ${wallet.spent} spent. Your badges stay in your collection.</p></div>${button('Visit my virtual shop', 'view', 'data-view="shop"', 'primary')}</section>
  ${awardShelf(p, result)}
  <div class="section-title spaced"><div><h2>Four buckets</h2><p>Total allocations from closed weeks. Save includes any simulated match.</p></div></div>
  ${bucketCards(result.buckets)}
  <section class="panel ledger spaced"><h2>${p.solo ? 'Business history' : 'Check-in history'}</h2>${p.weeks.some(w => w.closed) ? `<ul class="history">${p.weeks.filter(w => w.closed).map(w => {
    const tally = totals(w);
    return `<li><strong>Week ${w.index + 1} · ${esc(moduleFor(p,w.index).title)}</strong>${w.result ? `<p>${market[w.index].plans[w.choice].label} · ${w.result.tactic} · ${w.result.sold} sold</p>` : ''}<p>${money(tally.profit)} before simulated tax · ${money(tally.allocations[1] + tally.match)} added to Save</p><p>${esc(w.feedback)}</p></li>`;
  }).join('')}</ul>` : '<p>Your weekly notes will appear after you close your first week.</p>'}
  </section>`;
}
function shopPreview(p, wallet) {
  const owns = id => wallet.owned.has(id);
  const theme = p.shop?.theme ?? 'classic';
  const upgrades = shopItems.filter(item => item.kind === 'fixture' && owns(item.id)).map(item => item.name);
  const look = shopItems.find(item => item.id === theme)?.name ?? 'Classic theme';
  return `<figure class="shop-preview" data-theme="${esc(theme)}" aria-labelledby="shop-preview-title">
    <div class="shop-sign"><span id="shop-preview-title">${esc(p.business)}</span></div>
    <div class="shop-awning" aria-hidden="true"></div>
    <div class="shop-interior" aria-hidden="true">
      <div class="shop-window"><span></span></div>
      ${owns('shelves') ? '<div class="scene-shelves"><div><i></i><i></i><i></i></div><div><i></i><i></i></div></div>' : '<div class="shop-board"><span>OPEN</span></div>'}
      <div class="shop-counter ${owns('counter') ? 'oak-counter' : ''}">
        ${owns('register') ? '<div class="shop-register"><span></span></div>' : '<div class="shop-notebook"></div>'}
        <span class="counter-edge"></span><span class="counter-base"></span>
      </div>
      <div class="shop-floor"></div>
    </div>
    <figcaption><strong>${look}</strong><span>${upgrades.length ? upgrades.join(' · ') : 'Folding counter · Paper ledger'}</span></figcaption>
  </figure>`;
}
function shopView(p) {
  const wallet = shopWallet(p);
  const target = shopItems.find(item => item.id === p.shop?.target && !wallet.owned.has(item.id));
  const itemCard = item => {
    const owned = wallet.owned.has(item.id);
    const equipped = item.kind === 'theme' && p.shop?.theme === item.id;
    const pinned = target?.id === item.id;
    const attrs = `data-id="${item.id}"`;
    return `<li class="catalog-item"><div class="catalog-main"><div><h3>${item.name}</h3><p>${item.description}</p></div>
       ${pill(owned ? (equipped ? 'Equipped' : 'Owned') : item.cost + ' pts', owned ? 'green' : '')}</div>
      ${owned ? (item.kind === 'theme' && !equipped ? button('Use theme', 'shop-theme', attrs + ` aria-label="Use ${item.name}"`, 'small') : '') : `<div class="catalog-actions">
        ${wallet.balance >= item.cost ? button('Buy upgrade', 'shop-buy', attrs + ` aria-label="Buy ${item.name}"`, 'primary small') : `<span class="detail">Need ${item.cost - wallet.balance} more pts</span>`}
        ${pinned ? pill('Saving for this', 'green') : button('Save for this', 'shop-target', attrs + ` aria-label="Save for ${item.name}"`, 'small')}
      </div>`}</li>`;
  };
  return `${pageHeader('MY BUSINESS', 'My virtual shop', 'Spend points on your virtual shop or save them for a bigger upgrade.')}
  <div class="shop-layout">
    ${shopPreview(p, wallet)}
    <div class="shop-side">
      <section class="panel points-wallet"><h2>Game points</h2>
        <p class="wallet-balance"><strong>${wallet.balance}</strong> <span>available to spend</span></p>
        <div class="wallet-totals"><span>${wallet.earned} earned</span><span>${wallet.spent} spent</span></div>
        <p>Upgrades change your virtual shop. Purchases use game points only.</p>
        ${button('See how I earn points', 'view', 'data-view="progress"', 'small')}
      </section>
      <section class="panel shop-target"><h2>Upgrade goal</h2>
        ${target ? `<h3>${target.name}</h3><progress max="${target.cost}" value="${Math.min(wallet.balance,target.cost)}" aria-label="Points towards ${target.name}"></progress>
          <p>${wallet.balance >= target.cost ? 'You have enough points for this upgrade.' : (target.cost - wallet.balance) + ' more points to save.'}</p>
          ${button('Clear upgrade goal', 'shop-target', '', 'quiet')}`
        : '<p>Choose Save for this on an upgrade to track how close you are.</p>'}
      </section>
    </div>
  </div>
  <section class="panel shop-catalog" aria-labelledby="catalog-title">
    <h2 id="catalog-title">Shop upgrades</h2>
    <h3 class="catalog-heading">Fixtures</h3><ul class="catalog-grid">${shopItems.filter(item => item.kind === 'fixture').map(itemCard).join('')}</ul>
    <div class="section-title catalog-themes"><h3>Themes</h3>${p.shop?.theme && p.shop.theme !== 'classic' ? button('Use classic theme', 'shop-theme', 'data-id="classic"', 'small') : ''}</div>
    <ul class="catalog-grid">${shopItems.filter(item => item.kind === 'theme').map(itemCard).join('')}</ul>
  </section>`;
}
function shopPurchaseDialog(p, item) {
  const wallet = shopWallet(p);
  if (wallet.owned.has(item.id) || wallet.balance < item.cost) return;
  const balanceAfter = wallet.balance - item.cost;
  const target = shopItems.find(other => other.id === p.shop?.target && other.id !== item.id);
  const beforeGap = target && Math.max(0, target.cost - wallet.balance);
  const afterGap = target && Math.max(0, target.cost - balanceAfter);
  openDialog('Buy ' + item.name + '?', `<p>${item.description} This costs <strong>${item.cost} game points</strong> and leaves you with <strong>${balanceAfter} points</strong>.</p>
    ${target && afterGap > beforeGap ? `<p class="shop-tradeoff">If you buy this now, you’ll need ${afterGap} more points for your ${target.name.toLowerCase()} goal.</p>` : ''}
    ${form('shop-buy', '', 'Spend ' + item.cost + ' points', `${playerAttrs(p)} data-id="${item.id}"`)}`);
}

function groupView() {
  if (isHomeGame()) return learnerDetail(player());
  const pending = state.players.flatMap(p => activeWeek(p).closed ? [] : activeWeek(p).tasks.filter(t => t.status === 'submitted').map(t => ({ p, t })));
  const ready = state.players.filter(p => !p.solo && !activeWeek(p).closed && totals(activeWeek(p)).ready);
  return `${pageHeader('FACILITATOR', esc(state.group), 'Assign activities, review submissions and close out each learner’s week.', button('Add learner', 'add-player', '', 'primary'))}
  ${state.players.length ? '' : `<section class="panel setup-panel"><h2>Add your first learner</h2><p>Give them a business or paid job and a savings goal. You can tailor their first week from their learner record.</p>${button('View setup instructions', 'view', 'data-view="setup"', 'small')}</section>`}
  <div class="stats">${[['Learners',state.players.length],['Awaiting review',pending.length],['Ready for check-in',ready.length],['Finished pilot',state.players.filter(p => activeWeek(p).closed).length]].map(([label,value]) => `<article class="panel"><span>${label}</span><strong>${value}</strong></article>`).join('')}</div>
  <section class="panel ledger"><div class="section-title"><h2>Review queue</h2>${state.players.some(p => !p.solo && !activeWeek(p).closed) ? button('Assign activity', 'assign') : ''}</div>
  ${pending.length ? `<ul class="review-list">${pending.map(({ p, t }) => `<li><div><strong>${esc(p.name)} · ${esc(taskName(t, p))}</strong><p>Week ${activeWeek(p).index + 1} · ${tracks[p.track]}</p></div>${button('Review', 'review', `data-player="${p.id}" data-id="${t.id}"`, 'small')}</li>`).join('')}</ul>` : '<p>New submissions will appear here.</p>'}</section>
  <section class="panel ledger spaced"><h2>Learners</h2><div class="table-wrap"><table><thead><tr><th scope="col">Learner</th><th scope="col">Week</th><th scope="col">Progress</th><th scope="col">Action</th></tr></thead>
  <tbody>${state.players.map(p => {
    const w = activeWeek(p);
    const status = p.solo ? (w.closed ? 'Solo complete' : 'Solo practice') : w.closed ? 'Pilot complete' : totals(w).ready ? 'Ready for check-in' : w.tasks.some(t => t.status === 'submitted') ? 'Awaiting review' : w.tasks.some(t => t.status !== 'todo') || w.transactions.length ? 'In progress' : 'To start';
    return `<tr><td><strong>${esc(p.name)}</strong><div class="detail">${tracks[p.track]}</div></td><td>${w.index + 1} / 4</td><td>${pill(status, status === 'Ready for check-in' || w.closed ? 'green' : '')}</td><td>${button('Open learner', 'learner-detail', `data-player="${p.id}"`, 'small')}${!p.solo && totals(w).ready && !w.closed ? button('Check in', 'close-week', `data-player="${p.id}"`, 'small') : ''}</td></tr>`;
  }).join('')}</tbody></table></div></section>
  <p class="detail">These learner profiles and facilitator controls are shared within this browser.</p>`;
}
function homeView() {
  const p = player();
  const options = kind => workspace.groups.filter(({ data }) => (data.kind === 'home') === (kind === 'home'))
    .map(({ id, data }) => `<option value="${esc(id)}" ${id === workspace.active ? 'selected' : ''}>${esc(data.group)}</option>`).join('');
  const homeOptions = options('home'), groupOptions = options('group');
  const hasSaves = homeOptions || groupOptions || workspace.sample;
  return `<section class="welcome">
    <div><div class="eyebrow">SUCCESS AVENUE MONEY</div><h1>The Lucas Money Game</h1>
      <p>Run a small business or take on paid jobs at home. Learn to manage what you earn and work towards a savings goal.</p>
      <div class="action-row">${button('Play at home', 'new-home', '', 'primary')}${button('Set up your group', 'new-group')}${button(workspace.sample ? 'Resume test group' : 'Try the test group', 'test-group')}</div></div>
    <div class="welcome-route"><strong>Savings milestones</strong><div class="welcome-milestones">${savingsMilestones.map(percent => `<span>${percent}%</span>`).join('')}</div><p>Earn badges as you close in on your goal.</p></div>
  </section>
  <div class="welcome-grid">
    <section class="panel start-panel"><h2>Continue a saved game</h2>
      ${hasSaves ? `<label for="home-group">Saved game<select id="home-group">
        ${homeOptions ? `<optgroup label="Home games">${homeOptions}</optgroup>` : ''}
        ${groupOptions ? `<optgroup label="Groups">${groupOptions}</optgroup>` : ''}
        ${workspace.sample ? `<option value="test" ${workspace.active === 'test' ? 'selected' : ''}>Test group · sample learners</option>` : ''}
        </select></label>
        ${isHomeGame() ? `<p>${esc(p.name)} · ${esc(p.business)}</p>` : p ? `<label for="home-profile">Learner profile<select id="home-profile">${state.players.map(other=>`<option value="${esc(other.id)}" ${other.id === p.id ? 'selected' : ''}>${esc(other.name)} · ${esc(other.business)}</option>`).join('')}</select></label>` : '<p>This group is ready for its first learner.</p>'}
        <div class="action-row">${p ? button('Continue as learner', 'open-learner', '', 'primary') : ''}${button('Open ' + facilitatorLabel().toLowerCase(), 'open-facilitator', '', p ? 'secondary' : 'primary')}</div>`
      : '<p>Home games and groups you set up will appear here.</p>'}
    </section>
    <section class="panel start-panel"><h2>First time playing?</h2><p>Play at home with one learner and a parent or caregiver. For a class or club, set up a group and add learners.</p>
    <p>The test group lets you try the game with sample learners and submissions.</p>${button('View setup instructions', 'view', 'data-view="setup"')}</section>
  </div>`;
}
function setupView() {
  return `${pageHeader('GETTING STARTED', 'Setup instructions', 'Choose how you want to play on this device.')}
  <div class="help-grid">
    <section class="panel help-panel"><h2>Play at home</h2>
      <ol class="setup-steps">
        <li>Set up one learner with a business or paid household job and a savings goal.</li>
        <li>Use <strong>Parent / caregiver view</strong> to tailor the first week or add a mission you can do together.</li>
        <li>In <strong>Learner view</strong>, record earnings and costs and submit the missions. Review them together in the parent view and record the check-in to open the next week.</li>
      </ol>${button('Play at home', 'new-home', '', 'primary')}
    </section>
    <section class="panel help-panel"><h2>Play with a group</h2>
      <ol class="setup-steps">
        <li>Create a group for your class, club or household with multiple learners.</li>
        <li>In <strong>Facilitator view</strong>, set the weekly money rules in Settings if needed, then use <strong>Add learner</strong> to set up each person.</li>
        <li>Open a learner record to customise their missions, review work and close the week after the check-in.</li>
      </ol><div class="action-row">${button('Start a new group', 'new-group')}${button(workspace.sample ? 'Resume test group' : 'Try the test group', 'test-group')}</div>
    </section>
  </div><p class="detail spaced">Games and progress are saved in this browser. Learners and facilitators use the same saved game on this device.</p>`;
}

function aboutPanel() {
  return `<section class="panel help-panel">
    <h2>About Success Avenue Money</h2>
    <p>Success Avenue Money helps people learn practical money skills through stories, lessons and quizzes. The game gives learners a place to try those skills over four weeks.</p>
    <p>Profiles and progress are stored in this browser. The game uses simulated tax and allocations.</p>
    <p><a href="https://www.successavenuemoney.com/about" target="_blank" rel="noopener noreferrer">Visit Success Avenue Money (new tab)</a></p>
  </section>`;
}
function publicHelpView() {
  return `${pageHeader('THE LUCAS MONEY GAME', 'About & Help', 'A four-week business game for practising everyday decisions about earning, spending and saving.')}
  <div class="help-grid">
    <section class="panel help-panel"><h2>Getting started</h2>
      <p>From Home, start a home game, try the test group or set up a group for multiple learners. The setup guide walks you through choosing a way to play and preparing the first week.</p>
      <div class="action-row">${button('View setup instructions', 'view', 'data-view="setup"', 'primary')}${button('Back to Home', 'view', 'data-view="home"')}</div>
    </section>
    ${aboutPanel()}
  </div>`;
}
function learnerHelpView() {
  return `${pageHeader('LEARNER', 'About & Help', 'Get help with your weekly missions, money log and rewards.')}
  <div class="help-grid">
    <section class="panel help-panel"><h2>How to play</h2>
      <ol>
        <li><strong>Try it in real life.</strong> Agree on a job or product and what you’ll charge. Paid household jobs count. Add your actual earnings and costs to the Money log.</li>
        <li><strong>Complete your missions.</strong> Try the business mission, take the money quiz and apply the same idea outside your business. Use the question-mark buttons for examples.</li>
        <li><strong>Close the week.</strong> Choose <em>Settle the week</em> in solo practice. In a mentored game, your facilitator reviews the missions and records a check-in.</li>
      </ol>
      ${button('Back to this week', 'view', 'data-view="week"', 'primary')}
    </section>
    <section class="panel help-panel"><h2>How the money works</h2>
      <p><strong>Sales − costs = profit before tax.</strong> A simulated tax rate applies when there’s a profit. If costs are higher than sales, the loss stays in your history and there’s no profit to split that week.</p>
      <dl class="bucket-help">
        <div><dt>Spend</dt><dd>Money for things you need or want now.</dd></div>
        <div><dt>Save</dt><dd>Money set aside for your goal. Your goal meter uses this bucket.</dd></div>
        <div><dt>Invest</dt><dd>Money earmarked for longer-term growth in the simulation.</dd></div>
        <div><dt>Give</dt><dd>Money earmarked to support people or causes you choose.</dd></div>
      </dl>
      <p>Activity rewards are tracked separately from business earnings. Closing a week adds the new bucket allocations to your totals.</p>
    </section>
    <section class="panel help-panel"><h2>Badges and shop upgrades</h2>
      <p>In My progress, badges recognise milestones like completing a mission or saving a quarter of your goal. Visit My virtual shop to spend game points on upgrades or save for a bigger one. Your badges stay in your collection.</p>
      <p>Click the game logo to return to Home.</p>
    </section>
    ${aboutPanel()}
  </div>`;
}
function facilitatorHelpView() {
  return `${pageHeader('FACILITATOR', 'About & Help', 'Get help preparing modules, reviewing work and running weekly check-ins.')}
  <div class="help-grid">
    <section class="panel help-panel"><h2>${isHomeGame() ? 'Supporting your learner at home' : 'Managing your group'}</h2>
      <ol>
        <li>${isHomeGame() ? '<strong>Talk about the goal.</strong> Agree on their paid job or business and what they want to save for.' : '<strong>Add a learner.</strong> Set their business, learning level, savings goal and whether they’ll play solo or with mentor check-ins.'}</li>
        <li><strong>Prepare a module.</strong> Open the learner record and customise the context or missions for a current or upcoming week.</li>
        <li><strong>Run a check-in.</strong> Review and approve all required missions. Record the check-in to close the week and open the next one.</li>
      </ol>
      ${button('Back to ' + dashboardLabel().toLowerCase(), 'view', 'data-view="group"', 'primary')}
    </section>
    <section class="panel help-panel"><h2>Money rules and lessons</h2>
      <p>In Settings, add a SAM lesson link and set the simulated tax rate, bucket percentages and weekly rewards for newly opened weeks. ${isHomeGame() ? 'Changes to money rules apply from the next week that opens.' : 'Set the rules before adding learners if you want them to apply from Week 1.'}</p>
      <p>The learner record shows the week’s sales, expenses, simulated tax, bucket allocations and check-in notes.</p>
    </section>
    ${aboutPanel()}
  </div>`;
}

function settingsView() {
  return `${pageHeader('FACILITATOR', 'Pilot settings', 'Changes apply to newly opened weeks. Current and closed weeks retain their existing rules.')}
  <form class="panel settings" id="settings"><div class="fields">
  ${field(isHomeGame() ? 'Home game name' : 'Group name', 'group', 'Use a name you’ll recognise when you resume the game from Home.', `<input name="group" value="${esc(state.group)}" required maxlength="60">`)}
  ${field('SAM lesson link (optional)', 'lessonUrl', 'Paste an HTTPS address for a Success Avenue Money lesson. It opens from the learner’s money lesson.', `<input type="url" name="lessonUrl" value="${esc(state.lessonUrl)}" placeholder="https://">`)}
  ${field('Simulated tax rate (%)', 'tax', 'The percentage of positive weekly business profit taken as simulated tax before the buckets are filled.', `<input type="number" name="tax" min="0" max="100" required value="${state.rules.tax}">`)}
  ${field('Weekly completion bonus (points)', 'bonus', 'Extra points awarded when all required missions are complete and the week closes.', `<input type="number" name="bonus" min="0" max="1000" required value="${state.rules.bonus}">`)}
  ${field('Simulated savings match (%)', 'match', 'Adds a percentage of the week’s Save allocation when the week closes. At 50%, $10 saved earns a $5 match before the cap.', `<input type="number" name="match" min="0" max="100" required value="${state.rules.match}">`)}
  ${field('Weekly match cap (NZD)', 'cap', 'The most the game can add to Save through matching in one week, in New Zealand dollars.', `<input type="number" name="cap" min="0" max="100000" step=".01" required value="${state.rules.cap / 100}">`)}</div>
  <fieldset><legend>Bucket allocation</legend><div class="fields split">${buckets.map((name,i) => field(name + ' (%)', 'split-' + i, 'Share of after-tax business profit sent to ' + name + '. The four percentages must add up to 100.', `<input name="split" type="number" min="0" max="100" required value="${state.rules.split[i]}">`)).join('')}</div></fieldset>
  <p class="detail">Bucket percentages must add up to 100.</p><p class="error" role="alert"></p><button class="button primary">Save settings</button></form>`;
}
function render() {
  const isPublic = publicRoutes.has(view);
  const p = isPublic ? undefined : player();
  $('#role').innerHTML = !isPublic && state && (role === 'learner' || p)
    ? button(role === 'learner' ? facilitatorLabel() : 'Learner view', 'switch-role', '', 'role-switch') : '';
  const links = isPublic
    ? [['home','Home'], ['setup','Setup instructions'], ['public-help','About &amp; Help']]
    : role === 'learner'
      ? [['week','This week'], ['money','Money log'], ['progress','My progress'], ['shop','My virtual shop'], ['learner-help','About &amp; Help']]
      : [['home','Home'], ['group',dashboardLabel()], ['settings','Settings'], ['facilitator-help','About &amp; Help']];
  $('#nav').innerHTML = links.map(([id,label]) => `<button type="button" data-action="view" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${label}</button>`).join('') + (p && role === 'learner' && !isHomeGame() ? `<label class="profile"><span class="sr-only">Learner profile</span><select id="profile">${state.players.map(other => `<option value="${other.id}" ${other.id === p.id ? 'selected' : ''}>${esc(other.name)}</option>`).join('')}</select></label>` : '');
  const sections = { home: homeView, setup: setupView, 'public-help': publicHelpView, 'learner-help': learnerHelpView, 'facilitator-help': facilitatorHelpView, detail: learnerDetail, week: weekView, money: moneyView, progress: progressView, shop: shopView, group: groupView, settings: settingsView };
  const context = !isPublic && state ? `<p class="group-context">${workspace.active === 'test' ? 'Test group · Sample data' : esc(state.group)}</p>` : '';
  $('#main').innerHTML = '<p id="notice" class="toast" role="status" tabindex="-1" hidden></p>' + context + sections[view](view === 'detail' ? state.players.find(other => other.id === detailPlayerId) : p);
}

function closeDialog() { dialog.close(); }
function openDialog(title, body) {
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title" tabindex="-1">${title}</h2>${button('Close', 'dismiss', 'aria-label="Close dialog"', 'small')}</div>${body}`;
  if (!dialog.open) dialog.showModal();
  $('#dialog-title').focus();
}
function form(action, body, label, attrs = '') {
  return `<form data-form="${action}" ${attrs}>${body}<p class="error" role="alert"></p><div class="dialog-actions"><button class="button primary">${label}</button></div></form>`;
}
function field(label, id, hint, control) {
  const input = control.replace(/^<(input|select|textarea)/, `<$1 id="${id}" aria-describedby="tip-${id}"`);
  return `<div class="field"><div class="field-heading"><label for="${id}">${label}</label><button type="button" class="field-tip" data-action="field-tip" aria-label="Help for ${esc(label)}" aria-expanded="false" aria-controls="tip-${id}">?</button></div>
    ${input}<div class="tip-text" id="tip-${id}" hidden>${esc(hint)}</div></div>`;
}
function textField(label, name, hint, value = '', limit = 80, required = true) {
  return field(label, name, hint, `<input name="${name}" value="${esc(value)}" maxlength="${limit}" ${required ? 'required' : ''}>`);
}
function noteField(label, name, hint, value = '', required = true) {
  return field(label, name, hint, `<textarea name="${name}" rows="4" maxlength="600" ${required ? 'required' : ''}>${esc(value)}</textarea>`);
}
function taskDialog(p, week, task) {
  const spec = weeks[week.index];
  const module = moduleFor(p, week.index);
  const lessonUrl = module.lessonUrl || state.lessonUrl;
  const editable = !week.closed && ['todo', 'revision'].includes(task.status);
  let content = `<p>${esc(taskPrompt(task, p, week))}</p>`;
  if (task.feedback) content += `<p class="feedback"><strong>Feedback</strong> · ${esc(task.feedback)}</p>`;
  if (task.id === 'learning') {
    content += `<div class="lesson"><h3>Money lesson</h3><p>${spec.lesson}</p>${module.lessonNote ? `<p><strong>Link to your business</strong> · ${esc(module.lessonNote)}</p>` : ''}${lessonUrl ? `<a href="${esc(lessonUrl)}" target="_blank" rel="noopener noreferrer">Open SAM lesson (new tab)</a>` : ''}</div>`;
    if (editable) content += form('quiz', `<fieldset><legend>${spec.question}</legend>${spec.answers.map((answer, index) => `<label class="radio"><input type="radio" name="answer" value="${index}" required> ${answer}</label>`).join('')}</fieldset>`, 'Submit answer');
  } else if (editable) {
    if (task.id === 'business' && p.mode === 'sim' && week.choice === null) {
      content += `<p>Run market day before writing about your decision.</p>${button('Back to the market', 'dismiss', '', 'primary')}`;
    } else {
      content += form('task', noteField('Your response', 'evidence', task.id === 'business' ? 'Name the choice you made and explain one reason for it. Use a price, cost or sales figure if it helps explain your decision.' : task.id === 'reflection' ? 'One or two sentences are enough. Say what you noticed and what you would do next.' : 'Use the instructions above to describe what you did or share what you found.', task.evidence), p.solo ? 'Complete mission' : 'Submit for review', `data-id="${task.id}"`);
    }
  }
  if (!editable) content += task.evidence ? `<div class="lesson"><strong>Your submission</strong><p>${esc(task.evidence)}</p></div>` : `<p>${statuses[task.status]}</p>`;
  openDialog(esc(taskName(task, p)), content);
}
function playerDialog(p, homeSetup = false) {
  openDialog(homeSetup ? 'Play at home' : p ? 'Edit learner profile' : role === 'learner' ? 'Start your own game' : 'Add learner', form(homeSetup ? 'new-home' : p ? 'edit-player' : 'add-player', `${homeSetup ? '<p>Set up one learner. A parent or caregiver can tailor missions, review work and run weekly check-ins.</p>' : ''}<div class="fields">
    ${textField('First name or nickname', 'name', 'This name appears in the profile picker and facilitator dashboard. A nickname is enough.', p?.name, 40)}${textField('Business name', 'business', 'Give your business or household service a name, such as Weekend Car Wash.', p?.business)}
    ${field('Learning level', 'track', 'Changes the type of business questions asked in weekly missions.', `<select name="track">${tracks.map((label,index) => `<option value="${index}" ${index === p?.track ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
    ${!p ? field('Business mode', 'mode', 'Choose My real business for paid household jobs, a service or a product you sell. The practice simulation supplies sample figures.', `<select name="mode"><option value="manual">My real business</option><option value="sim">Practice simulation</option></select>`) : ''}
    ${textField('What do you offer? (optional)', 'offer', 'Describe the job or product, such as mowing the lawn for an agreed price.', p?.offer, 120, false)}
    ${textField('Who is it for? (optional)', 'customers', 'Name the type of customer, such as my family or neighbours I know.', p?.customers, 120, false)}
    ${!p && !homeSetup ? `${field('Play with', 'reviewMode', 'In solo practice you close your own weeks. In mentor mode a facilitator reviews your work and records check-ins.', `<select name="reviewMode"><option value="mentor" ${role === 'facilitator' ? 'selected' : ''}>Mentor check-ins</option><option value="solo" ${role === 'learner' ? 'selected' : ''}>Solo practice</option></select>`)}` : ''}
    ${textField('Savings goal', 'goal', 'Choose something specific you want to save for, such as art supplies or a used bike.', p?.goal)}${field('Goal amount (NZD)', 'target', 'How much do you want in Save for this goal? Enter an amount in New Zealand dollars, such as 30 or 30.50.', `<input name="target" type="number" step=".01" min=".01" max="1000000" value="${p ? p.target / 100 : ''}" required>`)}</div>`, homeSetup ? 'Start home game' : p ? 'Save changes' : 'Create learner', p ? playerAttrs(p) : ''));
}
function reviewDialog(p, t) {
  const w = activeWeek(p);
  openDialog('Review ' + esc(p.name) + '’s submission', `<h3>${esc(taskName(t, p))}</h3><p>${esc(taskPrompt(t, p, w))}</p><div class="lesson"><p>${esc(t.evidence)}</p></div>
    ${form('review', `${field('Decision', 'decision', 'Approve to give credit for this mission. Ask for a revision when the learner needs to try again.', `<select name="decision"><option value="approved">Approve</option><option value="revision">Ask for a revision</option></select>`)}${noteField('Feedback', 'feedback', 'Say what worked or what to change. Feedback is required when asking for a revision.', '', false)}`, 'Save review', `data-player="${p.id}" data-id="${t.id}"`)}`);
}
function learnerDetail(p) {
  const index = detailWeek ?? activeWeek(p).index;
  const week = p.weeks[index];
  const module = moduleFor(p, index);
  const result = progress(p);
  const tally = week && totals(week);
  const wallet = shopWallet(p);
  const attrs = playerAttrs(p);
  const indexAttrs = `${attrs} data-index="${index}"`;
  const editable = week && !week.closed;
  return `${isHomeGame() ? '' : `<div class="detail-back">${button('Back to group dashboard', 'view', 'data-view="group"', 'quiet')}</div>`}
  ${pageHeader(isHomeGame() ? 'PARENT DASHBOARD' : 'FACILITATOR · LEARNER RECORD', esc(p.name), esc(p.business) + ' · ' + tracks[p.track] + ' · ' + (p.mode === 'manual' ? 'Real business' : 'Practice simulation') + ' · ' + (p.solo ? 'Solo practice' : 'Mentor check-ins'), button('Edit learner profile', 'edit-player', attrs, 'primary'))}
  <div class="detail-overview">
    <section class="panel"><h2>Business and goal</h2><dl class="learner-facts">
      <div><dt>Offer</dt><dd>${esc(p.offer || 'Add what the business offers in Edit learner profile.')}</dd></div>
      <div><dt>Customers</dt><dd>${esc(p.customers || 'Add who the business serves in Edit learner profile.')}</dd></div>
      <div><dt>Savings goal</dt><dd>${esc(p.goal)} · ${money(result.buckets[1])} of ${money(p.target)} (${pct(p)}%)</dd></div>
      <div><dt>Progress</dt><dd>${result.closed} of ${weeks.length} weeks closed · ${result.points} points</dd></div>
      <div><dt>Virtual shop</dt><dd>${wallet.balance} pts available · ${wallet.spent} spent${wallet.owned.size ? ' · ' + shopItems.filter(item => wallet.owned.has(item.id)).map(item => item.name).join(', ') : ''}</dd></div>
      <div><dt>Badges</dt><dd>${earnedAwards(p).map(award => award.title).join(' · ') || 'None earned yet'}</dd></div>
    </dl>${button('Open learner view', 'switch-player', attrs, 'small')}</section>
    <section class="panel learner-buckets"><h2>Four buckets to date</h2><p>Closed weeks only. Save includes any simulated match.</p>${bucketCards(result.buckets)}</section>
  </div>
  <section class="panel spaced" aria-labelledby="module-overview-title">
    <div class="section-title detail-section"><div><h2 id="module-overview-title">Weekly record</h2><p>Review completed weeks or plan a future module for this learner.</p></div>
      <label class="inline-field">Week <select id="detail-week">${weeks.map((_,i) => `<option value="${i}" ${i === index ? 'selected' : ''}>Week ${i+1} · ${p.weeks[i]?.closed ? 'Closed' : p.weeks[i] ? 'Open' : 'Upcoming'}</option>`).join('')}</select></label></div>
    <div class="section-title detail-section"><div><h3>${esc(module.title)}</h3><p>${esc(module.summary)}</p></div>${week?.closed ? pill('Week closed', 'green') : button('Customise module', 'edit-module', indexAttrs, 'small')}</div>
    <dl class="learner-facts module-facts">
      <div><dt>In the business</dt><dd>${esc(module.business)}</dd></div>
      <div><dt>Outside the business</dt><dd>${esc(module.outside)}</dd></div>
      ${module.lessonNote ? `<div><dt>Lesson connection</dt><dd>${esc(module.lessonNote)}</dd></div>` : ''}
      ${module.lessonUrl ? `<div><dt>Lesson link</dt><dd><a href="${esc(module.lessonUrl)}" target="_blank" rel="noopener noreferrer">Open assigned lesson (new tab)</a></dd></div>` : ''}
    </dl>
  </section>
  ${week ? `<section class="panel spaced">
    <div class="section-title detail-section"><div><h2>Missions and submissions</h2><p>${week.tasks.filter(t => t.status === 'approved').length} of ${week.tasks.length} complete or approved · ${tally.points} points this week</p></div>
    <div class="action-row">${isHomeGame() && editable ? button('Assign activity', 'assign', '', 'small') : ''}${editable && !p.solo && tally.ready ? button('Record check-in', 'close-week', attrs, 'primary') : ''}</div></div>
    <div class="record-missions">${week.tasks.map(task => `<article class="record-mission"><div class="section-title detail-section"><div><h3>${esc(taskName(task, p))}</h3><p>${task.required ? 'Required' : 'Optional'} · ${task.points} pts</p></div>${pill(statuses[task.status], task.status === 'approved' ? 'green' : '')}</div>
      <p>${esc(taskPrompt(task,p,week))}</p>
      ${task.evidence ? `<p class="record-answer"><strong>Submission</strong><span>${esc(task.evidence)}</span></p>` : '<p>No submission yet.</p>'}
      ${task.feedback ? `<p class="record-answer"><strong>Feedback</strong><span>${esc(task.feedback)}</span></p>` : ''}
      ${editable && task.status === 'submitted' ? button('Review submission', 'review', `${attrs} data-id="${esc(task.id)}"`, 'small') : ''}</article>`).join('')}</div>
    ${week.closed ? `<div class="check-in-note"><h3>Check-in note</h3><p>${esc(week.feedback || 'No note recorded.')}</p>${!p.solo ? button('Edit check-in note', 'edit-check-in', indexAttrs, 'small') : ''}</div>` : ''}
  </section>
  <section class="panel spaced">
    <div class="section-title detail-section"><h2>Week ${index+1} money log</h2>${editable ? button('Add money entry', 'add-entry', attrs, 'small') : ''}</div>
    <dl class="ledger-totals">${[['Sales',tally.sales],['Expenses',tally.costs],['Profit before tax',tally.profit],['Simulated tax (' + week.rules.tax + '%)',tally.tax],['Profit to split',tally.distributable],['Activity rewards',tally.rewards],['Savings match',tally.match]].map(([label,value])=>`<div><dt>${label}</dt><dd>${money(value)}</dd></div>`).join('')}</dl>
    ${week.result ? `<p><strong>Practice scenario</strong> · ${market[index].plans[week.choice].label} · ${week.result.tactic} · ${week.result.sold} sales, ${week.result.returning} returning customers</p>` : ''}
    ${transactionTable(p,week)}
    <h3 class="spaced">${week.closed ? 'Weekly bucket allocation' : 'Bucket preview'}</h3>${bucketCards(tally.allocations)}
  </section>` : '<p class="detail spaced">Missions and money entries appear here when this week opens.</p>'}`;
}
function moduleDialog(p, index) {
  const module = moduleFor(p, index);
  openDialog('Customise week ' + (index + 1), `<p>These changes apply to ${esc(p.name)}. The short quiz stays with the week’s financial topic. Submitted responses keep the instructions they answered.</p>
    ${form('edit-module', `${textField('Module title', 'moduleTitle', 'Name the focus in the learner’s own context, such as Price two lawn-mowing jobs.', module.title)}
      ${noteField('Weekly context', 'moduleContext', 'Explain how this week’s topic connects to their business or savings goal.', module.summary)}
      ${noteField('Business mission', 'businessMission', 'Give one useful thing to try or measure in their real business.', module.business)}
      ${noteField('Outside-business mission', 'outsideMission', 'Ask them to apply the same money idea to an everyday situation.', module.outside)}
      ${noteField('Lesson connection (optional)', 'lessonNote', 'Add a short example using the learner’s goal or business numbers.', module.lessonNote, false)}
      ${field('Lesson link (optional)', 'moduleLink', 'Add an HTTPS link for this learner and week. It appears alongside the built-in lesson.', `<input name="moduleLink" type="url" value="${esc(module.lessonUrl)}">`)}`, 'Save module', `${playerAttrs(p)} data-index="${index}"`)}`);
}
function entryDialog(p, entry) {
  const choices = Object.entries(typeNames).filter(([kind]) => p.mode === 'manual' || kind === 'reward');
  openDialog(entry ? 'Edit money log entry' : 'Add money log entry', form('entry', `${field('Type', 'kind', 'A sale is money paid for a product or service, including an agreed household job. Use Activity reward for money earned outside the business.', `<select name="kind">${choices.map(([kind,label]) => `<option value="${kind}" ${entry?.kind === kind ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
    ${p.mode === 'sim' ? '<p class="detail">The practice simulation adds its sales and expenses automatically.</p>' : ''}
    ${textField('Description', 'label', 'Use a short label, such as Two Saturday car washes or Cleaning supplies.', entry?.label)}
    ${field('Amount (NZD)', 'amount', 'Enter a positive amount in New Zealand dollars. The entry type tells the game whether it is money in or a cost.', `<input name="amount" type="number" min=".01" max="1000000" step=".01" value="${entry ? entry.cents / 100 : ''}" required>`)}`, 'Save entry', `${playerAttrs(p)}${entry ? ' data-id="' + esc(entry.id) + '"' : ''}`));
}

document.addEventListener('click', event => {
  const el = event.target.closest('button[data-action]');
  if (!el) return;
  const { action, player: id, view: next, index, id: item } = el.dataset;
  if (action === 'field-tip') {
    const tip = document.getElementById(el.getAttribute('aria-controls'));
    tip.hidden = !tip.hidden;
    el.setAttribute('aria-expanded', String(!tip.hidden));
    return;
  }
  const p = id ? state?.players.find(other => other.id === id) : player();
  const w = p && activeWeek(p), task = w?.tasks.find(t => t.id === item);
  switch (action) {
    case 'dismiss': closeDialog(); break;
    case 'view': closeDialog(); navigate(next); break;
    case 'shop-buy': {
      const upgrade = shopItems.find(entry => entry.id === item);
      if (role === 'learner' && view === 'shop' && p && upgrade) shopPurchaseDialog(p, upgrade);
      break;
    }
    case 'shop-theme':
      if (role === 'learner' && view === 'shop' && p && equipTheme(p, item)) save('Shop theme updated.');
      break;
    case 'shop-target':
      if (role === 'learner' && view === 'shop' && p && setShopTarget(p, item || null)) save(item ? 'Upgrade goal saved.' : 'Upgrade goal cleared.');
      break;
    case 'open-learner': if (p) openRole('learner'); break;
    case 'open-facilitator': if (state) openRole('facilitator'); break;
    case 'new-home':
      if (publicRoutes.has(view)) playerDialog(undefined, true);
      break;
    case 'new-group':
      openDialog('Set up your group', form('new-group', textField('Group name', 'newGroupName', 'Use a name for your class, household or club.', '', 60), 'Create group'));
      break;
    case 'test-group':
      if (!workspace.sample) {
        workspace.sample = fresh();
        workspace.sample.players.forEach(p => grantAwards(p));
      }
      selectGroup('test');
      navigate('home');
      save('Test group selected. Continue as a learner or open the facilitator dashboard.');
      break;
    case 'switch-role': openRole(role === 'learner' ? 'facilitator' : 'learner'); break;
    case 'switch-player': state.current = p.id; role = 'learner'; closeDialog(); navigate('week'); save(); break;
    case 'edit-player': playerDialog(p); break;
    case 'add-player': if (state && !isHomeGame()) playerDialog(); break;
    case 'task': if (task) taskDialog(p, w, task); break;
    case 'plan':
      if (p.mode === 'sim' && !w.closed && w.choice === null && market[w.index].plans[Number(index)]) {
        w.plan = Number(index);
        save('Plan selected. Read the market news and choose a response.');
      }
      break;
    case 'clear-plan':
      if (!w.closed && w.choice === null) {
        delete w.plan;
        delete w.tactic;
        save('Choose your plan.');
      }
      break;
    case 'tactic':
      if (p.mode === 'sim' && !w.closed && w.choice === null && w.plan !== undefined && market[w.index].tactics[Number(index)]) {
        w.tactic = Number(index);
        save();
        $('.run-button')?.focus();
      }
      break;
    case 'run-market': {
      if (p.mode !== 'sim' || w.choice !== null || w.closed || w.plan === undefined || w.tactic === undefined) return;
      const result = marketResult(p, w, w.plan, w.tactic);
      w.choice = w.plan;
      w.result = result;
      w.transactions.push({ id: uid(), kind: 'sale', label: 'Market day sales', cents: result.sales, sim: true }, { id: uid(), kind: 'cost', label: 'Market day costs', cents: result.costs, sim: true });
      save('Market day finished. See the results and complete your weekly missions.', grantAwards(p));
      break;
    }
    case 'solo-settle': {
      const tally = totals(w);
      if (!p.solo || w.closed || !tally.ready) return;
      openDialog('Settle week ' + (w.index + 1), `<p>${tally.distributable ? money(tally.distributable) + ' after simulated tax goes into your four buckets.' : 'There’s no profit to split this week.'}</p>
        ${bucketCards(tally.allocations)}<p>Weekly bonus · +${w.rules.bonus} points${w.rules.match ? ' · any eligible simulated match is added to Save' : ''}</p>
        ${form('solo-settle', '', w.index === weeks.length - 1 ? 'Finish campaign' : 'Start next week')}`);
      break;
    }
    case 'add-entry':
      if (!w.closed) entryDialog(p);
      break;
    case 'edit-entry': {
      const entry = w.transactions.find(record => record.id === item && !record.sim);
      if (entry && !w.closed) entryDialog(p, entry);
      break;
    }
    case 'remove-entry': {
      const entry = w.transactions.find(record => record.id === item && !record.sim);
      if (!entry || w.closed) return;
      openDialog('Remove entry?', `<p>${esc(entry.label)} · ${money(entry.cents)}</p>${form('remove-entry', '', 'Remove entry', `${playerAttrs(p)} data-id="${esc(item)}"`)}`);
      break;
    }
    case 'assign':
      openDialog('Assign activity', form('assign', `${isHomeGame() ? `<input type="hidden" name="recipient" value="${esc(p.id)}">` : field('Assign to', 'recipient', 'Choose one learner or assign to everyone with an open mentored week.', `<select name="recipient"><option value="all">All mentored learners with an open week</option>${state.players.filter(other => !other.solo && !activeWeek(other).closed).map(other => `<option value="${other.id}">${esc(other.name)} · Week ${activeWeek(other).index + 1}</option>`).join('')}</select>`)}
      ${textField('Activity title', 'title', 'Use a short title the learner can recognise, such as Compare two prices.')}${noteField('What should they do and submit?', 'prompt', 'Give one clear task and say what to return. For example, compare two prices and send one sentence explaining your choice.')}${field('Points', 'points', 'How many points should approval of this activity award?', `<input type="number" name="points" value="10" min="0" max="100" required>`)}
      <label class="radio"><input type="checkbox" name="required"> Required for check-in</label>`, 'Assign activity')); break;
    case 'review': if (task?.status === 'submitted' && !w.closed) reviewDialog(p, task); break;
    case 'learner-detail':
      if (role !== 'facilitator') return;
      detailPlayerId = p.id;
      detailWeek = w.index;
      navigate('detail');
      break;
    case 'edit-module':
      if (role === 'facilitator' && weeks[Number(index)] && !p.weeks[Number(index)]?.closed) moduleDialog(p, Number(index));
      break;
    case 'edit-check-in': {
      const selected = p.weeks[Number(index)];
      if (role !== 'facilitator' || !selected?.closed || p.solo) return;
      openDialog('Edit check-in note', form('edit-check-in', noteField('Feedback and next step', 'feedback', 'Correct the note or clarify the next step for this learner.', selected.feedback), 'Save note', `${playerAttrs(p)} data-index="${index}"`));
      break;
    }
    case 'close-week':
      if (!p.solo && totals(w).ready && !w.closed) openDialog('Check in with ' + esc(p.name), `<p>All required activities are approved. Review the business result and agree on one next step.</p>
      ${w.tasks.some(t => !t.required && t.status === 'submitted') ? '<p>Optional submissions are still awaiting review. Review them before closing the week if you want them to count.</p>' : ''}
      <div class="lesson"><strong>Week ${w.index + 1}</strong><p>${money(totals(w).profit)} profit before simulated tax · ${money(totals(w).allocations[1])} allocated to Save</p></div>
      ${form('close-week', noteField('Feedback and next step', 'feedback', 'Summarise one thing the learner noticed and agree on one action to try next week.'), w.index === weeks.length - 1 ? 'Finish pilot' : 'Close week and open next', `data-player="${p.id}"`)}`); break;
  }
});
document.addEventListener('change', event => {
  if (event.target.id === 'home-group') { selectGroup(event.target.value); save(); $('#home-group').focus(); }
  if (event.target.id === 'home-profile') { state.current = event.target.value; save(); $('#home-profile').focus(); }
  if (event.target.id === 'profile') { state.current = event.target.value; ledgerWeek = undefined; save(); $('#profile').focus(); }
  if (event.target.id === 'detail-week') { detailWeek = Number(event.target.value); render(); $('#detail-week').focus(); }
  if (event.target.id === 'ledger-week') { ledgerWeek = Number(event.target.value); render(); $('#ledger-week').focus(); }
});
document.addEventListener('submit', event => {
  const el = event.target;
  if (!el.matches('[data-form], #settings')) return;
  event.preventDefault();
  const data = new FormData(el);
  const value = name => String(data.get(name) ?? '').trim();
  const fail = message => { el.querySelector('.error').textContent = message; };
  const p = el.dataset.player ? state?.players.find(other => other.id === el.dataset.player) : player();
  const w = p && activeWeek(p), task = w?.tasks.find(t => t.id === el.dataset.id);
  const finish = (message, unlocked) => { closeDialog(); save(message, unlocked); };
  switch (el.dataset.form ?? 'settings') {
    case 'shop-buy': {
      if (role !== 'learner' || view !== 'shop' || !p || player()?.id !== p.id) return;
      const error = buyUpgrade(p, el.dataset.id);
      if (error) return fail(error);
      finish(shopItems.find(item => item.id === el.dataset.id).name + ' added to your virtual shop.');
      break;
    }
    case 'new-group': {
      const name = value('newGroupName');
      if (!name) return fail('Enter a group name.');
      const id = uid();
      workspace.groups.push({ id, data: newGroup(name) });
      selectGroup(id);
      role = 'facilitator';
      view = 'group';
      finish('Group created. Add a learner to get started.');
      break;
    }
    case 'settings': {
      const split = data.getAll('split').map(Number);
      if (split.reduce((sum, n) => sum + n, 0) !== 100) return fail('Bucket percentages must add up to 100.');
      if (!value('group')) return fail(isHomeGame() ? 'Enter a home game name.' : 'Enter a group name.');
      const url = value('lessonUrl');
      if (url) {
        try { if (new URL(url).protocol !== 'https:') return fail('Enter a link starting with https://.'); }
        catch { return fail('Enter a valid SAM lesson link.'); }
      }
      state.group = value('group');
      state.lessonUrl = url;
      state.rules = { split, tax: Number(value('tax')), bonus: Number(value('bonus')), match: Number(value('match')), cap: Math.round(Number(value('cap')) * 100) };
      save('Settings saved. Money rules apply to newly opened weeks.');
      break;
    }
    case 'new-home':
    case 'add-player':
    case 'edit-player': {
      const fields = { name: value('name'), business: value('business'), offer: value('offer'), customers: value('customers'), goal: value('goal'), track: Number(value('track')), target: Math.round(Number(value('target')) * 100) };
      if (!fields.name || !fields.business || !fields.goal) return fail('Enter a name, a business and a savings goal.');
      if (!tracks[fields.track] || !Number.isSafeInteger(fields.target) || fields.target < 1 || fields.target > 100000000) return fail('Choose a learning level and enter a valid goal amount.');
      if (el.dataset.form === 'new-home') {
        if (!publicRoutes.has(view)) return;
        const id = uid();
        workspace.groups.push({ id, data: newHomeGame({ ...fields, mode: value('mode') }) });
        selectGroup(id);
        role = 'learner';
        view = 'week';
        finish('Home game ready. Open Parent / caregiver view to plan or review the week together.');
        break;
      }
      if (el.dataset.form === 'edit-player') Object.assign(p, fields);
      else {
        if (!state || isHomeGame()) return;
        const learner = makePlayer({ ...fields, mode: value('mode'), solo: value('reviewMode') === 'solo' }, state.rules);
        state.players.push(learner);
        if (role === 'learner') { state.current = learner.id; view = 'week'; }
      }
      finish(el.dataset.form === 'edit-player' ? 'Goal and business saved.' : 'Learner added.');
      break;
    }
    case 'quiz': {
      const learning = w.tasks.find(t => t.id === 'learning');
      const spec = weeks[w.index];
      if (w.closed || value('answer') === '' || !['todo', 'revision'].includes(learning.status)) return;
      if (Number(value('answer')) !== spec.correct) return fail('Try again. The short lesson above can help.');
      learning.status = p.solo ? 'approved' : 'submitted';
      learning.evidence = 'Quiz passed · ' + spec.answers[spec.correct];
      finish(p.solo ? 'Correct. Money lesson complete.' : 'Answer correct. Submitted for review.', grantAwards(p));
      break;
    }
    case 'task':
      if (w.closed || !task || !['todo','revision'].includes(task.status)) return;
      if (task.id === 'business' && p.mode === 'sim' && w.choice === null) return fail('Run market day first.');
      if (!value('evidence')) return fail('Add a short response before submitting.');
      Object.assign(task, { assignedPrompt: taskPrompt(task, p, w), evidence: value('evidence'), status: p.solo ? 'approved' : 'submitted', feedback: '' });
      finish(p.solo ? 'Mission complete.' : 'Activity submitted for review.', grantAwards(p)); break;
    case 'entry': {
      if (w.closed) return;
      const label = value('label'), kind = value('kind'), cents = Math.round(Number(value('amount')) * 100);
      if (!label) return fail('Enter a description for this entry.');
      if (!Number.isSafeInteger(cents) || cents < 1 || cents > 100000000 || !Object.hasOwn(typeNames,kind) || (p.mode === 'sim' && kind !== 'reward')) return fail('Check the type and amount for this entry.');
      const existing = w.transactions.find(record => record.id === el.dataset.id && !record.sim);
      if (el.dataset.id && !existing) return;
      if (existing) Object.assign(existing, { kind, label, cents });
      else w.transactions.push({ id: uid(), kind, label, cents });
      finish(existing ? 'Money log entry updated.' : 'Entry added to the money log.', grantAwards(p));
      break;
    }
    case 'edit-module': {
      const index = Number(el.dataset.index);
      if (role !== 'facilitator' || !weeks[index] || p.weeks[index]?.closed) return;
      const module = { title: value('moduleTitle'), summary: value('moduleContext'), business: value('businessMission'), outside: value('outsideMission'), lessonNote: value('lessonNote'), lessonUrl: value('moduleLink') };
      if (!module.title || !module.summary || !module.business || !module.outside) return fail('Enter a title, context and both mission prompts.');
      if (module.lessonUrl) {
        try { if (new URL(module.lessonUrl).protocol !== 'https:') return fail('Enter a lesson link starting with https://.'); }
        catch { return fail('Enter a valid lesson link.'); }
      }
      (p.modules ??= {})[index] = module;
      finish('Week ' + (index + 1) + ' module saved for ' + p.name + '.');
      break;
    }
    case 'edit-check-in': {
      const selected = p.weeks[Number(el.dataset.index)];
      if (role !== 'facilitator' || !selected?.closed || p.solo) return;
      if (!value('feedback')) return fail('Enter a check-in note.');
      selected.feedback = value('feedback');
      finish('Check-in note updated.');
      break;
    }
    case 'remove-entry':
      if (w.closed) return;
      w.transactions = w.transactions.filter(record => record.id !== el.dataset.id || record.sim);
      finish('Entry removed.'); break;
    case 'assign': {
      const title = value('title'), prompt = value('prompt');
      if (!title || !prompt) return fail('Enter an activity title and instructions.');
      const eligible = state.players.filter(other => !other.solo && !activeWeek(other).closed && (value('recipient') === 'all' || value('recipient') === other.id));
      if (!eligible.length) return fail('No learners have an open week for this activity.');
      eligible.forEach(other => activeWeek(other).tasks.push({ id: uid(), title, prompt, points: Number(value('points')), required: data.has('required'), status: 'todo', evidence: '', feedback: '' }));
      finish(`Activity assigned to ${eligible.length} ${eligible.length === 1 ? 'learner' : 'learners'}.`); break;
    }
    case 'review':
      if (w.closed || task?.status !== 'submitted') return;
      if (value('decision') === 'revision' && !value('feedback')) return fail('Add feedback so the learner knows what to change.');
      Object.assign(task, { status: value('decision'), feedback: value('feedback') });
      finish('Review saved.', grantAwards(p)); break;
    case 'solo-settle':
    case 'close-week': {
      const solo = el.dataset.form === 'solo-settle';
      if (Boolean(p.solo) !== solo) return;
      if (w.closed || !totals(w).ready) return;
      if (!solo && !value('feedback')) return fail('Record feedback or an agreed next step.');
      w.feedback = solo ? w.tasks.find(t => t.id === 'reflection').evidence : value('feedback');
      w.module = moduleFor(p, w.index);
      w.closed = true;
      const unlocked = grantAwards(p, { checkSavings: true });
      if (view === 'detail' || (view === 'group' && isHomeGame())) detailWeek = Math.min(w.index + 1, weeks.length - 1);
      if (w.index < weeks.length - 1) {
        p.weeks.push(makeWeek(w.index + 1, state.rules));
        finish(`Week ${w.index + 1} closed. Week ${w.index + 2} is open.`, unlocked);
      } else finish(solo ? 'Campaign complete. See your results and badges.' : 'Final check-in recorded. Campaign complete.', unlocked);
      break;
    }
  }
});

render();

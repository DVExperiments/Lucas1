import { tracks, buckets, taskLabels, uid, makeWeek, makePlayer, fresh, totals, progress, market, marketResult, goodwill, moduleFor, newGroup, newHomeGame, awards, earnedAwards, grantAwards, savingsMilestones, shopItems, shopWallet, giftCosmetic, buyUpgrade, equipCosmetic, cosmetics, progressHistory, setShopTarget, learningStats, competitionMetrics, competitionBoard, trackVideoCoverage, watchedEnough } from './game.js';
import { episodes, episodeFor, programmeLength } from './curriculum.js';
import { weeklyPoints, weeklyAvatarRewards, challengeFor, practiceMarket, prices, stockOptions, runSchoolMarket, weeklyCertificates,
  completeWeeklyChallenge, approvedCount, classroomUnlocked, submitClassWork, reviewClassWork } from './challenges.js';

const assetUrl = image => new URL('./assets/' + image, location.href).href;
const sitePath = location.pathname.replace(/index\.html$/, '');
const key = 'sam-lucas-workspace-v1:' + sitePath;
const currency = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });
const money = cents => currency.format(cents / 100);
const $ = selector => document.querySelector(selector);
const dialog = $('#dialog');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const missionIcons = { chore: '✓', business: '▦', learning: '▶', reflection: '✎' };
const marks = ['🛍️', '🐖', '🌱', '🎁'];
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
if (!workspace.classResume && state?.current && state.kind !== 'home' && workspace.active !== 'test') workspace.classResume = workspace.active;
let view = 'home';
let role = null;
const publicRoutes = new Set(['home', 'setup', 'public-help']);
const learnerRoutes = new Set(['week', 'money', 'progress', 'shop', 'learner-help', 'dashboard', 'investments', 'challenges']);
const facilitatorRoutes = new Set(['group', 'detail', 'settings', 'facilitator-help', 'teacher-challenges']);
let ledgerWeek;
let detailWeek;
let detailPlayerId;
let marketAttempt;
let marketTimer;
const unlockedClasses = new Set();

for (const group of [...workspace.groups.map(entry => entry.data), workspace.sample].filter(Boolean)) {
  for (const learner of group.players) {
    if (!group.ageBandsV2) learner.track = learner.track === 1 ? 2 : 1;
    const last = learner.weeks.at(-1);
    if (last?.closed && last.index === 3 && learner.weeks.length === 4) learner.weeks.push(makeWeek(4, group.rules));
  }
  group.ageBandsV2 = true;
}
const player = () => state?.players.find(p => p.id === state.current) ?? state?.players[0];
const activeWeek = p => p.weeks.at(-1);
const isHomeGame = () => state?.kind === 'home';
const facilitatorLabel = () => isHomeGame() ? 'Parent / caregiver view' : 'Facilitator view';
const dashboardLabel = () => isHomeGame() ? 'Parent dashboard' : 'Group dashboard';
const classGroups = () => workspace.groups.filter(({data}) => data.kind !== 'home');
const assignedClass = () => {
  const id = workspace.classResume ?? workspace.active;
  return classGroups().find(group => group.id === id && group.data.current);
};
async function classPinDigest(id, pin) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id + ':' + pin));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2,'0')).join('');
}
function pinField() {
  return field('Facilitator PIN','pin','Use 6 to 12 digits. Keep it with the adult running this class.', '<input type="password" name="pin" inputmode="numeric" minlength="6" maxlength="12" pattern="[0-9]{6,12}" autocomplete="off" required>');
}
function classAccessDialog() {
  const groups = classGroups();
  openDialog('Open teacher dashboard', form('class-access',
    field('Class','classId','Choose the class you are running.', `<select name="classId">${groups.map(({id,data}) => `<option value="${esc(id)}" ${id===workspace.active?'selected':''}>${esc(data.group)}</option>`).join('')}</select>`)
    + pinField() + '<p class="detail">Older classes set their PIN the first time a teacher opens them on this browser.</p>', 'Open teacher dashboard'));
}
function teacherGroupControls() {
  if (role !== 'facilitator' || isHomeGame()) return '';
  const groups = classGroups();
  const options = groups.map(({id,data}) => `<option value="${esc(id)}"${id === workspace.active ? ' selected' : ''}>${esc(data.group)}</option>`).join('');
  return `<section class="panel teacher-group-tools" aria-label="Manage classes">
    <label for="teacher-group">Current class<select id="teacher-group">
      ${workspace.active === 'test' ? '<option value="test" selected>Test group · demo</option>' : ''}
      ${options}</select></label>
      ${button('Create another class', 'new-group', '', 'small')}
    </section>`;
}
function switchTeacherGroup(id) {
  closeDialog();
  const destination = view === 'detail' ? 'group' : view;
  detailPlayerId = undefined;
  detailWeek = undefined;
  selectGroup(id);
  navigate(destination);
  save();
  $('#teacher-group')?.focus({ preventScroll: true });
}
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
    toast.focus({ preventScroll: true });
  }
}
function navigate(next) {
  const canOpen = publicRoutes.has(next)
    || (role === 'learner' && player() && learnerRoutes.has(next))
    || (role === 'facilitator' && state && facilitatorRoutes.has(next));
  view = canOpen ? next : 'home';
  if (publicRoutes.has(view)) {
    role = null;
    unlockedClasses.clear();
    detailPlayerId = undefined;
    detailWeek = undefined;
    dialog.replaceChildren();
    announce('');
  }
  ledgerWeek = undefined;
  render();
  window.scrollTo(0, 0);
  $('#main').focus({ preventScroll: true });
  const nav = $('#nav'), active = nav.querySelector('[aria-current="page"]');
  if (active && nav.scrollWidth > nav.clientWidth) {
    const area = nav.getBoundingClientRect(), tab = active.getBoundingClientRect();
    if (tab.left < area.left || tab.right > area.right) nav.scrollLeft += tab.left - area.left;
  }
}
function selectGroup(id) {
  workspace.active = id;
  state = groupState(id);
}
function openRole(nextRole) {
  if (nextRole !== 'facilitator') unlockedClasses.clear();
  chartWeek = undefined;
  role = nextRole;
  if (role === 'facilitator') detailWeek = undefined;
  navigate(role === 'facilitator' ? 'group' : player() ? 'dashboard' : 'home');
}
const pageArt = {
  week: ['market-lights.webp','📋'], money: ['market-lights.webp','🪙'],
  progress: ['coast-ride.webp','🏆'],
  challenges: ['market-lights.webp','🎮'], shop: ['market-lights.webp','⭐'], 'learner-help': ['coast-ride.webp','💡']
};
function pageHeader(label, title, description, action = '') {
  const art = role === 'learner' ? pageArt[view] : undefined;
  return `<div class="page-header ${art ? 'story-header' : ''}" ${art ? `style="--page-art:url('${esc(assetUrl(art[0]))}')"` : ''}>${art ? `<span class="story-icon" aria-hidden="true">${art[1]}</span>` : ''}<div><div class="eyebrow">${label}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
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
  if (task.id === 'learning') return 'Watch the weekly video first, then take the quiz about that video.';
  if (task.id === 'reflection') return info.outside;
  return task.prompt;
}
function goal(p, dark = false) {
  return `<section class="goal ${dark ? 'goal-dark' : 'panel'}"><div class="eyebrow">MY SAVINGS GOAL</div><h2>${esc(p.goal)}</h2>
    <div class="goal-amount"><strong>${money(progress(p).buckets[1])}</strong> <span>of ${money(p.target)}</span></div>
    <progress value="${pct(p)}" max="100" aria-label="Savings goal progress"></progress><div class="goal-bottom"><span>${pct(p)}% of goal</span>${button('Edit goal', 'edit-goal', '', 'quiet')}</div></section>`;
}
function bucketCards(amounts) {
  return `<div class="bucket-grid">${buckets.map((name, index) => `<article class="bucket bucket-${index}"><div class="bucket-icon" aria-hidden="true">${marks[index]}</div><div><div class="bucket-label">${name}</div><strong>${money(amounts[index])}</strong></div></article>`).join('')}</div>`;
}
function marketControls(p, week) {
  const spec = market[week.index % market.length];
  if (week.closed) return button('See programme results', 'view', 'data-view="dashboard"', 'primary');
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
  return `${pageHeader(esc(p.business) + ' · WEEK ' + (week.index + 1), week.closed ? 'Campaign complete' : esc(info.title), week.closed ? 'Look back on your business decisions and see how far you got towards your goal.' : esc(info.summary))}
  <div class="game-shell"><div class="play-area"><section class="scene" aria-label="Market board">
    <div class="scene-header"><strong>${p.mode === 'sim' ? market[week.index % market.length].place : 'My business'}</strong><span>WEEK ${week.index + 1}</span></div>
    ${p.mode === 'sim' ? `<ol class="market-steps" aria-label="Market day stages">${['Choose a plan', 'Respond to news', 'See results'].map((label, i) => {
      const stage = week.choice !== null ? 2 : week.plan !== undefined ? 1 : 0;
      return `<li ${stage === i ? 'aria-current="step"' : ''}><span class="step-number" aria-hidden="true">${i < stage ? '✓' : i+1}</span>${label}</li>`;
    }).join('')}</ol>` : ''}
    <div class="scene-footer"><span>${p.mode === 'sim' ? goodwill(p) + ' potential regulars' : 'Real business'}</span><span>${path.points} points</span></div>
    <div class="market-controls">${marketControls(p, week)}</div></section>
  <section class="quest-log" aria-labelledby="tasks-heading"><div class="section-title"><div><h2 id="tasks-heading">Weekly missions</h2><p>${approved} of ${required} required missions ${p.solo ? 'complete' : 'approved'}</p></div>${pill(week.closed ? 'Week closed' : tally.ready ? (p.solo ? 'Ready to settle' : 'Ready for check-in') : 'In progress', 'green')}</div>
  <div class="tasks">${week.tasks.map(task => {
    const kind = task.kind === 'chore' ? 'chore' : task.id;
    const category = Object.hasOwn(missionIcons, kind) ? kind : 'custom';
    return `<article class="task"><div class="task-icon mission-${category}" aria-hidden="true">${task.status === 'approved' ? '✓' : missionIcons[category] ?? '★'}</div><div class="task-copy"><div class="task-type">${task.kind === 'chore' ? 'Chore' : taskLabels[task.id] ?? taskLabels.custom} · +${task.points} pts${task.required ? '' : ' · Optional'}</div><h3>${esc(taskName(task, p))}</h3><p>${esc(taskPrompt(task, p, week))}</p>${task.feedback ? `<p class="feedback"><strong>Feedback</strong> · ${esc(task.feedback)}</p>` : ''}</div><div class="task-actions">${pill(status(task), task.status === 'approved' ? 'green' : task.status === 'revision' ? 'amber' : '')}${button(week.closed || ['submitted','approved'].includes(task.status) ? 'View' : 'Open', 'task', `data-id="${esc(task.id)}"`, 'small')}</div></article>`;
  }).join('')}</div>
  ${p.solo && tally.ready && !week.closed ? `<div class="settle">${button('Settle the week', 'solo-settle', '', 'primary')}</div>` : ''}
  </section></div><aside class="aside">${goal(p, true)}<section class="panel route"><h2>Season map</h2><ol>${episodes.map((entry, index) => `<li class="${index === week.index ? 'current' : ''}"><span class="route-dot">${p.weeks[index]?.closed ? '✓' : index + 1}</span><span>${esc(moduleFor(p,index).title)}${index > week.index ? '<small>Locked</small>' : ''}</span></li>`).join('')}</ol></section>
  ${week.index > 0 && !week.closed ? `<section class="panel"><h2>${p.solo ? 'Last week’s note' : 'Last check-in'}</h2><p>${esc(p.weeks[week.index - 1].feedback)}</p></section>` : ''}</aside></div>`;
}
const typeNames = { sale: 'Sale', cost: 'Business expense', reward: 'Activity reward' };
function transactionTable(p, week) {
  if (!week.transactions.length) return '<p>No transactions recorded for this week.</p>';
  return `<div class="table-wrap" role="region" aria-label="Transactions table" tabindex="0"><table><thead><tr><th scope="col">Description</th><th scope="col">Type</th><th scope="col">Amount</th>${week.closed ? '' : '<th scope="col">Action</th>'}</tr></thead><tbody>${week.transactions.map(entry => {
    const attrs = `${playerAttrs(p)} data-id="${esc(entry.id)}"`;
    return `<tr><td>${esc(entry.label)}</td><td>${typeNames[entry.kind]}</td><td>${money(entry.cents)}</td>${week.closed ? '' : `<td>${entry.sim ? 'Scenario' : button('Edit', 'edit-entry', attrs, 'small') + button('Remove', 'remove-entry', attrs, 'small')}</td>`}</tr>`;
  }).join('')}</tbody></table></div>`;
}
function moneyView(p) {
  const week = p.weeks.find(w => w.index === ledgerWeek) ?? activeWeek(p), t = totals(week);
  return `${pageHeader('MY BUSINESS', 'Money log', 'See what came in, what went out and how profit is split.', week.closed ? '' : button('Add entry', 'add-entry', '', 'primary'))}
  <label class="inline-field">Week <select id="ledger-week">${p.weeks.map(w => `<option value="${w.index}" ${w === week ? 'selected' : ''}>${w.index + 1} · ${esc(moduleFor(p,w.index).title)}</option>`).join('')}</select></label>
  <section class="panel money-flow" aria-label="Money earned and spent">
    <div><span>Money in · Sales + activity rewards</span><strong>${money(t.sales + t.rewards)}</strong></div>
    <span aria-hidden="true">−</span><div><span>Money out · Business costs</span><strong>${money(t.costs)}</strong></div>
    <span aria-hidden="true">=</span><div><span>What’s left before simulated tax</span><strong>${money(t.profit + t.rewards)}</strong></div>
  </section>
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
  const closed = result.closed >= programmeLength;
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
  ${certificateShelf(p)}
  ${trendChart(p)}
  <div class="progress-layout spaced">${goal(p, true)}<div class="stats progress-stats"><article class="panel"><span>Weeks closed</span><strong>${result.closed}</strong></article><article class="panel"><span>Shop points earned</span><strong>${result.points}</strong><p class="detail">${result.points - result.awardPoints - result.challengePoints} from missions and weeks · ${result.awardPoints} from badges · ${result.challengePoints} from challenges</p></article></div></div>
  <section class="panel shop-callout"><div><h2>Make your profile yours</h2><p><strong>${wallet.balance} points available</strong> · ${wallet.spent} spent. Your badges stay in your collection.</p></div>${button('Open Profile shop', 'view', 'data-view="shop"', 'primary')}</section>
  ${awardShelf(p, result)}
  <div class="section-title spaced"><div><h2>Four buckets</h2><p>Total allocations from closed weeks. Save includes any simulated match.</p></div></div>
  ${bucketCards(result.buckets)}
  <section class="panel ledger spaced"><h2>${p.solo ? 'Business history' : 'Check-in history'}</h2>${p.weeks.some(w => w.closed) ? `<ul class="history">${p.weeks.filter(w => w.closed).map(w => {
    const tally = totals(w);
    return `<li><strong>Week ${w.index + 1} · ${esc(moduleFor(p,w.index).title)}</strong>${w.result ? `<p>${market[w.index % market.length].plans[w.choice].label} · ${w.result.tactic} · ${w.result.sold} sold</p>` : ''}<p>${money(tally.profit)} before simulated tax · ${money(tally.allocations[1] + tally.match)} added to Save</p><p>${esc(w.feedback)}</p></li>`;
  }).join('')}</ul>` : '<p>Your weekly notes will appear after you close your first week.</p>'}
  </section>`;
}
function avatar(p, compact = false) {
  const item = cosmetics(p).icon;
  return `<span class="arc-avatar ${item.symbol ? 'avatar-symbol' : ''} ${compact ? 'avatar-compact' : ''}" aria-hidden="true">${item.symbol}</span>`;
}
function identity(p) {
  return `<span class="learner-identity">${avatar(p, true)}<span><strong>${esc(p.name)}</strong><small>${cosmetics(p).title.name}</small></span></span>`;
}
function artwork(p) {
  return `style="--scene-image:url('${esc(assetUrl(cosmetics(p).background.image))}')"`;
}
function shopView(p) {
  const wallet = shopWallet(p), equipped = cosmetics(p);
  const target = shopItems.find(item => item.id === p.shop?.target && !wallet.owned.has(item.id));
  const card = item => {
    const owned = wallet.owned.has(item.id), wearing = equipped[item.kind].id === item.id;
    const attrs = `data-id="${item.id}"`;
    const preview = item.kind === 'background'
      ? `<span class="style-scene" style="background-image:url('${esc(assetUrl(item.image))}')" aria-hidden="true"></span>`
      : item.kind === 'icon'
        ? `<span class="arc-avatar ${item.symbol ? 'avatar-symbol' : ''}" aria-hidden="true">${item.symbol}</span>`
        : `<span class="style-title"><span aria-hidden="true">✦</span> ${item.name}</span>`;
    return `<li class="style-card">${preview}<div class="style-card-copy"><h3>${item.name}</h3><p>${item.description}</p>
      <div class="catalog-actions">${wearing ? pill('Equipped', 'green')
        : owned ? button('Equip', 'shop-equip', attrs + ` aria-label="Equip ${item.name}"`, 'small')
        : item.rewardOnly ? pill(item.rewardOnly)
        : `${wallet.balance >= item.cost ? button('Buy · ' + item.cost + ' pts', 'shop-buy', attrs + ` aria-label="Buy ${item.name} for ${item.cost} points"`, 'primary small') : pill(item.cost + ' pts · ' + (item.cost - wallet.balance) + ' to go')}
        ${target?.id === item.id ? pill('Saving for this', 'green') : button('Save for this', 'shop-target', attrs + ` aria-label="Save for ${item.name}"`, 'small')}`}</div></div></li>`;
  };
  return `${pageHeader('PROFILE SHOP', 'Make it yours', 'Choose an icon, dashboard background or title. Spend points now or save up for something you want.')}
  <div class="style-overview">
    <section class="style-preview" ${artwork(p)} aria-label="Your equipped profile">${avatar(p)}<div><h2>${esc(p.name)}</h2><span class="style-title">✦ ${equipped.title.name}</span><p>${equipped.background.name}</p></div></section>
    <section class="panel points-wallet"><h2>Game points</h2><p class="wallet-balance"><strong>${wallet.balance}</strong> <span>available to spend</span></p>
    ${target ? `<p>Saving for <strong>${target.name}</strong> · ${Math.max(0,target.cost-wallet.balance)} pts to go</p><progress value="${Math.min(wallet.balance,target.cost)}" max="${target.cost}" aria-label="Points towards ${target.name}"></progress>${button('Clear goal', 'shop-target', '', 'quiet small')}` : `<p>Set a point goal with <strong>Save for this</strong>.</p>${button('See how I earn points','view','data-view="progress"','small')}`}</section>
  </div>
  ${[['icon','Profile icons'],['background','Dashboard backgrounds'],['title','Titles']].map(([kind,label])=>`<section class="style-catalog"><h2>${label}</h2><ul>${shopItems.filter(item=>item.kind===kind).map(card).join('')}</ul></section>`).join('')}`;
}
function shopPurchaseDialog(p, item) {
  const wallet = shopWallet(p);
  if (wallet.owned.has(item.id) || wallet.balance < item.cost) return;
  const remaining = wallet.balance - item.cost;
  const target = shopItems.find(other => other.id === p.shop?.target && other.id !== item.id);
  openDialog('Buy ' + item.name + '?', `<p>This costs <strong>${item.cost} game points</strong> and leaves you with <strong>${remaining} points</strong>.</p>
    ${target && remaining < target.cost ? `<p class="shop-tradeoff">You’ll need ${target.cost - remaining} more points for ${target.name}.</p>` : ''}
    ${form('shop-buy', '', 'Spend ' + item.cost + ' points', `${playerAttrs(p)} data-id="${item.id}"`)}`);
}

let chartMetric = 'xp';
let chartWeek;
function trendChart(p, showProgressLink = false) {
  const savings = chartMetric === 'saved', history = progressHistory(p);
  const selected = history.find(point => point.week === chartWeek) ?? history.at(-1);
  const step = savings ? 500 : 20;
  const max = Math.max(step, Math.ceil(Math.max(...history.map(point => point[chartMetric])) / step) * step);
  const format = amount => savings ? money(amount) : amount + ' XP';
  return `<section class="arc-trend" aria-label="Progress chart">
    <div class="trend-head"><div><h2>Progress over time</h2><p>${savings ? 'Money added to Save at check-ins' : 'Total Learning XP from missions, videos and quizzes'}</p></div>
    ${showProgressLink ? button('My progress →','view','data-view="progress"','small') : ''}</div>
    <div class="trend-tools"><div class="trend-tabs" aria-label="Chart metric">
      ${[['xp','Learning XP'],['saved','Savings']].map(([id,label])=>button(label,'chart-metric',`data-id="${id}" aria-pressed="${chartMetric===id}"`,'small')).join('')}
    </div><p><strong>${format(selected[chartMetric])}</strong> · Week ${selected.week}</p></div>
    <div class="trend-plot"><div class="trend-axis" aria-hidden="true"><span>${format(max)}</span><span>${savings ? '$0' : '0'}</span></div>
    <div class="trend-columns" style="--count:${history.length}">${history.map(point=>`<button type="button" class="trend-column" data-action="chart-week" data-index="${point.week}" aria-pressed="${selected.week===point.week}" aria-label="Week ${point.week}, ${format(point[chartMetric])}"><span class="trend-bar" style="--height:${112*point[chartMetric]/max}px"></span><small>${point.week}</small></button>`).join('')}</div></div>
  </section>`;
}

const levels = ['Money Explorer', 'Money Learner', 'Money Builder', 'Money Grower', 'Money Planner', 'Money Hero'];
const levelIcons = ['🧭', '💡', '🧰', '🌱', '🎯', '🏆'];
const levelGoals = ['Notice where money goes', 'Learn how money works', 'Build good money habits', 'Plan for the long term', 'Make thoughtful choices', 'Keep your goals in sight'];
const levelStep = 100;

function competitionNotice(p) {
  const open = (state.competitions ?? []).filter(c => !c.results && Object.hasOwn(c.start, p.id));
  if (!open.length) return '';
  return `<section class="arc-notice" aria-label="Class challenges">${open.map(c => {
    const points = competitionBoard(c, [p])[0].score;
    return `<article><strong>🏆 ${esc(c.title)}</strong><p>${esc(c.message)} · ${points} / ${c.target} ${competitionMetrics[c.metric]}${points >= c.target ? ' · Target reached!' : ''}</p></article>`;
  }).join('')}</section>`;
}
function journey(p, level) {
  return `<section class="arc-journey"><div class="arc-section-head"><div><span>12-WEEK PROGRAMME</span><h2>Your money journey</h2></div>${button('See all weeks', 'view', 'data-view="week"', 'small')}</div>
    <ol>${levels.map((name,i) => `<li class="journey-step level-${i} ${i === level ? 'here' : ''}" ${i === level ? 'aria-current="step"' : ''}><b>LEVEL ${i+1}</b><span class="journey-icon" aria-hidden="true">${levelIcons[i]}</span><strong>${name}</strong><small>${levelGoals[i]}</small></li>`).join('')}</ol>
    <div class="arc-week-grid" aria-label="Programme weeks">${episodes.map((episode,i) => `<span title="${i+1} · ${esc(episode.title)}" class="${p.weeks[i]?.closed ? 'done' : p.weeks[i] ? 'current' : ''}">${i+1}</span>`).join('')}</div></section>`;
}
function weeklyChallengeCard(p) {
  const week = activeWeek(p), scenario = challengeFor(week.index);
  return `<section class="panel play-card">
    <div class="play-emblem" aria-hidden="true">🎮</div>
    <div><div class="eyebrow">WEEK ${week.index + 1} CHALLENGE</div><h2>${scenario.title}</h2>
    <p>${week.weeklyCertificate ? 'Certificate earned. Play again or choose another activity.' : 'Play to earn a weekly certificate and ' + weeklyPoints + ' Shop points.'}</p></div>
    ${button((week.weeklyCertificate ? 'Replay ' : 'Start ') + scenario.title, 'weekly-play', '', 'primary')}
  </section>`;
}
const samVideoLibrary = 'https://www.successavenuemoney.com/library';
const samQuizLibrary = 'https://www.successavenuemoney.com/quizzes';
function samAssignment(module) {
  const direct = (url, library) => {
    if (!url || !isHttps(url)) return false;
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/$/, '') !== new URL(library).pathname;
  };
  // Keep the video and its quiz in the same assignment scope.
  const source = module.lessonUrl || module.quizUrl ? module : state;
  const video = direct(source.lessonUrl, samVideoLibrary) ? source.lessonUrl : samVideoLibrary;
  const quiz = direct(source.quizUrl, samQuizLibrary) ? source.quizUrl : samQuizLibrary;
  return { video, quiz, assigned: video !== samVideoLibrary && quiz !== samQuizLibrary };
}
function samLink(url, label) {
  return `<a class="button secondary sam-quiz-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only"> (opens in a new tab)</span> ↗</a>`;
}
function samLessonSteps(assignment) {
  return `<div class="action-row">
    ${samLink(assignment.video, assignment.video !== samVideoLibrary ? '1. Watch the SAM video' : '1. Open SAM video library')}
    ${samLink(assignment.quiz, assignment.quiz !== samQuizLibrary ? '2. Open the SAM quiz' : '2. Open SAM quiz library')}
  </div>`;
}
function challengesView(p) {
  const week = activeWeek(p);
  const past = p.weeks.slice(0, -1).reverse();
  const assignment = samAssignment(moduleFor(p, week.index));
  return `${pageHeader('CHALLENGE ARCADE', 'Challenges', 'Choose this week’s activity, open a teacher challenge, or play a practice game.')}
    ${weeklyChallengeCard(p)}
    <section class="panel spaced" aria-labelledby="sam-quiz-title">
      <h2 id="sam-quiz-title">Weekly video and quiz on Success Avenue Money</h2>
      <p>Sign in to SAM. Watch the video first, then take the quiz about that video.</p>
      ${samLessonSteps(assignment)}
      ${assignment.assigned ? '' : '<p>This week’s matching SAM video and quiz links haven’t both been assigned. You can try the labelled placeholders in the game.</p>'}
      <div class="action-row">${button(assignment.assigned ? 'Open weekly lesson' : 'Try the placeholder lesson', 'task', 'data-id="learning"', 'small')}</div>
    </section>
    ${learnerClassChallenges(p, true)}
    <section class="panel practice-market spaced"><div class="eyebrow">FREE PLAY</div><h2>Market Day practice</h2>
    <p>Try another stall plan with $40 in game money. Weekly certificates come from the weekly challenge above.</p>
    ${button('Play Market Day practice', 'practice-market')}</section>
    ${past.length ? `<section class="panel spaced"><h2>Earlier challenges</h2>
    <ul class="challenge-list">${past.map(w => `<li><div><strong>Week ${w.index + 1} · ${challengeFor(w.index).title}</strong>
      <p>${w.weeklyCertificate ? 'Certificate earned' : 'Available to catch up'}</p></div>
      ${button(w.weeklyCertificate ? 'Replay' : 'Play', 'weekly-play', `data-index="${w.index}" aria-label="Play week ${w.index + 1} challenge"`, 'small')}</li>`).join('')}</ul></section>` : ''}`;
}
function playScenario(index) { return index === 'practice' ? practiceMarket : challengeFor(Number(index)); }
function scenarioAttrs(index) { return `data-index="${index}"`; }
function marketBudgetText(plan) {
  return money(plan.cost * 100) + ' spent · ' + money(plan.buffer * 100) + ' kept in reserve';
}
function startScenario(index, previous) {
  const scenario = playScenario(index), attrs = scenarioAttrs(index);
  if (scenario.kind === 'market') {
    const stock = previous?.stock ?? 8, price = previous?.price ?? 4;
    const plan = runSchoolMarket(scenario, stock, price);
    openDialog('Market Day', `<p>${scenario.story}</p>
      <div class="market-game-art" aria-hidden="true"></div>
      <div class="game-money"><span>STARTING BUDGET</span><strong>${money(scenario.budget * 100)}</strong></div>
      ${form('school-market', `<p>Hire the stall for ${money(scenario.fee * 100)}. Stock costs ${money(scenario.unitCost * 100)} per drink. Choose how many to buy and what to charge.</p>
      <fieldset class="market-picker"><legend>Drinks to buy</legend><div>
        ${stockOptions.filter(q => scenario.fee + q * scenario.unitCost <= scenario.budget).map(q => `<label><input type="radio" name="stock" value="${q}" ${q === stock ? 'checked' : ''} required><span>${q}</span></label>`).join('')}
      </div></fieldset>
      <fieldset class="market-picker"><legend>Sale price per drink</legend><div>
        ${prices.map(v => `<label><input type="radio" name="price" value="${v}" ${v === price ? 'checked' : ''} required><span>${money(v * 100)}</span></label>`).join('')}
      </div></fieldset>
      <div class="plan-meter"><progress id="market-plan-meter" value="${plan.cost}" max="${scenario.budget}" aria-label="Budget used on stock and stall hire"></progress>
      <p class="game-buffer" id="market-buffer" role="status">${marketBudgetText(plan)}</p></div>
      ${previous ? `<p class="detail">Last try: ${previous.stock} drinks at ${money(previous.price * 100)} each · ${previous.covered ? money(previous.profit * 100) + ' after costs' : 'could not pay the surprise cost'}.</p>` : ''}`, 'Open the stall', attrs)}`);
    return;
  }
  openDialog(esc(scenario.title), `<p>${scenario.story}</p>${form('weekly-decisions',
    `<div class="quiz-questions">${scenario.questions.map((q,i) => `<fieldset><legend>${i+1}. ${q.prompt}</legend><div class="decision-options">
    ${q.answers.map((answer,n) => `<label class="radio"><input type="radio" name="q${i}" value="${n}" required> ${answer}</label>`).join('')}</div></fieldset>`).join('')}</div>`,
    'Check my choices', attrs)}`);
}
const marketStages = [
  { duration: 2200, title: 'Setting up the stall', message: 'Stock goes on the counter. The school fair is about to start.' },
  { duration: 2400, title: 'The weather turns', message: 'Rain starts falling. Time to see what your cash buffer can cover.' },
  { duration: 2200, title: 'Closing the books', message: 'The fair is winding down. How did your plan hold up?' }
];
function startMarketDay(attempt) {
  openDialog('Market Day is underway', `
    <div class="market-film" data-scene="0" aria-hidden="true">
      <div class="market-sky"><span>☀️</span><span>🌧️</span></div>
      <div class="market-showers"></div>
      <span class="market-runner">🧍</span><span class="market-second-runner">🧍</span>
      <span class="market-counting">🧮</span>
    </div>
    <div class="market-stage" role="status" aria-atomic="true"><strong id="market-stage-name">${marketStages[0].title}</strong>
      <p id="market-stage-message">${marketStages[0].message}</p></div>
    <progress id="market-stage-progress" max="${marketStages.length}" value="1" aria-label="Market Day stages"></progress>
    <div class="action-row">${button('Skip to results','market-reveal','','small')}</div>`);
  let phase = 0;
  function advance() {
    const scene = dialog.querySelector('.market-film');
    if (!dialog.open || !scene || marketAttempt !== attempt) return;
    phase++;
    if (phase === marketStages.length) { revealMarketDay(); return; }
    scene.dataset.scene = phase;
    $('#market-stage-name').textContent = marketStages[phase].title;
    $('#market-stage-message').textContent = marketStages[phase].message;
    $('#market-stage-progress').value = phase + 1;
    marketTimer = setTimeout(advance, marketStages[phase].duration);
  }
  marketTimer = setTimeout(advance, marketStages[phase].duration);
}
function revealMarketDay() {
  if (!marketAttempt || marketAttempt.revealed || !dialog.open) return;
  clearTimeout(marketTimer);
  const { index, result, previous } = marketAttempt;
  marketAttempt.revealed = true;
  showMarketResult(index,result,previous);
}
function resetMarketDay() {
  clearTimeout(marketTimer);
  marketAttempt = undefined;
}
function showMarketResult(index, result, previous) {
  const scenario = playScenario(index), attrs = scenarioAttrs(index);
  const review = result.passed ? form('market-reflect', `<fieldset><legend>What let you pay the surprise cost before opening?</legend>
    <div class="decision-options"><label class="radio"><input type="radio" name="reflection" value="sales" required> The sales I hoped to make later</label>
    <label class="radio"><input type="radio" name="reflection" value="buffer" required> The cash I kept aside after paying for stock and the stall</label>
    <label class="radio"><input type="radio" name="reflection" value="stock" required> The number of unsold drinks</label></div></fieldset>`,
    'Check my answer', attrs) : '';
  openDialog('Market Day results', `<p>Rain rolled in. Fewer people visited, and hiring cover to open the stall cost an extra <strong>${money(scenario.surprise * 100)}</strong> before the first sale.</p>
    ${result.covered ? `<dl class="ledger-totals market-score">${[['Initial costs', result.cost], ['Rain cover', scenario.surprise], ['Sales · ' + result.sold + ' drinks', result.sales], [result.profit < 0 ? 'Loss' : 'Profit', Math.abs(result.profit)], ['Cash left', result.cash]].map(([name,v]) => `<div><dt>${name}</dt><dd>${money(v * 100)}</dd></div>`).join('')}</dl>
    <p>${result.passed ? 'You covered all your costs and ended with more cash than you started with.' : 'Your buffer paid for the cover, but sales didn’t leave a profit. Change your stock or price and see what happens.'}</p>`
    : `<p>You had ${money(result.buffer * 100)} left after buying stock and hiring the stall. You were ${money((scenario.surprise - result.buffer) * 100)} short and couldn’t open. Try keeping more cash aside.</p>`}
    ${previous ? `<p class="feedback"><strong>Compared with your last plan:</strong> ${previous.covered
      ? 'It finished with ' + money(previous.cash * 100) + ' in cash.'
      : 'You couldn’t open the stall.'}</p>` : ''}
    ${review}<div class="action-row">${button('Revise my plan', 'market-retry', attrs, 'small')}</div>`);
}
function nextCertificateReward(count) {
  const milestone = weeklyAvatarRewards.find(reward => reward.count > count);
  if (!milestone) return 'All weekly avatar rewards unlocked.';
  const remaining = milestone.count - count;
  return 'Next unlock: ' + shopItems.find(item => item.id === milestone.item).name + ' · ' + remaining + ' certificate' + (remaining === 1 ? '' : 's') + ' to go';
}
function certificateShelf(p) {
  const weekly = weeklyCertificates(p).map(w => `<li><div><strong>Week ${w.index + 1} · ${challengeFor(w.index).title}</strong><p>Weekly challenge certificate</p></div>${button('View certificate','show-certificate',scenarioAttrs(w.index),'small')}</li>`);
  const custom = (state.classChallenges ?? []).filter(c => c.certificate && c.learners.includes(p.id) && c.entries[p.id]?.status === 'approved')
    .map(c => `<li><div><strong>${esc(c.title)}</strong><p>Teacher challenge certificate</p></div>${button('View certificate','show-certificate',`data-id="${c.id}"`,'small')}</li>`);
  return `<section class="panel spaced"><div class="section-title"><div><h2>Certificates</h2>
    <p>${weekly.length} weekly certificates earned</p>
    <p class="reward-next">${nextCertificateReward(weekly.length)}</p></div>${button('Play challenges','view','data-view="challenges"','small')}</div>
    ${weekly.length || custom.length ? `<ul class="challenge-list">${weekly.concat(custom).join('')}</ul>` : '<p>Finish a weekly challenge to earn your first certificate.</p>'}</section>`;
}
function showCertificate(p, title, detail) {
  openDialog('Challenge certificate', `<article class="certificate-sheet"><div aria-hidden="true">🏅</div>
    <p class="certificate-label">THE LUCAS MONEY GAME</p><h3>Certificate of Achievement</h3>
    <p>Presented to</p><strong class="certificate-name">${esc(p.name)}</strong>
    <p>for completing <strong>${esc(title)}</strong></p><p>${esc(detail)}</p>
  </article><div class="action-row">${button('Print certificate','print-certificate')}</div>`);
}
function learnerClassChallenges(p, showClosed = false) {
  const challenges = (state.classChallenges ?? []).filter(c => c.learners.includes(p.id) && (showClosed || !c.closed));
  if (!challenges.length) return '';
  return `<section class="panel spaced"><h2>Teacher challenges</h2><ul class="challenge-list">${challenges.map(c => {
    const entry = c.entries[p.id], finished = entry?.status === 'approved';
    const status = finished ? 'Approved' : c.closed ? 'Closed' : entry?.status === 'pending' ? 'Awaiting review' : entry?.status === 'revise' ? 'Try again' : 'Ready to play';
    const gift = shopItems.find(item => item.id === c.avatar);
    const unlocked = classroomUnlocked(c, p.id);
    const delivered = c.classTarget ? c.delivered : entry?.delivered;
    return `<li><div><h3>${esc(c.title)}</h3><p>${esc(c.brief)}</p>
      ${c.classTarget ? `<p>Class goal: ${approvedCount(c)} / ${c.classTarget} approved</p>` : ''}
      ${c.certificate || gift ? `<p>${finished ? 'Earned: ' : 'On approval: '}${[c.certificate ? 'certificate' : '', gift?.name].filter(Boolean).join(' · ')}</p>` : ''}
      ${c.realReward ? `<p>${delivered ? 'Reward delivered' : unlocked ? 'Reward unlocked' : 'Reward to work towards'}: <strong>${esc(c.realReward)}</strong></p>` : ''}
      ${entry?.feedback ? `<p class="feedback"><strong>Teacher feedback</strong> · ${esc(entry.feedback)}</p>` : ''}
    </div><div class="task-actions">${pill(status, finished ? 'green' : '')}
    ${!c.closed && (!entry || entry.status === 'revise') ? button(entry ? 'Resubmit' : 'Open challenge','class-work',`data-id="${c.id}"`,'small') : ''}
    ${finished && c.certificate ? button('View certificate','show-certificate',`data-id="${c.id}"`,'small') : ''}</div></li>`;
  }).join('')}</ul></section>`;
}
function teacherChallengesView() {
  const roster = state.players;
  return `${pageHeader('CLASSROOM', 'Challenges & rewards', 'Set a challenge, review learners’ work, and keep track of rewards.',
    roster.length ? button('Create teacher challenge','new-class-challenge','','primary') : '')}
    <section class="panel"><h2>Weekly certificates</h2>
    ${roster.length ? `<ul class="challenge-list">${roster.map(p => `<li><strong>${esc(p.name)}</strong>
      <span>${weeklyCertificates(p).length} earned</span></li>`).join('')}</ul>` : '<p>Add learners from the Group dashboard to start.</p>'}</section>
    ${(state.classChallenges ?? []).map(c => `<section class="panel spaced"><div class="section-title"><div>
      <h2>${esc(c.title)}</h2><p>${esc(c.brief)}</p></div>${pill(c.closed ? 'Closed' : 'Open', c.closed ? '' : 'green')}</div>
      ${c.realReward ? `<p>Classroom reward: <strong>${esc(c.realReward)}</strong></p>` : ''}
      ${c.classTarget ? `<p>Class goal: ${approvedCount(c)} / ${c.classTarget} approved. ${c.delivered ? 'Reward delivered.' : ''}</p>
        ${(c.realReward && !c.delivered && approvedCount(c) >= c.classTarget) ? button('Mark class reward delivered','class-delivered',`data-id="${c.id}"`,'small') : ''}` : ''}
      <ul class="challenge-list">${roster.filter(p => c.learners.includes(p.id)).map(p => {
        const entry = c.entries[p.id], attrs = `data-id="${c.id}" ${playerAttrs(p)}`;
        const status = {pending:'Awaiting review', approved:'Approved', revise:'Needs revision'}[entry?.status] ?? 'To do';
        return `<li><div><strong>${esc(p.name)}</strong><p>${status}${entry?.delivered ? ' · Reward delivered' : ''}</p>
          ${entry?.status === 'approved' ? `<p class="challenge-work">${esc(entry.work)}</p>` : ''}</div>
          <div class="action-row">${entry?.status === 'pending' && !c.closed ? button('Review submission','class-review',attrs,'small') : ''}
          ${c.realReward && !c.classTarget && entry?.status === 'approved' && !entry.delivered ? button('Mark reward delivered','class-delivered',attrs,'small') : ''}</div></li>`;
      }).join('')}</ul>
      ${c.closed ? '' : button('Close challenge','close-class-challenge',`data-id="${c.id}"`,'small')}
    </section>`).join('')}`;
}
function createClassChallengeDialog() {
  const roster = state.players;
  const rewardItems = shopItems.filter(item => item.id === 'teacher-star' || (item.kind !== 'background' && item.cost > 0));
  openDialog('Create teacher challenge', form('create-class-challenge',
    textField('Challenge name','title','For example, Plan a school fair stall.','',60)
    + noteField('What should learners do and submit?','brief','Explain what to do and how they can show you what they learnt.')
    + field('Assign to','recipient','Choose an individual learner or everyone currently in this group.',`<select name="recipient"><option value="all">All learners</option>${roster.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>`)
    + '<label class="radio"><input type="checkbox" name="certificate" checked> Award a printable certificate on approval</label>'
    + field('Avatar reward','avatar','Optional. Each approved learner receives this in the Profile Shop.',`<select name="avatar"><option value="">None</option>${rewardItems.map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</select>`)
    + textField('Classroom reward (optional)','realReward','For example, Class lunch. You organise and deliver it.','',80,false)
    + field('Class target (optional)','classTarget','For a shared reward, enter how many learners must be approved. Leave blank for individual rewards.',`<input type="number" name="classTarget" min="1" max="${roster.length}" step="1">`),
    'Publish challenge'));
}

function finishScenario(p, index, feedback) {
  const before = weeklyCertificates(p).length;
  const earned = index !== 'practice' && completeWeeklyChallenge(p, Number(index));
  const unlock = earned && weeklyAvatarRewards.find(r => r.count === before + 1);
  resetMarketDay();
  save();
  openDialog(earned ? 'Weekly certificate earned!' : 'Challenge complete!', `<p>${feedback}</p>
    ${earned ? `<p><strong>+ ${weeklyPoints} Shop points</strong>${unlock ? ' · Profile reward unlocked: ' + shopItems.find(item => item.id === unlock.item).name : ''}</p>
      <div class="action-row">${button('View certificate','show-certificate',scenarioAttrs(index),'primary')}${unlock ? button('Equip reward','equip-challenge-reward',`data-id="${unlock.item}"`) : ''}</div>`
      : `<p>${index === 'practice' ? 'Try the weekly challenge to earn a certificate.' : 'Your certificate is already in My progress.'}</p>`}`);
}
function questTrail(p) {
  const week = activeWeek(p);
  const required = week.tasks.filter(task => task.required);
  const complete = required.filter(task => task.status === 'approved').length;
  const next = required.find(task => ['todo','revision'].includes(task.status));
  const steps = [
    ['🎮', 'Play the weekly challenge', week.weeklyCertificate ? 'Certificate earned' : 'Optional · earns a certificate', week.weeklyCertificate,
      button('Open Challenges','open-weekly-challenges','','small')],
    ['⚡', 'Finish your missions', complete + ' of ' + required.length + ' approved', complete === required.length,
      next ? button('Open next mission','task',`data-id="${esc(next.id)}"`,'small') : ''],
    ['🚩', 'Unlock the next week', week.closed ? 'Week complete' : complete < required.length
      ? 'Finish the required missions first' : p.solo ? 'Ready to close this week' : 'Ready for an adult check-in', week.closed,
      p.solo && complete === required.length && !week.closed ? button('Settle the week','solo-settle','','small') : '']
  ];
  return `<section class="panel quest-trail"><h2>Week ${week.index + 1} quest trail</h2><ol>
    ${steps.map(([icon,label,note,done,action]) => `<li class="${done?'step-done':''}"><span class="quest-symbol" aria-hidden="true">${done?'✓':icon}</span>
      <div><strong>${label}</strong><p>${note}</p></div>${action}</li>`).join('')}
    </ol></section>`;
}
function dashboardView(p) {
  const w = activeWeek(p), info = moduleFor(p, w.index), lesson = w.tasks.find(t => t.id === 'learning');
  const stats = learningStats(p), week = learningStats(p, [w]);
  const level = Math.min(5, Math.floor(stats.xp / levelStep));
  const levelProgress = level === 5 ? 100 : stats.xp % levelStep;
  const approved = w.tasks.filter(t => t.required && t.status === 'approved').length;
  const required = w.tasks.filter(t => t.required).length;
  const closed = progress(p).closed;
  const samAssigned = samAssignment(info).assigned;
  const quizDone = w.quizPassed || ['approved','submitted'].includes(lesson.status);
  const openChallenges = button('Play this week’s challenge', 'open-weekly-challenges', '', w.closed ? 'secondary' : 'primary');
  const next = w.closed ? button('Keep playing', 'continue-programme', '', 'primary')
    : quizDone ? button('See this week’s missions','view','data-view="week"')
    : button(samAssigned ? 'Open SAM video and quiz' : 'Open placeholder lesson','task','data-id="learning"');
  return `<div class="arc-dashboard">
    <div class="arc-grid">
      <aside class="arc-profile">${button(avatar(p), 'view', 'data-view="shop" aria-label="Customise my profile"', 'avatar-button')}<strong>${esc(p.name)}</strong><span class="profile-title">${cosmetics(p).title.name}</span><p>${esc(p.business)}</p>
      <div class="arc-level">LEVEL ${level+1}<br><span>${levels[level]}</span></div>
      <dl><div><dt>✦ Learning XP</dt><dd>${stats.xp}</dd></div><div><dt>◉ Shop points</dt><dd>${shopWallet(p).balance}</dd></div><div><dt>✓ Weeks closed</dt><dd>${closed}</dd></div></dl>
      </aside>
      <section class="arc-main"><div class="arc-hero" ${artwork(p)}>
        <div class="arc-hero-copy"><span class="arc-tag">${w.index >= programmeLength ? 'KEEP GOING' : 'WEEK ' + (w.index+1) + ' / 12'}</span>
          <div class="hero-mobile-identity">${identity(p)}</div><h1>${w.closed ? '12 weeks complete!' : 'Ready, ' + esc(p.name) + '?'}</h1><p>${esc(info.title)}${p.track === 0 ? ' · Play with a grown-up' : ''}</p>
          <div class="hero-choices">${w.closed ? next + openChallenges : openChallenges + next}</div>
        </div></div>
        <div class="arc-missions"><div class="arc-section-head"><div><span>YOUR NEXT MOVE</span><h2>This week’s missions</h2></div>${pill(approved + ' / ' + required + ' approved', 'green')}</div>
        <div class="arc-actions">
          ${button(`<span aria-hidden="true">${missionIcons.chore}</span>` + '<strong>I did a chore</strong><small>Log a job you finished</small>', 'log-chore', w.closed ? 'disabled' : '', 'mission-action mission-chore')}
          ${button(`<span aria-hidden="true">${missionIcons.business}</span>` + '<strong>Mini business</strong><small>Open your business mission</small>', 'task', 'data-id="business"', 'mission-action mission-business')}
          ${button(`<span aria-hidden="true">${missionIcons.learning}</span>` + '<strong>Video &amp; quiz</strong><small>' + (lesson.status === 'submitted' ? 'Awaiting review' : quizDone ? 'Quiz complete' : samAssigned ? 'Watch on SAM, then take the quiz' : 'Placeholder video and quiz') + '</small>', 'task', 'data-id="learning"', 'mission-action mission-learning')}
          ${button(`<span aria-hidden="true">${missionIcons.reflection}</span>` + '<strong>Money habit</strong><small>Try it in real life</small>', 'task', 'data-id="reflection"', 'mission-action mission-reflection')}
        </div></div>
      </section>
      <aside class="arc-side"><section class="arc-card"><span>YOUR PROGRESS</span><h2>${button(level === 5 ? 'Top level reached' : 'Next level', 'view', 'data-view="progress" aria-label="Your progress"', 'card-link')}</h2><progress max="100" value="${levelProgress}" aria-label="Learning XP to next level"></progress><p>${level === 5 ? 'Keep practising your money habits.' : (levelStep - levelProgress) + ' XP to Level ' + (level+2)}</p></section>
      <section class="arc-card arc-gold"><span>MY BIG GOAL</span><h2>${button(esc(p.goal), 'view', 'data-view="progress" aria-label="My big goal and savings progress"', 'card-link')}</h2><progress max="100" value="${pct(p)}" aria-label="Savings goal progress"></progress><p>${pct(p)}% of goal · ${closed} ${closed === 1 ? 'week' : 'weeks'} checked in</p></section>
      <section class="arc-card arc-chart"><span>LEARNING THIS WEEK</span><h2>${button(week.xp + ' XP earned', 'view', 'data-view="week" aria-label="See this week’s learning"', 'card-link')}</h2><dl>${[['Missions',week.missions,w.tasks.filter(t=>t.id!=='learning' && t.kind!=='chore').length + Number(w.tasks.some(t=>t.kind==='chore'))],['Videos',week.videos,1],['Quizzes',week.quizzes,1]].map(([label,n,max])=>`<div><dt>${label}</dt><dd><progress aria-label="${label} completed this week" max="${Math.max(1,max)}" value="${n}"></progress><b>${n}</b></dd></div>`).join('')}</dl></section></aside>
    </div>
    ${questTrail(p)}
    ${learnerClassChallenges(p)}
    ${trendChart(p, true)}
    ${competitionNotice(p)}
    ${journey(p,level)}
  </div>`;
}
const bucketAdventures = [
  { id:'spend', purpose:'Pay for things you need or want now.', prompt:'You have $10. The bus home costs $4 and a snack costs $7. What could you do?',
    answers:['Buy the snack first','Set aside the bus fare'], correct:1,
    explain:'Keep $4 for the bus first. That leaves $6 to spend or keep.' },
  { id:'save', purpose:'Put money aside for a goal you can name.', prompt:'You want $45 for sports gear in five weeks. How much can you put aside each week to get there?',
    answers:['$5 each week','$9 each week'], correct:1,
    explain:'Five lots of $9 add up to $45.' },
  { id:'invest', purpose:'Set money aside for longer-term growth. Its value can rise or fall.', prompt:'A $20 pretend investment rises to $23, then falls to $18. Where did you finish?',
    answers:['$2 below the start','$2 above the start'], correct:0,
    explain:'Compare $18 with the original $20, even though the value was higher earlier.' },
  { id:'give', purpose:'Use some money to help people or causes you care about.', prompt:'You have $5 in Give. The school art drive asks for supplies. Which plan uses your Give bucket?',
    answers:['Buy $7 of supplies','Choose supplies that cost $5'], correct:1,
    explain:'You can support the art drive and stay within the $5 you set aside.' }
];

function bucketLesson(p, name, description, index) {
  const current = activeWeek(p).index % programmeLength === index;
  return `<div><strong>${name}</strong><p>${description}</p>
    ${current ? button('Open this week’s lesson','task','data-id="learning"','small') : `<small>Week ${index+1}</small>`}
  </div>`;
}

function investmentsView(p) {
  const result = progress(p);
  return `<header class="bucket-page-heading">
    <div><h1>My money buckets</h1><p>Four jobs for your money. Pick a bucket and see what you could do with it.</p></div>
    <p class="bucket-total"><span>Total across your buckets</span><strong>${money(result.buckets.reduce((sum, value) => sum + value, 0))}</strong></p>
  </header>
  <div class="bucket-board">${bucketAdventures.map((adventure, index) => `<section class="bucket-adventure bucket-art-${adventure.id}" aria-labelledby="bucket-heading-${adventure.id}">
    <div class="bucket-picture">
      <span class="bucket-amount"><span class="sr-only">Game balance </span>${money(result.buckets[index])}</span>
    </div>
    <div class="bucket-card-copy">
      <h2 id="bucket-heading-${adventure.id}">${buckets[index]}</h2>
      <p>${adventure.purpose}</p>
      <details class="bucket-decision">
        <summary>Play a quick decision</summary>
        <p>${adventure.prompt}</p>
        <div class="bucket-answers">${adventure.answers.map((answer, option) => button(answer,'bucket-answer',`data-id="${adventure.id}" data-index="${option}" aria-pressed="false"`,'small')).join('')}</div>
        <p class="bucket-feedback" role="status" aria-atomic="true"></p>
      </details>
      ${adventure.id === 'save' ? `<details class="bucket-topic"><summary>Savings accounts</summary>
        ${bucketLesson(p, 'Saving for a goal', 'Choose your target, then work out what to put aside each week.',7)}
      </details>` : ''}
      ${adventure.id === 'invest' ? `<details class="bucket-topic"><summary>Shares, funds &amp; KiwiSaver</summary>
        ${bucketLesson(p, 'Shares and funds', 'Explore how a practice investment can go up and down.',8)}
        ${bucketLesson(p, 'KiwiSaver', 'Think about goals that are a long way off, such as saving for retirement.',9)}
      </details>` : ''}
    </div>
  </section>`).join('')}</div>
  <div class="bucket-page-footer"><p>Game balances update when you close a week. Practice decisions leave your balances as they are.</p>
    ${button('Open my Money log','view','data-view="money"','small')}</div>`;
}

function scoreboard(rows, metric) {
  return `<div class="table-wrap" role="region" aria-label="Leaderboard table" tabindex="0"><table><thead><tr><th scope="col">Rank</th><th scope="col">Learner</th><th scope="col">${metric}</th></tr></thead>
    <tbody>${rows.map(row => {
      const learner = state.players.find(p => p.id === row.id);
      return `<tr><td>${rows.findIndex(other => other.score === row.score) + 1}</td><td>${learner ? identity(learner) : esc(row.name)}</td><td><strong>${row.score}</strong></td></tr>`;
    }).join('') || '<tr><td colspan="3">Add learners to see the leaderboard.</td></tr>'}</tbody></table></div>`;
}
function classCompetitions() {
  const board = state.players.map(p=>({id:p.id,name:p.name,score:learningStats(p).xp})).sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
  return `<section class="panel list-section"><div class="section-title"><div><h2>Class leaderboard</h2><p>Ranked by completed learning activities.</p></div>
    ${state.players.length ? button('Create competition','new-competition','','primary') : ''}</div>${scoreboard(board,'Learning XP')}</section>
    ${(state.competitions ?? []).map(c=>`<section class="panel list-section"><div class="section-title"><div><h2>${esc(c.title)}</h2><p>${esc(c.message)} · Target: ${c.target} ${competitionMetrics[c.metric]}</p></div>
    ${c.results ? pill('Ended','green') : button('End competition','end-competition',`data-id="${c.id}"`,'small')}</div>${scoreboard(competitionBoard(c,state.players), competitionMetrics[c.metric])}</section>`).join('')}`;
}
function competitionDialog() {
  openDialog('Create a class competition', form('competition',
    textField('Competition name','competitionName','For example, Money Habit Week.') +
    noteField('Message for learners','competitionMessage','Explain the goal and when you plan to close the challenge.') +
    field('Scoring','metric','Only activity completed after the challenge starts counts.',`<select name="metric">${Object.entries(competitionMetrics).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select>`) +
    field('Target','competitionTarget','Each learner can aim for this score.', '<input name="competitionTarget" type="number" min="1" max="10000" required>'),
    'Start competition'));
}

function groupView() {
  if (isHomeGame()) return learnerDetail(player());
  const pending = state.players.flatMap(p => activeWeek(p).closed ? [] : activeWeek(p).tasks.filter(t => t.status === 'submitted').map(t => ({ p, t })));
  const ready = state.players.filter(p => !p.solo && !activeWeek(p).closed && totals(activeWeek(p)).ready);
  return `${pageHeader('FACILITATOR', esc(state.group), 'Assign activities, review submissions and close out each learner’s week.', button('Add learner', 'add-player', '', 'primary'))}
  ${state.players.length ? '' : `<section class="panel setup-panel"><h2>Add your first learner</h2><p>Give them a business or paid job and a savings goal. You can tailor their first week from their learner record.</p>${button('View setup instructions', 'view', 'data-view="setup"', 'small')}</section>`}
  <div class="stats">${[['Learners',state.players.length],['Awaiting review',pending.length],['Ready for check-in',ready.length],['Finished programme',state.players.filter(p => p.weeks[programmeLength - 1]?.closed).length]].map(([label,value]) => `<article class="panel"><span>${label}</span><strong>${value}</strong></article>`).join('')}</div>
  ${classCompetitions()}
  <section class="panel ledger"><div class="section-title"><h2>Review queue</h2>${state.players.some(p => !p.solo && !activeWeek(p).closed) ? button('Assign activity', 'assign') : ''}</div>
  ${pending.length ? `<ul class="review-list">${pending.map(({ p, t }) => `<li><div><strong>${esc(p.name)} · ${esc(taskName(t, p))}</strong><p>Week ${activeWeek(p).index + 1} · ${tracks[p.track]}</p></div>${button('Review', 'review', `data-player="${p.id}" data-id="${t.id}"`, 'small')}</li>`).join('')}</ul>` : '<p>New submissions will appear here.</p>'}</section>
  <section class="panel ledger spaced"><h2>Learners</h2><div class="table-wrap" role="region" aria-label="Learner roster" tabindex="0"><table><thead><tr><th scope="col">Learner</th><th scope="col">Current module</th><th scope="col">This week</th><th scope="col">Missions</th><th scope="col">Videos</th><th scope="col">Quizzes</th><th scope="col">XP</th><th scope="col">Action</th></tr></thead>
  <tbody>${state.players.map(p => {
    const w = activeWeek(p), stats = learningStats(p);
    const required = w.tasks.filter(task => task.required);
    const completed = required.filter(task => task.status === 'approved').length;
    const status = p.solo ? (w.closed ? 'Solo complete' : 'Solo practice') : w.closed ? 'Pilot complete' : totals(w).ready ? 'Ready for check-in' : w.tasks.some(t => t.status === 'submitted') ? 'Awaiting review' : w.tasks.some(t => t.status !== 'todo') || w.transactions.length ? 'In progress' : 'To start';
    return `<tr><td>${identity(p)}<div class="detail">${tracks[p.track]}</div></td><td><strong>Week ${w.index + 1}</strong><div class="detail">${esc(moduleFor(p,w.index).title)}</div></td><td>${pill(status, status === 'Ready for check-in' || w.closed ? 'green' : '')}<div class="detail">${completed} / ${required.length} required complete</div></td><td>${stats.missions}</td><td>${stats.videos}</td><td>${stats.quizzes}</td><td>${stats.xp}</td><td>${button('Open learner', 'learner-detail', `data-player="${p.id}"`, 'small')}${!p.solo && totals(w).ready && !w.closed ? button('Check in', 'close-week', `data-player="${p.id}"`, 'small') : ''}</td></tr>`;
  }).join('')}</tbody></table></div></section>
  <p class="detail">${workspace.active === 'test' ? 'Sample learners and activity for trying the teacher view.' : 'This class shares one browser. The facilitator PIN gates the teacher view on this device.'}</p>`;
}
function homeView() {
  const homeGames = workspace.groups.filter(({data}) => data.kind === 'home');
  const homeGame = homeGames.find(group => group.id === workspace.active) ?? homeGames[0];
  const classGame = assignedClass();
  const classLearner = classGame?.data.players.find(p => p.id === classGame.data.current);
  return `<section class="welcome">
    <div><div class="eyebrow">SUCCESS AVENUE MONEY</div><h1>The Lucas Money Game</h1>
      <p>Do chores. Take on a mini business. Build money habits that bring your big goal closer.</p>
      <div class="action-row">${button(workspace.sample ? 'Resume demo' : 'Play the demo', 'test-group', '', 'primary')}${button('Start at home', 'new-home')}${button('Start a class', 'new-group')}</div></div>
    <div class="welcome-route"><strong>Savings milestones</strong><div class="welcome-milestones">${savingsMilestones.map(percent => `<span>${percent}%</span>`).join('')}</div><p>Earn badges as you close in on your goal.</p></div>
  </section>
  <div class="welcome-grid">
    <section class="panel start-panel"><h2>Continue a saved game</h2>
      ${classLearner ? `<p>Class learner on this device · <strong>${esc(classLearner.name)}</strong></p>${button('Continue class game','resume-class','', 'primary')}` : ''}
      ${homeGame ? `<label for="home-group">Home game<select id="home-group">${homeGames.map(({id,data})=>`<option value="${esc(id)}" ${id===homeGame.id?'selected':''}>${esc(data.group)}</option>`).join('')}</select></label>
        <div class="action-row">${button('Continue home game','resume-home',`data-id="${esc(homeGame.id)}"`,'primary')}${button('Open parent view','resume-parent',`data-id="${esc(homeGame.id)}"`)}</div>` : ''}
      ${classGroups().length ? button('Open teacher dashboard','open-facilitator') : ''}
      ${workspace.sample ? button('Open demo teacher dashboard','open-demo-teacher','', 'small') : ''}
      ${!homeGame && !classGroups().length && !workspace.sample ? '<p>Saved games will appear here.</p>' : ''}
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
      </ol>${button('Start at home', 'new-home', '', 'primary')}
    </section>
    <section class="panel help-panel"><h2>Play with a group</h2>
      <ol class="setup-steps">
        <li>Create a group for your class, club or household with multiple learners.</li>
        <li>In <strong>Facilitator view</strong>, set the weekly money rules in Settings if needed, then use <strong>Add learner</strong> to set up each person.</li>
        <li>Open a learner record to review their work or choose <strong>Hand device to learner</strong> to open that learner’s dashboard.</li>
      </ol><div class="action-row">${button('Start a new group', 'new-group')}${button(workspace.sample ? 'Resume demo' : 'Play the demo', 'test-group')}</div>
    </section>
  </div><p class="detail spaced">Games and progress are saved in this browser. Learners and facilitators use the same saved game on this device.</p>`;
}

function aboutPanel() {
  return `<section class="panel help-panel">
    <h2>About Success Avenue Money</h2>
    <p>Success Avenue Money helps people learn practical money skills through stories, lessons and quizzes. The game gives learners a place to try those skills over 12 weeks, with more practice afterwards.</p>
    <p>Profiles and progress are stored in this browser. The game uses simulated tax and allocations.</p>
    <p><a href="https://www.successavenuemoney.com/about" target="_blank" rel="noopener noreferrer">Visit Success Avenue Money (new tab)</a></p>
  </section>`;
}
function publicHelpView() {
  return `${pageHeader('THE LUCAS MONEY GAME', 'About & Help', 'A 12-week business game for practising everyday decisions about earning, spending and saving.')}
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
      <p>Start with the quest trail on your dashboard. If you don’t have a real job or business, you can still play Challenges using game money.</p>
      <ol>
        <li><strong>Try it in real life.</strong> Agree on a job or product and what you’ll charge. Paid household jobs count. Add your actual earnings and costs to the Money log.</li>
        <li><strong>Complete your missions.</strong> Try the business mission, watch the video and take its matching quiz on SAM, then apply the same idea outside your business. Use the labelled placeholder lesson when the SAM pair is unavailable. Use the question-mark buttons for examples.</li>
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
    <section class="panel help-panel"><h2>Badges and profile rewards</h2>
      <p>In My progress, badges recognise milestones like completing a mission or saving a quarter of your goal. Visit Profile shop to unlock profile icons, backgrounds and titles. Your badges stay in your collection.</p>
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
  ${field('SAM video link (optional)', 'lessonUrl', 'Paste a direct SAM video link together with its matching quiz link.', `<input type="url" name="lessonUrl" value="${esc(state.lessonUrl)}" placeholder="https://">`)}
  ${field('SAM quiz link (optional)', 'quizUrl', 'Paste a direct Success Avenue Money quiz link for this class. Learner-specific links take priority.', `<input type="url" name="quizUrl" value="${esc(state.quizUrl)}" placeholder="https://">`)}
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
  $('#role').innerHTML = !isPublic && state && (role === 'learner' ? isHomeGame() : p)
    ? button(role === 'learner' ? facilitatorLabel() : 'Learner view', 'switch-role', '', 'role-switch') : '';
  const links = isPublic
    ? [['home','Home'], ['setup','Setup instructions'], ['public-help','About &amp; Help']]
    : role === 'learner'
      ? [['dashboard','Dashboard'], ['challenges','Challenges'], ['week','Missions'], ['money','Money log'], ['investments','Money buckets'], ['progress','My progress'], ['shop','Profile shop'], ['learner-help','About &amp; Help']]
      : [['home','Home'], ['group',dashboardLabel()], ['teacher-challenges','Challenges &amp; rewards'], ['settings','Settings'], ['facilitator-help','About &amp; Help']];
  $('#nav').innerHTML = links.map(([id,label]) => `<button type="button" data-action="view" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${label}</button>`).join('');
  const sections = { home: homeView, setup: setupView, 'public-help': publicHelpView, 'learner-help': learnerHelpView, 'facilitator-help': facilitatorHelpView, detail: learnerDetail, 'teacher-challenges':teacherChallengesView, challenges:challengesView, dashboard: dashboardView, investments: investmentsView, week: weekView, money: moneyView, progress: progressView, shop: shopView, group: groupView, settings: settingsView };
  document.body.dataset.role = role ?? 'public';
  document.body.dataset.skin = !isPublic && role === 'facilitator' ? 'staff' : p?.track === 0 ? 'junior' : p?.track === 2 ? 'teen' : 'arcade';
  const context = !isPublic && state ? `<p class="group-context">${workspace.active === 'test' ? 'Test group · Sample data' : esc(state.group)}</p>` : '';
  $('#main').innerHTML = '<p id="notice" class="toast" role="status" tabindex="-1" hidden></p>' + context + teacherGroupControls() + sections[view](view === 'detail' ? state.players.find(other => other.id === detailPlayerId) : p);
}

function closeDialog() { resetMarketDay(); dialog.close(); dialog.classList.remove('arc-quiz'); }
function wireLessonVideo(week) {
  const video = $('#lesson-film');
  let previous = video.currentTime;
  let segments = [];
  const measure = () => {
    if (!video.seeking) segments = trackVideoCoverage(segments, previous, video.currentTime, video.duration);
    previous = video.currentTime;
    if (week.videoWatched || !watchedEnough(segments, video.duration)) return;
    week.videoWatched = true;
    save();
    $('#lesson-status').textContent = 'Placeholder video complete. The placeholder quiz is ready.';
    dialog.querySelector('[data-action="lesson-quiz"]').disabled = false;
  };
  video.addEventListener('timeupdate', measure);
  video.addEventListener('ended', measure);
  video.addEventListener('seeked', () => { previous = video.currentTime; });
  video.addEventListener('error', () => {
    $('#lesson-status').textContent = 'This video couldn’t load. Reopen the lesson and try again.';
  });
}
dialog.addEventListener('close', () => { if (!dialog.open) { resetMarketDay(); dialog.classList.remove('arc-quiz'); } });
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
function taskDialog(p, week, task, showQuiz = false) {
  const episode = episodeFor(week.index);
  const module = moduleFor(p, week.index);
  const editable = !week.closed && ['todo', 'revision'].includes(task.status);
  let content = `<p>${esc(taskPrompt(task, p, week))}</p>`;
  if (task.feedback) content += `<p class="feedback"><strong>Feedback</strong> · ${esc(task.feedback)}</p>`;
  if (task.id === 'learning') {
    const assignment = samAssignment(module);
    if (assignment.assigned) {
      content += `<div class="lesson"><h3>Success Avenue Money</h3><p>Sign in to SAM. Watch the assigned video, then take the quiz about it.</p>
        ${samLessonSteps(assignment)}${module.lessonNote ? `<p>${esc(module.lessonNote)}</p>` : ''}</div>`;
      if (editable) content += form('sam-lesson-record',
        '<p>After finishing both on SAM, tell us one thing you learnt from the video or quiz.</p>' +
        noteField('What did you learn?', 'evidence', 'Write one or two sentences about what you learnt.'),
        p.solo ? 'Record SAM lesson' : 'Send SAM lesson for review');
    } else {
      const videoPath = 'assets/lessons/week-' + (episode.index+1) + '.mp4';
      content += `<div class="lesson video-lesson"><h3>Placeholder video and quiz</h3><p>This practice activity uses sample content. The official video and its quiz are on SAM.</p>
        ${button('Find SAM videos and quizzes','open-weekly-challenges','','small')}
        <p><strong>${esc(episode.title)}</strong></p>
        ${showQuiz ? '' : `<video id="lesson-film" controls playsinline preload="metadata" src="${videoPath}" aria-label="Placeholder video: ${esc(episode.title)}"></video><details><summary>Read the placeholder video transcript</summary>${episode.frames.map(frame=>`<p>${esc(frame)}</p>`).join('')}</details>`}
        ${module.lessonNote ? `<p><strong>Link to your business</strong> · ${esc(module.lessonNote)}</p>` : ''}</div>`;
      if (editable && showQuiz && week.videoWatched) {
        content += form('quiz', `<h3>Placeholder quiz</h3><div class="quiz-questions">${episode.questions.map((q,i)=>`<fieldset><legend>${i+1}. ${esc(q.question)}</legend>
          <div class="quiz-options">${q.options.map((answer,j)=>`<label><input type="radio" name="answer-${i}" value="${j}" required><span>${String.fromCharCode(65+j)}</span>${esc(answer)}</label>`).join('')}</div></fieldset>`).join('')}</div>
          ${button('Rewatch placeholder video','task','data-id="learning"','small')}`, 'Check answers');
      } else if (editable) {
        content += `<p id="lesson-status" role="status">${week.videoWatched ? 'Placeholder video complete. The placeholder quiz is ready.' : 'Watch the placeholder video to unlock its example quiz.'}</p>
          ${button('Start placeholder quiz','lesson-quiz',week.videoWatched ? '' : 'disabled','primary')}`;
      }
    }
  } else if (editable) {
    if (task.id === 'business' && p.mode === 'sim' && week.choice === null) {
      content += `<p>Run market day before writing about your decision.</p>${button('Back to the market', 'dismiss', '', 'primary')}`;
    } else {
      content += form('task', noteField('Your response', 'evidence', task.id === 'business' ? 'Name the choice you made and explain one reason for it. Use a price, cost or sales figure if it helps explain your decision.' : task.id === 'reflection' ? 'One or two sentences are enough. Say what you noticed and what you would do next.' : 'Use the instructions above to describe what you did or share what you found.', task.evidence), p.solo ? 'Complete mission' : 'Submit for review', `data-id="${task.id}"`);
    }
  }
  if (!editable) content += task.evidence ? `<div class="lesson"><strong>Your submission</strong><p>${esc(task.evidence)}</p></div>` : `<p>${statuses[task.status]}</p>`;
  dialog.classList.toggle('arc-quiz', task.id === 'learning');
  openDialog(esc(taskName(task, p)), content);
  if (task.id === 'learning' && editable && !showQuiz && !week.videoWatched && $('#lesson-film')) wireLessonVideo(week);

}
function playerDialog(p, homeSetup = false) {
  openDialog(homeSetup ? 'Play at home' : p ? 'Edit learner profile' : 'Add learner', form(homeSetup ? 'new-home' : p ? 'edit-player' : 'add-player', `${homeSetup ? '<p>Set up one learner. A parent or caregiver can tailor missions, review work and run weekly check-ins.</p>' : ''}<div class="fields">
    ${textField('First name or nickname', 'name', 'This name appears on the learner and facilitator dashboards. A nickname is enough.', p?.name, 40)}${textField('Business name', 'business', 'Give your business or household service a name, such as Weekend Car Wash.', p?.business)}
    ${field('Age range', 'track', 'Choose the learner’s age range. This adjusts their dashboard and mission guidance.', `<select name="track">${tracks.map((label,index) => `<option value="${index}" ${index === (p?.track ?? 1) ? 'selected' : ''}>${label}</option>`).join('')}</select>`)}
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
      <div><dt>Progress</dt><dd>${result.closed} weeks closed · ${learningStats(p).xp} learning XP · ${result.points} points</dd></div>
      <div><dt>Profile shop</dt><dd>${wallet.balance} pts available · ${wallet.spent} spent · ${cosmetics(p).title.name}</dd></div>
      <div><dt>Badges</dt><dd>${earnedAwards(p).map(award => award.title).join(' · ') || 'None earned yet'}</dd></div>
    </dl>${button('Hand device to learner', 'switch-player', attrs, 'small')}</section>
    <section class="panel learner-buckets"><h2>Four buckets to date</h2><p>Closed weeks only. Save includes any simulated match.</p>${bucketCards(result.buckets)}</section>
  </div>
  <section class="panel spaced" aria-labelledby="module-overview-title">
    <div class="section-title detail-section"><div><h2 id="module-overview-title">Weekly record</h2><p>Review completed weeks or plan a future module for this learner.</p></div>
      <label class="inline-field">Week <select id="detail-week">${Array.from({length:Math.max(programmeLength,p.weeks.length)},(_,i) => `<option value="${i}" ${i === index ? 'selected' : ''}>Week ${i+1} · ${p.weeks[i]?.closed ? 'Closed' : p.weeks[i] ? 'Open' : 'Upcoming'}</option>`).join('')}</select></label></div>
    <div class="section-title detail-section"><div><h3>${esc(module.title)}</h3><p>${esc(module.summary)}</p></div>${week?.closed ? pill('Week closed', 'green') : button('Customise module', 'edit-module', indexAttrs, 'small')}</div>
    <dl class="learner-facts module-facts">
      <div><dt>In the business</dt><dd>${esc(module.business)}</dd></div>
      <div><dt>Outside the business</dt><dd>${esc(module.outside)}</dd></div>
      ${module.lessonNote ? `<div><dt>Lesson connection</dt><dd>${esc(module.lessonNote)}</dd></div>` : ''}
      ${module.lessonUrl ? `<div><dt>Lesson link</dt><dd><a href="${esc(module.lessonUrl)}" target="_blank" rel="noopener noreferrer">Open assigned lesson (new tab)</a></dd></div>` : ''}
      <div><dt>SAM video and quiz</dt><dd>${samLessonSteps(samAssignment(module))}</dd></div>
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
    ${week.result ? `<p><strong>Practice scenario</strong> · ${market[index % market.length].plans[week.choice].label} · ${week.result.tactic} · ${week.result.sold} sales, ${week.result.returning} returning customers</p>` : ''}
    ${transactionTable(p,week)}
    <h3 class="spaced">${week.closed ? 'Weekly bucket allocation' : 'Bucket preview'}</h3>${bucketCards(tally.allocations)}
  </section>` : '<p class="detail spaced">Missions and money entries appear here when this week opens.</p>'}`;
}
function isHttps(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
function moduleDialog(p, index) {
  const module = moduleFor(p, index);
  openDialog('Customise week ' + (index + 1), `<p>These changes apply to ${esc(p.name)}. Assign a SAM video and the quiz that goes with it. Submitted responses keep the instructions they answered.</p>
    ${form('edit-module', `${textField('Module title', 'moduleTitle', 'Name the focus in the learner’s own context, such as Price two lawn-mowing jobs.', module.title)}
      ${noteField('Weekly context', 'moduleContext', 'Explain how this week’s topic connects to their business or savings goal.', module.summary)}
      ${noteField('Business mission', 'businessMission', 'Give one useful thing to try or measure in their real business.', module.business)}
      ${noteField('Outside-business mission', 'outsideMission', 'Ask them to apply the same money idea to an everyday situation.', module.outside)}
      ${noteField('Lesson connection (optional)', 'lessonNote', 'Add a short example using the learner’s goal or business numbers.', module.lessonNote, false)}
      ${field('SAM video link (optional)', 'moduleLink', 'Paste the direct video link together with its matching quiz link.', `<input name="moduleLink" type="url" value="${esc(module.lessonUrl)}">`)}
      ${field('SAM quiz link (optional)', 'moduleQuiz', 'Paste the direct Success Avenue Money quiz link for this learner and week. It appears in Challenges and the lesson.', `<input name="moduleQuiz" type="url" value="${esc(module.quizUrl)}">`)}`, 'Save module', `${playerAttrs(p)} data-index="${index}"`)}`);
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
  const p = id && role === 'facilitator' ? state?.players.find(other => other.id === id) : player();
  const w = p && activeWeek(p), task = w?.tasks.find(t => t.id === item);
  const contest = state?.classChallenges?.find(c => c.id === item);
  switch (action) {
    case 'dismiss': closeDialog(); break;
    case 'view': closeDialog(); navigate(next); break;
    case 'open-weekly-challenges':
      if (role === 'learner' && p) {
        closeDialog();
        navigate('challenges');
      }
      break;
    case 'weekly-play':
    case 'practice-market':
      if (role !== 'learner' || !w) return;
      resetMarketDay();
      if (action === 'practice-market') startScenario('practice');
      else {
        const week = index === undefined ? w.index : Number(index);
        if (p.weeks[week]) startScenario(week);
      }
      break;
    case 'market-reveal':
      if (role === 'learner' && marketAttempt?.playerId === p?.id) revealMarketDay();
      break;
    case 'market-retry':
      if (role === 'learner' && marketAttempt?.revealed && marketAttempt.index === index && marketAttempt.playerId === p?.id) {
        startScenario(index, marketAttempt.result);
      }
      break;
    case 'show-certificate': {
      if (role !== 'learner' || !p) return;
      if (index !== undefined && p.weeks[Number(index)]?.weeklyCertificate) {
        const n = Number(index);
        showCertificate(p, challengeFor(n).title, 'Weekly challenge · Week ' + (n + 1));
      } else if (contest?.certificate && contest.learners.includes(p.id) && contest.entries[p.id]?.status === 'approved') {
        showCertificate(p, contest.title, 'Teacher challenge · ' + state.group);
      }
      break;
    }
    case 'print-certificate':
      if (role === 'learner' && dialog.querySelector('.certificate-sheet')) window.print();
      break;
    case 'new-class-challenge':
      if (role === 'facilitator' && state.players.length) createClassChallengeDialog();
      break;
    case 'class-work': {
      if (role !== 'learner' || !contest || contest.closed || !contest.learners.includes(p.id)) return;
      const entry = contest.entries[p.id];
      if (entry && entry.status !== 'revise') return;
      openDialog(esc(contest.title), `<p class="challenge-work">${esc(contest.brief)}</p>${form('class-work',
        noteField('Your answer or reflection','work','Write what you tried and what you learnt.',entry?.work), 'Send to teacher', `data-id="${contest.id}"`)}`);
      break;
    }
    case 'class-review': {
      if (role !== 'facilitator' || !contest || contest.closed || contest.entries[p?.id]?.status !== 'pending') return;
      openDialog('Review challenge submission', `<p><strong>${esc(p.name)} · ${esc(contest.title)}</strong></p><p class="lesson challenge-work">${esc(contest.entries[p.id].work)}</p>${form('class-review',
        '<label>Decision<select name="decision"><option value="approved">Approve and award rewards</option><option value="revise">Ask for changes</option></select></label>'
        + noteField('Feedback','feedback','Give a next step if you ask for changes.','',false), 'Save review', `data-id="${contest.id}" ${playerAttrs(p)}`)}`);
      break;
    }
    case 'class-delivered':
    case 'close-class-challenge': {
      if (role !== 'facilitator' || !contest) return;
      if (action === 'class-delivered' && contest.realReward) {
        const recipient = contest.classTarget ? 'the class' : p?.name;
        if (!recipient) return;
        openDialog('Mark reward delivered?', `<p>Confirm that ${esc(recipient)} received <strong>${esc(contest.realReward)}</strong>.</p>${form(action,'','Mark delivered',`data-id="${contest.id}" ${p ? playerAttrs(p) : ''}`)}`);
      }
      if (action === 'close-class-challenge' && !contest.closed) {
        openDialog('Close challenge?', `<p>New submissions and reviews will close. Earned certificates and rewards will stay available.</p>${form(action,'','Close challenge',`data-id="${contest.id}"`)}`);
      }
      break;
    }
    case 'equip-challenge-reward':
      if (role === 'learner' && p && weeklyAvatarRewards.some(r => r.item === item) && equipCosmetic(p,item)) {
        closeDialog();
        save(shopItems.find(reward => reward.id === item).name + ' equipped.');
      }
      break;
    case 'chart-week':
    case 'chart-metric': {
      if (role !== 'learner' || !['dashboard','progress'].includes(view)) return;
      if (action === 'chart-metric' && ['xp','saved'].includes(item)) chartMetric = item;
      if (action === 'chart-week') chartWeek = Number(index);
      render();
      $(`[data-action="${action}"][aria-pressed="true"]`)?.focus({preventScroll:true});
      break;
    }
    case 'shop-buy': {
      const upgrade = shopItems.find(entry => entry.id === item);
      if (role === 'learner' && view === 'shop' && p && upgrade) shopPurchaseDialog(p, upgrade);
      break;
    }
    case 'shop-equip':
      if (role === 'learner' && view === 'shop' && p && equipCosmetic(p, item)) save('Profile updated.');
      break;
    case 'shop-target':
      if (role === 'learner' && view === 'shop' && p && setShopTarget(p, item || null)) save(item ? 'Point goal saved.' : 'Point goal cleared.');
      break;
    
    case 'open-facilitator':
      if (publicRoutes.has(view) && classGroups().length) classAccessDialog();
      break;
    case 'open-demo-teacher':
      if (!publicRoutes.has(view) || !workspace.sample) return;
      selectGroup('test');
      openRole('facilitator');
      save();
      break;
    case 'resume-class': {
      const group = assignedClass();
      if (!publicRoutes.has(view) || !group) return;
      selectGroup(group.id);
      openRole('learner');
      save();
      break;
    }
    case 'resume-home':
    case 'resume-parent':
      if (!publicRoutes.has(view) || groupState(item)?.kind !== 'home') return;
      selectGroup(item);
      openRole(action === 'resume-home' ? 'learner' : 'facilitator');
      save();
      break;
    case 'new-home':
      if (publicRoutes.has(view)) playerDialog(undefined, true);
      break;
    case 'new-group':
      if (!publicRoutes.has(view) && !(role === 'facilitator' && !isHomeGame())) return;
      openDialog('Set up your class', form('new-group', textField('Group name', 'newGroupName', 'Use a name for your class, household or club.', '', 60) + pinField(), 'Create group'));
      break;
    case 'test-group':
      if (!workspace.sample) {
        workspace.sample = fresh();
        workspace.sample.players.forEach(p => grantAwards(p, { checkSavings: true }));
      }
      selectGroup('test');
      openRole('learner');
      save();
      break;
    case 'switch-role':
      if (role === 'facilitator' && !isHomeGame() && workspace.active !== 'test' && p) {
        state.current = p.id;
        workspace.classResume = workspace.active;
      }
      if (role === 'facilitator' || (role === 'learner' && isHomeGame())) openRole(role === 'learner' ? 'facilitator' : 'learner');
      save();
      break;
    case 'switch-player':
      if (role !== 'facilitator' || !p) return;
      state.current = p.id;
      if (!isHomeGame() && workspace.active !== 'test') workspace.classResume = workspace.active;
      closeDialog();
      openRole('learner');
      save();
      break;
    case 'edit-goal':
      if (role === 'learner' && p) openDialog('Edit savings goal', form('edit-goal',
        textField('Savings goal','goal','Name something you’d like to save for.',p.goal)
        + field('Goal amount (NZD)','target','Enter the total amount you need to save.',`<input type="number" name="target" min=".01" max="1000000" step=".01" value="${p.target/100}" required>`),'Save goal'));
      break;
    case 'edit-player': if (role === 'facilitator' && p) playerDialog(p); break;
    case 'add-player': if (role === 'facilitator' && state && !isHomeGame()) playerDialog(); break;
    case 'task': if (task) taskDialog(p, w, task); break;
    case 'lesson-quiz':
      if (role === 'learner' && w?.videoWatched) taskDialog(p, w, w.tasks.find(t=>t.id==='learning'), true);
      break;
    case 'log-chore':
      if (role === 'learner' && w && !w.closed) openDialog('I did a chore', form('chore',
        textField('What did you do?','choreTitle','For example, mowed the lawn or washed the car.') +
        noteField('What did you learn?','choreNote','Tell us one thing about your effort, time or planning.'),
        p.solo ? 'Log chore' : 'Send for review'));
      break;
    case 'bucket-answer': {
      if (role !== 'learner' || view !== 'investments') return;
      const adventure = bucketAdventures.find(bucket => bucket.id === item);
      const decision = el.closest('.bucket-decision');
      if (!adventure || !decision || !adventure.answers[Number(index)]) return;
      const correct = Number(index) === adventure.correct;
      for (const answer of decision.querySelectorAll('[data-action="bucket-answer"]')) {
        answer.setAttribute('aria-pressed', String(answer === el));
      }
      const feedback = decision.querySelector('.bucket-feedback');
      feedback.dataset.correct = String(correct);
      feedback.textContent = (correct ? 'Nice choice! ' : 'Try another choice. ') + adventure.explain;
      break;
    }
    case 'continue-programme':
      if (role === 'learner' && w?.closed && w.index === programmeLength - 1) {
        p.weeks.push(makeWeek(w.index+1,state.rules));
        save('Week 13 is open. Keep practising with a new example from your own life.');
      }
      break;
    case 'new-competition':
      if (role === 'facilitator' && !isHomeGame() && state.players.length) competitionDialog();
      break;
    case 'end-competition': {
      const contest = state?.competitions?.find(c=>c.id===item);
      if (role === 'facilitator' && contest && !contest.results) openDialog('End competition?', `<p>Final scores will stay on the teacher dashboard.</p>${form('end-competition','','End competition',`data-id="${contest.id}"`)}`);
      break;
    }
    case 'plan':
      if (p.mode === 'sim' && !w.closed && w.choice === null && market[w.index % market.length].plans[Number(index)]) {
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
      if (p.mode === 'sim' && !w.closed && w.choice === null && w.plan !== undefined && market[w.index % market.length].tactics[Number(index)]) {
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
        ${form('solo-settle', '', w.index === programmeLength - 1 ? 'Finish campaign' : 'Start next week')}`);
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
      if (role !== 'facilitator') return;
      openDialog('Assign activity', form('assign', `${isHomeGame() ? `<input type="hidden" name="recipient" value="${esc(p.id)}">` : field('Assign to', 'recipient', 'Choose one learner or assign to everyone with an open mentored week.', `<select name="recipient"><option value="all">All mentored learners with an open week</option>${state.players.filter(other => !other.solo && !activeWeek(other).closed).map(other => `<option value="${other.id}">${esc(other.name)} · Week ${activeWeek(other).index + 1}</option>`).join('')}</select>`)}
      ${textField('Activity title', 'title', 'Use a short title the learner can recognise, such as Compare two prices.')}${noteField('What should they do and submit?', 'prompt', 'Give one clear task and say what to return. For example, compare two prices and send one sentence explaining your choice.')}${field('Points', 'points', 'How many points should approval of this activity award?', `<input type="number" name="points" value="10" min="0" max="100" required>`)}
      <label class="radio"><input type="checkbox" name="required"> Required for check-in</label>`, 'Assign activity')); break;
    case 'review': if (role === 'facilitator' && task?.status === 'submitted' && !w.closed) reviewDialog(p, task); break;
    case 'learner-detail':
      if (role !== 'facilitator') return;
      detailPlayerId = p.id;
      detailWeek = w.index;
      navigate('detail');
      break;
    case 'edit-module':
      if (role === 'facilitator' && Number.isInteger(Number(index)) && Number(index) >= 0 && Number(index) < Math.max(programmeLength,p.weeks.length) && !p.weeks[Number(index)]?.closed) moduleDialog(p, Number(index));
      break;
    case 'edit-check-in': {
      const selected = p.weeks[Number(index)];
      if (role !== 'facilitator' || !selected?.closed || p.solo) return;
      openDialog('Edit check-in note', form('edit-check-in', noteField('Feedback and next step', 'feedback', 'Correct the note or clarify the next step for this learner.', selected.feedback), 'Save note', `${playerAttrs(p)} data-index="${index}"`));
      break;
    }
    case 'close-week':
      if (role === 'facilitator' && !p.solo && totals(w).ready && !w.closed) openDialog('Check in with ' + esc(p.name), `<p>All required activities are approved. Review the business result and agree on one next step.</p>
      ${w.tasks.some(t => !t.required && t.status === 'submitted') ? '<p>Optional submissions are still awaiting review. Review them before closing the week if you want them to count.</p>' : ''}
      <div class="lesson"><strong>Week ${w.index + 1}</strong><p>${money(totals(w).profit)} profit before simulated tax · ${money(totals(w).allocations[1])} allocated to Save</p></div>
      ${form('close-week', noteField('Feedback and next step', 'feedback', 'Summarise one thing the learner noticed and agree on one action to try next week.'), w.index === programmeLength - 1 ? 'Finish programme' : 'Close week and open next', `data-player="${p.id}"`)}`); break;
  }
});
document.addEventListener('change', event => {
  const marketForm = event.target.closest('[data-form="school-market"]');
  if (marketForm) {
    const data = new FormData(marketForm);
    const result = runSchoolMarket(playScenario(marketForm.dataset.index), Number(data.get('stock')), Number(data.get('price')));
    if (result) {
      $('#market-buffer').textContent = marketBudgetText(result);
      $('#market-plan-meter').value = result.cost;
    }
  }
  if (event.target.id === 'teacher-group' && role === 'facilitator' && !isHomeGame()) {
    const id = event.target.value;
    const group = classGroups().find(entry => entry.id === id);
    event.target.value = workspace.active;
    if (!group || id === workspace.active) return;
    if (unlockedClasses.has(id)) switchTeacherGroup(id);
    else openDialog('Switch class', `<p>Enter the facilitator PIN for <strong>${esc(group.data.group)}</strong>.</p>
      ${group.data.teacherPin ? '' : '<p class="detail">Set a PIN for this older class the first time you open it.</p>'}
      ${form('switch-class', pinField(), 'Switch class', `data-id="${esc(id)}"`)}`);
    return;
  }
  if (event.target.id === 'home-group') { selectGroup(event.target.value); save(); $('#home-group').focus(); }
  if (event.target.id === 'detail-week') { detailWeek = Number(event.target.value); render(); $('#detail-week').focus(); }
  if (event.target.id === 'ledger-week') { ledgerWeek = Number(event.target.value); render(); $('#ledger-week').focus(); }
});
document.addEventListener('submit', async event => {
  const el = event.target;
  if (!el.matches('[data-form], #settings')) return;
  event.preventDefault();
  const data = new FormData(el);
  const value = name => String(data.get(name) ?? '').trim();
  const fail = message => { el.querySelector('.error').textContent = message; };
  const p = el.dataset.player && role === 'facilitator' ? state?.players.find(other => other.id === el.dataset.player) : player();
  const w = p && activeWeek(p), task = w?.tasks.find(t => t.id === el.dataset.id);
  const finish = (message, unlocked) => { closeDialog(); save(message, unlocked); };
  const contest = state?.classChallenges?.find(c => c.id === el.dataset.id);
  switch (el.dataset.form ?? 'settings') {
    case 'weekly-decisions': {
      if (role !== 'learner' || !p?.weeks[Number(el.dataset.index)]) return;
      const n = Number(el.dataset.index), scenario = challengeFor(n);
      if (scenario.kind !== 'decision') return;
      const wrong = scenario.questions.findIndex((q,i) => value('q' + i) === '' || Number(value('q' + i)) !== q.correct);
      if (wrong !== -1) return fail('Try question ' + (wrong + 1) + ' again. ' + scenario.questions[wrong].explanation);
      finishScenario(p, n, scenario.questions.map(q => q.explanation).join(' '));
      break;
    }
    case 'school-market': {
      if (role !== 'learner' || !p) return;
      const index = el.dataset.index;
      if (index !== 'practice' && !p.weeks[Number(index)]) return;
      const scenario = playScenario(index);
      if (scenario.kind !== 'market') return;
      const result = runSchoolMarket(scenario, Number(value('stock')), Number(value('price')));
      if (!result) return fail('Choose stock and a price within your starting budget.');
      const previous = marketAttempt?.index === index && marketAttempt.playerId === p.id ? marketAttempt.result : undefined;
      clearTimeout(marketTimer);
      marketAttempt = { index, result, previous, playerId:p.id, revealed:false };
      startMarketDay(marketAttempt);
      break;
    }
    case 'market-reflect':
      if (role !== 'learner' || !p || !marketAttempt?.revealed || marketAttempt.playerId !== p.id || marketAttempt.index !== el.dataset.index || !marketAttempt.result.passed) return;
      if (value('reflection') !== 'buffer') return fail('Think about what you had available before customers paid. Try again.');
      finishScenario(p, el.dataset.index, 'Your cash buffer covered the surprise before any sales came in. You can play again to compare a different plan.');
      break;
    case 'create-class-challenge': {
      if (role !== 'facilitator') return;
      const title = value('title'), brief = value('brief'), classroomReward = value('realReward'), avatar = value('avatar');
      const classTarget = Number(value('classTarget')), recipient = value('recipient');
      const learners = state.players.filter(p => recipient === 'all' || recipient === p.id).map(p => p.id);
      if (!title || !brief || !learners.length) return fail('Enter a title, instructions and learners.');
      if (avatar && !shopItems.some(item => item.id === avatar && (item.id === 'teacher-star' || (item.kind !== 'background' && item.cost > 0)))) return fail('Choose a listed avatar reward.');
      if (value('classTarget') && (!classroomReward || recipient !== 'all' || !Number.isInteger(classTarget) || classTarget < 1 || classTarget > learners.length)) {
        return fail('A shared class target needs a classroom reward, All learners and a target within the group size.');
      }
      (state.classChallenges ??= []).unshift({ id:uid(), title, brief, learners, avatar, certificate:value('certificate') === 'on',
        realReward:classroomReward, classTarget, entries:{}, closed:false });
      finish('Challenge published. It will appear on the assigned learners’ dashboards.');
      break;
    }
    case 'class-work':
      if (role !== 'learner' || !p || !contest || !submitClassWork(contest,p.id,value('work'))) return fail('Enter your work or check whether the challenge still accepts submissions.');
      finish('Work sent to your teacher.');
      break;
    case 'class-review': {
      if (role !== 'facilitator' || !contest || !p) return;
      const decision = value('decision');
      if (!reviewClassWork(contest,p.id,decision,value('feedback'))) return fail('This work is no longer pending or needs feedback before it can be returned.');
      if (decision === 'approved' && contest.avatar) giftCosmetic(p,contest.avatar);
      finish(decision === 'approved' ? 'Work approved and rewards updated.' : 'Feedback sent for revision.');
      break;
    }
    case 'class-delivered':
      if (role !== 'facilitator' || !contest?.realReward) return;
      if (contest.classTarget) {
        if (approvedCount(contest) < contest.classTarget || contest.delivered) return;
        contest.delivered = true;
      } else {
        const entry = contest.entries[p?.id];
        if (entry?.status !== 'approved' || entry.delivered) return;
        entry.delivered = true;
      }
      finish('Reward marked delivered.');
      break;
    case 'close-class-challenge':
      if (role !== 'facilitator' || !contest || contest.closed) return;
      contest.closed = true;
      finish('Challenge closed.');
      break;
    case 'shop-buy': {
      if (role !== 'learner' || view !== 'shop' || !p || player()?.id !== p.id) return;
      const error = buyUpgrade(p, el.dataset.id);
      if (error) return fail(error);
      finish(shopItems.find(item => item.id === el.dataset.id).name + ' equipped on your profile.');
      break;
    }
    case 'new-group':
    case 'class-access':
    case 'switch-class': {
      const creating = el.dataset.form === 'new-group';
      const switching = el.dataset.form === 'switch-class';
      const fromTeacher = role === 'facilitator' && !isHomeGame();
      if (switching ? !fromTeacher : !(publicRoutes.has(view) || (creating && fromTeacher))) return;
      const startingRole = role, startingView = view, startingGroup = state;
      const name = value('newGroupName');
      if (creating && !name) return fail('Enter a group name.');
      if (!/^[0-9]{6,12}$/.test(value('pin'))) return fail('Enter a PIN with 6 to 12 digits.');
      const id = creating ? uid() : switching ? el.dataset.id : value('classId');
      const group = creating ? newGroup(name) : groupState(id);
      if (!creating && (!group || group.kind === 'home' || id === 'test')) return fail('Choose your class.');
      let digest;
      try { digest = await classPinDigest(id, value('pin')); }
      catch { return fail('Open the game over HTTPS or on localhost to use the teacher dashboard.'); }
      if (!el.isConnected || !dialog.open || role !== startingRole || view !== startingView || state !== startingGroup) return;
      if (group.teacherPin && group.teacherPin !== digest) return fail('That PIN does not match this class.');
      group.teacherPin = digest;
      unlockedClasses.add(id);
      if (switching) { switchTeacherGroup(id); break; }
      if (creating) workspace.groups.push({ id, data: group });
      selectGroup(id);
      openRole('facilitator');
      finish(creating ? 'Class created. Add a learner to get started.' : '');
      break;
    }
    case 'settings': {
      if (role !== 'facilitator') return;
      const split = data.getAll('split').map(Number);
      if (split.reduce((sum, n) => sum + n, 0) !== 100) return fail('Bucket percentages must add up to 100.');
      if (!value('group')) return fail(isHomeGame() ? 'Enter a home game name.' : 'Enter a group name.');
      const url = value('lessonUrl');
      if (url) {
        try { if (new URL(url).protocol !== 'https:') return fail('Enter a link starting with https://.'); }
        catch { return fail('Enter a valid SAM lesson link.'); }
      }
      const quizUrl = value('quizUrl');
      if (quizUrl && !isHttps(quizUrl)) return fail('Enter a SAM quiz link starting with https://.');
      state.group = value('group');
      state.lessonUrl = url;
      state.quizUrl = quizUrl;
      state.rules = { split, tax: Number(value('tax')), bonus: Number(value('bonus')), match: Number(value('match')), cap: Math.round(Number(value('cap')) * 100) };
      save('Settings saved. Money rules apply to newly opened weeks.');
      break;
    }
    case 'edit-goal': {
      if (role !== 'learner' || !p) return;
      const goal = value('goal'), target = Math.round(Number(value('target')) * 100);
      if (!goal || !Number.isSafeInteger(target) || target < 1 || target > 100000000) return fail('Enter a goal and a valid amount.');
      Object.assign(p, { goal, target });
      finish('Savings goal updated.');
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
        view = 'dashboard';
        finish('Home game ready. Open Parent / caregiver view to plan or review the week together.');
        break;
      }
      if (role !== 'facilitator') return;
      if (el.dataset.form === 'edit-player') {
        if (!p) return;
        Object.assign(p, fields);
      }
      else {
        if (!state || isHomeGame()) return;
        const learner = makePlayer({ ...fields, mode: value('mode'), solo: value('reviewMode') === 'solo' }, state.rules);
        state.players.push(learner);
      }
      finish(el.dataset.form === 'edit-player' ? 'Goal and business saved.' : 'Learner added.');
      break;
    }
    case 'sam-lesson-record': {
      const learning = w?.tasks.find(t => t.id === 'learning');
      if (role !== 'learner' || !learning || w.closed || !['todo','revision'].includes(learning.status)
        || !samAssignment(moduleFor(p,w.index)).assigned) return;
      if (!value('evidence')) return fail('Tell us one thing you learnt.');
      Object.assign(learning, { source:'sam', status:p.solo ? 'approved' : 'submitted',
        evidence:value('evidence'), feedback:'' });
      finish(p.solo ? 'SAM lesson recorded.' : 'SAM lesson sent for review.', grantAwards(p));
      break;
    }
    case 'quiz': {
      const learning = w?.tasks.find(t => t.id === 'learning');
      if (role !== 'learner' || !learning || !w.videoWatched || w.closed || !['todo', 'revision'].includes(learning.status) || samAssignment(moduleFor(p,w.index)).assigned) return;
      const episode = episodeFor(w.index);
      if (episode.questions.some((q,i) => value('answer-' + i) === '' || Number(value('answer-' + i)) !== q.answer)) return fail('One or more answers need another look. Replay the example or try again.');
      w.quizPassed = true;
      learning.status = p.solo ? 'approved' : 'submitted';
      learning.source = 'placeholder';
      learning.evidence = 'Completed the placeholder video and passed both placeholder questions.';
      finish(p.solo ? 'Placeholder quiz complete.' : 'Placeholder quiz passed · sent for check-in', grantAwards(p));
      break;
    }
    case 'chore': {
      if (role !== 'learner' || !w || w.closed) return;
      const title = value('choreTitle'), evidence = value('choreNote');
      if (!title || !evidence) return fail('Enter your chore and what you learnt.');
      w.tasks.push({ id: uid(), kind: 'chore', title, evidence, prompt:'Log what you did and what you learnt.', required:false, points:0, status:p.solo?'approved':'submitted', feedback:'' });
      finish(p.solo ? 'Chore logged.' : 'Chore sent for review.');
      break;
    }
    case 'competition': {
      if (role !== 'facilitator' || isHomeGame() || !state.players.length) return;
      const title = value('competitionName'), message = value('competitionMessage'), metric = value('metric'), target = Number(value('competitionTarget'));
      if (!title || !message || !Object.hasOwn(competitionMetrics,metric) || !Number.isInteger(target) || target<1 || target>10000) return fail('Enter a name, message, scoring type and valid target.');
      (state.competitions ??= []).unshift({ id:uid(), title, message, metric, target, start:Object.fromEntries(state.players.map(p=>[p.id,learningStats(p)[metric]])) });
      finish('Competition started. Learners in this class can see it on their dashboard.');
      break;
    }
    case 'end-competition': {
      const contest = state?.competitions?.find(c=>c.id===el.dataset.id);
      if (role !== 'facilitator' || !contest || contest.results) return;
      contest.results = competitionBoard(contest,state.players);
      finish('Competition ended. Final scores saved.');
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
      if (role !== 'facilitator' || !Number.isInteger(index) || index < 0 || index >= Math.max(programmeLength,p.weeks.length) || p.weeks[index]?.closed) return;
      const module = { title: value('moduleTitle'), summary: value('moduleContext'), business: value('businessMission'), outside: value('outsideMission'), lessonNote: value('lessonNote'), lessonUrl: value('moduleLink'), quizUrl: value('moduleQuiz') };
      if (!module.title || !module.summary || !module.business || !module.outside) return fail('Enter a title, context and both mission prompts.');
      if (module.lessonUrl) {
        try { if (new URL(module.lessonUrl).protocol !== 'https:') return fail('Enter a lesson link starting with https://.'); }
        catch { return fail('Enter a valid lesson link.'); }
      }
      if (module.quizUrl && !isHttps(module.quizUrl)) return fail('Enter a quiz link starting with https://.');
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
      if (role !== 'facilitator') return;
      const title = value('title'), prompt = value('prompt');
      if (!title || !prompt) return fail('Enter an activity title and instructions.');
      const eligible = state.players.filter(other => !other.solo && !activeWeek(other).closed && (value('recipient') === 'all' || value('recipient') === other.id));
      if (!eligible.length) return fail('No learners have an open week for this activity.');
      eligible.forEach(other => activeWeek(other).tasks.push({ id: uid(), title, prompt, points: Number(value('points')), required: data.has('required'), status: 'todo', evidence: '', feedback: '' }));
      finish(`Activity assigned to ${eligible.length} ${eligible.length === 1 ? 'learner' : 'learners'}.`); break;
    }
    case 'review':
      if (role !== 'facilitator') return;
      if (w.closed || task?.status !== 'submitted') return;
      if (value('decision') === 'revision' && !value('feedback')) return fail('Add feedback so the learner knows what to change.');
      Object.assign(task, { status: value('decision'), feedback: value('feedback') });
      finish('Review saved.', grantAwards(p)); break;
    case 'solo-settle':
    case 'close-week': {
      const solo = el.dataset.form === 'solo-settle';
      if (Boolean(p.solo) !== solo || role !== (solo ? 'learner' : 'facilitator')) return;
      if (w.closed || !totals(w).ready) return;
      if (!solo && !value('feedback')) return fail('Record feedback or an agreed next step.');
      w.feedback = solo ? w.tasks.find(t => t.id === 'reflection').evidence : value('feedback');
      w.module = moduleFor(p, w.index);
      w.closed = true;
      const unlocked = grantAwards(p, { checkSavings: true });
      if (view === 'detail' || (view === 'group' && isHomeGame())) detailWeek = w.index === programmeLength - 1 ? w.index : w.index + 1;
      if (w.index !== programmeLength - 1) {
        p.weeks.push(makeWeek(w.index + 1, state.rules));
        finish(`Week ${w.index + 1} closed. Week ${w.index + 2} is open.`, unlocked);
      } else finish('12 weeks complete! Open the learner dashboard to see your progress or keep playing.', unlocked);
      break;
    }
  }
});

render();

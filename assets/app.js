import { schoolQuizFor, gradeSchoolQuiz, quizPassMark } from './school-quizzes.js?v=3.8.5';
import { tracks, buckets, taskLabels, uid, makeWeek, makePlayer, fresh, totals, accounts, wealthBreakdown, transferMoney, transactionUpdateError, progress, market, marketResult, goodwill, moduleFor, newGroup, newHomeGame, awards, earnedAwards, grantAwards, savingsMilestones, shopItems, shopWallet, starterOptions, setStarterLook, giftCosmetic, buyUpgrade, equipCosmetic, cosmetics, progressHistory, setShopTarget, learningStats, competitionMetrics, competitionBoard, trackVideoCoverage, watchedEnough, taskPoints, recordSchoolQuiz, effectiveWeekSchedule, todayDate, validStartDate, weekStartDate, waitingForWeekOne, nextProgrammeWeek, startNextWeek } from './game.js?v=3.8.5';
import { episodes, episodeFor, programmeLength } from './curriculum.js?v=3.8.5';
import { weeklyPoints, weeklyAvatarRewards, challengeFor, practiceMarket, stockOptions, runSchoolMarket, weeklyCertificates,
  completeWeeklyChallenge, approvedCount, classroomUnlocked, submitClassWork, reviewClassWork } from './challenges.js?v=3.8.5';

import { languages, translate } from './locale.js?v=3.8.9';
import { vimeoPlayer } from './vimeo.js';
import { familyWeek, familyTitle, familyPrompt, familyCases, familyQuestions, ensureFamilyTask, readFamilyResponse, readFamilyScores } from './family.js?v=3.8.5';

const assetUrl = image => new URL('./assets/' + image, location.href).href;
const sitePath = location.pathname.replace(/index\.html$/, '');
const key = 'sam-lucas-workspace-v1:' + sitePath;
const formatters = Object.fromEntries(Object.keys(languages).map(key => [key, new Intl.NumberFormat(key, { style: 'currency', currency: 'NZD' })]));
const money = cents => formatters[language].format(cents / 100);
const tr = (text, values) => {
  const translated = translate(language,text);
  return values ? translated.replace(/\{(\w+)\}/g, (match,key) => values[key] ?? match) : translated;
};
function localMission(text) {
  const extra = ' Ask an adult to help if you need it.';
  return text?.endsWith(extra) ? tr(text.slice(0,-extra.length)) + ' ' + tr(extra.trim()) : tr(text);
}
const moduleTitle = (p, index) => tr(moduleFor(p, index).title);
const $ = selector => document.querySelector(selector);
const dialog = $('#dialog');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const missionIcons = { chore: '✓', business: '▦', learning: '▶', reflection: '✎', family: '🤝' };
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
let language = Object.hasOwn(languages, workspace.language) ? workspace.language : 'en-NZ';
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
let learnerSetup;
let familyTurn;
let week12Demo;
let marketAttempt;
let marketTimer;
const unlockedClasses = new Set();

if (workspace.sample) workspace.sample.showLearnerLeaderboard ??= true;
for (const group of [...workspace.groups.map(entry => entry.data), workspace.sample].filter(Boolean)) {
  for (const learner of group.players) {
    if (!group.ageBandsV2) learner.track = learner.track === 1 ? 2 : 1;
    for (const week of learner.weeks) {
      if (!week.closed) week.transfers ??= [];
      ensureFamilyTask(week);
    }
  }
  group.ageBandsV2 = true;
}
const player = () => state?.players.find(p => p.id === state.current) ?? state?.players[0];
const activeWeek = p => p.weeks.at(-1);
const weekSchedule = p => effectiveWeekSchedule(state, p);
const weekOneLocked = p => waitingForWeekOne(p, weekSchedule(p));
const weeklyViews = new Set(['dashboard', 'week', 'challenges', 'money', 'investments']);
const scheduleDate = date => new Intl.DateTimeFormat(language, {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
}).format(new Date(date + 'T00:00:00Z'));

function syncProgramme() {
  if (!role || !state) return false;
  const today = todayDate();
  let changed = false;
  for (const learner of state.players) {
    if (startNextWeek(learner, state.rules, weekSchedule(learner), 'scheduled', today)) changed = true;
  }
  const learner = role === 'learner' ? player() : undefined;
  const week = learner?.weeks[0];
  if (week && !week.started && !waitingForWeekOne(learner, weekSchedule(learner), today)) {
    week.started = true;
    changed = true;
  }
  return changed;
}

function nextWeekNote(p) {
  const index = nextProgrammeWeek(p);
  if (index === null) return '';
  const date = weekStartDate(weekSchedule(p), index);
  return date ? tr('Week {week} opens on {date}.', { week: index + 1, date: scheduleDate(date) })
    : tr('Week {week} is ready to start.', { week: index + 1 });
}

function startNextWeekButton(p, style = 'primary') {
  return nextProgrammeWeek(p) !== null && weekSchedule(p).mode === 'manual'
    ? button('Start next week', 'start-next-week', '', style) : '';
}
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
const button = (label, action, attrs = '', style = 'secondary') => `<button type="button" class="button ${style}" data-action="${action}" ${attrs}>${tr(label)}</button>`;
const playerAttrs = p => `data-player="${esc(p.id)}"`;
const pill = (label, tone = '') => `<span class="pill ${tone}">${tr(label)}</span>`;
function announce(message) { $('#live').textContent = tr(message); }
function save(message, unlocked = []) {
  syncProgramme();
  if (!week12Demo) {
    try { localStorage.setItem(key, JSON.stringify(workspace)); }
    catch { message = 'Browser storage is unavailable. Recent changes may be lost on reload.'; }
  }
  render();
  if (message || unlocked.length) {
    const toast = $('#notice');
    toast.textContent = [tr(message), ...unlocked.map(award => 'Badge unlocked: ' + award.title + ' (+' + award.points + ' pts).')].filter(Boolean).join(' ');
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
    if (week12Demo) {
      week12Demo = undefined;
      state = groupState(workspace.active);
    }
    role = null;
    unlockedClasses.clear();
    detailPlayerId = undefined;
    detailWeek = undefined;
    dialog.replaceChildren();
    announce('');
  }
  ledgerWeek = undefined;
  if (syncProgramme()) save();
  else render();
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
  if (role === 'learner' && player()?.starterPending) openStarterDialog();
}
const pageArt = {
  week: ['market-lights.webp','📋'], money: ['market-lights.webp','🪙'],
  progress: ['coast-ride.webp','🏆'],
  challenges: ['market-lights.webp','🎮'], shop: ['market-lights.webp','⭐'], 'learner-help': ['coast-ride.webp','💡']
};
function pageHeader(label, title, description, action = '') {
  const art = role === 'learner' ? pageArt[view] : undefined;
  return `<div class="page-header ${art ? 'story-header' : ''}" ${art ? `style="--page-art:url('${esc(assetUrl(art[0]))}')"` : ''}>${art ? `<span class="story-icon" aria-hidden="true">${art[1]}</span>` : ''}<div><div class="eyebrow">${tr(label)}</div><h1>${tr(title)}</h1><p>${tr(description)}</p></div>${action}</div>`;
}
function pct(p) { return Math.min(100, Math.floor(progress(p).buckets[1] * 100 / p.target)); }
function taskName(task) {
  if (task.title) return task.title;
  if (task.id === 'family') return familyTitle;
  if (task.id === 'business') return 'Make a business move';
  if (task.id === 'reflection') return 'Money habit';
  return taskLabels[task.id];
}
function taskPrompt(task, p, week) {
  if (task.id === 'family') return familyPrompt;
  if (task.assignedPrompt && ['submitted','approved'].includes(task.status)) return task.assignedPrompt;
  const info = week.module ?? moduleFor(p, week.index);
  if (task.id === 'business') return info.business;
  if (task.id === 'learning') {
    return schoolQuizFor(week.index) ? 'Show what you know in the weekly school quiz.' : 'Complete the weekly lesson and share what you learnt.';
  }
  if (task.id === 'reflection') return info.outside;
  return task.prompt;
}
function goal(p, dark = false) {
  return `<section class="goal ${dark ? 'goal-dark' : 'panel'}"><div class="eyebrow">${esc(tr("MY SAVINGS GOAL"))}</div><h2>${esc(p.goal)}</h2>
    <div class="goal-amount"><strong>${money(progress(p).buckets[1])}</strong> <span>of ${money(p.target)}</span></div>
    <progress value="${pct(p)}" max="100" aria-label="${esc(tr("Savings goal progress"))}"></progress><div class="goal-bottom"><span>${tr('{percent}% of goal', {percent:pct(p)})}</span>${button('Edit goal', 'edit-goal', '', 'quiet')}</div></section>`;
}
function bucketCards(amounts, p) {
  return `<div class="bucket-grid">${(p ? allAccounts(p) : buckets).map((name, index) => `<article class="bucket bucket-${index}"><div class="bucket-icon" aria-hidden="true">${marks[index] ?? '◎'}</div><div><div class="bucket-label">${esc(name)}</div><strong>${money(amounts[index] ?? 0)}</strong></div></article>`).join('')}</div>`;
}
function marketControls(p, week) {
  const spec = market[week.index % market.length];
  if (week.closed) return button(nextProgrammeWeek(p) === null ? 'See programme results' : 'Back to dashboard', 'view', 'data-view="dashboard"', 'primary');
  if (p.mode !== 'sim') {
    const t = totals(week);
    return `<div class="real-week"><h2>Your business this week</h2>
      <div class="real-business">${p.offer ? `<p><strong>What you offer</strong> · ${esc(p.offer)}</p>` : ''}${p.customers ? `<p><strong>Who it’s for</strong> · ${esc(p.customers)}</p>` : ''}</div>
      <div class="market-numbers"><div><span>Sales and paid jobs</span><strong>${money(t.sales)}</strong></div><div><span>Business costs</span><strong>${money(t.costs)}</strong></div><div><span>${esc(tr("Profit before tax"))}</span><strong>${money(t.profit)}</strong></div></div>
      <p class="detail">${esc(tr('Use Business mission to log a job, its income and its costs together.'))}</p>
      <div class="action-row">${bankActions(p)}${button('Open money log', 'view', 'data-view="money"')}</div></div>`;
  }
  if (week.choice !== null) {
    const { sales, costs, profit } = totals(week);
    const result = week.result;
    const missed = result ? result.demand - result.sold : 0;
    return `<div class="market-result"><div class="section-title"><div><h2>Market results</h2><p>${result ? result.sold + ' sales at ' + money(result.price) + ' each' : 'Your previously recorded market result'}${result?.returning ? ' · ' + result.returning + ' returning' : ''}</p></div>${pill(profit < 0 ? 'Loss this week' : profit === 0 ? 'Broke even' : 'Profit this week', profit < 0 ? 'amber' : 'green')}</div>
      <div class="market-numbers"><div><span>Sales revenue</span><strong>${money(sales)}</strong></div><div><span>Business costs</span><strong>${money(costs)}</strong></div><div><span>Before tax</span><strong>${money(profit)}</strong></div></div>
      ${result ? `<p>${missed > 0 ? missed + (missed === 1 ? ' interested customer' : ' interested customers') + ' missed out because you reached capacity. ' : ''}${result.regularsEarned ? '+' + result.regularsEarned + ' potential regulars for future markets.' : 'No new potential regulars this week.'}</p>` : ''}
      ${profit < 0 ? '<p>Costs were higher than sales. The loss stays on your record. Check your Main account before your next money move.</p>' : ''}
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
function nextQuizGuidance(p, week) {
  if (week.closed || week.index >= programmeLength - 1) return '';
  const close = p.solo
    ? 'Finish the required missions and settle this week.'
    : 'Finish the required missions and have your adult record the check-in.';
  const next = weekSchedule(p).mode === 'scheduled'
    ? 'The next quiz opens with the next scheduled week.'
    : 'Then choose Start next week to open the next quiz.';
  return [close, next, 'Weekly arcade challenges are optional.'].map(message => tr(message)).join(' ');
}
function weekView(p) {
  const week = activeWeek(p), info = moduleFor(p, week.index), tally = totals(week), path = progress(p);
  const required = week.tasks.filter(task => task.required).length;
  const approved = week.tasks.filter(task => task.required && task.status === 'approved').length;
  const status = task => p.solo && task.status === 'approved' ? 'Complete' : statuses[task.status];
  const nextNote = nextWeekNote(p);
  const guidance = nextQuizGuidance(p, week);
  return `${pageHeader(esc(p.business) + ' · WEEK ' + (week.index + 1),
    nextNote ? 'Week complete' : week.closed ? 'Campaign complete' : esc(tr(info.title)),
    nextNote || (week.closed ? 'Look back on your business decisions and see how far you got towards your goal.' : esc(tr(info.summary))),
    startNextWeekButton(p))}
  <div class="game-shell"><div class="play-area"><section class="scene" aria-label="Market board">
    <div class="scene-header"><strong>${p.mode === 'sim' ? market[week.index % market.length].place : 'My business'}</strong><span>WEEK ${week.index + 1}</span></div>
    ${p.mode === 'sim' ? `<ol class="market-steps" aria-label="Market day stages">${['Choose a plan', 'Respond to news', 'See results'].map((label, i) => {
      const stage = week.choice !== null ? 2 : week.plan !== undefined ? 1 : 0;
      return `<li ${stage === i ? 'aria-current="step"' : ''}><span class="step-number" aria-hidden="true">${i < stage ? '✓' : i+1}</span>${label}</li>`;
    }).join('')}</ol>` : ''}
    <div class="scene-footer"><span>${p.mode === 'sim' ? goodwill(p) + ' potential regulars' : 'Real business'}</span><span>${tr('{points} points', {points:path.points})}</span></div>
    <div class="market-controls">${marketControls(p, week)}</div></section>
  <section class="quest-log" aria-labelledby="tasks-heading"><div class="section-title"><div><h2 id="tasks-heading">${esc(tr("Weekly missions"))}</h2><p>${approved} of ${required} required missions ${p.solo ? 'complete' : 'approved'}</p></div>${pill(week.closed ? 'Week closed' : tally.ready ? (p.solo ? 'Ready to settle' : 'Ready for check-in') : 'In progress', 'green')}</div>
  ${guidance ? `<p class="detail">${esc(guidance)}</p>` : ''}
  <div class="tasks">${week.tasks.map(task => {
    const kind = task.kind === 'chore' ? 'chore' : task.id;
    const category = Object.hasOwn(missionIcons, kind) ? kind : 'custom';
    return `<article class="task"><div class="task-icon mission-${category}" aria-hidden="true">${task.status === 'approved' ? '✓' : missionIcons[category] ?? '★'}</div><div class="task-copy"><div class="task-type">${task.kind === 'chore' ? 'Chore' : taskLabels[task.id] ?? taskLabels.custom} · +${taskPoints(week, task)} pts${task.required ? '' : ' · Optional'}</div><h3>${esc(tr(taskName(task)))}</h3><p>${esc(localMission(taskPrompt(task, p, week)))}</p>${task.feedback ? `<p class="feedback"><strong>${esc(tr("Feedback"))}</strong> · ${esc(task.feedback)}</p>` : ''}</div><div class="task-actions">${pill(status(task), task.status === 'approved' ? 'green' : task.status === 'revision' ? 'amber' : '')}${button(week.closed || ['submitted','approved'].includes(task.status) ? 'View' : 'Open', 'task', `data-id="${esc(task.id)}"`, 'small')}</div></article>`;
  }).join('')}</div>
  ${p.solo && tally.ready && !week.closed ? `<div class="settle">${button('Settle the week', 'solo-settle', '', 'primary')}</div>` : ''}
  </section></div><aside class="aside">${goal(p, true)}<section class="panel route"><h2>${tr('Season map')}</h2><p>${tr('Choose a week to see what you’ll learn.')}</p><ol>${episodes.map((entry, index) => `<li class="${index === week.index ? 'current' : ''}"><span class="route-dot" aria-hidden="true">${p.weeks[index]?.closed ? '✓' : index + 1}</span>${button(esc(moduleTitle(p,index)) + (index > week.index ? '<small>' + tr('Preview') + '</small>' : ''), 'season-preview', `data-index="${index}"`, 'quiet season-week')}</li>`).join('')}</ol></section>
  ${week.index > 0 && !week.closed ? `<section class="panel"><h2>${p.solo ? 'Last week’s note' : 'Last check-in'}</h2><p>${esc(p.weeks[week.index - 1].feedback)}</p></section>` : ''}</aside></div>`;
}
const typeNames = { sale: 'Sale', reward: 'Activity reward', spend: 'Personal purchase', cost: 'Business cost' };
const isMoneyOut = kind => kind === 'spend' || kind === 'cost';
const allowsEntry = (p, kind) => Object.hasOwn(typeNames, kind) && (p.mode === 'manual' || ['reward', 'spend'].includes(kind));
function transactionTable(p, week) {
  if (!week.transactions.length) return `<p>${esc(tr("No transactions recorded for this week."))}</p>`;
  return `<div class="table-wrap" role="region" aria-label="${esc(tr("Transactions table"))}" tabindex="0"><table><thead><tr><th scope="col">Description</th><th scope="col">Type</th><th scope="col">${esc(tr("Amount"))}</th>${week.closed ? '' : `<th scope="col">${esc(tr("Action"))}</th>`}</tr></thead><tbody>${week.transactions.map(entry => {
    const attrs = `${playerAttrs(p)} data-id="${esc(entry.id)}"`;
    return `<tr><td>${esc(entry.label)}</td><td>${tr(typeNames[entry.kind])}</td><td>${isMoneyOut(entry.kind) ? '−' : '+'}${money(entry.cents)}</td>${week.closed ? '' : `<td>${entry.sim ? 'Scenario' : entry.missionId ? esc(tr('From a mission')) : button('Edit', 'edit-entry', attrs, 'small') + button('Remove', 'remove-entry', attrs, 'small')}</td>`}</tr>`;
  }).join('')}</tbody></table></div>`;
}
const accountNames = ['Spend account', 'Savings account', 'Investment account', 'Giving account'];
const accountArt = [
  { id:'spend', name:'Market basket' }, { id:'save', name:'Savings jar' },
  { id:'invest', name:'Growing plants' }, { id:'give', name:'Gift box' },
  { id:'coast', name:'Coastal ride' }, { id:'market', name:'Evening market' }
];
const allAccounts = p => [...accountNames.map(tr), ...(p.customBuckets ?? []).map(bucket => bucket.name)];
const bucketName = (p, index) => allAccounts(p)[index];

function bankActions(p, { secondary = false, attrs = '' } = {}) {
  if (activeWeek(p).closed) return '';
  return `<div class="bank-entry-pair">
    ${button('<span aria-hidden="true">+</span> ' + tr('Money in'), 'add-entry', `${attrs} data-kind="income"`, 'primary')}
    ${button('<span aria-hidden="true">−</span> ' + tr('Money out'), 'add-entry', `${attrs} data-kind="outgoing"`, 'money-out')}
    </div>` +
    (secondary ? button(tr('Move money'), 'move-money', attrs, 'secondary') : '');
}
function transferList(p, week) {
  if (!week.transfers?.length) return `<p>${esc(tr("No transfers this week."))}</p>`;
  return `<ul class="bank-activity">${week.transfers.slice().reverse().map(({ bucket, cents }) => `<li>
    <span>${tr(cents > 0 ? 'Main → {name}' : '{name} → Main', {name:esc(bucketName(p,bucket))})}</span><strong>${money(Math.abs(cents))}</strong></li>`).join('')}</ul>`;
}
function mainAccount(p) {
  const bank = accounts(p);
  return `<div class="bank-balance"><span>${tr('Main account · Available')}</span><strong>${money(bank.available)}</strong>
    ${bank.main < 0 ? `<p>${money(-bank.main)} in costs still to cover from future income.</p>` : ''}</div>`;
}
function bankOverview(p) {
  const bank = accounts(p);
  const week = activeWeek(p), tally = totals(week);
  const recent = p.weeks.flatMap(w => w.transactions).slice(-3).reverse();
  return `<section class="panel bank-overview" aria-labelledby="dashboard-bank">
    <div class="section-title"><div><span class="eyebrow">${esc(tr("GAME MONEY"))}</span><h2 id="dashboard-bank">${tr('My money')}</h2></div>
      ${button('Open Money log', 'view', 'data-view="money"', 'secondary')}</div>
    <div class="bank-overview-grid">
      <div>${mainAccount(p)}
        <div class="bank-actions">${bankActions(p, { secondary: true })}</div></div>
      <div class="bank-week"><h3>${tr('Week')} ${week.index + 1}</h3><dl>
        <div><dt>${esc(tr("Money in"))}</dt><dd>${money(tally.sales + tally.rewards)}</dd></div>
        <div><dt>${esc(tr("Money out & simulated tax"))}</dt><dd>${money(tally.costs + tally.spending + tally.tax)}</dd></div>
      </dl></div>
    </div>
    <div class="section-title bank-bucket-head"><h3>${tr('Money buckets')}</h3>${button(tr('View all buckets'),'view','data-view="investments"','small')}</div>
    <div class="bank-accounts">${allAccounts(p).slice(0,8).map((name,i) => button(`<span aria-hidden="true">${marks[i] ?? '◎'}</span><span>${esc(name)}</span><strong>${money(bank.balances[i])}</strong>`, 'view', `data-view="investments" data-account="${i}"`, 'bank-account')).join('')}</div>
    <div class="bank-recent"><h3>${esc(tr("Recent money log"))}</h3>${recent.length ? `<ul class="bank-activity">${recent.map(entry => `<li><span>${esc(entry.label)}</span><strong>${isMoneyOut(entry.kind) ? '−' : '+'}${money(entry.cents)}</strong></li>`).join('')}</ul>` : `<p>${esc(tr("Log your first paid job, reward or purchase to see it here."))}</p>`}</div>
  </section>`;
}
function moneyView(p) {
  const week = p.weeks.find(w => w.index === ledgerWeek) ?? activeWeek(p), t = totals(week);
  return `${pageHeader('MY BUSINESS', tr('Money log'), tr('Record what you earn and spend, then decide where your money goes.'))}
  <section class="panel bank-overview ledger-toolbar" aria-label="Main account">
    ${mainAccount(p)}
    <div class="bank-actions">${bankActions(p, { secondary: true })}${button(tr('View accounts'), 'view', 'data-view="investments"', 'secondary')}</div>
  </section>
  <label class="inline-field">Week <select id="ledger-week">${p.weeks.map(w => `<option value="${w.index}" ${w === week ? 'selected' : ''}>${w.index + 1} · ${esc(moduleTitle(p,w.index))}</option>`).join('')}</select></label>
  <section class="panel money-flow" aria-label="Money earned and spent">
    <div><span>${esc(tr("Money in · Sales + activity rewards"))}</span><strong>${money(t.sales + t.rewards)}</strong></div>
    <span aria-hidden="true">−</span><div><span>${esc(tr("Money out · Purchases, costs & simulated tax"))}</span><strong>${money(t.costs + t.spending + t.tax)}</strong></div>
    <span aria-hidden="true">=</span><div><span>${esc(tr("This week’s net cash"))}</span><strong>${money(t.profit + t.rewards - t.tax - t.spending)}</strong></div>
  </section>
  <div class="stats">${[['Sales',t.sales],['Expenses',t.costs],['Profit before tax',t.profit],[tr('Simulated tax') + ' (' + week.rules.tax + '%)',t.tax]].map(([label,cents]) => `<article class="panel"><span>${tr(label)}</span><strong>${money(cents)}</strong></article>`).join('')}</div>
  <section class="panel ledger"><div class="section-title"><h2>${esc(tr("Transactions"))}</h2>${pill(week.closed ? 'Week closed' : 'Open week', 'green')}</div>
  ${transactionTable(p, week)}</section>
  <section class="panel spaced"><h2>${tr(week.transfers ? 'Account transfers' : 'Original bucket allocations')}</h2>
  ${week.transfers ? transferList(p, week) : bucketCards(t.allocations)}
  ${t.match ? `<p>Simulated savings match · ${money(t.match)}</p>` : ''}</section>`;
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
    else if (remaining) nextNote = 'Add ' + money(remaining) + ' more to Save and check in at the end of the week to unlock it.';
    else nextNote = 'Close a week to claim this milestone.';
  }
  const renderAwards = items => `<ul class="award-grid">${items.map(award => {
    const unlocked = earned.includes(award);
    return `<li class="award-card ${unlocked ? 'unlocked' : ''}">
      <span class="award-mark" aria-hidden="true">${award.icon}</span>
      <div><strong>${tr(award.title)}</strong><p>${tr(award.description)}</p><small>${unlocked ? 'Earned' : 'To unlock'} · +${award.points} pts</small></div>
    </li>`;
  }).join('')}</ul>`;
  return `<section class="panel award-shelf" aria-labelledby="award-heading">
    <div class="section-title"><div><h2 id="award-heading">${esc(tr("Milestone rewards"))}</h2><p>${earned.length} of ${skills.length + savings.length} badges earned</p></div>${pill('+' + result.awardPoints + ' reward points','green')}</div>
    <div class="next-reward"><strong>${nextTitle}</strong><p>${nextNote}</p></div>
    <h3>${esc(tr("Savings journey"))}</h3>${renderAwards(savings)}
    <h3>${esc(tr("Business and money skills"))}</h3>${renderAwards(skills)}
  </section>`;
}
function progressView(p) {
  const result = progress(p), wallet = shopWallet(p);
  return `${pageHeader('MY BUSINESS', 'My progress', 'See what you saved and what you learnt along the way.')}
  ${certificateShelf(p)}
  ${trendChart(p)}
  <div class="progress-layout spaced">${goal(p, true)}<div class="stats progress-stats"><article class="panel"><span>${esc(tr("Weeks closed"))}</span><strong>${result.closed}</strong></article><article class="panel"><span>${esc(tr("Shop points earned"))}</span><strong>${result.points}</strong><p class="detail">${result.points - result.awardPoints - result.challengePoints} from missions and weeks · ${result.awardPoints} from badges · ${result.challengePoints} from challenges</p></article></div></div>
  <section class="panel shop-callout"><div><h2>${esc(tr("Make your profile yours"))}</h2><p><strong>${wallet.balance} points available</strong> · ${wallet.spent} spent. Your badges stay in your collection.</p></div>${button('Open Profile shop', 'view', 'data-view="shop"', 'primary')}</section>
  ${awardShelf(p, result)}
  <div class="section-title spaced"><div><h2>${esc(tr("Money buckets"))}</h2><p>${esc(tr("Current account balances. Save includes any simulated match."))}</p></div></div>
  ${bucketCards(result.buckets,p)}
  <section class="panel ledger spaced"><h2>${tr(p.solo ? 'Business history' : 'Check-in history')}</h2>${p.weeks.some(w => w.closed) ? `<ul class="history">${p.weeks.filter(w => w.closed).map(w => {
    const tally = totals(w);
    return `<li><strong>${tr('Week')} ${w.index + 1} · ${esc(moduleTitle(p,w.index))}</strong>${w.result ? `<p>${market[w.index % market.length].plans[w.choice].label} · ${w.result.tactic} · ${w.result.sold} sold</p>` : ''}<p>${money(tally.profit)} before simulated tax · ${money(tally.allocations[1] + tally.match)} net change in Save</p><p>${esc(w.feedback)}</p></li>`;
  }).join('')}</ul>` : `<p>${esc(tr("Your weekly notes will appear after you close your first week."))}</p>`}
  </section>`;
}
function avatar(p, compact = false) {
  const { icon, frame } = cosmetics(p);
  return portrait(icon, compact, frame);
}
function portrait(item, compact = false, frame) {
  const image = item.image ? ` style="background-image:url('${esc(assetUrl(item.image))}');background-position:center;background-size:cover"` : '';
  return `<span class="arc-avatar ${item.symbol ? 'avatar-symbol' : ''} ${compact ? 'avatar-compact' : ''} ${frame?.id ?? ''}" aria-hidden="true"${image}>${item.symbol ?? ''}</span>`;
}
function titleBadge(item, tag = 'span') {
  return `<${tag} class="title-badge title-${item.id}"><span class="title-mark" aria-hidden="true">${item.mark}</span>
    <span>${esc(tr(item.name))}</span></${tag}>`;
}
function identity(p) {
  return `<span class="learner-identity">${avatar(p, true)}<span><strong>${esc(p.name)}</strong><small>${titleBadge(cosmetics(p).title)}</small></span></span>`;
}
function artwork(p) {
  return `style="--scene-image:url('${esc(assetUrl(cosmetics(p).background.image))}')"`;
}
const shopCategories = [
  ['icon','Avatars'], ['background','Dashboard backgrounds'],
  ['frame','Avatar frames'], ['title','Titles']
];
let shopCategory = 'icon';

function backgroundTile(item) {
  return `<span class="style-scene" style="background-image:url('${esc(assetUrl(item.image))}')" aria-hidden="true"></span>`;
}
const starterLookGroups = [['icon', 'Starting profile picture', 'hero'], ['background', 'Starting dashboard background', 'sunset']];
function starterLookFields(appearance = {}) {
  return `<div class="starter-looks">${starterLookGroups.map(([kind, label, initial]) =>
    `<fieldset><legend>${tr(label)}</legend><div class="starter-look-options starter-${kind}">
      ${starterOptions(kind).map(item => `<label><input type="radio" name="starter-${kind}" value="${item.id}" ${item.id === (appearance[kind] ?? initial) ? 'checked' : ''}>
        <span class="starter-look-card">${kind === 'icon' ? portrait(item) : backgroundTile(item)}
          <span>${esc(tr(item.name))}</span></span></label>`).join('')}
    </div></fieldset>`).join('')}</div>`;
}
function openStarterDialog() {
  openDialog(tr('Choose your starter look'), form('starter-look',
    `<p>${tr('Pick a free profile picture and dashboard background. You can change them in the Profile Shop.')}</p>${starterLookFields()}`,
    tr('Save starter look')));
}
function shopView(p) {
  const wallet = shopWallet(p), equipped = cosmetics(p);
  const target = shopItems.find(item => item.id === p.shop?.target && !wallet.owned.has(item.id));
  const card = item => {
    const owned = wallet.owned.has(item.id), wearing = equipped[item.kind].id === item.id;
    const attrs = `data-id="${item.id}"`;
    const preview = item.kind === 'background'
      ? backgroundTile(item)
      : item.kind === 'icon' || item.kind === 'frame'
        ? portrait(item.kind === 'frame' ? equipped.icon : item, false, item.kind === 'frame' ? item : equipped.frame)
        : '';
    const heading = item.kind === 'title' ? titleBadge(item, 'h3') : `<h3>${esc(tr(item.name))}</h3>`;
    return `<li class="style-card${item.kind === 'title' ? ' title-card' : ''}">${preview}<div class="style-card-copy">${heading}${item.description ? `<p>${tr(item.description)}</p>` : ''}
      <div class="catalog-actions">${wearing ? pill('Equipped', 'green')
        : owned ? button('Equip', 'shop-equip', attrs + ` aria-label="Equip ${tr(item.name)}"`, 'small')
        : item.rewardOnly ? pill(item.rewardOnly)
        : `${wallet.balance >= item.cost ? button(tr('Buy · {cost} pts', {cost:item.cost}), 'shop-buy', attrs + ` aria-label="Buy ${tr(item.name)} for ${item.cost} points"`, 'primary small') : pill(tr('{cost} pts · {points} to go', {cost:item.cost,points:item.cost-wallet.balance}))}
        ${target?.id === item.id ? pill('Saving for this', 'green') : button('Save for this', 'shop-target', attrs + ` aria-label="Save for ${tr(item.name)}"`, 'small')}`}</div></div></li>`;
  };
  const activeCategory = shopCategories.find(([id]) => id === shopCategory);
  const items = shopItems.filter(item => item.kind === shopCategory);
  return `${pageHeader('PROFILE SHOP', 'Make it yours', 'Choose an avatar, frame, background or title. Spend points now or save up for a look you like.')}
  <div class="style-overview">
    <section class="style-preview" ${artwork(p)} aria-label="Your equipped profile">${avatar(p)}<div><h2>${esc(p.name)}</h2>${titleBadge(equipped.title)}<p>${tr(equipped.background.name)} · ${tr(equipped.frame.name)}</p></div></section>
    <section class="panel points-wallet"><h2>${esc(tr("Game points"))}</h2><p class="wallet-balance"><strong>${wallet.balance}</strong> <span>${esc(tr("available to spend"))}</span></p>
    ${target ? `<p>${tr('Saving for {item} · {points} pts to go', {item:'<strong>' + esc(tr(target.name)) + '</strong>',points:Math.max(0,target.cost-wallet.balance)})}</p><progress value="${Math.min(wallet.balance,target.cost)}" max="${target.cost}" aria-label="${esc(tr('Points towards {item}', {item:tr(target.name)}))}"></progress>${button('Clear goal', 'shop-target', '', 'quiet small')}` : `<p>${esc(tr("Set a point goal with"))} <strong>${esc(tr("Save for this"))}</strong>.</p>${button('See how I earn points','view','data-view="progress"','small')}`}</section>
  </div>
  <nav class="appearance-categories" aria-label="${esc(tr('Profile shop categories'))}">
    ${shopCategories.map(([kind,label]) => button(tr(label),'shop-category',
      `data-id="${kind}" aria-pressed="${shopCategory === kind}"`, shopCategory === kind ? 'primary' : 'secondary')).join('')}
  </nav>
  <section class="style-catalog" aria-labelledby="active-shop-category"><h2 id="active-shop-category">${tr(activeCategory[1])}</h2>
    <ul>${items.map(card).join('')}</ul></section>`;
}
function shopPurchaseDialog(p, item) {
  const wallet = shopWallet(p);
  if (wallet.owned.has(item.id) || wallet.balance < item.cost) return;
  const remaining = wallet.balance - item.cost;
  const target = shopItems.find(other => other.id === p.shop?.target && other.id !== item.id);
  openDialog(tr('Buy {item}?', {item:esc(tr(item.name))}), `<p>This costs <strong>${item.cost} game points</strong> and leaves you with <strong>${remaining} points</strong>.</p>
    ${target && remaining < target.cost ? `<p class="shop-tradeoff">You’ll need ${target.cost - remaining} more points for ${target.name}.</p>` : ''}
    ${form('shop-buy', '', tr('Spend {cost} points', {cost:item.cost}), `${playerAttrs(p)} data-id="${item.id}"`)}`);
}

let chartMetric = 'xp';
let chartWeek;
function trendChart(p, showProgressLink = false) {
  const savings = chartMetric === 'saved', history = progressHistory(p);
  const selected = history.find(point => point.week === chartWeek) ?? history.at(-1);
  const step = savings ? 500 : 20;
  const max = Math.max(step, Math.ceil(Math.max(...history.map(point => point[chartMetric])) / step) * step);
  const format = amount => savings ? money(amount) : tr('{points} XP', {points:amount});
  return `<section class="arc-trend" aria-label="${esc(tr("Progress chart"))}">
    <div class="trend-head"><div><h2>${esc(tr("Progress over time"))}</h2><p>${tr(savings ? 'Money added to Save at check-ins' : 'Total Learning XP from missions, videos and quizzes')}</p></div>
    ${showProgressLink ? button('My progress →','view','data-view="progress"','small') : ''}</div>
    <div class="trend-tools"><div class="trend-tabs" aria-label="${esc(tr("Chart metric"))}">
      ${[['xp','Learning XP'],['saved','Savings']].map(([id,label])=>button(label,'chart-metric',`data-id="${id}" aria-pressed="${chartMetric===id}"`,'small')).join('')}
    </div><p><strong>${format(selected[chartMetric])}</strong> · ${tr('Week')} ${selected.week}</p></div>
    <div class="trend-plot"><div class="trend-axis" aria-hidden="true"><span>${format(max)}</span><span>${savings ? '$0' : '0'}</span></div>
    <div class="trend-columns" style="--count:${history.length}">${history.map(point=>`<button type="button" class="trend-column" data-action="chart-week" data-index="${point.week}" aria-pressed="${selected.week===point.week}" aria-label="${tr('Week')} ${point.week}, ${format(point[chartMetric])}"><span class="trend-bar" style="--height:${112*point[chartMetric]/max}px"></span><small>${point.week}</small></button>`).join('')}</div></div>
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
  return `<section class="arc-journey"><div class="arc-section-head"><div><span>${esc(tr("12-WEEK PROGRAMME"))}</span><h2>${esc(tr("Your money journey"))}</h2></div>${button('See all weeks', 'view', 'data-view="week"', 'small')}</div>
    <ol>${levels.map((name,i) => `<li class="journey-step level-${i} ${i === level ? 'here' : ''}" ${i === level ? 'aria-current="step"' : ''}><b>${tr('LEVEL')} ${i+1}</b><span class="journey-icon" aria-hidden="true">${levelIcons[i]}</span><strong>${tr(name)}</strong><small>${tr(levelGoals[i])}</small></li>`).join('')}</ol>
    <div class="arc-week-grid" aria-label="${esc(tr("Programme weeks"))}">${episodes.map((episode,i) => `<span title="${i+1} · ${esc(tr(episode.title))}" class="${p.weeks[i]?.closed ? 'done' : p.weeks[i] ? 'current' : ''}">${i+1}</span>`).join('')}</div></section>`;
}
const challengeTitle = week => week.tasks.some(task => task.id === 'family') ? familyTitle : challengeFor(week.index).title;
function weeklyChallengeCard(p) {
  const week = activeWeek(p), scenario = challengeFor(week.index);
  const family = week.tasks.find(task => task.id === 'family');
  if (family) return `<section class="panel play-card">
    <div class="play-emblem" aria-hidden="true">🤝</div>
    <div><div class="eyebrow">${esc(tr('WEEK 12 FINALE'))}</div><h2>${esc(tr(familyTitle))}</h2>
    <p>${esc(tr(familyPrompt))}</p></div>
    ${button(['approved', 'submitted'].includes(family.status) ? 'View Week 12 result' : 'Start the Showdown', 'task', 'data-id="family"', 'primary')}</section>`;
  return `<section class="panel play-card">
    <div class="play-emblem" aria-hidden="true">🎮</div>
    <div><div class="eyebrow">${tr('WEEK {number} CHALLENGE', {number:week.index+1})}</div><h2>${tr(scenario.title)}</h2>
    <p>${week.weeklyCertificate ? tr('Certificate earned. Play again or choose another activity.') : tr('Play to earn a weekly certificate and {points} Shop points.', {points:weeklyPoints})}</p></div>
    ${button(tr(week.weeklyCertificate ? 'Replay {activity}' : 'Start {activity}', {activity:tr(scenario.title)}), 'weekly-play', '', 'primary')}
  </section>`;
}
const samVideoLibrary = 'https://www.successavenuemoney.com/library';
const week12Video = samVideoLibrary + '/my-first-business-partnership-what-you-need-to-know';
const samQuizLibrary = 'https://www.successavenuemoney.com/quizzes';
const videoQuizWeeks = [6, 7, 8, 9, 10, 11];
function vimeoFrame(src) {
  return `<iframe class="sam-video" src="${esc(src)}" title="Success Avenue Money · Vimeo"
    loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
}
function samAssignment(module, index) {
  const direct = (url, library) => {
    if (!url || !isHttps(url)) return false;
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/$/, '') !== new URL(library).pathname;
  };
  // Keep the video and its quiz in the same assignment scope.
  const quizWeek = videoQuizWeeks.includes(index);
  const source = module.lessonUrl || (!quizWeek && module.quizUrl) ? module
    : quizWeek ? { lessonUrl: state.weeklyVideos?.[index] } : state;
  const assignedVideo = direct(source.lessonUrl, samVideoLibrary);
  const video = assignedVideo ? source.lessonUrl : index === familyWeek ? week12Video : samVideoLibrary;
  const quiz = direct(source.quizUrl, samQuizLibrary) ? source.quizUrl : samQuizLibrary;
  return { video, quiz, embed: vimeoPlayer(video), assigned: assignedVideo && quiz !== samQuizLibrary };
}
function samLink(url, label) {
  return `<a class="button secondary sam-quiz-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${tr(label)}<span class="sr-only"> (opens in a new tab)</span> ↗</a>`;
}
function samVideo(assignment) {
  return assignment.embed ? vimeoFrame(assignment.embed) : samLink(assignment.video, 'Watch the SAM video');
}
function weeklyLessonLabel(week, module) {
  const quiz = schoolQuizFor(week.index);
  if (quiz) return quiz.title;
  return samAssignment(module, week.index).assigned ? 'Video and quiz on SAM'
    : 'Lesson reflection';
}
function quizResults(result, learner = false, expanded = false, answerLabel = learner ? 'Your answer' : 'Learner’s answer') {
  if (!result) return '';
  const maximum = result.maximum ?? result.answers.length;
  return `<section class="lesson school-quiz-results" lang="en-NZ">
    <h3>${esc(result.title)}</h3>
    <p><strong>Score: ${result.score} / ${maximum}</strong> · ${Math.round(100 * result.score / maximum)}%
      ${typeof result.passed === 'boolean' ? ' · ' + pill(result.passed ? 'Pass' : 'Fail', result.passed ? 'green' : 'amber') : ''}</p>
    <details ${expanded ? 'open' : ''}>
      <summary>Answer breakdown</summary>
      <ol>${result.answers.map(answer => `<li>
        <strong>${esc(answer.question)}</strong>
        <p>${pill(answer.maximum === 2 ? answer.points + ' / 2' : answer.correct ? 'Correct' : 'Incorrect', answer.correct ? 'green' : '')} ${esc(answerLabel)}: ${esc(answer.selected)}</p>
        ${answer.correct ? '' : `<p>Correct ${answer.maximum === 2 ? 'pair' : 'answer'}: ${esc(answer.expected)}</p>`}
      </li>`).join('')}</ol>
    </details>
  </section>`;
}
function challengesView(p) {
  const week = activeWeek(p);
  const past = p.weeks.slice(0, -1).reverse();
  return `${pageHeader('CHALLENGE ARCADE', 'Challenges', 'Choose this week’s activity, open a teacher challenge, or play a practice game.')}
    ${weeklyChallengeCard(p)}
    <section class="panel spaced" aria-labelledby="sam-quiz-title">
      <h2 id="sam-quiz-title">${tr('Weekly lesson')}</h2>
      <p>${esc(tr(weeklyLessonLabel(week, moduleFor(p, week.index))))}</p>
      ${button(week.schoolQuizResult ? 'View quiz results' : 'Open weekly lesson', 'task', 'data-id="learning"', 'small')}
    </section>
    ${learnerClassChallenges(p, true)}
    <section class="panel practice-market spaced"><div class="eyebrow">${esc(tr("FREE PLAY"))}</div><h2>${esc(tr("Market Day practice"))}</h2>
    <p>${esc(tr("Try another stall plan with $40 in game money. Weekly certificates come from the weekly challenge above."))}</p>
    ${button('Play Market Day practice', 'practice-market')}</section>
    ${past.length ? `<section class="panel spaced"><h2>${esc(tr("Earlier challenges"))}</h2>
    <ul class="challenge-list">${past.filter(w => w.index !== familyWeek || w.tasks.some(task => task.id === 'family' && (task.showdown || task.familyResponse))).map(w => `<li><div><strong>${tr('Week')} ${w.index + 1} · ${tr(challengeTitle(w))}</strong>
      <p>${w.weeklyCertificate ? 'Certificate earned' : 'Available to catch up'}</p></div>
      ${button(w.index === familyWeek ? 'View result' : w.weeklyCertificate ? 'Replay' : 'Play', w.index === familyWeek ? 'family-history' : 'weekly-play', `data-index="${w.index}" aria-label="Play week ${w.index + 1} challenge"`, 'small')}</li>`).join('')}</ul></section>` : ''}`;
}
function playScenario(index) { return index === 'practice' ? practiceMarket : challengeFor(Number(index)); }
function scenarioAttrs(index) { return `data-index="${index}"`; }
function marketBudgetText(plan) {
  return money(plan.cost * 100) + ' spent · ' + money(plan.buffer * 100) + ' kept in reserve';
}
function startScenario(index, previous) {
  const scenario = playScenario(index), attrs = scenarioAttrs(index);
  if (scenario.kind === 'market') {
    const stock = previous?.stock ?? 8, price = previous?.price ?? scenario.prices[1];
    const plan = runSchoolMarket(scenario, stock, price);
    openDialog('Market Day', `<p>${tr(scenario.story)}</p>
      <div class="market-game-art" aria-hidden="true"></div>
      <div class="game-money"><span>${esc(tr("STARTING BUDGET"))}</span><strong>${money(scenario.budget * 100)}</strong></div>
      ${form('school-market', `<p>Hire the stall for ${money(scenario.fee * 100)}. Stock costs ${money(scenario.unitCost * 100)} per drink. Choose how many to buy and what to charge.</p>
      <fieldset class="market-picker"><legend>${esc(tr("Drinks to buy"))}</legend><div>
        ${stockOptions.filter(q => scenario.fee + q * scenario.unitCost <= scenario.budget).map(q => `<label><input type="radio" name="stock" value="${q}" ${q === stock ? 'checked' : ''} required><span>${q}</span></label>`).join('')}
      </div></fieldset>
      <fieldset class="market-picker"><legend>${esc(tr("Sale price per drink"))}</legend><div>
        ${scenario.prices.map(v => `<label><input type="radio" name="price" value="${v}" ${v === price ? 'checked' : ''} required><span>${money(v * 100)}</span></label>`).join('')}
      </div></fieldset>
      <div class="plan-meter"><progress id="market-plan-meter" value="${plan.cost}" max="${scenario.budget}" aria-label="${esc(tr("Budget used on stock and stall hire"))}"></progress>
      <p class="game-buffer" id="market-buffer" role="status">${marketBudgetText(plan)}</p></div>
      ${previous ? `<p class="detail">Last try: ${previous.stock} drinks at ${money(previous.price * 100)} each · ${previous.covered ? money(previous.profit * 100) + ' after costs' : 'could not pay the surprise cost'}.</p>` : ''}`, 'Open the stall', attrs)}`);
    return;
  }
  openDialog(esc(tr(scenario.title)), `<p>${tr(scenario.story)}</p>${form('weekly-decisions',
    `<div class="quiz-questions">${scenario.questions.map((q,i) => `<fieldset><legend>${i+1}. ${tr(q.prompt)}</legend><div class="decision-options">
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
  const weekly = weeklyCertificates(p).map(w => `<li><div><strong>${tr('Week')} ${w.index + 1} · ${tr(challengeTitle(w))}</strong><p>Weekly challenge certificate</p></div>${button('View certificate','show-certificate',scenarioAttrs(w.index),'small')}</li>`);
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
    <section class="panel"><h2>${esc(tr("Weekly certificates"))}</h2>
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
        return `<li><div><strong>${esc(p.name)}</strong><p>${tr(status)}${entry?.delivered ? ' · Reward delivered' : ''}</p>
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
    + field('Avatar reward','avatar','Optional. Each approved learner receives this in the Profile Shop.',`<select name="avatar"><option value="">None</option>${rewardItems.map(item=>`<option value="${item.id}">${tr(item.name)}</option>`).join('')}</select>`)
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
    ['🎮', 'Play the weekly challenge', week.weeklyCertificate ? 'Certificate earned' : week.tasks.some(task => task.id === 'family') ? 'Required for Week 12' : 'Optional · earns a certificate', week.weeklyCertificate,
      button('Open Challenges','open-weekly-challenges','','small')],
    ['⚡', 'Finish your missions', tr('{done} of {total} approved', {done:complete,total:required.length}), complete === required.length,
      next ? button('Open next mission','task',`data-id="${esc(next.id)}"`,'small') : ''],
    ['🚩', 'Unlock the next week', week.closed ? nextWeekNote(p) || 'Week complete' : complete < required.length
      ? 'Finish the required missions first' : p.solo ? 'Ready to close this week' : 'Ready for an adult check-in', week.closed,
      week.closed ? startNextWeekButton(p, 'small') : p.solo && complete === required.length ? button('Settle the week','solo-settle','','small') : '']
  ];
  return `<section class="panel quest-trail"><h2>${tr('Week {number} quest trail', {number:week.index+1})}</h2><ol>
    ${steps.map(([icon,label,note,done,action]) => `<li class="${done?'step-done':''}"><span class="quest-symbol" aria-hidden="true">${done?'✓':icon}</span>
      <div><strong>${tr(label)}</strong><p>${tr(note)}</p></div>${action}</li>`).join('')}
    </ol></section>`;
}
function shopGoalCard(p) {
  const wallet = shopWallet(p);
  const item = shopItems.find(option => option.id === p.shop?.target && !wallet.owned.has(option.id));
  if (!item) return '';
  const remaining = Math.max(0, item.cost - wallet.balance);
  return `<section class="arc-card shop-goal-card"><span>${tr('SHOP SAVING GOAL')}</span>
    <h2>${button(esc(tr(item.name)), 'view', 'data-view="shop"', 'card-link')}</h2>
    <progress value="${Math.min(item.cost,wallet.balance)}" max="${item.cost}" aria-label="${esc(tr(item.name))}"></progress>
    <p>${remaining ? remaining + ' ' + tr('points to go') : tr('Ready to buy in the Profile shop')}</p></section>`;
}
function showWealth(p) {
  const wealth = wealthBreakdown(p);
  const bank = accounts(p);
  const rows = (entries, sign) => entries.map(([label, cents]) =>
    `<div><dt>${tr(label)}</dt><dd>${cents ? sign : ''}${money(cents)}</dd></div>`).join('');
  const income = [['Paid jobs and sales', wealth.business], ['Activity rewards', wealth.rewards], ['Simulated savings match', wealth.match]];
  if (wealth.market || p.mode === 'sim') income.splice(1, 0, ['Practice market sales', wealth.market]);
  const outgoings = [['Business costs', wealth.costs], ['Simulated tax', wealth.tax], ['Personal purchases', wealth.spending]];
  openDialog(tr('Total wealth'), `<div class="wealth-total"><p>${tr('Your net game money')}</p><strong>${money(wealth.total)}</strong></div>
    <p>${tr('Total wealth shows what you’ve built up across all weeks, after costs, tax and purchases.')}</p>
    <div class="wealth-columns">
      <section><h3>${tr('Money added')}</h3><dl class="wealth-lines">${rows(income,'+')}</dl></section>
      <section><h3>${tr('Money deducted')}</h3><dl class="wealth-lines">${rows(outgoings,'−')}</dl></section>
    </div>
    ${wealth.earlierAdjustment ? `<dl class="wealth-lines">${rows([['Earlier week adjustment', wealth.earlierAdjustment]],'+')}</dl>
      <p class="detail">${tr('Older game versions didn’t carry business losses forward.')}</p>` : ''}
    <details class="wealth-balances"><summary>${tr('Where your money is now')}</summary>
      <dl class="wealth-lines">${rows([['Main account', bank.main]],'')}
      ${allAccounts(p).map((name,index) => `<div><dt>${esc(name)}</dt><dd>${money(bank.balances[index])}</dd></div>`).join('')}</dl>
    </details>
    <p class="detail">${tr('Moving money between buckets leaves your total wealth unchanged.')}</p>`);
}

function dashboardView(p) {
  const w = activeWeek(p), info = moduleFor(p, w.index), lesson = w.tasks.find(t => t.id === 'learning');
  const stats = learningStats(p), week = learningStats(p, [w]);
  const level = Math.min(5, Math.floor(stats.xp / levelStep));
  const levelProgress = level === 5 ? 100 : stats.xp % levelStep;
  const approved = w.tasks.filter(t => t.required && t.status === 'approved').length;
  const required = w.tasks.filter(t => t.required).length;
  const closed = progress(p).closed;
  const lessonDone = ['approved','submitted'].includes(lesson.status);
  const lessonStatus = lesson.status === 'submitted' ? 'Awaiting review'
    : w.schoolQuizResult ? 'View quiz results'
    : lessonDone ? 'Lesson complete' : weeklyLessonLabel(w, info);
  const openChallenges = button(tr('Play this week’s challenge'), 'open-weekly-challenges', '', w.closed ? 'secondary' : 'primary');
  const nextNote = nextWeekNote(p);
  const next = nextNote ? startNextWeekButton(p) : w.closed ? button('Keep playing', 'continue-programme', '', 'primary')
    : lessonDone ? button('See this week’s missions','view','data-view="week"')
    : button('Open weekly lesson','task','data-id="learning"');
  return `<div class="arc-dashboard">
    <div class="arc-grid">
      <aside class="arc-profile">
        <div class="arc-profile-identity">${button(avatar(p), 'view', `data-view="shop" aria-label="${esc(tr('Customise my profile'))}"`, 'avatar-button')}
          <div><strong>${esc(p.name)}</strong>${titleBadge(cosmetics(p).title)}<p>${esc(p.business)}</p></div>
        </div>
        <div class="arc-level">${tr('LEVEL')} ${level+1}<br><span>${tr(levels[level])}</span></div>
        <dl><div><dt>✦ ${tr('Learning XP')}</dt><dd>${stats.xp}</dd></div><div><dt>◉ ${tr('Shop points')}</dt><dd>${shopWallet(p).balance}</dd></div><div><dt>✓ ${tr('Weeks closed')}</dt><dd>${closed}</dd></div></dl>
        ${button(`<span>${tr('Total wealth')}</span><strong>${money(wealthBreakdown(p).total)}</strong><small>${tr('View breakdown')} <span aria-hidden="true">↗</span></small>`, 'view-wealth', 'aria-haspopup="dialog"', 'profile-wealth')}
      </aside>
      <section class="arc-main"><div class="arc-hero" ${artwork(p)}>
        <div class="arc-hero-copy"><span class="arc-tag">${w.index >= programmeLength ? tr('Keep going') : tr('Week').toUpperCase() + ' ' + (w.index+1) + ' / 12'}</span>
          <h1>${nextNote ? tr('Week {week} complete', {week: w.index + 1}) : w.closed ? tr('12 weeks complete!') : tr('Ready, {name}?', {name:esc(p.name)})}</h1><p>${esc(nextNote || tr(info.title))}${p.track === 0 ? ' · ' + tr('Play with a grown-up') : ''}</p>
          <div class="hero-choices">${w.closed ? next + openChallenges : openChallenges + next}</div>
        </div></div></section>
        <section class="arc-missions"><div class="arc-section-head"><div><span>${esc(tr("YOUR NEXT MOVE"))}</span><h2>${tr('This week’s missions')}</h2></div>${pill(tr('{done} of {total} approved', {done:approved,total:required}), 'green')}</div>
        <div class="arc-actions">
          ${button(`<span aria-hidden="true">${missionIcons.chore}</span>` + `<strong>${tr('I did a chore')}</strong><small>${esc(tr("Log a job you finished"))}</small>`, 'log-chore', w.closed ? 'disabled' : '', 'mission-action mission-chore')}
          ${button(`<span aria-hidden="true">${missionIcons.business}</span>` + `<strong>${tr('Business mission')}</strong><small>` + tr(p.mode === 'sim' ? 'Try one move in your practice market' : 'Log work, income and costs') + '</small>', 'task', 'data-id="business"', 'mission-action mission-business')}
          ${button(`<span aria-hidden="true">${missionIcons.learning}</span>` + `<strong>${esc(tr('Money lesson'))}</strong><small>` + esc(tr(lessonStatus)) + '</small>', 'task', 'data-id="learning"', 'mission-action mission-learning')}
          ${button(`<span aria-hidden="true">${missionIcons.reflection}</span>` + `<strong>${tr('Money habit')}</strong><small>${esc(tr("Answer this week’s question"))}</small>`, 'task', 'data-id="reflection"', 'mission-action mission-reflection')}
        </div></section>
      <aside class="arc-side"><section class="arc-card"><span>${esc(tr("YOUR PROGRESS"))}</span><h2>${button(level === 5 ? 'Top level reached' : 'Next level', 'view', 'data-view="progress" aria-label="Your progress"', 'card-link')}</h2><progress max="100" value="${levelProgress}" aria-label="Learning XP to next level"></progress><p>${level === 5 ? tr('Keep practising your money habits.') : tr('{points} XP to Level {level}', {points:levelStep-levelProgress,level:level+2})}</p></section>
      <section class="arc-card arc-gold"><span>${esc(tr("MY BIG GOAL"))}</span><h2>${button(esc(p.goal), 'view', 'data-view="progress" aria-label="My big goal and savings progress"', 'card-link')}</h2><progress max="100" value="${pct(p)}" aria-label="${esc(tr("Savings goal progress"))}"></progress><p>${tr('{percent}% of goal · {weeks} checked in', {percent:pct(p),weeks:closed})}</p></section>
      ${shopGoalCard(p)}<section class="arc-card arc-chart"><span>${esc(tr("LEARNING THIS WEEK"))}</span><h2>${button(tr('{count} XP earned', {count:week.xp}), 'view', 'data-view="week" aria-label="See this week’s learning"', 'card-link')}</h2><dl>${[['Missions',week.missions,w.tasks.filter(t=>t.id!=='learning' && t.kind!=='chore').length + Number(w.tasks.some(t=>t.kind==='chore'))],['Videos',week.videos,1],['Quizzes',week.quizzes,1]].map(([label,n,max])=>`<div><dt>${tr(label)}</dt><dd><progress aria-label="${label} completed this week" max="${Math.max(1,max)}" value="${n}"></progress><b>${n}</b></dd></div>`).join('')}</dl></section></aside>
    </div>
    ${bankOverview(p)}
    ${questTrail(p)}
    ${learnerClassChallenges(p)}
    ${trendChart(p, true)}
    ${competitionNotice(p)}
    ${journey(p,level)}
    ${learnerLeaderboard(p)}
  </div>`;
}
const bucketAdventures = [
  { id:'spend', purpose:'Pay for things you need or want now.',
    why:'A spending limit helps you cover what you need and see what’s left for things you want.',
    example:'Keep your bus fare aside before you buy a snack.', prompt:'You have $10. The bus home costs $4 and a snack costs $7. What could you do?',
    answers:['Buy the snack first','Set aside the bus fare'], correct:1,
    explain:'Keep $4 for the bus first. That leaves $6 to spend or keep.' },
  { id:'save', purpose:'Put money aside for a goal or a surprise cost.',
    why:'Keeping savings in their own bucket makes it easier to leave them alone. Small amounts add up over time.',
    example:'Put $5 away each week and you’ll have $25 after five weeks.', prompt:'You want $45 for sports gear in five weeks. How much can you put aside each week to get there?',
    answers:['$5 each week','$9 each week'], correct:1,
    explain:'Five lots of $9 add up to $45.' },
  { id:'invest', purpose:'Set money aside for a long-term goal.',
    why:'Investing can grow your money over time, but its value can fall. Keep money you’ll need soon in Save.',
    example:'Keep money for next month’s school trip in Save.', prompt:'A $20 pretend investment rises to $23, then falls to $18. Where did you finish?',
    answers:['$2 below the start','$2 above the start'], correct:0,
    explain:'Compare $18 with the original $20, even though the value was higher earlier.' },
  { id:'give', purpose:'Support people or causes you care about.',
    why:'Planning what you can afford to give helps you support a cause and still cover your own needs.',
    example:'Put $2 aside for a school fundraiser if it fits your budget.', prompt:'You have $5 in Give. The school art drive asks for supplies. Which plan uses your Give bucket?',
    answers:['Buy $7 of supplies','Choose supplies that cost $5'], correct:1,
    explain:'You can support the art drive and stay within the $5 you set aside.' }
];

function bucketLesson(p, name, description, index) {
  const current = activeWeek(p).index % programmeLength === index;
  return `<div><strong>${tr(name)}</strong><p>${tr(description)}</p>
    ${current ? button('Open this week’s lesson','task','data-id="learning"','small') : `<small>${tr('Week')} ${index+1}</small>`}
  </div>`;
}

function bucketDialog(p) {
  if ((p.customBuckets?.length ?? 0) >= 12) {
    openDialog(tr('Add a bucket'), `<p>${tr('You can create up to 12 extra buckets.')}</p>`);
    return;
  }
  openDialog(tr('Add a bucket'), form('add-bucket',
    textField(tr('Bucket name'), 'bucketName', tr('For example, school camp or a new bike.'), '', 32) +
    textField(tr('What is it for?'), 'bucketPurpose', tr('Describe what this bucket helps you plan for.'), '', 90) +
    `<fieldset class="bucket-art-picker"><legend>${tr('Choose an image')}</legend>
      ${accountArt.map((art,i) => `<label class="bucket-art-${art.id}"><input type="radio" name="bucketArt" value="${art.id}" ${i === 0 ? 'checked' : ''} required>
        <span class="bucket-picture" aria-hidden="true"><span></span></span><span>${tr(art.name)}</span></label>`).join('')}
    </fieldset>`, tr('Create bucket')));
}

function investmentsView(p) {
  const result = accounts(p), week = activeWeek(p);
  return `<header class="bucket-page-heading">
    <div><span class="eyebrow">${esc(tr("GAME BANK"))}</span><h1>${tr('My money buckets')}</h1><p>${tr('Give each dollar a job. These practice accounts use the money you record in the game.')}</p></div>
    <p class="bucket-total"><span>${tr('Total in Main and buckets')}</span><strong>${money(result.main + result.balances.reduce((sum, value) => sum + value, 0))}</strong></p>
  </header>
  <section class="panel bank-overview ledger-toolbar" aria-label="Main account">
    <div>${mainAccount(p)}<p>${tr('Money you log lands here. Move it to a bucket when you have a plan.')}</p></div>
    <div class="bank-actions">${bankActions(p, { secondary: true })}</div>
  </section>
  <section class="panel bucket-guide" aria-labelledby="bucket-guide-title">
    <h2 id="bucket-guide-title">${tr('Why split your money?')}</h2>
    <p>${tr('Give each dollar a job before you spend it. Keeping your money in separate buckets helps you see what you can use today and what you’re keeping for later. You choose how much goes into each bucket.')}</p>
  </section>
  <div class="section-title bucket-board-heading"><h2>${tr('Your buckets')}</h2>
    ${button(tr('Add a bucket'), 'add-bucket', '', 'primary')}</div>
  <div class="bucket-board">${allAccounts(p).map((name, index) => {
    const adventure = bucketAdventures[index];
    const custom = p.customBuckets?.[index - accountNames.length];
    const art = adventure?.id ?? accountArt.find(option => option.id === custom.art)?.id ?? 'spend';
    return `<section class="bucket-adventure bucket-art-${art}" id="bucket-account-${index}" aria-labelledby="bucket-heading-${index}" tabindex="-1">
    <div class="bucket-card-copy"><h2 id="bucket-heading-${index}">${esc(name)}</h2>
      <p class="bucket-amount"><strong>${money(result.balances[index])}</strong><small>${tr('Available balance')}</small></p>
    </div>
    <div class="bucket-faces">
      <div class="bucket-front"><div class="bucket-picture" aria-hidden="true"><div></div></div><p>${adventure ? tr(adventure.purpose) : esc(custom.purpose)}</p></div>
      ${adventure ? `<div class="bucket-back" id="bucket-why-${index}" inert><p>${tr(adventure.why)}</p><p><strong>${tr('Try this')}</strong> ${tr(adventure.example)}</p></div>` : ''}
    </div>
    <div class="bucket-card-actions">
      ${adventure ? button(tr('Why this bucket?'), 'bucket-why', `aria-label="${tr('Why this bucket?')} ${esc(name)}" aria-expanded="false" aria-controls="bucket-why-${index}"`, 'small bucket-why') : ''}
      ${week.closed ? '' : button(tr('Move money'), 'move-money', `data-index="${index}" aria-label="${tr('Move money')} · ${esc(name)}"`, 'small')}
    </div>
  </section>`; }).join('')}</div>
  <details class="panel bucket-practice">
    <summary>${tr('Practise with a quick decision')}</summary>
    <div class="bucket-practice-list">${bucketAdventures.map((adventure, index) => `<details class="bucket-decision">
      <summary>${accountNames[index]}</summary>
      <p>${tr(adventure.prompt)}</p>
      <div class="bucket-answers">${adventure.answers.map((answer, option) => button(tr(answer),'bucket-answer',`data-id="${adventure.id}" data-index="${option}" aria-pressed="false"`,'small')).join('')}</div>
      <p class="bucket-feedback" role="status" aria-atomic="true"></p>
    </details>`).join('')}</div>
    <section class="bucket-practice-lessons" aria-labelledby="bucket-practice-lessons-title">
      <h3 id="bucket-practice-lessons-title">${tr('Related lessons')}</h3>
      <div class="bucket-practice-list">
        <details class="bucket-topic"><summary>Savings accounts</summary>
          ${bucketLesson(p, 'Saving for a goal', 'Choose your target, then work out what to put aside each week.',7)}
        </details>
        <details class="bucket-topic"><summary>${esc(tr("Shares, funds & KiwiSaver"))}</summary>
          ${bucketLesson(p, 'Shares and funds', 'Explore how a practice investment can go up and down.',8)}
          ${bucketLesson(p, 'KiwiSaver', 'Think about goals that are a long way off, such as saving for retirement.',9)}
        </details>
      </div>
    </section>
  </details>
  <div class="bucket-page-footer">${button(tr('Open my Money log'),'view','data-view="money"','small')}</div>`;
}

function groupStandings() {
  return state.players.map(p => ({ id:p.id, name:p.name, score:learningStats(p).xp }))
    .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name,language));
}
function learnerLeaderboard(p) {
  if (isHomeGame() || !state.showLearnerLeaderboard || state.players.length < 2) return '';
  return `<section class="panel list-section learner-leaderboard" aria-labelledby="learner-leaderboard-title">
    <h2 id="learner-leaderboard-title">${tr('Group leaderboard')}</h2>
    <p>${tr('See where you stand in your group. Rankings use Learning XP.')}</p>
    ${scoreboard(groupStandings(), 'Learning XP', p.id)}</section>`;
}
function scoreboard(rows, metric, currentId) {
  let rank = 0;
  return `<div class="table-wrap" role="region" aria-label="${tr('Leaderboard table')}" tabindex="0"><table>
    <thead><tr><th scope="col">${tr('Rank')}</th><th scope="col">${tr('Learner')}</th><th scope="col">${tr(metric)}</th></tr></thead>
    <tbody>${rows.map((row,i) => {
      if (i === 0 || row.score !== rows[i-1].score) rank = i + 1;
      const learner = state.players.find(p => p.id === row.id);
      const current = currentId === row.id;
      return `<tr${current ? ' class="my-leaderboard-row"' : ''}><td>${rank}</td>
        <td>${learner ? identity(learner) : esc(row.name)}${current ? pill(tr('You'), 'green') : ''}</td><td><strong>${row.score}</strong></td></tr>`;
    }).join('') || `<tr><td colspan="3">${tr('Add learners to see the leaderboard.')}</td></tr>`}</tbody></table></div>`;
}
function classCompetitions() {
  const board = groupStandings();
  return `<section class="panel list-section"><div class="section-title"><div><h2>${esc(tr("Class leaderboard"))}</h2><p>${esc(tr("Ranked by completed learning activities."))}</p></div>
    ${state.players.length ? button('Create competition','new-competition','','primary') : ''}</div>
    <div class="leaderboard-sharing">${button(tr('Show leaderboard on learner dashboards'), 'toggle-leaderboard', `aria-pressed="${Boolean(state.showLearnerLeaderboard)}"`, 'secondary')}
      <span class="detail">${tr(state.showLearnerLeaderboard ? 'Visible to learners in this group' : 'Hidden from learners in this group')}</span></div>
    ${scoreboard(board,'Learning XP')}</section>
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
  <div class="stats">${[['Learners',state.players.length],['Awaiting review',pending.length],['Ready for check-in',ready.length],['Finished programme',state.players.filter(p => p.weeks[programmeLength - 1]?.closed).length]].map(([label,value]) => `<article class="panel"><span>${tr(label)}</span><strong>${value}</strong></article>`).join('')}</div>
  ${classCompetitions()}
  <section class="panel ledger"><div class="section-title"><h2>${esc(tr("Review queue"))}</h2>${state.players.some(p => !p.solo && !activeWeek(p).closed) ? button('Assign activity', 'assign') : ''}</div>
  ${pending.length ? `<ul class="review-list">${pending.map(({ p, t }) => `<li><div><strong>${esc(p.name)} · ${esc(tr(taskName(t)))}</strong><p>${tr('Week')} ${activeWeek(p).index + 1} · ${tracks[p.track]}</p></div>${button('Review', 'review', `data-player="${p.id}" data-id="${t.id}"`, 'small')}</li>`).join('')}</ul>` : '<p>New submissions will appear here.</p>'}</section>
  <section class="panel ledger spaced"><h2>${esc(tr("Learners"))}</h2><div class="table-wrap" role="region" aria-label="Learner roster" tabindex="0"><table><thead><tr><th scope="col">${esc(tr("Learner"))}</th><th scope="col">${esc(tr("Current module"))}</th><th scope="col">${esc(tr("This week"))}</th><th scope="col">Missions</th><th scope="col">${esc(tr("Videos"))}</th><th scope="col">${esc(tr("Quizzes"))}</th><th scope="col">XP</th><th scope="col">${esc(tr("Action"))}</th></tr></thead>
  <tbody>${state.players.map(p => {
    const w = activeWeek(p), stats = learningStats(p);
    const required = w.tasks.filter(task => task.required);
    const completed = required.filter(task => task.status === 'approved').length;
    const status = weekOneLocked(p) ? tr('Starts {date}', { date: scheduleDate(weekStartDate(weekSchedule(p), 0)) })
      : w.closed ? nextWeekNote(p) || 'Programme complete' : p.solo ? 'Solo practice' : totals(w).ready ? 'Ready for check-in' : w.tasks.some(t => t.status === 'submitted') ? 'Awaiting review' : w.tasks.some(t => t.status !== 'todo') || w.transactions.length ? 'In progress' : 'To start';
    return `<tr><td>${identity(p)}<div class="detail">${tracks[p.track]}</div></td><td><strong>${tr('Week')} ${w.index + 1}</strong><div class="detail">${esc(moduleTitle(p,w.index))}</div></td><td>${pill(status, status === 'Ready for check-in' || w.closed ? 'green' : '')}<div class="detail">${completed} / ${required.length} required complete</div></td><td>${stats.missions}</td><td>${stats.videos}</td><td>${stats.quizzes}</td><td>${stats.xp}</td><td>${button('Open learner', 'learner-detail', `data-player="${p.id}"`, 'small')}${!p.solo && totals(w).ready && !w.closed ? button('Check in', 'close-week', `data-player="${p.id}"`, 'small') : ''}</td></tr>`;
  }).join('')}</tbody></table></div></section>
  <p class="detail">${workspace.active === 'test' ? 'Sample learners and activity for trying the teacher view.' : 'This class shares one browser. The facilitator PIN gates the teacher view on this device.'}</p>`;
}
function groupDisplayName(group) {
  const name = group.players[0]?.name;
  if (group.kind === 'home' && name && group.group === name + '’s home game') {
    return tr('{name}’s home game', { name });
  }
  return group.group;
}
function homeView() {
  const homeGames = workspace.groups.filter(({data}) => data.kind === 'home');
  const homeGame = homeGames.find(group => group.id === workspace.active) ?? homeGames.at(-1);
  const classGame = assignedClass();
  const classLearner = classGame?.data.players.find(p => p.id === classGame.data.current);
  const homeAttrs = homeGame ? `data-id="${esc(homeGame.id)}"` : '';
  return `<section class="welcome">
    <div><div class="eyebrow">SUCCESS AVENUE MONEY</div><h1>The Lucas Money Game</h1>
      <p>${esc(tr('Start a small business or try a paid activity, then work towards something you want to save for. Ask a parent or caregiver to help with your weekly check-ins.'))}</p>
      ${homeGame ? `<label for="home-group">${esc(tr('Home game'))}<select id="home-group">${homeGames.map(({ id, data }) =>
        `<option value="${esc(id)}"${id === homeGame.id ? ' selected' : ''}>${esc(groupDisplayName(data))}</option>`).join('')}</select></label>` : ''}
      <div class="action-row">
        ${homeGame ? button('Continue my game', 'resume-home', homeAttrs, 'primary') : ''}
        ${button('Start a new game', 'new-home', '', homeGame ? 'secondary' : 'primary')}
      </div>
      ${homeGame ? `<div class="action-row">${button('Open parent view', 'resume-parent', homeAttrs, 'small')}</div>` : ''}
    </div>
    <div class="welcome-route"><strong>${esc(tr("Savings milestones"))}</strong><div class="welcome-milestones">${savingsMilestones.map(percent => `<span>${percent}%</span>`).join('')}</div><p>${esc(tr("Earn badges as you close in on your goal."))}</p></div>
  </section>
  <div class="welcome-grid">
    <section class="panel start-panel"><h2>${esc(tr('Class games'))}</h2>
      ${classLearner ? `<p>${esc(tr('Class learner on this device'))} · <strong>${esc(classLearner.name)}</strong></p>${button('Continue class game', 'resume-class')}` : ''}
      ${button('Start a class', 'new-group')}
      ${classGroups().length ? button('Open teacher dashboard', 'open-facilitator') : ''}
    </section>
    <section class="panel start-panel"><h2>${esc(tr('Try the demo'))}</h2>
      <p>${esc(tr('The test group lets you try the game with sample learners and submissions.'))}</p>
      ${button(workspace.sample ? 'Resume demo' : 'Play the demo', 'test-group')}
      ${workspace.sample ? button('Open demo teacher dashboard', 'open-demo-teacher', '', 'small') : ''}
      <div class="lesson">
        <p>${esc(tr('Jump to the Family Money Showdown with a sample learner.'))}</p>
        ${button('Try Week 12', 'week-12-demo')}
      </div>
      ${button('View setup instructions', 'view', 'data-view="setup"', 'small')}
    </section>
  </div>`;
}
function setupView() {
  return `${pageHeader('GETTING STARTED', 'Setup instructions', 'Choose how you want to play on this device.')}
  <div class="help-grid">
    <section class="panel help-panel"><h2>${esc(tr("Play at home"))}</h2>
      <ol class="setup-steps">
        <li>${esc(tr("Choose a business or paid activity and set a savings goal."))}</li>
        <li>${esc(tr("Ask your parent or caregiver to open their view. Together you can plan your first week or add a mission."))}</li>
        <li>${esc(tr("Record what you earn and spend, then submit your missions. Review them together to finish the week."))}</li>
      </ol>${button('Start a new game', 'new-home', '', 'primary')}
    </section>
    <section class="panel help-panel"><h2>${esc(tr("Play in a group"))}</h2>
      <ol class="setup-steps">
        <li>${esc(tr("Create a group for your class, club or household with multiple learners."))}</li>
        <li>${esc(tr("Open the facilitator view. Adjust the weekly money rules in Settings if needed, then choose Add learner for each person."))}</li>
        <li>${esc(tr("Open a learner record to review their work. Choose Hand device to learner to open their dashboard."))}</li>
      </ol><div class="action-row">${button('Start a new group', 'new-group')}${button(workspace.sample ? 'Resume demo' : 'Play the demo', 'test-group')}</div>
    </section>
  </div><p class="detail spaced">${esc(tr("Games and progress are saved in this browser. Learners and facilitators use the same saved game on this device."))}</p>`;
}

function aboutPanel() {
  return `<section class="panel help-panel">
    <h2>${esc(tr("About Success Avenue Money"))}</h2>
    <p>Success Avenue Money helps people learn practical money skills through stories, lessons and quizzes. The game gives learners a place to try those skills over 12 weeks, with more practice afterwards.</p>
    <p>${esc(tr("Profiles and progress are stored in this browser. The game uses practice account balances and simulated tax."))}</p>
    <p><a href="https://www.successavenuemoney.com/about" target="_blank" rel="noopener noreferrer">${esc(tr("Visit Success Avenue Money (new tab)"))}</a></p>
  </section>`;
}
function publicHelpView() {
  return `${pageHeader('THE LUCAS MONEY GAME', 'About & Help', 'A 12-week business game for practising everyday decisions about earning, spending and saving.')}
  <div class="help-grid">
    <section class="panel help-panel"><h2>${esc(tr("Getting started"))}</h2>
      <p>From Home, start a home game, try the test group or set up a group for multiple learners. The setup guide walks you through choosing a way to play and preparing the first week.</p>
      <div class="action-row">${button('View setup instructions', 'view', 'data-view="setup"', 'primary')}${button('Back to Home', 'view', 'data-view="home"')}</div>
    </section>
    ${aboutPanel()}
  </div>`;
}
function learnerHelpView() {
  return `${pageHeader('LEARNER', 'About & Help', 'Get help with your weekly missions, money log and rewards.')}
  <div class="help-grid">
    <section class="panel help-panel"><h2>${esc(tr("How to play"))}</h2>
      <p>Start with the quest trail on your dashboard. If you don’t have a real job or business, you can still play Challenges using game money.</p>
      <ol>
        <li><strong>Try it in real life.</strong> Choose what you’ll do and what you’ll charge. Use Business mission to log the job and actual income and costs. For chores, agree on pay with your adult and have them set up Agreed chores.</li>
        <li><strong>Complete your missions.</strong> Open Money lesson to take the weekly quiz. Answer the specific question under Money habit. The arcade challenge is optional until the Week 12 family challenge.</li>
        <li><strong>Close the week.</strong> Choose <em>${esc(tr("Settle the week"))}</em> in solo practice. In a mentored game, your facilitator reviews the missions and records a check-in. Then choose <strong>Start next week</strong> in a learner-paced game, or wait for the next scheduled date.</li>
      </ol>
      ${button('Back to this week', 'view', 'data-view="week"', 'primary')}
    </section>
    <section class="panel help-panel"><h2>${esc(tr("How the money works"))}</h2>
      <p><strong>Sales − costs = profit before tax.</strong> A simulated tax rate applies when there’s a profit. If costs are higher than sales, the loss stays in your history. Main shows how much you still need to cover.</p>
      <dl class="bucket-help">
        <div><dt>${esc(tr("Spend"))}</dt><dd>Money for things you need or want now.</dd></div>
        <div><dt>${esc(tr("Save"))}</dt><dd>Money set aside for your goal. Your goal meter uses this bucket.</dd></div>
        <div><dt>${esc(tr("Invest"))}</dt><dd>Money earmarked for longer-term growth in the simulation.</dd></div>
        <div><dt>${esc(tr("Give"))}</dt><dd>Money earmarked to support people or causes you choose.</dd></div>
      </dl>
      <p>Business earnings and activity rewards go into Main. Personal purchases come out of Spend. Business costs come out of Main. Use Move money to transfer to a bucket or back to Main. Unallocated money stays in Main for next week.</p>
    </section>
    <section class="panel help-panel"><h2>${esc(tr("Badges and profile rewards"))}</h2>
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
        <li><strong>Run a check-in.</strong> Review and approve all required missions. Record the check-in to close the week. The learner can then start the next week manually, or it opens automatically on its scheduled date.</li>
      </ol>
      ${button('Back to ' + dashboardLabel().toLowerCase(), 'view', 'data-view="group"', 'primary')}
    </section>
    <section class="panel help-panel"><h2>Money rules and lessons</h2>
      <p>In Settings, add a SAM lesson link and set the simulated tax rate, suggested bucket percentages and weekly rewards for newly opened weeks. ${isHomeGame() ? 'Changes to money rules apply from the next week that opens.' : 'Set the rules before adding learners if you want them to apply from Week 1.'}</p>
      <p>The learner record shows the week’s sales, expenses, simulated tax, transfers and check-in notes.</p>
    </section>
    ${aboutPanel()}
  </div>`;
}

const scheduleLabels = { group: 'Use class setting', manual: 'Learner-paced', scheduled: 'Scheduled' };
function scheduleFields(schedule, inherit = false, conditionalDate = false) {
  const selected = schedule?.mode ?? (inherit ? 'group' : 'manual');
  const modes = inherit ? ['group', 'manual', 'scheduled'] : ['manual', 'scheduled'];
  const mode = field('Week progression', 'weekMode', 'Learner-paced lets the learner start the next week after completing this one. Scheduled weeks open automatically when both the date and completion requirements are met.',
    `<select name="weekMode">${modes.map(value => `<option value="${value}"${selected === value ? ' selected' : ''}>${tr(scheduleLabels[value])}</option>`).join('')}</select>`);
  const start = field('Programme start date', 'weekStart', 'Required for Scheduled. Week 1 starts on this date, with each later week scheduled seven days apart.',
    `<input name="weekStart" type="date" value="${esc(schedule?.startDate)}"${conditionalDate && selected === 'scheduled' ? ' required' : ''}>`);
  return mode + (conditionalDate ? `<div data-setup-date${selected === 'scheduled' ? '' : ' hidden'}>${start}</div>` : start);
}

function readWeekSchedule(value) {
  const mode = value('weekMode'), startDate = value('weekStart');
  if (mode === 'group') return null;
  if (mode === 'manual') return { mode };
  if (mode === 'scheduled' && validStartDate(startDate)) return { mode, startDate };
}

function settingsView() {
  return `${pageHeader('FACILITATOR', 'Pilot settings', isHomeGame() ? 'Money rules apply to newly opened weeks.' : 'Money rules apply to newly opened weeks. The schedule applies to learners using the class setting.')}
  <form class="panel settings" id="settings"><div class="fields">
  ${field(isHomeGame() ? 'Home game name' : 'Group name', 'group', 'Use a name you’ll recognise when you resume the game from Home.', `<input name="group" value="${esc(state.group)}" required maxlength="60">`)}
  ${!isHomeGame() ? scheduleFields(state.weekSchedule) : ''}
  ${field('SAM or Vimeo video (optional)', 'lessonUrl', 'Paste a direct SAM link, Vimeo link or Vimeo iframe code.', `<textarea name="lessonUrl" rows="2" placeholder="https://">${esc(state.lessonUrl)}</textarea>`)}
  ${field('SAM quiz link (optional)', 'quizUrl', 'Used when there is no built-in school quiz and a matching video is assigned. Weekly overrides take priority.', `<input type="url" name="quizUrl" value="${esc(state.quizUrl)}" placeholder="https://">`)}
  ${field('Simulated tax rate (%)', 'tax', 'The percentage of positive weekly business profit taken as simulated tax before money is available to move from Main.', `<input type="number" name="tax" min="0" max="100" required value="${state.rules.tax}">`)}
  ${field('Weekly completion bonus (points)', 'bonus', 'Extra points awarded when all required missions are complete and the week closes.', `<input type="number" name="bonus" min="0" max="1000" required value="${state.rules.bonus}">`)}
  ${field('Simulated savings match (%)', 'match', 'Adds a percentage of what the learner moved into Save that week, after any transfers back when the week closes. At 50%, $10 saved earns a $5 match before the cap.', `<input type="number" name="match" min="0" max="100" required value="${state.rules.match}">`)}
  ${field('Weekly match cap (NZD)', 'cap', 'The most the game can add to Save through matching in one week, in New Zealand dollars.', `<input type="number" name="cap" min="0" max="100000" step=".01" required value="${state.rules.cap / 100}">`)}</div>
  <details class="lesson"><summary>${esc(tr('Videos for Weeks 7–12'))}</summary>
    <p>${esc(tr('Set the matching video for each quiz. A learner’s weekly video override takes priority.'))}</p>
    <p class="detail">${esc(tr('The supplied quizzes are drafts. Confirm video-specific answers against the final scripts before publishing.'))}</p>
    <div class="fields">${videoQuizWeeks.map(index => field(tr('Week') + ' ' + (index + 1) + ' · ' + schoolQuizFor(index).title, 'week-video-' + index,
      'Paste a direct SAM link, Vimeo link or Vimeo iframe code.',
      `<textarea name="week-video-${index}" rows="2">${esc(state.weeklyVideos?.[index])}</textarea>`)).join('')}</div>
  </details>
  <fieldset><legend>Suggested bucket split</legend><div class="fields split">${buckets.map((name,i) => field(name + ' (%)', 'split-' + i, 'Suggested percentage to put into ' + name + '. The four percentages must add up to 100.', `<input name="split" type="number" min="0" max="100" required value="${state.rules.split[i]}">`)).join('')}</div></fieldset>
  <p class="detail">Bucket percentages must add up to 100.</p><p class="error" role="alert"></p><button class="button primary">${esc(tr("Save settings"))}</button></form>`;
}
function render() {
  document.documentElement.lang = language;
  $('#game-language').value = language;
  $('#language-label').textContent = tr('Language');
  $('#storage-note').textContent = tr(week12Demo ? 'Week 12 demo · Progress resets when you leave' : '12-week programme · Progress is stored in this browser');
  $('.brand').setAttribute('aria-label', tr('The Lucas Money Game, home'));
  $('#nav').setAttribute('aria-label', tr('Game sections'));
  $('.skip').textContent = tr('Skip to content');
  const isPublic = publicRoutes.has(view);
  const p = isPublic ? undefined : player();
  $('#role').innerHTML = !isPublic && state && (role === 'learner' ? isHomeGame() : p)
    ? button(role === 'learner' ? facilitatorLabel() : 'Learner view', 'switch-role', '', 'role-switch') : '';
  const links = isPublic
    ? [['home','Home'], ['setup','Setup instructions'], ['public-help','About &amp; Help']]
    : role === 'learner'
      ? [['dashboard','Dashboard'], ['challenges','Challenges'], ['week','Missions'], ['money','Money log'], ['investments','Money buckets'], ['progress','My progress'], ['shop','Profile shop'], ['learner-help','About &amp; Help']]
      : [['home','Home'], ['group',dashboardLabel()], ['teacher-challenges','Challenges &amp; rewards'], ['settings','Settings'], ['facilitator-help','About &amp; Help']];
  $('#nav').innerHTML = links.map(([id,label]) => `<button type="button" data-action="view" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${esc(tr(label.replace(/&amp;/g,'&')))}</button>`).join('');
  const sections = { home: homeView, setup: setupView, 'public-help': publicHelpView, 'learner-help': learnerHelpView, 'facilitator-help': facilitatorHelpView, detail: learnerDetail, 'teacher-challenges':teacherChallengesView, challenges:challengesView, dashboard: dashboardView, investments: investmentsView, week: weekView, money: moneyView, progress: progressView, shop: shopView, group: groupView, settings: settingsView };
  if (language !== 'en-NZ') $('#language-label').title = tr('Some learning content is in English.');
  else $('#language-label').removeAttribute('title');
  document.body.dataset.role = role ?? 'public';
  document.body.dataset.skin = !isPublic && role === 'facilitator' ? 'staff' : p?.track === 0 ? 'junior' : p?.track === 2 ? 'teen' : 'arcade';
  const translationNote = language === 'en-NZ' ? '' : `<p class="group-context" lang="${language}">${tr('Some learning content is in English.')}</p>`;
  const context = !isPublic && state ? `<p class="group-context">${week12Demo ? tr('Week 12 demo · Sample data')
    : workspace.active === 'test' ? tr('Test group · Sample data') : esc(groupDisplayName(state))}</p>` : '';
  const content = role === 'learner' && weeklyViews.has(view) && weekOneLocked(p)
    ? pageHeader('LUCAS MONEY GAME', 'Week 1 is scheduled', tr('Your programme starts on {date}.', { date: scheduleDate(weekStartDate(weekSchedule(p), 0)) }))
    : sections[view](view === 'detail' ? state.players.find(other => other.id === detailPlayerId) : p);
  $('#main').innerHTML = '<p id="notice" class="toast" role="status" tabindex="-1" hidden></p>' + context + translationNote + teacherGroupControls() + content;
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
    $('#lesson-status').textContent = tr('Practice video complete.');
  };
  video.addEventListener('timeupdate', measure);
  video.addEventListener('ended', measure);
  video.addEventListener('seeked', () => { previous = video.currentTime; });
  video.addEventListener('error', () => {
    $('#lesson-status').textContent = 'This video couldn’t load. Reopen the lesson and try again.';
  });
}
dialog.addEventListener('close', () => {
  if (!dialog.open) {
    resetMarketDay();
    dialog.classList.remove('arc-quiz');
    learnerSetup = undefined;
    familyTurn = undefined;
  }
});
function openDialog(title, body) {
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title" tabindex="-1">${tr(title)}</h2>${button('Close', 'dismiss', `aria-label="${esc(tr('Close dialog'))}"`, 'small')}</div>${body}`;
  if (!dialog.open) dialog.showModal();
  $('#dialog-title').focus();
}
function form(action, body, label, attrs = '') {
  return `<form data-form="${action}" ${attrs}>${body}<p class="error" role="alert"></p><div class="dialog-actions"><button class="button primary">${tr(label)}</button></div></form>`;
}
function field(label, id, hint, control) {
  const input = control.replace(/^<(input|select|textarea)/, `<$1 id="${id}" aria-describedby="tip-${id}"`);
  return `<div class="field"><div class="field-heading"><label for="${id}">${tr(label)}</label><button type="button" class="field-tip" data-action="field-tip" aria-label="${esc(tr('Help for {field}', { field: tr(label) }))}" aria-expanded="false" aria-controls="tip-${id}">?</button></div>
    ${input}<div class="tip-text" id="tip-${id}" hidden>${esc(tr(hint))}</div></div>`;
}
function textField(label, name, hint, value = '', limit = 80, required = true) {
  return field(label, name, hint, `<input name="${name}" value="${esc(value)}" maxlength="${limit}" ${required ? 'required' : ''}>`);
}
function noteField(label, name, hint, value = '', required = true) {
  return field(label, name, hint, `<textarea name="${name}" rows="4" maxlength="600" ${required ? 'required' : ''}>${esc(value)}</textarea>`);
}
function familyBrief(scenario, advanced) {
  return `<h3>${esc(tr(scenario.title))}</h3><p>${esc(tr(scenario.story))}</p>
    <p><strong>${esc(tr('Ask your partner'))}</strong> · ${esc(tr(scenario.ask))}</p>
    ${advanced === undefined ? '' : `<details ${advanced ? 'open' : ''}><summary>${esc(tr('Optional · Go further'))}</summary><p>${esc(tr(scenario.stretch))}</p></details>`}`;
}
function familyAnswers(response) {
  const scenario = familyCases.find(item => item.id === response.scenario);
  return `<div class="lesson">${scenario ? familyBrief(scenario) : ''}
    ${response.milestone ? `<p><strong>${esc(tr('Progress I shared'))}</strong> · ${esc(familyMilestoneLabel(response.milestone))}</p>` : ''}
    <dl class="family-answers">${familyQuestions.map(({ key, label }) =>
      `<dt>${esc(tr(label))}</dt><dd>${esc(response[key])}</dd>`).join('')}</dl></div>`;
}
const familyMilestones = {
  missions: { icon: '⚡', label: 'Missions completed', prompt: 'Pick one mission you remember. What can you do now that you couldn’t do before?' },
  quizzes: { icon: '💡', label: 'Quizzes completed', prompt: 'Remember one idea from a quiz. How would you explain it in your own words?' },
  weeks: { icon: '🗓️', label: 'Weeks closed', prompt: 'Think back to an early week. What is one habit you’ve got better at since then?' },
  certificates: { icon: '🏆', label: 'Weekly certificates', prompt: 'Choose a challenge you completed. What decision did you make, and what did it teach you?' },
  skill: { icon: '🌱', label: 'A skill I’m practising', prompt: 'Pick one idea you can explain today. Try needs and wants, saving for a goal, or keeping money aside for a surprise.' }
};

function familyProgress(p) {
  const { missions, quizzes } = learningStats(p);
  return [
    { id: 'missions', count: missions },
    { id: 'quizzes', count: quizzes },
    { id: 'weeks', count: p.weeks.filter(week => week.closed).length },
    { id: 'certificates', count: weeklyCertificates(p).length },
    { id: 'skill', count: null }
  ];
}
function familyMilestoneLabel(milestone) {
  if (!milestone || !Object.hasOwn(familyMilestones, milestone.id)) return '';
  const { label } = familyMilestones[milestone.id];
  return milestone.count === null ? tr(label) : tr(label) + ' · ' + milestone.count;
}
function familyProgressCards(progress, selected) {
  return `<fieldset class="family-picks"><legend>${esc(tr('My progress · Choose one thing to share'))}</legend>
    <div class="family-card-grid">${progress.map(({ id, count }) => {
      const { icon, label } = familyMilestones[id];
      if (count === 0) return '';
      return `<label class="family-choice"><input type="radio" name="milestone" value="${id}" ${id === selected ? 'checked' : ''}>
        <span aria-hidden="true">${icon}</span><span><strong>${esc(tr(label))}</strong>${count === null ? '' : `<span class="family-count">${count}</span>`}</span></label>`;
    }).join('')}</div>
    <div id="family-milestone-prompt" class="lesson family-brief" aria-live="polite"><p>${esc(tr(familyMilestones[selected].prompt))}</p></div>
  </fieldset>`;
}
function familyGuideField(key, response) {
  const question = familyQuestions.find(item => item.key === key);
  return `<div class="family-writing">
    <div class="field"><label for="family-answer-${key}">${esc(tr(question.label))}</label>
    <p id="family-hint-${key}">${esc(tr(question.tip))}</p>
    <textarea id="family-answer-${key}" aria-describedby="family-hint-${key}" name="${key}" rows="3" maxlength="600" required>${esc(response?.[key] ?? '')}</textarea></div>
    <details><summary>${esc(tr('Need a sentence starter?'))}</summary><p>${esc(tr(question.starter))}</p></details>
  </div>`;
}

const familyStages = ['Show & teach', 'Decide together', 'Choose a next step'];
const familyStageFields = ['skill', 'tradeoff', 'next'];
function showFamilyStage(form, index, focus = false) {
  form.dataset.step = index;
  form.querySelectorAll('[data-family-stage]').forEach(section => {
    section.hidden = Number(section.dataset.familyStage) !== index;
  });
  form.querySelectorAll('.family-steps li').forEach((step, position) => {
    if (position === index) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
    step.classList.toggle('done', position < index);
  });
  form.querySelector('[data-action="family-back"]').hidden = index === 0;
  form.querySelector('[data-action="family-next"]').hidden = index === familyStages.length - 1;
  form.querySelector('button[type="submit"]').hidden = index !== familyStages.length - 1;
  form.querySelector('.error').textContent = '';
  if (focus) form.querySelector(`[data-family-stage="${index}"] h3`).focus();
}
function familyGuide(p, task, response) {
  const practice = !task;
  const progress = familyProgress(p);
  const selected = progress.find(item => item.id === response?.milestone?.id && item.count !== 0)
    ?? progress.find(item => item.count !== 0);
  const scenario = familyCases.find(item => item.id === response?.scenario) ?? familyCases[0];
  return `<form data-form="${practice ? 'family-practice' : 'family-submit'}" data-step="0" novalidate>
    <ol class="family-steps" aria-label="${esc(tr('Challenge steps'))}">${familyStages.map((label, index) =>
      `<li ${index === 0 ? 'aria-current="step"' : ''}><span class="family-step-num">${index + 1}</span> ${esc(tr(label))}</li>`).join('')}</ol>
    <section data-family-stage="0">
      <h3 tabindex="-1">${esc(tr('Show what you’ve learnt'))}</h3>
      <p>${esc(tr('Do this with a parent, caregiver, trusted adult or your school facilitator. Show them something from your progress below, then teach them one money skill using a made-up example.'))}</p>
      ${familyProgressCards(progress, selected.id)}
      ${familyGuideField('skill', response)}
    </section>
    <section data-family-stage="1" hidden>
      <h3 tabindex="-1">${esc(tr('Solve a money decision together'))}</h3>
      <p>${esc(tr('Pick a pretend situation. Take turns saying what you’d do and why. Then name what your choice gives you and what you give up.'))}</p>
      <fieldset class="family-picks"><legend>${esc(tr('Choose a scenario'))}</legend>
      <div class="family-card-grid">${familyCases.map(item =>
        `<label class="family-choice"><input type="radio" name="scenario" value="${item.id}" ${scenario.id === item.id ? 'checked' : ''}>
          <span aria-hidden="true">${item.icon}</span><strong>${esc(tr(item.title))}</strong></label>`).join('')}</div></fieldset>
      <div id="family-brief" class="lesson family-brief" aria-live="polite">${familyBrief(scenario, p.track === 2)}</div>
      ${familyGuideField('tradeoff', response)}
    </section>
    <section data-family-stage="2" hidden>
      <h3 tabindex="-1">${esc(tr('Make a plan you can try'))}</h3>
      <p>${esc(tr('Agree on a small habit, who will try it and when. For example, “On Sunday we’ll make a pretend budget together so we can practise planning for a surprise cost.”'))}</p>
      ${familyGuideField('next', response)}
    </section>
    <p class="error" role="alert"></p>
    <div class="dialog-actions">
      ${button('Back', 'family-back', 'hidden')}
      ${button('Continue', 'family-next', '', 'primary')}
      <button type="submit" class="button primary" hidden>${esc(tr(practice || p.solo ? 'Finish and see my recap' : 'Submit for review and see my recap'))}</button>
    </div>
  </form>`;
}

function shuffledOptions(options) {
  const order = options.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function quizFields(quiz) {
  const type = quiz.picks === 2 ? 'checkbox' : 'radio';
  return `<div class="quiz-questions school-quiz" lang="en-NZ">${quiz.questions.map((question, i) => {
    const order = quiz.picks === 2 ? shuffledOptions(question.options) : question.options.map((_, j) => j);
    return `<fieldset><legend>${i + 1}. ${esc(question.question)}</legend><div class="quiz-options">
      ${order.map((j, position) => `<label><input type="${type}" name="answer-${i}" value="${j}" ${type === 'radio' ? 'required' : ''}>
        <span aria-hidden="true">${'ABCD'[position]}</span>${esc(question.options[j])}</label>`).join('')}
      </div></fieldset>`;
  }).join('')}</div>`;
}

function readQuiz(quiz, data) {
  return gradeSchoolQuiz(quiz, quiz.questions.map((_, i) => data.getAll('answer-' + i).map(Number)));
}
function quizInstructions(quiz) {
  return quiz.picks === 2 ? 'Choose exactly two answers for each question. Each correct choice scores one point.'
    : 'Choose one answer for each question.';
}
function videoQuizSource(module, index) {
  const assignment = samAssignment(module, index);
  if (assignment.video !== samVideoLibrary) return samVideo(assignment);
  return `<p>${esc(tr('Find the matching video in the SAM library.'))}</p>${samLink(samVideoLibrary, 'Open the SAM video library')}`;
}

function worksheetLink(quiz) {
  const content = `<!doctype html><html lang="en-NZ"><meta charset="utf-8"><title>${esc(quiz.title)}</title>
    <style>body{font:1rem/1.45 Arial,sans-serif;max-width:680px;margin:2rem auto;padding:0 1rem}li{margin-bottom:.45rem}section{break-inside:avoid;margin-block:1rem}</style>
    <h1>Week 12 Family Money Showdown</h1><h2>${esc(quiz.title)}</h2>
    <p>Watch the matching SAM video together. Print a copy for each player and select exactly two answers per question. Use the in-game quiz to score and record your turns.</p>
    ${quiz.questions.map((q, i) => `<section><strong>${i + 1}. ${esc(q.question)}</strong><ul>${q.options.map(option =>
      `<li><label><input type="checkbox"> ${esc(option)}</label></li>`).join('')}</ul></section>`).join('')}</html>`;
  return `<a class="button secondary" href="data:text/html;charset=utf-8,${esc(encodeURIComponent(content))}" download="Week-12-Family-Quiz.html">${esc(tr('Download the family quiz'))}</a>`;
}

function openFamilyShowdown(p) {
  const quiz = schoolQuizFor(familyWeek);
  dialog.classList.add('arc-quiz');
  familyTurn = undefined;
  openDialog(familyTitle, `<div class="lesson"><h3>${esc(quiz.title)}</h3>
    <p>${esc(tr('Watch this SAM video together, then take the same quiz one at a time. Finish both turns to complete the challenge.'))}</p>
    ${videoQuizSource(moduleFor(p, familyWeek), familyWeek)}</div>
    <div class="action-row">${button('Start learner’s turn', 'family-quiz-start', '', 'primary')}${worksheetLink(quiz)}</div>`);
}

function startWeek12Demo() {
  const sample = fresh();
  const [learner] = sample.players;
  sample.players = [learner];
  while (activeWeek(learner).index < familyWeek) {
    const week = activeWeek(learner);
    for (const task of week.tasks) Object.assign(task, { status: 'approved', evidence: 'Completed in the sample game.' });
    Object.assign(week, { closed: true, videoWatched: true, quizPassed: true });
    learner.weeks.push(makeWeek(week.index + 1, sample.rules));
  }
  grantAwards(learner, { checkSavings: true });
  state = week12Demo = sample;
  openRole('learner');
  openFamilyShowdown(learner);
}

function showFamilyQuizTurn(p, partner) {
  const quiz = schoolQuizFor(familyWeek);
  openDialog(partner ? 'Adult’s turn' : 'Learner’s turn', `<p>${esc(tr(quizInstructions(quiz)))}</p>
    ${form(partner ? 'family-quiz-partner' : 'family-quiz-learner', quizFields(quiz), 'Finish this turn', playerAttrs(p))}`);
  dialog.scrollTop = 0;
}

function showFamilyQuizResult(showdown) {
  const { scores, possible, learnerResult, partnerResult } = showdown;
  openDialog(familyTitle, `<p>${esc(tr('Learner {learner} / {total} · Adult {adult} / {total}', {
    learner: scores[0], adult: scores[1], total: possible
  }))}</p><p>${esc(tr('Compare one answer you chose differently and talk about why.'))}</p>
    ${quizResults(learnerResult, true, true)}${quizResults(partnerResult, false, false, 'Adult’s answer')}
    <p>${esc(tr('Your certificate is in My progress.'))}</p>
    ${week12Demo ? `<div class="action-row">${button('Replay Week 12 demo', 'week-12-demo', '', 'primary')}
      ${button('Home', 'view', 'data-view="home"')}</div>` : ''}`);
}

function finalFamilyTask(p) {
  const week = p && activeWeek(p);
  if (role !== 'learner' || !week || week.index !== familyWeek || week.closed) return;
  return week.tasks.find(task => task.id === 'family' && ['todo', 'revision'].includes(task.status));
}

function familyTaskDialog(p, task) {
  if (!task) return;
  if (task === finalFamilyTask(p) && !task.familyResponse) return openFamilyShowdown(p);
  if (task.showdown?.partnerResult) return showFamilyQuizResult(task.showdown);
  if (task.showdown) {
    openDialog(familyTitle, `<p>${esc(task.evidence)}</p>${quizResults(task.showdown.learnerResult, true)}<p>${esc(tr('Your certificate is in My progress.'))}</p>`);
    return;
  }

  const practice = !task;
  const editable = practice || ['todo', 'revision'].includes(task.status);
  const response = task?.familyResponse;
  const mark = task?.familyScores ? `<p><strong>${esc(tr('Facilitator mark'))}</strong> · ${task.familyScores.reduce((sum, score) => sum + score, 0)} / 6</p>` : '';
  const banner = practice ? `<p class="eyebrow">${esc(tr('PRACTICE ONLY'))}</p>
    <p>${esc(tr('Try the finale from any week. Practice answers disappear when you close the recap or leave the activity. Your progress and rewards stay the same.'))}</p>` : '';
  if (!editable) {
    openDialog(familyTitle, `<p>${esc(tr(statuses[task.status]))}</p>
      ${mark}
      ${task.feedback ? `<div class="feedback"><strong>${esc(tr('Feedback'))}</strong><p>${esc(task.feedback)}</p></div>` : ''}
      ${response ? familyAnswers(response) + button('Open family recap', 'family-recap') : ''}`);
    return;
  }
  openDialog(familyTitle, banner + `<p class="family-privacy">${esc(tr('Keep real pay, balances, debts and account details out of your answers.'))}</p>
    ${mark}
    ${task?.feedback ? `<div class="feedback"><strong>${esc(tr('Feedback'))}</strong><p>${esc(task.feedback)}</p></div>` : ''}
    ${familyGuide(p, task, response)}`);
}
function familyRecap(response, practice = false, message = '') {
  const scenario = familyCases.find(item => item.id === response.scenario);
  openDialog('Family challenge recap', `${message ? `<p role="status">${esc(tr(message))}</p>` : ''}
    <article class="certificate-sheet family-print">
      <div class="certificate-label">SUCCESS AVENUE MONEY · ${esc(tr(practice ? 'PRACTICE ONLY' : 'WEEK 12'))}</div>
      <h3>${esc(tr('Family Money Challenge'))}</h3>
      <p>${esc(tr(scenario.title))}</p>
      ${response.milestone ? `<h4>${esc(tr('Progress I shared'))}</h4><p>${esc(familyMilestoneLabel(response.milestone))}</p>` : ''}
      <h4>${esc(tr('The skill I shared'))}</h4><p>${esc(response.skill)}</p>
      <h4>${esc(tr('Our next step'))}</h4><p>${esc(response.next)}</p>
    </article>
    <section class="lesson family-resource"><h3>${esc(tr('Keep learning together on SAM'))}</h3>
      <p><strong>${esc(tr(scenario.tool === 'budget' ? 'SAM budget tool' : 'SAM finance tool'))}</strong> · ${esc(tr('Placeholder · link coming soon'))}</p>
      <p>${esc(tr(scenario.tool === 'budget' ? 'When available, use it together to sketch a budget for a goal you choose.' : 'When available, use it together to explore how a longer-term plan could change over time.'))}</p>
    </section>${button('Print family recap', 'print-certificate')}`);
}
function familyReviewDialog(p, task) {
  openDialog('Review Family Money Challenge', familyAnswers(task.familyResponse) +
    form('family-review',
      `<h3>${esc(tr('Mark out of 6'))}</h3>
       <p>${esc(tr('Score each skill using the written responses.'))}</p>
       ${familyQuestions.map(({ key, criterion }) => `<div class="field"><label for="score-${key}">${esc(tr(criterion))}</label>
       <select id="score-${key}" name="score-${key}" required><option value="">${esc(tr('Choose a mark'))}</option>
       <option value="0">${esc(tr('0 · Missing'))}</option><option value="1">${esc(tr('1 · Developing'))}</option>
       <option value="2">${esc(tr('2 · Clear and specific'))}</option></select></div>`).join('')}
       <div class="field"><label for="family-review-decision">${esc(tr('Decision'))}</label>
       <select id="family-review-decision" name="decision"><option value="approved">${esc(tr('Approve'))}</option>
       <option value="revision">${esc(tr('Ask for a revision'))}</option></select></div>
       ${noteField('Feedback', 'feedback', 'Say what worked or what to change. Feedback is required when asking for a revision.', '', false)}`,
      'Save review', playerAttrs(p)));
}

function canTakeSchoolQuiz(week, task) {
  return Boolean(task && (week.schoolQuizResult?.passed === false ||
    (!week.closed && (task.source === 'placeholder' || ['todo', 'revision'].includes(task.status) ||
      (videoQuizWeeks.includes(week.index) && !week.schoolQuizResult && ['reflection', 'sam'].includes(task.source))))));
}
function businessActivityForm(p, task) {
  const { name, income, cost, recordedElsewhere } = task?.activity ?? {};
  return `<p>${esc(tr('Enter what you actually earned and spent. Use 0 for no income or no cost.'))}</p>
    <p>${esc(tr('New entries go straight into your money log and Main. Use Move money to split what’s available into buckets.'))}</p>
    ${form('business-activity', textField('Activity done', 'activityName', 'Use the job or product name, such as Saturday car wash.', name ?? p.business) +
      `<div class="fields">${cashField('Actual income (NZD)', 'activityIncome', 'Use the total you were actually paid.', income ?? p.businessPrice)}
        ${cashField('Actual cost (NZD)', 'activityCost', 'Include supplies or other direct costs.', cost ?? 0)}</div>
        ${task ? `<label class="radio"><input type="checkbox" name="alreadyLogged" ${recordedElsewhere ? 'checked' : ''}> ${esc(tr('I already recorded these amounts in Money log'))}</label>` : ''}`,
      task && !p.solo ? 'Log and send for review' : 'Log activity', task ? 'data-id="business"' : '')}`;
}
function choreDialog(p) {
  const presets = p.chorePresets ?? [];
  openDialog('I did a chore', `<p>${esc(tr('Agree on chores and pay with your parent or caregiver before you start. Even $1 is enough to practise.'))}</p>
    ${form('chore', field('Chore', 'chorePreset', 'Choose a chore your adult set up, or log another unpaid chore.',
      `<select name="chorePreset" required><option value="">${esc(tr('Choose a chore'))}</option>
        ${presets.map(chore => `<option value="${esc(chore.id)}">${esc(chore.title)} · ${money(chore.pay)}</option>`).join('')}
        <option value="unpaid">${esc(tr('Other unpaid chore'))}</option></select>`) +
      `<div data-other-chore hidden>${textField('Chore name', 'choreTitle', 'For example, put the washing away.', '', 80, false)}</div>
        ${textField('Anything to add? (optional)', 'choreNote', 'A short note about the finished chore is enough.', '', 180, false)}`,
      p.solo ? 'Log chore' : 'Log and send for review')}`);
}
function manageChores(p) {
  openDialog('Agreed chores', `<p>${esc(tr('Choose chores and amounts together. The learner can pick them under I did a chore.'))}</p>
    ${(p.chorePresets ?? []).map(chore => `<div class="lesson"><strong>${esc(chore.title)}</strong> · ${money(chore.pay)}
      <div class="action-row">${button('Edit', 'edit-chore-preset', `${playerAttrs(p)} data-id="${esc(chore.id)}"`, 'small')}
        ${button('Remove', 'remove-chore-preset', `${playerAttrs(p)} data-id="${esc(chore.id)}"`, 'small')}</div></div>`).join('')}
    ${button('Add an agreed chore', 'edit-chore-preset', playerAttrs(p), 'primary')}`);
}
function chorePresetDialog(p, preset) {
  openDialog(preset ? 'Edit agreed chore' : 'Add an agreed chore', form('chore-preset',
    chorePresetFields('presetTitle', 'presetPay', { title: preset?.title, amount: (preset?.pay ?? 100) / 100 }),
    'Save chore', playerAttrs(p) + (preset ? ` data-id="${esc(preset.id)}"` : '')));
}
function chorePresetFields(titleName, payName, { title, amount }, required = true) {
  return textField('Chore name', titleName, 'For example, fold the washing.', title, 80, required) +
    field('Agreed pay (NZD)', payName, 'Enter the amount for each completed chore. Use 0 for unpaid chores.',
      `<input name="${payName}" inputmode="decimal" value="${esc(amount)}" ${required ? 'required' : ''}>`);
}
function taskDialog(p, week, task, showQuiz = false) {
  if (task.id === 'family') return familyTaskDialog(p, task);
  const episode = episodeFor(week.index);
  const module = moduleFor(p, week.index);
  const editable = !week.closed && ['todo', 'revision'].includes(task.status);
  let content = `<p>${esc(localMission(taskPrompt(task, p, week)))}</p>`;
  if (task.feedback) content += `<p class="feedback"><strong>${esc(tr("Feedback"))}</strong> · ${esc(task.feedback)}</p>`;
  if (task.id === 'business' && p.mode === 'manual' && editable) {
    openDialog('Business mission', content + businessActivityForm(p, task));
    return;
  }
  if (task.id === 'business' && p.mode === 'manual' && !week.closed) {
    content += `<div class="action-row">${task.activity ? button('Correct activity', 'correct-business-activity') : ''}
      ${button('Log another business activity', 'log-business-activity')}</div>`;
  }
  if (task.id === 'learning') {
    const assignment = samAssignment(module, week.index);
    const quiz = schoolQuizFor(week.index);
    if (quiz && canTakeSchoolQuiz(week, task) && showQuiz) {
      content += form('school-quiz', `<h3>${esc(quiz.title)}</h3><p>${esc(tr(quizInstructions(quiz)))}
        ${esc(tr('You need {percent}% to pass. You’ll see your score and answers after submitting.', { percent: quizPassMark }))}</p>
        ${quizFields(quiz)}`, 'Submit quiz', `${playerAttrs(p)} data-index="${week.index}"`);
    } else {
      if (week.schoolQuizResult) content += quizResults(week.schoolQuizResult, true);
      if (assignment.video !== samVideoLibrary) content += `<div class="lesson"><h3>Assigned SAM video</h3>${samVideo(assignment)}</div>`;
      else if (videoQuizWeeks.includes(week.index)) {
        content += `<div class="lesson"><h3>${esc(quiz.title)}</h3>${videoQuizSource(module, week.index)}</div>`;
      } else if (!week.closed) {
        content += `<details class="lesson video-lesson"><summary>Watch a practice clip</summary><p>${esc(tr(episode.title))}</p>
          <video id="lesson-film" controls playsinline preload="none" src="assets/lessons/week-${episode.index+1}.mp4" aria-label="${esc(tr(episode.title))}"></video>
          <details><summary>Read the practice clip transcript</summary>${episode.frames.map(frame => `<p>${esc(tr(frame))}</p>`).join('')}</details>
          <p id="lesson-status" role="status">${week.videoWatched ? tr('Practice video complete.') : ''}</p></details>`;
      }
      if (module.lessonNote) content += `<p><strong>Link to your business</strong> · ${esc(module.lessonNote)}</p>`;
      if (quiz) {
        const guidance = nextQuizGuidance(p, week);
        if (guidance) content += `<p class="detail">${esc(guidance)}</p>`;
        if (week.index === familyWeek && finalFamilyTask(p)) {
          content += `<div class="lesson"><p>${esc(tr('Take this week’s quiz together in the Family Money Showdown. Your learner turn also counts as your quiz attempt.'))}</p>
            ${button('Open Family Money Showdown', 'task', 'data-id="family"', 'primary')}</div>`;
        } else if (canTakeSchoolQuiz(week, task)) content += `<div class="lesson"><h3>${esc(quiz.title)}</h3><p>${esc(tr('{count} questions · {percent}% to pass · half XP and Shop points for a fail', { count: quiz.questions.length, percent: quizPassMark }))}</p>
          ${quiz.picks === 2 ? `<p>${esc(tr(quizInstructions(quiz)))}</p>` : ''}
          ${button(week.schoolQuizResult ? 'Retake quiz' : 'Start quiz', 'lesson-quiz', `data-index="${week.index}"`, 'primary')}</div>`;
      } else if (assignment.assigned) {
        content += `<div class="lesson"><p>Watch the assigned video and take its quiz on SAM.</p>${samLink(assignment.quiz, 'Open the SAM quiz')}</div>`;
        if (editable) content += form('sam-lesson-record',
          noteField('What did you learn?', 'evidence', 'After finishing both on SAM, share one thing you learnt.'),
          p.solo ? 'Record SAM lesson' : 'Send SAM lesson for review');
      } else {
        if (editable) content += form('lesson-reflection',
          noteField('What did you learn?', 'evidence', 'Share one idea from the lesson and how you could use it.', task.evidence),
          p.solo ? 'Complete lesson' : 'Send reflection for review');
      }
    }
  } else if (editable) {
    if (task.id === 'business' && p.mode === 'sim' && week.choice === null) {
      content += `<p>Run market day before writing about your decision.</p>${button('Back to the market', 'dismiss', '', 'primary')}`;
    } else {
      content += form('task', noteField('Your response', 'evidence', task.id === 'business' ? 'Try: “I tried… I noticed… Next time I’ll…” Add a price, cost or other figure that helped you decide.' : task.id === 'reflection' ? 'Answer this week’s question in one or two sentences.' : 'Use the instructions above to describe what you did or share what you found.', task.evidence), p.solo ? 'Complete mission' : 'Submit for review', `data-id="${task.id}"`);
    }
  }
  if (!editable && !(task.id === 'learning' && showQuiz && canTakeSchoolQuiz(week, task))) content += task.evidence ? `<div class="lesson"><strong>${esc(tr("Your submission"))}</strong><p>${esc(task.evidence)}</p></div>` : `<p>${statuses[task.status]}</p>`;
  dialog.classList.toggle('arc-quiz', task.id === 'learning');
  openDialog(esc(tr(taskName(task))), content);
  if (task.id === 'learning' && !week.closed && !week.videoWatched && $('#lesson-film')) wireLessonVideo(week);
}
function ageGroupField(track) {
  return field('Age group', 'track', 'This changes the dashboard and mission guidance for your age group.',
    `<select name="track" required>
      <option value="">${esc(tr('Choose an age group'))}</option>
      ${tracks.map((label, index) => `<option value="${index}"${String(index) === String(track) ? ' selected' : ''}>${esc(tr(label))}</option>`).join('')}
    </select>`);
}
function goalAmountField(amount, setup = false) {
  const attributes = setup ? 'inputmode="decimal"' : 'type="number" step=".01" min=".01" max="1000000"';
  return field('Goal amount (NZD)', 'target', 'Enter how much you want to save, in New Zealand dollars.',
    `<input name="target" ${attributes} value="${esc(amount)}" required>`);
}
function readSetupAmount(value, minimum = 1) {
  const amount = value.replace(',', '.');
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(amount)) return null;
  const cents = Math.round(Number(amount) * 100);
  return cents >= minimum && cents <= 100000000 ? cents : null;
}
function cashField(label, name, hint, cents, required = true) {
  return field(label, name, hint, `<input name="${name}" inputmode="decimal" value="${esc(cents == null ? '' : cents / 100)}" ${required ? 'required' : ''}>`);
}
function businessPriceField(cents, draft) {
  return field('What will you charge per job or item? (NZD)', 'businessPrice',
    'Set an optional starting price. You can change the actual amount when you log the work.',
    `<input name="businessPrice" inputmode="decimal" value="${esc(draft ?? (cents == null ? '' : cents / 100))}">`);
}
function editPlayerDialog(p) {
  openDialog('Edit learner profile', form('edit-player', `<div class="fields">
    ${textField('First name or nickname', 'name', 'This name appears on the learner and facilitator dashboards. A nickname is enough.', p.name, 40)}
    ${textField('Business name', 'business', 'Give your business or household service a name, such as Weekend Car Wash.', p.business)}
    ${ageGroupField(p.track ?? 1)}
    ${p.mode === 'manual' ? businessPriceField(p.businessPrice) : ''}
    ${textField('What do you offer? (optional)', 'offer', 'Describe the job or product, such as mowing the lawn for an agreed price.', p.offer, 120, false)}
    ${textField('Who is it for? (optional)', 'customers', 'Name the type of customer, such as my family or neighbours I know.', p.customers, 120, false)}
    ${scheduleFields(p.weekSchedule, !isHomeGame())}
    ${textField('Savings goal', 'goal', 'Choose something specific you want to save for, such as art supplies or a used bike.', p.goal)}
    ${goalAmountField(p.target / 100)}
  </div>`, 'Save changes', playerAttrs(p)));
}

const learnerSetupSteps = {
  about: 'About you',
  earn: 'How will you earn?',
  chores: 'Agreed chores',
  goal: 'What are you saving for?',
  settings: 'Review and scheduling',
  look: 'Make it yours',
  review: 'Review your setup'
};
function startLearnerSetup(home) {
  learnerSetup = {
    home,
    group: home ? null : state,
    steps: Object.keys(learnerSetupSteps).filter(step => step !== 'settings' || !home),
    index: 0,
    choreDrafts: [],
    answers: { reviewMode: 'mentor', weekMode: home ? 'manual' : 'group' }
  };
  showLearnerSetupStep();
}
function setupChoreRow(draft = {}) {
  const id = uid();
  return `<div class="lesson" data-setup-chore>
    <div class="fields">${chorePresetFields('chore-title-' + id, 'chore-pay-' + id, draft, false)}</div>
    ${button('Remove chore', 'setup-chore-remove', '', 'small')}
  </div>`;
}
function setupChoreInputs(row) {
  return [...row.querySelectorAll('input')];
}
function readSetupChores(setup) {
  return [...setup.querySelectorAll('[data-setup-chore]')].map(row => {
    const [title, amount] = setupChoreInputs(row).map(input => input.value.trim());
    return { title, amount };
  }).filter(chore => chore.title || chore.amount);
}
function showLearnerSetupStep() {
  const { steps, index, answers, editing, choreDrafts } = learnerSetup;
  const step = steps[index];
  if (step === 'review') return showLearnerSetupReview();
  let fields;
  switch (step) {
    case 'about':
      fields = `<div class="fields">
        ${textField('Nickname', 'name', 'This is the name you’ll see in your game.', answers.name, 40)}
        ${ageGroupField(answers.track)}
      </div>`;
      break;
    case 'earn':
      fields = `<div class="fields">
        ${field('How do you want to earn?', 'mode', 'Choose a paid job or small business you can try, or practise with pretend money in the game.',
          `<select name="mode" required>
            <option value="">${esc(tr('Choose how to earn'))}</option>
            <option value="manual"${answers.mode === 'manual' ? ' selected' : ''}>${esc(tr('Real-world paid activity'))}</option>
            <option value="sim"${answers.mode === 'sim' ? ' selected' : ''}>${esc(tr('Practice business'))}</option>
          </select>`)}
        ${textField('Activity or business name', 'business', 'For example, Weekend Car Wash or a pretend plant stall.', answers.business)}
      </div>
      <div data-setup-price${answers.mode === 'manual' ? '' : ' hidden'}>
        ${businessPriceField(undefined, answers.businessPrice)}
      </div>
      <details data-setup-offer${answers.mode === 'manual' ? '' : ' hidden'}${answers.offer || answers.customers ? ' open' : ''}>
        <summary>${esc(tr('Add details about your activity (optional)'))}</summary>
        <div class="fields">
          ${textField('What will you offer?', 'offer', 'For example, wash cars or sell plants.', answers.offer, 120, false)}
          ${textField('Who will pay you?', 'customers', 'For example, family or neighbours you know.', answers.customers, 120, false)}
        </div>
      </details>
      <p class="detail" data-setup-practice${answers.mode === 'sim' ? '' : ' hidden'}>${esc(tr('You’ll try pricing and selling at a practice market in the game.'))}</p>`;
      break;
    case 'chores':
      fields = `<p>${esc(tr('Optional. Agree on chores and pay with an adult, or continue without adding any.'))}</p>
        <div data-setup-chores>${choreDrafts.length ? choreDrafts.map(setupChoreRow).join('') : setupChoreRow()}</div>
        ${button('Add an agreed chore', 'setup-chore-add', '', 'small')}`;
      break;
    case 'goal':
      fields = `<div class="fields">
        ${textField('Savings goal', 'goal', 'Pick something to save for, such as art supplies or a second-hand bike.', answers.goal)}
        ${goalAmountField(answers.target, true)}
      </div>`;
      break;
    case 'settings':
      fields = `<div class="fields">
        ${field('Play with', 'reviewMode', 'Mentor check-ins let a facilitator review the learner’s work. In solo practice the learner closes their own weeks.',
          `<select name="reviewMode">
            <option value="mentor"${answers.reviewMode === 'mentor' ? ' selected' : ''}>${esc(tr('Mentor check-ins'))}</option>
            <option value="solo"${answers.reviewMode === 'solo' ? ' selected' : ''}>${esc(tr('Solo practice'))}</option>
          </select>`)}
        ${scheduleFields({ mode: answers.weekMode, startDate: answers.weekStart }, true, true)}
      </div>`;
      break;
    case 'look':
      fields = `<p>${esc(tr('Pick a free profile picture and dashboard background. You can change them in the Profile Shop.'))}</p>
        ${starterLookFields({ icon: answers['starter-icon'], background: answers['starter-background'] })}`;
      break;
  }
  const progress = tr('Step {step} of {total}', { step: index + 1, total: steps.length });
  openDialog(learnerSetupSteps[step], `<form data-form="learner-setup" novalidate>
    <p class="detail">${esc(progress)}</p>
    ${fields}
    <p class="error" role="alert"></p>
    <div class="dialog-actions">
      ${editing ? button('Cancel edit', 'learner-setup-review') : index ? button('Back', 'learner-setup-back') : ''}
      <button type="submit" class="button primary">${esc(tr(editing ? 'Save changes' : 'Continue'))}</button>
    </div>
  </form>`);
  dialog.scrollTop = 0;
}
function showLearnerSetupReview() {
  const { home, group, steps, index, answers, choreDrafts } = learnerSetup;
  const real = answers.mode === 'manual';
  const row = (label, content) => `<div><dt>${esc(tr(label))}</dt><dd>${content}</dd></div>`;
  const fields = {
    about: row('Nickname', esc(answers.name)) + row('Age group', esc(tr(tracks[answers.track]))),
    earn: row('Earning mode', esc(tr(real ? 'Real-world paid activity' : 'Practice business')))
      + row('Activity or business name', esc(answers.business))
      + (real && answers.businessPrice ? row('Starting price (NZD)', money(readSetupAmount(answers.businessPrice, 0))) : '')
      + (real && answers.offer ? row('What will you offer?', esc(answers.offer)) : '')
      + (real && answers.customers ? row('Who will pay you?', esc(answers.customers)) : ''),
    chores: choreDrafts.length
      ? choreDrafts.map(({ title, amount }) => `<div><dt>${esc(title)}</dt><dd>${money(readSetupAmount(amount, 0))}</dd></div>`).join('')
      : `<p class="detail">${esc(tr('No chores added'))}</p>`,
    goal: row('Savings goal', esc(answers.goal)) + row('Goal amount (NZD)', money(readSetupAmount(answers.target))),
    look: starterLookGroups.map(([kind, label, initial]) => {
      const item = starterOptions(kind).find(item => item.id === (answers['starter-' + kind] ?? initial));
      const preview = kind === 'icon' ? portrait(item, true) : backgroundTile(item);
      return row(label, `<span>${esc(tr(item.name))}</span>${preview}`);
    }).join('')
  };
  if (!home) {
    const chosen = readWeekSchedule(name => answers[name]);
    const schedule = effectiveWeekSchedule(group, { weekSchedule: chosen });
    const mode = tr(scheduleLabels[schedule.mode]);
    fields.settings = row('Play with', esc(tr(answers.reviewMode === 'solo' ? 'Solo practice' : 'Mentor check-ins')))
      + row('Week progression', esc(chosen ? mode : tr('Use class setting') + ' · ' + mode))
      + (schedule.mode === 'scheduled' ? row('Programme start date', esc(scheduleDate(schedule.startDate))) : '');
  }
  openDialog(learnerSetupSteps.review, `<p class="detail">${esc(tr('Step {step} of {total}', { step: index + 1, total: steps.length }))}</p>
    ${form('learner-setup-confirm', steps.slice(0, -1).map(step => {
      const title = tr(learnerSetupSteps[step]);
      return `<section class="lesson"><div class="section-title"><h3>${esc(title)}</h3>
        ${button('Edit', 'learner-setup-edit', `data-id="${step}" aria-label="${esc(tr('Edit {section}', { section: title }))}"`, 'small')}
        </div>${step === 'chores' && !choreDrafts.length ? fields[step] : `<dl class="learner-facts">${fields[step]}</dl>`}</section>`;
    }).join(''), home ? 'Start playing' : 'Add learner')}`);
  dialog.scrollTop = 0;
}
function returnToLearnerSetupReview() {
  const step = learnerSetup.steps[learnerSetup.index];
  learnerSetup.editing = false;
  learnerSetup.index = learnerSetup.steps.length - 1;
  showLearnerSetupStep();
  dialog.querySelector(`[data-action="learner-setup-edit"][data-id="${step}"]`)?.focus();
}
function rememberLearnerSetup(data) {
  for (const [name, value] of data) learnerSetup.answers[name] = String(value).trim();
}
function reviewDialog(p, t) {
  if (t.id === 'family' && t.familyResponse) return familyReviewDialog(p, t);
  const w = activeWeek(p);
  openDialog('Review ' + esc(p.name) + '’s submission', `<h3>${esc(tr(taskName(t)))}</h3><p>${esc(taskPrompt(t, p, w))}</p><div class="lesson"><p>${esc(t.evidence)}</p></div>
    ${t.id === 'learning' ? quizResults(w.schoolQuizResult, false, true) : ''}
    ${form('review', `${field('Decision', 'decision', 'Approve to give credit for this mission. Ask for a revision when the learner needs to try again.', `<select name="decision"><option value="approved">Approve</option><option value="revision">Ask for a revision</option></select>`)}${noteField('Feedback', 'feedback', 'Say what worked or what to change. Feedback is required when asking for a revision.', '', false)}`, 'Save review', `data-player="${p.id}" data-id="${t.id}"`)}`);
}
function learnerDetail(p) {
  const index = detailWeek ?? activeWeek(p).index;
  const week = p.weeks[index];
  const module = moduleFor(p, index);
  const assignment = samAssignment(module, index);
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
      <div><dt>${esc(tr("Savings goal"))}</dt><dd>${esc(p.goal)} · ${money(result.buckets[1])} of ${money(p.target)} (${pct(p)}%)</dd></div>
      <div><dt>Week progression</dt><dd>${weekSchedule(p).mode === 'scheduled'
        ? esc(tr('Scheduled from {date}', { date: scheduleDate(weekStartDate(weekSchedule(p), 0)) })) : esc(tr('Learner-paced'))}${nextWeekNote(p) ? ' · ' + esc(nextWeekNote(p)) : ''}</dd></div>
      <div><dt>Progress</dt><dd>${result.closed} weeks closed · ${learningStats(p).xp} learning XP · ${result.points} points</dd></div>
      <div><dt>Profile shop</dt><dd>${wallet.balance} pts available · ${wallet.spent} spent · ${tr(cosmetics(p).title.name)}</dd></div>
      <div><dt>Badges</dt><dd>${earnedAwards(p).map(award => award.title).join(' · ') || 'None earned yet'}</dd></div>
    </dl><div class="action-row">${button('Hand device to learner', 'switch-player', attrs, 'small')}
      ${button('Agreed chores', 'manage-chores', attrs, 'small')}</div></section>
    <section class="panel learner-buckets"><h2>Money buckets to date</h2><p>${esc(tr("Current account balances. Save includes any simulated match."))}</p>${mainAccount(p)}${bucketCards(result.buckets,p)}</section>
  </div>
  <section class="panel spaced" aria-labelledby="module-overview-title">
    <div class="section-title detail-section"><div><h2 id="module-overview-title">Weekly record</h2><p>Review completed weeks or plan a future module for this learner.</p></div>
      <label class="inline-field">Week <select id="detail-week">${Array.from({length:Math.max(programmeLength,p.weeks.length)},(_,i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${tr('Week')} ${i+1} · ${p.weeks[i]?.closed ? 'Closed' : p.weeks[i] && !(i === 0 && weekOneLocked(p)) ? 'Open' : 'Upcoming'}</option>`).join('')}</select></label></div>
    <div class="section-title detail-section"><div><h3>${esc(module.title)}</h3><p>${esc(module.summary)}</p></div>${week?.closed ? pill('Week closed', 'green') : button('Customise module', 'edit-module', indexAttrs, 'small')}</div>
    <dl class="learner-facts module-facts">
      <div><dt>In the business</dt><dd>${esc(module.business)}</dd></div>
      <div><dt>Outside the business</dt><dd>${esc(module.outside)}</dd></div>
      ${module.lessonNote ? `<div><dt>Lesson connection</dt><dd>${esc(module.lessonNote)}</dd></div>` : ''}
      <div><dt>Weekly lesson</dt><dd>${esc(tr(weeklyLessonLabel({index}, module)))}</dd></div>
      ${assignment.video !== samVideoLibrary ? `<div><dt>Assigned video</dt><dd>${samLink(assignment.video, 'Open assigned video')}</dd></div>` : ''}
      ${!schoolQuizFor(index) && assignment.assigned ? `<div><dt>Assigned quiz</dt><dd>${samLink(assignment.quiz, 'Open the SAM quiz')}</dd></div>` : ''}
    </dl>
  </section>
  ${week ? `<section class="panel spaced">
    <div class="section-title detail-section"><div><h2>Missions and submissions</h2><p>${week.tasks.filter(t => t.status === 'approved').length} of ${week.tasks.length} complete or approved · ${tally.points} points this week</p></div>
    <div class="action-row">${isHomeGame() && editable ? button('Assign activity', 'assign', '', 'small') : ''}${editable && !p.solo && tally.ready ? button('Record check-in', 'close-week', attrs, 'primary') : ''}</div></div>
    <div class="record-missions">${week.tasks.map(task => `<article class="record-mission"><div class="section-title detail-section"><div><h3>${esc(tr(taskName(task)))}</h3><p>${task.required ? 'Required' : 'Optional'} · ${taskPoints(week, task)} pts</p></div>${pill(statuses[task.status], task.status === 'approved' ? 'green' : '')}</div>
      <p>${esc(localMission(taskPrompt(task,p,week)))}</p>
      ${task.familyResponse ? familyAnswers(task.familyResponse) : task.evidence ? `<p class="record-answer"><strong>Submission</strong><span>${esc(task.evidence)}</span></p>` : task.id === 'learning' && week.schoolQuizResult ? '' : '<p>No submission yet.</p>'}
      ${task.id === 'learning' ? quizResults(week.schoolQuizResult) : quizResults(task.showdown?.learnerResult)}
      ${task.familyScores ? `<p><strong>${esc(tr('Facilitator mark'))}</strong> · ${task.familyScores.reduce((sum, score) => sum + score, 0)} / 6</p>` : ''}
      ${task.feedback ? `<p class="record-answer"><strong>${esc(tr("Feedback"))}</strong><span>${esc(task.feedback)}</span></p>` : ''}
      ${editable && task.status === 'submitted' ? button('Review submission', 'review', `${attrs} data-id="${esc(task.id)}"`, 'small') : ''}</article>`).join('')}</div>
    ${week.closed ? `<div class="check-in-note"><h3>Check-in note</h3><p>${esc(week.feedback || 'No note recorded.')}</p>${!p.solo ? button('Edit check-in note', 'edit-check-in', indexAttrs, 'small') : ''}</div>` : ''}
  </section>
  <section class="panel spaced">
    <div class="section-title detail-section"><h2>${tr('Week')} ${index+1} money log</h2>${editable ? `<div class="bank-actions">${bankActions(p, { secondary: true, attrs })}</div>` : ''}</div>
    <dl class="ledger-totals">${[['Sales',tally.sales],['Business costs',tally.costs],['Personal purchases',tally.spending],['Profit before tax',tally.profit],[tr('Simulated tax') + ' (' + week.rules.tax + '%)',tally.tax],['Business profit after tax',tally.profit - tally.tax],['Activity rewards',tally.rewards],['Savings match',tally.match]].map(([label,value])=>`<div><dt>${tr(label)}</dt><dd>${money(value)}</dd></div>`).join('')}</dl>
    ${week.result ? `<p><strong>Practice scenario</strong> · ${market[index % market.length].plans[week.choice].label} · ${week.result.tactic} · ${week.result.sold} sales, ${week.result.returning} returning customers</p>` : ''}
    ${transactionTable(p,week)}
    <h3 class="spaced">${tr(week.transfers ? 'Account transfers' : 'Original bucket allocations')}</h3>${week.transfers ? transferList(p, week) : bucketCards(tally.allocations)}
  </section>` : '<p class="detail spaced">Missions and money entries appear here when this week opens.</p>'}`;
}
function isHttps(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
function moduleDialog(p, index) {
  const module = moduleFor(p, index);
  openDialog('Customise week ' + (index + 1), `<p>These changes apply to ${esc(p.name)}. Assign a SAM video and, when there’s no built-in school quiz, an external quiz. Submitted responses keep the instructions they answered.</p>
    ${form('edit-module', `${textField('Module title', 'moduleTitle', 'Name the focus in the learner’s own context, such as Price two lawn-mowing jobs.', module.title)}
      ${noteField('Weekly context', 'moduleContext', 'Explain how this week’s topic connects to their business or savings goal.', module.summary)}
      ${noteField('Business mission', 'businessMission', 'Give one useful thing to try or measure in their real business.', module.business)}
      ${noteField('Outside-business mission', 'outsideMission', 'Ask them to apply the same money idea to an everyday situation.', module.outside)}
      ${noteField('Lesson connection (optional)', 'lessonNote', 'Add a short example using the learner’s goal or business numbers.', module.lessonNote, false)}
      ${field('SAM or Vimeo video (optional)', 'moduleLink', 'Paste a direct SAM link, Vimeo link or Vimeo iframe code.', `<textarea name="moduleLink" rows="2">${esc(module.lessonUrl)}</textarea>`)}
      ${field('SAM quiz link (optional)', 'moduleQuiz', 'Used when there is no built-in school quiz and a matching video is assigned.', `<input name="moduleQuiz" type="url" value="${esc(module.quizUrl)}">`)}`, 'Save module', `${playerAttrs(p)} data-index="${index}"`)}`);
}
function entryDialog(p, entry, intent) {
  const choices = Object.entries(typeNames).filter(([kind]) =>
    allowsEntry(p, kind) && (!intent || isMoneyOut(kind) === (intent === 'outgoing')));
  if (!choices.length) return;
  const title = entry?.id ? 'Edit money log entry' : intent === 'income' ? 'Log money in' : intent === 'outgoing' ? 'Log money out' : 'Add money entry';
  const guidance = intent === 'income' ? 'Money you earn goes into Main first.' : intent === 'outgoing'
    ? (p.mode === 'manual' ? 'Personal purchases come out of Spend. Business costs come out of Main.' : 'Personal purchases come out of Spend.')
    : '';
  const kindOptions = choices.map(([kind,label]) => `<option value="${kind}" ${entry?.kind === kind ? 'selected' : ''}>${tr(label)}</option>`).join('');
  openDialog(tr(title), form('entry',
    (guidance ? `<p>${tr(guidance)}</p>` : '') +
    (choices.length === 1
      ? `<input type="hidden" name="kind" value="${choices[0][0]}">`
      : field(tr('Type'), 'kind', intent === 'outgoing'
        ? 'Use Personal purchase for things you buy for yourself. Use Business cost for things you buy to do a paid job or run your business.'
        : intent === 'income' ? 'A sale is payment for a product or job. An activity reward is money earned outside your business.'
        : 'Sales and rewards go into Main. Personal purchases come out of Spend and business costs come out of Main.', `<select name="kind">${kindOptions}</select>`)) +
    textField(tr('Description'), 'label', intent === 'outgoing' ? 'For example, a bus ticket for yourself or car wash soap for your business.' : 'For example, Saturday lawn mow or a reward for folding the washing.', entry?.label) +
    field(tr('Amount (NZD)'), 'amount', 'Enter the amount in dollars and cents, such as 12.50.', `<input name="amount" type="number" inputmode="decimal" min=".01" max="1000000" step=".01" value="${entry?.cents ? entry.cents / 100 : ''}" required>`),
    tr(intent === 'income' ? 'Add to Main' : intent === 'outgoing' ? 'Record money out' : 'Save entry'), `${playerAttrs(p)}${entry?.id ? ' data-id="' + esc(entry.id) + '"' : ''}`));
}
function moveMoneyDialog(p, preset) {
  const week = activeWeek(p), bank = accounts(p);
  const noFunds = !bank.available && !bank.balances.some(value => value > 0);
  const selected = preset ?? (bank.available ? 1 : bank.balances.findIndex(value => value > 0));
  const sendFirst = bank.available > 0;
  const scope = role === 'facilitator' ? `<p>Practice accounts for <strong>${esc(p.name)}</strong></p>` : '';
  openDialog(tr('Move money'), `${scope}${mainAccount(p)}${noFunds
    ? '<p>Log money in to add to Main. Once you have money available, you can choose a bucket.</p>' + button(tr('Money in'), 'add-entry', playerAttrs(p) + ' data-kind="income"', 'primary')
    : form('move-money',
      field(tr('Direction'), 'direction', 'Money you record starts in Main. Move it to a bucket or bring it back if your plan changes.', `<select name="direction">
        <option value="out" ${sendFirst ? 'selected' : ''}>${esc(tr("Main → bucket"))}</option><option value="in" ${sendFirst ? '' : 'selected'}>${esc(tr("Bucket → Main"))}</option></select>`) +
      field(tr('Bucket account'), 'bucket', 'Pick the account you want to use. The amount beside each name is what it currently holds.', `<select name="bucket">${allAccounts(p).map((name,i) => `<option value="${i}" ${i === selected ? 'selected' : ''}>${esc(name)} · ${money(bank.balances[i])}</option>`).join('')}</select>`) +
      field(tr('Amount to move (NZD)'), 'move-amount', 'Choose an amount you can afford. For a savings goal, think about how much you want to set aside this week.', '<input name="move-amount" type="number" min=".01" step=".01" inputmode="decimal" required>') +
      `<details class="lesson"><summary>${esc(tr("Need an idea for splitting your money?"))}</summary><p>${tr('Suggested split')} · ${buckets.map((name, i) => tr(name) + ' ' + week.rules.split[i] + '%').join(' · ')}. Decide how much to move based on your own plan.</p></details>`,
      tr('Confirm transfer'), playerAttrs(p))}`);
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
    case 'learner-setup-edit': {
      if (!learnerSetup || !el.closest('[data-form="learner-setup-confirm"]')) return;
      const editIndex = learnerSetup.steps.indexOf(item);
      if (editIndex < 0 || item === 'review') return;
      learnerSetup.index = editIndex;
      learnerSetup.editing = true;
      showLearnerSetupStep();
      break;
    }
    case 'learner-setup-review':
      if (learnerSetup?.editing && el.closest('[data-form="learner-setup"]')) returnToLearnerSetupReview();
      break;
    case 'learner-setup-back': {
      const setup = el.closest('[data-form="learner-setup"]');
      if (!setup || !learnerSetup?.index || learnerSetup.editing) return;
      if (learnerSetup.steps[learnerSetup.index] === 'chores') learnerSetup.choreDrafts = readSetupChores(setup);
      else rememberLearnerSetup(new FormData(setup));
      learnerSetup.index--;
      showLearnerSetupStep();
      break;
    }
    case 'setup-chore-add':
    case 'setup-chore-remove': {
      const setup = el.closest('[data-form="learner-setup"]');
      if (!setup || learnerSetup?.steps[learnerSetup.index] !== 'chores') return;
      const list = setup.querySelector('[data-setup-chores]');
      if (action === 'setup-chore-add') {
        list.insertAdjacentHTML('beforeend', setupChoreRow());
        setupChoreInputs(list.lastElementChild)[0].focus();
      } else {
        const row = el.closest('[data-setup-chore]');
        if (!row) return;
        const neighbour = row.nextElementSibling ?? row.previousElementSibling;
        row.remove();
        (neighbour?.querySelector('[data-action="setup-chore-remove"]') ?? setup.querySelector('[data-action="setup-chore-add"]')).focus();
        setup.querySelector('.error').textContent = '';
        setup.querySelector('[aria-invalid]')?.removeAttribute('aria-invalid');
      }
      break;
    }
    case 'view-wealth':
      if (role === 'learner' && view === 'dashboard' && p) showWealth(p);
      break;
    case 'toggle-leaderboard':
      if (role !== 'facilitator' || view !== 'group' || isHomeGame()) return;
      state.showLearnerLeaderboard = !state.showLearnerLeaderboard;
      save();
      $('[data-action="toggle-leaderboard"]')?.focus({ preventScroll:true });
      break;
    case 'view':
      closeDialog(); navigate(next);
      if (view === 'investments' && el.dataset.account !== undefined) $('#bucket-account-' + el.dataset.account)?.focus();
      break;
    case 'open-weekly-challenges':
      if (role === 'learner' && p) {
        closeDialog();
        navigate('challenges');
      }
      break;
    case 'family-back':
    case 'family-next': {
      if (role !== 'learner') return;
      const guide = el.closest('form[data-step]');
      if (!guide) return;
      const index = Number(guide.dataset.step);
      const next = index + (action === 'family-next' ? 1 : -1);
      if (next < 0 || next >= familyStages.length) return;
      if (action === 'family-next') {
        const answer = guide.elements.namedItem(familyStageFields[index]);
        if (!answer.value.trim()) {
          guide.querySelector('.error').textContent = tr('Write a short answer before you continue.');
          answer.focus();
          return;
        }
      }
      showFamilyStage(guide, next, true);
      break;
    }
    case 'family-quiz-start':
      if (finalFamilyTask(p)) {
        familyTurn = { playerId: p.id };
        showFamilyQuizTurn(p, false);
      }
      break;
    case 'family-quiz-partner':
      if (finalFamilyTask(p) && familyTurn?.playerId === p.id && familyTurn.learnerResult) showFamilyQuizTurn(p, true);
      break;
    case 'family-history': {
      const family = p?.weeks[familyWeek]?.tasks.find(task => task.id === 'family');
      if (role === 'learner' && family && w.index > familyWeek) {
        if (family.showdown?.partnerResult) showFamilyQuizResult(family.showdown);
        else if (family.showdown || family.familyResponse) familyTaskDialog(p, family);
      }
      break;
    }
    case 'family-recap': {
      const response = w?.tasks.find(task => task.id === 'family')?.familyResponse;
      if (role === 'learner' && response) familyRecap(response);
      break;
    }
    case 'weekly-play':
    case 'practice-market':
      if (role !== 'learner' || !w) return;
      resetMarketDay();
      if (action === 'practice-market') startScenario('practice');
      else {
        const week = index === undefined ? w.index : Number(index);
        if (p.weeks[week]?.tasks.some(task => task.id === 'family')) return;
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
        showCertificate(p, challengeTitle(p.weeks[n]), 'Weekly challenge · Week ' + (n + 1));
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
    case 'shop-category':
      if (role !== 'learner' || view !== 'shop' || !shopCategories.some(([category]) => category === item)) return;
      shopCategory = item;
      render();
      $('[data-action="shop-category"][aria-pressed="true"]')?.focus({preventScroll:true});
      break;
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
      if (publicRoutes.has(view)) startLearnerSetup(true);
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
    case 'week-12-demo':
      if (view === 'home' || week12Demo) startWeek12Demo();
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
    case 'edit-player': if (role === 'facilitator' && p) editPlayerDialog(p); break;
    case 'add-player': if (role === 'facilitator' && state && !isHomeGame()) startLearnerSetup(false); break;
    case 'task': if (task && !weekOneLocked(p)) taskDialog(p, w, task); break;
    case 'lesson-quiz': {
      const week = p?.weeks[Number(index)];
      const learning = week?.tasks.find(t => t.id === 'learning');
      if (role === 'learner' && week && !weekOneLocked(p) && schoolQuizFor(week.index) && canTakeSchoolQuiz(week, learning)
        && (week.index !== familyWeek || !finalFamilyTask(p))) {
        taskDialog(p, week, learning, true);
      }
      break;
    }
    case 'correct-business-activity':
    case 'log-business-activity': {
      if (role !== 'learner' || p.mode !== 'manual' || w.closed || weekOneLocked(p)) return;
      const business = action === 'correct-business-activity' ? w.tasks.find(task => task.id === 'business' && task.activity) : undefined;
      if (action === 'correct-business-activity' && !business) return;
      openDialog(business ? 'Correct activity' : 'Log another business activity', businessActivityForm(p, business));
      break;
    }
    case 'log-chore':
      if (role === 'learner' && w && !w.closed && !weekOneLocked(p)) choreDialog(p);
      break;
    case 'manage-chores':
      if (role === 'facilitator' && p) manageChores(p);
      break;
    case 'edit-chore-preset':
    case 'remove-chore-preset': {
      if (role !== 'facilitator' || !p) return;
      const preset = p.chorePresets?.find(chore => chore.id === item);
      if (item && !preset || action === 'remove-chore-preset' && !preset) return;
      if (action === 'edit-chore-preset') chorePresetDialog(p, preset);
      else openDialog('Remove agreed chore?', `<p>${esc(preset.title)}</p>` +
        form('remove-chore-preset', '', 'Remove', `${playerAttrs(p)} data-id="${esc(item)}"`));
      break;
    }
    case 'season-preview': {
      const n = Number(index);
      if (role !== 'learner' || view !== 'week' || !episodes[n]) return;
      const info = moduleFor(p,n);
      const date = weekStartDate(weekSchedule(p), n);
      const status = p.weeks[n]?.closed ? 'Completed' : n <= w.index ? 'Current week'
        : date ? tr('Scheduled for {date} once earlier weeks are complete.', { date: scheduleDate(date) }) : 'Opens when you reach this week.';
      openDialog(tr('Week') + ' ' + (n + 1) + ' · ' + esc(moduleTitle(p,n)),
        `<p class="eyebrow">${tr(status)}</p><p>${esc(tr(info.summary))}</p>
        <div class="lesson"><h3>${tr('Business mission')}</h3><p>${esc(localMission(info.business))}</p>
        <h3>${tr('Money habit')}</h3><p>${esc(tr(info.outside))}</p></div>
        ${quizResults(p.weeks[n]?.schoolQuizResult, true)}
        ${p.weeks[n]?.schoolQuizResult?.passed === false ? button('Retake quiz', 'lesson-quiz', `data-index="${n}"`, 'primary') : ''}
        ${n === familyWeek && p.weeks[n] ? `<div class="lesson"><h3>${esc(tr(familyTitle))}</h3><p>${esc(tr(familyPrompt))}</p>
        ${button('Open Challenges', 'open-weekly-challenges', '', 'small')}</div>` : ''}`);
      break;
    }
    case 'add-bucket':
      if (role === 'learner' && view === 'investments') bucketDialog(p);
      break;
    case 'bucket-why': {
      if (role !== 'learner' || view !== 'investments') return;
      const card = el.closest('.bucket-adventure');
      const flipped = card.classList.toggle('bucket-flipped');
      card.querySelector('.bucket-front').inert = flipped;
      card.querySelector('.bucket-back').inert = !flipped;
      el.setAttribute('aria-expanded', String(flipped));
      el.setAttribute('aria-label', (tr(flipped ? 'Show picture' : 'Why this bucket?') + ' ') + card.querySelector('h2').textContent);
      el.textContent = tr(flipped ? 'Show picture' : 'Why this bucket?');
      break;
    }
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
      feedback.textContent = tr(correct ? 'Nice choice!' : 'Try another choice.') + ' ' + tr(adventure.explain);
      break;
    }
    case 'start-next-week':
      if (role === 'learner' && p && startNextWeek(p, state.rules, weekSchedule(p), 'manual')) {
        save(tr('Week {week} is open.', { week: activeWeek(p).index + 1 }));
        $('#main').focus({ preventScroll: true });
      }
      break;
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
      const transactions = [...w.transactions, { id: uid(), kind: 'sale', label: 'Market day sales', cents: result.sales, sim: true }, { id: uid(), kind: 'cost', label: 'Market day costs', cents: result.costs, sim: true }];
      if (transactionUpdateError(p, w, transactions)) {
        openDialog('Cover your market costs', '<p>Move some money back to Main from a bucket, then run Market Day again.</p>' + button(tr('Move money'), 'move-money', '', 'primary'));
        return;
      }
      w.choice = w.plan;
      w.result = result;
      w.transactions = transactions;
      save('Market day finished. See the results and complete your weekly missions.', grantAwards(p));
      break;
    }
    case 'solo-settle': {
      const tally = totals(w);
      if (role !== 'learner' || !p.solo || w.closed || weekOneLocked(p) || !tally.ready) return;
      openDialog('Settle week ' + (w.index + 1), `<p>${money(accounts(p).available)} is available in Main and carries into your next week.</p>
        <p>Weekly bonus · +${w.rules.bonus} points${w.rules.match ? ' · any eligible simulated match is added to Save' : ''}</p>
        ${form('solo-settle', '', w.index === programmeLength - 1 ? 'Finish campaign' : 'Close week')}`);
      break;
    }
    case 'add-entry':
      if (w && !w.closed && !weekOneLocked(p)) entryDialog(p, undefined, el.dataset.kind);
      break;
    case 'move-money':
      if (w && !w.closed && !weekOneLocked(p) && ['learner', 'facilitator'].includes(role)) moveMoneyDialog(p, index === undefined ? undefined : Number(index));
      break;
    case 'edit-entry': {
      const entry = w.transactions.find(record => record.id === item && !record.sim && !record.missionId);
      if (entry && !w.closed) entryDialog(p, entry);
      break;
    }
    case 'remove-entry': {
      const entry = w.transactions.find(record => record.id === item && !record.sim && !record.missionId);
      if (!entry || w.closed) return;
      openDialog('Remove entry?', `<p>${esc(entry.label)} · ${money(entry.cents)}</p>${form('remove-entry', '', 'Remove entry', `${playerAttrs(p)} data-id="${esc(item)}"`)}`);
      break;
    }
    case 'assign':
      if (role !== 'facilitator') return;
      openDialog('Assign activity', form('assign', `${isHomeGame() ? `<input type="hidden" name="recipient" value="${esc(p.id)}">` : field('Assign to', 'recipient', 'Choose one learner or assign to everyone with an open mentored week.', `<select name="recipient"><option value="all">All mentored learners with an open week</option>${state.players.filter(other => !other.solo && !activeWeek(other).closed).map(other => `<option value="${other.id}">${esc(other.name)} · ${tr('Week')} ${activeWeek(other).index + 1}</option>`).join('')}</select>`)}
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
      if (role === 'facilitator' && p && !weekOneLocked(p) && !p.solo && totals(w).ready && !w.closed) openDialog('Check in with ' + esc(p.name), `<p>All required activities are approved. Review the business result and agree on one next step.</p>
      ${w.tasks.some(t => !t.required && t.status === 'submitted') ? '<p>Optional submissions are still awaiting review. Review them before closing the week if you want them to count.</p>' : ''}
      <div class="lesson"><strong>${tr('Week')} ${w.index + 1}</strong><p>${money(totals(w).profit)} profit before simulated tax · ${money(totals(w).allocations[1])} net transfers to Save</p></div>
      ${form('close-week', noteField('Feedback and next step', 'feedback', 'Summarise one thing the learner noticed and agree on one action to try next week.'), w.index === programmeLength - 1 ? 'Finish programme' : 'Close week', `data-player="${p.id}"`)}`); break;
  }
});
document.addEventListener('change', event => {
  if (event.target.id === 'game-language' && Object.hasOwn(languages,event.target.value)) {
    workspace.language = language = event.target.value;
    save();
    return;
  }
  const setup = event.target.closest('[data-form="learner-setup"]');
  if (setup && event.target.name === 'mode') {
    setup.querySelector('[data-setup-price]').hidden = event.target.value !== 'manual';
    setup.querySelector('[data-setup-offer]').hidden = event.target.value !== 'manual';
    setup.querySelector('[data-setup-practice]').hidden = event.target.value !== 'sim';
  }
  if (setup && event.target.name === 'weekMode') {
    const scheduled = event.target.value === 'scheduled';
    setup.querySelector('[data-setup-date]').hidden = !scheduled;
    setup.elements.weekStart.required = scheduled;
  }
  if (event.target.name === 'chorePreset') {
    const other = event.target.form.querySelector('[data-other-chore]');
    other.hidden = event.target.value !== 'unpaid';
    event.target.form.elements.choreTitle.required = !other.hidden;
  }
  const quiz = event.target.closest('.school-quiz');
  if (quiz && event.target.type === 'checkbox') {
    const options = event.target.closest('fieldset');
    const error = event.target.form.querySelector('.error');
    if (options.querySelectorAll('input:checked').length > 2) {
      event.target.checked = false;
      error.textContent = tr('Choose up to two answers. Untick one to change your choices.');
    } else {
      error.textContent = '';
    }
  }
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
  const guide = event.target.closest('form[data-step]');
  if (guide && role === 'learner') {
    const { name, value } = event.target;
    if (name === 'milestone' && Object.hasOwn(familyMilestones, value)) {
      $('#family-milestone-prompt').innerHTML = `<p>${esc(tr(familyMilestones[value].prompt))}</p>`;
    }
    if (name === 'scenario') {
      const scenario = familyCases.find(item => item.id === value);
      const brief = $('#family-brief');
      if (scenario) brief.innerHTML = familyBrief(scenario, brief.querySelector('details').open);
    }
  }
  if (event.target.id === 'ledger-week') { ledgerWeek = Number(event.target.value); render(); $('#ledger-week').focus(); }
});
document.addEventListener('submit', async event => {
  const el = event.target;
  if (!el.matches('[data-form], #settings')) return;
  event.preventDefault();
  const data = new FormData(el);
  const value = name => String(data.get(name) ?? '').trim();
  const fail = message => { el.querySelector('.error').textContent = tr(message); };
  const p = el.dataset.player && role === 'facilitator' ? state?.players.find(other => other.id === el.dataset.player) : player();
  const w = p && activeWeek(p), task = w?.tasks.find(t => t.id === el.dataset.id);
  const finish = (message, unlocked) => { closeDialog(); save(message, unlocked); };
  const contest = state?.classChallenges?.find(c => c.id === el.dataset.id);
  switch (el.dataset.form ?? 'settings') {
    case 'family-practice':
    case 'family-submit': {
      if (role !== 'learner' || !p) return;
      const practice = el.dataset.form === 'family-practice';
      const family = w.tasks.find(task => task.id === 'family');
      if (practice ? view !== 'challenges' : w.closed || !family || !['todo', 'revision'].includes(family.status)) return;
      if (Number(el.dataset.step) !== familyStages.length - 1) return;
      const response = readFamilyResponse(value);
      if (!response) {
        const incomplete = familyStageFields.findIndex(name => !value(name));
        if (incomplete >= 0) showFamilyStage(el, incomplete, true);
        return fail('Choose a scenario and write all three short answers.');
      }
      const milestone = familyProgress(p).find(item => item.id === value('milestone') && item.count !== 0);
      if (milestone) response.milestone = milestone;
      if (practice) {
        familyRecap(response, true, 'Practice complete!');
        break;
      }
      Object.assign(family, { familyResponse: response, status: p.solo ? 'approved' : 'submitted', feedback: '' });
      delete family.familyScores;
      if (p.solo) completeWeeklyChallenge(p, w.index);
      const message = p.solo ? 'Family challenge complete. See your certificate in My progress.' : 'Your answers are ready for your facilitator to review.';
      save(message, grantAwards(p));
      familyRecap(response, false, message);
      break;
    }
    case 'family-review': {
      if (role !== 'facilitator' || !w || w.closed) return;
      const family = w.tasks.find(task => task.id === 'family');
      if (family?.status !== 'submitted' || !family.familyResponse) return;
      const familyScores = readFamilyScores(value), decision = value('decision'), feedback = value('feedback');
      if (!familyScores || !['approved', 'revision'].includes(decision)) return fail('Choose a mark for all three skills and a review decision.');
      if (decision === 'revision' && !feedback) return fail('Add feedback so the learner knows what to change.');
      Object.assign(family, { familyScores, feedback, status: decision });
      if (decision === 'approved') completeWeeklyChallenge(p, w.index);
      finish('Review saved.', grantAwards(p));
      break;
    }
    case 'weekly-decisions': {
      const week = p?.weeks[Number(el.dataset.index)];
      if (role !== 'learner' || !week || week.tasks.some(task => task.id === 'family')) return;
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
      const videoInput = value('lessonUrl'), url = vimeoPlayer(videoInput) || videoInput;
      if (url && !isHttps(url)) return fail('Enter an HTTPS lesson link or Vimeo iframe code.');
      const quizUrl = value('quizUrl');
      if (quizUrl && !isHttps(quizUrl)) return fail('Enter a SAM quiz link starting with https://.');
      const videos = videoQuizWeeks.map(index => {
        const input = value('week-video-' + index);
        return [index, vimeoPlayer(input) || input];
      });
      if (videos.some(([, video]) => video && !isHttps(video))) return fail('Use an HTTPS link or Vimeo embed code for each weekly video.');
      if (!isHomeGame()) {
        const schedule = readWeekSchedule(value);
        if (!schedule) return fail('Choose a progression mode and a valid start date for Scheduled.');
        state.weekSchedule = schedule;
      }
      state.group = value('group');
      state.lessonUrl = url;
      state.quizUrl = quizUrl;
      state.weeklyVideos = Object.fromEntries(videos.filter(([, video]) => video));
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
    case 'starter-look':
      if (role !== 'learner' || !p?.starterPending) return;
      setStarterLook(p, { icon:value('starter-icon'), background:value('starter-background') });
      finish('Starter look saved.');
      break;
    case 'learner-setup': {
      if (!learnerSetup || !dialog.open || !dialog.contains(el)) return;
      const { home, group, steps, index, editing } = learnerSetup;
      if (home ? !publicRoutes.has(view) : role !== 'facilitator' || group !== state || isHomeGame()) return;
      const step = steps[index];
      if (step === 'review') return;
      el.querySelector('[aria-invalid]')?.removeAttribute('aria-invalid');
      const invalid = (name, message) => {
        fail(message);
        const input = el.elements.namedItem(name);
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      };
      if (step === 'about') {
        if (!value('name')) return invalid('name', 'Enter a nickname.');
        if (!value('track')) return invalid('track', 'Choose an age group.');
      }
      if (step === 'earn') {
        if (!value('mode')) return invalid('mode', 'Choose how you want to earn.');
        if (!value('business')) return invalid('business', 'Enter an activity or business name.');
        if (value('mode') === 'manual' && value('businessPrice') && readSetupAmount(value('businessPrice'), 0) === null) {
          return invalid('businessPrice', 'Enter a valid price or leave it blank.');
        }
      }
      if (step === 'chores') {
        for (const row of el.querySelectorAll('[data-setup-chore]')) {
          const [title, amount] = setupChoreInputs(row);
          const choreTitle = value(title.name), choreAmount = value(amount.name);
          if (!choreTitle && !choreAmount) continue;
          if (!choreTitle || readSetupAmount(choreAmount, 0) === null) {
            return invalid(choreTitle ? amount.name : title.name, 'Enter a chore name and a valid amount.');
          }
        }
        learnerSetup.choreDrafts = readSetupChores(el);
      }
      if (step === 'goal') {
        if (!value('goal')) return invalid('goal', 'Enter a savings goal.');
        if (readSetupAmount(value('target')) === null) return invalid('target', 'Enter a savings amount from NZ$0.01 to NZ$1,000,000, with up to two decimal places.');
      }
      if (step === 'settings' && readWeekSchedule(value) === undefined) return invalid('weekStart', 'Enter a valid programme start date.');
      if (step !== 'chores') rememberLearnerSetup(data);
      if (editing) returnToLearnerSetupReview();
      else {
        learnerSetup.index++;
        showLearnerSetupStep();
      }
      break;
    }
    case 'learner-setup-confirm': {
      if (!learnerSetup || !dialog.open || !dialog.contains(el)) return;
      const { home, group, steps, index, answers, choreDrafts } = learnerSetup;
      if (steps[index] !== 'review' || (home ? !publicRoutes.has(view) : role !== 'facilitator' || group !== state || isHomeGame())) return;
      const { name, business, mode, goal } = answers;
      const fields = {
        name, business, mode, goal,
        track: Number(answers.track), target: readSetupAmount(answers.target),
        businessPrice: mode === 'manual' && answers.businessPrice ? readSetupAmount(answers.businessPrice, 0) : undefined,
        offer: mode === 'manual' ? answers.offer : '',
        customers: mode === 'manual' ? answers.customers : '',
        chorePresets: choreDrafts.map(({ title, amount }) => ({ id: uid(), title, pay: readSetupAmount(amount, 0) })),
        weekSchedule: readWeekSchedule(key => answers[key])
      };
      const appearance = { icon: answers['starter-icon'], background: answers['starter-background'] };
      learnerSetup = undefined;
      if (home) {
        const id = uid();
        workspace.groups.push({ id, data: newHomeGame(fields, appearance) });
        selectGroup(id);
        closeDialog();
        openRole('learner');
        save('Home game ready. Open Parent / caregiver view to plan or review the week together.');
      } else {
        const learner = makePlayer({ ...fields, solo: answers.reviewMode === 'solo' }, state.rules);
        setStarterLook(learner, appearance);
        state.players.push(learner);
        finish('Learner added.');
      }
      break;
    }
    case 'edit-player': {
      if (role !== 'facilitator' || !p) return;
      const fields = { name: value('name'), business: value('business'), offer: value('offer'), customers: value('customers'), goal: value('goal'), track: Number(value('track')), target: Math.round(Number(value('target')) * 100) };
      if (!fields.name || !fields.business || !fields.goal) return fail('Enter a name, a business and a savings goal.');
      if (!tracks[fields.track] || !Number.isSafeInteger(fields.target) || fields.target < 1 || fields.target > 100000000) return fail('Choose a learning level and enter a valid goal amount.');
      const schedule = readWeekSchedule(value);
      if (schedule === undefined || (schedule === null && isHomeGame())) return fail('Choose a progression mode and a valid start date for Scheduled.');
      const price = value('businessPrice') ? readSetupAmount(value('businessPrice'), 0) : undefined;
      if (price === null) return fail('Enter a valid price or leave it blank.');
      Object.assign(p, fields, { weekSchedule: schedule, businessPrice: price });
      finish('Learner profile saved.');
      break;
    }
    case 'lesson-reflection':
    case 'sam-lesson-record': {
      const learning = w?.tasks.find(t => t.id === 'learning');
      if (role !== 'learner' || !learning || w.closed || !['todo', 'revision'].includes(learning.status) || schoolQuizFor(w.index)) return;
      const onSam = el.dataset.form === 'sam-lesson-record';
      if (onSam !== samAssignment(moduleFor(p, w.index), w.index).assigned) return;
      if (!value('evidence')) return fail('Tell us one thing you learnt.');
      Object.assign(learning, { source: onSam ? 'sam' : 'reflection',
        status: p.solo ? 'approved' : 'submitted', evidence: value('evidence'), feedback: '' });
      finish(p.solo ? 'Lesson recorded.' : 'Lesson sent for review.', grantAwards(p));
      break;
    }
    case 'family-quiz-learner':
    case 'family-quiz-partner': {
      const family = finalFamilyTask(p);
      if (!family || !dialog.contains(el) || familyTurn?.playerId !== p.id) return;
      const quiz = schoolQuizFor(familyWeek);
      const result = readQuiz(quiz, data);
      if (!result) return fail('Choose exactly two answers for every question.');
      if (el.dataset.form === 'family-quiz-learner') {
        familyTurn.learnerResult = result;
        openDialog('Pass the device', `<p>${esc(tr('The learner’s answers are saved for this round. Hand the device to your adult to take their turn.'))}</p>
          ${button('Start adult’s turn', 'family-quiz-partner', '', 'primary')}`);
        return;
      }
      const learnerResult = familyTurn.learnerResult;
      if (!learnerResult) return;
      familyTurn = undefined;
      const showdown = { scores: [learnerResult.score, result.score], possible: result.maximum,
        learnerResult: { ...learnerResult, title: 'Learner’s quiz answers', passed: undefined },
        partnerResult: { ...result, title: 'Adult’s quiz answers', passed: undefined }
      };
      Object.assign(family, { showdown, status: 'approved', feedback: '',
        evidence: `${quiz.title} · ${showdown.scores[0]}/${showdown.possible} learner · ${showdown.scores[1]}/${showdown.possible} adult` });
      const learning = w.tasks.find(task => task.id === 'learning');
      if (canTakeSchoolQuiz(w, learning) && (!w.schoolQuizResult || learnerResult.passed)) {
        recordSchoolQuiz(w, learning, learnerResult);
        Object.assign(learning, { source: 'school-quiz', status: p.solo || learning.status === 'approved' ? 'approved' : 'submitted', evidence: '', feedback: '' });
      }
      completeWeeklyChallenge(p, familyWeek);
      save('Week 12 Showdown completed.', grantAwards(p));
      showFamilyQuizResult(showdown);
      break;
    }
    case 'school-quiz': {
      if (role !== 'learner' || !p || p.id !== el.dataset.player || weekOneLocked(p)) return;
      const week = p.weeks[Number(el.dataset.index)];
      const learning = week?.tasks.find(t => t.id === 'learning');
      if (!week || !canTakeSchoolQuiz(week, learning) || (week.index === familyWeek && finalFamilyTask(p))) return;
      const quiz = schoolQuizFor(week.index);
      if (!quiz) return;
      const result = readQuiz(quiz, data);
      if (!result) return fail(quiz.picks === 2 ? 'Choose exactly two answers for every question.' : 'Choose one answer for every question.');
      const { xp, points } = recordSchoolQuiz(week, learning, result);
      if (!week.closed) {
        const approved = p.solo || learning.status === 'approved';
        Object.assign(learning, { source: 'school-quiz', status: approved ? 'approved' : 'submitted', evidence: '', feedback: '' });
      }
      const reward = xp || points
        ? tr('Earned {xp} XP and {points} Shop points.', { xp, points })
        : tr('No additional XP or Shop points this time.');
      save(reward, grantAwards(p));
      openDialog(tr('Quiz results'), `<p role="status">${esc(reward)}</p>${quizResults(result, true, true)}
        ${result.passed ? '' : `<p>${esc(tr('Pass a retake to earn any remaining quiz rewards.'))}</p>
          ${button('Retake quiz', 'lesson-quiz', `data-index="${week.index}"`, 'primary')}`}`);
      break;
    }
    case 'business-activity': {
      if (role !== 'learner' || !p || p.mode !== 'manual' || w.closed || weekOneLocked(p) || !dialog.contains(el)) return;
      if (el.dataset.id && (task?.id !== 'business' || (!task.activity && !['todo', 'revision'].includes(task.status)))) return;
      const name = value('activityName');
      const income = readSetupAmount(value('activityIncome'), 0), cost = readSetupAmount(value('activityCost'), 0);
      if (!name || income === null || cost === null) return fail('Enter the activity, actual income and actual cost.');
      const recordedElsewhere = data.has('alreadyLogged');
      const linked = task ? w.transactions.filter(entry => entry.missionId !== task.id) : w.transactions;
      const entries = recordedElsewhere ? [] : [['sale', income], ['cost', cost]].filter(([, cents]) => cents > 0)
        .map(([kind, cents]) => ({ id: uid(), kind, cents, label: name, ...(task ? { missionId: task.id } : {}) }));
      const transactions = [...linked, ...entries];
      const error = transactionUpdateError(p, w, transactions);
      if (error) return fail(error);
      w.transactions = transactions;
      if (task) {
        const evidence = tr('{activity} · Income {income} · Cost {cost}', { activity: name, income: money(income), cost: money(cost) });
        Object.assign(task, { activity: { name, income, cost, recordedElsewhere }, assignedPrompt: taskPrompt(task, p, w),
          evidence, status: p.solo ? 'approved' : 'submitted', feedback: '' });
      }
      finish(task && !p.solo ? 'Activity logged and sent for review.' : 'Activity logged.', grantAwards(p));
      break;
    }
    case 'chore-preset':
    case 'remove-chore-preset': {
      if (role !== 'facilitator' || !p || !dialog.contains(el)) return;
      const presets = p.chorePresets ?? [];
      const existing = presets.find(chore => chore.id === el.dataset.id);
      if (el.dataset.id && !existing || el.dataset.form === 'remove-chore-preset' && !existing) return;
      if (el.dataset.form === 'remove-chore-preset') {
        p.chorePresets = presets.filter(chore => chore !== existing);
      } else {
        const title = value('presetTitle'), pay = readSetupAmount(value('presetPay'), 0);
        if (!title || pay === null) return fail('Enter a chore name and a valid amount.');
        if (existing) Object.assign(existing, { title, pay });
        else p.chorePresets = [...presets, { id: uid(), title, pay }];
      }
      closeDialog();
      save();
      manageChores(p);
      break;
    }
    case 'chore': {
      if (role !== 'learner' || !p || w.closed || weekOneLocked(p) || !dialog.contains(el)) return;
      const selected = value('chorePreset');
      const preset = p.chorePresets?.find(chore => chore.id === selected);
      const title = selected === 'unpaid' ? value('choreTitle') : preset?.title;
      if (!title) return fail('Choose an agreed chore or name an unpaid chore.');
      const id = uid(), pay = preset?.pay ?? 0;
      if (pay) w.transactions.push({ id: uid(), kind: 'reward', label: title, cents: pay, missionId: id });
      const detail = tr('Agreed pay: {amount}', { amount: money(pay) });
      w.tasks.push({ id, kind: 'chore', title, evidence: [detail, value('choreNote')].filter(Boolean).join(' · '),
        prompt: 'Log a chore you finished and the pay you agreed on.', required: false, points: 0, status: p.solo ? 'approved' : 'submitted', feedback: '' });
      finish(p.solo ? 'Chore logged.' : 'Chore logged and sent for review.', grantAwards(p));
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
      if (w.closed || !task || task.id === 'family' || !['todo','revision'].includes(task.status)) return;
      if (task.id === 'business' && p.mode === 'sim' && w.choice === null) return fail('Run market day first.');
      if (!value('evidence')) return fail('Add a short response before submitting.');
      Object.assign(task, { assignedPrompt: taskPrompt(task, p, w), evidence: value('evidence'), status: p.solo ? 'approved' : 'submitted', feedback: '' });
      finish(p.solo ? 'Mission complete.' : 'Activity submitted for review.', grantAwards(p)); break;
    case 'entry': {
      if (w.closed) return;
      const label = value('label'), kind = value('kind'), cents = Math.round(Number(value('amount')) * 100);
      if (!label) return fail('Enter a description for this entry.');
      if (!Number.isSafeInteger(cents) || cents < 1 || cents > 100000000 || !allowsEntry(p, kind)) return fail('Check the type and amount for this entry.');
      const existing = w.transactions.find(record => record.id === el.dataset.id && !record.sim && !record.missionId);
      if (el.dataset.id && !existing) return;
      const entry = { id: existing?.id ?? uid(), kind, label, cents };
      const transactions = existing ? w.transactions.map(record => record === existing ? entry : record) : [...w.transactions, entry];
      const error = transactionUpdateError(p, w, transactions);
      if (error) return fail(error);
      w.transactions = transactions;
      if (!existing && role === 'learner' && view === 'money') ledgerWeek = w.index;
      finish(existing ? 'Money log entry updated.' : isMoneyOut(kind) ? 'Money out recorded.' : 'Money in recorded. Check what’s available in Main.', grantAwards(p));
      break;
    }
    case 'add-bucket': {
      if (role !== 'learner' || view !== 'investments' || !p || (p.customBuckets?.length ?? 0) >= 12) return;
      const name = value('bucketName'), purpose = value('bucketPurpose'), art = value('bucketArt');
      if (!name || !purpose || name.length > 32 || purpose.length > 90 || !accountArt.some(option => option.id === art)) {
        return fail(tr('Enter a name and purpose, and choose an image.'));
      }
      const names = [...allAccounts(p), ...accountNames, 'Main', tr('Main account')];
      if (names.some(existing => existing.toLowerCase() === name.toLowerCase())) return fail(tr('Choose a different bucket name.'));
      (p.customBuckets ??= []).push({ name, purpose, art });
      finish(tr('Bucket created.'));
      break;
    }
    case 'move-money': {
      if (!w || w.closed || !['learner', 'facilitator'].includes(role)) return;
      const direction = value('direction'), bucket = value('bucket') === '' ? NaN : Number(value('bucket'));
      if (!['in', 'out'].includes(direction)) return fail('Choose a transfer direction.');
      const cents = Math.round(Number(value('move-amount')) * 100);
      if (cents <= 0) return fail('Enter an amount greater than zero.');
      const error = transferMoney(p, bucket, direction === 'in' ? -cents : cents);
      if (error) return fail(error);
      if (view === 'money') ledgerWeek = w.index;
      finish(tr('{amount} moved to {account}.', {amount:money(cents),account:direction === 'in' ? (language === 'en-NZ' ? 'Main' : tr('Main account')) : bucketName(p,bucket)}));
      break;
    }
    case 'edit-module': {
      const index = Number(el.dataset.index);
      if (role !== 'facilitator' || !Number.isInteger(index) || index < 0 || index >= Math.max(programmeLength,p.weeks.length) || p.weeks[index]?.closed) return;
      const module = { title: value('moduleTitle'), summary: value('moduleContext'), business: value('businessMission'), outside: value('outsideMission'), lessonNote: value('lessonNote'), lessonUrl: vimeoPlayer(value('moduleLink')) || value('moduleLink'), quizUrl: value('moduleQuiz') };
      if (!module.title || !module.summary || !module.business || !module.outside) return fail('Enter a title, context and both mission prompts.');
      if (module.lessonUrl && !isHttps(module.lessonUrl)) return fail('Enter an HTTPS lesson link or Vimeo iframe code.');
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
    case 'remove-entry': {
      if (w.closed) return;
      const transactions = w.transactions.filter(record => record.id !== el.dataset.id || record.sim);
      const error = transactionUpdateError(p, w, transactions);
      if (error) return fail(error);
      w.transactions = transactions;
      finish('Entry removed.'); break;
    }
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
      if (w.closed || task?.status !== 'submitted' || task.id === 'family') return;
      if (value('decision') === 'revision' && !value('feedback')) return fail('Add feedback so the learner knows what to change.');
      Object.assign(task, { status: value('decision'), feedback: value('feedback') });
      finish('Review saved.', grantAwards(p)); break;
    case 'solo-settle':
    case 'close-week': {
      const solo = el.dataset.form === 'solo-settle';
      if (Boolean(p.solo) !== solo || role !== (solo ? 'learner' : 'facilitator')) return;
      if (w.closed || weekOneLocked(p) || !totals(w).ready) return;
      if (!solo && !value('feedback')) return fail('Record feedback or an agreed next step.');
      w.feedback = solo ? w.tasks.find(t => t.id === 'reflection').evidence : value('feedback');
      w.module = moduleFor(p, w.index);
      w.closed = true;
      const unlocked = grantAwards(p, { checkSavings: true });
      const opened = startNextWeek(p, state.rules, weekSchedule(p), 'scheduled');
      if (view === 'detail' || (view === 'group' && isHomeGame())) detailWeek = undefined;
      const message = opened ? tr('Week {week} is open.', { week: w.index + 2 })
        : w.index === programmeLength - 1 ? tr('12 weeks complete! Open the learner dashboard to see your progress or keep playing.')
        : tr('Week {week} closed.', { week: w.index + 1 });
      finish(message, unlocked);
      break;
    }
  }
});

function refreshProgramme() {
  if (!dialog.open && syncProgramme()) save();
}
window.addEventListener('focus', refreshProgramme);
window.setInterval(refreshProgramme, 30_000);

render();

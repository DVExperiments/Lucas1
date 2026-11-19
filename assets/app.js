import { tracks, buckets, weeks, taskLabels, uid, makeWeek, makePlayer, fresh, totals, progress } from './game.js';

const key = 'sam-lucas-pilot-v1:' + location.pathname.replace(/index\.html$/, '');
const currency = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });
const money = cents => currency.format(cents / 100);
const $ = selector => document.querySelector(selector);
const dialog = $('#dialog');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const marks = ['↗', '◎', '◇', '♡'];
const statuses = { todo: 'To do', submitted: 'Awaiting review', revision: 'Revise', approved: 'Approved' };
let state;
let view = 'week';
let role = 'learner';
let ledgerWeek;
try { state = JSON.parse(localStorage.getItem(key)); } catch {}
if (state?.version !== 1 || !state.players?.length) state = fresh();

const player = () => state.players.find(p => p.id === state.current) ?? state.players[0];
const activeWeek = p => p.weeks.at(-1);
const button = (label, action, attrs = '', style = 'secondary') => `<button type="button" class="button ${style}" data-action="${action}" ${attrs}>${label}</button>`;
const pill = (label, tone = '') => `<span class="pill ${tone}">${label}</span>`;
function announce(message) { $('#live').textContent = message; }
function save(message) {
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { message = 'Browser storage is unavailable. Recent changes may be lost on reload.'; }
  render();
  if (message) {
    const toast = $('#notice');
    toast.textContent = message;
    toast.hidden = false;
    toast.focus();
  }
}
function navigate(next) {
  view = next;
  ledgerWeek = undefined;
  render();
  $('#main').focus();
}
function pageHeader(label, title, description, action = '') {
  return `<div class="page-header"><div><div class="eyebrow">${label}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
function pct(p) { return Math.min(100, Math.floor(progress(p).buckets[1] * 100 / p.target)); }
function taskName(task, week) { return task.title ?? (task.id === 'business' ? weeks[week.index].title : taskLabels[task.id]); }
function taskPrompt(task, p, week) {
  const info = weeks[week.index];
  if (task.id === 'business') return info.prompts[p.track];
  if (task.id === 'learning') return 'Read the short lesson and answer one question.';
  if (task.id === 'reflection') return info.reflection;
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
function weekView(p) {
  const week = activeWeek(p), info = weeks[week.index], tally = totals(week);
  const required = week.tasks.filter(t => t.required).length;
  const approved = week.tasks.filter(t => t.required && t.status === 'approved').length;
  return `<div class="context"><span>${esc(p.business)}</span><span>${tracks[p.track]} · ${p.mode === 'sim' ? 'Simulated business' : 'My own business'}</span>${button('Start your own game', 'add-player', '', 'small')}</div>
  <section class="hero"><div class="hero-content"><div class="eyebrow">THE BUSINESS CHALLENGE <span></span> WEEK ${week.index + 1} OF 4</div><h1>${week.closed ? 'Pilot complete' : info.title}</h1><p>${week.closed ? 'Look back on your decisions and see how far you came.' : info.summary}</p>
  ${week.closed ? button('See my progress', 'view', 'data-view="progress"', 'hero-button') : button(p.mode === 'sim' ? (week.choice === null ? 'Make your business decision' : 'See your business decision') : 'Open money log', p.mode === 'sim' ? 'simulate' : 'view', 'data-view="money"', 'hero-button')}</div>
  <div class="hero-art" aria-hidden="true"><div class="coin"><span>$</span></div><i class="spark s1">✦</i><i class="spark s2">✦</i><i class="spark s3">✧</i><div class="art-step step-one"></div><div class="art-step step-two"></div><div class="art-step step-three"></div></div></section>
  ${week.index > 0 && !week.closed ? `<p class="feedback next-step"><strong>From your last check-in</strong> · ${esc(p.weeks[week.index - 1].feedback)}</p>` : ''}<div class="work-layout"><section aria-labelledby="tasks-heading"><div class="section-title"><div><h2 id="tasks-heading">Weekly activities</h2><p>${approved} of ${required} required activities approved</p></div>${pill(week.closed ? 'Week closed' : (tally.ready ? 'Ready for check-in' : 'In progress'), 'green')}</div>
  <div class="tasks">${week.tasks.map((task, index) => `<article class="task"><div class="task-icon task-icon-${index % 3}" aria-hidden="true">${['↗', '◈', '✎'][index % 3]}</div><div class="task-copy"><div class="task-type">${taskLabels[task.id] ?? taskLabels.custom} · ${task.points} pts${task.required ? '' : ' · Optional'}</div><h3>${esc(taskName(task, week))}</h3><p>${esc(taskPrompt(task, p, week))}</p>${task.feedback ? `<p class="feedback"><strong>Feedback</strong> · ${esc(task.feedback)}</p>` : ''}</div><div class="task-actions">${pill(statuses[task.status], task.status === 'approved' ? 'green' : task.status === 'revision' ? 'amber' : '')}${button(week.closed || ['submitted','approved'].includes(task.status) ? 'View' : 'Open', 'task', `data-id="${esc(task.id)}"`, 'small')}</div></article>`).join('')}</div>
  </section><aside class="aside">${goal(p, true)}<section class="panel route"><h2>Pilot roadmap</h2><ol>${weeks.map((entry, index) => `<li class="${index === week.index ? 'current' : ''}"><span class="route-dot">${p.weeks[index]?.closed ? '✓' : index + 1}</span><span>${entry.title}</span></li>`).join('')}</ol></section></aside></div>`;
}
const typeNames = { sale: 'Sale', cost: 'Business expense', reward: 'Activity reward' };
function moneyView(p) {
  const week = p.weeks.find(w => w.index === ledgerWeek) ?? activeWeek(p), t = totals(week);
  return `${pageHeader('MY BUSINESS', 'Money log', 'See what came in, what went out and how profit is split.', week.closed ? '' : button('Add entry', 'add-entry', '', 'primary'))}
  <label class="inline-field">Week <select id="ledger-week">${p.weeks.map(w => `<option value="${w.index}" ${w === week ? 'selected' : ''}>${w.index + 1} · ${weeks[w.index].title}</option>`).join('')}</select></label>
  <div class="stats">${[['Sales',t.sales],['Expenses',t.costs],['Profit before tax',t.profit],['Simulated tax (' + week.rules.tax + '%)',t.tax]].map(([label,cents]) => `<article class="panel"><span>${label}</span><strong>${money(cents)}</strong></article>`).join('')}</div>
  <section class="panel ledger"><div class="section-title"><h2>Transactions</h2>${pill(week.closed ? 'Week closed' : 'Open week', 'green')}</div>
  ${week.transactions.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">Description</th><th scope="col">Type</th><th scope="col">Amount</th>${week.closed ? '' : '<th scope="col">Action</th>'}</tr></thead><tbody>${week.transactions.map(entry => `<tr><td>${esc(entry.label)}</td><td>${typeNames[entry.kind]}</td><td>${money(entry.cents)}</td>${week.closed ? '' : `<td>${entry.sim ? 'Scenario' : button('Remove', 'remove-entry', `data-id="${entry.id}"`, 'small')}</td>`}</tr>`).join('')}</tbody></table></div>` : '<p>No transactions yet. Add an entry or play this week’s business scenario.</p>'}</section>
  <div class="section-title spaced"><div><h2>${week.closed ? 'Weekly bucket allocation' : 'Bucket preview'}</h2><p>${t.profit < 0 ? 'This week made a loss, so there’s no profit to split.' : money(t.distributable) + ' of business profit after simulated tax.'}</p></div></div>
  ${bucketCards(t.allocations)}
  <p class="detail">Activity rewards recorded separately · ${money(t.rewards)}${t.match ? ' · Simulated savings match ' + money(t.match) : ''}</p>`;
}
function progressView(p) {
  const result = progress(p);
  const badges = [result.closed >= 1 && 'First check-in', result.closed >= 2 && 'Built a routine', result.closed >= 4 && 'Pilot finisher'].filter(Boolean);
  return `${pageHeader('MY BUSINESS', 'My progress', 'See what you saved and what you learnt along the way.')}
  <div class="progress-layout">${goal(p, true)}<div class="stats progress-stats"><article class="panel"><span>Weeks reviewed</span><strong>${result.closed} / 4</strong></article><article class="panel"><span>Points earned</span><strong>${result.points}</strong></article></div></div>
  <div class="section-title spaced"><div><h2>Four buckets</h2><p>Total allocations from closed weeks. Save includes any simulated match.</p></div></div>
  ${bucketCards(result.buckets)}
  <section class="panel ledger spaced"><h2>Check-in history</h2>${p.weeks.some(w => w.closed) ? `<ul class="history">${p.weeks.filter(w => w.closed).map(w => `<li><strong>Week ${w.index + 1} · ${weeks[w.index].title}</strong><p>${esc(w.feedback)}</p></li>`).join('')}</ul>` : '<p>Your facilitator’s feedback will appear after your first check-in.</p>'}
  <h3>Badges</h3>${badges.length ? badges.map(b => pill(b, 'green')).join(' ') : '<p>Close your first week to earn a badge.</p>'}</section>`;
}
function groupView() {
  const pending = state.players.flatMap(p => activeWeek(p).closed ? [] : activeWeek(p).tasks.filter(t => t.status === 'submitted').map(t => ({ p, t })));
  const ready = state.players.filter(p => !activeWeek(p).closed && totals(activeWeek(p)).ready);
  return `${pageHeader('FACILITATOR', esc(state.group), 'Assign activities, review submissions and close out each learner’s week.', button('Add learner', 'add-player', '', 'primary'))}
  <div class="stats">${[['Learners',state.players.length],['Awaiting review',pending.length],['Ready for check-in',ready.length],['Finished pilot',state.players.filter(p => activeWeek(p).closed).length]].map(([label,value]) => `<article class="panel"><span>${label}</span><strong>${value}</strong></article>`).join('')}</div>
  <section class="panel ledger"><div class="section-title"><h2>Review queue</h2>${button('Assign activity', 'assign')}</div>
  ${pending.length ? `<ul class="review-list">${pending.map(({ p, t }) => `<li><div><strong>${esc(p.name)} · ${esc(taskName(t, activeWeek(p)))}</strong><p>Week ${activeWeek(p).index + 1} · ${tracks[p.track]}</p></div>${button('Review', 'review', `data-player="${p.id}" data-id="${t.id}"`, 'small')}</li>`).join('')}</ul>` : '<p>New submissions will appear here.</p>'}</section>
  <section class="panel ledger spaced"><h2>Learners</h2><div class="table-wrap"><table><thead><tr><th scope="col">Learner</th><th scope="col">Week</th><th scope="col">Progress</th><th scope="col">Action</th></tr></thead>
  <tbody>${state.players.map(p => {
    const w = activeWeek(p);
    const status = w.closed ? 'Pilot complete' : totals(w).ready ? 'Ready for check-in' : w.tasks.some(t => t.status === 'submitted') ? 'Awaiting review' : w.tasks.some(t => t.status !== 'todo') || w.transactions.length ? 'In progress' : 'To start';
    return `<tr><td><strong>${esc(p.name)}</strong><div class="detail">${tracks[p.track]}</div></td><td>${w.index + 1} / 4</td><td>${pill(status, status === 'Ready for check-in' || w.closed ? 'green' : '')}</td><td>${button('Open learner', 'learner-summary', `data-player="${p.id}"`, 'small')}${totals(w).ready && !w.closed ? button('Check in', 'close-week', `data-player="${p.id}"`, 'small') : ''}</td></tr>`;
  }).join('')}</tbody></table></div></section>
  <p class="detail">These learner profiles and facilitator controls are shared within this browser.</p>`;
}
function settingsView() {
  return `${pageHeader('FACILITATOR', 'Pilot settings', 'Changes apply to newly opened weeks. Current and closed weeks retain their existing rules.')}
  <form class="panel settings" id="settings"><div class="fields">
  <label>Group name<input name="group" value="${esc(state.group)}" required maxlength="60"></label>
  <label>SAM lesson link (optional)<input type="url" name="lessonUrl" value="${esc(state.lessonUrl)}" placeholder="https://"></label>
  <label>Simulated tax rate (%)<input type="number" name="tax" min="0" max="100" required value="${state.rules.tax}"></label>
  <label>Weekly completion bonus (points)<input type="number" name="bonus" min="0" max="1000" required value="${state.rules.bonus}"></label>
  <label>Simulated savings match (%)<input type="number" name="match" min="0" max="100" required value="${state.rules.match}"></label>
  <label>Weekly match cap (NZD)<input type="number" name="cap" min="0" max="100000" step=".01" required value="${state.rules.cap / 100}"></label></div>
  <fieldset><legend>Bucket allocation</legend><div class="fields split">${buckets.map((name,i) => `<label>${name} (%)<input name="split" type="number" min="0" max="100" required value="${state.rules.split[i]}"></label>`).join('')}</div></fieldset>
  <p class="detail">Bucket percentages must add up to 100.</p><p class="error" role="alert"></p><button class="button primary">Save settings</button></form>`;
}
function render() {
  const p = player();
  $('#role').innerHTML = `<button type="button" class="role-switch" data-action="switch-role">${role === 'learner' ? 'Facilitator view' : 'Learner view'}</button>`;
  const links = role === 'learner' ? [['week','This week'],['money','Money log'],['progress','My progress']] : [['group','Group dashboard'],['settings','Settings']];
  $('#nav').innerHTML = links.map(([id,label]) => `<button type="button" data-action="view" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${label}</button>`).join('') + (role === 'learner' ? `<label class="profile"><span class="sr-only">Learner profile</span><select id="profile">${state.players.map(other => `<option value="${other.id}" ${other.id === p.id ? 'selected' : ''}>${esc(other.name)}</option>`).join('')}</select></label>` : '');
  const sections = { week: weekView, money: moneyView, progress: progressView, group: groupView, settings: settingsView };
  $('#main').innerHTML = '<p id="notice" class="toast" role="status" tabindex="-1" hidden></p>' + sections[view](p);
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
function textField(label, name, value = '', limit = 80) {
  return `<label>${label}<input name="${name}" value="${esc(value)}" maxlength="${limit}" required></label>`;
}
function noteField(label, name, value = '', required = true) {
  return `<label>${label}<textarea name="${name}" rows="4" maxlength="600" ${required ? 'required' : ''}>${esc(value)}</textarea></label>`;
}
function taskDialog(p, week, task) {
  const spec = weeks[week.index];
  const editable = !week.closed && ['todo', 'revision'].includes(task.status);
  let content = `<p>${esc(taskPrompt(task, p, week))}</p>`;
  if (task.feedback) content += `<p class="feedback"><strong>Feedback</strong> · ${esc(task.feedback)}</p>`;
  if (task.id === 'learning') {
    content += `<div class="lesson"><h3>Money lesson</h3><p>${spec.lesson}</p>${state.lessonUrl ? `<a href="${esc(state.lessonUrl)}" target="_blank" rel="noopener noreferrer">Open SAM lesson (new tab)</a>` : ''}</div>`;
    if (editable) content += form('quiz', `<fieldset><legend>${spec.question}</legend>${spec.answers.map((answer, index) => `<label class="radio"><input type="radio" name="answer" value="${index}" required> ${answer}</label>`).join('')}</fieldset>`, 'Submit answer');
  } else if (editable) {
    if (task.id === 'business' && p.mode === 'sim' && week.choice === null) {
      content += `<p>Play this week’s business scenario before submitting your decision.</p>${button('Make your business decision', 'simulate', '', 'primary')}`;
    } else {
      content += form('task', noteField('Your response', 'evidence', task.evidence), 'Submit for review', `data-id="${task.id}"`);
    }
  }
  if (!editable) content += task.evidence ? `<div class="lesson"><strong>Your submission</strong><p>${esc(task.evidence)}</p></div>` : `<p>${statuses[task.status]}</p>`;
  openDialog(esc(taskName(task, week)), content);
}
function playerDialog(p) {
  openDialog(p ? 'Edit goal and business' : 'Add learner', form(p ? 'edit-player' : 'add-player', `<div class="fields">
    ${textField('First name or nickname', 'name', p?.name, 40)}${textField('Business name', 'business', p?.business)}
    <label>Learning level<select name="track">${tracks.map((label,index) => `<option value="${index}" ${index === p?.track ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    <label>Business mode<select name="mode" ${p ? 'disabled' : ''}><option value="sim">Simulated business</option><option value="manual" ${p?.mode === 'manual' ? 'selected' : ''}>My own business</option></select></label>
    ${textField('Savings goal', 'goal', p?.goal)}<label>Goal amount (NZD)<input name="target" type="number" step=".01" min=".01" max="1000000" value="${p ? p.target / 100 : ''}" required></label></div>`, p ? 'Save changes' : 'Create learner'));
}
function simulate(p, w) {
  const spec = weeks[w.index];
  if (w.choice !== null) {
    const choice = spec.decisions[w.choice];
    openDialog('Your business decision', `<h3>${choice[0]}</h3><p>${choice[1]}</p><div class="lesson"><strong>${money(choice[2])} sales · ${money(choice[3])} costs</strong></div>
      <div class="dialog-actions">${button('Open money log', 'view', 'data-view="money"')}${button('Write your response', 'task', 'data-id="business"', 'primary')}</div>`);
    return;
  }
  openDialog(spec.title, `<p>${spec.summary}</p><div class="decisions">${spec.decisions.map(([label], index) => `<button type="button" data-action="decision" data-index="${index}">${label}</button>`).join('')}</div>`);
}
function reviewDialog(p, t) {
  const w = activeWeek(p);
  openDialog('Review ' + esc(p.name) + '’s submission', `<h3>${esc(taskName(t, w))}</h3><p>${esc(taskPrompt(t, p, w))}</p><div class="lesson"><p>${esc(t.evidence)}</p></div>
    ${form('review', `<label>Decision<select name="decision"><option value="approved">Approve</option><option value="revision">Ask for a revision</option></select></label>${noteField('Feedback', 'feedback', '', false)}`, 'Save review', `data-player="${p.id}" data-id="${t.id}"`)}`);
}
function learnerSummary(p) {
  const w = activeWeek(p), result = progress(p), t = totals(w);
  openDialog(esc(p.name) + '’s progress', `<p>${esc(p.business)} · ${tracks[p.track]}</p><div class="lesson">
    <p><strong>Savings goal</strong> · ${esc(p.goal)} (${money(result.buckets[1])} of ${money(p.target)})</p><p><strong>Reviewed weeks</strong> · ${result.closed} of 4</p><p><strong>Points</strong> · ${result.points}</p>
    <p><strong>Week ${w.index + 1} profit before simulated tax</strong> · ${money(t.profit)}</p></div>
    <ul class="history">${w.tasks.map(task => `<li>${esc(taskName(task, w))} · ${statuses[task.status]}</li>`).join('')}</ul>
    <div class="dialog-actions">${button('Open learner view', 'switch-player', `data-player="${p.id}"`)}${!w.closed && t.ready ? button('Record check-in', 'close-week', `data-player="${p.id}"`, 'primary') : ''}</div>`);
}

document.addEventListener('click', event => {
  const el = event.target.closest('button[data-action]');
  if (!el) return;
  const { action, player: id, view: next, index, id: item } = el.dataset;
  const p = id ? state.players.find(other => other.id === id) : player();
  if (!p) return;
  const w = activeWeek(p), task = w.tasks.find(t => t.id === item);
  switch (action) {
    case 'dismiss': closeDialog(); break;
    case 'view': closeDialog(); navigate(role === 'facilitator' && next === 'week' ? 'group' : next); break;
    case 'switch-role': role = role === 'learner' ? 'facilitator' : 'learner'; navigate(role === 'learner' ? 'week' : 'group'); break;
    case 'switch-player': state.current = p.id; role = 'learner'; closeDialog(); navigate('week'); save(); break;
    case 'edit-player': playerDialog(p); break;
    case 'add-player': playerDialog(); break;
    case 'task': if (task) taskDialog(p, w, task); break;
    case 'simulate': simulate(p, w); break;
    case 'decision': {
      if (w.choice !== null || w.closed) return;
      const choice = weeks[w.index].decisions[Number(index)];
      if (!choice) return;
      w.choice = Number(index);
      w.transactions.push({ id: uid(), kind: 'sale', label: 'Scenario sales', cents: choice[2], sim: true }, { id: uid(), kind: 'cost', label: 'Scenario costs', cents: choice[3], sim: true });
      save();
      simulate(p, w);
      announce('Business decision saved. Scenario transactions added to the money log.');
      break;
    }
    case 'add-entry':
      if (w.closed) return;
      openDialog('Add money log entry', form('entry', `<label>Type<select name="kind">${Object.entries(typeNames).filter(([kind]) => p.mode === 'manual' || kind === 'reward').map(([kind,label]) => `<option value="${kind}">${label}</option>`).join('')}</select></label>
      ${p.mode === 'sim' ? '<p class="detail">The business scenario adds sales and expenses automatically.</p>' : ''}
      ${textField('Description', 'label')}<label>Amount (NZD)<input name="amount" type="number" min=".01" max="1000000" step=".01" required></label>`, 'Save entry')); break;
    case 'remove-entry': {
      const entry = w.transactions.find(record => record.id === item && !record.sim);
      if (!entry || w.closed) return;
      openDialog('Remove entry?', `<p>${esc(entry.label)} · ${money(entry.cents)}</p>${form('remove-entry', '', 'Remove entry', `data-id="${item}"`)}`);
      break;
    }
    case 'assign':
      openDialog('Assign activity', form('assign', `<label>Assign to<select name="recipient"><option value="all">All learners with an open week</option>${state.players.filter(other => !activeWeek(other).closed).map(other => `<option value="${other.id}">${esc(other.name)} · Week ${activeWeek(other).index + 1}</option>`).join('')}</select></label>
      ${textField('Activity title', 'title')}${noteField('What should they do and submit?', 'prompt')}<label>Points<input type="number" name="points" value="10" min="0" max="100" required></label>
      <label class="radio"><input type="checkbox" name="required"> Required for check-in</label>`, 'Assign activity')); break;
    case 'review': if (task?.status === 'submitted' && !w.closed) reviewDialog(p, task); break;
    case 'learner-summary': learnerSummary(p); break;
    case 'close-week':
      if (totals(w).ready && !w.closed) openDialog('Check in with ' + esc(p.name), `<p>All required activities are approved. Review the business result and agree on one next step.</p>
      ${w.tasks.some(t => !t.required && t.status === 'submitted') ? '<p>Optional submissions are still awaiting review. Review them before closing the week if you want them to count.</p>' : ''}
      <div class="lesson"><strong>Week ${w.index + 1}</strong><p>${money(totals(w).profit)} profit before simulated tax · ${money(totals(w).allocations[1])} allocated to Save</p></div>
      ${form('close-week', noteField('Feedback and next step', 'feedback'), w.index === weeks.length - 1 ? 'Finish pilot' : 'Close week and open next', `data-player="${p.id}"`)}`); break;
  }
});
document.addEventListener('change', event => {
  if (event.target.id === 'profile') { state.current = event.target.value; ledgerWeek = undefined; save(); $('#profile').focus(); }
  if (event.target.id === 'ledger-week') { ledgerWeek = Number(event.target.value); render(); $('#ledger-week').focus(); }
});
document.addEventListener('submit', event => {
  const el = event.target;
  if (!el.matches('[data-form], #settings')) return;
  event.preventDefault();
  const data = new FormData(el);
  const value = name => String(data.get(name) ?? '').trim();
  const fail = message => { el.querySelector('.error').textContent = message; };
  const p = el.dataset.player ? state.players.find(other => other.id === el.dataset.player) : player();
  if (!p) return;
  const w = activeWeek(p), task = w.tasks.find(t => t.id === el.dataset.id);
  const finish = message => { closeDialog(); save(message); };
  switch (el.dataset.form ?? 'settings') {
    case 'settings': {
      const split = data.getAll('split').map(Number);
      if (split.reduce((sum, n) => sum + n, 0) !== 100) return fail('Bucket percentages must add up to 100.');
      if (!value('group')) return fail('Enter a group name.');
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
    case 'add-player':
    case 'edit-player': {
      const fields = { name: value('name'), business: value('business'), goal: value('goal'), track: Number(value('track')), target: Math.round(Number(value('target')) * 100) };
      if (!fields.name || !fields.business || !fields.goal) return fail('Enter a name, a business and a savings goal.');
      if (el.dataset.form === 'edit-player') Object.assign(p, fields);
      else {
        const learner = makePlayer({ ...fields, mode: value('mode') }, state.rules);
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
      learning.status = 'submitted';
      learning.evidence = 'Quiz passed · ' + spec.answers[spec.correct];
      finish('Answer correct. Submitted for review.');
      break;
    }
    case 'task':
      if (w.closed || !task || !['todo','revision'].includes(task.status)) return;
      if (!value('evidence')) return fail('Add a short response before submitting.');
      Object.assign(task, { evidence: value('evidence'), status: 'submitted', feedback: '' });
      finish('Activity submitted for review.'); break;
    case 'entry':
      if (w.closed) return;
      if (!value('label')) return fail('Enter a description for this entry.');
      w.transactions.push({ id: uid(), kind: value('kind'), label: value('label'), cents: Math.round(Number(value('amount')) * 100) });
      finish('Entry added to your money log.'); break;
    case 'remove-entry':
      if (w.closed) return;
      w.transactions = w.transactions.filter(record => record.id !== el.dataset.id || record.sim);
      finish('Entry removed.'); break;
    case 'assign': {
      const title = value('title'), prompt = value('prompt');
      if (!title || !prompt) return fail('Enter an activity title and instructions.');
      const eligible = state.players.filter(other => !activeWeek(other).closed && (value('recipient') === 'all' || value('recipient') === other.id));
      if (!eligible.length) return fail('No learners have an open week for this activity.');
      eligible.forEach(other => activeWeek(other).tasks.push({ id: uid(), title, prompt, points: Number(value('points')), required: data.has('required'), status: 'todo', evidence: '', feedback: '' }));
      finish(`Activity assigned to ${eligible.length} ${eligible.length === 1 ? 'learner' : 'learners'}.`); break;
    }
    case 'review':
      if (w.closed || task?.status !== 'submitted') return;
      if (value('decision') === 'revision' && !value('feedback')) return fail('Add feedback so the learner knows what to change.');
      Object.assign(task, { status: value('decision'), feedback: value('feedback') });
      finish('Review saved.'); break;
    case 'close-week':
      if (w.closed || !totals(w).ready) return;
      if (!value('feedback')) return fail('Record feedback or an agreed next step.');
      w.feedback = value('feedback');
      w.closed = true;
      if (w.index < weeks.length - 1) {
        p.weeks.push(makeWeek(w.index + 1, state.rules));
        finish(`Week ${w.index + 1} closed. Week ${w.index + 2} is open.`);
      } else finish('Final check-in recorded. Pilot complete.');
      break;
  }
});

render();

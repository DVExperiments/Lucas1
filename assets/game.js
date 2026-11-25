import { programmeLength, episodeFor } from './curriculum.js';
import { ensureFamilyTask } from './family.js';
import { weeklyCertificates, weeklyPoints, weeklyAvatarRewards } from './challenges.js';

export const tracks = ['Ages 8–10', 'Ages 11–13 · Intermediate', 'Ages 14–17'];
export const buckets = ['Spend', 'Save', 'Invest', 'Give'];
export const defaults = { tax: 10, split: [30, 30, 30, 10], bonus: 25, match: 0, cap: 2000 };
export const weeks = [
  {
    title: 'Open for business', summary: 'Find a price that covers your costs and gives customers a reason to buy.',
    lesson: 'Sales are all the money customers pay. Profit is what’s left after you pay your costs. If you sell five items for $4 each and spend $12 making them, you have $8 before simulated tax.',
    question: 'What is your profit before tax in this example?',
    answers: ['$20', '$12', '$8'], correct: 2,
    prompts: ['Pick a price. How much would you have left after paying for your materials?', 'Compare two prices and work out how many sales cover your costs.', 'Compare two prices including fees and time. What if only half your expected sales come through?'],
    reflection: 'Who might buy from you, and what could you ask them before making more?'
  },
  {
    title: 'Make every dollar count', summary: 'Compare the cost of buying more stock with the flexibility of buying less.',
    lesson: 'Some costs change with every sale, such as packaging. Other costs stay the same for the week, such as stall hire. Buying in bulk can lower cost per item while using more cash upfront.',
    question: 'Which cost usually increases as you sell more items?',
    answers: ['Weekly stall hire', 'Packaging for each item', 'A one-off sign'], correct: 1,
    prompts: ['Compare two ways to buy supplies. Which leaves more money this week?', 'Compare two suppliers by unit cost and total upfront cost.', 'Compare supplier terms and explain what extra inventory would do to cash flow.'],
    reflection: 'Name one cost you could reduce while still making something people want.'
  },
  {
    title: 'Handle a quiet week', summary: 'Respond to a slowdown and decide what you can afford to risk.',
    lesson: 'You can make a loss in a slow week. A cash buffer gives you more options when sales are lower than expected. Your saving goal and your business cash can serve different purposes.',
    question: 'What does a business cash buffer help you do?',
    answers: ['Cover costs during a slow week', 'Guarantee every customer returns', 'Make every sale profitable'], correct: 0,
    prompts: ['Sales are slow. Choose a small change and say why you picked it.', 'Compare a promotion with a lower-cost way to test new demand.', 'Model a weaker sales week. Set a cash buffer and explain which costs you’d cut first.'],
    reflection: 'What did the slow week teach you? What would you try next time?'
  },
  {
    title: 'Make your next move', summary: 'Review your first four weeks and choose where to go next.',
    lesson: 'Saving toward a goal gives that money a specific job. Investing usually has a longer time horizon and its value can rise or fall. The game helps you plan both using two buckets.',
    question: 'Which bucket fits a goal you want to pay for soon?',
    answers: ['Invest', 'Save', 'Give'], correct: 1,
    prompts: ['Tell someone what worked and pick one thing to try next.', 'Summarise your results and explain one change for the next month.', 'Compare your forecast with results and choose whether to expand, hold or change your offer.'],
    reflection: 'What are you proud of, how far did you get towards your goal, and what will you do next?'
  }
];

export const taskLabels = { business: 'Business', learning: 'Money lesson', reflection: 'Reflection', family: 'Family challenge', custom: 'Extra challenge' };
export const uid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
};
export function makeWeek(index, rules) {
  return ensureFamilyTask({ index, closed: false, rules: structuredClone(rules), transactions: [], transfers: [], choice: null, feedback: '',
    tasks: ['business', 'learning', 'reflection'].map(id => ({ id, required: true, points: 10, status: 'todo', evidence: '', feedback: '' })) });
}
export function effectiveWeekSchedule(group, player) {
  return player.weekSchedule ?? group.weekSchedule ?? { mode: 'manual' };
}

export function todayDate(now = new Date()) {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
}

export function validStartDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return value <= '9999-10-15' && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function weekStartDate(schedule, index) {
  if (schedule.mode !== 'scheduled' || !validStartDate(schedule.startDate) || index >= programmeLength) return '';
  const date = new Date(schedule.startDate + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + index * 7);
  return date.toISOString().split('T')[0];
}

export function waitingForWeekOne(player, schedule, today = todayDate()) {
  const week = player.weeks[0];
  return player.weeks.length === 1 && !week.started && !week.closed &&
    weekStartDate(schedule, 0) > today &&
    !week.transactions.length && !week.transfers?.length && week.plan === undefined &&
    week.choice == null && !week.videoWatched && !week.quizPassed && !week.schoolQuizResult && !week.weeklyCertificate &&
    !week.tasks.some(task => task.status !== 'todo');
}

export function nextProgrammeWeek(player) {
  const week = player.weeks.at(-1);
  return week.closed && week.index + 1 < programmeLength ? week.index + 1 : null;
}

export function startNextWeek(player, rules, schedule, trigger, today = todayDate()) {
  const index = nextProgrammeWeek(player);
  if (index === null || schedule.mode !== trigger) return false;
  const date = weekStartDate(schedule, index);
  if (trigger === 'scheduled' && (!date || date > today)) return false;
  player.weeks.push(makeWeek(index, rules));
  return true;
}

export function makePlayer(fields, rules) {
  return { id: uid(), ...fields, weeks: [makeWeek(0, rules)] };
}
export function newGroup(name) {
  return { version: 1, ageBandsV2: true, group: name, rules: structuredClone(defaults), lessonUrl: '', current: null, players: [] };
}
export function newHomeGame(fields, appearance) {
  const game = newGroup(fields.name + '’s home game');
  const learner = makePlayer({ ...fields, solo: false }, game.rules);
  if (appearance) setStarterLook(learner, appearance);
  return { ...game, kind: 'home', current: learner.id, players: [learner] };
}
export function fresh() {
  const rules = structuredClone(defaults);
  const player = makePlayer({ name: 'Alex', track: 1, business: 'Coastline Car Wash', goal: 'Buy a second-hand bike', target: 3000, mode: 'manual', solo: true, offer: 'Wash family cars on Saturdays for an agreed price.', customers: 'Family and neighbours I know' }, rules);
  const sampleJobs = [[2000, 600], [3000, 1200], [2000, 300]];
  for (const [index, [income, cost]] of sampleJobs.entries()) {
    const week = player.weeks[index];
    week.transactions = [
      { id: uid(), kind: 'sale', label: 'Car wash jobs', cents: income },
      { id: uid(), kind: 'cost', label: 'Car wash supplies', cents: cost }
    ];
    for (const task of week.tasks) {
      Object.assign(task, { status: 'approved', evidence: 'Completed in the sample game.' });
    }
    Object.assign(week, { closed: true, transfers: undefined, videoWatched: true, quizPassed: true, feedback: 'Keep a note of what supplies you use each week.' });
    player.weeks.push(makeWeek(index + 1, rules));
  }
  const peer = makePlayer({ name: 'Jamie', track: 0, business: 'Weekend Plant Stall', goal: 'Buy art supplies', target: 6000, mode: 'manual', offer: 'Grow and sell easy-care plants.', customers: 'Family and neighbours' }, rules);
  peer.modules = { 0: { title: 'Set up your plant stall', summary: 'Pick one plant to sell and agree a price. Ask two people what they would pay for it before you make up a sign.', business: 'Find out what one plant costs to grow. Ask two people about your price and write what you decided.', outside: 'Imagine you have $10 to put together a gift. Ask someone how they would split that between the gift and the wrapping, then explain your own plan.' } };
  peer.weeks[0].transactions.push({ id: uid(), kind: 'sale', label: 'Two potted herbs', cents: 1200 }, { id: uid(), kind: 'cost', label: 'Pots and potting mix', cents: 400 });
  peer.weeks[0].tasks[0].status = 'submitted';
  peer.weeks[0].tasks[0].evidence = 'The pots and mix cost $4 for two herbs. I asked my aunt and my neighbour, then chose $6 per plant.';
  return { ...newGroup('Test group'), showLearnerLeaderboard:true, current: player.id, players: [player, peer] };
}
const fullQuizXp = 20;

function quizXp(week) {
  return week.schoolQuizRewards?.xp ?? (week.quizPassed || week.schoolQuizResult || week.tasks.some(task =>
    task.id === 'learning' && task.source !== 'reflection' && task.status === 'approved') ? fullQuizXp : 0);
}

export function taskPoints(week, task) {
  return task.id === 'learning' ? week.schoolQuizRewards?.points ?? task.points : task.points;
}

export function recordSchoolQuiz(week, task, result) {
  const previousXp = quizXp(week);
  const previousPoints = week.schoolQuizRewards?.points ?? (task.status === 'approved' ? task.points : 0);
  const fraction = result.passed ? 1 : 0.5;
  const xp = Math.max(previousXp, fullQuizXp * fraction);
  const points = Math.max(previousPoints, task.points * fraction);
  week.schoolQuizRewards = { xp, points };
  week.schoolQuizResult = result;
  return { xp: xp - previousXp, points: points - previousPoints };
}

export function totals(week) {
  const sum = kind => week.transactions.filter(entry => entry.kind === kind).reduce((acc, entry) => acc + entry.cents, 0);
  const sales = sum('sale'), costs = sum('cost'), rewards = sum('reward'), spending = sum('spend');
  const profit = sales - costs;
  const tax = Math.round(Math.max(0, profit) * week.rules.tax / 100);
  const distributable = Math.max(0, profit - tax);
  const allocations = buckets.map(() => 0);
  if (week.transfers) {
    for (const move of week.transfers) allocations[move.bucket] = (allocations[move.bucket] ?? 0) + move.cents;
  } else {
    // Historical closed weeks keep their original automatic allocations.
    const raw = week.rules.split.map(rate => distributable * rate);
    raw.forEach((value, i) => allocations[i] = Math.floor(value / 100));
    const order = [0, 1, 2, 3].sort((a, b) => raw[b] % 100 - raw[a] % 100);
    const remainder = distributable - allocations.reduce((a, b) => a + b, 0);
    order.slice(0, remainder).forEach(index => allocations[index]++);
  }
  const missionPoints = week.tasks.reduce((points, task) => {
    const credited = task.status === 'approved' || (task.id === 'learning' && week.schoolQuizRewards);
    return points + (credited ? taskPoints(week, task) : 0);
  }, 0);
  const ready = week.tasks.every(task => !task.required || task.status === 'approved');
  const bonus = week.closed && ready ? week.rules.bonus : 0;
  const match = week.closed && ready ? Math.min(Math.round(Math.max(0, allocations[1]) * week.rules.match / 100), week.rules.cap) : 0;
  return { sales, costs, rewards, spending, profit, tax, distributable, allocations, ready, match, points: missionPoints + bonus };
}
export function accounts(player, replacement) {
  let cash = 0, moved = 0;
  const balances = Array(buckets.length + (player.customBuckets?.length ?? 0)).fill(0);
  for (const record of player.weeks) {
    const week = replacement?.index === record.index ? replacement : record;
    const t = totals(week);
    cash += t.rewards;
    if (week.transfers) {
      cash += t.profit - t.tax;
      moved += t.allocations.reduce((sum, amount) => sum + amount, 0);
    }
    if (week.transfers || week.closed) {
      t.allocations.forEach((value, i) => balances[i] += value);
      balances[0] -= t.spending;
      balances[1] += t.match;
    }
  }
  const main = cash - moved;
  return { main, available: Math.max(0, main), balances, moved };
}

export function wealthBreakdown(player) {
  const result = { business:0, market:0, rewards:0, match:0, costs:0, tax:0, spending:0, earlierAdjustment:0 };
  for (const week of player.weeks) {
    const tally = totals(week);
    const marketSales = week.transactions.reduce((sum, entry) => entry.sim && entry.kind === 'sale' ? sum + entry.cents : sum, 0);
    result.business += tally.sales - marketSales;
    result.market += marketSales;
    result.rewards += tally.rewards;
    result.match += tally.match;
    result.costs += tally.costs;
    result.tax += tally.tax;
    result.spending += tally.spending;
    // Earlier versions allocated only positive after-tax profit and did not carry losses forward.
    if (week.closed && !week.transfers) result.earlierAdjustment += tally.distributable - (tally.profit - tally.tax);
  }
  const bank = accounts(player);
  result.total = bank.main + bank.balances.reduce((sum, amount) => sum + amount, 0);
  return result;
}

export function transactionUpdateError(player, week, transactions) {
  const before = accounts(player);
  const after = accounts(player, { ...week, transactions });
  if (after.balances[0] < 0) return 'There isn’t enough in Spend for that purchase. Move money from Main into Spend, then try again.';
  if (after.moved > 0 && after.main < Math.min(0, before.main)) {
    return 'This change needs more in Main. Move money back from a bucket, then try again.';
  }
  return '';
}

export function transferMoney(player, bucket, cents) {
  const week = player.weeks.at(-1);
  if (!week?.transfers || week.closed) return 'Open a new week before moving money.';
  if (!Number.isInteger(bucket) || bucket < 0 || bucket >= buckets.length + (player.customBuckets?.length ?? 0) || !Number.isSafeInteger(cents) || cents === 0) {
    return 'Choose an account and enter an amount greater than zero.';
  }
  const bank = accounts(player);
  if (cents > bank.available) return 'There isn’t enough in Main. Log money in or move some back from a bucket first.';
  if (-cents > bank.balances[bucket]) return 'There isn’t enough in this bucket to move that much back.';
  week.transfers.push({ bucket, cents });
  return '';
}

export function progress(player) {
  const awardPoints = earnedAwards(player).reduce((sum, award) => sum + award.points, 0);
  const challengePoints = weeklyCertificates(player).length * weeklyPoints;
  return player.weeks.reduce((sum, week) => {
    if (week.closed) sum.closed++;
    sum.points += totals(week).points;
    return sum;
  }, { buckets: accounts(player).balances, points: awardPoints + challengePoints, awardPoints, challengePoints, closed: 0 });
}

export const market = [
  {
    place: 'The first market', signal: 'A community event is bringing more people past your stand. Some have time to stop, while others are just passing through.',
    plans: [
      { price: 500, capacity: 16, demand: 10, cost: 2800, label: 'Start with a friendly price', tradeoff: 'A lower price brings in more customers. Each sale earns less.' },
      { price: 900, capacity: 10, demand: 6, cost: 3200, label: 'Make it a premium offer', tradeoff: 'You need fewer sales to cover costs. Some customers may walk past.' }
    ],
    tactics: [['Put up a hand-made sign', 3, 100, 1], ['Hand out printed flyers', 5, 1400, 0], ['Stick to the plan', 0, 0, 0]]
  },
  {
    place: 'The supply run', signal: 'A neighbouring stall offers to tell their customers about you. There could be more interest than you expected.',
    plans: [
      { price: 600, capacity: 9, demand: 8, cost: 3000, label: 'Buy a small batch', tradeoff: 'Spend less today and give yourself room to change plans.' },
      { price: 600, capacity: 16, demand: 8, cost: 4800, label: 'Buy a bulk batch', tradeoff: 'Pay more up front. You have capacity for a busy day.' }
    ],
    tactics: [['Trade referrals', 2, 0, 2], ['Share a joint advertisement', 6, 600, 1], ['Stick to the plan', 0, 0, 0]]
  },
  {
    place: 'The rainy market', signal: 'Rain keeps casual customers home. A handful of regulars are still looking for a reason to come out.',
    plans: [
      { price: 700, capacity: 10, demand: 2, cost: 3900, label: 'Pay for a promotion', tradeoff: 'A large promotion costs more. You’re betting on enough new sales to cover it.' },
      { price: 700, capacity: 6, demand: 2, cost: 1500, label: 'Run a smaller offer', tradeoff: 'Cut spending and keep the operation small for the week.' }
    ],
    tactics: [['Invite your regulars', 2, 0, 1], ['Offer local delivery', 4, 1100, 0], ['Stick to the plan', 0, 0, 0]]
  },
  {
    place: 'The market finale', signal: 'Market day is busy. Some shoppers are looking for something new, and your regulars are back to see what you have planned.',
    plans: [
      { price: 700, capacity: 13, demand: 9, cost: 3400, label: 'Stick with your proven offer', tradeoff: 'Keep spending predictable and give your regulars something familiar.' },
      { price: 1000, capacity: 10, demand: 7, cost: 5600, label: 'Test something new', tradeoff: 'A bigger upfront cost buys you the chance of higher sales.' }
    ],
    tactics: [['Reward returning customers', 3, 200, 2], ['Set up a live demonstration', 5, 1100, 1], ['Stick to the plan', 0, 0, 0]]
  }
];
export function goodwill(player, before = Infinity) {
  return player.weeks.filter(w => w.index < before).reduce((total, w) => total + (w.result?.regularsEarned ?? 0), 0);
}
export function marketResult(player, week, planIndex, tacticIndex) {
  const spec = market[week.index % market.length];
  const { price, capacity, demand, cost } = spec.plans[planIndex];
  const [tactic, lift, fee, earned] = spec.tactics[tacticIndex];
  const bonus = Math.min(2, Math.floor(goodwill(player, week.index) / 2));
  const demandTotal = demand + lift + bonus;
  const sold = Math.min(capacity, demandTotal);
  return { price, capacity, sold, demand: demandTotal, returning: Math.min(bonus, sold), sales: sold * price, costs: cost + fee,
    regularsEarned: Math.min(earned + (sold >= 8 ? 1 : 0), sold), tactic, fee };
}

export function moduleFor(player, index) {
  const saved = player.weeks[index]?.module;
  if (saved) return saved;
  const episode = episodeFor(index);
  const original = weeks[index % weeks.length];
  const chapter = index >= programmeLength ? 'Keep going · ' : '';
  const business = player.mode === 'manual' ? episode.business : original.prompts[player.track];
  const defaults = { title: chapter + episode.title, summary: episode.concept,
    business: player.track === 0 ? business + ' Ask an adult to help if you need it.' : business,
    outside: episode.outside, lessonNote: '', lessonUrl: '', quizUrl: '' };
  return { ...defaults, ...player.modules?.[index] };
}

export const savingsMilestones = [25, 50, 75, 100];
const skillAwards = [
  { id: 'ledger', icon: '$', title: 'First money entry', description: 'Record a sale or business cost.', points: 5,
    reached: ({ p }) => p.weeks.some(w => w.transactions.some(e => e.kind === 'sale' || e.kind === 'cost')) },
  { id: 'business', icon: '01', title: 'Business in action', description: 'Complete your first business mission.', points: 5,
    reached: ({ done }) => done('business') },
  { id: 'quiz', icon: '?', title: 'Money basics', description: 'Complete your first money quiz.', points: 5,
    reached: ({ p }) => p.weeks.some(w => w.schoolQuizResult?.passed !== false &&
      w.tasks.some(t => t.id === 'learning' && t.status === 'approved')) },
  { id: 'transfer', icon: '+', title: 'Money skills in real life', description: 'Complete your first mission outside your business.', points: 5,
    reached: ({ done }) => done('reflection') },
  { id: 'week', icon: '✓', title: 'First week closed', description: 'Settle your first week or finish a mentor check-in.', points: 10,
    reached: ({ result }) => result.closed >= 1 },
  { id: 'loss', icon: '↻', title: 'Learned from a loss', description: 'Close a loss-making week and reflect on what to try next.', points: 10,
    reached: ({ p }) => p.weeks.some(w => w.closed && totals(w).profit < 0) },
  { id: 'regulars', icon: '4', title: 'Local regulars', description: 'Build four potential regulars in the practice simulation.', points: 10, practice: true,
    reached: ({ p }) => p.mode === 'sim' && goodwill(p) >= 4 },
  { id: 'season', icon: '★', title: 'Season finisher', description: 'Close all 12 programme weeks.', points: 20,
    reached: ({ result }) => result.closed >= programmeLength },
];
const goalAwards = savingsMilestones.map(percent => ({
  id: 'save-' + percent,
  icon: percent + '%',
  title: percent === 100 ? 'Goal reached' : 'Saved ' + percent + '%',
  description: percent === 100 ? 'Fund your full savings goal.' : 'Set aside ' + percent + '% of your savings goal.',
  points: percent === 100 ? 25 : 10,
  percent,
  reached: ({ result, p }) => result.buckets[1] >= Math.ceil(p.target * percent / 100)
}));
export const awards = [...skillAwards, ...goalAwards];
export function earnedAwards(p) {
  return awards.filter(award => p.awards?.includes(award.id));
}
export function grantAwards(p, { checkSavings = false } = {}) {
  const result = progress(p);
  const done = id => p.weeks.some(w => w.tasks.some(t => t.id === id && t.status === 'approved'));
  const unlocked = awards.filter(a => (!a.percent || checkSavings) && !p.awards?.includes(a.id) && a.reached({ p, result, done }));
  if (unlocked.length) (p.awards ??= []).push(...unlocked.map(a => a.id));
  return unlocked;
}

export const shopItems = [
  { id: 'hero', kind: 'icon', name: 'Lucas', cost: 0, symbol: '', description: 'The original arcade portrait.' },
  { id: 'kiwi', kind: 'icon', name: 'Kiwi', cost: 0, symbol: '🥝', description: 'A bright green profile icon.' },
  { id: 'spark', kind: 'icon', name: 'Spark', cost: 0, symbol: '⭐', description: 'A little star for big plans.' },
  { id: 'rocket', kind: 'icon', name: 'Rocket', cost: 30, symbol: '🚀', description: 'For ideas that take off.' },
  { id: 'owl', kind: 'icon', name: 'Night Owl', cost: 55, symbol: '🦉', description: 'For learners who look closely.' },
  { id: 'river', kind: 'icon', name: 'River', cost: 0, image: 'avatar-river.webp', description: 'A teal hoodie and curly hair.' },
  { id: 'sosie', kind: 'icon', name: 'Sosie', cost: 0, image: 'avatar-sosie.webp', description: 'Round glasses and puff buns.' },
  { id: 'kai', kind: 'icon', name: 'Kai', cost: 35, image: 'avatar-kai.webp', description: 'A bright orange hoodie.' },
  { id: 'ash', kind: 'icon', name: 'Ash', cost: 55, image: 'avatar-ash.webp', description: 'A green beanie and freckles.' },
  { id: 'kiwi-scout', kind: 'icon', name: 'Kiwi Scout', cost: 0, image: 'animal-kiwi.webp' },
  { id: 'kea-pilot', kind: 'icon', name: 'Kea Pilot', cost: 0, image: 'animal-kea.webp' },
  { id: 'shadow-cat', kind: 'icon', name: 'Shadow Cat', cost: 0, image: 'animal-cat.webp' },
  { id: 'little-penguin', kind: 'icon', name: 'Little Penguin', cost: 0, image: 'animal-penguin.webp' },
  { id: 'red-panda', kind: 'icon', name: 'Red Panda', cost: 35, image: 'animal-panda.webp' },
  { id: 'axolotl', kind: 'icon', name: 'Axolotl', cost: 45, image: 'animal-axolotl.webp' },
  { id: 'tuatara', kind: 'icon', name: 'Tuatara', cost: 55, image: 'animal-tuatara.webp' },
  { id: 'ember-dragon', kind: 'icon', name: 'Ember Dragon', cost: 85, image: 'animal-dragon.webp' },
  { id: 'trail-dog', kind: 'icon', name: 'Trail Dog', cost: 30, image: 'animal-dog.webp' },
  { id: 'sunset', kind: 'background', name: 'Arcade Sunset', cost: 0, image: 'arcade-hero.webp', description: 'The original dashboard scene.' },
  { id: 'coast', kind: 'background', name: 'Coast Ride', cost: 0, image: 'coast-ride.webp', description: 'Blue skies over a coastal skatepark.' },
  { id: 'market-lights', kind: 'background', name: 'Market Lights', cost: 70, image: 'market-lights.webp', description: 'A weekend market glowing at sunset.' },
  { id: 'alpine-lookout', kind: 'background', name: 'Alpine Lookout', cost: 0, image: 'scene-alpine.webp' },
  { id: 'night-skate', kind: 'background', name: 'Neon Skatepark', cost: 0, image: 'scene-skate.webp' },
  { id: 'glowworm-cavern', kind: 'background', name: 'Glowworm Cavern', cost: 60, image: 'scene-cavern.webp' },
  { id: 'rooftop-stars', kind: 'background', name: 'Rooftop Stargazer', cost: 85, image: 'scene-stars.webp' },
  { id: 'frame-classic', kind: 'frame', name: 'Classic Blue', cost: 0 },
  { id: 'frame-lime', kind: 'frame', name: 'Lime Circuit', cost: 0 },
  { id: 'frame-ice', kind: 'frame', name: 'Ice Crystal', cost: 25 },
  { id: 'frame-ember', kind: 'frame', name: 'Ember Ring', cost: 35 },
  { id: 'frame-nebula', kind: 'frame', name: 'Nebula', cost: 55 },
  { id: 'frame-gold', kind: 'frame', name: 'Gold Medal', cost: 75 },
  { id: 'frame-rainbow', kind: 'frame', name: 'Prism', cost: 95 },
  { id: 'frame-neon-aqua', kind: 'frame', name: 'Neon Aqua', cost: 0 },
  { id: 'frame-neon-pink', kind: 'frame', name: 'Hot Pink Pulse', cost: 25 },
  { id: 'frame-neon-acid', kind: 'frame', name: 'Acid Green', cost: 35 },
  { id: 'frame-neon-sunset', kind: 'frame', name: 'Neon Sunset', cost: 45 },
  { id: 'frame-neon-orbit', kind: 'frame', name: 'Electric Orbit', cost: 60 },
  { id: 'frame-neon-spectrum', kind: 'frame', name: 'Neon Spectrum', cost: 90 },
  { id: 'rookie', kind: 'title', mark: '⚑', name: 'Money Rookie', cost: 0, description: 'Every good habit starts somewhere.' },
  { id: 'goal-getter', kind: 'title', mark: '◎', name: 'Goal Getter', cost: 35, description: 'A title for taking the next step.' },
  { id: 'budget-boss', kind: 'title', mark: '▦', name: 'Budget Boss', cost: 60, description: 'A title for making a plan and sticking to it.' },
  { id: 'pocket-planner', kind: 'title', mark: '✓', name: 'Pocket Planner', cost: 0 },
  { id: 'coin-keeper', kind: 'title', mark: '◉', name: 'Coin Keeper', cost: 20 },
  { id: 'market-maverick', kind: 'title', mark: '⚡', name: 'Market Maverick', cost: 40 },
  { id: 'nest-egg-builder', kind: 'title', mark: '♧', name: 'Nest Egg Builder', cost: 50 },
  { id: 'future-maker', kind: 'title', mark: '➤', name: 'Future Maker', cost: 70 },
  { id: 'money-wizard', kind: 'title', mark: '✧', name: 'Money Wizard', cost: 90 },
  { id: 'arcade-legend', kind: 'title', mark: '♛', name: 'Arcade Legend', cost: 115 },
  { id: 'school-market-icon', kind: 'icon', name: 'Market Medal', cost: 0, symbol: '🏅', rewardOnly: 'Earn 1 weekly certificate.', description: 'Your first weekly challenge award.' },
  { id: 'challenge-planner', kind: 'title', mark: '◆', name: 'Challenge Planner', cost: 0, rewardOnly: 'Earn 4 weekly certificates.', description: 'An award for completing four weekly challenges.' },
  { id: 'challenge-champion', kind: 'title', mark: '🏆', name: 'Challenge Champion', cost: 0, rewardOnly: 'Earn 8 weekly certificates.', description: 'An award for completing eight weekly challenges.' },
  { id: 'teacher-star', kind: 'icon', name: 'Class Star', cost: 0, symbol: '🌟', rewardOnly: 'Earn it in a teacher challenge.', description: 'An award from a teacher.' },
  { id: 'habit-hero', kind: 'title', mark: '★', name: 'Habit Hero', cost: 100, description: 'A title for practising the small things that add up.' }
];
const profileDefaults = { icon: 'hero', background: 'sunset', title: 'rookie', frame: 'frame-classic' };
export function starterOptions(kind) {
  return shopItems.filter(item => item.kind === kind && item.cost === 0 && !item.rewardOnly);
}
export function setStarterLook(p, appearance) {
  const equipped = Object.fromEntries(['icon','background'].map(kind => [
    kind, starterOptions(kind).find(item => item.id === appearance[kind])?.id ?? profileDefaults[kind]
  ]));
  Object.assign((shopSettings(p).equipped ??= {}), equipped);
  delete p.starterPending;
}
export function shopWallet(p) {
  const earned = progress(p).points;
  // Retired fixture and theme purchases no longer count against the balance.
  const purchases = (p.shop?.purchases ?? []).filter(purchase => shopItems.some(item => item.id === purchase.id));
  const spent = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
  const count = weeklyCertificates(p).length;
  const unlocked = weeklyAvatarRewards.filter(reward => count >= reward.count).map(reward => reward.item);
  const owned = new Set([...shopItems.filter(item => !item.cost && !item.rewardOnly).map(item => item.id),
    ...purchases.map(purchase => purchase.id), ...unlocked, ...(p.shop?.gifts ?? [])]);
  return { earned, spent, balance: Math.max(0, earned - spent), owned };
}
export function cosmetics(p) {
  const { owned } = shopWallet(p);
  return Object.fromEntries(Object.entries(profileDefaults).map(([kind, id]) => [
    kind, shopItems.find(item => item.kind === kind && item.id === p.shop?.equipped?.[kind] && owned.has(item.id))
      ?? shopItems.find(item => item.id === id)
  ]));
}
function shopSettings(p) {
  return p.shop ??= { purchases: [], target: null };
}
export function giftCosmetic(p, id) {
  if (!shopItems.some(item => item.id === id) || shopWallet(p).owned.has(id)) return;
  (shopSettings(p).gifts ??= []).push(id);
  if (p.shop.target === id) p.shop.target = null;
}
export function buyUpgrade(p, id) {
  const item = shopItems.find(entry => entry.id === id);
  if (!item) return 'This item is unavailable.';
  const wallet = shopWallet(p);
  if (wallet.owned.has(id)) return 'You already own this item.';
  if (item.rewardOnly) return 'Complete the challenge to unlock this item.';
  if (wallet.balance < item.cost) return 'You do not have enough game points.';
  const shop = shopSettings(p);
  shop.purchases.push({ id, price: item.cost });
  if (shop.target === id) shop.target = null;
  equipCosmetic(p, id);
  return null;
}
export function equipCosmetic(p, id) {
  const item = shopItems.find(entry => entry.id === id);
  if (!item || !shopWallet(p).owned.has(id)) return false;
  (shopSettings(p).equipped ??= {})[item.kind] = id;
  return true;
}
export function setShopTarget(p, id) {
  if (id !== null && (!shopItems.some(item => item.id === id && !item.rewardOnly) || shopWallet(p).owned.has(id))) return false;
  shopSettings(p).target = id;
  return true;
}
export function progressHistory(p) {
  let xp = 0, saved = 0;
  return p.weeks.map(week => {
    xp += learningStats(p, [week]).xp;
    if (week.closed || week.transfers) {
      const tally = totals(week);
      saved += tally.allocations[1] + tally.match;
    }
    return { week: week.index + 1, xp, saved };
  }).slice(-12);
}

export const competitionMetrics = { xp: 'Learning XP', missions: 'Missions', lessons: 'Videos + quizzes' };

export function learningStats(player, weeksToCount = player.weeks) {
  const stats = { missions: 0, videos: 0, quizzes: 0, lessons: 0, xp: 0 };
  for (const week of weeksToCount) {
    // One chore earns learning XP per week. More chores still appear in the learner's record.
    const approved = week.tasks.filter(task => task.id !== 'learning' && task.status === 'approved');
    stats.missions += approved.filter(task => task.kind !== 'chore').length + Number(approved.some(task => task.kind === 'chore'));
    const recordedSam = week.tasks.some(task => task.id === 'learning' && task.source === 'sam' && task.status === 'approved');
    stats.videos += Number(Boolean(week.videoWatched || recordedSam));
    const xp = quizXp(week);
    stats.quizzes += Number(xp > 0);
    stats.xp += xp;
  }
  stats.lessons = stats.videos + stats.quizzes;
  stats.xp += 10 * (stats.missions + stats.videos);
  return stats;
}
export function competitionBoard(competition, players) {
  return competition.results ?? players.filter(p => Object.hasOwn(competition.start, p.id)).map(p => ({
    name: p.name, id: p.id, score: Math.max(0, learningStats(p)[competition.metric] - competition.start[p.id])
  })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
export function trackVideoCoverage(segments, start, end, duration) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 1.25) return segments;
  const merged = [];
  for (const segment of [...segments, [Math.max(0, start), Math.min(end, duration)]].sort((a,b) => a[0] - b[0])) {
    const previous = merged.at(-1);
    if (previous && segment[0] <= previous[1] + 0.06) previous[1] = Math.max(previous[1], segment[1]);
    else merged.push([...segment]);
  }
  return merged;
}
export function watchedEnough(segments, duration) {
  return Number.isFinite(duration) && duration > 0 && segments.reduce((covered, [start, end]) => covered + end - start, 0) >= duration * 0.95;
}

export const tracks = ['Ages 5–12', 'Ages 13–17', 'Ages 18+'];
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

export const taskLabels = { business: 'Business', learning: 'Money lesson', reflection: 'Reflection', custom: 'Extra challenge' };
export const uid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
};
export function makeWeek(index, rules) {
  return { index, closed: false, rules: structuredClone(rules), transactions: [], choice: null, feedback: '',
    tasks: ['business', 'learning', 'reflection'].map(id => ({ id, required: true, points: 10, status: 'todo', evidence: '', feedback: '' })) };
}
export function makePlayer(fields, rules) {
  return { id: uid(), ...fields, weeks: [makeWeek(0, rules)] };
}
export function newGroup(name) {
  return { version: 1, group: name, rules: structuredClone(defaults), lessonUrl: '', current: null, players: [] };
}
export function newHomeGame(fields) {
  const game = newGroup(fields.name + '’s home game');
  const learner = makePlayer({ ...fields, solo: false }, game.rules);
  return { ...game, kind: 'home', current: learner.id, players: [learner] };
}
export function fresh() {
  const rules = structuredClone(defaults);
  const player = makePlayer({ name: 'Alex', track: 1, business: 'Coastline Car Wash', goal: 'Buy a second-hand bike', target: 3000, mode: 'manual', solo: true, offer: 'Wash family cars on Saturdays for an agreed price.', customers: 'Family and neighbours I know' }, rules);
  const peer = makePlayer({ name: 'Jamie', track: 0, business: 'Weekend Plant Stall', goal: 'Buy art supplies', target: 6000, mode: 'manual', offer: 'Grow and sell easy-care plants.', customers: 'Family and neighbours' }, rules);
  peer.modules = { 0: { title: 'Set up your plant stall', summary: 'Pick one plant to sell and agree a price. Ask two people what they would pay for it before you make up a sign.', business: 'Find out what one plant costs to grow. Ask two people about your price and write what you decided.', outside: 'Imagine you have $10 to put together a gift. Ask someone how they would split that between the gift and the wrapping, then explain your own plan.' } };
  peer.weeks[0].transactions.push({ id: uid(), kind: 'sale', label: 'Two potted herbs', cents: 1200 }, { id: uid(), kind: 'cost', label: 'Pots and potting mix', cents: 400 });
  peer.weeks[0].tasks[0].status = 'submitted';
  peer.weeks[0].tasks[0].evidence = 'The pots and mix cost $4 for two herbs. I asked my aunt and my neighbour, then chose $6 per plant.';
  return { ...newGroup('Test group'), current: player.id, players: [player, peer] };
}
export function totals(week) {
  const sum = kind => week.transactions.filter(entry => entry.kind === kind).reduce((acc, entry) => acc + entry.cents, 0);
  const sales = sum('sale'), costs = sum('cost'), rewards = sum('reward');
  const profit = sales - costs;
  const tax = Math.round(Math.max(0, profit) * week.rules.tax / 100);
  const distributable = Math.max(0, profit - tax);
  const raw = week.rules.split.map(rate => distributable * rate);
  const allocations = raw.map(value => Math.floor(value / 100));
  const order = [0, 1, 2, 3].sort((a, b) => raw[b] % 100 - raw[a] % 100);
  const remainder = distributable - allocations.reduce((a, b) => a + b, 0);
  order.slice(0, remainder).forEach(index => allocations[index]++);
  const approved = week.tasks.filter(task => task.status === 'approved');
  const ready = week.tasks.every(task => !task.required || task.status === 'approved');
  const bonus = week.closed && ready ? week.rules.bonus : 0;
  const match = week.closed && ready ? Math.min(Math.round(allocations[1] * week.rules.match / 100), week.rules.cap) : 0;
  return { sales, costs, rewards, profit, tax, distributable, allocations, ready, match, points: approved.reduce((acc, task) => acc + task.points, 0) + bonus };
}
export function progress(player) {
  const awardPoints = earnedAwards(player).reduce((sum, award) => sum + award.points, 0);
  return player.weeks.reduce((sum, week) => {
    const t = totals(week);
    if (week.closed) {
      t.allocations.forEach((value, i) => sum.buckets[i] += value);
      sum.buckets[1] += t.match;
      sum.closed++;
    }
    sum.points += t.points;
    return sum;
  }, { buckets: [0, 0, 0, 0], points: awardPoints, awardPoints, closed: 0 });
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
  const spec = market[week.index];
  const { price, capacity, demand, cost } = spec.plans[planIndex];
  const [tactic, lift, fee, earned] = spec.tactics[tacticIndex];
  const bonus = Math.min(2, Math.floor(goodwill(player, week.index) / 2));
  const demandTotal = demand + lift + bonus;
  const sold = Math.min(capacity, demandTotal);
  return { price, capacity, sold, demand: demandTotal, returning: Math.min(bonus, sold), sales: sold * price, costs: cost + fee,
    regularsEarned: Math.min(earned + (sold >= 8 ? 1 : 0), sold), tactic, fee };
}

const businessModules = [
  {
    title: 'Make your first offer',
    summary: 'Agree on a product or job, who it’s for and what you’ll charge. Try it with a customer or a member of your household.',
    prompts: [
      'Agree on one job or product and a price. Try it this week and tell us what happened.',
      'Compare two possible prices with your costs. Try one, then explain what happened and record any money in or out.',
      'Estimate your break-even point. Test one offer and compare actual sales and costs with your estimate.'
    ],
    outside: 'Imagine giving a friend a $20 budget to make lunch for two. Describe one way they could stay within budget and how they could check it.'
  },
  {
    title: 'Find the real cost',
    summary: 'Look at what it takes to deliver a job or product, including supplies and time. Try one change that makes it easier or less costly.',
    prompts: [
      'Pick a job or product. List what you used and say one way you could do it for less.',
      'Choose one job or product. Estimate the cost for one, then compare two ways to reduce that cost or time.',
      'Separate fixed and variable costs for one offer. Identify one change you can test and compare the cost per job or unit.'
    ],
    outside: 'Compare a small pack and a larger pack of the same household item. Which costs less per item, and when might the smaller pack suit your budget better?'
  },
  {
    title: 'Plan for a quiet week',
    summary: 'Make a plan for lower earnings or an unexpected cost. Small changes can keep a business going when work slows down.',
    prompts: [
      'Imagine one job gets cancelled. What could you do next? Try an idea or explain what you’d try.',
      'Use your recent figures to estimate a week with one fewer sale or job. Pick a low-cost way to respond.',
      'Model a lower-income week using your own figures. Decide how much buffer you’d want and justify the first cost you’d change.'
    ],
    outside: 'Imagine you planned to save $10 this week and a $6 expense comes up. Describe one way you could deal with it and explain what would happen to your savings.'
  },
  {
    title: 'Review what worked',
    summary: 'Look back at your numbers and what customers said. Decide which change is worth keeping and what you’ll try next.',
    prompts: [
      'Say what went well, look at what you earned or saved, and choose one thing to try next.',
      'Use your money log to compare two weeks. Pick one thing to keep, change or stop and explain why.',
      'Compare actual profit with your early expectations. Use the numbers and a customer observation to justify your next move.'
    ],
    outside: 'Pick a household savings goal and a longer-term goal. Explain which one needs money you can get to soon and why.'
  }
];

export function moduleFor(player, index) {
  const saved = player.weeks[index]?.module;
  if (saved) return saved;
  const original = weeks[index];
  const real = businessModules[index];
  const manual = player.mode === 'manual';
  const defaults = { title: manual ? real.title : original.title, summary: manual ? real.summary : original.summary,
    business: (manual ? real.prompts : original.prompts)[player.track], outside: manual ? real.outside : original.reflection,
    lessonNote: '', lessonUrl: '' };
  return { ...defaults, ...player.modules?.[index] };
}

export const savingsMilestones = [25, 50, 75, 100];
const skillAwards = [
  { id: 'ledger', icon: '$', title: 'First money entry', description: 'Record a sale or business cost.', points: 5,
    reached: ({ p }) => p.weeks.some(w => w.transactions.some(e => e.kind === 'sale' || e.kind === 'cost')) },
  { id: 'business', icon: '01', title: 'Business in action', description: 'Complete your first business mission.', points: 5,
    reached: ({ done }) => done('business') },
  { id: 'quiz', icon: '?', title: 'Money basics', description: 'Complete your first money quiz.', points: 5,
    reached: ({ done }) => done('learning') },
  { id: 'transfer', icon: '+', title: 'Money skills in real life', description: 'Complete your first mission outside your business.', points: 5,
    reached: ({ done }) => done('reflection') },
  { id: 'week', icon: '✓', title: 'First week closed', description: 'Settle your first week or finish a mentor check-in.', points: 10,
    reached: ({ result }) => result.closed >= 1 },
  { id: 'loss', icon: '↻', title: 'Learned from a loss', description: 'Close a loss-making week and reflect on what to try next.', points: 10,
    reached: ({ p }) => p.weeks.some(w => w.closed && totals(w).profit < 0) },
  { id: 'regulars', icon: '4', title: 'Local regulars', description: 'Build four potential regulars in the practice simulation.', points: 10, practice: true,
    reached: ({ p }) => p.mode === 'sim' && goodwill(p) >= 4 },
  { id: 'season', icon: '★', title: 'Season finisher', description: 'Close all four weeks.', points: 20,
    reached: ({ result }) => result.closed >= weeks.length },
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
  { id: 'register', name: 'Countertop register', cost: 30, kind: 'fixture', description: 'Put a proper register by the checkout.' },
  { id: 'shelves', name: 'Display shelves', cost: 50, kind: 'fixture', description: 'Set up wall shelves for stock and supplies.' },
  { id: 'counter', name: 'Oak checkout counter', cost: 75, kind: 'fixture', description: 'Trade the folding table for a timber counter.' },
  { id: 'garden', name: 'Garden theme', cost: 100, kind: 'theme', description: 'Give the shop a sage-green wall and striped awning.' },
  { id: 'after-hours', name: 'After-hours theme', cost: 125, kind: 'theme', description: 'Dress the shop in midnight blue and warm gold.' }
];
export function shopWallet(p) {
  const earned = progress(p).points;
  const purchases = p.shop?.purchases ?? [];
  const spent = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
  return { earned, spent, balance: Math.max(0, earned - spent), owned: new Set(purchases.map(purchase => purchase.id)) };
}
function shopSettings(p) {
  return p.shop ??= { purchases: [], target: null, theme: 'classic' };
}
export function buyUpgrade(p, id) {
  const item = shopItems.find(entry => entry.id === id);
  if (!item) return 'This upgrade is unavailable.';
  const wallet = shopWallet(p);
  if (wallet.owned.has(id)) return 'You already own this upgrade.';
  if (wallet.balance < item.cost) return 'You do not have enough game points for this upgrade.';
  const shop = shopSettings(p);
  shop.purchases.push({ id, price: item.cost });
  if (shop.target === id) shop.target = null;
  if (item.kind === 'theme') shop.theme = item.id;
  return null;
}
export function equipTheme(p, id) {
  if (id !== 'classic' && (!shopItems.some(item => item.id === id && item.kind === 'theme') || !shopWallet(p).owned.has(id))) return false;
  shopSettings(p).theme = id;
  return true;
}
export function setShopTarget(p, id) {
  if (id !== null && (!shopItems.some(item => item.id === id) || shopWallet(p).owned.has(id))) return false;
  shopSettings(p).target = id;
  return true;
}

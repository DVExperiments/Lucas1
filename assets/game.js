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
    decisions: [['Keep the price low', 'More people try your product. The margin on each sale is smaller.', 4500, 2800], ['Charge more per sale', 'Fewer customers buy, but each sale brings in more money.', 5400, 3200]],
    reflection: 'Who might buy from you, and what could you ask them before making more?'
  },
  {
    title: 'Make every dollar count', summary: 'Compare the cost of buying more stock with the flexibility of buying less.',
    lesson: 'Some costs change with every sale, such as packaging. Other costs stay the same for the week, such as stall hire. Buying in bulk can lower cost per item while using more cash upfront.',
    question: 'Which cost usually increases as you sell more items?',
    answers: ['Weekly stall hire', 'Packaging for each item', 'A one-off sign'], correct: 1,
    prompts: ['Compare two ways to buy supplies. Which leaves more money this week?', 'Compare two suppliers by unit cost and total upfront cost.', 'Compare supplier terms and explain what extra inventory would do to cash flow.'],
    decisions: [['Order a small batch', 'You pay more per item and keep cash available for next week.', 5200, 3000], ['Buy in bulk', 'You get a unit discount and have stock left over, but spend more this week.', 5800, 4800]],
    reflection: 'Name one cost you could reduce while still making something people want.'
  },
  {
    title: 'Handle a quiet week', summary: 'Respond to a slowdown and decide what you can afford to risk.',
    lesson: 'You can make a loss in a slow week. A cash buffer gives you more options when sales are lower than expected. Your saving goal and your business cash can serve different purposes.',
    question: 'What does a business cash buffer help you do?',
    answers: ['Cover costs during a slow week', 'Guarantee every customer returns', 'Make every sale profitable'], correct: 0,
    prompts: ['Sales are slow. Choose a small change and say why you picked it.', 'Compare a promotion with a lower-cost way to test new demand.', 'Model a weaker sales week. Set a cash buffer and explain which costs you’d cut first.'],
    decisions: [['Pay for a promotion', 'The promotion brings in a few customers, though it costs more than it earns this week.', 2900, 3900], ['Try a smaller offer', 'You keep costs low and get a little feedback from returning customers.', 2100, 1500]],
    reflection: 'What did the slow week teach you? What would you try next time?'
  },
  {
    title: 'Make your next move', summary: 'Review your first four weeks and choose where to go next.',
    lesson: 'Saving toward a goal gives that money a specific job. Investing usually has a longer time horizon and its value can rise or fall. The game helps you plan both using two buckets.',
    question: 'Which bucket fits a goal you want to pay for soon?',
    answers: ['Invest', 'Save', 'Give'], correct: 1,
    prompts: ['Tell someone what worked and pick one thing to try next.', 'Summarise your results and explain one change for the next month.', 'Compare your forecast with results and choose whether to expand, hold or change your offer.'],
    decisions: [['Build on the proven offer', 'You keep costs predictable and get steady repeat sales.', 7000, 3400], ['Test a new offer', 'The test costs more upfront and attracts more sales this week.', 8900, 5600]],
    reflection: 'What are you proud of, how far did you get towards your goal, and what will you do next?'
  }
];

export const taskLabels = { business: 'Business', learning: 'Money lesson', reflection: 'Reflection', custom: 'Extra challenge' };
export const uid = () => globalThis.crypto.randomUUID();
export function makeWeek(index, rules) {
  return { index, closed: false, rules: structuredClone(rules), transactions: [], choice: null, feedback: '',
    tasks: ['business', 'learning', 'reflection'].map(id => ({ id, required: true, points: 10, status: 'todo', evidence: '', feedback: '' })) };
}
export function makePlayer(fields, rules) {
  return { id: uid(), ...fields, weeks: [makeWeek(0, rules)] };
}
export function fresh() {
  const rules = structuredClone(defaults);
  const player = makePlayer({ name: 'Alex', track: 1, business: 'Coastline Car Wash', goal: 'Buy a second-hand bike', target: 12000, mode: 'sim' }, rules);
  const peer = makePlayer({ name: 'Jamie', track: 0, business: 'Weekend Plant Stall', goal: 'Buy art supplies', target: 6000, mode: 'sim' }, rules);
  peer.weeks[0].tasks[2].status = 'submitted';
  peer.weeks[0].tasks[2].evidence = 'I asked my aunt what she looks for when she buys a plant. She said it needs to be easy to look after.';
  return { version: 1, group: 'Pilot group', rules, lessonUrl: '', current: player.id, players: [player, peer] };
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
  return player.weeks.reduce((sum, week) => {
    const t = totals(week);
    if (week.closed) {
      t.allocations.forEach((value, i) => sum.buckets[i] += value);
      sum.buckets[1] += t.match;
      sum.closed++;
    }
    sum.points += t.points;
    return sum;
  }, { buckets: [0, 0, 0, 0], points: 0, closed: 0 });
}

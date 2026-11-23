export const weeklyPoints = 15;

const market = (budget, unitCost, fee, surprise, demand, story) => ({
  kind: 'market', title: 'Market Day', budget, unitCost, fee, surprise, demand, story
});
export const practiceMarket = market(40, 2, 4, 8, [12, 9, 6], 'Run a drinks stall at your school fair. The forecast looks good, but plans can change.');

const choice = (prompt, answers, correct, explanation) => ({ prompt, answers, correct, explanation });
const decision = (title, story, ...questions) => ({ kind: 'decision', title, story, questions });
const episodes = [
  practiceMarket,
  decision('What did it really cost?', 'You and a friend want to wash bikes after school.',
    choice('Brushes cost $9 once. Soap costs $2 for each bike. What will it cost to wash three bikes, including brushes?', ['$11', '$15', '$27'], 1, 'Add the $9 one-off cost and three lots of $2 for soap.'),
    choice('You charge $6 each for three washes. What is your profit after the $15 cost?', ['$18', '$3', '$15'], 1, 'Sales bring in $18. Take away $15 in costs and $3 remains.')),
  decision('Save the repair fund', 'Your school club has $50, including $15 set aside for repairs.',
    choice('A pump repair costs $12. How much will be left in the repair fund?', ['$3', '$12', '$38'], 0, 'The repair is paid from the $15 fund, leaving $3 in it.'),
    choice('What could make the club better prepared for the next repair?', ['Spend the last $3 on snacks', 'Top up the repair fund from the next fundraiser', 'Count the same $3 twice'], 1, 'Topping up the fund creates room for another unexpected cost.')),
  market(40, 2, 4, 8, [11, 8, 6], 'You’re saving for gear for your school team. Run a stall that can pay for a surprise and still contribute to your goal.'),
  decision('Plan the class trip', 'You have $32. The bus and entry cost $23. A souvenir costs $10.',
    choice('What can you do if you want to cover the trip first?', ['Buy the souvenir and hope entry is cheaper', 'Set aside $23 and decide what to do with the $9 left', 'Treat the whole $32 as spending money'], 1, 'Setting the trip money aside first leaves $9 for other choices.'),
    choice('How much more would you need to buy the $10 souvenir after covering the trip?', ['$1', '$9', '$10'], 0, '$10 minus the $9 you have left is $1.')),
  market(36, 2, 5, 7, [10, 8, 5], 'The school fair has two other stalls selling drinks. Pick a price that covers your costs and think about how many people might buy.'),
  decision('Give it a day', 'You’ve saved $28 for a $40 hoodie. An ad says a $16 game add-on is on sale today.',
    choice('If you buy the add-on, how much will you have left towards the hoodie?', ['$16', '$12', '$24'], 1, '$28 minus $16 leaves $12 for your goal.'),
    choice('What helps you decide whether the sale is worth it?', ['Buy before the timer runs out', 'Ignore the price because it is a sale', 'Compare what you get with how much longer your goal will take'], 2, 'Waiting gives you time to weigh up what you would give up.')),
  decision('Give your goal a home', 'You want $45 for new sports gear in five weeks.',
    choice('How much would you need to set aside each week, starting from zero?', ['$5', '$9', '$15'], 1, '$45 split across five weeks is $9 each week.'),
    choice('What might help you follow the plan?', ['Keep a separate savings pot and track each deposit', 'Spend the money and set the same goal again', 'Count money you might earn as money saved'], 0, 'A separate pot makes it easier to know what you have actually saved.')),
  decision('Up today, down tomorrow', 'In a simulation, an investment moves from $20 to $23, then down to $18.',
    choice('How does $18 compare with your original $20?', ['$2 higher', '$5 lower', '$2 lower'], 2, 'Compare the latest value with the original amount: $18 is $2 less than $20.'),
    choice('If you need $20 for school gear next week, what matters most?', ['That the investment went up once', 'Whether you can count on having the $20 when it is due', 'Whether the investment has a good name'], 1, 'Money for a near-term bill should be there when you need it.')),
  decision('Two goals, two timelines', 'You want to save for a helmet this term and build a separate long-term savings habit.',
    choice('Which action makes both goals easier to track?', ['Keep a separate target and timeline for each', 'Give both goals the exact same deadline', 'Spend first and track whatever is left'], 0, 'Separate targets tell you which money is for which goal and when you need it.'),
    choice('What could you do after reaching the helmet goal?', ['Give up the habit', 'Set aside some of the amount you were already saving towards the longer goal', 'Double your goal without checking what you can save'], 1, 'Keeping part of a habit you can already afford helps it continue.')),
  market(45, 2, 6, 10, [13, 10, 7], 'Your stall is back for a second event. Decide how much to put into stock while keeping enough aside for any surprise.'),
  decision('Plan your next move', 'Your first event made $18 after costs. You want $10 for a savings goal and $6 ready for the next stall.',
    choice('How much is left after putting aside both amounts?', ['$8', '$12', '$2'], 2, '$18 minus $10 minus $6 leaves $2.'),
    choice('Which number helps you check how the next stall went?', ['Sales after subtracting the actual costs', 'The biggest price on the menu', 'The cash you hoped to make'], 0, 'Comparing actual sales with actual costs tells you what you earned.'))
];
export const challengeFor = index => episodes[index % episodes.length];

export const prices = [3, 4, 5];
export const stockOptions = [6, 8, 10, 12, 14, 16];

export function runSchoolMarket(scenario, stock, price) {
  if (!stockOptions.includes(stock) || !prices.includes(price)) return undefined;
  const cost = scenario.fee + stock * scenario.unitCost;
  const buffer = scenario.budget - cost;
  if (buffer < 0) return undefined;
  const sold = buffer >= scenario.surprise ? Math.min(stock, scenario.demand[prices.indexOf(price)]) : 0;
  const sales = sold * price;
  const profit = sales - cost - scenario.surprise;
  return { stock, price, cost, buffer, sold, sales, profit, cash: scenario.budget + profit,
    covered: buffer >= scenario.surprise, passed: buffer >= scenario.surprise && profit > 0 };
}

export const weeklyAvatarRewards = [
  { count: 1, item: 'school-market-icon' },
  { count: 4, item: 'challenge-planner' },
  { count: 8, item: 'challenge-champion' }
];
export const weeklyCertificates = player => player.weeks.filter(week => week.weeklyCertificate === true);

export function completeWeeklyChallenge(player, index) {
  const week = player.weeks[index];
  if (!week || week.weeklyCertificate) return false;
  week.weeklyCertificate = true;
  return true;
}

export function approvedCount(challenge) {
  return challenge.learners.filter(id => challenge.entries[id]?.status === 'approved').length;
}
export function classroomUnlocked(challenge, learnerId) {
  if (!challenge.learners.includes(learnerId)) return false;
  return challenge.classTarget ? approvedCount(challenge) >= challenge.classTarget
    : challenge.entries[learnerId]?.status === 'approved';
}
export function submitClassWork(challenge, learnerId, work) {
  const entry = challenge.entries[learnerId];
  if (!work || challenge.closed || !challenge.learners.includes(learnerId)
    || (entry && entry.status !== 'revise')) return false;
  challenge.entries[learnerId] = { ...entry, work, status: 'pending' };
  return true;
}
export function reviewClassWork(challenge, learnerId, decision, feedback) {
  const entry = challenge.entries[learnerId];
  if (challenge.closed || entry?.status !== 'pending' || !challenge.learners.includes(learnerId)) return false;
  if (decision !== 'approved' && (decision !== 'revise' || !feedback)) return false;
  Object.assign(entry, { status: decision, feedback });
  return true;
}

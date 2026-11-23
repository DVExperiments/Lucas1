export const programmeLength = 12;

// Each question refers to a detail introduced in its film's worked example.
export const episodes = [
  ['Earn it', 'Income and costs', 'Agree on one paid chore or job with your adult, then record what happened.', 'Before buying lunch, decide how much you can spend and what you’ll keep.',
    ['Income is what you earn. Costs are what you spend to do the job.', 'Mere washes two cars for $10 each. Sponges cost her $6.', 'Take the $6 cost away from $20 income. Mere keeps $14 before any other deductions.'],
    ['How much did Mere have left after buying sponges?', ['$6', '$14', '$20'], 1], ['What did Mere spend $6 on?', ['A hose', 'A bucket', 'Sponges'], 2]],
  ['Know your costs', 'Planning a job', 'List the supplies and time for your next job. Pick one cost you could avoid.', 'Compare the price per item in two different pack sizes.',
    ['Some costs happen once. Other costs crop up each time you do a job.', 'Tama pays $12 for a rake and $2 for each garden bag. Today he fills three bags.', 'The bags cost $6 today. The rake was his one-off cost.'],
    ['How much did Tama spend on bags today?', ['$2', '$6', '$12'], 1], ['Which purchase was a one-off cost?', ['The rake', 'Each bag', 'The garden waste'], 0]],
  ['Build a buffer', 'Unexpected costs', 'Imagine your next job is cancelled. Work out what costs you could pause.', 'Name one surprise cost and one useful way to prepare for it.',
    ['A buffer is money you set aside for a surprise expense.', 'Ari keeps $15 from past jobs. When their bike tyre needs fixing, the repair costs $9.', 'Ari uses the buffer and has $6 left. Their savings goal can stay on track.'],
    ['How much of Ari’s buffer was left?', ['$15', '$9', '$6'], 2], ['What did Ari need to fix?', ['A bike tyre', 'A mower blade', 'A window'], 0]],
  ['Set a savings target', 'Goals and small steps', 'Give your savings goal a price and choose a small weekly saving step.', 'Choose something you can wait for. Write down what waiting makes possible.',
    ['A big goal feels easier when you break it into small steps.', 'Sina wants a $48 art kit. She sets aside $8 each week.', 'At that pace, six weeks of saving gets Sina to $48.'],
    ['How many weeks does Sina need?', ['Four', 'Six', 'Eight'], 1], ['What is Sina saving for?', ['A football', 'A bike helmet', 'An art kit'], 2]],
  ['Needs, wants and waits', 'Spend with a plan', 'Choose one purchase for your job. Explain whether you need it now or can wait.', 'Make a short list with one need, one want and one thing you can wait for.',
    ['A need comes first. A want can still be worth saving for.', 'Noah has $22. He needs a $12 bus pass and wants an $8 game skin.', 'Noah buys the bus pass and saves the remaining $10. He can decide about the skin later.'],
    ['How much did Noah choose to save?', ['$8', '$10', '$12'], 1], ['Which item did Noah buy first?', ['Game skin', 'School bag', 'Bus pass'], 2]],
  ['Price a fair job', 'Pricing and effort', 'Compare two prices and choose one that covers your supplies and feels fair for your time.', 'Ask an adult how they compare two prices for the same service.',
    ['A price needs to cover costs and make sense to the customer.', 'Leilani offers a $16 garden tidy. Supplies cost $4 and she shares the job with her cousin.', 'They split the $12 left over. Each gets $6.'],
    ['How much did each person get?', ['$4', '$6', '$8'], 1], ['Who helped Leilani?', ['Her cousin', 'Her teacher', 'Her neighbour'], 0]],
  ['Pause before you buy', 'Digital spending', 'Check a tool or supply offer. Compare the full price with an alternative.', 'Practise pausing before an online purchase. Write down one thing you would check.',
    ['Online offers can look cheaper than the final checkout price.', 'A $9 brush has $5 delivery. At a local shop the brush is $12 with no delivery fee.', 'The online total is $14. Comparing the full cost saves $2 at the local shop.'],
    ['What is the online total?', ['$9', '$12', '$14'], 2], ['What changed the checkout price?', ['Delivery', 'A discount', 'A subscription'], 0]],
  ['Give savings a home', 'Savings accounts', 'Plan where you’ll record or keep your next savings. Talk it through with your adult.', 'Compare immediate access with having to wait. Which suits a near-term goal?',
    ['A savings account can help keep goal money away from everyday spending.', 'Hana has $35 in her goal account. She adds $5 each week for three weeks.', 'Hana reaches $50 before any interest. Her plan did most of the work.'],
    ['What did Hana reach before interest?', ['$40', '$45', '$50'], 2], ['How much did she add each week?', ['$3', '$5', '$15'], 1]],
  ['Learn how investing moves', 'Investment risk', 'Pick a fictional investment and explain what could make it rise or fall.', 'Make up a pretend example where saving and investing serve different goals.',
    ['An investment can gain or lose value. A short-term goal needs a different plan.', 'In a practice example, Mika’s $40 investment goes down by $6, then up by $3.', 'The current value is $37. The ups and downs changed the value, even though Mika added nothing.'],
    ['What is Mika’s practice investment worth now?', ['$37', '$40', '$43'], 0], ['How much did it recover after the drop?', ['$3', '$6', '$9'], 0]],
  ['Think far ahead', 'KiwiSaver and long-term plans', 'Ask a trusted adult to explain one difference between saving for next month and planning for much later.', 'Put three fictional goals in order, from soonest to furthest away.',
    ['Near-term and long-term goals need different plans for getting to your money.', 'Pita labels three practice goals: shoes this term, a bike next year and money for much later in life.', 'He links the longest goal to his KiwiSaver learning card. He plans accessible savings for his shoes.'],
    ['Which goal goes on Pita’s KiwiSaver learning card?', ['Shoes this term', 'Money for much later', 'A bike next year'], 1], ['Which goal comes first?', ['A bike', 'Money for much later', 'Shoes'], 2]],
  ['Reinvest or keep saving?', 'Make a trade-off', 'Pick one possible improvement to your mini business and decide whether it is worth waiting for.', 'Write one benefit of spending now and one benefit of waiting.',
    ['Using profit to improve a business is called reinvesting. It comes with a trade-off.', 'Ella has $24. A new nozzle costs $14. She keeps $10 toward her goal if she buys it.', 'Ella decides to wait until she knows the nozzle will help her complete more jobs.'],
    ['How much would Ella keep if she bought the nozzle?', ['$10', '$14', '$24'], 0], ['What did Ella decide to do?', ['Buy it immediately', 'Wait and check if it helps', 'Buy two'], 1]],
  ['Your next move', 'Review and repeat', 'Review your records. Choose one good habit to keep and make a plan for your next week.', 'Share one tip with a friend, parent or teacher and explain when you would use it.',
    ['Reviewing what worked lets you improve your next plan.', 'Dev reached $30 of a $45 goal. Their best habit was logging each job the same day.', 'Dev still needs $15. Keeping their logging habit will help them plan the next steps.'],
    ['How much more does Dev need?', ['$10', '$15', '$30'], 1], ['Which habit helped Dev most?', ['Changing the goal daily', 'Buying supplies in bulk', 'Logging jobs the same day'], 2]]
].map(([title, concept, business, outside, frames, ...questions], index) => ({
  title, concept, business, outside, frames, index,
  questions: questions.map(([question, options, answer]) => ({ question, options, answer }))
}));
export const episodeFor = index => episodes[index % programmeLength];

import { programmeLength } from './curriculum.js';

export const familyWeek = programmeLength - 1;
export const familyTitle = 'Family Money Challenge';
export const familyPrompt = 'Show an adult one money skill you learnt, solve a pretend money decision together, then choose a habit to try.';
export function ensureFamilyTask(week) {
  if (week.index === familyWeek && !week.closed && !week.tasks.some(task => task.id === 'family')) {
    week.tasks.push({ id: 'family', required: true, points: 10, status: 'todo', evidence: '', feedback: '' });
  }
  return week;
}

export const familyCases = [
  { id: 'budget', title: 'Make a budget', icon: '🧾',
    story: 'Alex has $40 from washing cars. They owe $12 for supplies and want $18 headphones. How could they cover the cost, save and still make room for something fun?',
    stretch: 'Next week’s jobs might fall through. How would that change the plan?',
    ask: 'How do you decide which costs to cover first? What would help someone stick to a plan?', tool: 'budget' },
  { id: 'work', title: 'Plan around work', icon: '🧰',
    story: 'Ari is offered $20 for one garden job or two bike washes at $12 each. The washes cost $6 in supplies and take longer. Which job would you choose, and why?',
    stretch: 'Suppose one wash is cancelled. How would you compare what you could earn with how certain each job is?',
    ask: 'What do you weigh up when deciding if a job is worth your time?', tool: 'budget' },
  { id: 'save', title: 'Save for a goal', icon: '🎯',
    story: 'Sina has $30 towards a $60 goal and can save $10 a week. A $15 treat comes up. What changes if they buy it now? What could make waiting easier?',
    stretch: 'How would you make the plan work if the amount you could save changed each week?',
    ask: 'What has helped you keep working towards a goal that takes time?', tool: 'budget' },
  { id: 'invest', title: 'Think about investing', icon: '🌱',
    story: 'Noah has money for a school trip next term and a separate goal several years away. They are considering saving or investing. What would you want to find out before choosing?',
    stretch: 'If an investment fell in value just before a goal was due, how would the time until the goal affect your options?',
    ask: 'What questions would you ask or what resources would you check before making an investment decision?', tool: 'finance' },
  { id: 'future', title: 'Plan for later', icon: '🗓️',
    story: 'Hana wants to cover a transport cost this month and also plan for life after work one day. How could they give each goal a place in their plan?',
    stretch: 'What would you review if work or living costs changed? How often would you check the plan?',
    ask: 'What habits or tools could help someone plan for retirement? Where could they learn more?', tool: 'finance' }
];

export const familyQuestions = [
  { key: 'skill', label: 'What did you teach?', tip: 'Name one skill from the game. Show how it works using the scenario or another made-up example.', criterion: 'Explains a money skill with an example' },
  { key: 'tradeoff', label: 'What did you decide together?', tip: 'Say where you agreed or saw things differently. Explain one thing you gain and one thing you give up with your choice.', criterion: 'Explains a decision and its trade-off' },
  { key: 'next', label: 'What is one next step, and why?', tip: 'Pick one small thing you can try. Say when you will do it and how it could help.', criterion: 'Chooses a realistic next step and explains why' }
];

export function readFamilyResponse(value) {
  const scenario = value('scenario');
  if (!familyCases.some(item => item.id === scenario)) return null;
  const responses = familyQuestions.map(({ key }) => [key, value(key)]);
  if (responses.some(([, answer]) => !answer || answer.length > 600)) return null;
  return { scenario, ...Object.fromEntries(responses) };
}

export function readFamilyScores(value) {
  const scores = familyQuestions.map(({ key }) => value('score-' + key));
  return scores.every(score => ['0', '1', '2'].includes(score)) ? scores.map(Number) : null;
}

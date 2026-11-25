// Weeks 1–6 of the SAM 12-Week School Challenge facilitator edition.
const quizzes = [
  { title: "Money and Financial Basics", questions: [
    ["What is income?", ["Money you owe someone", "Money you receive or earn", "Money you spend", "Money you borrow"], 1],
    ["Which is a need rather than a want?", ["A new PlayStation", "Designer shoes", "Food and drinking water", "The latest iPhone"], 2],
    ["If you earn $50 and spend $35, how much is left?", ["$25", "$85", "$10", "$15"], 3],
    ["What does financial independence generally mean?", ["Being able to support yourself financially", "Never paying for anything", "Unlimited access to credit", "Earning more than your friends"], 0],
    ["What does paying yourself first mean?", ["Spend before anyone else does", "Buy yourself something every payday", "Set aside savings or investments before discretionary spending", "Pay for everything by credit card"], 2],
    ["If you save $10 weekly for 52 weeks without interest, how much will you have?", ["$120", "$520", "$365", "$1,000"], 1],
    ["What is an emergency fund?", ["Holiday savings", "Money for presents", "Available credit card balance", "Money set aside for unexpected expenses"], 3],
    ["What is inflation?", ["A general increase in prices over time", "An increase in your savings balance", "A reduction in living costs", "A type of bank account"], 0],
    ["A $300 skateboard is your goal. Saving $25 weekly, how long will it take?", ["8 weeks", "10 weeks", "12 weeks", "15 weeks"], 2],
    ["Which habit is most likely to improve your financial future?", ["Spend everything", "Save regularly and learn about money", "Borrow for unnecessary purchases", "Wait until you are older to learn"], 1],
  ] },
  { title: "Starting a Business", questions: [
    ["What is an entrepreneur?", ["Someone who only works for government", "Someone who starts and develops a business", "Someone who lends money to banks", "Someone who manages personal savings"], 1],
    ["What should you consider before starting a business?", ["Logo colour", "How much you want to spend", "Number of followers", "Whether people need or want your product or service"], 3],
    ["Which is a service-based business?", ["Mowing lawns for neighbours", "Selling bracelets", "Selling second-hand clothes", "Selling cookies"], 0],
    ["What is a start-up cost?", ["First-day earnings", "Customer payments", "Money required to get a business started", "First-week profit"], 2],
    ["Car washing supplies cost $30 and equipment $20. Total start-up cost?", ["$10", "$50", "$60", "$100"], 1],
    ["What is a target market?", ["Where you keep money", "Desired profit", "Competing businesses", "Customers most likely to buy your product or service"], 3],
    ["Why research competitors?", ["Understand pricing, services and how to offer something different", "Copy everything", "Make them stop operating", "Avoid advertising"], 0],
    ["What is a business plan?", ["Shopping list", "Personal expense record", "Plan for how a business operates and achieves goals", "A guarantee of success"], 2],
    ["How can you find out whether people will pay for your service?", ["Buy expensive equipment", "Ask potential customers and test your idea", "Assume everyone is interested", "Spend everything on advertising"], 1],
    ["What is an advantage of starting a business while young?", ["Guaranteed wealth", "Never needing another job", "No need to manage money", "Developing skills and learning from experience"], 3],
  ] },
  { title: "Income, Expenses and Profit", questions: [
    ["What is business revenue?", ["Sales earnings before expenses", "Money remaining after expenses", "Bank borrowing", "Taxes paid"], 0],
    ["What is profit?", ["Number of sales", "Money invested in equipment", "Revenue less business expenses", "Customer payments before expenses"], 2],
    ["Revenue is $150 and expenses are $60. Profit before tax?", ["$210", "$90", "$60", "$150"], 1],
    ["Which is a lawn-mowing business expense?", ["Customer payment", "Personal savings deposit", "Profit from mowing", "Fuel for the lawnmower"], 3],
    ["You sell 20 cookies for $3 each. Total revenue?", ["$60", "$23", "$40", "$80"], 0],
    ["A cookie costs $1 to produce and sells for $3. Profit per cookie before other expenses and tax?", ["$1", "$3", "$2", "$4"], 2],
    ["What does breaking even mean?", ["Revenue doubles", "Revenue equals total expenses", "A loss is made", "No customers"], 1],
    ["Revenue is $80 and expenses $100. Result?", ["$20 profit", "$180 profit", "Break even", "$20 loss"], 3],
    ["Why record every business expense?", ["Understand costs and calculate actual profit", "Increase all prices", "Avoid tracking income", "Guarantee more customers"], 0],
    ["How could profit increase without increasing sales revenue?", ["Buy unnecessary equipment", "Increase production costs", "Reduce business expenses without affecting sales", "Spend more on personal purchases"], 2],
  ] },
  { title: "Saving, Interest and Investing", questions: [
    ["What is interest earned on savings?", ["Withdrawal fee", "Money paid by the bank for holding savings", "Cost of borrowing", "Government tax"], 1],
    ["What is compound interest?", ["Interest only on original deposit", "Interest charged on purchases", "Interest always equal in dollar terms", "Interest on original savings and previously earned interest"], 3],
    ["$100 earns 5% annually. Balance after one year before tax and fees?", ["$105", "$150", "$110", "$95"], 0],
    ["What is the main purpose of investing?", ["Spend faster", "Avoid all risks", "Potentially grow wealth or generate income over time", "Guarantee immediate profits"], 2],
    ["What is a share?", ["Personal loan", "Ownership stake in a company", "Guaranteed savings account", "Business expense"], 1],
    ["Why can investing young be beneficial?", ["Young people cannot lose money", "Investments always perform better for young people", "No investment fees", "More time for potential growth and compounding"], 3],
    ["What is diversification?", ["Spreading investments across different assets", "Investing everything in one company", "Keeping everything in cash", "Borrowing to invest"], 0],
    ["What is KiwiSaver primarily designed for?", ["Everyday purchases", "Household bills", "Retirement savings, with eligible first-home withdrawals", "Business borrowing"], 2],
    ["Which statement about investing is true?", ["All investments guarantee profit", "Investments can rise or fall in value", "Investing is exactly the same as gambling", "You must be wealthy to start"], 1],
    ["Two people save equally each week at the same positive compound return. One starts at 15, the", ["Person starting at 25", "Both have the same", "Starting age makes no difference", "Person starting at 15"], 3],
  ] },
  { title: "Debt, Taxes and Financial Responsibility", questions: [
    ["What is debt?", ["Savings", "Investments", "Money owed to another person or organisation", "Earnings"], 2],
    ["What is interest on a loan?", ["Cost of borrowing, excluding other fees", "Reward for spending", "Reduction in debt", "Money added to savings"], 0],
    ["Borrow $100 and repay $120 with no other fees. Interest paid?", ["$10", "$100", "$120", "$20"], 3],
    ["What is a main purpose of taxation?", ["Increase private business profits", "Fund public services such as schools, hospitals and roads", "Prevent saving", "Increase personal debt"], 1],
    ["Business profit is $200 and the simulated tax rate is 15%. Tax due?", ["$15", "$20", "$30", "$50"], 2],
    ["After paying $30 tax on $200 profit, what remains?", ["$170", "$230", "$185", "$150"], 0],
    ["What is a risk of Buy Now, Pay Later?", ["Purchases become cheaper", "Earn interest on purchases", "Savings automatically increase", "Spending more than you can afford to repay"], 3],
    ["Which is potentially productive debt?", ["Borrowing to gamble", "Affordable borrowing for income-generating equipment", "Borrowing to impress friends", "Borrowing for unnecessary luxuries"], 1],
    ["What should you do before borrowing?", ["Borrow the maximum", "Only consider money received", "Understand interest, fees, repayments and affordability", "Assume future income covers everything"], 2],
    ["Why complete agreed chores and business responsibilities on time?", ["Develop discipline, reliability and trust", "Guarantee wealth", "Never make mistakes", "Remove need for financial planning"], 0],
  ] },
  { title: "Entrepreneurship and Business Growth", questions: [
    ["What does reinvesting profits mean?", ["Spend all profits on yourself", "Use some profits to improve or grow the business", "Give all profits to customers", "Borrow for personal purchases"], 1],
    ["What is marketing?", ["Calculating tax", "Paying expenses", "Recording income", "Promoting products or services to potential customers"], 3],
    ["Why is customer feedback valuable?", ["Identify opportunities to improve", "Guarantee repeat customers", "Remove need to advertise", "Remove competition"], 0],
    ["Profit is $200 and you reinvest 25%. How much?", ["$25", "$75", "$50", "$100"], 2],
    ["What is cash flow?", ["Value of equipment", "Movement of money into and out of a business", "Annual tax rate", "Number of customers"], 1],
    ["A product sells for $10 and costs $6 to produce. Gross profit margin?", ["60%", "20%", "4%", "40%"], 3],
    ["What is a potential advantage of a business partner?", ["Combine skills, resources and ideas", "Never disagree", "No need to manage expenses", "Guaranteed profit"], 0],
    ["How should you respond to a customer complaint?", ["Ignore it", "Blame someone else", "Listen, understand and seek a reasonable solution", "Immediately stop operating"], 2],
    ["What does scalability mean?", ["Reducing customer numbers", "Ability to grow without costs necessarily rising at the same rate", "Increasing prices weekly", "Spending all profits"], 1],
    ["Your first business idea fails. What is the most constructive response?", ["Never try again", "Borrow more without changing strategy", "Blame customers", "Review what went wrong, learn and improve"], 3],
  ] },
].map(({ title, questions }) => ({
  title,
  questions: questions.map(([question, options, answer]) => ({ question, options, answer }))
}));

export const schoolQuizFor = index => quizzes[index];

export function gradeSchoolQuiz(quiz, choices) {
  if (choices.length !== quiz.questions.length || quiz.questions.some(({ options }, index) =>
    !Number.isInteger(choices[index]) || !Object.hasOwn(options, choices[index]))) return null;
  const answers = quiz.questions.map(({ question, options, answer }, index) => ({
    question,
    selected: options[choices[index]],
    expected: options[answer],
    correct: choices[index] === answer
  }));
  return { title: quiz.title, score: answers.filter(answer => answer.correct).length, answers };
}

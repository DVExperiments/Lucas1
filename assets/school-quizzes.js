// Weeks 1–6 from the SAM School Challenge facilitator edition.
// Weeks 7–12 from SAM Video Quizzes Weeks 7–12 (draft for script verification).
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
  { title: "Budgeting", questions: [
    ["Why is budgeting important?", ["It allows you to spend without limits.", "It helps you understand where your money is going.", "It gives you greater control over your finances.", "It eliminates the need to save money."], [1, 2]],
    ["What does paying yourself first mean?", ["Putting money aside for savings when you receive your income.", "Buying yourself something every payday.", "Spending your income and saving whatever is left.", "Prioritising saving and investing before unnecessary spending."], [0, 3]],
    ["Which everyday expenses does JC use as examples of how small expenses can add up?", ["Purchasing a new car.", "Buying coffee regularly.", "Buying a house.", "Eating out regularly."], [1, 3]],
    ["Which two activities can help you understand your spending habits?", ["Tracking your expenses for at least one month.", "Only recording purchases over $100.", "Reviewing your bank transactions and regular payments.", "Only checking your account balance on payday."], [0, 2]],
    ["Which two expenses would generally be considered wants rather than needs?", ["Basic groceries.", "Upgrading to the latest phone when your current one works.", "Paying for an additional entertainment subscription.", "Essential medication."], [1, 2]],
  ] },
  { title: "Diversification", questions: [
    ["What does diversification involve?", ["Spreading your money across different types of investments.", "Investing everything in your best-performing company.", "Keeping all your wealth in one business.", "Reducing your dependence on a single source of wealth."], [0, 3]],
    ["What lessons can we learn from the economic difficulties discussed in JC's family story?", ["Successful businesses never experience financial difficulties.", "Economic conditions can change unexpectedly.", "Having different sources of income and wealth can improve financial resilience.", "Previous success guarantees future success."], [1, 2]],
    ["Which two areas did JC's uncle use to diversify his wealth?", ["Farming and agricultural activities.", "Lottery tickets and casino gambling.", "Property and other business investments.", "Collecting lottery winnings."], [0, 2]],
    ["Why can relying on a single investment be risky?", ["Owning one investment prevents its value from falling.", "Your financial position depends heavily on its performance.", "All investments perform identically during downturns.", "A downturn in one industry could significantly affect your wealth."], [1, 3]],
    ["Which two lessons about diversification can you apply to your own business?", ["Try to develop relationships with different customers.", "Depend entirely on one customer.", "Assume demand for your product will never change.", "Explore different opportunities to generate income."], [0, 3]],
  ] },
  { title: "Lottery vs Investing", questions: [
    ["What are two important differences between buying lottery tickets and investing?", ["Lottery tickets provide guaranteed long-term returns.", "Winning a major lottery prize depends heavily on chance.", "Investing allows you to potentially build wealth through asset ownership and growth.", "Investing guarantees that you will never lose money."], [1, 2]],
    ["What does opportunity cost mean when buying lottery tickets?", ["Giving up the opportunity to invest that money instead.", "Increasing your chances of winning an investment return.", "Receiving interest on the money spent on tickets.", "Missing out on other potential benefits from using that money differently."], [0, 3]],
    ["What can happen when you regularly invest small amounts of money over a long period?", ["Your investment is guaranteed to double every year.", "Your regular contributions can accumulate into a substantial amount.", "Your investment can never decrease in value.", "Your investment growth may generate further growth through compounding."], [1, 3]],
    ["Why is patience important when investing?", ["It gives your investments more time to potentially compound.", "It guarantees that every investment will be profitable.", "It can help you avoid making emotional decisions during short-term market downturns.", "It removes the need to understand investment risks."], [0, 2]],
    ["Which two monthly investment amounts are used in the SAM Lotto vs Investing comparison resource?", ["$200 per month.", "$400 per month.", "$800 per month.", "$1,500 per month."], [1, 2]],
  ] },
  { title: "Financial Concepts", questions: [
    ["Which two statements about compound interest are correct?", ["You can earn returns on previously earned returns.", "It only applies to your original investment.", "It guarantees positive investment returns.", "Time is an important factor in the potential benefits of compounding."], [0, 3]],
    ["How can inflation affect your everyday life?", ["It automatically increases the value of your savings.", "The same amount of money may buy fewer products in the future.", "The cost of everyday goods and services can increase.", "It guarantees that your income will increase."], [1, 2]],
    ["Which two financial concepts should you understand when operating your own business?", ["Revenue and expenses.", "Lottery probabilities.", "Cash flow and profit.", "Personal popularity and social media followers."], [0, 2]],
    ["Which two statements about financial risk are correct?", ["Higher-risk investments always produce higher returns.", "Investments can decrease in value.", "Diversification eliminates all financial risks.", "Understanding risk can help you make better financial decisions."], [1, 3]],
    ["Which two actions demonstrate good financial decision-making?", ["Understanding the costs and potential benefits before making a purchase.", "Considering how today's financial decisions could affect your future.", "Borrowing money without understanding the repayment conditions.", "Choosing investments solely because your friends recommend them."], [0, 1]],
  ] },
  { title: "My Grandfather's Story", questions: [
    ["Which two countries were part of JC's grandfather's journey before he met his grandmother?", ["New Zealand.", "Austria.", "Australia.", "Argentina."], [1, 3]],
    ["Which two statements about JC's grandfather's professional life are correct?", ["He worked as a hairdresser.", "He worked as a professional rugby player.", "He became a business owner with hairdressing salons.", "He worked as a commercial pilot."], [0, 2]],
    ["Which two statements about how JC's grandparents met are correct?", ["They met while travelling around New Zealand.", "They met in Chile.", "They met at an event related to hairdressing.", "They met while studying at university."], [1, 2]],
    ["Which two statements describe what happened to JC's grandfather's wealth?", ["He lost his wealth through gambling.", "He donated all his wealth to charity.", "He successfully protected his wealth for retirement.", "Despite his previous business success, he died with nothing."], [0, 3]],
    ["What are two important financial lessons from JC's grandfather's story?", ["Working hard guarantees financial security.", "Making money and knowing how to manage it are different skills.", "Gambling is a reliable way to increase your wealth.", "Financial education and preparing for the future are important, regardless of how much you earn."], [1, 3]],
  ] },
  { title: "My First Business Partnership", questions: [
    ["Which two statements about JC's first business partnership are correct?", ["He started the business while he was a teenager.", "He started the business after moving to New Zealand.", "He started the business after graduating from university.", "He went into business with a friend."], [0, 3]],
    ["Which two statements describe JC's first business experience?", ["The business involved selling cars.", "The business was related to music and entertainment.", "JC developed skills as a DJ.", "The business involved building houses."], [1, 2]],
    ["How did JC develop the skills that led to his first business partnership?", ["He gained practical experience working with DJ equipment.", "He completed a university degree in music.", "He had the opportunity to learn at his friend's father's nightclub.", "He attended a professional DJ school overseas."], [0, 2]],
    ["Which two areas should business partners discuss before starting a business together?", ["Who will have the most impressive job title.", "How much money and equipment each partner will contribute.", "How they will spend profits before earning them.", "How responsibilities and business decisions will be shared."], [1, 3]],
    ["Which two lessons from JC's first business partnership could you apply to your own business?", ["Put important business agreements in writing.", "Assume that being friends means you will never disagree.", "Communicate openly and establish clear expectations.", "Wait until a disagreement occurs before discussing responsibilities."], [0, 2]],
  ] },
].map(({ title, questions }) => ({
  title,
  picks: Array.isArray(questions[0][2]) ? 2 : 1,
  questions: questions.map(([question, options, answer]) => ({ question, options, answer }))
}));

export const quizPassMark = 60;
export const schoolQuizFor = index => quizzes[index];

export function gradeSchoolQuiz(quiz, choices) {
  if (!quiz || choices.length !== quiz.questions.length) return null;
  const picks = quiz.picks ?? 1;
  const selected = Array.from(choices, choice => Array.isArray(choice) ? choice : [choice]);
  if (quiz.questions.some(({ options }, index) => {
    const answers = selected[index];
    return answers.length !== picks || new Set(answers).size !== picks ||
      answers.some(option => !Number.isInteger(option) || option < 0 || option >= options.length);
  })) return null;

  const answers = quiz.questions.map(({ question, options, answer }, index) => {
    const key = Array.isArray(answer) ? answer : [answer];
    const points = selected[index].filter(option => key.includes(option)).length;
    return {
      question,
      selected: selected[index].map(option => options[option]).join(' / '),
      expected: key.map(option => options[option]).join(' / '),
      correct: points === picks,
      points,
      maximum: picks
    };
  });
  const score = answers.reduce((sum, answer) => sum + answer.points, 0);
  const maximum = answers.length * picks;
  return { title: quiz.title, score, maximum, answers, passed: score * 100 >= quizPassMark * maximum };
}

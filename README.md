# The Lucas Money Game V2.9

A Success Avenue Money pilot for intermediate-school learners. Learners complete real jobs, run a small business, and practise making money decisions over 12 weeks. Families can play with one learner and a caregiver. Teachers can try a class with multiple learners on the same browser.

## Try the pilot

1. Open the hosted site and choose **Play the demo** to open a sample learner dashboard. Use **Start at home** or **Start a class** for fresh progress. Choose an age band in learner setup. Ages 11–13 is the main pilot experience, with display adjustments for ages 8–10 and 14–17.
2. The dashboard quest trail shows the optional challenge, required missions and check-in. From the dashboard, use **I did a chore**, **Business mission**, or **Money habit** to record real activities. On SAM, watch the assigned video first and take its matching quiz. Labelled placeholder clips and quizzes let learners try the game until an official pair is assigned.
3. Use **Facilitator view** to review submissions, tailor a learner's weekly module, and record a check-in. Check-ins open the next week. After the week 12 check-in, the learner can choose **Keep playing** to continue at their own pace.
4. In a class, open the facilitator dashboard to view progress and create a competition. Choose a metric and target. Learners see new challenges on their dashboard and score as they complete activities after the competition starts.

## Progress and rewards

- Learning XP drives levels and the class leaderboard. In each week it counts approved missions, up to one approved chore, the completed lesson clip and the passed quiz. Savings balances are personal and do not affect learning XP or rankings.
- The Profile shop has free starter looks and point unlocks for icons, dashboard backgrounds, and titles. Points spent on the retired virtual shop are available again in the new shop. The progress chart shows cumulative XP and savings by week. Savings milestones and the big personal goal use the learner's own money log. The Money buckets page shows Spend, Save, Invest and Give together. Use **Money in** on the dashboard or Money log to record an earning. Use **Money out** to log a personal purchase from Spend or a business cost from Main. Business costs and simulated tax reduce the amount available in Main. Choose **Move money** to transfer between Main and a bucket, and see the change immediately. Cash left in Main carries into the next week. Savings badges are confirmed at check-in. Earlier closed weeks retain their original bucket allocations. Each bucket has a playable practice decision, with extra reading on savings accounts, shares and funds, and KiwiSaver.
- Set both the direct SAM video and matching quiz URLs in **Settings** or in a learner's weekly module. If a weekly override is entered, supply both links there. Without a complete pair, the game uses the SAM libraries for missing links and displays its labelled placeholder lesson. Learners record official completion with a short reflection. Facilitators review it in mentored games. Results do not sync from SAM.

## Weekly and teacher challenges

- Choose **Play this week’s challenge** from the dashboard. It opens the Challenges page, where learners can choose the weekly activity, a teacher challenge or practice. Each programme week has its own activity. Finish it for a printable certificate and 15 Shop points. Play again for practice or catch up on earlier weeks in **Challenges**. There is one reward per programme week, independent of weekly check-ins. Earn one, four and eight certificates to unlock profile rewards.
- **Market Day** is open to every learner. Plan a school fair stall, tap to select stock and prices, check your cash buffer and adapt after an unexpected cost. Watch the fair unfold over about seven seconds before seeing the result, or choose **Skip to results**. The scene respects reduced-motion settings. The standalone practice activity is available at any time. Only the weekly version counts towards its certificate.
- In the teacher or caregiver view, use **Challenges & rewards** to publish a task for the group or selected learner. Choose a certificate, avatar item, classroom reward or a combination. Learners submit their work, and adults approve it or request changes. For a shared reward such as a class lunch, set the number of learners who must be approved. Adults organise the reward and record when they have delivered it. Certificates and avatar rewards are issued individually on approval.

## Publish on GitHub Pages

1. Extract the ZIP. Put `index.html`, the `assets/` folder and `.nojekyll` in the root of your GitHub repository. The README can sit alongside them.
2. In the repository, open **Settings → Pages**. Under **Build and deployment** select **Deploy from a branch**, choose the branch holding those files and select **/(root)**. Save and open the published URL once Pages shows it.
3. For a local preview, run `python -m http.server 8000` in the extracted folder and open `http://localhost:8000/`. No package installation or build step is needed.

## Pilot data and SAM integration

Progress is saved in this browser profile for the site's origin and path. Existing Lucas Money Game saves at the same URL can carry over. Earlier age categories are assigned a starting display band. Check the age band in the facilitator’s learner profile after upgrading. Use the same browser profile and the same hosted URL to resume. The sample group is available independently of your own games.

In a class, use **Open teacher dashboard** from Home and enter the class PIN. Use **Create another class** or the **Current class** menu from any teacher page to manage multiple classes on this browser. Each class opens with its own PIN once per teacher session. Returning Home or handing the device to a learner ends the teacher session. Open a learner record and choose **Hand device to learner** to activate that learner. The learner sees their assigned profile. The teacher roster and leaderboards show equipped icons and titles. Older classes set a PIN when first opened after upgrading. The demo teacher dashboard uses sample data and opens directly.

The PIN controls the interface on this browser. Use sample names for classroom demonstrations. A classroom rollout across student devices requires authenticated SAM accounts, server-side class and role permissions, and shared persistence. The SAM embed and credit for SAM-hosted video and quiz completions will need the owner's integration details and approved content URLs.
